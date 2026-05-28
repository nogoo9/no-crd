import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getLogger } from "@logtape/logtape";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import fastify, { type FastifyInstance } from "fastify";
import { config } from "~/config.js";
import { initK8sContext, type K8sContext } from "~/k8s/index.js";
import { createMcpServer } from "~/mcp/server.js";
import { registerUiApp } from "~/ui/index.js";
import { registerAuthHooks } from "./auth.js";
import { getBasePrefix, setCorsHeaders, uuidv7 } from "./helpers.js";
import { registerRoutes } from "./routes/index.js";
import { registerUpgradeHandler } from "./ws-proxy.js";

// Re-export CORS helpers for consumers
export {
	CORS_HEADERS,
	getBasePrefix,
	getCorsHeaders,
} from "./helpers.js";

const originalFetch = globalThis.fetch;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = __dirname.startsWith("/$bunfs/root")
	? dirname(process.execPath)
	: __filename.endsWith(".ts")
		? join(__dirname, "../../dist")
		: join(__dirname, "..");

const logger = getLogger(["nogoo9", "server"]);

let globalMcpServer: McpServer | null = null;
let globalTransport: WebStandardStreamableHTTPServerTransport | null = null;
let globalIsStateless = false;
let globalK8sContext: K8sContext | null = null;
export let globalApp: FastifyInstance | null = null;
let globalAppPort = 0;

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

const activeSessions = new Map<
	string,
	{
		server: McpServer;
		transport: WebStandardStreamableHTTPServerTransport;
	}
>();

/**
 * Retrieves the MCP Server and Streamable HTTP Transport instances.
 */
async function getMcpServerAndTransport(req: Request): Promise<{
	server: McpServer;
	transport: WebStandardStreamableHTTPServerTransport;
}> {
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

	if (globalTransport) {
		if (!globalMcpServer) {
			globalMcpServer = await createMcpServer(getK8sContext());
			registerUiApp(globalMcpServer, DIST_DIR);
			await globalMcpServer.connect(globalTransport);
		}
		return { server: globalMcpServer, transport: globalTransport };
	}

	const sessionId = req.headers.get("mcp-session-id");
	if (sessionId && activeSessions.has(sessionId)) {
		return activeSessions.get(sessionId)!;
	}

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
 * Resets the global MCP server cache and Fastify server, allowing dependency injection.
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

	if (globalApp) {
		try {
			await globalApp.close();
		} catch (_) {}
		globalApp = null;
		globalAppPort = 0;
	}
}

/**
 * Creates and configures a Fastify application instance.
 */
export async function createFastifyApp(options?: {
	cert?: string;
	key?: string;
	ca?: string;
}): Promise<any> {
	const serverOptions: any = {
		logger: false,
	};
	if (options?.cert && options?.key) {
		serverOptions.https = {
			cert: options.cert,
			key: options.key,
			ca: options.ca,
		};
	}
	const app = fastify(serverOptions);

	registerUpgradeHandler(app, { getK8sContext });

	if (app.server && !(app.server as any).closeIdleConnections) {
		(app.server as any).closeIdleConnections = () => {};
	}
	const basePrefix = getBasePrefix();

	// CORS and path traversal hook
	app.addHook("onRequest", (request, reply, done) => {
		if (request.method === "OPTIONS") {
			setCorsHeaders(reply);
			reply.status(204).send();
			return;
		}
		const url = request.raw.url || "";
		if (url.includes("/docs/") && (url.includes("%2e") || url.includes(".."))) {
			reply.status(403);
			reply.send("Forbidden");
			return;
		}
		done();
	});

	await app.register(
		async (api) => {
			const guards = registerAuthHooks(api, { getK8sContext });
			await registerRoutes(api, {
				guards,
				getK8sContext,
				getMcpServerAndTransport,
				distDir: DIST_DIR,
			});
		},
		{ prefix: basePrefix },
	);

	return app;
}

/**
 * Core runtime-agnostic web request handler.
 */
export async function handleWebRequest(
	req: Request,
	_serverInstance?: any,
): Promise<Response> {
	if (!globalApp) {
		globalApp = await createFastifyApp();
		await (globalApp as any).listen({ port: 0, host: "127.0.0.1" });
		const address = (globalApp as any).server.address();
		globalAppPort = typeof address === "string" ? 0 : address?.port || 0;
	}

	const urlObj = new URL(req.url);
	const destUrl = `http://127.0.0.1:${globalAppPort}${urlObj.pathname}${urlObj.search}`;

	const plainHeaders: Record<string, string> = {};
	req.headers.forEach((value, key) => {
		if (key.toLowerCase() !== "connection") {
			plainHeaders[key] = value;
		}
	});

	if (!plainHeaders["x-forwarded-host"] && urlObj.host) {
		plainHeaders["x-forwarded-host"] = urlObj.host;
	}
	if (!plainHeaders["x-forwarded-proto"] && urlObj.protocol) {
		plainHeaders["x-forwarded-proto"] = urlObj.protocol.replace(/:$/, "");
	}

	const resp = await originalFetch(destUrl, {
		method: req.method,
		headers: plainHeaders,
		body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
		duplex: req.body ? "half" : undefined,
	} as any);

	return resp;
}

/**
 * Boots the HTTP/HTTPS server using Fastify.
 */
export async function startHttpServer(
	customK8sContext?: K8sContext,
): Promise<void> {
	const PORT = config.server.port;
	const HOST = config.server.host;

	if (config.auth.enabled) {
		logger.warn(
			"Authentication engine is enabled. Note: MCP Authentication and Routing Proxy are experimental features and likely to change in the next version.",
		);
	}

	if (customK8sContext) {
		globalK8sContext = customK8sContext;
	}
	globalIsStateless = config.server.stateless;

	const TLS_CERT_PATH = config.tls.cert;
	const TLS_KEY_PATH = config.tls.key;
	const TLS_CA_PATH = config.tls.ca;
	let certData: string | undefined;
	let keyData: string | undefined;
	let caData: string | undefined;

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
		certData = (readFileSync as any)(TLS_CERT_PATH, "utf8");
		keyData = (readFileSync as any)(TLS_KEY_PATH, "utf8");

		if (TLS_CA_PATH) {
			if (!existsSync(TLS_CA_PATH)) {
				throw new Error(`TLS CA certificate file not found: ${TLS_CA_PATH}`);
			}
			caData = (readFileSync as any)(TLS_CA_PATH, "utf8");
		}
	}

	globalApp = await createFastifyApp({
		cert: certData,
		key: keyData,
		ca: caData,
	});

	await (globalApp as any).listen({ port: PORT, host: HOST });

	const protocol = certData && keyData ? "https" : "http";
	logger.info("nogoo9-mcp listening on {protocol}://{host}:{port}", {
		protocol,
		host: HOST,
		port: PORT,
	});
	logger.info("  MCP: {protocol}://{host}:{port}/mcp", {
		protocol,
		host: HOST,
		port: PORT,
	});

	process.on("SIGTERM", async () => {
		if (globalApp) {
			await globalApp.close();
		}
		process.exit(0);
	});
}
