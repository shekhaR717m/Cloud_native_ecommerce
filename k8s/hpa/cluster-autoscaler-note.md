Install Cluster Autoscaler via Helm:

helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=ecom-prod \
  --set awsRegion=us-east-1
