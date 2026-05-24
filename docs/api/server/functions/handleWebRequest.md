[@nogoo9/no-crd](../../index.md) / [server](../index.md) / handleWebRequest

# Function: handleWebRequest()

> **handleWebRequest**(`req`, `serverInstance?`): `Promise`\<`Response`\>

Defined in: [src/server.ts:210](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/server.ts#L210)

Core runtime-agnostic web request handler. Processes SSE connections,
HTTP options/CORS preflights, custom diagnostics endpoints, and health probes.

## Parameters

### req

`Request`

The incoming standard Request object.

### serverInstance?

`any`

The platform-specific server instance (e.g. Bun Server), used to disable request idle timeouts.

## Returns

`Promise`\<`Response`\>

A standard Response object.
