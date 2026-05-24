import { Buffer } from "node:buffer";

if (typeof (globalThis as any).global === "undefined") {
	(globalThis as any).global = globalThis;
}

if (typeof (globalThis as any).Buffer === "undefined") {
	(globalThis as any).Buffer = Buffer;
}
