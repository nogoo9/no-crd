import fs from "node:fs";
import net from "node:net";
import path, { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyHttpProxy from "@fastify/http-proxy";
import fastifyStatic from "@fastify/static";
import { getLogger } from "@logtape/logtape";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import fastify, {
	type FastifyInstance,
	type FastifyReply,
	type FastifyRequest,
} from "fastify";
import {
	createSessionCookie,
	DEFAULT_NAMESPACE,
	extractTokenFromCookie,
	extractUserIdentity,
	getSessionKey,
	hasRequiredRole,
	hasRequiredScope,
	initK8sContext,
	type K8sContext,
	MODE,
	parseWorkspaceApis,
	requestContextStore,
	resolveNamespace,
	verifySessionCookie,
	verifyToken,
} from "~/k8s/index.js";
import { createMcpServer } from "~/mcp/server.js";
import { loadUiHtml, registerUiApp } from "~/ui/index.js";
import { config } from "./config.js";

const originalFetch = globalThis.fetch;

export function getBasePrefix(): string {
	const raw = config.server.baseUrl;
	return raw ? (raw.startsWith("/") ? "" : "/") + raw.replace(/\/$/, "") : "";
}

function getRequestHostAndProto(request: FastifyRequest) {
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
function setCorsHeaders(reply: { header(key: string, value: string): void }) {
	for (const [k, v] of Object.entries(CORS_HEADERS)) {
		reply.header(k, v);
	}
}

/** Extracts display name from CSS content (from a Name comment) or derives from id. */
function themeDisplayName(id: string, cssContent?: string): string {
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
function scanThemeDir(
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
function readThemeCssFile(dir: string, id: string): string | null {
	const resolved = path.normalize(
		path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir),
	);
	const filePath = path.normalize(path.join(resolved, `${id}.css`));
	if (!filePath.startsWith(resolved)) return null;
	if (!fs.existsSync(filePath)) return null;
	return fs.readFileSync(filePath, "utf-8");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = __dirname.startsWith("/$bunfs/root")
	? dirname(process.execPath)
	: __filename.endsWith(".ts")
		? join(__dirname, "../dist")
		: __dirname;

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

/**
 * Generates a UUID v7 compliant string.
 *
 * @returns A UUID v7 string representation.
 */
function uuidv7(): string {
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

	async function handleUpgradeRequest(req: any, socket: any, head: any) {
		const url = req.url || "";
		const qIndex = url.indexOf("?");
		const pathname = qIndex !== -1 ? url.substring(0, qIndex) : url;
		const query = qIndex !== -1 ? url.substring(qIndex) : "";

		// Only handle websocket upgrades on workspace routes
		const basePrefix = getBasePrefix();
		let requestPath = pathname;
		if (basePrefix && requestPath.startsWith(basePrefix)) {
			requestPath = requestPath.substring(basePrefix.length);
		}

		// Workspace routes are of the form: /route/:workspaceId/...
		const match = requestPath.match(/^\/route\/([a-zA-Z0-9_-]+)(.*)$/);
		if (!match) {
			return;
		}

		const workspaceId = match[1];
		const subpath = match[2] || "/";

		logger.info(
			"Handling WebSocket upgrade request for workspace {workspaceId} path {subpath}",
			{ workspaceId, subpath },
		);

		// 1. Authentication Check
		let userSub = "anonymous";
		if (config.auth.enabled) {
			let token: string | null = null;
			const authHeader = req.headers.authorization;
			if (authHeader?.toLowerCase().startsWith("bearer ")) {
				token = authHeader.substring(7);
			} else {
				try {
					const urlObj = new URL(url, "http://localhost");
					token = urlObj.searchParams.get("token");
				} catch (_) {}
				if (!token) {
					token =
						extractTokenFromCookie(req.headers.cookie, "nocr_token") || null;
				}
			}

			if (!token) {
				logger.warn("WebSocket upgrade failed: Missing token");
				socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
				socket.destroy();
				return;
			}

			try {
				let expectedAudience: string | undefined;
				try {
					const host =
						req.headers["x-forwarded-host"] || req.headers.host || "localhost";
					let proto = req.headers["x-forwarded-proto"] || "http";
					if (proto === "ws") proto = "http";
					if (proto === "wss") proto = "https";
					expectedAudience = `${proto}://${host}${basePrefix}`;
				} catch (_) {}
				const jwtPayload = await verifyToken(token, expectedAudience);

				const requiredScope = config.auth.requiredReadScope;
				if (
					requiredScope &&
					!hasRequiredScope(
						jwtPayload,
						requiredScope,
						config.auth.scopeJsonPath,
					)
				) {
					logger.warn(
						"WebSocket upgrade failed: Missing scope {requiredScope}",
						{ requiredScope },
					);
					socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
					socket.destroy();
					return;
				}

				const requiredRole = config.auth.requiredReadRole;
				if (
					requiredRole &&
					!hasRequiredRole(jwtPayload, requiredRole, config.auth.rolesJsonPath)
				) {
					logger.warn("WebSocket upgrade failed: Missing role {requiredRole}", {
						requiredRole,
					});
					socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
					socket.destroy();
					return;
				}

				try {
					userSub = extractUserIdentity(jwtPayload, config.auth.subJsonPath);
				} catch (_err) {
					logger.warn(
						"WebSocket upgrade failed: Could not extract user identity",
					);
					socket.write(
						"HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n",
					);
					socket.destroy();
					return;
				}
			} catch (err) {
				logger.warn(
					"WebSocket upgrade failed: Token verification failed: {error}",
					{
						error: err instanceof Error ? err.message : String(err),
					},
				);
				socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
				socket.destroy();
				return;
			}
		}

		// 2. Resolve target pod & port
		const ns = resolveNamespace(undefined, MODE, DEFAULT_NAMESPACE);
		const k8sCtx = getK8sContext();
		let podIP: string;
		let port: string;
		let upstreamPath = subpath;

		try {
			const res = await k8sCtx.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector: `nogoo9/type=workspace,nogoo9/workspace-id=${workspaceId}`,
			});

			if (res.items.length === 0) {
				logger.warn(
					"WebSocket upgrade failed: Workspace {workspaceId} not found",
					{ workspaceId },
				);
				socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
				socket.destroy();
				return;
			}

			const pod = res.items[0];
			const podSub = pod.metadata?.labels?.["nogoo9/user-sub"];

			if (config.auth.enabled && podSub !== userSub) {
				logger.warn("WebSocket upgrade failed: Forbidden owner mismatch");
				socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
				socket.destroy();
				return;
			}

			if (pod.status?.phase !== "Running") {
				logger.warn("WebSocket upgrade failed: Pod is in phase {phase}", {
					phase: pod.status?.phase,
				});
				socket.write(
					"HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n",
				);
				socket.destroy();
				return;
			}

			const ip = pod.status?.podIP;
			if (!ip) {
				logger.warn("WebSocket upgrade failed: Pod IP not assigned");
				socket.write(
					"HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n",
				);
				socket.destroy();
				return;
			}
			podIP = ip;

			const targetPortAnnotation =
				pod.metadata?.annotations?.["nogoo9/workspace-port"];
			port = String(
				targetPortAnnotation || config.k8s.defaultWorkspacePort || "3000",
			);

			// Dynamic API routing path match for WebSockets
			const apis = parseWorkspaceApis(pod.metadata?.annotations);
			const sortedApis = [...apis].sort(
				(a, b) => b.path.length - a.path.length,
			);
			for (const api of sortedApis) {
				const apiPathNoTrailingSlash = api.path.replace(/\/$/, "");
				if (apiPathNoTrailingSlash !== "") {
					const pathMatches =
						subpath === apiPathNoTrailingSlash ||
						subpath.startsWith(`${apiPathNoTrailingSlash}/`);
					if (pathMatches) {
						port = String(api.port);
						upstreamPath =
							subpath.substring(apiPathNoTrailingSlash.length) || "/";
						break;
					}
				}
			}

			// Check if pod uses SUBFOLDER prefix (e.g. for KasmVNC / Obsidian GUI workspaces).
			// If so, we must preserve the prefix path '/route/:workspaceId' so that relative asset links
			// and WebSockets resolve properly instead of hitting the container's default root server block.
			// By prepending it here, when the Fastify proxy strips it once, the subpath prefix remains intact.
			const envs = pod.spec?.containers?.[0]?.env || [];
			const hasSubfolder = envs.some(
				(e: any) => e.name === "SUBFOLDER" && e.value,
			);
			if (hasSubfolder && upstreamPath === subpath) {
				upstreamPath = `/route/${workspaceId}${subpath}`;
			}
		} catch (err) {
			logger.error("Failed to list pods during WebSocket upgrade: {error}", {
				error: err,
			});
			socket.write(
				"HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n",
			);
			socket.destroy();
			return;
		}

		logger.info(
			"Proxying WebSocket to upstream {podIP}:{port} path {upstreamPath} (socket constructor: {ctor})",
			{
				podIP,
				port,
				upstreamPath,
				ctor: socket?.constructor?.name || "unknown",
			},
		);

		if (typeof socket.setNoDelay === "function") {
			socket.setNoDelay(true);
		}

		const upstreamSocket = net.connect(Number(port), podIP, () => {
			if (typeof upstreamSocket.setNoDelay === "function") {
				upstreamSocket.setNoDelay(true);
			}

			const fullUpstreamPath = upstreamPath + query;
			let rawRequest = `${req.method} ${fullUpstreamPath} HTTP/${req.httpVersion}\r\n`;
			for (const [key, value] of Object.entries(req.headers)) {
				if (Array.isArray(value)) {
					for (const val of value) {
						rawRequest += `${key}: ${val}\r\n`;
					}
				} else if (value !== undefined) {
					rawRequest += `${key}: ${value}\r\n`;
				}
			}
			rawRequest += "\r\n";

			logger.info(
				"WebSocket proxy: writing request to upstream:\n{rawRequest}",
				{ rawRequest },
			);
			upstreamSocket.write(rawRequest);

			if (head && head.length > 0) {
				logger.info(
					"WebSocket proxy: writing head of length {length} to upstream",
					{ length: head.length },
				);
				upstreamSocket.write(head);
			}

			let handshakeComplete = false;
			socket.on("data", (chunk: any) => {
				logger.info("WebSocket proxy: client sent {length} bytes", {
					length: chunk.length,
				});
				upstreamSocket.write(chunk);
			});
			upstreamSocket.on("data", (chunk: any) => {
				logger.info(
					"WebSocket proxy: upstream sent {length} bytes: {preview}",
					{
						length: chunk.length,
						preview: chunk
							.slice(0, 100)
							.toString()
							.trim()
							.replace(/\r\n/g, "\\r\\n"),
					},
				);
				if (!handshakeComplete) {
					handshakeComplete = true;
					socket.write(chunk.toString("utf8"));
					if (typeof socket.resume === "function") {
						logger.info(
							"WebSocket proxy: handshake complete, resuming client socket",
						);
						socket.resume();
					} else {
						logger.info(
							"WebSocket proxy: client socket does not support resume",
						);
					}
				} else {
					socket.write(chunk);
				}
			});
		});

		upstreamSocket.on("error", (err: any) => {
			logger.error("WebSocket upstream socket error: {error}", { error: err });
			socket.destroy();
		});

		socket.on("error", (err: any) => {
			logger.debug("WebSocket client socket error: {error}", { error: err });
			upstreamSocket.destroy();
		});

		upstreamSocket.on("close", () => {
			logger.info("WebSocket proxy: upstream socket closed");
			socket.destroy();
		});

		socket.on("close", () => {
			logger.info("WebSocket proxy: client socket closed");
			upstreamSocket.destroy();
		});
	}

	// Note: We run the production container using the Node.js runtime instead of Bun because of a
	// known regression in Bun's Node compatibility layer where socket.write() drops data or hangs on
	// upgraded connections (see https://github.com/oven-sh/bun/pull/28871).
	// Under buggy versions of Bun, attempting to manually monkey patch this by calling
	// `socket[Symbol(kEnableStreaming)](true)` inside the 'upgrade' handler is ineffective because the
	// native C++ HTTP parser has already committed to the connection and will try to parse subsequent
	// client data as a new HTTP request (resulting in '400 Bad Request'). Therefore, we stick to the
	// Node.js runtime for the production container.
	const originalEmit = app.server.emit;
	app.server.emit = function (this: any, event: string, ...args: any[]) {
		if (event === "upgrade") {
			const req = args[0];
			const socket = args[1];
			const head = args[2];
			const url = req.url || "";
			const basePrefix = getBasePrefix();
			let requestPath = url;
			const qIndex = requestPath.indexOf("?");
			if (qIndex !== -1) {
				requestPath = requestPath.substring(0, qIndex);
			}
			if (basePrefix && requestPath.startsWith(basePrefix)) {
				requestPath = requestPath.substring(basePrefix.length);
			}
			if (requestPath.match(/^\/route\/([a-zA-Z0-9_-]+)/)) {
				handleUpgradeRequest(req, socket, head);
				return true;
			}
		}
		return originalEmit.apply(this, [event, ...args] as any);
	};

	// Node.js http.Server does not emit the 'upgrade' event unless at least one listener is registered.
	app.server.on("upgrade", () => {});

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
			// Global hooks for token parsing
			api.addHook("preHandler", async (request, reply) => {
				if (!config.auth.enabled) {
					return;
				}

				let token: string | null = null;
				const authHeader = request.headers.authorization;
				if (authHeader?.toLowerCase().startsWith("bearer ")) {
					token = authHeader.substring(7);
				} else {
					try {
						const urlObj = new URL(
							request.url,
							`http://${request.headers.host || "localhost"}`,
						);
						token = urlObj.searchParams.get("token");
					} catch (_) {}
					if (!token) {
						token =
							extractTokenFromCookie(request.headers.cookie, "nocr_token") ||
							null;
					}
				}

				let jwtPayload: any;
				let authError: Error | null = null;

				// Check nocr_sess session cookie before JWT verification
				const sessKey = getSessionKey();
				if (!token && sessKey) {
					const sessCookie = extractTokenFromCookie(
						request.headers.cookie,
						"nocr_sess",
					);
					if (sessCookie) {
						const sessPayload = verifySessionCookie(sessCookie, sessKey);
						if (sessPayload) {
							jwtPayload = {
								sub: sessPayload.sub,
								realm_access: { roles: sessPayload.roles },
							};
							(request as any).sessionAuthenticated = true;
							logger.debug("Authenticated via session cookie for user {sub}", {
								sub: sessPayload.sub,
							});
						}
					}
				}

				if (!jwtPayload && token) {
					try {
						let expectedAudience: string | undefined;
						try {
							const { host, proto } = getRequestHostAndProto(request);
							expectedAudience = `${proto}://${host}${basePrefix}`;
						} catch (_) {}
						jwtPayload = await verifyToken(token, expectedAudience);

						// Mint root-scoped nocr_sess on successful JWT verification
						if (jwtPayload && sessKey) {
							const sessCookie = createSessionCookie(
								jwtPayload,
								sessKey,
								config.auth.sessionTtlSeconds,
								config.auth.subJsonPath,
								config.auth.rolesJsonPath,
							);
							reply.header(
								"Set-Cookie",
								`nocr_sess=${sessCookie}; Path=/; SameSite=Lax; HttpOnly; Max-Age=${config.auth.sessionTtlSeconds}`,
							);
						}
					} catch (err) {
						authError = err instanceof Error ? err : new Error(String(err));
						logger.warn("Token verification failed: {error}", {
							error: authError.message,
						});
					}
				}

				(request as any).jwtPayload = jwtPayload;
				(request as any).token = token;
				(request as any).authError = authError;
			});

			// Global hook for AsyncLocalStorage context run
			api.addHook("preHandler", (request, _reply, done) => {
				requestContextStore.run(
					{ jwtPayload: (request as any).jwtPayload },
					() => {
						done();
					},
				);
			});

			// Authentication guards
			const requireAuth = async (
				request: FastifyRequest,
				reply: FastifyReply,
			) => {
				if (!config.auth.enabled) {
					return;
				}

				const jwtPayload = (request as any).jwtPayload;
				const authError = (request as any).authError;

				if (!jwtPayload) {
					const { host, proto } = getRequestHostAndProto(request);
					const metadataUrl = `${proto}://${host}${basePrefix}/.well-known/oauth-protected-resource`;

					reply.status(401);
					setCorsHeaders(reply);
					reply.header(
						"WWW-Authenticate",
						`Bearer resource_metadata="${metadataUrl}"`,
					);
					reply.header(
						"Link",
						`<${metadataUrl}>; rel="oauth-protected-resource"`,
					);

					const msg = authError
						? `Unauthorized: ${authError.message}`
						: "Unauthorized: Valid JWT token required";
					return reply.send(msg);
				}
			};

			const requireMcpAuth = async (
				request: FastifyRequest,
				reply: FastifyReply,
			) => {
				await requireAuth(request, reply);
				if (reply.sent) return;

				if (config.auth.enabled) {
					const jwtPayload = (request as any).jwtPayload;
					const requiredScope = config.auth.requiredReadScope;
					if (
						requiredScope &&
						!hasRequiredScope(
							jwtPayload,
							requiredScope,
							config.auth.scopeJsonPath,
						)
					) {
						reply.status(403);
						setCorsHeaders(reply);
						return reply.send(
							`Forbidden: Missing required scope: ${requiredScope}`,
						);
					}

					const requiredRole = config.auth.requiredReadRole;
					if (
						requiredRole &&
						!hasRequiredRole(
							jwtPayload,
							requiredRole,
							config.auth.rolesJsonPath,
						)
					) {
						reply.status(403);
						setCorsHeaders(reply);
						return reply.send(
							`Forbidden: Missing required role: ${requiredRole}`,
						);
					}
				}
			};

			const requireRouteAuth = async (
				request: FastifyRequest,
				reply: FastifyReply,
			) => {
				await requireAuth(request, reply);
				if (reply.sent) return;

				if (config.auth.enabled) {
					const jwtPayload = (request as any).jwtPayload;
					const isRead =
						request.method === "GET" ||
						request.method === "HEAD" ||
						request.method === "OPTIONS";
					const requiredScope = isRead
						? config.auth.requiredReadScope
						: config.auth.requiredWriteScope;

					if (
						requiredScope &&
						!hasRequiredScope(
							jwtPayload,
							requiredScope,
							config.auth.scopeJsonPath,
						)
					) {
						reply.status(403);
						setCorsHeaders(reply);
						return reply.send(
							`Forbidden: Missing required scope: ${requiredScope}`,
						);
					}

					const requiredRole = isRead
						? config.auth.requiredReadRole
						: config.auth.requiredWriteRole;

					if (
						requiredRole &&
						!hasRequiredRole(
							jwtPayload,
							requiredRole,
							config.auth.rolesJsonPath,
						)
					) {
						reply.status(403);
						setCorsHeaders(reply);
						return reply.send(
							`Forbidden: Missing required role: ${requiredRole}`,
						);
					}
				}
			};

			const proxyPreHandler = async (
				request: FastifyRequest,
				reply: FastifyReply,
			) => {
				await requireRouteAuth(request, reply);
				if (reply.sent) return;

				const { workspaceId } = request.params as { workspaceId: string };
				if (!workspaceId) {
					reply.status(400);
					setCorsHeaders(reply);
					return reply.send("Workspace ID is required");
				}

				let userSub = "anonymous";
				if (config.auth.enabled) {
					try {
						userSub = extractUserIdentity(
							(request as any).jwtPayload,
							config.auth.subJsonPath,
						);
					} catch (err) {
						reply.status(401);
						setCorsHeaders(reply);
						return reply.send(
							`Unauthorized: ${err instanceof Error ? err.message : String(err)}`,
						);
					}
				}

				const ns = resolveNamespace(undefined, MODE, DEFAULT_NAMESPACE);
				const k8sCtx = getK8sContext();
				try {
					const res = await k8sCtx.coreApi.listNamespacedPod({
						namespace: ns,
						labelSelector: `nogoo9/type=workspace,nogoo9/workspace-id=${workspaceId}`,
					});

					if (res.items.length === 0) {
						reply.status(404);
						setCorsHeaders(reply);
						return reply.send(`Workspace "${workspaceId}" not found`);
					}

					const pod = res.items[0];
					const podSub = pod.metadata?.labels?.["nogoo9/user-sub"];

					if (config.auth.enabled && podSub !== userSub) {
						reply.status(403);
						setCorsHeaders(reply);
						return reply.send("Forbidden: You do not own this workspace");
					}

					if (pod.status?.phase !== "Running") {
						reply.status(503);
						setCorsHeaders(reply);
						return reply.send(
							`Workspace is not running (status: ${pod.status?.phase || "Unknown"})`,
						);
					}

					const podIP = pod.status?.podIP;
					if (!podIP) {
						reply.status(503);
						setCorsHeaders(reply);
						return reply.send("Workspace IP address not assigned yet");
					}

					const targetPortAnnotation =
						pod.metadata?.annotations?.["nogoo9/workspace-port"];
					let port =
						targetPortAnnotation || config.k8s.defaultWorkspacePort || "3000";

					// Dynamic API routing and path prefix stripping rewrite
					const apis = parseWorkspaceApis(pod.metadata?.annotations);
					const routePathIndex = request.url.indexOf(`/route/${workspaceId}`);
					if (routePathIndex !== -1) {
						const routePrefix = request.url.substring(
							0,
							routePathIndex + `/route/${workspaceId}`.length,
						);
						const subpath = request.url.substring(routePrefix.length) || "/";
						const qIndex = subpath.indexOf("?");
						const pathOnly =
							qIndex !== -1 ? subpath.substring(0, qIndex) : subpath;
						const queryOnly = qIndex !== -1 ? subpath.substring(qIndex) : "";

						// Sort by path length descending (most specific match wins)
						const sortedApis = [...apis].sort(
							(a, b) => b.path.length - a.path.length,
						);
						for (const api of sortedApis) {
							const apiPathNoTrailingSlash = api.path.replace(/\/$/, "");
							if (apiPathNoTrailingSlash !== "") {
								const pathMatches =
									pathOnly === apiPathNoTrailingSlash ||
									pathOnly.startsWith(`${apiPathNoTrailingSlash}/`);

								// Check method matches
								const allowedMethods = api.method
									? api.method.split(",").map((m) => m.trim().toUpperCase())
									: [];
								const methodMatches =
									allowedMethods.length === 0 ||
									allowedMethods.includes("*") ||
									allowedMethods.includes(request.method);

								if (pathMatches && methodMatches) {
									port = api.port;
									// Rewrite URL to strip the API path prefix
									const cleanRest =
										pathOnly.substring(apiPathNoTrailingSlash.length) || "/";
									const newUrl = routePrefix + cleanRest + queryOnly;
									if (request.raw) {
										request.raw.url = newUrl;
									}
									logger.debug(
										"Matched API {apiName} (port {apiPort}) for workspace {workspaceId}. Rewrote request URL to {newUrl}",
										{ apiName: api.name, apiPort: port, workspaceId, newUrl },
									);
									break;
								}
							}
						}
					}

					// Check if pod uses SUBFOLDER prefix (e.g. for KasmVNC / Obsidian GUI workspaces).
					// If so, we must preserve the prefix path '/route/:workspaceId' so that relative asset links
					// and WebSockets resolve properly instead of hitting the container's default root server block.
					// By prepending it here, when the Fastify proxy strips it once, the subpath prefix remains intact.
					const envs = pod.spec?.containers?.[0]?.env || [];
					const hasSubfolder = envs.some(
						(e: any) => e.name === "SUBFOLDER" && e.value,
					);
					if (hasSubfolder && request.raw) {
						request.raw.url = `/route/${workspaceId}${request.raw.url}`;
					}

					const upstreamUrl = `http://${podIP}:${port}`;
					(request as any).tmpUpstream = upstreamUrl;
					(request as any).workspaceId = workspaceId;

					logger.info(
						"Resolved workspace {workspaceId} upstream to {upstreamUrl}",
						{ workspaceId, upstreamUrl },
					);
				} catch (err) {
					logger.error("Failed to resolve workspace {workspaceId}: {error}", {
						workspaceId,
						error: err,
					});
					reply.status(500);
					setCorsHeaders(reply);
					return reply.send(
						`Internal Server Error: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			};

			// 2. Public OAuth metadata endpoint
			api.get(
				"/.well-known/oauth-protected-resource",
				async (request, reply) => {
					const { host, proto } = getRequestHostAndProto(request);
					const resourceUrl = `${proto}://${host}${basePrefix}`;
					const authIssuer = config.auth.issuer;
					const scopesSupported = new Set<string>();
					if (config.auth.requiredReadScope) {
						scopesSupported.add(config.auth.requiredReadScope);
					}
					if (config.auth.requiredWriteScope) {
						scopesSupported.add(config.auth.requiredWriteScope);
					}
					if (scopesSupported.size === 0) {
						scopesSupported.add("mcp");
					}

					setCorsHeaders(reply);
					return {
						resource: resourceUrl,
						authorization_servers: authIssuer ? [authIssuer] : [],
						scopes_supported: Array.from(scopesSupported),
						bearer_methods_supported: ["header"],
					};
				},
			);

			// 3. Health check endpoints
			const healthHandler = async (
				_request: FastifyRequest,
				reply: FastifyReply,
			) => {
				setCorsHeaders(reply);
				return { status: "ok" };
			};
			api.get("/healthz", healthHandler);
			api.get("/mcp/healthz", healthHandler);

			// 4. Logout endpoint
			const logoutHandler = async (
				_request: FastifyRequest,
				reply: FastifyReply,
			) => {
				setCorsHeaders(reply);

				try {
					const { DEFAULT_NAMESPACE, MODE, resolveNamespace } = await import(
						"~/k8s/index.js"
					);
					const ns = resolveNamespace(undefined, MODE, DEFAULT_NAMESPACE);
					const k8sCtx = getK8sContext();
					const res = await k8sCtx.coreApi.listNamespacedPod({
						namespace: ns,
						labelSelector: "nogoo9/type=workspace",
					});
					const workspaceIds = res.items
						.map((pod) => pod.metadata?.labels?.["nogoo9/workspace-id"])
						.filter(Boolean);

					for (const id of workspaceIds) {
						reply.header(
							"Set-Cookie",
							`nocr_token=; Path=/route/${id}/; SameSite=Lax; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
						);
					}
				} catch (err) {
					logger.error(
						"Failed to list workspaces for cookie clearing: {error}",
						{
							error: err,
						},
					);
				}

				reply.header(
					"Set-Cookie",
					`nocr_token=; Path=/; SameSite=Lax; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
				);
				reply.header(
					"Set-Cookie",
					`nocr_sess=; Path=/; SameSite=Lax; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
				);

				return reply.send("Logged out");
			};
			api.get("/logout", logoutHandler);
			api.get("/mcp/logout", logoutHandler);
			api.post("/logout", logoutHandler);
			api.post("/mcp/logout", logoutHandler);

			// 5. Themes endpoints
			api.get("/api/themes", async (_request, reply) => {
				setCorsHeaders(reply);
				try {
					const themes: Array<{ id: string; name: string }> = [
						{ id: "default", name: "Claude" },
					];

					// Source 1: ConfigMap (highest priority)
					const themesConfigMap = config.ui.themesConfigMap;
					if (themesConfigMap) {
						try {
							const k8sCtx = getK8sContext();
							const ns = config.k8s.namespace;
							const cm = await k8sCtx.coreApi.readNamespacedConfigMap({
								name: themesConfigMap,
								namespace: ns,
							});
							const data = cm.data || {};
							for (const [file, content] of Object.entries(data)) {
								if (file.endsWith(".css")) {
									const id = file.slice(0, -4);
									themes.push({ id, name: themeDisplayName(id, content) });
								}
							}
							return themes;
						} catch (_) {}
					}

					const seenIds = new Set(themes.map((t) => t.id));

					// Source 2: Custom themes directory
					const themesDir = config.ui.themesDir;
					const resolvedDir = path.normalize(
						path.isAbsolute(themesDir)
							? themesDir
							: path.join(process.cwd(), themesDir),
					);
					scanThemeDir(resolvedDir, seenIds, themes);

					// Source 3: Built-in themes (lowest priority)
					const builtinDir = config.ui.builtinThemesDir;
					if (builtinDir) {
						scanThemeDir(builtinDir, seenIds, themes);
					}

					return themes;
				} catch (err) {
					reply.status(500);
					return { error: err instanceof Error ? err.message : String(err) };
				}
			});

			api.get("/api/themes/:themeId", async (request, reply) => {
				setCorsHeaders(reply);

				const { themeId } = request.params as { themeId: string };
				const id = themeId.endsWith(".css") ? themeId.slice(0, -4) : themeId;

				if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
					reply.status(400);
					return reply.send("Invalid theme ID");
				}

				if (id === "default") {
					reply.type("text/css; charset=utf-8");
					return reply.send("");
				}

				try {
					// Source 1: ConfigMap
					const themesConfigMap = config.ui.themesConfigMap;
					if (themesConfigMap) {
						try {
							const k8sCtx = getK8sContext();
							const ns = config.k8s.namespace;
							const cm = await k8sCtx.coreApi.readNamespacedConfigMap({
								name: themesConfigMap,
								namespace: ns,
							});
							const content = cm.data?.[`${id}.css`];
							if (content !== undefined) {
								reply.type("text/css; charset=utf-8");
								return reply.send(content);
							}
						} catch (_) {}
					}

					// Source 2: Custom themes directory
					const cssContent = readThemeCssFile(config.ui.themesDir, id);
					if (cssContent !== null) {
						reply.type("text/css; charset=utf-8");
						return reply.send(cssContent);
					}

					// Source 3: Built-in themes
					const builtinDir = config.ui.builtinThemesDir;
					if (builtinDir) {
						const builtinContent = readThemeCssFile(builtinDir, id);
						if (builtinContent !== null) {
							reply.type("text/css; charset=utf-8");
							return reply.send(builtinContent);
						}
					}

					reply.status(404);
					return reply.send("Theme not found");
				} catch (err) {
					reply.status(500);
					return reply.send(err instanceof Error ? err.message : String(err));
				}
			});

			// 6. Permissions endpoint
			const permissionsHandler = async (
				_request: FastifyRequest,
				reply: FastifyReply,
			) => {
				setCorsHeaders(reply);
				try {
					const { DEFAULT_NAMESPACE, MODE, evaluatePermissions } = await import(
						"~/k8s/index.js"
					);
					const report = await evaluatePermissions(
						getK8sContext(),
						DEFAULT_NAMESPACE,
						MODE,
					);
					return report;
				} catch (err) {
					reply.status(500);
					return { error: err instanceof Error ? err.message : String(err) };
				}
			};
			api.get(
				"/permissions",
				{ preHandler: requireMcpAuth },
				permissionsHandler,
			);
			api.get(
				"/mcp/permissions",
				{ preHandler: requireMcpAuth },
				permissionsHandler,
			);

			// 7. MCP event-stream and tool call handlers
			const mcpHandler = async (
				request: FastifyRequest,
				reply: FastifyReply,
			) => {
				const host =
					request.headers.host || `${request.hostname}:${request.port}`;
				const protocol = request.protocol || "http";
				const fullUrl = `${protocol}://${host}${request.url}`;

				const standardHeaders = new Headers();
				for (const [key, value] of Object.entries(request.headers)) {
					if (Array.isArray(value)) {
						for (const val of value) {
							standardHeaders.append(key, val);
						}
					} else if (value !== undefined) {
						standardHeaders.set(key, value);
					}
				}

				let body: any;
				if (request.method !== "GET" && request.method !== "HEAD") {
					if (request.body !== undefined) {
						if (
							typeof request.body === "string" ||
							Buffer.isBuffer(request.body) ||
							request.body instanceof Uint8Array
						) {
							body = request.body;
						} else {
							body = JSON.stringify(request.body);
						}
					}
				}

				const standardReq = new Request(fullUrl, {
					method: request.method,
					headers: standardHeaders,
					body: body,
				});

				const { transport } = await getMcpServerAndTransport(standardReq);
				const res = await transport.handleRequest(standardReq);

				reply.status(res.status);
				res.headers.forEach((value, key) => {
					reply.header(key, value);
				});

				setCorsHeaders(reply);
				reply.header("X-Accel-Buffering", "no");

				if (res.body) {
					const contentType = res.headers.get("content-type");
					if (
						res.status === 200 &&
						contentType?.includes("text/event-stream")
					) {
						reply.raw.writeHead(res.status, reply.getHeaders() as any);
						reply.raw.write(": keep-alive\n\n");
						const reader = res.body.getReader();
						try {
							while (true) {
								const { done, value } = await reader.read();
								if (done) break;
								reply.raw.write(value);
							}
						} catch (err) {
							logger.error("Error reading stream: {error}", { error: err });
						} finally {
							reader.releaseLock();
						}
						reply.raw.end();
					} else {
						const arrayBuffer = await res.arrayBuffer();
						// nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
						reply.send(Buffer.from(arrayBuffer));
					}
				} else {
					reply.send();
				}
			};

			api.route({
				method: ["GET", "POST"],
				url: "/mcp",
				preHandler: requireMcpAuth,
				handler: mcpHandler,
			});
			api.route({
				method: ["GET", "POST"],
				url: "/mcp/mcp",
				preHandler: requireMcpAuth,
				handler: mcpHandler,
			});
			api.route({
				method: ["GET", "POST"],
				url: "/mcp/",
				preHandler: requireMcpAuth,
				handler: mcpHandler,
			});

			// 8. Static Web UI templates and assets
			const uiDir = join(DIST_DIR, "ui");
			await api.register(fastifyStatic, {
				root: uiDir,
				prefix: "/ui/",
				name: "ui",
				index: false,
				decorateReply: false,
				setHeaders: (res: any) => {
					for (const [k, v] of Object.entries(CORS_HEADERS)) {
						res.setHeader(k, v);
					}
				},
			} as any);

			const uiHtmlHandler = async (
				_request: FastifyRequest,
				reply: FastifyReply,
			) => {
				try {
					const html = loadUiHtml(DIST_DIR, basePrefix);
					reply.type("text/html; charset=utf-8");
					setCorsHeaders(reply);
					return reply.send(html);
				} catch (err) {
					reply.status(500);
					setCorsHeaders(reply);
					return reply.send(err instanceof Error ? err.message : String(err));
				}
			};

			api.get("/", uiHtmlHandler);
			api.get("/ui", uiHtmlHandler);
			api.get("/ui/", uiHtmlHandler);

			// 9. Static documentation site
			const docsEnvDir = config.ui.docsDir;
			let docsDir = "";
			if (docsEnvDir) {
				docsDir = path.normalize(
					path.isAbsolute(docsEnvDir)
						? docsEnvDir
						: path.join(process.cwd(), docsEnvDir),
				);
			} else {
				const localDocs = path.normalize(
					path.join(process.cwd(), "docs/.vitepress/dist"),
				);
				const binaryDocs = path.normalize(path.join(DIST_DIR, "docs"));
				if (fs.existsSync(binaryDocs)) {
					docsDir = binaryDocs;
				} else if (fs.existsSync(localDocs)) {
					docsDir = localDocs;
				} else {
					docsDir = path.normalize(path.join(process.cwd(), "docs"));
				}
			}

			await api.register(fastifyStatic, {
				root: docsDir,
				prefix: "/docs/",
				name: "docs",
				extensions: ["html"],
				index: "index.html",
				decorateReply: false,
				setHeaders: (res: any) => {
					for (const [k, v] of Object.entries(CORS_HEADERS)) {
						res.setHeader(k, v);
					}
				},
			} as any);

			api.get("/docs", async (_request, reply) => {
				return reply.redirect(`${basePrefix}/docs/`);
			});

			// 10. Workspace Proxy Routing
			await api.register(
				fastifyHttpProxy as any,
				{
					upstream: "http://localhost:3000",
					prefix: "/route/:workspaceId",
					websocket: false,
					undici: false,
					replyOptions: {
						getUpstream: (request: any) => {
							return (request as any).tmpUpstream || "http://localhost:3000";
						},
						onResponse: (request: any, reply: any, res: any) => {
							setCorsHeaders(reply);
							const token = (request as any).token;
							const workspaceId = (request as any).workspaceId;
							if (token && workspaceId) {
								reply.header(
									"Set-Cookie",
									`nocr_token=${token}; Path=/route/${workspaceId}/; SameSite=Lax; HttpOnly; Max-Age=86400`,
								);
							}
							reply.send(res.stream);
						},
					},
					preHandler: proxyPreHandler,
				} as any,
			);
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
