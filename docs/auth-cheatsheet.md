# Authentication & Authorization Cheatsheet

This cheatsheet lists all available authentication and authorization environment variables, their defaults, behaviors if unset, and step-by-step examples for common deployment patterns.

---

## ⚙️ Configuration Reference

### 🔐 Core Settings

| Environment Variable | Default Value | Behavior if Unset | Description & Examples |
| :--- | :--- | :--- | :--- |
| `AUTH_ENABLED` | `false` | Authentication is disabled. All MCP tools and routing proxies are open, and user isolation is bypassed. | Enables JWT token authentication on MCP tools, static assets, and the routing proxy. <br> **Example**: `AUTH_ENABLED="true"` |
| `JWT_VERIFICATION_REQUIRED` | `true` | JWT signature verification is strictly enforced. | Enables/disables JWT signature verification. Set to `false` only during local debugging or integration tests to accept mock tokens. <br> **Example**: `JWT_VERIFICATION_REQUIRED="false"` |
| `JWT_AUDIENCE` | *None* | Audience verification is skipped (or falls back to `OAUTH_CLIENT_ID` if configured). | The expected token audience (`aud` claim). <br> **Example**: `JWT_AUDIENCE="https://api.nogoo9.io"` |
| `AUTH_ISSUER` <br> (or `JWT_ISSUER`) | *None* | Issuer claim is not validated against incoming tokens, and discovery lists no issuer. | The expected token issuer (`iss` claim) advertised in oauth-protected-resource metadata discovery. <br> **Example**: `AUTH_ISSUER="https://keycloak.example.com/realms/nogoo9"` |

---

### 🔑 Token Verification Methods
If `JWT_VERIFICATION_REQUIRED="true"`, you must configure **exactly one** of these options. If none are configured, token verification will fail.

| Environment Variable | Default Value | Behavior if Unset | Description & Examples |
| :--- | :--- | :--- | :--- |
| `JWKS_URI` | *None* | Remote dynamic public key retrieval is disabled. | Remote JWKS endpoint URL to dynamically fetch OIDC public keys. <br> **Example**: `JWKS_URI="https://keycloak.example.com/realms/nogoo9/protocol/openid-connect/certs"` |
| `JWT_PUBLIC_KEY` | *None* | Asymmetric verification using a local key string is disabled. | PEM-encoded RSA/ECDSA public key string for offline signature verification. <br> **Example**: `JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANB..."` |
| `JWT_SECRET` | *None* | Symmetric signature verification is disabled. | Symmetric HMAC-SHA256 secret key. <br> **Example**: `JWT_SECRET="my-super-secret-key-32-bytes-long"` |
| `INTROSPECTION_ENDPOINT` <br> (or `JWT_INTROSPECTION_ENDPOINT`) | *None* | Online token verification is disabled. Signature checks are performed offline instead. | URL to delegate validation check online via OAuth 2.0 Token Introspection (RFC 7662). <br> **Example**: `INTROSPECTION_ENDPOINT="https://keycloak.example.com/.../introspect"` |

---

### 🏷️ Scopes, Roles & JSONPaths
Configure how user identity, client scopes, and user roles are extracted from the JWT token:

