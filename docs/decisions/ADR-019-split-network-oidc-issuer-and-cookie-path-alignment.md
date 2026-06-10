# ADR-019: Split-Network OIDC Issuer Alignment and Path-Scoped Cookie Routing

## Status
Accepted

## Date
2026-06-10

## Context
In the `nogoo9/no-crd` platform, OIDC authentication has been extended to support workspace authorization and token delegation. However, deploying the architecture in local k3d Kubernetes clusters exposed two critical network boundary and configuration challenges:

1. **Split-Network OIDC Refresh Mismatch**:
   - Browser-based OAuth flows use the external Keycloak address mapped to host localhost (`http://localhost:8080`), generating tokens with `iss: http://localhost:8080/auth/realms/nogoo9`.
   - The backend server validates and refreshes tokens using Keycloak's internal cluster DNS address (`http://keycloak.nogoo9.svc.cluster.local:8080`).
   - By default in development mode, Keycloak dynamically computes its issuer URL from the incoming Host header. Consequently, during a backend-to-backend token refresh request, Keycloak computed the expected issuer to be the internal service URL, saw the mismatch against the incoming refresh token's external issuer, and returned a `401 Unauthorized` (`invalid_grant: Invalid token issuer`).

2. **OIDC Dynamic Relative Path Stripping**:
   - Setting Keycloak's frontend hostname strictly to a domain/host (e.g. `http://localhost:8080`) overrides its path detection. Under Keycloak 26's Hostname v2 SPI, the relative path prefix configured via `--http-relative-path=/auth` gets stripped from generated authorization endpoints and redirects, causing `404 Not Found` errors on frontchannel login redirection.

3. **Subpath Router Cookie Scoping**:
   - Workspaces are routed under dynamic subpaths (e.g., `/nocr/route/:workspaceId/`). If cookies (`nocr_token`, `nocr_refresh`, `nocr_sess`) are set without an explicit prefix path, the browser might scope them to incorrect subpaths or fail to propagate them to adjacent sibling workspaces, breaking token verification and transparent refresh validation.

## Decision
1. **Force Keycloak Frontend Hostname & Path**:
   - Configured the `KC_HOSTNAME` environment variable to `http://localhost:8080/auth` in the Keycloak Deployment manifest. This forces Keycloak to generate and validate the issuer URL `http://localhost:8080/auth/realms/nogoo9` consistently for both external browser-based flows and backchannel server-side token refresh operations.
2. **Explicit Base Prefix Cookie Pathing**:
   - Updated the backend gateway's cookie generation logic to append the dynamic prefix (`basePrefix`) to cookie paths (e.g. `Path=/nocr/`). This ensures cookies are scoped correctly across all workspace subpaths, preventing isolation leakage and trailing-slash routing conflicts.

## Alternatives Considered
- **Host Header Overriding**: Forcing the `Host: localhost:8080` header in backend fetch requests to Keycloak. This was rejected because it relies on mock header parameters rather than configuring OIDC server endpoints properly, which is brittle and hard to maintain across environments.
- **Root Keycloak Routing**: Removing the `/auth` path prefix. This was rejected because it violates Keycloak's default path configuration in existing local environments, breaking alignment with the gateway configurations.

## Consequences
- **Robust Token Refresh**: Token refresh operations succeed transparently behind the gateway proxy without throwing validation conflicts.
- **Consistent Issuer Verification**: Token issuers match regardless of the routing layer or client type used for the handshake.
- **Accurate Browser Scoping**: Path-scoped cookies are correctly handled by the browser, preserving session integrity when users navigate workspaces.
