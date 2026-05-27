# Local Kubernetes Dev Sandbox (k3d)

This guide details the configurations and steps to bootstrap a local Kubernetes development environment using `k3d`. It is designed to run, test, and validate the `@nogoo9/kube-mcp` service, Keycloak OIDC authentication, and resource-isolated workspace lifecycles in a production-like setting.

---

## 1. System Architecture

The local development cluster routes all external traffic through a single Traefik Ingress controller mapped to port `8080` on the host machine. 

```mermaid
graph TD
    subgraph Host Machine
        HostPort[http://localhost:8080]
        RegistryPort[localhost:5001]
    end

    subgraph k3d Cluster (nogoo-dev)
        Ingress[Traefik Ingress Controller] -->|/auth| KeycloakService[Keycloak Service]
        Ingress -->|/mcp| McpService[MCP Server Service]
        Ingress -->|/route/:id| McpService
        
        McpService -->|Proxies dynamically| PodA[Workspace Pod A]
        McpService -->|Proxies dynamically| PodB[Workspace Pod B]

        McpService -->|Dynamic JWKS Resolution| KeycloakService
        
        PodA -->|AWS SDK S3 Sync| RustfsService[Rustfs Mock S3 Service]
        PodB -->|AWS SDK S3 Sync| RustfsService
    end

    HostPort --> Ingress
    RegistryPort --> LocalRegistry[Local Registry: nogoo9-registry.localhost]
```

### Ingress Routing Rules
- `/auth` routes to Keycloak (`keycloak:8080`) for user authentication.
- `/mcp` routes to the MCP Server (`nogoo-mcp:3000`) for SSE/JSON-RPC interactions.
- `/route/<workspace-id>/` routes to the MCP Server proxy which dynamically forwards requests to the designated running agent workspace pod.

---

## 2. Prerequisites

Ensure you have the following installed locally:
- **Docker**
- **k3d** (`curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | TAG=v5.6.0 bash`)
- **kubectl**
- **Bun** (for running scripts and package management)
- **Moon** (workspace task runner)

---

## 3. Bootstrapping the Cluster

To spin up the cluster, build the images, push them to the local registry, and deploy all manifests:

```bash
# Using Moon
moon run k3d:bootstrap

# Or run the script directly
./bootstrap.sh
```

