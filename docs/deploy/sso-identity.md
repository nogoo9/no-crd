# SSO & OIDC Authentication Guide

This guide describes how to configure, authenticate, and secure remote client connections, workspaces, and API endpoints using the built-in authentication engine of `@nogoo9/no-crd`.

---

## 🔒 Setting Up the OIDC Identity Provider

You can integrate any standard OpenID Connect (OIDC) Identity Provider (IdP) like **Keycloak**, **Okta**, or **Auth0**. Below are configurations for each.

### 1. Keycloak Setup (Local Development)
To run and test the authorization setup locally:
```bash
docker run -p 127.0.0.1:8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak start-dev
```
1. Access the console at `http://localhost:8080` and sign in.
2. Select your realm (e.g., `master` or create `nogoo9`).
3. Under **Client Scopes**, create a scope named `mcp:tools`. Inside this scope's **Mappers**, add an **Audience** mapper:
   - **Name**: `audience-config`
   - **Included Custom Audience**: The MCP Server base URL (e.g., `http://localhost:3000`). This populates the `aud` claim in the issued JWT.
4. Under **Clients**, create `mcp-server`:
   - **Client authentication**: Enabled (confidential client).
   - **Service accounts roles**: Enabled.
   - In the client's **Credentials** tab, retrieve the **Client Secret**.

### 2. Okta Configuration
1. In the Okta Admin Console, go to **Applications** > **Applications** > **Create App Integration**.
2. Select **OIDC - OpenID Connect** and **Web Application**.
3. Add a Client Secret and enable Authorization Code and Refresh Token grants.
4. Set the **Sign-in redirect URI** to your dashboard endpoint (e.g. `http://localhost:3000/` or `https://nogoo9.company.com/`).
5. Ensure Okta's Authorization Server is configured to issue an audience claim matching your server's URI, and map roles (such as AD groups) into a custom claim.

### 3. Auth0 Configuration
1. Navigate to **Applications** > **Create Application** and choose **Regular Web Applications**.
2. Go to **Settings** and copy the Client ID and Client Secret.
3. In **Allowed Callback URLs**, add your dashboard's URL.
4. In **APIs**, register your MCP server's URL as an API audience. This instructs Auth0 to return access tokens in JWT format containing the correct `aud` and `scope` claims rather than opaque tokens.

---

## 🔑 JWT Signature Verification Modes

Enable authentication check on the server by setting `AUTH_ENABLED="true"`. The server verifies tokens using one of the following modes, mapped from environment variables.

### 1. Signature Offloaded Mode
If signature verification is handled by an upstream Ingress Controller, API Gateway (e.g. Traefik, Kong), or OAuth Proxy, you can disable signature check:
```bash
JWT_VERIFICATION_REQUIRED="false"
```
*When set to `false`, the server will skip cryptographic checks and only decode claims. Use this only if the upstream network is secure and guarantees token verification.*

### 2. Symmetric HMAC-SHA256 (`HS256`)
If the server shares a common secret with the token issuer:
```bash
JWT_SECRET="your-symmetric-hmac-shared-key-must-be-long-and-secure"
```

### 3. Asymmetric SPKI Public Key (`RS256` / `ES256`)
If tokens are signed with a private key and you have the public key in PEM format:
```bash
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
```

### 4. JSON Web Key Sets (`JWKS_URI`)
For modern identity providers that publish public keys:
```bash
JWKS_URI="http://keycloak.security:8080/auth/realms/nogoo9/protocol/openid-connect/certs"
AUTH_ISSUER="http://keycloak.security:8080/auth/realms/nogoo9"
```
*The server fetches keys from this URI and caches them in memory for 5 minutes to reduce network roundtrips.*

### 5. OAuth 2.0 Token Introspection (`INTROSPECTION_ENDPOINT`)
For opaque tokens or checking live session status in real-time (RFC 7662):
```bash
INTROSPECTION_ENDPOINT="http://keycloak.security:8080/auth/realms/nogoo9/protocol/openid-connect/token/introspect"
OAUTH_CLIENT_ID="mcp-server"
OAUTH_CLIENT_SECRET="your-client-secret"
```

