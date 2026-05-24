[@nogoo9/no-crd](../../index.md) / [server](../index.md) / resetMcpServer

# Function: resetMcpServer()

> **resetMcpServer**(`customTransport?`, `isStateless?`, `customK8sContext?`): `Promise`\<`void`\>

Defined in: [src/server.ts:176](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/server.ts#L176)

Resets the global MCP server cache, allowing dependency injection
or switching between stateful and stateless test suites.

## Parameters

### customTransport?

`WebStandardStreamableHTTPServerTransport`

An optional mock or custom HTTP server transport.

### isStateless?

`boolean` = `false`

Whether the server should operate in stateless mode.

### customK8sContext?

[`K8sContext`](../../k8s/interfaces/K8sContext.md)

An optional custom Kubernetes context.

## Returns

`Promise`\<`void`\>
