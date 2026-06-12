# Isomorphic Cross-Runtime Design

`@nogoo9/no-crd` is designed from the ground up to be fully isomorphic, running seamlessly under **Node.js**, **Bun**, and **Deno** without runtime-specific crashes. This guide outlines how the client and server architecture abstracts differences in TLS certificate bindings and socket upgrades.

---

## ☸️ The Kubernetes Certificate Compatibility Problem

The standard `@kubernetes/client-node` library leverages Node.js's native `https.Agent` constructor to bind custom client certificates (cert/key) and verify server CAs.

Because **Bun** and **Deno** ignore standard Node `https.Agent` objects when executing web-standard `fetch` calls, requests to TLS-secured Kubernetes APIs will drop credentials, resulting in connection errors or `401 Unauthorized` responses.

### Our Solution: `BunDenoHttpLibrary`

In [src/k8s/client.ts](file:///home/eterna2/github/nogoo9-no-crd/src/k8s/client.ts), we inject a custom isomorphic HTTP request driver that wraps all outgoing Kubernetes API calls:

```typescript
export class BunDenoHttpLibrary {
  private fallback = new IsomorphicFetchHttpLibrary();
  constructor(private kc: k8s.KubeConfig) {}

  send(request: any) {
    const isBun = typeof Bun !== "undefined";
    const isDeno = typeof (globalThis as any).Deno !== "undefined";

    // Fall back to Node Fetch if running on standard Node.js
    if (!isBun && !isDeno) {
      return this.fallback.send(request);
    }

    const url = request.getUrl();
    const method = request.getHttpMethod().toString();
    const body = request.getBody();
    const headers = request.getHeaders();
    const signal = request.getSignal();

    // Extract TLS credentials from the Node Agent configured by @kubernetes/client-node
    const agent = request.getAgent();
    const agentOpts = agent?.options || {};
    const cert = agentOpts.cert ? agentOpts.cert.toString("utf8") : undefined;
    const key = agentOpts.key ? agentOpts.key.toString("utf8") : undefined;
    const ca = agentOpts.ca ? agentOpts.ca.toString("utf8") : undefined;

    if (isBun) {
      // Propagate certs directly into Bun's native fetch TLS options
      const tls: any = {};
      if (cert) tls.cert = cert;
      if (key) tls.key = key;
      if (ca) tls.ca = ca;
      if (agentOpts.rejectUnauthorized === false) {
        tls.rejectUnauthorized = false;
      }

      return globalThis.fetch(url, { method, body, headers, signal, tls });
    } else {
      // Deno: Instantiate a Deno.HttpClient configured with CA Certs
      const clientOpts: any = {};
      if (cert) clientOpts.cert = cert;
      if (key) clientOpts.key = key;
      if (ca) clientOpts.caCerts = [ca];

      let denoClient = null;
      const options: any = { method, body, headers, signal };
      if (Object.keys(clientOpts).length > 0) {
        denoClient = Deno.createHttpClient(clientOpts);
        options.client = denoClient;
      }

      return globalThis.fetch(url, options).finally(() => {
        if (denoClient) denoClient.close();
      });
    }
  }
}
```

This ensures that the client connection is fully secured without requiring insecure flags (like `--unsafely-ignore-certificate-errors`) inside your Kubernetes deployments.

---

## 🔌 Bun WebSocket Upgrade Limitations

When running the MCP server or proxy under **Bun** (versions before the fix in [oven-sh/bun#28871](https://github.com/oven-sh/bun/pull/28871) is fully integrated), WebSocket connection upgrades through Fastify or `node:http` drop data or close immediately.

### Root Cause
Bun's native HTTP parser doesn't switch the socket into raw streaming mode in userland quickly enough when the `upgrade` event handler executes asynchronously. The native C++ HTTP parser keeps expecting subsequent payloads to be HTTP requests and rejects them.

### Mitigation in the Server
The WebSocket proxy in [src/server/ws-proxy.ts](file:///home/eterna2/github/nogoo9-no-crd/src/server/ws-proxy.ts) implements checks for runtime compatibility. If you need dynamic web terminal or GUI connection proxying to your workspaces in production, you **must** run the server using **Node.js**:
```bash
nocrd9 --runtime node --transport http --port 3000
```
or via the container/node direct commands:
```bash
node dist/server-entry.js
```
