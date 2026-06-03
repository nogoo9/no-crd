# Setup Cheatsheet

This cheatsheet provides copy-pasteable commands and manifests to get `@nogoo9/no-crd` up and running in a few minutes.

---

## ⚡ 1-Minute Quick Start

Run the server immediately in **unsecured, cluster-wide development mode** using standard input/output (stdio) or HTTP/SSE:

```bash
# Option A: Run directly over stdio (For Cursor, Claude Desktop, Cline)
npx @nogoo9/no-crd --transport stdio --mode cluster

# Option B: Run as a local HTTP server on port 3000 (with UI enabled)
npx @nogoo9/no-crd --transport http --port 3000
```

---

## ☸️ Minimal RBAC Configuration

Deploy these manifests to authorize the MCP server's service account. 

::: code-group

```yaml [Namespace-Scoped Role]
# Restricts operations strictly to the target namespace (e.g. "nogoo9")
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nogoo-mcp-sa
  namespace: nogoo9
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: nogoo-mcp-role
  namespace: nogoo9
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch", "create", "delete", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: nogoo-mcp-binding
  namespace: nogoo9
subjects:
  - kind: ServiceAccount
    name: nogoo-mcp-sa
    namespace: nogoo9
roleRef:
  kind: Role
  name: nogoo-mcp-role
  apiGroup: rbac.authorization.k8s.io
```

```yaml [Cluster-Wide Role]
# Allows spawning/managing workspaces across any namespace in the cluster
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nogoo-mcp-sa
  namespace: nogoo9
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nogoo-mcp-cluster-role
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch", "create", "delete", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: nogoo-mcp-cluster-binding
subjects:
  - kind: ServiceAccount
    name: nogoo-mcp-sa
    namespace: nogoo9
roleRef:
  kind: ClusterRole
  name: nogoo-mcp-cluster-role
  apiGroup: rbac.authorization.k8s.io
```

:::

---

## 📦 Defining a Pod Template

Save this template as a ConfigMap in your Kubernetes cluster (`kubectl apply -f template.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: default-node-template
  namespace: nogoo9
  labels:
    nogoo9/pod-template: "true"
  annotations:
    nogoo9/description: "Lightweight Node.js agent workspace"
    nogoo9/tag: "node-22"
    nogoo9/workspace-port: "3000"
data:
  spec: |
    {
      "containers": [
        {
          "name": "workspace",
          "image": "node:22-alpine",
          "command": ["sleep", "infinity"]
        }
      ]
    }
```

---

## 🚀 Spawning Workspaces via MCP Tools

Use these JSON-RPC payloads in your agent clients to interact with the workspace spawner:

::: code-group

```json [1. spawn_workspace]
// Spawns a pod using the template ConfigMap
{
  "method": "tools/call",
  "params": {
    "name": "spawn_workspace",
    "arguments": {
      "id": "dev-env-session-1",
      "templateRef": "default-node-template",
      "namespace": "nogoo9"
    }
  }
}
```

```json [2. list_workspaces]
// Retrieves active agent workspaces
{
  "method": "tools/call",
  "params": {
    "name": "list_workspaces",
    "arguments": {
      "namespace": "nogoo9"
    }
  }
}
```

```json [3. stop_workspace]
// Gracefully stops and cleans up the pod
{
  "method": "tools/call",
  "params": {
    "name": "stop_workspace",
    "arguments": {
      "id": "dev-env-session-1",
      "namespace": "nogoo9"
    }
  }
}
```

:::

---

## 🔒 Enabling SSO Authentication & Proxy Routing

To secure the gateway using a remote OIDC provider (e.g. Keycloak, Okta, Auth0) and routing proxy, configure these environment variables on your server:

```bash
# 1. Toggle Auth Checks on API & Proxy
AUTH_ENABLED="true"

# 2. Configure Token Verification (e.g. Keycloak realm keys)
JWKS_URI="http://keycloak.security.svc.cluster.local:8080/auth/realms/nogoo9/protocol/openid-connect/certs"
AUTH_ISSUER="http://keycloak.security.svc.cluster.local:8080/auth/realms/nogoo9"
JWT_AUDIENCE="http://localhost:3000"

# 3. Setup Session Cookie Signing Key (Production)
PROXY_SESSION_SECRET="generate-a-secure-random-32-byte-hexadecimal-string"
```

Once configured:
- Requests without a valid JWT token in the `Authorization: Bearer <token>` header or `?token=` parameter will be challenged with `401 Unauthorized`.
- Users can access running web services (like code-servers, Jupyter notebooks) via:
  `http://localhost:3000/route/dev-env-session-1/`
