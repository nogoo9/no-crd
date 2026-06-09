# ADR-017: Unauthenticated Workspace Redirection Recovery

## Status

Accepted

## Date

2026-06-10

## Context

When a user attempts to access a protected workspace route (e.g. `/route/workspace-1/index.html`) without a valid session, the gateway backend intercepts the request via the routing proxy auth guard (`requireRouteAuth`). 

Following [ADR-013](/decisions/ADR-013-workspace-app-authorization.md), the backend handles unauthenticated browser document requests (`Accept: text/html`) by redirecting the user's browser to the dashboard root index containing a `redirect_uri` parameter:
```
GET /nocr/?redirect_uri=%2Fnocr%2Froute%2Fworkspace-1%2F
```

However, because the Single Sign-On (SSO) client OIDC flow requires strict callback registration at a single centralized origin endpoint (e.g., `http://localhost:8080/nocr/` or the root index `/`), the dashboard cannot dynamically register wildcards for every user's dynamically-generated workspace pod ID. When the dashboard triggers the PKCE redirect to Keycloak, the `redirect_uri` parameter in the current browser URL query is lost upon redirecting back to the OIDC redirect URI.

We need a secure, reliable, and same-origin compliant mechanism to preserve the user's target workspace destination across the OIDC authentication redirect flow, and then seamlessly restore their navigation state by redirecting them back to the workspace once the token exchange succeeds.

## Decision

Extend the frontend UI configuration and OIDC hooks to preserve and recover the `redirect_uri` target:

1. **Safe Redirect Validation (CWE-601 Prevention)**:
   Implement a strict safety filter in the client to ensure the redirect destination is safe. A redirect destination is considered safe only if:
   - It is a relative path starting with a single `/` and NOT `//` (to prevent protocol-relative open redirects).
   - Or, when parsed as a full URL, its origin matches `window.location.origin`.

2. **Mount Hook Parameter Preservation**:
   On load, the dashboard parses the URL query parameter `redirect_uri`. If present and validated as safe, it is stored in `sessionStorage` under `nocr_post_login_redirect_uri` so it survives the OIDC redirect to the Identity Provider. The query parameter is then stripped from the address bar via `window.history.replaceState` to maintain clean URLs.

3. **Active Token Immediate Redirection**:
   If the user already has a valid, unexpired token in local storage upon landing on `/nocr/?redirect_uri=...`, the dashboard bypasses rendering the dashboard view entirely and redirects the browser immediately back to the target workspace (appending the token as a query parameter or hash fragment depending on configuration).

4. **Callback Token Exchange Recovery**:
   Once the OIDC code exchange callback succeeds and retrieves the access token, the app checks `sessionStorage` for the stored `nocr_post_login_redirect_uri`. If found, it clears the item from storage and immediately redirects the user back to the workspace with the newly acquired token, bypassing the dashboard homepage.

## Alternatives Considered

### 1. Dynamic Wildcard Redirect URIs in Keycloak
- **Pros**: Keycloak directly handles redirection back to the workspace.
- **Cons**: Severe security risk. Keycloak does not support dynamic wildcard paths for redirect URIs as it exposes the authorization code to theft via open-redirect endpoints on the domain.
- **Rejected**: Security protocols mandate fixed or strictly matching redirect callback patterns.

### 2. Preserving Parameter in OIDC `state`
- **Pros**: Relies strictly on standard OAuth protocol fields.
- **Cons**: Some Identity Providers restrict the character set or length of the `state` parameter, making complex path parameters fragile. It also exposes navigation details to the authorization server.
- **Rejected**: Browser-side tab-scoped storage (`sessionStorage`) is cleaner and keeps internal routing state local to the client.

## Consequences

- **Seamless User Experience**: Users accessing a deep link to a workspace pod are automatically redirected to login and return directly to their target workspace without seeing the dashboard interface or manually re-navigating.
- **Tab Isolation**: Using `sessionStorage` instead of `localStorage` ensures that if a user opens multiple workspaces in separate tabs concurrently, their post-login destinations do not collide.
- **Zero-Day Open-Redirect Mitigation**: Same-origin checks ensure external attackers cannot use the gateway's dashboard page to bounce users to external malicious domains.
