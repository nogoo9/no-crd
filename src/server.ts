import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getLogger } from "@logtape/logtape";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { initK8sContext, type K8sContext } from "~/k8s/index.js";
import { createMcpServer } from "~/mcp/server.js";
import { loadUiHtml, registerUiApp } from "~/ui/index.js";

const PORT = Number(process.env.PORT) || 3000;

const corsOrigin =
	process.env.CORS_ALLOWED_ORIGIN || process.env.CORS_ORIGIN || "*";
const corsMethods =
	process.env.CORS_ALLOWED_METHODS ||
	process.env.CORS_METHODS ||
	"GET, POST, OPTIONS";
const corsHeaders =
	process.env.CORS_ALLOWED_HEADERS ||
	process.env.CORS_HEADERS ||
	"Content-Type, Authorization, mcp-protocol-version, mcp-session-id";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": corsOrigin,
	"Access-Control-Allow-Methods": corsMethods,
	"Access-Control-Allow-Headers": corsHeaders,
	"Access-Control-Expose-Headers": "mcp-session-id",
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = __filename.endsWith(".ts")
	? join(__dirname, "../dist")
	: __dirname;

const logger = getLogger(["nogoo9", "server"]);

let globalMcpServer: McpServer | null = null;
let globalTransport: WebStandardStreamableHTTPServerTransport | null = null;
let globalIsStateless = false;
let globalK8sContext: K8sContext | null = null;

/**
 * Retrieves the global Kubernetes context. If it hasn't been initialized yet,
 * initializes and caches it.
 *
 * @returns The active K8sContext.
 */
function getK8sContext(): K8sContext {
	if (!globalK8sContext) {
		globalK8sContext = initK8sContext();
	}
	return globalK8sContext;
}

/**
 * Generates a UUID v7 compliant string.
 * UUID v7 encodes the current Unix timestamp in milliseconds in the first 48 bits,
 * followed by random data, preserving chronological sortability.
 *
 * @returns A UUID v7 string representation.
 */
function uuidv7(): string {
	const now = Date.now();
	// 48-bit timestamp
	const tsHex = now.toString(16).padStart(12, "0");
	// rand_a (12 bits random)
	const randA = Math.floor(Math.random() * 0x1000);
	const randAHex = randA.toString(16).padStart(3, "0");
	// rand_b top digit must have variant 10xx (one of 8, 9, a, b)
	const varDigit = (0x8 | Math.floor(Math.random() * 4)).toString(16);
	// Remaining 15 hex digits for rand_b
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

/**
 * Retrieves the MCP Server and Streamable HTTP Transport instances.
 * In stateless mode, a fresh server and transport are generated for each call.
 * In stateful mode, instances are cached and reused.
 *
 * @returns Object containing the MCP server and WebStandard HTTP transport.
 */
const activeSessions = new Map<
	string,
	{
		server: McpServer;
		transport: WebStandardStreamableHTTPServerTransport;
	}
>();

/**
 * Retrieves the MCP Server and Streamable HTTP Transport instances.
 * In stateless mode, a fresh server and transport are generated for each call.
 * In stateful mode, instances are cached and reused.
 *
 * @param req The incoming standard Request object.
 * @returns Object containing the MCP server and WebStandard HTTP transport.
 */
async function getMcpServerAndTransport(req: Request): Promise<{
	server: McpServer;
	transport: WebStandardStreamableHTTPServerTransport;
}> {
	// In stateless mode, we must not reuse the transport or server across requests.
	// We create a fresh server and transport for each request.
	if (globalIsStateless) {
		logger.debug(
			"Stateless mode enabled. Creating a new MCP Server and Transport instance.",
		);
		const server = await createMcpServer(getK8sContext());
		registerUiApp(server, DIST_DIR);
		const transport = new WebStandardStreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true,
		});
		await server.connect(transport);
		return { server, transport };
	}

	// If a custom/mock transport was injected (e.g. in tests), bypass session map
	if (globalTransport) {
		if (!globalMcpServer) {
			globalMcpServer = await createMcpServer(getK8sContext());
			registerUiApp(globalMcpServer, DIST_DIR);
			await globalMcpServer.connect(globalTransport);
		}
		return { server: globalMcpServer, transport: globalTransport };
	}

	// Resolve the session corresponding to the request session ID
	const sessionId = req.headers.get("mcp-session-id");
	if (sessionId && activeSessions.has(sessionId)) {
		return activeSessions.get(sessionId)!;
	}

	// No session ID found or session is not active. Create a fresh session transport and server.
	logger.info("Creating new stateful server and session transport.");
	const server = await createMcpServer(getK8sContext());
	registerUiApp(server, DIST_DIR);

	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: () => uuidv7(),
		enableJsonResponse: true,
		onsessioninitialized: (sessId) => {
			logger.info("Session initialized: {sessionId}", { sessionId: sessId });
			activeSessions.set(sessId, { server, transport });
		},
		onsessionclosed: (sessId) => {
			logger.info("Session closed: {sessionId}", { sessionId: sessId });
			activeSessions.delete(sessId);
			void server.close().catch(() => {});
		},
	});

	await server.connect(transport);
	return { server, transport };
}