| Environment Variable | Default Value | Behavior if Unset | Description & Examples |
| :--- | :--- | :--- | :--- |
| `AUTH_SUB_JSONPATH` | `$.sub` | Defaults to extracting identity from `$.sub`. If missing, authentication fails. | JSONPath expression to extract unique user identity from JWT payload. <br> **Example**: `AUTH_SUB_JSONPATH="$.preferred_username"` |
| `AUTH_SCOPE_JSONPATH` | `$.scope` | Defaults to extracting scopes from `$.scope` (or `$.scp`). If empty, scope validation is bypassed. | JSONPath expression to extract scopes from JWT payload. <br> **Example**: `AUTH_SCOPE_JSONPATH="$.scopes"` |
| `AUTH_ROLES_JSONPATH` <br> (or `AUTH_ADMIN_JSONPATH`) | `$.realm_access.roles` | Defaults to `$.realm_access.roles`. If empty, roles are treated as none (failing role validation). | JSONPath expression to extract user roles. <br> **Example**: `AUTH_ROLES_JSONPATH="$.groups"` |
| `AUTH_DEFAULT_ROLE` | `viewer` | Defaults to `"viewer"` if no roles or scopes are present in the token. | Fallback role assigned if the token does not contain any roles or scopes. <br> **Example**: `AUTH_DEFAULT_ROLE="viewer"` |
| `AUTH_REQUIRED_READ_SCOPE` | `nogoo9:read` | Defaults to `nogoo9:read`. If explicitly configured to empty, read scope checks are bypassed. | OAuth scope required for read operations (e.g. list workspaces). <br> **Example**: `AUTH_REQUIRED_READ_SCOPE="read:workspaces"` |
| `AUTH_REQUIRED_WRITE_SCOPE` | `nogoo9:write` | Defaults to `nogoo9:write`. If explicitly configured to empty, write scope checks are bypassed. | OAuth scope required for write/mutation operations (e.g. spawn workspace). <br> **Example**: `AUTH_REQUIRED_WRITE_SCOPE="write:workspaces"` |
| `AUTH_REQUIRED_ADMIN_SCOPE` | `nogoo9:admin` | Defaults to `nogoo9:admin`. If explicitly configured to empty, admin scope checks are bypassed. | OAuth scope required for administrator operations (e.g. spawn on behalf of others). <br> **Example**: `AUTH_REQUIRED_ADMIN_SCOPE="admin:workspaces"` |
| `AUTH_REQUIRED_READ_ROLE` | `viewer` | Defaults to `viewer`. If explicitly configured to empty, read role checks are bypassed. | User role required for read operations. <br> **Example**: `AUTH_REQUIRED_READ_ROLE="view-only"` |
| `AUTH_REQUIRED_WRITE_ROLE` | `user` | Defaults to `user`. If explicitly configured to empty, write role checks are bypassed. | User role required for write/mutation operations. <br> **Example**: `AUTH_REQUIRED_WRITE_ROLE="developer"` |
| `AUTH_ADMIN_ROLE` | `admin` | Defaults to `"admin"`. If disabled, administrative bypass capabilities are unavailable. | User role name that grants administrative privilege escalation. <br> **Example**: `AUTH_ADMIN_ROLE="cluster-admin"` |

---

### 🌐 Direct OAuth Configuration & Sessions
Configure session durations and custom OAuth login URLs for the Dashboard UI:

| Environment Variable | Default Value | Behavior if Unset | Description & Examples |
| :--- | :--- | :--- | :--- |
| `OAUTH_CLIENT_ID` | *None* | OAuth client identifier is empty. Audience validation falls back to checking only standard audience. | Client ID registered with your OAuth 2.0 / OIDC provider. <br> **Example**: `OAUTH_CLIENT_ID="nogoo9-mcp-client"` |
| `OAUTH_CLIENT_SECRET` | *None* | Direct token exchanges and introspection are performed without a client secret. | Client secret for backend authentication. Required by confidential clients. <br> **Example**: `OAUTH_CLIENT_SECRET="client-secret-here"` |
| `OAUTH_SCOPES` | `openid profile email offline_access` | Defaults to requesting `"openid profile email offline_access"`. | Space-separated list of scopes requested during dashboard sign-in. <br> **Example**: `OAUTH_SCOPES="openid email offline_access"` |
| `OAUTH_DISCOVERY_URL` | *None* | Server relies on direct URL configurations below. If they are also empty, startup fails when `AUTH_ENABLED="true"`. | OIDC metadata discovery endpoint. <br> **Example**: `OAUTH_DISCOVERY_URL="https://auth.example.com/.well-known/openid-configuration"` |
| `OAUTH_AUTHORIZATION_URL`| *None* | Server relies on OAUTH_DISCOVERY_URL. | Direct URL to OIDC authorization page. <br> **Example**: `OAUTH_AUTHORIZATION_URL="https://auth.example.com/oauth/authorize"` |
| `OAUTH_TOKEN_URL` | *None* | Server relies on OAUTH_DISCOVERY_URL. | Direct URL to OIDC token endpoint. <br> **Example**: `OAUTH_TOKEN_URL="https://auth.example.com/oauth/token"` |
| `OAUTH_END_SESSION_URL` | *None* | Server relies on OAUTH_DISCOVERY_URL. UI logout clears cookies without routing to IdP logout. | Direct URL to OIDC logout endpoint. <br> **Example**: `OAUTH_END_SESSION_URL="https://auth.example.com/oauth/logout"` |
| `PROXY_SESSION_SECRET` | *None* | Falls back to `JWT_SECRET`. If that is also unset, the server resolves it via a cascade: querying/creating a Kubernetes Secret (`nogoo9-session-key`), adopting from peer pods, or generating a random key in-memory. | 32+ byte key used to encrypt and sign stateless session cookies (`nocr_token` / `nocr_sess`). <br> **Example**: `PROXY_SESSION_SECRET="4a8b...2f9c"` |
| `PROXY_SESSION_TTL` | `1800` | Defaults to 1800 seconds (30 minutes) expiration sliding window. | Session cookie expiration lifetime in seconds. <br> **Example**: `PROXY_SESSION_TTL="3600"` |

