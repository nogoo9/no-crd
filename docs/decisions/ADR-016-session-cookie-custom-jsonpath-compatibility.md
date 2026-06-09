# ADR-016: Session Cookie Reconstitution Compatibility with Custom JSONPaths

## Status
Accepted

## Date
2026-06-09

## Context
When proxy session authentication is enabled, the gateway uses signed session cookies (`nocr_sess`) to maintain user sessions. To minimize cookie size, the cookie is minted with a flattened structure containing only `sub`, `roles`, `iat`, and `exp`.

Upon validating this cookie, the gateway reconstructs a dummy JWT payload:
```typescript
jwtPayload = {
    sub: sessPayload.sub,
    realm_access: { roles: sessPayload.roles }
};
```
However, the application allows users to configure custom JSONPaths for identity and roles via `AUTH_SUB_JSONPATH` and `AUTH_ROLES_JSONPATH`. When these custom JSONPaths (e.g. `$.custom_user_id` or `$.custom_roles`) are configured, standard resource authorization checks evaluate them against the reconstructed dummy `jwtPayload`. Because the custom path structures do not exist on the standard dummy payload, the query yields undefined, and the authentication request is rejected as unauthorized.

## Decision
Introduce a dynamic payload reconstitution helper that maps session cookie attributes (`sub` and `roles`) into the structure required by both default fallback JSONPaths (`$.sub` / `$.realm_access.roles`) and custom configured JSONPaths (`AUTH_SUB_JSONPATH` / `AUTH_ROLES_JSONPATH`):

1. **Utility for Path-based Assignments**:
   Implement `setJsonPathValue(obj, path, value)` in `src/k8s/session.ts` to support setting properties along arbitrary dot-separated JSONPaths (creating intermediate objects as necessary).
2. **Dynamic Reconstitution**:
   Implement `reconstructSessionPayload(sub, roles)` to populate both:
   - Default paths: `$.sub` and `$.realm_access.roles` (ensures backward compatibility).
   - Configured paths: `config.auth.subJsonPath` and `config.auth.rolesJsonPath`.
3. **Gateway Hook Integration**:
   Call the new `reconstructSessionPayload` helper inside the session cookie authentication preHandler hook in `src/server/auth.ts`.
4. **Sandbox and Integration verification**:
   Update Keycloak mappings to use `custom_user_id` and `custom_roles` claims, update the local sandbox `deployment.yaml` with the custom JSONPath configuration, and add comprehensive integration and E2E checks verifying session cookie-based authorization under custom claim mapping.

## Alternatives Considered

### Minting the session cookie with the custom JSONPath payload structure
- **Pros**: The session cookie directly maps to the configuration.
- **Cons**: Increases the size of the stateless cookie (creating overhead) and exposes details about internal config mappings inside the client-side cookie payload.
- **Rejected**: A space-efficient, fixed-structure cookie is preferred to keep header sizes low.

### Bypassing JSONPath evaluation for cookie-authenticated requests
- **Pros**: Avoids payload reconstruction.
- **Cons**: Subverts the unified auth guard validation logic, creating duplicate validation code branches and potential security bugs.
- **Rejected**: Maintaining a unified `jwtPayload` format ensures all downstream guards remain consistent.

## Consequences
- Session cookie authentication (`nocr_sess`) remains fully compatible when custom OIDC token layouts are used.
- Unified guards for workspace ownership and role validation behave identically whether the request was authenticated via Bearer token or session cookie.
- No changes to session cookie validation and minting security properties are introduced.
