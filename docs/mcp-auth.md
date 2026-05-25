# MCP Authentication (Experimental)
*(Available from v0.2.0 - Experimental)*

> [!WARNING]
> The MCP Authentication engine is experimental and likely to change in the next version.

This page describes how to configure, authenticate, and secure remote HTTP and SSE client connections using the `@nogoo9/no-crd` built-in Model Context Protocol (MCP) authentication and authorization engine.

This engine is designed to align with the official **Model Context Protocol Authorization specification**:
* [MCP Draft Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
* [MCP Authorization Tutorial Guide](https://modelcontextprotocol.io/docs/tutorials/security/authorization)
* [MCP Authentication Overview & OAuth 2.1 Extension](https://modelcontextprotocol.io/extensions/auth/overview)
* [MCP Ext-Auth Reference Implementation](https://github.com/modelcontextprotocol/ext-auth)

---

## 🔒 Setting Up Keycloak as the Authorization Server

To run and test the `@nogoo9/no-crd` authorization setup locally, you can deploy a [Keycloak](https://www.keycloak.org/) instance via Docker. This mirrors the official [MCP Authorization Tutorial Setup](https://modelcontextprotocol.io/docs/tutorials/security/authorization).

### 1. Start the Keycloak Container
Run the following terminal command to start Keycloak in development mode:

```bash
docker run -p 127.0.0.1:8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak start-dev
```

This starts Keycloak on `http://localhost:8080` with username `admin` and password `admin`.

### 2. Configure Realms and Client Scopes
1. Access the admin console at `http://localhost:8080` and log in.
2. Select the realm (e.g., `master` or create a new one).
3. Go to **Client scopes** and create a new scope named `mcp:tools` (or the specific scope you want to support).
4. Configure an **Audience** in the OIDC scope mappings:
   - Name: `audience-config`
   - Included Custom Audience: Set to the MCP Server base URL (e.g., `http://localhost:3000`). This ensures that Keycloak-issued tokens have the correct `aud` claim.

### 3. Register the MCP Server Client (for Introspection)
To support real-time token status verification (RFC 7662 token introspection) by the MCP server:
1. In the Keycloak console, navigate to **Clients** and click **Create client**.
2. Set **Client ID** to `mcp-server` (or configure a custom ID corresponding to `OAUTH_CLIENT_ID`).
3. Set **Capability config**: Enable **Client authentication** (making it a confidential client) and **Service accounts roles**.
4. Save the client configuration.
5. In the client's **Credentials** tab, copy the **Client Secret** (corresponding to `OAUTH_CLIENT_SECRET`).

---

## 🔌 RFC 9728 Compliance & OAuth Discovery

To allow remote MCP hosts or clients to authenticate dynamically, `@nogoo9/no-crd` supports the RFC 9728 standard for Protected Resource Metadata.

### Metadata Discovery Endpoint
The server hosts a standardized JSON discovery document at:
`/.well-known/oauth-protected-resource`

Which returns information enabling clients to dynamically query authorization servers, scopes, and token formats:

```json
{
  "resource": "http://localhost:3000",
  "authorization_servers": [
    "https://auth.company.com/oauth"
  ],
  "scopes_supported": [
    "mcp"
  ],
  "bearer_methods_supported": [
    "header"
  ]
}
```

### Unauthorized Challenges
If a client attempts to execute an MCP tool without a valid JWT token when `AUTH_ENABLED` is true, the server returns a `401 Unauthorized` response with the following headers in alignment with RFC 9728:
- `WWW-Authenticate`: Points the client to the metadata endpoint using the `resource_metadata` parameter.
- `Link`: A rel-link pointing to the metadata location.

Example response headers:
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"
Link: <http://localhost:3000/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"
```

---

## 🔑 JWT Validation Configuration
To secure the MCP server, enable authentication by setting:
```bash
AUTH_ENABLED=true
```
When enabled, all HTTP request endpoints (including `/mcp`, `/permissions`, `/route/:workspaceId/*`, and `/namespaces`) will require a valid JSON Web Token (JWT). The server will extract and verify the token signature, validate the expiration (`exp`), and resolve the user identity.

### 1. Signature Verification Requirement (`JWT_VERIFICATION_REQUIRED`)
In enterprise environments, token verification is often offloaded to an upstream API Gateway, Ingress Controller (e.g., Traefik, Kong, Apigee), or OAuth Proxy. 

* **Default (`true`)**: The server performs full cryptographic signature validation of the incoming JWT.
* **Offloaded Mode (`false`)**: If you set `JWT_VERIFICATION_REQUIRED=false`, the server will skip signature validation and only decode the token payload. Set this ONLY if an upstream gateway guarantees that the `Authorization` header is verified before reaching the MCP server.

---

### 2. Symmetric HMAC-SHA256 (`HS256`)
Use this mode if the MCP server and the token provider share a common secret.

* **Required configuration:**
  ```bash
  JWT_SECRET="your-symmetric-hmac-shared-key-must-be-long-and-secure"
  ```
* **How it works:** The server signs/verifies the signature using standard Web Crypto HMAC-SHA256.

---

### 3. Asymmetric PEM Public Key (`RS256` / `ES256`)
Use this mode if the token is signed with a private key (RSA or ECDSA) and you have the public key in PEM format.

* **Required configuration:**
  ```bash
  JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
  ```
  *(You can supply newline characters as literals or pass it as a single line).*
* **How it works:** The server imports the public key as SPKI (`RSASSA-PKCS1-v1_5` for RS256, or `ECDSA` with `P-256` curve for ES256) and cryptographically validates the token.

---

### 4. JSON Web Key Sets (`JWKS_URI`)
Use this mode if you are integrating with a modern Identity Provider (IdP) like Okta, Auth0, Keycloak, or Entra ID.

* **Required configuration:**
  ```bash
  JWKS_URI="https://auth.company.com/oauth/keys"
  # Optional (recommended)
  AUTH_ISSUER="https://auth.company.com/oauth"
  ```
* **How it works:** 
  1. The server reads the `kid` (Key ID) and `alg` from the token header.
  2. It fetches the public key list from `JWKS_URI`.
  3. It matches the key and caches it in memory for 5 minutes (`JWKS_CACHE_TTL = 300000ms`) to minimize network latency.
  4. It imports the matching JWK into the Web Crypto engine to verify the signature.

---

### 5. OAuth 2.0 Token Introspection (`INTROSPECTION_ENDPOINT`)
For environments using opaque tokens or requiring real-time status validation against a centralized authorization server (e.g., Keycloak, Okta, Hydra) without decoding JWT signatures locally, the server supports **OAuth 2.0 Token Introspection (RFC 7662)**.

When token introspection is configured, the server will make a POST request to the introspection endpoint on every incoming request, transmitting the token along with optional client credentials.

* **Required configuration:**
  ```bash
  INTROSPECTION_ENDPOINT="https://auth.company.com/oauth/introspect"
  # Optional client credentials:
  OAUTH_CLIENT_ID="mcp-server"
  OAUTH_CLIENT_SECRET="your-oauth-client-secret"
  ```
* **How it works:**
  1. The server extracts the token from the request headers.
  2. It makes a secure `POST` request to `INTROSPECTION_ENDPOINT` with client credentials.
  3. The authorization server returns a JSON response containing an `active` boolean claim.
  4. If `active` is `false`, the request is rejected with `401 Unauthorized`. If it is `true`, the returned claims are treated as the authenticated user payload.

---

## 🎯 Audience Claim Verification & Prefix Matching
To prevent token replay/passthrough attacks where a token meant for a different service is presented to the MCP server, the engine enforces audience validation.

### Expected Audience Resolution
The server determines the expected audience dynamically or statically:
1. **Static (`JWT_AUDIENCE`)**: If `JWT_AUDIENCE` is set in the environment, it is used as the strict expected audience.
2. **Dynamic (Default)**: If `JWT_AUDIENCE` is not configured, the server resolves the expected audience dynamically from the request protocol and host combined with the `BASE_URL` path prefix. This automatically supports deployments behind reverse proxies or API gateways.

### The Prefix-Matching Algorithm (`checkResourceAllowed`)
To align with the official MCP Authorization spec, the audience is validated using a prefix-matching logic:
- The protocol and host of the token's `aud` claim and the expected audience must match exactly (case-insensitive).
- The path of the token's `aud` claim must be a prefix of the expected audience path. For example, if the token is authorized for `http://localhost:3000/`, it will match an expected audience of `http://localhost:3000/mcp`.

---

## 🔍 Subject Customization (`AUTH_SUB_JSONPATH`)
By default, the server extracts the user identity from the `sub` claim in the JWT. If your identity provider places user identifiers or NTIDs inside nested claims, configure `AUTH_SUB_JSONPATH` with a valid JSONPath expression.

* **Default:** `$.sub`
* **Custom Nesting (e.g. Okta custom claims):** `$.user.ntid` or `$.preferred_username`
* **Example Payload:**
  ```json
  {
    "iss": "https://auth.company.com/oauth",
    "user": {
      "ntid": "eterna2",
      "email": "user@company.com"
    }
  }
  ```
  Setting `AUTH_SUB_JSONPATH="$.user.ntid"` resolves the owner identity to `"eterna2"`.

---

## 🛡️ User Resource Isolation & Authorization Checks
When `AUTH_ENABLED` is set to `true`, the MCP server automatically enforces multi-tenant workspace isolation. This ensures that users can only view, modify, or proxy traffic to workspaces they have created.

### 1. Resource Tagging & Ownership
All resources created during workspace provisioning are automatically stamped with the user's identity:
- **Workspaces (Pods)**: Stamped with both the label `nogoo9/user-sub` and the metadata annotation `nogoo9/user-sub`.
- **IAM Credentials (ServiceAccounts)**: Stamped with the label `nogoo9/user-sub` and the metadata annotation `nogoo9/user-sub` if provisioning a dedicated AWS IAM role integration.

The user's identity is extracted from the JWT token claims using the JSONPath expression configured via `AUTH_SUB_JSONPATH` (which defaults to `$.sub`).

### 2. Authorization Enforcements
- **Listing Workspaces (`list_workspaces`)**: The list operation is restricted by default to workspaces created by the requesting user. The server queries Kubernetes using a label selector matching the current user's identity (e.g. `nogoo9/user-sub=<extracted-user-sub>`). Other users' workspaces are completely hidden.
- **Stopping/Deleting Workspaces (`stop_workspace`)**: A user can only stop/delete workspaces they created. The lookup query enforces user ownership, and trying to terminate another user's workspace returns a `404 Not Found` or `Access Denied` error.
- **Traffic Proxying (`/route/:workspaceId/*`)**: Every HTTP request proxied to a workspace is authenticated. The reverse proxy dynamically verifies that the requesting user's identity matches the target pod's `nogoo9/user-sub` ownership label. Any mismatch results in a `403 Forbidden` response.

---

## 📡 Passing Tokens to the Server
Clients must supply the token in one of two ways:

1. **Authorization Header (Standard)**:
   ```http
   Authorization: Bearer <your-jwt-token>
   ```
2. **Query Parameter (Fallback)**:
   Useful for embedding the React dashboard inside an iframe, or accessing static proxy routes (`/route/:workspaceId/...`) from a standard browser:
   ```
   http://localhost:3000/route/session-45/?token=<your-jwt-token>
   ```

---

## 🛠️ Script: Generating Test Tokens
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
