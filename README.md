# Cloud-Native E-Commerce Platform

Enterprise-grade microservices platform demonstrating production-ready DevOps practices on AWS EKS.

**Stack:** AWS EKS · Kubernetes · Helm · Jenkins · GitHub Actions · Terraform · Nginx · Consul · Prometheus · Grafana · Trivy · Docker (distroless multi-stage)

## Services

| Service       | Port | Responsibility                                  |
|---------------|------|-------------------------------------------------|
| user          | 3001 | Auth, profiles, JWT issuance                    |
| product       | 3002 | Catalog, inventory                              |
| order         | 3003 | Cart, order lifecycle                           |
| payment       | 3004 | Charges, refunds (isolated namespace)           |
| notification  | 3005 | Email/SMS fanout via queue                      |

All services register with **Consul** for discovery — no hardcoded IPs.

## High-Level Architecture

```
                 ┌───────────────────────┐
   Internet ───► │  Nginx API Gateway    │  (SSL, rate-limit, weighted LB)
                 └───────────┬───────────┘
                             │
                 ┌───────────▼───────────┐
                 │   AWS EKS Cluster     │
                 │  ┌──────┐ ┌────────┐  │
                 │  │ user │ │product │  │  ── Consul service mesh
                 │  └──────┘ └────────┘  │
                 │  ┌──────┐ ┌────────┐  │
                 │  │order │ │ notif. │  │
                 │  └──────┘ └────────┘  │
                 │  ┌──────────────────┐ │
                 │  │ payment (ns iso) │ │  ── NetworkPolicy + PDB
                 │  └──────────────────┘ │
                 └───────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   Prometheus            CloudWatch            ECR (Trivy-scanned)
   + Grafana          Container Insights
```

## Repo Layout

```
.
├── services/            # 5 Node.js microservices (multi-stage distroless Dockerfiles)
├── helm/                # One chart per service
├── terraform/           # VPC + EKS + ECR + IAM modules
├── k8s/                 # Raw manifests: consul, nginx, hpa, networkpolicies
├── jenkins/             # Jenkinsfile (declarative pipeline)
├── .github/workflows/   # GitHub Actions CI mirror
├── monitoring/          # Prometheus rules, Grafana dashboards, alerts
├── nginx/               # API gateway config
├── consul/              # Consul server values
├── scripts/             # Bootstrap + Blue-Green switch scripts
└── docs/                # Architecture, runbook, SLOs
```

## Quick Start (Local)

```bash
docker compose up --build      # spins all services + consul + prometheus + grafana
curl http://localhost:8080/api/products
```

## Production Deploy

```bash
# 1. Provision infra
cd terraform && terraform init && terraform apply

# 2. Configure kubectl
aws eks update-kubeconfig --name ecom-prod --region us-east-1

# 3. Install platform components
kubectl apply -f k8s/consul/
kubectl apply -f k8s/nginx/
kubectl apply -f k8s/networkpolicies/

# 4. Deploy services via Helm (Blue-Green)
./scripts/deploy-bluegreen.sh user v1.2.3
```

## CI/CD Flow

1. PR opened → GitHub Actions runs unit tests + lint
2. PR merged → Jenkins triggers:
   - `docker build` (multi-stage, distroless)
   - `trivy image --severity HIGH,CRITICAL --exit-code 1`
   - push to ECR
   - `helm upgrade --install` to **green** slot
   - smoke tests against green
   - Nginx weighted shift 100% → green; old blue retained for fast rollback

## Observability

- **Prometheus** scrapes `/metrics` on every pod (RED metrics + custom SLOs)
- **Grafana** dashboards: per-service latency p50/p95/p99, error rate, RPS
- **Alerts**: SLO burn rate (multi-window) → PagerDuty
- **CloudWatch Container Insights** for node/pod resource metrics

## Results

- **40%** smaller images via multi-stage + distroless
- **~35%** faster container cold starts
- **Zero-downtime** Blue-Green releases; sub-minute rollback
- **Financial-grade** payment isolation (namespace + NetworkPolicy + PDB)

See `docs/ARCHITECTURE.md` and `docs/RUNBOOK.md` for details.
