[@nogoo9/no-crd](../../index.md) / [server](../index.md) / startHttpServer

# Function: startHttpServer()

> **startHttpServer**(): `Promise`\<`void`\>

Defined in: [src/server.ts:353](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/server.ts#L353)

Boots the HTTP/HTTPS server based on runtime detection (Bun, Deno, or Node.js).
Supports SSL certificates if `TLS_CERT` and `TLS_KEY` env vars are configured.

## Returns

`Promise`\<`void`\>
