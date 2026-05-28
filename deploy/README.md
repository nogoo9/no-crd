# Deployment Manifests for no-crd

This directory contains standard Kubernetes manifests for deploying the `no-crd` MCP server and Pod Manager UI dashboard in a production or staging Kubernetes cluster.

## Manifests

- [`namespace.yaml`](file:///home/eterna2/github/nogoo9-no-crd/deploy/namespace.yaml): Creates the `nogoo9` namespace.
- [`serviceaccount.yaml`](file:///home/eterna2/github/nogoo9-no-crd/deploy/serviceaccount.yaml): Defines the `no-crd-mcp` ServiceAccount.
- [`rbac.yaml`](file:///home/eterna2/github/nogoo9-no-crd/deploy/rbac.yaml): Configures ClusterRole & ClusterRoleBinding with necessary RBAC permissions (pods, secrets, configmaps, serviceaccounts).
- [`deployment.yaml`](file:///home/eterna2/github/nogoo9-no-crd/deploy/deployment.yaml): The main Deployment spec running `ghcr.io/nogoo9/no-crd:latest` with configured probes, resources, and environment variable slots for OIDC auth and themes.
- [`open-webui-template.yaml`](file:///home/eterna2/github/nogoo9-no-crd/deploy/open-webui-template.yaml): ConfigMap manifest to register the Open WebUI workspace pod template.
- [`service.yaml`](file:///home/eterna2/github/nogoo9-no-crd/deploy/service.yaml): Creates a ClusterIP Service mapping port 3000.
- [`ingress.yaml`](file:///home/eterna2/github/nogoo9-no-crd/deploy/ingress.yaml): Example Ingress resource configuration for Nginx Ingress Controller with WebSocket upgrade support.

## Quick Start Deployment

1. **Apply the Namespace, ServiceAccount, and RBAC rules**:
   ```bash
   kubectl apply -f namespace.yaml
   kubectl apply -f serviceaccount.yaml
   kubectl apply -f rbac.yaml
   ```

2. **Configure Authentication (Optional)**:
   By default, `AUTH_ENABLED` is set to `"false"`. To enable OIDC auth, uncomment and fill in the OIDC variables in `deployment.yaml`.

3. **Deploy the Service, Template, and Ingress**:
   ```bash
   kubectl apply -f deployment.yaml
   kubectl apply -f open-webui-template.yaml
   kubectl apply -f service.yaml
   kubectl apply -f ingress.yaml
   ```

4. **Verify Deployment**:
   ```bash
   kubectl get pods -n nogoo9
   kubectl logs -l app=nogoo9-mcp -n nogoo9
   ```