---

## 🛠️ Common Configuration Scenarios

### Scenario 1: Symmetric Shared Secret (HMAC-SHA256)
Best for internal platforms or test environments using custom-signed tokens.

```bash
# Enable Auth
AUTH_ENABLED="true"

# Expected claims validation
AUTH_ISSUER="https://my-issuer.internal"
JWT_AUDIENCE="nogoo9-agent"

# Verification Key
JWT_SECRET="my-super-secret-signing-key-value-32-bytes-long"

# Session management
PROXY_SESSION_SECRET="another-secure-random-32-byte-hexadecimal-string"
```

---

### Scenario 2: Asymmetric Public Key (RSA/ECDSA PEM)
Best for architectures where a central auth server signs tokens using private keys, and `nogoo9` verifies them offline using the public key.

```bash
# Enable Auth
AUTH_ENABLED="true"

# Expected claims validation
AUTH_ISSUER="https://auth.mycompany.com"
JWT_AUDIENCE="nogoo9-gateway"

# Verification Key
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv1i... \n-----END PUBLIC KEY-----"

# Session management
PROXY_SESSION_SECRET="another-secure-random-32-byte-hexadecimal-string"
```

---

### Scenario 3: Standard Keycloak / OIDC Provider
Best for enterprise deployments with user group and client scope validation.

```bash
# Enable Auth & OIDC Discovery
AUTH_ENABLED="true"
OAUTH_DISCOVERY_URL="http://keycloak:8080/realms/nogoo9/.well-known/openid-configuration"
JWKS_URI="http://keycloak:8080/realms/nogoo9/protocol/openid-connect/certs"
AUTH_ISSUER="http://localhost:8080/realms/nogoo9" # Public Issuer URL

# Client Credentials for authorization redirect & token refresh
OAUTH_CLIENT_ID="nogoo9-mcp"
OAUTH_CLIENT_SECRET="some-generated-client-uuid-or-secret"
JWT_AUDIENCE="nogoo9-mcp"

# Session Encryption (Used to sign cookies)
PROXY_SESSION_SECRET="my-secure-32-byte-cookie-secret-key"

# Access Controls and Mappings
AUTH_ROLES_JSONPATH="$.realm_access.roles"
AUTH_REQUIRED_READ_ROLE="viewer"
AUTH_REQUIRED_WRITE_ROLE="user"
AUTH_ADMIN_ROLE="admin"

AUTH_SCOPE_JSONPATH="$.scope"
AUTH_REQUIRED_READ_SCOPE="nogoo9:read"
AUTH_REQUIRED_WRITE_SCOPE="nogoo9:write"
AUTH_REQUIRED_ADMIN_SCOPE="nogoo9:admin"
```

---

### Scenario 4: Custom OAuth2 Provider (No Discovery Endpoint)
Best for legacy OAuth 2.0 servers that lack an OIDC `.well-known` configuration metadata endpoint.

```bash
# Enable Auth
AUTH_ENABLED="true"
JWT_AUDIENCE="my-api-client"
AUTH_ISSUER="https://legacy-oauth.example.com"

# Signature Verification (using public certs endpoint)
JWKS_URI="https://legacy-oauth.example.com/api/v1/certs"

# Configure OAuth flow endpoints manually
OAUTH_CLIENT_ID="legacy-client-id"
OAUTH_AUTHORIZATION_URL="https://legacy-oauth.example.com/oauth2/authorize"
OAUTH_TOKEN_URL="https://legacy-oauth.example.com/oauth2/token"
OAUTH_END_SESSION_URL="https://legacy-oauth.example.com/oauth2/logout"

# Session Encryption
PROXY_SESSION_SECRET="legacy-oauth-cookie-crypt-secret-key-32-bytes"
```

---

### Scenario 5: Token Introspection (RFC 7662)
Best when JWT signatures cannot be verified offline, or when you need real-time validation checks on token revocation.

```bash
# Enable Auth
AUTH_ENABLED="true"

# Endpoint for active introspection
INTROSPECTION_ENDPOINT="https://keycloak.example.com/realms/nogoo9/protocol/openid-connect/token/introspect"

# Client credentials to authorize introspection query
OAUTH_CLIENT_ID="nogoo9-introspection-service"
OAUTH_CLIENT_SECRET="introspection-service-secret"

# Session Encryption
PROXY_SESSION_SECRET="introspection-session-cookie-secret-key-32-bytes"
```
