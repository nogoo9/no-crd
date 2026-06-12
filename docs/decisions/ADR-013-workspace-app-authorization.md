# ADR-013: Workspace App Authorization Support

## Status

Accepted

## Date

2026-06-02

## Context

<!-- 
prompt: A sleek, modern software architecture diagram explaining Workspace App Authorization in a Kubernetes cluster. It illustrates: 1. User browser making a request to the gateway, 2. The gateway, labeled as the 'no-crd Backend Service / Gateway', acting as a Backend-for-Frontend (BFF) proxy and verifying cookies (nocr_sess, nocr_token, nocr_refresh), 3. 'no-crd Backend Service / Gateway' doing silent server-side token refresh with Keycloak/OIDC provider, 4. 'no-crd Backend Service / Gateway' injecting headers (X-User-Sub, Authorization) to the workspace container, 5. Frontend Single Page Apps (SPA) fetching token from path-scoped /_auth/token API. Design with dark mode aesthetics, clean gradients, sans-serif typography, and clear boxes.
-->
![Workspace Auth Architecture](/workspace_auth_architecture.png)

The `@nogoo9/no-crd` gateway routes HTTP and WebSocket traffic to dynamically spawned workspace pods under the path `/route/:workspaceId/*`. When authentication is enabled (`AUTH_ENABLED=true`), the gateway intercepts requests and validates the user's session using cookies (`nocr_token` and `nocr_sess`).

Applications running inside these workspaces (both client-side frontends and containerized backends) frequently need the user's authenticated JSON Web Token (JWT) to call external APIs, databases, or other services.

However:
1. **Cookie Scoping & Security**: The `nocr_token` cookie containing the JWT is marked `HttpOnly` for XSS protection. Frontend JavaScript running inside the workspace cannot read it.
2. **Diverse Application Architectures**: Workspaces run a variety of applications:
   - Backend servers (Node.js, Python, Go) that make server-to-server calls.
   - Frontend Single-Page Apps (SPAs) running in the browser tab.
