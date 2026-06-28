# Architecture

## Service Topology

- **5 stateless Node.js services** behind an Nginx API gateway.
- **Consul** for service discovery and health-checking — services register at boot using their pod IP; clients resolve peers via Consul DNS or HTTP API. No hardcoded IPs.
- **AWS EKS** runs two managed node groups:
  - `general` — workloads for user/product/order/notification.
  - `payment` — tainted nodes; only payment pods tolerate them. Combined with namespace isolation and NetworkPolicy this gives financial-grade blast-radius control.

## Networking

```
client ──TLS──► Nginx Gateway (Deployment, replicas=3, LB Service)
                  │
                  ├─► user.default:3001
                  ├─► product.default:3002
                  ├─► order.default:3003 ──► payment.payment:3004   (only allowed path)
                  └─► notification.default:3005
```

Payment namespace runs a `default-deny` NetworkPolicy plus explicit allow-lists for ingress from `order` + `gateway` and egress to DNS, Consul, and the public payment processor only.

## Blue-Green Releases

- Each service has two Deployments: `<svc>-blue`, `<svc>-green`.
- Single `Service` object whose `selector.slot` decides which slot receives traffic.
- Pipeline deploys to the **idle** slot → smoke tests → patches the Service selector to flip 100% of traffic.
- Old slot is retained for **sub-minute rollback** via one `kubectl patch`.

## Autoscaling

- **HPA** on CPU + custom RPS/latency metrics (Prometheus adapter).
- **Cluster Autoscaler** adds/removes EKS nodes based on pending pods.

## Resilience

- `PodDisruptionBudget` (`minAvailable: 1`) on payment ensures voluntary disruptions never take it fully offline.
- Liveness + readiness probes on every pod.
- Multi-AZ node groups across 3 AZs.

## Image Hardening

- Multi-stage Dockerfiles: build deps in `node:20-alpine`, runtime in `gcr.io/distroless/nodejs20-debian12:nonroot`.
- No shell, no package manager in the runtime layer → smaller attack surface.
- Trivy gates builds on HIGH/CRITICAL CVEs.
- Result: ~40% smaller images, ~35% faster cold starts vs single-stage `node:20`.
