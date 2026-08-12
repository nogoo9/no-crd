# ADR-028: WebSocket Binary Frame Integrity and Socket Parser Detachment

## Status
Accepted

## Date
2026-08-12

## Context
The `@nogoo9/no-crd` gateway provides a reverse proxy for HTTP and WebSocket connections to dynamically spawned Kubernetes workspace pods (`/route/:workspaceId/*`). This powers interactive web apps, terminal sandboxes (`ttyd`), and remote desktop GUI sessions (`VNC`).

During testing and deployment with `ttyd` terminal containers, WebSocket connections consistently failed or dropped immediately with TCP close code `1006 Connection ended`. Investigation revealed two critical issues:

1. **Binary Frame Corruption**: The WebSocket proxy previously converted raw binary incoming TCP data chunks to UTF-8 strings (`chunk.toString("utf8")`) before writing them back to client or upstream sockets. Non-ASCII binary payload bytes (such as ANSI escape sequences, `ttyd` binary terminal frames, or VNC graphics data) were mangled into UTF-8 replacement characters (`\uFFFD`), corrupting the WebSocket protocol frame headers and payloads.
2. **HTTP Parser Interference**: When intercepting HTTP upgrade requests on Node's `http.Server`, Node's internal HTTP request parser (`HTTPParser`) remains attached to the upgraded `net.Socket`. When raw WebSocket frame data or 101 Switching Protocols response bytes were piped back through the socket, Node's HTTP parser attempted to parse incoming binary frames as standard HTTP request headers, throwing `HPE_INVALID_METHOD` parser errors and destroying the socket connection.
3. **Async Pod Resolution Race Condition**: Resolving target pod IP and port via the Kubernetes API is asynchronous (`listNamespacedPod`). Any client WebSocket handshake bytes sent immediately after the HTTP Upgrade header were lost if client data listeners were attached only *after* pod resolution completed.

## Decision
We implemented a robust socket management and binary frame proxying strategy in `src/server/ws-proxy.ts`:

1. **Pure Binary Buffer Piping**: Treat all incoming data chunks on both client and upstream sockets strictly as raw `Buffer` objects (`socket.write(chunk)`). Never convert WebSocket bytes to UTF-8 strings during frame forwarding.
2. **Synchronous Data Listener & Data Buffering**: Immediately and synchronously attach client `socket.on("data", onClientData)` at the start of `handleUpgradeRequest`. Buffer any client data arriving during async Kubernetes pod resolution into an in-memory array (`clientBuffer`), flushing buffered chunks to `upstreamSocket` as soon as the upstream TCP connection opens.
3. **HTTP Parser Detachment**: Explicitly detach Node's internal HTTP parser upon upgrade interception by clearing `socket.parser = null`, clearing `req.socket.parser = null`, and calling `socket.removeAllListeners("data")` and `socket.removeAllListeners("timeout")`.
4. **Upstream Host Header Normalization**: Rewrite the `Host` header sent to upstream pods to match target pod IP and container port (`${podIP}:${port}`), ensuring sandbox apps expecting exact `Host` header alignment (e.g. `ttyd`) accept the proxied WebSocket connection.

## Alternatives Considered

### Relying on `@fastify/http-proxy` for WebSockets
- **Pros**: Declarative Fastify plugin configuration.
- **Cons**: `@fastify/http-proxy` handles WebSocket upgrades via `ws` library wrappers that conflict with Fastify's encapsulated route prefixing, override custom OIDC auth header injection (`x-user-sub`), and create competing upgrade listeners on `app.server`.
- **Rejected**: Custom socket-level TCP proxying gives full control over authentication header injection and path rewriting.

### String-Encoding with Base64
- **Pros**: Avoids UTF-8 character conversion issues.
- **Cons**: Adds CPU overhead and breaks raw WebSocket TCP stream pass-through.
- **Rejected**: Unnecessary; raw `Buffer` piping requires zero encoding/decoding overhead.

## Consequences
- `ttyd` web terminal sandboxes, VNC desktop streaming, and custom binary WebSocket web apps operate with 100% data frame integrity.
- Client handshake data sent during pod resolution is preserved with zero frame loss.
- Node's HTTP parser no longer crashes sockets when binary WebSocket frames arrive.
- High performance raw TCP data piping without string conversion overhead.
