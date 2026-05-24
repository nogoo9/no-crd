# Getting Started

`nogoo9` is a platform for agent-driven, on-demand pod orchestration in Kubernetes (k8s/k3s) **without Custom Resource Definitions (CRDs)**. It allows developers and AI agents to dynamically spin up, route to, and manage ephemeral workloads.

## Installation

Add the package to your project or install globally:

```bash
bun install @nogoo9/no-crd
```

## Running the MCP Server

You can run the server using Bun, Deno, or Node.js.

### Using Bun (Recommended)

```bash
bun run src/index.ts
```

### Using Node.js

```bash
npx tsx src/index.ts
```

### Using Deno

```bash
deno run --allow-all src/index.ts
```

## Configuration

The server can be configured via environment variables or CLI flags:

| Environment Variable | CLI Option | Description | Default |
| --- | --- | --- | --- |
| `PORT` | `--port` | Port to bind the HTTP/SSE server | `3000` |
| `TRANSPORT` | `--transport` | Transport protocol (`http`, `stdio`, `both`) | `http` |
| `MODE` | `--mode` | Access control mode (`cluster`, `namespaced`) | `cluster` |
| `DEFAULT_NAMESPACE` | `--namespace` | Target Kubernetes namespace | `default` |
| `DISABLE_PERMISSION_CHECKS` | `--disable-permission-checks` | Bypasses RBAC verification checks | `false` |
| `CORS_ALLOWED_ORIGIN` / `CORS_ORIGIN` | `--cors-origin` | Custom Access-Control-Allow-Origin header | `*` |
| `CORS_ALLOWED_METHODS` / `CORS_METHODS` | `--cors-methods` | Custom Access-Control-Allow-Methods header | `GET, POST, OPTIONS` |
| `CORS_ALLOWED_HEADERS` / `CORS_HEADERS` | `--cors-headers` | Custom Access-Control-Allow-Headers header (allows mcp-protocol-version by default) | `Content-Type, Authorization, mcp-protocol-version` |
| `REGISTRY_URL` | - | Image registry endpoint for listing images | - |
