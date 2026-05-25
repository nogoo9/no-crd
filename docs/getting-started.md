# Getting Started

`nogoo9` is a platform for agent-driven, on-demand pod orchestration in Kubernetes (k8s/k3s) **without Custom Resource Definitions (CRDs)**. It allows developers and AI agents to dynamically spin up, route to, and manage ephemeral workloads.

## Installation

Add the package to your project or install globally:

```bash
bun install @nogoo9/no-crd
```

## Running the MCP Server

You can run the server using Bun, Deno, or Node.js from the source file `src/server-entry.ts` or by using the global CLI.

### Using Bun (Recommended)

```bash
bun run src/server-entry.ts
```

### Using Node.js

```bash
npx tsx src/server-entry.ts
```

### Using Deno

```bash
deno run --allow-all src/server-entry.ts
```

## Configuration

The server can be configured via environment variables or CLI flags:

| Environment Variable | CLI Option | Description | Default |
| --- | --- | --- | --- |
| `PORT` | `--port` | Port to bind the HTTP/SSE server | `3000` |
| `HOST` | `-H`, `--host` | Host interface to bind the HTTP/SSE server to <br>*(Available from v0.2.0)* | `0.0.0.0` |
| `TRANSPORT` | `--transport` | Transport protocol (`http`, `stdio`, `both`) | `http` |
| `MODE` | `--mode` | Access control mode (`cluster`, `namespaced`) | `cluster` |
| `DEFAULT_NAMESPACE` | `--namespace` | Target Kubernetes namespace | `default` |
| `DISABLE_PERMISSION_CHECKS` | `--disable-permission-checks` | Bypasses RBAC verification checks | `false` |
| `CORS_ALLOWED_ORIGIN` / `CORS_ORIGIN` | `--cors-origin` | Custom Access-Control-Allow-Origin header | `*` |
| `CORS_ALLOWED_METHODS` / `CORS_METHODS` | `--cors-methods` | Custom Access-Control-Allow-Methods header | `GET, POST, OPTIONS` |
| `CORS_ALLOWED_HEADERS` / `CORS_HEADERS` | `--cors-headers` | Custom Access-Control-Allow-Headers header (allows mcp-protocol-version by default) | `Content-Type, Authorization, mcp-protocol-version` |
| `REGISTRY_URL` | - | Image registry endpoint for listing images | - |
| `BASE_URL` | `--base-url` | Base URL path prefix for hosting behind a reverse proxy subpath <br>*(Available from v0.2.0)* | - |
| `AUTH_ENABLED` | `--auth-enabled` | Enables JWT token authentication on MCP tools and route proxy <br>*(Available from v0.2.0 - Experimental)* | `false` |
| `JWT_SECRET` | `--jwt-secret` | Symmetric HMAC-SHA256 secret for token verification <br>*(Available from v0.2.0 - Experimental)* | - |
| `JWT_PUBLIC_KEY` | `--jwt-public-key` | PEM encoded RSA/ECDSA public key for asymmetric token verification <br>*(Available from v0.2.0 - Experimental)* | - |
| `JWKS_URI` | `--jwks-uri` | Remote JWKS endpoint URL to dynamically retrieve verification keys <br>*(Available from v0.2.0 - Experimental)* | - |
| `AUTH_SUB_JSONPATH` | `--auth-sub-jsonpath` | JSONPath expression to extract user subject from JWT payload <br>*(Available from v0.2.0 - Experimental)* | `$.sub` |
| `AUTH_ISSUER` | `--auth-issuer` | Identifier URL for the Authorization Server advertised in metadata discovery <br>*(Available from v0.2.0 - Experimental)* | - |
| `DEFAULT_WORKSPACE_PORT` | `--default-workspace-port` | Default target port inside the workspace pods to proxy traffic to <br>*(Available from v0.2.0 - Experimental)* | `3000` |
