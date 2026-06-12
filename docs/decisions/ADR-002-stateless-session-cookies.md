# ADR-002: Stateless Signed Session Cookies for Proxy Auth

## Status
Accepted

## Date
2026-05-28

## Context
The nogoo9 proxy routes HTTP and WebSocket traffic to workspace pods. Authentication is done via JWT tokens (from OIDC providers like Keycloak). The token is:
1. Passed as a `?token=` query parameter on the initial workspace URL
2. Set as an `HttpOnly` cookie (`nocr_token`) scoped to the workspace path

**Problem**: Short-lived access tokens (e.g. Keycloak default 5-minute expiry) cause cascading failures:
- Sub-resource loads (CSS, JS, images) from the proxied workspace get 401s when the baked-in cookie expires
- WebSocket connections fail mid-session
- The UI enters a clear-token → reload → re-login loop

We need a mechanism to keep workspace sessions alive independently of the JWT lifetime.

## Decision
Issue a **stateless, HMAC-signed session cookie** (`nocr_sess`) containing a minimal claim set (`{ sub, roles, iat, exp }`) with its own TTL (default 30 minutes, sliding window). The cookie is signed with HMAC-SHA256 using a shared secret.

### Why stateless (not server-side sessions)
- **No Redis/shared store needed** — each replica verifies the cookie independently
- **No garbage collection** — cookies self-expire
- **O(1) per-request cost** — HMAC verify is constant time
- **Horizontally scalable** — replicas just need the same signing key

### Signing key resolution (4-step cascade)
1. `PROXY_SESSION_SECRET` or `JWT_SECRET` env var (resolved as a single config field `config.auth.sessionSecret`; explicit, recommended for production)
2. Best-effort k8s Secret (`nogoo9-session-key`) — attempts read, then create with 409-conflict retry for race safety
3. Peer discovery — deterministic leader election among sibling pods via internal endpoint (see [ADR-003](./ADR-003-peer-discovery-session-key.md))
4. In-memory random key (fallback for first/solo pod)

### Cookie lifecycle
- **Mint**: On first proxy request with valid JWT → extract claims → HMAC-sign → set `nocr_sess` cookie
- **Verify**: On subsequent requests → decode → verify HMAC → check exp → allow if valid
- **Slide**: On each valid request → re-set cookie with fresh `Max-Age` (sliding window)
- **Refresh**: When UI refreshes its JWT, next proxy request mints a new cookie

## Alternatives Considered

### A. Silent iframe refresh only
- Pros: Purely client-side, partially implemented in PKCE flow
- Cons: Only works for the UI dashboard, not for proxied iframes or WebSockets; requires OIDC provider to support `prompt=none`
- Rejected: Doesn't solve the core problem for workspace sub-resources

### B. Server-side opaque session (in-memory Map)
- Pros: Most robust; fully decouples proxy auth from JWT
- Cons: Requires shared state for multi-replica (Redis); cleanup timers; memory usage
- Rejected: Adds infrastructure dependency; stateless approach achieves the same goal

### C. Token refresh endpoint (server-side refresh_token grant)
- Pros: Transparent to the user
- Cons: Requires storing refresh tokens server-side (security risk); some OIDC providers don't issue refresh tokens for public clients
- Rejected: Security risk of server-side refresh token storage outweighs benefits

## Consequences
- Proxy auth has two paths: signed session cookie (fast, preferred) → JWT validation (fallback)
- Cookie size is small (~200 bytes) since we only include minimal claims
- All replicas need the same signing key — resolved automatically via the 4-step cascade
- WebSocket upgrades use `nocr_sess` cookie instead of raw JWT
- Existing `nocr_token` cookie is still set for backward compatibility
- Session invalidation on deploy (all pods restart → new key) is acceptable behavior

## Amendments

| Date | Change |
|------|--------|
| 2026-06-13 | Corrected "5-step cascade" to "4-step cascade". `PROXY_SESSION_SECRET` and `JWT_SECRET` are merged into a single `config.auth.sessionSecret` field in the implementation, making them one resolution step. Added k8s Secret 409-conflict retry detail and cross-reference to ADR-003 for peer discovery. |
