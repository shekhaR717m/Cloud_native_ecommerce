#!/usr/bin/env bash
# Blue-Green cutover: deploy NEW slot, smoke-test, flip Service selector, retain OLD for rollback.
set -euo pipefail
SERVICE="${1:?service name required}"
TAG="${2:?image tag required}"

NS=$(yq '.namespace' "helm/${SERVICE}/values.yaml")
CURRENT=$(kubectl -n "$NS" get svc "$SERVICE" -o jsonpath='{.spec.selector.slot}' 2>/dev/null || echo blue)
NEW=$([[ "$CURRENT" == "blue" ]] && echo green || echo blue)

echo "==> Current=$CURRENT  New=$NEW"

helm upgrade --install "${SERVICE}-${NEW}" "helm/${SERVICE}" \
  --namespace "$NS" \
  --set image.tag="$TAG" \
  --set bluegreen.slot="$NEW" \
  --wait --timeout 5m

echo "==> Smoke-testing $NEW slot"
./scripts/smoke-test.sh "$SERVICE" "$NEW"

echo "==> Flipping Service selector $CURRENT -> $NEW"
kubectl -n "$NS" patch svc "$SERVICE" -p "{\"spec\":{\"selector\":{\"app\":\"$SERVICE\",\"slot\":\"$NEW\"}}}"

echo "==> Done. Old slot ($CURRENT) retained for fast rollback."
echo "    Rollback: kubectl -n $NS patch svc $SERVICE -p '{\"spec\":{\"selector\":{\"app\":\"$SERVICE\",\"slot\":\"$CURRENT\"}}}'"
