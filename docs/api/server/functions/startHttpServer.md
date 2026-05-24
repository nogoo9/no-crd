[@nogoo9/no-crd](../../index.md) / [server](../index.md) / startHttpServer

# Function: startHttpServer()

> **startHttpServer**(): `Promise`\<`void`\>

Defined in: [src/server.ts:353](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/server.ts#L353)

Boots the HTTP/HTTPS server based on runtime detection (Bun, Deno, or Node.js).
Supports SSL certificates if `TLS_CERT` and `TLS_KEY` env vars are configured.

## Returns

`Promise`\<`void`\>
