#!/usr/bin/env bash
set -euo pipefail
echo "==> Provisioning infra (Terraform)"
(cd terraform && terraform init && terraform apply -auto-approve)
echo "==> Configuring kubectl"
aws eks update-kubeconfig --name ecom-prod --region us-east-1
echo "==> Installing platform components"
helm repo add hashicorp https://helm.releases.hashicorp.com
helm upgrade --install consul hashicorp/consul -n consul --create-namespace -f k8s/consul/values.yaml
kubectl apply -f k8s/networkpolicies/
kubectl apply -f k8s/nginx/nginx-gateway.yaml
echo "==> Done. Deploy services with: ./scripts/deploy-bluegreen.sh <service> <tag>"
