# ADR-005: Session Cookie Coverage for All Endpoints

## Status
Accepted

## Date
2026-05-28

## Context
When `AUTH_ENABLED=true`, the embedded UI obtains an OIDC access token via the PKCE authorization code flow. This token is stored in `localStorage` and sent as a `Bearer` token on MCP calls and as the initial `?token=` parameter when opening workspace routes.

**Problem**: Short-lived access tokens (e.g. Keycloak's 5-minute default) expire while the user is actively using the dashboard. This causes:
- MCP tool calls to return 401
- New workspace route navigations to fail
- The UI to redirect back to the OIDC login page mid-session

The stateless session cookie (ADR-002) needs to cover all endpoints — not just proxy workspace routes — so that direct MCP API calls survive token expiry.

## Decision
Scope the `nocr_sess` session cookie to `Path=/` (root). The server's global `preHandler` auth hook checks `nocr_sess` before falling back to JWT verification, and mints a root-scoped `nocr_sess` on any successful JWT authentication.

### How it works
1. User authenticates via OIDC → UI sends `Bearer` token → server verifies JWT
2. On successful JWT verification, the server mints `nocr_sess` with `Path=/` and `HttpOnly`
3. On subsequent requests, if no `Bearer` token is present, the server checks `nocr_sess`
4. Valid session cookie → claims extracted → request proceeds without OIDC round-trip
5. Cookie uses sliding window (default 30 min, configurable via `PROXY_SESSION_TTL`)

### Security properties
- **HttpOnly**: Cookie is invisible to JavaScript — immune to XSS token theft
- **No sensitive tokens in localStorage**: Only the short-lived access token (which is already stored for initial auth) and id_token remain in `localStorage`. No `refresh_token` is stored client-side.
- **SameSite=Lax**: Protects against CSRF on state-changing requests
- **HMAC-signed**: Cannot be forged without the server's signing key

## Alternatives Considered

### A. Client-side `refresh_token` in localStorage
- Uses the OIDC `refresh_token` grant to silently refresh the access token before expiry
- **Security risk**: `localStorage` is XSS-accessible; refresh tokens are long-lived credentials that allow minting unlimited access tokens
- **OWASP/RFC guidance**: OAuth 2.0 for Browser-Based Apps explicitly warns against storing refresh tokens in `localStorage`
- Rejected: The HttpOnly `nocr_sess` cookie achieves the same goal without storing any sensitive credential in JavaScript-accessible storage

### B. Hidden iframe with `prompt=none`
- Pros: Doesn't require refresh_token; uses existing SSO session cookie
- Cons: Requires IDP to support `prompt=none`; doesn't work if third-party cookies are blocked (Safari, Firefox strict mode); complex error handling
- Rejected: Unreliable across browsers

### C. Server-side refresh (proxy holds refresh_token)
- Pros: Fully transparent to the UI
- Cons: Requires storing `refresh_token` server-side (security risk); adds server state; violates stateless design (ADR-002)
- Rejected: Security risk and architectural mismatch

### D. Redirect on 401 (reactive)
- Pros: No timer; simple
- Cons: Disruptive — user is redirected mid-session; in-flight operations lost
- Rejected: Poor user experience

## Consequences
- All endpoints (MCP, proxy, permissions, themes) accept `nocr_sess` as an authentication mechanism
- No `refresh_token` is stored anywhere in the browser
- Session lifetime is controlled server-side (sliding window via `PROXY_SESSION_TTL`)
- The cookie is automatically sent by the browser on all same-origin requests — no special client-side code needed
- The UI code is simple — no refresh timers, no token rotation logic