---

## 🎯 Audience Claim Verification
To prevent token replay attacks, the server validates the `aud` claim:
- **Expected Audience Resolution**: Set via `JWT_AUDIENCE` in the environment. If not provided, it resolves dynamically from the request protocol and host header (supporting reverse-proxied URLs).
- **Prefix Matching**: In alignment with the MCP specs, the path of the token's `aud` claim must be a prefix of the expected audience path. For example, a token signed for `http://localhost:3000/` satisfies an expected audience of `http://localhost:3000/mcp`.

---

## 🏷️ Role and Scope Mapping & Access Hierarchy

Access control checks are evaluated against both the client application's capabilities (OAuth scopes) and the user's role assignments (User roles):

| Environment Variable | Default Value | Description / Purpose |
| :--- | :--- | :--- |
| `AUTH_REQUIRED_READ_SCOPE` | `"nogoo9:read"` | Scope required for read/view operations (e.g. listing pods/workspaces). |
| `AUTH_REQUIRED_WRITE_SCOPE` | `"nogoo9:write"` | Scope required for write/mutation operations (e.g. creating/deleting pods). |
| `AUTH_REQUIRED_ADMIN_SCOPE` | `"nogoo9:admin"` | Scope required for administrative tools (e.g. spawning workspaces on behalf of others). |
| `AUTH_REQUIRED_READ_ROLE` | `"viewer"` | Role required for read/view operations. |
| `AUTH_REQUIRED_WRITE_ROLE` | `"user"` | Role required for write/mutation operations. |
| `AUTH_ADMIN_ROLE` | `"admin"` | Role required for administrator access. |
| `AUTH_DEFAULT_ROLE` | `"viewer"` | Fallback role used if the token contains no roles or scopes. |

### Access Control Rules & Bypasses
* **Admin Hardening**: Administrative operations require BOTH the admin role (`AUTH_ADMIN_ROLE`) and the admin scope (`AUTH_REQUIRED_ADMIN_SCOPE`).
* **Scope Hierarchy**: The admin scope is a superset. If a token contains the admin scope, it automatically satisfies standard read (`AUTH_REQUIRED_READ_SCOPE`) and write (`AUTH_REQUIRED_WRITE_SCOPE`) scope validation checks.
* **Scope Bypass**: If a token lacks a scope claim completely (i.e. `scope` or `scp` fields are absent or null), the scope checks are bypassed, delegating access checks solely to the roles claim.
* **Claim Extraction Customization**: Extract user identity from custom claims using `AUTH_SUB_JSONPATH` (defaults to `$.sub`). Extract roles using `AUTH_ROLES_JSONPATH` (defaults to `$.realm_access.roles`).

---

## 🔌 RFC 9728 Compliance & OAuth Discovery

To allow remote clients or agents to authenticate dynamically, the server hosts standard OAuth Protected Resource Metadata:

### Metadata Discovery Endpoint
The server hosts a standardized JSON discovery document at `GET /.well-known/oauth-protected-resource` returning:
- Supported authorization servers.
- Token format specifications.
- Required scopes.

### Unauthorized Challenges
If a client attempts to access a protected endpoint or execute a tool without a valid JWT token when `AUTH_ENABLED` is true, the server returns a `401 Unauthorized` response with the following headers:
- `WWW-Authenticate`: Points the client to the metadata endpoint using the `resource_metadata` parameter.
- `Link`: A rel-link pointing to the metadata location.