3. **Principle of Least Privilege**: Injecting credentials indiscriminately into every spawned workspace poses a security risk. The system must restrict credential exposure to workspaces that explicitly declare a requirement for them.
4. **Short-Lived Access Tokens**: OIDC providers issue short-lived access tokens (e.g. Keycloak's 5-minute default). When these expire mid-session, the user experiences disruptive page redirects or broken API calls. The gateway must handle token renewal transparently without interrupting the user's workflow.

We need a secure, standardized, and highly compatible mechanism to deliver the user's token and profile to workspace applications — and to keep those tokens fresh without user disruption.

## Decision

Implement three complementary, opt-in authentication delivery mechanisms, governed by a new pod template annotation `nogoo9/workspace-auth-mode`. Additionally, implement **proxy-level transparent token refresh** to silently renew expired tokens.

### 1. The Auth Mode Annotation (`nogoo9/workspace-auth-mode`)
To prevent credential leaks, the gateway will inspect the target workspace pod's annotations. Authentication mechanisms are only active if explicitly listed in a comma-separated format in the pod annotations:

*   `inject-headers`: Enables backend header injection.
*   `token-api`: Enables path-scoped token, authorize redirect, and refresh endpoints.

```yaml
metadata:
  annotations:
    nogoo9/workspace-auth-mode: "inject-headers,token-api"
```

---

### 2. Delivery Mechanisms

#### A. Header Injection (Backend/Proxy)
When `inject-headers` is active, the HTTP and WebSocket proxies will inject the following headers into the forwarded request to the workspace container:

| Header | Description | Source |
|--------|-------------|--------|
| `X-User-Sub` | The user's subject/identity ID | `jwtPayload.sub` |
| `X-User-Roles` | Comma-separated list of user roles | `jwtPayload.roles` |
| `X-Workspace-Jwt` | The raw JWT token value | Request bearer/cookie token |
| `Authorization` | Standard Bearer token header | `Bearer <JWT>` |

*This enables server-side applications in the pod to instantly know the user context and use the JWT for outbound API calls.*

#### B. Token & Redirect APIs (Frontend SPA/Tab)
When `token-api` is active, the gateway exposes three endpoints relative to the workspace path:
*   `GET /route/:workspaceId/_auth/token`: Returns the active JWT as JSON `{"token": "<JWT>"}`. Since it is path-scoped, the browser automatically attaches the `nocr_token` cookie to authenticate the fetch.
*   `GET /route/:workspaceId/_auth/authorize?redirect_uri=...`: Redirects the user's browser back to `redirect_uri` with the JWT in the hash fragment (e.g. `redirect_uri#token=<JWT>`), mirroring standard OAuth2 Implicit Grant behavior.
    *   *Security*: The Gateway validates that `redirect_uri` is same-origin with the host to prevent open-redirect vulnerabilities.
*   `POST /route/:workspaceId/_auth/refresh`: Performs a background token refresh using the encrypted `nocr_refresh` cookie. Returns `{"token": "<new JWT>"}` on success or `401` if the refresh token is expired/revoked. This allows SPAs to explicitly trigger a refresh without a page redirect.

---

### 3. Proxy-Level Transparent Token Refresh

The core mechanism for handling short-lived access tokens. The gateway acts as a **Backend-for-Frontend (BFF) token mediator**, performing OIDC refresh token exchanges server-side — completely transparent to downstream workspace applications.

> [!NOTE]
> **Separation of Concerns**:
> - **Opt-In Delivery (1 & 2)**: Exposing credentials (headers/API) to the workspace container remains strictly opt-in per-pod to protect against credential leaks.
> - **Global Session Refresh (3)**: Transparent proxy-level refresh is a global gateway security feature. It is active for all requests to ensure user ownership checks and gateway session validation continue to function seamlessly after token expiration, regardless of whether the workspace has opted into credential delivery.
> - **Explicit Refresh Endpoint**: The `POST /_auth/refresh` endpoint is part of the `token-api` mode. It allows frontend SPAs to explicitly trigger a refresh and get the new token value directly in their JavaScript memory.

#### A. Encrypted Refresh Cookie (`nocr_refresh`)
On initial OIDC login, the dashboard UI sends the refresh token to the gateway via `POST /auth/set-refresh`. The gateway:
1. Encrypts the refresh token using **AES-256-GCM** with a key derived via **HMAC-SHA256** from the session secret (same key cascade as ADR-002) with domain separation label `"nocr_refresh_encryption"` to avoid key reuse with the HMAC-signed `nocr_sess`.
2. Stores it as an HttpOnly cookie: `nocr_refresh=<encrypted>; Path=/; SameSite=Lax; HttpOnly; Max-Age=604800`.

The refresh token **never touches `localStorage`** or any JavaScript-accessible storage.

#### B. Transparent Auth Hook Refresh
The gateway's global `preHandler` auth hook is extended with a refresh step. When a request arrives:

1. Try `Bearer` token / `?token=` parameter → JWT verify → mint `nocr_sess`
2. Try `nocr_sess` cookie → HMAC verify
3. Try `nocr_token` cookie → JWT verify → mint `nocr_sess`
4. **Try `nocr_refresh` cookie** → decrypt → call OIDC `token_endpoint` with `grant_type=refresh_token` → on success:
   - Verify the new access token
   - Mint new `nocr_sess`, `nocr_token`, and `nocr_refresh` cookies (with rotated refresh token)
   - Set `request.jwtPayload` and `request.token` with the fresh values
5. Fail → return `401` (or redirect for browser document requests — see Section D)

By the time any downstream route handler (proxy, `_auth/token`, etc.) executes, `request.jwtPayload` and `request.token` are already populated with valid values. **Downstream applications require zero code changes.**

#### C. Refresh Token Rotation
Each successful refresh automatically rotates the refresh token: the new refresh token from the OIDC provider replaces the old `nocr_refresh` cookie. This follows the OAuth 2.0 Security Best Current Practice (RFC 9700) to limit the window of exposure for any single refresh token.

#### D. Graceful Degradation
The system degrades gracefully across multiple failure modes:

| Failure Mode | Behavior |
|---|---|
| **No refresh token** (OIDC provider doesn't issue one) | Falls back to `nocr_sess` session cookie (30-min sliding window from ADR-002) |
| **Refresh token expired/revoked** | For browser document requests (`GET` + `Accept: text/html`), redirects to `/?redirect_uri=<current_url>` for re-authentication. For API requests, returns `401`. |
| **OIDC provider unreachable** | Falls back to `nocr_sess` if still valid; otherwise returns `401` |
| **Refresh timeout** (> 5 seconds) | Aborts refresh, falls back to `nocr_sess` or `401` |

---

## Alternatives Considered

### 1. Storing Refresh Tokens in Cookies or LocalStorage (Client-Side)
- **Pros**: Allowed workspaces to directly request token refreshes.
- **Cons**: Severe security risk. Exposing long-lived refresh credentials to frontend storage makes them vulnerable to exfiltration via XSS.
- **Rejected**: Followed [ADR-005](/decisions/ADR-005-ui-proactive-oidc-refresh) which mandates no client-side refresh token storage. The encrypted `nocr_refresh` HttpOnly cookie achieves the same goal without JavaScript access.

### 2. A Single Global Auth API
- **Pros**: Simpler implementation.
- **Cons**: Did not support backends (which don't run in the browser and cannot fetch same-origin cookies) or independent browser tabs securely without redirection flows.
- **Rejected**: A hybrid approach supporting both direct header injection and redirection-based endpoints covers all relevant integration models.

### 3. Silent SSO via Hidden Iframe (`prompt=none`)
- **Pros**: Standard OIDC silent authentication without storing refresh tokens.
- **Cons**: Relies on third-party cookies, which are increasingly blocked by modern browsers (Safari ITP, Firefox strict mode, Chrome 3PCD). Requires OIDC provider to support `prompt=none`. Complex error handling.
- **Rejected**: Unreliable across browsers and increasingly non-functional. The proxy-level refresh is browser-independent.

### 4. Redirect-Only Recovery (Reactive)
- **Pros**: No timer; simple implementation.
- **Cons**: Disruptive — user is redirected mid-session; in-flight operations and unsaved state are lost.
- **Rejected as primary mechanism**: Demoted to last-resort fallback (Section 3.D) for when both access token and refresh token have expired. The proxy-level refresh handles the common case transparently.

### 5. Client-Side Popup Authentication
- **Pros**: Preserves main window state; works when third-party cookies are blocked.
- **Cons**: Popups are blocked by browsers unless triggered by user gesture; complex cross-window postMessage coordination; requires downstream apps to implement popup handling.
- **Rejected**: The proxy-level approach is simpler and requires zero downstream changes.

---

## Consequences

- Workspaces must opt-in to authentication by declaring the `nogoo9/workspace-auth-mode` annotation.
- Backends in pods receive identity contexts automatically via request headers with zero required library setup.
- Frontends running in standalone tabs can retrieve the token via simple fetch or OAuth-compatible redirects.
- Redirect flows are secured against open redirects by validating hosts at the gateway boundary.
- **Token expiry is handled transparently** at the proxy level — downstream workspace applications require zero auth-related code.
- The gateway requires runtime network access to the OIDC provider's token endpoint for refresh exchanges.
- Refresh tokens are encrypted at rest in cookies — never stored in localStorage, server memory, or databases.
- The `offline_access` scope must be requested during OIDC authorization to receive refresh tokens.
- Logout clears all three cookies (`nocr_token`, `nocr_sess`, `nocr_refresh`).

## Amendments

| Date | Change |
|------|--------|
| 2026-06-13 | Corrected §3A: refresh token encryption key derivation uses **HMAC-SHA256** (not HKDF-SHA256). Updated domain separation label from `"nocr_refresh"` to `"nocr_refresh_encryption"` to match the implementation in `src/k8s/session.ts`. |
