[@nogoo9/no-crd](../../index.md) / [server](../index.md) / handleWebRequest

# Function: handleWebRequest()

> **handleWebRequest**(`req`, `serverInstance?`): `Promise`\<`Response`\>

Defined in: [src/server.ts:210](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/server.ts#L210)

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
