import { getLogger } from "@logtape/logtape";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ANNOTATION_KEYS, config } from "~/config/index.js";
import {
	createSessionCookie,
	DEFAULT_NAMESPACE,
	extractTokenFromCookie,
	extractUserIdentity,
	getSessionKey,
	hasRequiredRole,
	hasRequiredScope,
	MODE,
	parseWorkspaceApis,
	requestContextStore,
	resolveNamespace,
	verifySessionCookie,
	verifyToken,
} from "~/k8s/index.js";
import {
	getBasePrefix,
	getRequestHostAndProto,
	setCorsHeaders,
} from "./helpers.js";

const logger = getLogger(["nogoo9", "auth"]);

export function registerAuthHooks(
	api: FastifyInstance,
	deps: {
		getK8sContext: () => any;
	},
) {
	const basePrefix = getBasePrefix();

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
					extractTokenFromCookie(request.headers.cookie, "nocr_token") || null;
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
		requestContextStore.run({ jwtPayload: (request as any).jwtPayload }, () => {
			done();
		});
	});

	// Authentication guards
	const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
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
			reply.header("Link", `<${metadataUrl}>; rel="oauth-protected-resource"`);

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
				!hasRequiredScope(jwtPayload, requiredScope, config.auth.scopeJsonPath)
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
				!hasRequiredRole(jwtPayload, requiredRole, config.auth.rolesJsonPath)
			) {
				reply.status(403);
				setCorsHeaders(reply);
				return reply.send(`Forbidden: Missing required role: ${requiredRole}`);
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
				!hasRequiredScope(jwtPayload, requiredScope, config.auth.scopeJsonPath)
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
				!hasRequiredRole(jwtPayload, requiredRole, config.auth.rolesJsonPath)
			) {
				reply.status(403);
				setCorsHeaders(reply);
				return reply.send(`Forbidden: Missing required role: ${requiredRole}`);
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
		const k8sCtx = deps.getK8sContext();
		try {
			const res = await k8sCtx.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector: `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${workspaceId}`,
			});

			if (res.items.length === 0) {
				reply.status(404);
				setCorsHeaders(reply);
				return reply.send(`Workspace "${workspaceId}" not found`);
			}

			const pod = res.items[0];
			const podSub = pod.metadata?.labels?.[ANNOTATION_KEYS.USER_SUB];

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
				pod.metadata?.annotations?.[ANNOTATION_KEYS.WORKSPACE_PORT];
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
				const pathOnly = qIndex !== -1 ? subpath.substring(0, qIndex) : subpath;
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

	return {
		requireAuth,
		requireMcpAuth,
		requireRouteAuth,
		proxyPreHandler,
	};
}