/**
 * Resets the global MCP server cache, allowing dependency injection
 * or switching between stateful and stateless test suites.
 *
 * @param customTransport An optional mock or custom HTTP server transport.
 * @param isStateless Whether the server should operate in stateless mode.
 * @param customK8sContext An optional custom Kubernetes context.
 */
export async function resetMcpServer(
	customTransport?: WebStandardStreamableHTTPServerTransport,
	isStateless = false,
	customK8sContext?: K8sContext,
): Promise<void> {
	logger.info("Resetting MCP Server state. stateless={isStateless}", {
		isStateless,
	});
	for (const session of activeSessions.values()) {
		try {
			await session.server.close();
		} catch (_) {}
	}
	activeSessions.clear();

	if (globalMcpServer) {
		try {
			await globalMcpServer.close();
		} catch (_) {}
	}
	globalMcpServer = null;
	globalTransport = customTransport ?? null;
	globalIsStateless = isStateless;
	globalK8sContext = customK8sContext ?? null;
}

/**
 * Core runtime-agnostic web request handler. Processes SSE connections,
 * HTTP options/CORS preflights, custom diagnostics endpoints, and health probes.
 *
 * @param req The incoming standard Request object.
 * @param serverInstance The platform-specific server instance (e.g. Bun Server), used to disable request idle timeouts.
 * @returns A standard Response object.
 */
export async function handleWebRequest(
	req: Request,
	serverInstance?: any,
): Promise<Response> {
	if (req.method === "OPTIONS")
		return new Response(null, { status: 204, headers: CORS_HEADERS });

	const { pathname } = new URL(req.url);
	logger.debug("Request: {method} {pathname} - Accept: {accept}", {
		method: req.method,
		pathname,
		accept: req.headers.get("accept"),
	});

	if (pathname === "/healthz" || pathname === "/mcp/healthz")
		return Response.json({ status: "ok" });

	if (pathname === "/" || pathname === "/ui" || pathname === "/ui/") {
		try {
			const html = loadUiHtml(DIST_DIR);
			return new Response(html, {
				headers: {
					"Content-Type": "text/html; charset=utf-8",
					...CORS_HEADERS,
				},
			});
		} catch (err) {
			return new Response(err instanceof Error ? err.message : String(err), {
				status: 500,
				headers: CORS_HEADERS,
			});
		}
	}

	if (pathname === "/permissions" || pathname === "/mcp/permissions") {
		try {
			const { DEFAULT_NAMESPACE, MODE, evaluatePermissions } = await import(
				"~/k8s/index.js"
			);
			const report = await evaluatePermissions(
				getK8sContext(),
				DEFAULT_NAMESPACE,
				MODE,
			);
			const response = Response.json(report);
			for (const [k, v] of Object.entries(CORS_HEADERS)) {
				response.headers.set(k, v);
			}
			return response;
		} catch (err) {
			const response = Response.json(
				{ error: err instanceof Error ? err.message : String(err) },
				{ status: 500 },
			);
			for (const [k, v] of Object.entries(CORS_HEADERS)) {
				response.headers.set(k, v);
			}
			return response;
		}
	}

	if (pathname === "/mcp" || pathname === "/mcp/mcp" || pathname === "/mcp/") {
		// Disable idle timeout for Bun SSE connection if serverInstance is available
		if (serverInstance && typeof serverInstance.timeout === "function") {
			serverInstance.timeout(req, 0);
		}

		const { transport } = await getMcpServerAndTransport(req);
		const res = await transport.handleRequest(req);
		logger.debug("Responding to /mcp - Status: {status}", {
			status: res.status,
		});

		// Mutate headers directly on the response to maintain clean streaming
		for (const [k, v] of Object.entries(CORS_HEADERS)) {
			res.headers.set(k, v);
		}
		res.headers.set("X-Accel-Buffering", "no");

		for (const [k, v] of (res.headers as any).entries()) {
			logger.debug("Header: {key}: {value}", { key: k, value: v });
		}

		// Wrap text/event-stream body to send an initial keep-alive comment.
		// This forces intermediate buffering proxies (like Traefik) to flush headers immediately.
		const contentType = res.headers.get("content-type");
		if (
			res.status === 200 &&
			contentType &&
			contentType.includes("text/event-stream") &&
			res.body
		) {
			const originalBody = res.body;
			const encoder = new TextEncoder();
			let activeReader: ReturnType<typeof originalBody.getReader> | null = null;
			const stream = new ReadableStream({
				async start(controller) {
					// Send initial comment to flush connection through proxies
					controller.enqueue(encoder.encode(": keep-alive\n\n"));

					const reader = originalBody.getReader();
					activeReader = reader;
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							controller.enqueue(value);
						}
						controller.close();
					} catch (err) {
						controller.error(err);
					}
				},
				cancel(reason) {
					if (activeReader) {
						activeReader.cancel(reason).catch(() => {});
					} else {
						try {
							originalBody.cancel(reason).catch(() => {});
						} catch (_) {}
					}
				},
			});

			return new Response(stream, {
				status: res.status,
				statusText: res.statusText,
				headers: res.headers,
			});
		}

		return res;
	}

	return new Response("Not found", { status: 404 });
}

