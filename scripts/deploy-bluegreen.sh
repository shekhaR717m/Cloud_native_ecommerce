#!/usr/bin/env bash
# Blue-Green cutover: deploy NEW slot, smoke-test, flip Service selector, retain OLD for rollback.
set -euo pipefail
SERVICE="${1:?service name required}"
TAG="${2:?image tag required}"

command -v helm >/dev/null || { echo "helm is required" >&2; exit 1; }
command -v kubectl >/dev/null || { echo "kubectl is required" >&2; exit 1; }
command -v yq >/dev/null || { echo "yq is required" >&2; exit 1; }
test -d "helm/${SERVICE}" || { echo "unknown service: ${SERVICE}" >&2; exit 1; }

NS=$(yq -r '.namespace' "helm/${SERVICE}/values.yaml")
SERVICE_EXISTS=true
CURRENT=$(kubectl -n "$NS" get svc "$SERVICE" -o jsonpath='{.spec.selector.slot}' 2>/dev/null) || SERVICE_EXISTS=false
CURRENT=${CURRENT:-blue}
NEW=$([[ "$CURRENT" == "blue" ]] && echo green || echo blue)
MANAGE_SERVICE=$([[ "$SERVICE_EXISTS" == "true" ]] && echo false || echo true)

echo "==> Current=$CURRENT  New=$NEW"

helm upgrade --install "${SERVICE}-${NEW}" "helm/${SERVICE}" \
  --namespace "$NS" \
  --create-namespace \
  --set image.tag="$TAG" \
  --set bluegreen.slot="$NEW" \
  --set service.enabled="$MANAGE_SERVICE" \
  --wait --timeout 5m

kubectl -n "$NS" rollout status "deployment/${SERVICE}-${NEW}" --timeout=5m

echo "==> Smoke-testing $NEW slot"
./scripts/smoke-test.sh "$SERVICE" "$NEW"

echo "==> Flipping Service selector $CURRENT -> $NEW"
kubectl -n "$NS" patch svc "$SERVICE" -p "{\"spec\":{\"selector\":{\"app\":\"$SERVICE\",\"slot\":\"$NEW\"}}}"

echo "==> Done. Old slot ($CURRENT) retained for fast rollback."
echo "    Rollback: kubectl -n $NS patch svc $SERVICE -p '{\"spec\":{\"selector\":{\"app\":\"$SERVICE\",\"slot\":\"$CURRENT\"}}}'"
