import { Buffer } from "node:buffer";

if (typeof (globalThis as any).global === "undefined") {
	(globalThis as any).global = globalThis;
}

if (typeof (globalThis as any).Buffer === "undefined") {
	(globalThis as any).Buffer = Buffer;
}

// Support proxy from environment variables in Node.js runtime
const isNode =
	typeof process !== "undefined" &&
	process.versions?.node &&
	!process.versions?.bun;

if (isNode) {
	const proxyUrl =
		process.env.HTTPS_PROXY ||
		process.env.HTTP_PROXY ||
		process.env.https_proxy ||
		process.env.http_proxy;

	if (proxyUrl) {
		import("undici")
			.then(({ setGlobalDispatcher, ProxyAgent }) => {
				setGlobalDispatcher(new ProxyAgent(proxyUrl));
			})
			.catch(() => {});
	}
}
