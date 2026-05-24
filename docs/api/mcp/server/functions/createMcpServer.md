[@nogoo9/no-crd](../../../index.md) / [mcp/server](../index.md) / createMcpServer

# Function: createMcpServer()

> **createMcpServer**(`k8sContext`): `Promise`\<`McpServer`\>

Defined in: [src/mcp/server.ts:24](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/mcp/server.ts#L24)

Creates and configures a fresh instance of the Model Context Protocol (MCP) server.
Instantiates the SDK server, runs RBAC diagnostics on Kubernetes, and conditionally
registers pod tools, template resources, namespace tools, and workspace spawner tools.

## Parameters

### k8sContext

[`K8sContext`](../../../k8s/interfaces/K8sContext.md)

Active K8sContext containing API clients.

## Returns

`Promise`\<`McpServer`\>

Instantiated and registered McpServer instance.
