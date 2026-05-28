#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

for cmd in k3d kubectl docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is not installed or not in PATH"
    exit 1
  fi
done

if k3d cluster list nogoo-dev &>/dev/null; then
  echo "==> Cluster nogoo-dev already exists. Starting it..."
  k3d cluster start nogoo-dev
else
  echo "==> Creating k3d cluster..."
  k3d cluster create --config "$SCRIPT_DIR/cluster.yaml"
fi

echo "==> Waiting for nodes to be ready..."
kubectl wait --for=condition=ready node --all --timeout=120s

echo "==> Patching kubeconfig server address (0.0.0.0 → 127.0.0.1)..."
KUBECONFIG="${HOME}/.kube/config"
if [ -f "$KUBECONFIG" ] && grep -q "0.0.0.0" "$KUBECONFIG"; then
  sed -i 's|https://0\.0\.0\.0:|https://127.0.0.1:|g' "$KUBECONFIG"
  echo "    Patched."
fi

echo "==> Configuring local registry hostname..."
if ! grep -q "nogoo9-registry.localhost" /etc/hosts; then
  echo "Tip: You can manually add '127.0.0.1 nogoo9-registry.localhost' to your /etc/hosts file if you want to use the domain name on your host."
fi

echo "==> Pre-loading test images into local registry..."
docker pull rustfs/rustfs:latest || true
docker tag rustfs/rustfs:latest localhost:5001/rustfs:latest
docker push localhost:5001/rustfs:latest

docker pull amazon/aws-cli:latest || true
docker tag amazon/aws-cli:latest localhost:5001/amazon/aws-cli:latest
docker push localhost:5001/amazon/aws-cli:latest

docker pull oven/bun:1-alpine || true
docker tag oven/bun:1-alpine localhost:5001/bun:latest
docker push localhost:5001/bun:latest

docker pull lscr.io/linuxserver/obsidian:latest || true
docker tag lscr.io/linuxserver/obsidian:latest localhost:5001/linuxserver/obsidian:latest
docker push localhost:5001/linuxserver/obsidian:latest

docker pull tsl0922/ttyd:latest || true
docker tag tsl0922/ttyd:latest localhost:5001/tsl0922/ttyd:latest
docker push localhost:5001/tsl0922/ttyd:latest

docker pull ghcr.io/open-webui/open-webui:main || true
docker tag ghcr.io/open-webui/open-webui:main localhost:5001/open-webui/open-webui:main
docker push localhost:5001/open-webui/open-webui:main


echo "==> Building and pushing @nogoo9/kube-mcp image..."
docker build -f "$WORKSPACE_ROOT/Dockerfile" -t localhost:5001/kube-mcp:latest "$WORKSPACE_ROOT"
docker push localhost:5001/kube-mcp:latest

echo "==> Building and importing antigravity-agent image..."
docker build -f "$WORKSPACE_ROOT/Dockerfile.agent" -t nogoo9/antigravity-agent:latest "$WORKSPACE_ROOT"
k3d image import nogoo9/antigravity-agent:latest -c nogoo-dev

echo "==> Applying manifests..."
kubectl apply -f "$SCRIPT_DIR/manifests/namespace.yaml"
kubectl apply -f "$SCRIPT_DIR/manifests/rustfs.yaml"
kubectl apply -f "$SCRIPT_DIR/manifests/keycloak/"

echo "==> Waiting for Keycloak to be ready..."
kubectl -n nogoo9 wait --for=condition=available deployment/keycloak --timeout=120s

echo "==> Waiting for RustFS to be ready..."
kubectl -n nogoo9 wait --for=condition=available deployment/rustfs --timeout=120s

echo "==> Pre-creating default S3 bucket 'nogoo9-test-bucket' in RustFS..."
kubectl run aws-cli-mb-bootstrap --rm -i --image=nogoo9-registry.localhost:5001/amazon/aws-cli:latest -n nogoo9 --restart=Never --env AWS_ACCESS_KEY_ID=test-access-key --env AWS_SECRET_ACCESS_KEY=test-secret-key --env AWS_ENDPOINT_URL=http://rustfs.nogoo9.svc.cluster.local:80 -- s3 mb s3://nogoo9-test-bucket || true

kubectl apply -f "$SCRIPT_DIR/manifests/mcp/"

echo "==> Forcing rollout restart of MCP server deployment..."
kubectl -n nogoo9 rollout restart deployment/nogoo-mcp

echo ""
echo "Cluster ready!"
echo "  Context:        k3d-nogoo-dev"
echo "  Registry:       nogoo9-registry.localhost:5001"
echo "  HTTP:           http://localhost:8080"
echo "  MCP Server:     http://localhost:8080/mcp"
echo "  Keycloak:       http://localhost:8080/auth"
echo ""
kubectl get nodes
kubectl -n nogoo9 get all
