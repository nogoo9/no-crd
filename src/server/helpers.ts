import fs from "node:fs";
import path from "node:path";
import type { FastifyRequest } from "fastify";
import { config } from "~/config.js";

export function getBasePrefix(): string {
	const raw = config.server.baseUrl;
	return raw ? (raw.startsWith("/") ? "" : "/") + raw.replace(/\/$/, "") : "";
}

export function getRequestHostAndProto(request: FastifyRequest | any) {
	const host =
		(request.headers["x-forwarded-host"] as string) ||
		request.headers.host ||
		"localhost";
	let proto =
		(request.headers["x-forwarded-proto"] as string) ||
		request.protocol ||
		"http";
	if (proto === "ws") proto = "http";
	if (proto === "wss") proto = "https";
	return { host, proto };
}

export function getCorsHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		"Access-Control-Allow-Origin": config.cors.origin,
		"Access-Control-Allow-Methods": config.cors.methods,
		"Access-Control-Allow-Headers": config.cors.headers,
	};
	if (config.cors.credentials) {
		headers["Access-Control-Allow-Credentials"] = "true";
	}
	if (config.cors.exposedHeaders) {
		headers["Access-Control-Expose-Headers"] = config.cors.exposedHeaders;
	}
	if (config.cors.maxAge !== undefined) {
		headers["Access-Control-Max-Age"] = String(config.cors.maxAge);
	}
	return headers;
}

export const CORS_HEADERS = new Proxy({} as Record<string, string>, {
	get(_target, prop: string) {
		return getCorsHeaders()[prop];
	},
	ownKeys() {
		return Reflect.ownKeys(getCorsHeaders());
	},
	getOwnPropertyDescriptor(_target, prop) {
		return {
			enumerable: true,
			configurable: true,
			value: getCorsHeaders()[prop as string],
		};
	},
});

/** Sets all CORS response headers on a Fastify reply. */
export function setCorsHeaders(reply: {
	header(key: string, value: string): void;
}) {
	for (const [k, v] of Object.entries(CORS_HEADERS)) {
		reply.header(k, v);
	}
}

/** Extracts display name from CSS content (from a Name comment) or derives from id. */
export function themeDisplayName(id: string, cssContent?: string): string {
	let name = id
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
	if (cssContent) {
		const match = cssContent.match(/\/\*\s*Name:\s*([^*]+)\*\//i);
		if (match) name = match[1].trim();
	}
	return name;
}

/** Scans a directory for .css theme files, adding unseen themes to the list. */
export function scanThemeDir(
	dir: string,
	seenIds: Set<string>,
	themes: Array<{ id: string; name: string }>,
) {
	if (!fs.existsSync(dir)) return;
	for (const file of fs.readdirSync(dir)) {
		if (!file.endsWith(".css")) continue;
		const id = file.slice(0, -4);
		if (seenIds.has(id)) continue;
		seenIds.add(id);
		let cssContent: string | undefined;
		try {
			cssContent = fs.readFileSync(path.join(dir, file), "utf-8");
		} catch (_) {}
		themes.push({ id, name: themeDisplayName(id, cssContent) });
	}
}

/** Reads a CSS theme file from a directory with path traversal protection. */
export function readThemeCssFile(dir: string, id: string): string | null {
	const resolved = path.normalize(
		path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir),
	);
	const filePath = path.normalize(path.join(resolved, `${id}.css`));
	if (!filePath.startsWith(resolved)) return null;
	if (!fs.existsSync(filePath)) return null;
	return fs.readFileSync(filePath, "utf-8");
}

/**
 * Generates a UUID v7 compliant string.
 *
 * @returns A UUID v7 string representation.
 */
export function uuidv7(): string {
	const now = Date.now();
	const tsHex = now.toString(16).padStart(12, "0");
	const randA = Math.floor(Math.random() * 0x1000);
	const randAHex = randA.toString(16).padStart(3, "0");
	const varDigit = (0x8 | Math.floor(Math.random() * 4)).toString(16);
	let randB = varDigit;
	for (let i = 0; i < 15; i++) {
		randB += Math.floor(Math.random() * 16).toString(16);
	}
	const part1 = tsHex.substring(0, 8);
	const part2 = tsHex.substring(8, 12);
	const part3 = `7${randAHex}`;
	const part4 = randB.substring(0, 4);
	const part5 = randB.substring(4, 16);
	return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}
