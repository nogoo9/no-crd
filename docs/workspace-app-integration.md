# Workspace Application Integration Guide: Authentication & BFF Architecture

This guide explains how applications running inside workspace pods (e.g., custom development environments, code editors, internal dashboards, or custom single-page applications) authenticate users and retrieve OIDC credentials.

By implementing the **Backend-for-Frontend (BFF) pattern**, the `@nogoo9/no-crd` gateway handles token verification, cookie management, and OIDC token refresh server-side. This keeps workspace containers safe from credential theft and simplifies the codebase of applications running inside them.

---

## 🗺️ Architecture Overview

The following diagram illustrates how the gateway orchestrates authentication between the user's browser, the identity provider (OIDC/Keycloak), and the application running inside the workspace pod:

<!-- 
prompt: A sleek, modern software architecture diagram explaining Workspace App Authorization in a Kubernetes cluster. It illustrates: 1. User browser making a request to the gateway, 2. The gateway, labeled as the 'no-crd Backend Service / Gateway', acting as a Backend-for-Frontend (BFF) proxy and verifying cookies (nocr_sess, nocr_token, nocr_refresh), 3. 'no-crd Backend Service / Gateway' doing silent server-side token refresh with Keycloak/OIDC provider, 4. 'no-crd Backend Service / Gateway' injecting headers (X-User-Sub, Authorization) to the workspace container, 5. Frontend Single Page Apps (SPA) fetching token from path-scoped /_auth/token API. Design with dark mode aesthetics, clean gradients, sans-serif typography, and clear boxes.
-->
![Workspace Auth Architecture](/workspace_auth_architecture.png)

### The Security Guard Analogy (For Non-Technical Readers)
Imagine a secure apartment building. Instead of giving every guest a master key card that opens all doors (which they could lose or have stolen), a security guard sits at the entrance:
1. When a guest arrives, the guard checks their credentials (the session cookie).
2. For backend service staff inside the building (our backend apps), the guard walks them to their designated room and unlocks the door, passing them the required tools (header injection).
3. For visitors who need to fetch local items (frontend SPAs), the guard provides a temporary, room-restricted card (the path-scoped OIDC token).
4. If a key card expires, the guard silently issues a new one using the building's registration book (refresh token) without forcing the guest to walk all the way back to the front desk.

---

## ⚙️ Enabling Workspace Authentication

Authentication delivery is strictly **opt-in** on a per-workspace basis to respect the *Principle of Least Privilege*. Workspaces must explicitly declare their authentication requirements in their pod templates using the `nogoo9/workspace-auth-mode` annotation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: workspace-user-123
  annotations:
    # Comma-separated list of active auth delivery modes
    nogoo9/workspace-auth-mode: "inject-headers,token-api"
spec:
  containers:
    - name: app
      image: node:22-alpine
```

### Supported Modes:
*   **`inject-headers`**: Forward-scoping. Automatically injects verified user identity context and raw bearer tokens as headers on all proxied HTTP and WebSocket requests.
*   **`token-api`**: Pull-scoping. Exposes a local, path-scoped API (`_auth/token`, `_auth/authorize`, and `_auth/refresh`) for browser-based Single-Page Apps (SPAs).

---

## 🖥️ Integration Walkthrough: Backend Applications (`inject-headers`)

When `inject-headers` is enabled, the gateway automatically intercepts, decrypts, and verifies the user's session. It then forwards the upstream HTTP/WebSocket request to the workspace container with the following headers:

| Header | Description | Example Value |
|--------|-------------|---------------|
| `Authorization` | Standard OAuth 2.0 Bearer access token | `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6...` |
| `X-Workspace-Jwt` | The raw JWT token value (same as above) | `eyJhbGciOiJSUzI1NiIsInR5cCI6...` |
| `X-User-Sub` | The user's unique OIDC subject identifier | `f81d4fae-7dec-11d0-a765-00a0c91e6bf6` |
| `X-User-Roles` | Comma-separated list of user roles | `developer,admin` |

### Code Examples for Workspace Backends

Because headers are injected transparently, your workspace backend does not need OIDC client libraries, client secrets, or token endpoints. It simply reads standard headers:

::: code-group
```typescript [Node.js Express]
import express from 'express';
const app = express();

app.get('/api/data', (req, res) => {
  // Read identity context injected by the gateway
  const userSub = req.headers['x-user-sub'];
  const userRoles = req.headers['x-user-roles'];
  const rawToken = req.headers['x-workspace-jwt']; // Or req.headers['authorization']

  if (!userSub) {
    return res.status(401).json({ error: 'Unauthenticated by Gateway' });
  }

  // Use rawToken for downstream API fetches
  res.json({
    message: `Hello user ${userSub}`,
    roles: String(userRoles).split(','),
  });
});

app.listen(3000);
```

```python [Python FastAPI]
from fastapi import FastAPI, Header, HTTPException
from typing import Optional

app = FastAPI()

@app.get("/api/data")
def get_data(
    x_user_sub: Optional[str] = Header(None),
    x_user_roles: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None)
):
    if not x_user_sub:
        raise HTTPException(status_code=401, detail="Unauthenticated by Gateway")
        
    return {
        "user_id": x_user_sub,
        "roles": x_user_roles.split(",") if x_user_roles else [],
        "authorized": True
    }