Example response headers:
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"
Link: <http://localhost:3000/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"
```

---

## 🌐 Workspace Proxy Routing & Cookie Bootstrapping

The reverse routing proxy handles browser authentication using a token-to-cookie bootstrap mechanism:

### 1. Token Bootstrapping on First Access
Standard browser links (`<a>` tags) and `<iframe>` sources do not support setting custom `Authorization` HTTP headers. When opening a workspace, the dashboard appends the active JWT token to the URL:
```
http://localhost:3000/route/ws-1/?token=<JWT>
```
The reverse proxy validates this token, allows access to the pod, and immediately issues a path-scoped, secure session cookie:
```http
Set-Cookie: nocr_token=<JWT>; Path=/route/ws-1/; SameSite=Lax; HttpOnly; Max-Age=86400
```
Subsequent requests (loading JS, CSS, images, or opening WebSockets) automatically transmit the cookie.

### 2. Direct URL Access & SSO Redirect
If a user navigates directly to a workspace URL (e.g. `http://localhost:3000/route/ws-1/`) and has no active cookies:
1. The proxy challenges the request. Since it is a direct browser page request (`Accept: text/html`), it redirects the user to the main dashboard:
   ```http
   Location: /?redirect_uri=/route/ws-1/
   ```
2. The dashboard prompts them to sign in.
3. Once logged in, the dashboard reads the `redirect_uri` and automatically routes the user back to the workspace URL with a fresh bootstrap token:
   `/route/ws-1/?token=<new-token>`

### 3. Session Cookies Resilience
To keep sessions resilient and survive short access token lifetimes:
- A stateless signed cookie (`nocr_sess`) is minted on first successful JWT verification.
- **BFF Token Refresh**: If the OIDC Identity Provider returns a `refresh_token` during OIDC PKCE login, the gateway encrypts it inside a secure, HttpOnly cookie `nocr_refresh`. When the access token expires, the gateway automatically performs a backchannel exchange with the IdP, updates the client cookies, and completes the request transparently.
- **Popup SSO Renewal**: In environments where refresh tokens are restricted, the dashboard displays a warning banner 60 seconds before token expiration. Clicking "Renew" launches a user-initiated login popup window to renew the session with the IdP without leaving the page.
- **Cross-Tab Synchronization**: Token state updates are synchronized across all open browser tabs and workspace sessions via window `storage` listeners.

---

## 🖥️ Workspace Application Authentication Integration

Workspace applications (such as custom React single-page apps or web IDE tools running inside the pods) can choose from **four authorization modes** defined in their templates:

### 1. Supported Auth Modes (`nogoo9/workspace-auth-mode`)
* **`inject-headers` (Default)**: The gateway validates the cookies, and then forwards the request to the pod, injecting headers representing the authenticated identity:
  - `x-user-sub`: The owner's OIDC subject ID.
  - `Authorization: Bearer <token>`: The active JWT access token.
* **`token-api`**: The gateway exposes endpoints `/route/<id>/_auth/token` and `/route/<id>/_auth/authorize` to the workspace container. SPA web apps running inside the container can query these local endpoints to fetch the active user's credentials and handle OIDC flows.
* **`no-auth`**: Bypasses all auth/owner checks for public workspaces, forwarding raw traffic directly to the container.
* **`same-origin`**: Routes workspaces to local token-api for same-origin authentication.

---

## 🛠️ Testing Script: Generating Test Tokens

Below is a simple Node.js / Bun script to generate and sign test tokens for each algorithm using the `jose` library (install via `bun add jose`).

```javascript
import * as jose from 'jose';

const issuer = 'https://auth.company.com/oauth';
const audience = 'mcp-server';

// 1. Generate HS256 Token
async function generateHS256(secretText) {
  const secret = new TextEncoder().encode(secretText);
  return await new jose.SignJWT({ sub: 'test-user-hmac' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime('2h')
    .sign(secret);
}

// 2. Generate RS256 Token
async function generateRS256() {
  // Generate a mock keypair
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
  
  // Export public key in PEM format to set as JWT_PUBLIC_KEY
  const spkiPem = await jose.exportSPKI(publicKey);
  console.log("Set this as JWT_PUBLIC_KEY:\n", spkiPem);

  const token = await new jose.SignJWT({ sub: 'test-user-rsa' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime('2h')
    .sign(privateKey);
    
  return token;
}

// Run generation
const hmacToken = await generateHS256('your-symmetric-hmac-shared-key-must-be-long-and-secure');
console.log("HS256 Token:\n", hmacToken);

const rsaToken = await generateRS256();
console.log("RS256 Token:\n", rsaToken);
```
