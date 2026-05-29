# ADR-012: Per-Session McpServer Factory Pattern

- **Status:** Accepted
- **Date:** 2026-05-30
- **Supersedes:** Part of ADR-009 (eager startup remains, but the shared global server is removed)

## Context

The MCP TypeScript SDK enforces a strict contract: **each `McpServer` instance can only be connected to one `Transport`**. Calling `server.connect(transport)` on an already-connected server throws `"already connected transport, call close()"`.

Our original design eagerly created a single `globalMcpServer` at startup (per [ADR-009](/decisions/ADR-009-eager-startup-health-check)) and reused it across all incoming sessions. This worked for the first session but threw on the second.

The official SDK example (`simpleStreamableHttp.ts`) uses a `getServer()` factory function that returns a **fresh `McpServer` per session**.

### Observed Symptoms

- Users connecting from a second browser tab or after OIDC callback saw `"already connected transport, call close()"`.
- The error cascaded: the MCP endpoint returned 500, the UI showed "Failed to connect to MCP Host client", and subsequent tool calls failed.

## Decision

Adopt the official MCP SDK **per-session factory pattern**:

| Mode | Pattern |
|------|---------|
| **Stateless** | Fresh `McpServer` + `Transport` per HTTP request |
| **Stateful** | Fresh `McpServer` + `Transport` per session, stored in `activeSessions` map keyed by `mcp-session-id` |
| **Test** | Fresh `McpServer` connected to an injected `globalTransport` on first use |
| **Startup** | Throwaway `McpServer` validates RBAC/tool registration, then is discarded (ADR-009 preserved) |

The `globalMcpServer` global variable is **removed entirely**.

### Implementation

```typescript
// Factory: each session gets its own McpServer
const server = await createMcpServer(getK8sContext());
registerUiApp(server, DIST_DIR);
const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: () => uuidv7(),
  onsessioninitialized: (sessId) => {
    activeSessions.set(sessId, { server, transport });
  },
  onsessionclosed: (sessId) => {
    activeSessions.delete(sessId);
    void server.close().catch(() => {});
  },
});
await server.connect(transport);
```

## Alternatives Considered

### 1. Call `server.close()` before reconnecting

Rejected — `McpServer.close()` tears down handlers and state. Reconnecting a closed server produces undefined behavior and defeats the purpose of stateful sessions.

### 2. Keep `globalMcpServer` for the first session, create new ones after

Rejected — introduces two code paths, special-cases the first session, and is fragile under concurrent initialization. The factory pattern is simpler and uniform.

### 3. Single server with transport multiplexing

The MCP SDK does not support multiplexing multiple transports on one server. This is by design — each `McpServer`+`Transport` pair represents an isolated session with its own state.

## Consequences

### Positive

- **Bug fixed**: Multiple concurrent sessions work correctly.
- **Follows SDK convention**: Aligns with the official `getServer()` pattern, making future SDK upgrades safer.
- **Simpler state**: No global mutable server reference to manage.

### Negative

- **Per-session overhead**: Each session creates a new `McpServer` and re-registers tools. In practice this is ~5ms and acceptable — `createMcpServer()` performs no I/O (RBAC evaluation is cached).
- **Startup validation is throwaway**: The eagerly-created validation server at boot is discarded. This is intentional — it exists only to fail-fast on RBAC misconfiguration (ADR-009).

## References

- [MCP SDK `simpleStreamableHttp.ts` example](https://github.com/modelcontextprotocol/typescript-sdk) — uses `getServer()` factory
- [ADR-009: Eager Startup](/decisions/ADR-009-eager-startup-health-check) — startup validation preserved
- [`src/server/index.ts`](/api/) — implementation