/**
 * Boots the HTTP/HTTPS server based on runtime detection (Bun, Deno, or Node.js).
 * Supports SSL certificates if `TLS_CERT` and `TLS_KEY` env vars are configured.
 */
export async function startHttpServer(): Promise<void> {
	globalIsStateless = process.env.STATELESS === "true";
	const isBun = typeof Bun !== "undefined";
	const isDeno = typeof (globalThis as any).Deno !== "undefined";

	const TLS_CERT_PATH = process.env.TLS_CERT;
	const TLS_KEY_PATH = process.env.TLS_KEY;
	let certData: string | undefined;
	let keyData: string | undefined;

	if (TLS_CERT_PATH || TLS_KEY_PATH) {
		if (!TLS_CERT_PATH || !TLS_KEY_PATH) {
			throw new Error(
				"Both TLS_CERT and TLS_KEY environment variables must be set to enable HTTPS.",
			);
		}
		const { readFileSync, existsSync } = await import("node:fs");
		if (!existsSync(TLS_CERT_PATH)) {
			throw new Error(`TLS certificate file not found: ${TLS_CERT_PATH}`);
		}
		if (!existsSync(TLS_KEY_PATH)) {
			throw new Error(`TLS private key file not found: ${TLS_KEY_PATH}`);
		}
		certData = readFileSync(TLS_CERT_PATH, "utf8");
		keyData = readFileSync(TLS_KEY_PATH, "utf8");
	}

	const protocol = certData && keyData ? "https" : "http";

	if (isBun) {
		const serveOptions: any = {
			port: PORT,
			async fetch(req: Request, server: any) {
				return handleWebRequest(req, server);
			},
		};
		if (certData && keyData) {
			serveOptions.cert = certData;
			serveOptions.key = keyData;
		}
		const httpServer = Bun.serve(serveOptions);
		logger.info("nogoo9-mcp (Bun) listening on {protocol}://localhost:{port}", {
			protocol,
			port: httpServer.port,
		});
		logger.info("  MCP: {protocol}://localhost:{port}/mcp", {
			protocol,
			port: httpServer.port,
		});

		process.on("SIGTERM", () => {
			httpServer.stop();
			process.exit(0);
		});
	} else if (isDeno) {
		// Deno runtime
		const DenoGlobal = (globalThis as any).Deno;
		const serveOptions: any = {
			port: PORT,
			onListen({ hostname, port }: { hostname: string; port: number }) {
				logger.info(
					"nogoo9-mcp (Deno) listening on {protocol}://{hostname}:{port}",
					{ protocol, hostname, port },
				);
				logger.info("  MCP: {protocol}://{hostname}:{port}/mcp", {
					protocol,
					hostname,
					port,
				});
			},
		};
		if (certData && keyData) {
			serveOptions.cert = certData;
			serveOptions.key = keyData;
		}
		const server = DenoGlobal.serve(serveOptions, async (req: Request) => {
			return handleWebRequest(req);
		});

		DenoGlobal.addSignalListener("SIGTERM", () => {
			server.shutdown();
			DenoGlobal.exit(0);
		});
	} else {
		// Node.js runtime
		const { getRequestListener } = await import("@hono/node-server");
		const http = await import("node:http");
		const https = await import("node:https");

		const requestListener = getRequestListener(
			async (webRequest) => {
				return handleWebRequest(webRequest);
			},
			{ overrideGlobalObjects: false },
		);

		let server: any;
		if (certData && keyData) {
			server = https.createServer(
				{
					cert: certData,
					key: keyData,
				},
				requestListener,
			);
		} else {
			server = http.createServer(requestListener);
		}

		server.listen(PORT, () => {
			logger.info(
				"nogoo9-mcp (Node.js) listening on {protocol}://localhost:{port}",
				{
					protocol,
					port: PORT,
				},
			);
			logger.info("  MCP: {protocol}://localhost:{port}/mcp", {
				protocol,
				port: PORT,
			});
		});

		process.on("SIGTERM", () => {
			server.close();
			process.exit(0);
		});
	}
}
