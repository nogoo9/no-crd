# ADR-023: Dynamic Cookie TTL Alignment, Stale Cookie Cleanup, and Singleflight Refresh Token Rotation Safety

## Status
Accepted

## Date
2026-06-14

## Context

We use OIDC/OAuth authentication for users, storing the access token in a path-scoped cookie (`nocr_token`) and the encrypted refresh token in a root-scoped cookie (`nocr_refresh`). 

Prior to this decision, the authentication flow suffered from three distinct issues:

1. **Static Cookie TTLs**: Both the `nocr_token` and `nocr_refresh` cookies had static/hardcoded `Max-Age` values (e.g., 86400 seconds for access token, 604800 seconds for refresh token). When the actual tokens issued by the Identity Provider (IdP) had different lifetimes (e.g., access tokens expiring in 5 minutes, or refresh tokens expiring in 24 hours), the browser would keep expired cookies or drop valid ones prematurely.
2. **Futile Client/Server Refresh Loops**: When a refresh token expired or was invalidated (e.g., OIDC logout or IdP session termination), the IdP would return an error (such as `invalid_grant`). The proxy server would log the failure but leave the `nocr_refresh` cookie in the user's browser. The client SPA would continually invoke the refresh endpoint on subsequent API calls, causing repeated futile round-trips to the IdP.
3. **Refresh Token Rotation Race Conditions**: To protect against token theft, many IdPs enforce strict **Refresh Token Rotation (RTR)**, where using a refresh token yields a new refresh token and invalidates the old one. If a user has multiple concurrent requests (such as a dashboard loading multiple workspace widgets simultaneously), several requests would trigger transparent refreshes at the same time using the same old refresh token. The first request to reach the IdP would succeed and rotate the token, but the subsequent concurrent requests would fail with `invalid_grant` (since they used the now-invalidated old token), resulting in immediate session termination.

## Decision

Implement three cohesive updates to the session/cookie lifecycle:

1. **Dynamic Cookie TTLs**:
   - Extract the access token (`nocr_token`) Max-Age dynamically from the JWT `exp` claim. If unavailable or invalid, fall back to a configurable default (`PROXY_TOKEN_COOKIE_TTL`).
   - Extract the refresh token (`nocr_refresh`) Max-Age dynamically from the IdP token response's `refresh_expires_in` claim. If unavailable, fall back to a configurable default (`PROXY_REFRESH_COOKIE_TTL`).
2. **Stale Cookie Cleanup**:
   - When token refresh fails, explicitly clear the `nocr_refresh` cookie in the response (`Max-Age=0` and an expired date). This terminates the futile loop and forces the client to re-authenticate cleanly.
3. **Singleflight Deduplication**:
   - Wrap the OIDC refresh exchange in a singleflight pattern. Maintain a map of active refresh promises (`inflightRefreshes: Map<string, Promise<RefreshResult>>`) keyed by the decrypted refresh token.
   - Concurrent refresh requests for the same token coalesce into a single promise, executing exactly one IdP token exchange. When the exchange completes, all waiting requests receive the same rotated credentials and matching cookies, avoiding rotation race conditions.

## Alternatives Considered

### Mutex Locking
- **Rejected**: Mutex locking blocks subsequent requests, causing them to wait sequentially and potentially trigger another refresh with the *new* token sequentially, which is unnecessary and introduces latency/contention. Singleflight is simpler and faster since concurrent requests just share the result of the single in-flight OIDC request.

### Long-Lived Static TTLs
- **Rejected**: Setting long static TTLs violates the principle of least privilege, exposes the application to session replay risks if tokens are revoked early, and does not align with the OIDC provider's actual session configuration.

## Consequences

- Resiliency during strict refresh token rotation is greatly improved. Concurrent client requests no longer trigger authentication failures.
- Reduced load on the OIDC Identity Provider since duplicate refresh requests are deduplicated.
- Self-healing session cleanup: clients are immediately prompted to re-authenticate when their refresh token becomes invalid, rather than getting stuck in a loop.
- Precise cookie lifetime management matching OIDC provider session durations.
