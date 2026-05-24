import { Buffer } from "node:buffer";

// biome-ignore lint/suspicious/noExplicitAny: polyfill needs to assign global property to globalThis
if (typeof (globalThis as any).global === "undefined") {
	(globalThis as any).global = globalThis;
}

// biome-ignore lint/suspicious/noExplicitAny: polyfill needs to assign Buffer property to globalThis
if (typeof (globalThis as any).Buffer === "undefined") {
	(globalThis as any).Buffer = Buffer;
}
