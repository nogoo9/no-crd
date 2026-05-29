# Authentication & Authorization Hardening

This document details the authentication and authorization enhancements introduced in `v0.3.0` to secure workspaces and Kubernetes pods.

> [!TIP]
> For a comprehensive guide on how cookies and sessions work end-to-end (including the `nocr_sess` stateless session cookie, logout flow, and multi-replica key sharing), see the [Session & Cookie Management](/session-cookies) page.
> Related ADRs: [ADR-002](/decisions/ADR-002-stateless-session-cookies), [ADR-003](/decisions/ADR-003-peer-discovery-session-key), [ADR-011](/decisions/ADR-011-ui-base-url-and-cookie-path-consistency).

## 1. Raw Pod Tools Owner Isolation

In previous versions, while workspace lifecycle tools (such as `list_workspaces` and `stop_workspace`) performed owner validation, raw Kubernetes pod management tools (`list_pods`, `get_pod`, `create_pod`, `delete_pod`, `patch_pod`, and `get_pod_logs`) allowed unchecked access. Any user presenting a valid JWT could view, patch, or delete pods belonging to other users.

In `v0.3.0`, all 6 raw pod tools are protected by identity-based owner verification:

- **Identity Extraction**: The `jwtPayload` is retrieved either via the direct tool parameter or context propagation (`requestContextStore`). The owner's identity is extracted via `extractUserIdentity` using JSONPath.
- **Admin Escalation**: Admin users bypass ownership constraints. Admin verification checks if the claim at `AUTH_ADMIN_JSONPATH` contains the role `AUTH_ADMIN_ROLE` (defaults: `$.realm_access.roles` and `nogoo9-admin` respectively).
- **Per-User Filtering (`list_pods`)**: If the caller is not an admin, a selector of `nogoo9/user-sub=<sub>` is appended to the Kubernetes list operation.
- **Ownership Verification (`get_pod`, `delete_pod`, `patch_pod`, `get_pod_logs`)**: If the caller is not an admin, the pod is first fetched, and its `metadata.labels["nogoo9/user-sub"]` label is checked against the user's identity. If they do not match, a `403 Forbidden` response is returned.
- **Ownership Injection (`create_pod`)**: The `nogoo9/user-sub` label and annotation are injected automatically.

## 2. Routing Proxy Cookie Authentication

The routing proxy (routing requests to `/route/<id>/*` to the pod's IP) previously authenticated users solely via the `?token=` query parameter. Because sub-resources within a page use relative links, subsequent requests (e.g. for CSS or JS) lacked the query parameter, causing requests to fail with a `401 Unauthorized`.

To resolve this:

1. **Set-Cookie on Hit**: When a request to `/route/<workspace-id>/` is received with a valid token (via `Authorization` header or `?token=` query param), the proxy sets a session cookie:
   ```http
   Set-Cookie: nocr_token=<token>; Path=/route/<workspace-id>/; SameSite=Lax; HttpOnly; Max-Age=86400
   ```
2. **Priority Extraction Chain**: On subsequent requests to the subpath, the server checks for the token in the following order:
   - `Authorization: Bearer <token>` header
   - `?token=<token>` query parameter
   - `nocr_token` cookie

Since the cookie is locked to `Path=/route/<workspace-id>/`, relative assets naturally send the cookie, preserving session state and security boundaries.

## 3. New `get_workspace` Tool

We added a new tool, `get_workspace`, to fetch details of a single workspace pod.

### Input Schema
```json
{
  "id": "workspace-id",
  "namespace": "optional-namespace",
  "jwtPayload": {}
}
```

### Output Schema (`GetWorkspaceOutputSchema`)
```typescript
{
  "id": "workspace-id",
  "name": "pod-name",
  "status": "Running",
  "podIP": "10.0.0.5",
  "port": "8080",
  "previewPath": "/preview-file.md",
  "previewType": "markdown",
  "userSub": "user-identity",
  "annotations": {}
}
```
If `AUTH_ENABLED` is true, the tool restricts queries to workspaces owned by the user (`nogoo9/user-sub` label check) unless they possess the admin role.

## 4. Parameterizable OAuth Scope Enforcement

To support advanced integration with external Single Sign-On (SSO) and API gateways, `v0.3.0` introduces parameterizable OAuth scope enforcement:

- **Configure Scopes**:
  - `AUTH_REQUIRED_READ_SCOPE`: Scope required for read operations (e.g., `mcp:read`). If not set, read scope checks are bypassed.
  - `AUTH_REQUIRED_WRITE_SCOPE`: Scope required for write/mutation operations (e.g., `mcp:write`). If not set, write scope checks are bypassed.
  - `AUTH_SCOPE_JSONPATH`: JSONPath expression to extract scope claims from the JWT payload (defaults to `$.scope`).
- **Enforcement Rules**:
  - **MCP Tools**: Read-only tools require the read scope, while creation, updating, deletion, and spawning tools require the write scope.
  - **HTTP Endpoints**: Endpoints like `/permissions` and `/mcp` SSE streams require the read scope.
  - **Routing Proxy (`/route/*`)**: Enforces the read scope on `GET`, `HEAD`, and `OPTIONS` requests, and the write scope on `POST`, `PUT`, `PATCH`, and `DELETE` requests.
- **Robust Claim Handling**: Supports standard space-separated scope strings and array lists, with automatic fallback checks to `$.scp` and root properties `.scope` / `.scp`.

