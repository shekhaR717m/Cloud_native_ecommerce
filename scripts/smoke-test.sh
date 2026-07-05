#!/usr/bin/env bash
set -euo pipefail
SERVICE="${1:?service name required}"
SLOT="${2:?slot required}"

command -v kubectl >/dev/null || { echo "kubectl is required" >&2; exit 1; }
command -v yq >/dev/null || { echo "yq is required" >&2; exit 1; }
test -d "helm/${SERVICE}" || { echo "unknown service: ${SERVICE}" >&2; exit 1; }

NS=$(yq -r ".namespace" "helm/${SERVICE}/values.yaml")
PORT=$(yq -r '.service.port' "helm/${SERVICE}/values.yaml")
kubectl -n "$NS" wait --for=condition=Ready pod -l "app=${SERVICE},slot=${SLOT}" --timeout=120s
POD=$(kubectl -n "$NS" get pod -l "app=${SERVICE},slot=${SLOT}" -o jsonpath='{.items[0].metadata.name}')
kubectl -n "$NS" exec "$POD" -- wget -qO- "http://localhost:${PORT}/health" | grep -q '"status":"ok"'
echo "smoke-test passed: $SERVICE/$SLOT"
