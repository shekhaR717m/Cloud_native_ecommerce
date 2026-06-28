# Runbook

## Rollback last release
```
NS=$(yq '.namespace' helm/<svc>/values.yaml)
PREV=$(kubectl -n $NS get svc <svc> -o jsonpath='{.spec.selector.slot}')
OTHER=$([[ "$PREV" == "blue" ]] && echo green || echo blue)
kubectl -n $NS patch svc <svc> -p "{\"spec\":{\"selector\":{\"app\":\"<svc>\",\"slot\":\"$OTHER\"}}}"
```

## Payment service incident
1. Check NetworkPolicy: `kubectl -n payment describe netpol`
2. Verify external processor reachable from a payment pod (egress allow-list).
3. Inspect alerts: `PaymentServiceDown`, `HighErrorRate{job="microservices",instance=~"payment.*"}`.

## Scale spike
- Confirm HPA: `kubectl get hpa -A`
- Confirm Cluster Autoscaler: `kubectl -n kube-system logs deploy/cluster-autoscaler`

## SLOs
| Service       | Availability | p95 latency | Error budget |
|---------------|-------------|-------------|--------------|
| user          | 99.9%       | 200ms       | 43m/month    |
| product       | 99.9%       | 200ms       | 43m/month    |
| order         | 99.95%      | 300ms       | 21m/month    |
| payment       | 99.99%      | 400ms       | 4m/month     |
| notification  | 99.5%       | 500ms       | 3.6h/month   |
