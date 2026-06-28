#!/usr/bin/env bash
set -euo pipefail
SERVICE="${1:?}"; SLOT="${2:?}"
NS=$(yq ".namespace" "helm/${SERVICE}/values.yaml")
POD=$(kubectl -n "$NS" get pod -l "app=${SERVICE},slot=${SLOT}" -o jsonpath='{.items[0].metadata.name}')
kubectl -n "$NS" exec "$POD" -- wget -qO- http://localhost:$(yq '.service.port' helm/${SERVICE}/values.yaml)/health | grep -q '"status":"ok"'
echo "smoke-test passed: $SERVICE/$SLOT"