```

```go [Go (net/http)]
package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

func dataHandler(w http.ResponseWriter, r *http.Request) {
	userSub := r.Header.Get("X-User-Sub")
	userRoles := r.Header.Get("X-User-Roles")

	if userSub == "" {
		http.Error(w, `{"error":"Unauthenticated"}`, http.StatusUnauthorized)
		return
	}

	response := map[string]interface{}{
		"userId": userSub,
		"roles":  strings.Split(userRoles, ","),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	http.HandleFunc("/api/data", dataHandler)
	http.ListenAndServe(":3000", nil)
}
```
:::

---

## 🌐 Integration Walkthrough: Frontend Applications (`token-api`)

If your workspace runs a pure client-side Single-Page Application (SPA) loaded in the user's browser, the application cannot read `HttpOnly` session cookies directly (this is a security feature to prevent token theft via Cross-Site Scripting, or XSS). 

Instead, when `token-api` is active, the gateway exposes path-scoped helper endpoints relative to the workspace subpath:

### 1. Fetching the Active Token (`_auth/token`)
A client application can retrieve the current user's JWT from the relative endpoint `/route/:workspaceId/_auth/token`. 

```javascript
// Fetch token from relative path scoped to this workspace
const res = await fetch('./_auth/token');
if (res.ok) {
  const { token } = await res.json();
  console.log("Acquired active JWT:", token);
  // Use token in Authorization header for external API calls
}
```

### 2. The Authorization Redirect Flow (`_auth/authorize`)
For Single-Page Apps that follow standard OAuth2/OIDC implicit-style loops, you can redirect the user to `_auth/authorize?redirect_uri=<your_app_url>`. The gateway will redirect back with the token appended to the hash fragment:

```javascript
// Initiate authorize flow
const appUrl = window.location.origin + window.location.pathname;
window.location.href = `./_auth/authorize?redirect_uri=${encodeURIComponent(appUrl)}`;

// On return, extract the token from the hash
const token = new URLSearchParams(window.location.hash.substring(1)).get('token');
```
*Security Note: The gateway enforces strict Same-Origin checks on `redirect_uri` to prevent Open Redirect attacks.*

### 3. Background Token Refresh (`_auth/refresh`)
Access tokens are typically short-lived (e.g. 5 minutes). If your frontend is making continuous API requests, it must rotate expired tokens. Rather than redirecting the user and disrupting their session, the SPA can trigger a background refresh:

```javascript
async function ensureFreshToken() {
  // Try retrieving the current cached token
  const tokenRes = await fetch('./_auth/token');
  const { token } = await tokenRes.json();
  
  if (isTokenExpired(token)) {
    // Perform silent, background token refresh using rotated refresh token cookie
    const refreshRes = await fetch('./_auth/refresh', { method: 'POST' });
    if (refreshRes.ok) {
      const { token: newToken } = await refreshRes.json();
      return newToken;
    } else {
      throw new Error("Refresh failed, user must re-authenticate");
    }
  }
  return token;
}
```

---

## 🛡️ Security Design & Transparent Session Management

The gateway acts as an OAuth 2.0 **Backend-for-Frontend (BFF) Mediator**:

1. **HttpOnly Cookie Isolation**: The OIDC `refresh_token` is encrypted using **AES-256-GCM** (with keys dynamically derived via **HKDF-SHA256** from the gateway session secret) and stored in a secure `HttpOnly` cookie named `nocr_refresh`. It is never exposed to JavaScript or workspace containers.
2. **Transparent Auto-Refresh**: If a user visits their workspace and their access token has expired but the `nocr_refresh` cookie is still valid, the gateway's global `preHandler` hook intercepts the request, calls the OIDC provider's `/token` endpoint, rotates the refresh token cookie, and fulfills the request with the new credentials. This happens **transparently in the background** with zero interruptions.
3. **Graceful Degradation**:
   - If the refresh token has expired or is revoked, standard web requests (`GET` with `Accept: text/html`) are redirected to the login landing page for a seamless sign-in loop.
   - API endpoints (`fetch` / `XMLHttpRequest` / `POST`) receive a `401 Unauthorized` response, allowing frontends to gracefully prompt users or store local state.

---

## 📚 External Resources & Standards

For further reading on the security patterns and protocols utilized in this architecture:

*   **OAuth 2.0 Security Best Current Practice**: [RFC 9700 / Security Topics Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics) — Outlines why storing refresh tokens in the browser is discouraged, and mandates Backend-for-Frontend (BFF) patterns.
*   **The Backend-for-Frontend (BFF) Pattern**: [Microsoft Cloud Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) — Explains the architectural benefits of decoupling frontend clients from security-sensitive token handling.
*   **AES-256-GCM Cryptography**: [NIST SP 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf) — Standard specification for Galois/Counter Mode (GCM) encryption used to secure the cookies.
*   **HMAC-SHA256 Verification**: [RFC 2104](https://datatracker.ietf.org/html/rfc2104) — Outlines the keyed-hashing mechanism used to verify gateway session authenticity.
