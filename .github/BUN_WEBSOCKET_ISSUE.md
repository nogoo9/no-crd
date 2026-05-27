# GitHub Issue: Bun Node.js Compatibility: socket.write() drops data on upgraded HTTP connections (oven-sh/bun#28871)

## Title
`[Node.js Compatibility]` socket.write() drops data / fails asynchronously on upgraded HTTP connections

## Description

In an application that implements custom WebSocket / HTTP upgrade proxying (such as dynamic forwarding to backend service pods), we override the `upgrade` event of a standard `http.Server` (e.g. Fastify's server instance). Under Bun (up to version 1.3.11/latest), the socket returned in the `upgrade` event fails to write data correctly.

Specifically:
1. Doing `socket.write(handshakeHeaders)` synchronously inside the `upgrade` listener seems to succeed, but no data reaches the client on the wire.
2. Doing `socket.write()` asynchronously (e.g. inside a `net.connect` callback to target upstream) is completely ignored or dropped.
3. The client eventually times out or receives a `400 Bad Request` from Bun's native HTTP parser because the native parser fails to realize the connection has been upgraded and tries to parse post-handshake client payloads as new HTTP requests.

This issue relates to the open PR: [fix socket.write() dropping data #28871](https://github.com/oven-sh/bun/pull/28871) which attempts to set `socket[kEnableStreaming](true)` inside Bun's internal `_http_server.ts` before emitting `"upgrade"`.

---

## Detailed Technical Analysis & Findings

We performed a deep-dive investigation into how the upgrade socket behaves under Bun to find a potential userland workaround. Here are the findings:

### 1. The `Symbol(kEnableStreaming)` Call
We confirmed that the `Socket` wrapper under Bun has an internal prototype method `Symbol(kEnableStreaming)`:
```javascript
[kEnableStreaming](enable) {
    let handle = this[kHandle];
    if (handle)
      if (enable)
        handle.ondata = this.#onData.bind(this), handle.ondrain = this.#onDrain.bind(this);
      else
        handle.ondata = @undefined, handle.ondrain = @undefined;
}
```
If we retrieve this symbol dynamically from the prototype chain and invoke it synchronously:
```javascript
const proto = Object.getPrototypeOf(socket);
const kEnableStreamingSymbol = Object.getOwnPropertySymbols(proto).find(
  s => s.toString() === "Symbol(kEnableStreaming)"
);
if (kEnableStreamingSymbol) {
  socket[kEnableStreamingSymbol](true);
}
```
Then synchronous calls to `socket.write()` succeed and data reaches the client.

### 2. The Asynchronous Write Issue & `socket.uncork()`
If the write is done asynchronously (e.g., inside a `setTimeout` or a `net.connect` callback), the write still drops even after calling `kEnableStreaming(true)`.

We discovered that Bun keeps the socket corked when the `upgrade` event is emitted. By calling `socket.uncork()` and `socket.resume()` synchronously at the very beginning of the `upgrade` handler:
```typescript
socket[kEnableStreamingSymbol](true);
socket.uncork();
socket.resume();
```
We were able to get asynchronous writes to flush, and the client successfully received the `101 Switching Protocols` handshake.

### 3. The Native HTTP Parser Race Condition
Despite the client receiving the `101 Switching Protocols` handshake, the connection is still immediately closed when the client writes post-upgrade payload data (such as `Hello from Client!`). 

The client receives:
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade

<Client writes payload data>

HTTP/1.1 400 Bad Request
Connection: close
```

**Reason:** Bun's native HTTP parser (written in C++/Zig) resides below the JavaScript `Socket` wrapper. Because `kEnableStreaming(true)` was not executed by Bun's internal `_http_server.ts` *before* the handler was entered, the native C++ parser remains attached. It does not monitor the JS-level socket streaming flag dynamically, so it intercepts the client's post-upgrade payload, parses it as a new HTTP request, determines it is invalid HTTP, writes `400 Bad Request`, and kills the connection.

This proves that **there is no reliable userland monkey patch** inside the `upgrade` listener. The native server must enable streaming *prior* to emitting the `upgrade` event so that the native parser detaches, which is exactly what [oven-sh/bun#28871](https://github.com/oven-sh/bun/pull/28871) implements.

---

## Minimal Reproduction

```typescript
import http from "node:http";
import net from "node:net";

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("ok");
});

server.on("upgrade", (req, socket, head) => {
  console.log("Upgrade event triggered");

  // Attempting to resolve the drop via private symbol extraction:
  const proto = Object.getPrototypeOf(socket);
  const kEnableStreamingSymbol = Object.getOwnPropertySymbols(proto).find(
    s => s.toString() === "Symbol(kEnableStreaming)"
  );
  if (kEnableStreamingSymbol) {
    (socket as any)[kEnableStreamingSymbol](true);
  }

  // Workaround: uncork and resume synchronously
  socket.uncork();
  socket.resume();

  // Under Bun, this asynchronous write succeeds but subsequent client data
  // triggers 400 Bad Request:
  setTimeout(() => {
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n");
  }, 100);
});

server.listen(0, "localhost", () => {
  const port = (server.address() as any).port;
  console.log(`Server listening on port ${port}`);

  const clientSocket = net.connect(port, "localhost", () => {
    clientSocket.write(
      "GET / HTTP/1.1\r\n" +
      "Host: localhost\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n\r\n"
    );
  });

  clientSocket.on("data", (chunk) => {
    console.log("Client received:", chunk.toString());
    if (chunk.toString().includes("101 Switching Protocols")) {
      // Writing payload triggers the native HTTP 400 Bad Request
      clientSocket.write("Hello from Client!");
    }
  });
});
```

**Expected behavior (Node.js):**
Connection upgrades, client writes payload data, and the connection remains open.

**Actual behavior under Bun:**
The client receives `HTTP/1.1 101 Switching Protocols`, writes payload data, and then immediately receives `HTTP/1.1 400 Bad Request` and gets disconnected.
