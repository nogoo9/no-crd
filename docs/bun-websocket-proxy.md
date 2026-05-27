# Design Proposal: Native Bun WebSocket Proxy Implementation

This document outlines a proposal for a separate, native WebSocket routing proxy implementation designed specifically for the **Bun** runtime. This avoids the limitations and regressions found in Bun's Node.js `node:http` compatibility layer (such as [oven-sh/bun#28871](https://github.com/oven-sh/bun/pull/28871)).

---

## 1. Problem Statement
The current proxy implementation relies on intercepting the `upgrade` event on the underlying `node:http` server instance of Fastify. While this works natively under Node.js, under Bun it fails because:
*   Bun's HTTP compatibility layer doesn't transition the socket into raw streaming mode in time when the event listener runs asynchronously.
*   Workarounds using private symbols (`Symbol(kEnableStreaming)`) and synchronous uncork/resume calls are fragile and subject to breaking changes.

---

## 2. Proposed Architecture for Bun
Instead of running a Fastify/Node.js server with manual raw-socket forwarding under Bun, we can conditionally boot a native **`Bun.serve`**-based proxy if Bun is detected at runtime.

### High-level Flow
```
Client (Browser) 
  ──[ WebSocket ]──> Bun.serve (Native WebSockets)
                       │
                       ├──[ Auth & Owner Match ] (Same logic)
                       │
                       └──[ TCP (Bun.connect) ]──> Kubernetes Pod (ttyd / VNC)
```

### Key Components

#### 1. Native WebSocket Upgrading
We use the web-standard `Response` / `Bun.serve` upgrade interface in the request handler:
```typescript
if (request.headers.get("Upgrade") === "websocket") {
  const upgraded = server.upgrade(request, {
    data: {
      workspaceId,
      subpath,
      token,
    },
  });
  if (upgraded) return; // Handled by Bun's native WebSocket engine
}
```

#### 2. Bidirectional Bridging using `Bun.connect`
Once upgraded, we handle the native WebSocket events (`open`, `message`, `close`). Inside the `open` event, we establish a raw TCP connection to the upstream pod using Bun's highly optimized `Bun.connect` API:

```typescript
const bunServer = Bun.serve({
  port: PORT,
  websocket: {
    async open(ws) {
      const { workspaceId, subpath } = ws.data;
      
      // 1. Resolve Pod IP and Port (Same k8s query logic)
      const { podIP, port } = await resolvePodRoute(workspaceId, subpath);
      
      // 2. Open raw TCP tunnel to the upstream container
      const upstreamSocket = await Bun.connect({
        hostname: podIP,
        port: Number(port),
        socket: {
          data(socket, chunk) {
            // Forward data from upstream TCP to client WebSocket
            ws.send(chunk);
          },
          close(socket) {
            ws.close();
          },
          error(socket, error) {
            ws.close();
          }
        }
      });
      
      // Store socket on ws state
      ws.data.upstreamSocket = upstreamSocket;
      
      // Write the initial HTTP WebSocket handshake payload to the upstream container
      const handshakeHeaders = buildUpstreamHandshake(ws.data);
      upstreamSocket.write(handshakeHeaders);
    },
    
    message(ws, message) {
      const socket = ws.data.upstreamSocket;
      if (socket) {
        socket.write(message);
      }
    },
    
    close(ws) {
      const socket = ws.data.upstreamSocket;
      if (socket) {
        socket.end();
      }
    }
  }
});
```

---

## 3. Advantages
1.  **Zero Compatibility Layer Reliance**: Completely avoids Node.js `node:http` and raw `Socket` emulation in Bun.
2.  **Higher Performance**: Uses Bun's native C++ WebSocket implementation, which has significantly lower overhead than JavaScript-based socket forwarding.
3.  **Clean Separation**: The Node.js code path remains untouched (relying on the stable Fastify setup), while Bun runs on a lightweight, native, and robust path.

---

## 4. Implementation Steps
1.  **Refactor Server Bootstrapping**: Detect `typeof Bun !== "undefined"` in `src/server.ts`.
2.  **Separate App Factory**:
    *   If running on Node.js/Deno: Boot the current Fastify application with `app.server.on("upgrade")`.
    *   If running on Bun: Boot a custom `Bun.serve` wrapper which routes standard HTTP requests to our Hono/Fastify handlers and intercept upgrades via the `websocket` object.
