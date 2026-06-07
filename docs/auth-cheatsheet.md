# Authentication & Authorization Cheatsheet

This cheatsheet lists all available authentication and authorization environment variables, their defaults, and step-by-step examples for common deployment patterns.

---

## ⚙️ Configuration Reference

### 🔐 Core Settings

| Environment Variable | Default Value | Allowed Values | Description & Purpose | Example |
| :--- | :--- | :--- | :--- | :--- |
| `AUTH_ENABLED` | `false` | `true`, `false` | Enables JWT token authentication on MCP tools, static assets, and the routing proxy. | `AUTH_ENABLED="true"` |
| `JWT_VERIFICATION_REQUIRED` | `true` | `true`, `false` | Enables/disables JWT cryptographic signature verification. Useful to disable temporarily when debugging or running mock tokens. | `JWT_VERIFICATION_REQUIRED="false"` |
| `JWT_AUDIENCE` | *None* | String | The expected token audience (`aud` claim). Defaults to `OAUTH_CLIENT_ID` if not specified. | `JWT_AUDIENCE="https://api.nogoo9.io"` |
| `AUTH_ISSUER` <br> (or `JWT_ISSUER`) | *None* | URL String | The expected token issuer (`iss` claim). | `AUTH_ISSUER="https://keycloak.example.com/realms/nogoo9"` |

---

### 🔑 Token Verification Methods
You must configure **exactly one** of these options if `JWT_VERIFICATION_REQUIRED="true"`:

| Environment Variable | Default Value | Description / Purpose | Example |
| :--- | :--- | :--- | :--- |
| `JWKS_URI` | *None* | Remote JWKS endpoint URL to dynamically fetch OIDC public keys. | `JWKS_URI="https://keycloak.example.com/realms/nogoo9/protocol/openid-connect/certs"` |
| `JWT_PUBLIC_KEY` | *None* | PEM-encoded RSA/ECDSA public key string for asymmetric signature verification. | `JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANB..."` |
| `JWT_SECRET` | *None* | Symmetric HMAC-SHA256 secret key. | `JWT_SECRET="my-super-secret-key-32-bytes-long"` |
| `INTROSPECTION_ENDPOINT` <br> (or `JWT_INTROSPECTION_ENDPOINT`) | *None* | RFC 7662 token introspection endpoint URL for token verification. | `INTROSPECTION_ENDPOINT="https://keycloak.example.com/realms/nogoo9/protocol/openid-connect/token/introspect"` |

---

### 🏷️ Scopes, Roles & JSONPaths
Configure how user identity, client scopes, and user roles are extracted from the JWT token:

| Environment Variable | Default Value | Allowed Values | Description / Purpose | Example |
| :--- | :--- | :--- | :--- | :--- |
| `AUTH_SUB_JSONPATH` | `$.sub` | JSONPath | Extracts the unique user ID (used as the workspace owner's identity). | `AUTH_SUB_JSONPATH="$.preferred_username"` |
| `AUTH_SCOPE_JSONPATH` | `$.scope` | JSONPath | Extracts client scopes. Falls back to `$.scp` if empty. | `AUTH_SCOPE_JSONPATH="$.scopes"` |
| `AUTH_ROLES_JSONPATH` <br> (or `AUTH_ADMIN_JSONPATH`) | `$.realm_access.roles` | JSONPath | Extracts user roles from the JWT payload. | `AUTH_ROLES_JSONPATH="$.groups"` |
| `AUTH_DEFAULT_ROLE` | `viewer` | String | Fallback role if the token does not contain any roles or scopes. | `AUTH_DEFAULT_ROLE="viewer"` |
| `AUTH_REQUIRED_READ_SCOPE` | `nogoo9:read` | String | OAuth scope required for read operations. | `AUTH_REQUIRED_READ_SCOPE="read:workspaces"` |
| `AUTH_REQUIRED_WRITE_SCOPE` | `nogoo9:write` | String | OAuth scope required for write operations. | `AUTH_REQUIRED_WRITE_SCOPE="write:workspaces"` |
| `AUTH_REQUIRED_ADMIN_SCOPE` | `nogoo9:admin` | String | OAuth scope required for administrative operations. | `AUTH_REQUIRED_ADMIN_SCOPE="admin:workspaces"` |
| `AUTH_REQUIRED_READ_ROLE` | `viewer` | String | User role required for read operations. | `AUTH_REQUIRED_READ_ROLE="view-only"` |
| `AUTH_REQUIRED_WRITE_ROLE` | `user` | String | User role required for write/mutation operations. | `AUTH_REQUIRED_WRITE_ROLE="developer"` |
| `AUTH_ADMIN_ROLE` | `admin` | String | User role name that grants administrative bypass. | `AUTH_ADMIN_ROLE="cluster-admin"` |

---

### 🌐 Direct OAuth Configuration & Sessions
Configure session durations and custom OAuth login URLs for the Dashboard UI:

| Environment Variable | Default Value | Allowed Values | Description / Purpose | Example |
| :--- | :--- | :--- | :--- | :--- |
| `OAUTH_CLIENT_ID` | *None* | String | The client ID registered with your OAuth 2.0 / OIDC provider. | `OAUTH_CLIENT_ID="nogoo9-mcp-client"` |
| `OAUTH_CLIENT_SECRET` | *None* | String | Client secret for backend token exchange. | `OAUTH_CLIENT_SECRET="client-secret-here"` |
| `OAUTH_SCOPES` | `openid profile email offline_access` | Space-separated string | Scopes requested by the dashboard during PKCE login. | `OAUTH_SCOPES="openid email offline_access"` |
| `OAUTH_DISCOVERY_URL` | *None* | URL String | OIDC metadata discovery endpoint. | `OAUTH_DISCOVERY_URL="https://auth.example.com/.well-known/openid-configuration"` |
| `OAUTH_AUTHORIZATION_URL`| *None* | URL String | Direct OAuth authorization page. Used if OIDC discovery is unavailable. | `OAUTH_AUTHORIZATION_URL="https://auth.example.com/oauth/authorize"` |
| `OAUTH_TOKEN_URL` | *None* | URL String | Direct OAuth token endpoint. Used if OIDC discovery is unavailable. | `OAUTH_TOKEN_URL="https://auth.example.com/oauth/token"` |
| `OAUTH_END_SESSION_URL` | *None* | URL String | Direct OAuth logout page. Used if OIDC discovery is unavailable. | `OAUTH_END_SESSION_URL="https://auth.example.com/oauth/logout"` |
| `PROXY_SESSION_SECRET` | *None* | String | 32+ byte string used to encrypt/sign stateless session cookies (`nocr_token` / `nocr_sess`). | `PROXY_SESSION_SECRET="4a8b...2f9c"` |
| `PROXY_SESSION_TTL` | `1800` | Number | Session cookie lifetime in seconds (default: 30 minutes). | `PROXY_SESSION_TTL="3600"` |

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
