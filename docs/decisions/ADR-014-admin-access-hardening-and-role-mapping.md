# ADR-014: Hardened Administrator Access with Scope and Role Mapping

## Status
Accepted

## Date
2026-06-07

## Context
In the pod lifecycle orchestrator, security constraints are enforced at the Model Context Protocol (MCP) server tool level and the HTTP/WebSocket routing proxy level. Historically:
- Administrators only needed the admin role (configured via `AUTH_ADMIN_ROLE`, defaulting to `"admin"` or `"nogoo9-admin"`) to bypass tenancy filtering and manage resources of other users.
- Scope checks validated standard scopes (`"nogoo9:read"` / `"nogoo9:write"`), but there was no dedicated scope required for administrative endpoints.
- Under v0.7.0, we parameterized default roles/scopes (migrating defaults to `viewer` for read, `user` for write, and `admin` for admin actions).

We need to harden administrative operations to prevent privilege escalation. Specifically:
- Admin actions (listing all workspaces/pods, deleting resources of other users, spawning workspaces with custom owner subjects) must require both the admin role and a specific admin scope (`AUTH_REQUIRED_ADMIN_SCOPE`, default `"nogoo9:admin"`).
- The admin scope should satisfy standard read and write scope checks so that admin clients do not need to request separate read/write scopes explicitly.
- Tokens completely lacking a scope claim must bypass scope validation, allowing fallback role configuration to determine access.

## Decision
Implement a hardened admin access policy and scope hierarchy in the authentication module:

1. **Admin Scope Verification**:
   Introduce `AUTH_REQUIRED_ADMIN_SCOPE` (defaulting to `"nogoo9:admin"`). Refactor `verifyAccessOrThrow` to validate both:
   * The admin role (`AUTH_ADMIN_ROLE`) is present.
   * The admin scope (`AUTH_REQUIRED_ADMIN_SCOPE`) is present.

2. **Scope Hierarchy Resolution**:
   Update `hasRequiredScope` so that if the requested scope is a standard read/write scope, it returns `true` if the payload contains the configured admin scope.

3. **Scope Bypass for Scope-less Tokens**:
   If the token payload contains no scope claim (e.g. `scope` or `scp` claim is missing, null, or empty), `hasRequiredScope` automatically returns `true`, allowing the role-check phase of validation to decide access.

4. **Integration with MCP Tools**:
   Refactor all administrative authorization checks in pod tools (`src/mcp/pods.ts`) and spawner tools (`src/mcp/spawner.ts`) to use `verifyAccessOrThrow(jwtPayload, "admin")`.

5. **Sandbox Infrastructure alignment**:
   Add `"nogoo9:admin"` as a client scope in Keycloak configuration (`realm-configmap.yaml`), default client scopes, and define it in the MCP server deployment environment specs.

## Alternatives Considered

### Relying solely on OAuth Scopes for Admin operations
- **Pros**: Cleaner separation from roles.
- **Cons**: Bypasses Keycloak role mappings which are preferred for group-based administration.
- **Rejected**: Requiring both role and scope provides defense-in-depth, matching standard delegated authorization patterns (where scopes denote client application capabilities and roles denote user authorization).

### Strict Disjunction (Requiring admin client to possess all scopes)
- **Pros**: Simple validation code.
- **Cons**: Administrative clients must explicitly specify `"nogoo9:read nogoo9:write nogoo9:admin"`, leading to verbose tokens and configuration.
- **Rejected**: A scope hierarchy where `"nogoo9:admin"` acts as a superset is cleaner and simplifies client integration.

## Consequences
- Admin operations are secured against tokens that have only the admin role but standard read/write scopes.
- Bypassing scope checks for scope-less tokens ensures backward compatibility for credentials that rely exclusively on role assignments.
- Keycloak configurations, sandbox deployments, and E2E authentication scripts require updates to request and map the `"nogoo9:admin"` scope.
