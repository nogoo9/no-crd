[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / errorResult

# Function: errorResult()

> **errorResult**\<`T`\>(`kc`, `err`, `structuredContent?`): [`CustomToolResult`](../interfaces/CustomToolResult.md)\<`T`\>

Defined in: [src/k8s/errors.ts:62](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L62)

Formats a thrown error into a standard MCP tool execution error response.
Detects network timeout or unreachable API servers, mapping them to clear troubleshooting messages.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

## Parameters

### kc

`KubeConfig`

The active KubeConfig configuration context.

### err

`unknown`

The thrown error object.

### structuredContent?

`T`

## Returns

[`CustomToolResult`](../interfaces/CustomToolResult.md)\<`T`\>

MCP formatted error content and flag.