### What happens under the hood?
1. **Cluster Creation**: Initializes a single-node k3d cluster named `nogoo-dev` using [cluster.yaml](https://github.com/nogoo9/no-crd/blob/main/infra/k3d/cluster.yaml).
2. **Kubeconfig Patching**: Modifies your active kubeconfig to route the Kubernetes API server via loopback (`127.0.0.1`) instead of `0.0.0.0`.
3. **Image Cache Pre-loading**: Pulls external test images (`rustfs`, `aws-cli`, `bun`) and pushes them to the local registry at `nogoo9-registry.localhost:5001`.
4. **Local Builds**:
   - Builds the `@nogoo9/kube-mcp` image and pushes it to the registry.
   - Builds the `nogoo9/antigravity-agent` image and imports it directly into the cluster.
5. **Manifest Application**: Installs the namespace (`nogoo9`), RBAC rules, Keycloak (pre-loaded with realms and users), `rustfs` mock storage service, and the MCP server.

To start a stopped cluster without repeating the full bootstrap process:
```bash
moon run k3d:start
```

---

## 4. Exposed Services & Endpoints

Once bootstrapped, the following services are reachable from your host machine:

| Service | Port / Protocol | Local Endpoint | Details & Credentials |
| :--- | :--- | :--- | :--- |
| **MCP Server SSE** | HTTP / SSE | `http://localhost:8080/mcp` | Primary entry point for MCP clients (Inspector, Cursor, etc.). |
| **Keycloak Console** | HTTP | `http://localhost:8080/auth` | OIDC Admin Console. Admin Credentials: `admin` / `admin`. |
| **Keycloak Realm OIDC** | HTTP / JSON | `http://localhost:8080/auth/realms/nogoo9/.well-known/openid-configuration` | OpenID discovery configuration endpoint. |
| **Keycloak JWKS** | HTTP / JSON | `http://localhost:8080/auth/realms/nogoo9/protocol/openid-connect/certs` | JWK Set endpoint for signature validation. |
| **Rustfs Mock S3** | HTTP (In-cluster only) | `http://rustfs.nogoo9.svc.cluster.local:80` | Mock S3 Bucket Storage. Access Key: `test-access-key` / Secret Key: `test-secret-key`. |

---

## 5. Authentication & Authorization (No-CRD Side)

The project includes built-in OIDC-compliant authentication, user-level RBAC, and tenant resource isolation, enforced entirely without Custom Resource Definitions (CRDs).

### 5.1 Configuration
Authentication behavior on the MCP server is governed by the following environment variables (defined in [deployment.yaml](https://github.com/nogoo9/no-crd/blob/main/infra/k3d/manifests/mcp/deployment.yaml)):
- `AUTH_ENABLED="true"`: Toggles authentication checks.
- `JWKS_URI`: Cluster-internal URL to retrieve Keycloak public keys to verify signature integrity.
- `AUTH_ISSUER`: Expected token issuer (`http://localhost:8080/auth/realms/nogoo9`).
- `AUTH_SUB_JSONPATH`: JSONPath expression to extract the unique user identifier (default: `$.sub`).
- `AUTH_ADMIN_JSONPATH`: JSONPath to locate role array claims (default: `$.realm_access.roles`).
- `AUTH_ADMIN_ROLE`: Role name granting admin escalation capabilities (default: `nogoo9-admin`).
- `AUTH_REQUIRED_READ_SCOPE`: Scope required for read operations (e.g. `mcp:read`).
- `AUTH_REQUIRED_WRITE_SCOPE`: Scope required for write/mutation operations (e.g. `mcp:write`).
- `AUTH_SCOPE_JSONPATH`: JSONPath to locate scope claims in the token (default: `$.scope`).
- `AUTH_REQUIRED_READ_ROLE`: User role required for read operations (e.g. `mcp-reader`).
- `AUTH_REQUIRED_WRITE_ROLE`: User role required for write/mutation operations (e.g. `mcp-writer`).
- `AUTH_ROLES_JSONPATH`: JSONPath to locate user role claims in the token (default: `$.realm_access.roles`).

### 5.2 Token Acceptance
The MCP server accepts JWTs via three mechanisms:
1. **Authorization Header**: `Authorization: Bearer <token>`
2. **Query Parameter**: `?token=<token>`
3. **Cookie**: Cookie named `nocr_token` (typically used for routed session persistence).

### 5.3 OIDC Realm Users
Keycloak is provisioned with a realm named `nogoo9` and two preset developer accounts:
- **Standard User**: `testuser` / `password` (has no special roles; restricted to own workspaces).
- **Admin User**: `adminuser` / `password` (has the `nogoo9-admin` role; possesses administrative rights).

### 5.4 RBAC & Tenant Isolation
- **Resource Ownership Enforcer**: When `AUTH_ENABLED` is `true`, any invocation of pod management tools (`list_pods`, `get_pod`, `delete_pod`, `list_workspaces`, `stop_workspace`, `spawn_workspace`) automatically extracts the requester's `sub` identifier. The server then appends `nogoo9/user-sub=<extracted-sub>` as a label selector filter to all Kubernetes API queries and assigns it to created pods/workspaces.
- **Admin Bypass**: Users carrying the `nogoo9-admin` role bypass the sub-filtering, allowing cluster administrators to query, inspect, and delete workspaces belonging to any tenant.
- **Routing Proxy Owner Check**: The `/route/<workspace-id>/` proxy ensures that standard users can only route traffic to workspaces they own. When a standard user accesses their workspace with a valid Bearer token, the proxy issues a path-scoped cookie:
  ```http
  Set-Cookie: nocr_token=<token>; Path=/route/<workspace-id>/; SameSite=Lax; HttpOnly; Max-Age=86400
  ```
  Subsequent requests to sub-resources (like static HTML, CSS, and JS files) automatically present the cookie, maintaining authentication without requiring headers on every asset request.
- **RFC 9728 Compliance**: If a client attempts to connect to `/mcp`, `/permissions`, or `/route/*` without a valid token, the server returns a `401 Unauthorized` response with matching `WWW-Authenticate` and `Link` headers directing clients to the OAuth protected resource metadata endpoint (`/.well-known/oauth-protected-resource`).

---

## 6. Running the Demos & Verification Tests

### Scenario A: Local Workspace Lifecycle Demo
This demo launches a stdio-based MCP client, registers templates, spawns a workspace pod, executes commands inside it, validates local S3 sync, and stops the workspace (checking that data is synced back to S3 on shutdown).

```bash
bun run test:lifecycle
```

### Scenario B: E2E Authentication & Resource Isolation Test
This validates the authentication challenges, token-fetching, RBAC isolation boundary, admin escalation, and proxy cookie persistence against the running cluster.

```bash
moon run mcp:test-e2e-auth
```

### Scenario C: Interactive Tool Debugging via MCP Inspector
To manually test and debug the MCP tools in a browser-based UI:

1. Launch the inspector from the project root:
   ```bash
   moon run mcp:inspect # or: bun run inspect
   ```
2. Open `http://localhost:6277` in your browser.
3. Select **SSE** (Server-Sent Events) as the connection type.
4. Set the SSE URL to `http://localhost:8080/mcp`.
5. *Note: If `AUTH_ENABLED` is true, you must provide a valid OIDC token in the headers/query parameters (e.g. `?token=<JWT>`) to successfully connect.*

---

## 7. Development Iteration

If you modify the MCP server source code and want to redeploy it to the cluster:

```bash
# Redeploy on Linux / macOS
moon run mcp:deploy

# Redeploy if using Windows / WSL 2
moon run mcp:deploy-wsl
```

This task compiles the TypeScript codebase, rebuilds the docker container, pushes it to your local registry, and triggers a Kubernetes rolling rollout restart:
```bash
kubectl -n nogoo9 rollout restart deployment/nogoo-mcp
```

---

## 8. Teardown

To delete all deployments, stop the registry, and completely destroy the k3d cluster:

```bash
# Using Moon
moon run k3d:teardown

# Or run the script directly
./teardown.sh
```
