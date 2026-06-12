# Setup & Authentication Cheatsheet

This cheatsheet provides copy-pasteable commands, Kubernetes manifests, and typical environment configuration scenarios to get `@nogoo9/no-crd` up and running quickly.

---

## ⚡ 1-Minute Quick Start

Run the server immediately in **unsecured, cluster-wide development mode** using standard input/output (stdio) or HTTP/SSE:

```bash
# Option A: Run directly over stdio (For Cursor, Claude Desktop, Cline, Roo Code)
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

## 🔒 SSO & Identity Configuration Scenarios

To secure the gateway using a remote OIDC provider (e.g. Keycloak, Okta, Auth0) and routing proxy, configure these environment variables on your server:

::: code-group

```bash [Scenario 1: Keycloak / OIDC Provider]
# Enable Auth & OIDC Discovery
AUTH_ENABLED="true"
OAUTH_DISCOVERY_URL="http://keycloak:8080/realms/nogoo9/.well-known/openid-configuration"
JWKS_URI="http://keycloak:8080/realms/nogoo9/protocol/openid-connect/certs"
AUTH_ISSUER="http://localhost:8080/realms/nogoo9" # Public Issuer URL

# Client Credentials for authorization redirect & token refresh
OAUTH_CLIENT_ID="nogoo9-mcp"
OAUTH_CLIENT_SECRET="some-generated-client-uuid-or-secret"
JWT_AUDIENCE="nogoo9-mcp"

# Session Encryption (Used to sign cookies)
PROXY_SESSION_SECRET="my-secure-32-byte-cookie-secret-key"

# Access Controls and Mappings
AUTH_ROLES_JSONPATH="$.realm_access.roles"
AUTH_REQUIRED_READ_ROLE="viewer"
AUTH_REQUIRED_WRITE_ROLE="user"
AUTH_ADMIN_ROLE="admin"

AUTH_SCOPE_JSONPATH="$.scope"
AUTH_REQUIRED_READ_SCOPE="nogoo9:read"
AUTH_REQUIRED_WRITE_SCOPE="nogoo9:write"
AUTH_REQUIRED_ADMIN_SCOPE="nogoo9:admin"
```

```bash [Scenario 2: Symmetric Shared Secret (HMAC-SHA256)]
# Enable Auth
AUTH_ENABLED="true"

# Expected claims validation
AUTH_ISSUER="https://my-issuer.internal"
JWT_AUDIENCE="nogoo9-agent"

# Verification Key
JWT_SECRET="my-super-secret-signing-key-value-32-bytes-long"

# Session management
PROXY_SESSION_SECRET="another-secure-random-32-byte-hexadecimal-string"
```

```bash [Scenario 3: Asymmetric Public Key (RSA/ECDSA PEM)]
# Enable Auth
AUTH_ENABLED="true"

# Expected claims validation
AUTH_ISSUER="https://auth.mycompany.com"
JWT_AUDIENCE="nogoo9-gateway"

# Verification Key
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv1i... \n-----END PUBLIC KEY-----"

# Session management
PROXY_SESSION_SECRET="another-secure-random-32-byte-hexadecimal-string"
```

```bash [Scenario 4: Custom OAuth2 Provider (No Discovery)]
# Enable Auth
AUTH_ENABLED="true"
JWT_AUDIENCE="my-api-client"
AUTH_ISSUER="https://legacy-oauth.example.com"

# Signature Verification (using public certs endpoint)
JWKS_URI="https://legacy-oauth.example.com/api/v1/certs"

# Configure OAuth flow endpoints manually
OAUTH_CLIENT_ID="legacy-client-id"
OAUTH_AUTHORIZATION_URL="https://legacy-oauth.example.com/oauth2/authorize"
OAUTH_TOKEN_URL="https://legacy-oauth.example.com/oauth2/token"
OAUTH_END_SESSION_URL="https://legacy-oauth.example.com/oauth2/logout"

# Session Encryption
PROXY_SESSION_SECRET="legacy-oauth-cookie-crypt-secret-key-32-bytes"
```

```bash [Scenario 5: Token Introspection (RFC 7662)]
# Enable Auth
AUTH_ENABLED="true"

# Endpoint for active introspection
INTROSPECTION_ENDPOINT="https://keycloak.example.com/realms/nogoo9/protocol/openid-connect/token/introspect"

# Client credentials to authorize introspection query
OAUTH_CLIENT_ID="nogoo9-introspection-service"
OAUTH_CLIENT_SECRET="introspection-service-secret"

# Session Encryption
PROXY_SESSION_SECRET="introspection-session-cookie-secret-key-32-bytes"
```

:::
