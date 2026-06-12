# Architecture & Multi-Tenancy

`@nogoo9/no-crd` is designed to be hosted in a Kubernetes cluster as a multi-tenant platform service. This architecture enables developers and AI agents to spin up containerized workspaces dynamically, while routing traffic securely to the running containers without exposed services or ingress configuration.

---

## 🏗️ Architecture Topology

The service sits between your developers (or their AI agents) and the Kubernetes API server, acting as a gateway and a reverse routing proxy:

![Architecture Topology](/architecture_diagram.png)

### Key Architectural Components

1. **MCP Server Gateway**: Processes incoming tool requests via Stdio or SSE transport.
2. **HTTP Routing Proxy**: A built-in Fastify-based proxy that maps incoming subpath traffic (`/route/<workspace-id>/*`) directly to the corresponding Pod IP inside the cluster.
3. **Auth Engine (RBAC/ABAC)**: Validates OpenID Connect (OIDC) JWT claims, matches scopes/roles, and maps identity to Kubernetes namespaces.
4. **Workspace Spawner**: Interacts with the Kubernetes API to orchestrate Pod lifecycles, inject init-containers, mount volumes, and manage ServiceAccounts.

---

## 🛡️ Multi-Tenant Resource Isolation

When `AUTH_ENABLED="true"` is set, the gateway enforces strict isolation between users to prevent cross-tenant workspace access:

### 1. Resource Stamping & Labels
All resources created during workspace spawning are tagged with the user's OIDC subject identity (`sub` claim):
- **Pods**: Stamped with the label `nogoo9/user-sub` and the annotation `nogoo9/user-sub`.
- **ServiceAccounts**: Labeled and annotated similarly when dynamically provisioned with IAM Roles.

The user's identity is extracted from the JWT token claims using the JSONPath expression configured via `AUTH_SUB_JSONPATH` (which defaults to `$.sub`).

### 2. Authorization Boundaries
- **Workspace Query Isolation (`list_workspaces`)**: When listing workspaces, the API filters pods in Kubernetes using a label selector matching the authenticated user's ID:
  ```
  nogoo9/user-sub=<user-sub>
  ```
  Users cannot discover or list workspaces owned by other subjects.
- **Teardown Isolation (`stop_workspace`)**: Deleting or stopping a workspace requires a matching owner subject. If a user attempts to terminate another user's workspace, the server returns a `404 Not Found` or `403 Forbidden` response.
- **Proxy Routing Isolation (`/route/:workspaceId/*`)**: The routing proxy intercepts every incoming request. It queries the target pod inside the cluster and validates that the requesting user's `sub` claim matches the `nogoo9/user-sub` label on the Pod. If there is a mismatch, the gateway returns a `403 Forbidden` error.
