import net from "node:net";
import { getLogger } from "@logtape/logtape";
import { ANNOTATION_KEYS, config } from "~/config.js";
import {
	DEFAULT_NAMESPACE,
	extractTokenFromCookie,
	extractUserIdentity,
	hasRequiredRole,
	hasRequiredScope,
	MODE,
	parseWorkspaceApis,
	resolveNamespace,
	verifyToken,
} from "~/k8s/index.js";
import { getBasePrefix } from "./helpers.js";

const logger = getLogger(["nogoo9", "ws-proxy"]);

export function registerUpgradeHandler(
	app: any,
	deps: {
		getK8sContext: () => any;
	},
): void {
	const basePrefix = getBasePrefix();

	async function handleUpgradeRequest(req: any, socket: any, head: any) {
		const url = req.url || "";
		const qIndex = url.indexOf("?");
		const pathname = qIndex !== -1 ? url.substring(0, qIndex) : url;
		const query = qIndex !== -1 ? url.substring(qIndex) : "";

		// Only handle websocket upgrades on workspace routes
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
		const k8sCtx = deps.getK8sContext();
		let podIP: string;
		let port: string;
		let upstreamPath = subpath;

		try {
			const res = await k8sCtx.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector: `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${workspaceId}`,
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
			const podSub = pod.metadata?.labels?.[ANNOTATION_KEYS.USER_SUB];

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
				pod.metadata?.annotations?.[ANNOTATION_KEYS.WORKSPACE_PORT];
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

	const originalEmit = app.server.emit;
	app.server.emit = function (this: any, event: string, ...args: any[]) {
		if (event === "upgrade") {
			const req = args[0];
			const socket = args[1];
			const head = args[2];
			const url = req.url || "";
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

	app.server.on("upgrade", () => {});
}
