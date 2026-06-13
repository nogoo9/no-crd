# ADR-021: Workspace API Annotations and Routing Proxy Visibility Controls

## Status
Accepted

## Date
2026-06-11

## Context
Workspace applications run within ephemeral pods and expose web interfaces and helper APIs. To allow secure OIDC-integrated routing without hardcoding specific endpoints (such as `/stats` or `/last-activity`) in the gateway routing proxy, we need a flexible, annotation-driven mechanism.

Specifically:
- Workspace pod templates must be able to declare additional HTTP or WebSocket endpoints.
- Each custom API requires specification of its port, path, HTTP methods, refresh patterns, and visibility controls.
- Visibility controls must specify precisely who is allowed to access the route. We need to support owner-only endpoints, internal authenticated endpoints, administrator-restricted endpoints, and specific scope/role requirements or lists of user subjects.

## Decision
We establish a unified annotation namespace and parsing model to register and secure workspace APIs:

### 1. API Annotation Keys
Additional workspace APIs are declared on template or workspace pod metadata annotations using the format:
`nogoo9/api.<api-name>.<field>`

The fields are:
- `port`: The internal container port to route traffic to (required to register the API).
- `path`: The routing path suffix matching incoming requests (defaults to `/`).
- `desc`: A short description of the endpoint for tool description and catalog discovery.
- `method`: Comma-separated HTTP methods supported by the API (e.g., `GET,POST`, defaults to `*` / all methods).
- `refresh`: Auto-refresh interval (e.g. `30s`, `1m`) or `init` to query once.
- `visibility`: Access control mode restricting routing proxy access.

### 2. Visibility Access Control Matrix
The routing proxy (`proxyPreHandler` in HTTP and WebSocket upgrade checks) matches requests to the most specific registered subpath and enforces visibility rules:

| Visibility Value | Access Check Logic | Use Case |
| :--- | :--- | :--- |
| `private` (default) | Allowed only if the caller's `userSub` matches the workspace's `nogoo9/user-sub` label/annotation. | Workspace owner data, main application console, or terminal access. |
| `internal` | Allowed for any authenticated caller. | Generic status flags, health metrics, or shared tools. |
| `admin` | Allowed if caller is the workspace owner, OR has the admin scope AND the admin role. | Admin-restricted metrics, monitoring, or debug helpers. |
| `scope:<scope_name>` | Allowed if caller has the specified scope in their token (verified via `hasRequiredScope`). | Clients with specific API permissions (e.g. `scope:mcp:read`). |
| `role:<role_name>` | Allowed if caller has the specified role in their token (verified via `hasRequiredRole`). | Users with specific organizational roles. |
| Comma-separated list | Allowed if caller is the workspace owner, OR their `userSub` is in the list. | Specific shared users (e.g., `user-sub-1,user-sub-2`). |

### 3. Reserved API Defaults
For backwards compatibility and out-of-the-box security:
- Registered APIs named `stats` or `last_activity` (or `last-activity`) automatically default to `admin` visibility if no custom visibility annotation is specified.

## Alternatives Considered
- **Hardcoded Proxy Route Rules**: Hardcoding endpoints like `/stats` directly in the proxy would lock down the proxy design and prevent dynamic apps from exposing custom administrative metrics or dashboard pages.
- **Separate Ingress Resources**: Declaring ingress resources dynamically for every sub-API adds cluster routing overhead and bypasses our OIDC session cookie authentication layer.

## Consequences
- **Improved Extensibility**: Developer-oriented templates can easily declare auxiliary endpoints with fine-grained access limits.
- **Consistent Authentication**: Custom subpaths leverage the central gateway OIDC/JWT validations seamlessly.

## Amendments

| Date | Change |
|------|--------|
| 2026-06-13 | Promoted from `Proposed` to `Accepted`. Core annotation parsing (`parseWorkspaceApis`) is implemented in `src/mcp/templates.ts` and the `WORKSPACE_AUTH_MODE` annotation key is defined in `src/config/annotations.ts`. Proxy visibility enforcement and API route matching are operational. |
