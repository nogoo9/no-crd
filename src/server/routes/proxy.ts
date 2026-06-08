import fastifyHttpProxy from "@fastify/http-proxy";
import { getLogger } from "@logtape/logtape";
import type { FastifyInstance } from "fastify";
import { ANNOTATION_KEYS, config } from "~/config/index.js";
import { getBasePrefix, setCorsHeaders } from "~/server/helpers.js";
import type { RouteDeps } from "./index.js";

const logger = getLogger(["nogoo9", "routes", "proxy"]);

export async function registerProxyRoutes(
	api: FastifyInstance,
	deps: RouteDeps,
): Promise<void> {
	const { proxyPreHandler } = deps.guards;

	// 1. Path-scoped token retrieval endpoint
	api.get(
		"/route/:workspaceId/_auth/token",
		{ preHandler: proxyPreHandler },
		async (request, reply) => {
			setCorsHeaders(reply);

			// Verify if token-api mode is enabled
			const annotations = (request as any).workspaceAnnotations || {};
			const authMode = annotations[ANNOTATION_KEYS.WORKSPACE_AUTH_MODE] || "";
			const modes = authMode
				.split(",")
				.map((m: string) => m.trim().toLowerCase());

			if (!modes.includes("token-api")) {
				reply.status(403);
				return reply.send({
					error: "Forbidden",
					message: "token-api mode is not enabled for this workspace",
				});
			}

			const token = (request as any).token;
			return { token: token || null };
		},
	);

	// 2. Redirect authorize endpoint
	api.get(
		"/route/:workspaceId/_auth/authorize",
		{ preHandler: proxyPreHandler },
		async (request, reply) => {
			setCorsHeaders(reply);

			// Verify if token-api mode is enabled
			const annotations = (request as any).workspaceAnnotations || {};
			const authMode = annotations[ANNOTATION_KEYS.WORKSPACE_AUTH_MODE] || "";
			const modes = authMode
				.split(",")
				.map((m: string) => m.trim().toLowerCase());

			if (!modes.includes("token-api")) {
				reply.status(403);
				return reply.send({
					error: "Forbidden",
					message: "token-api mode is not enabled for this workspace",
				});
			}

			const query = request.query as {
				redirect_uri?: string;
				response_mode?: "query" | "fragment";
			};
			const redirectUri = query.redirect_uri;

			if (!redirectUri) {
				reply.status(400);
				return reply.send({
					error: "Bad Request",
					message: "Missing redirect_uri query parameter",
				});
			}

			// Open-redirect protection: redirect_uri must be same-origin
			let relativePath = "";
			try {
				const requestHost = request.headers.host || "localhost";
				const protocol =
					request.headers["x-forwarded-proto"] === "https" ? "https" : "http";
				const url = new URL(redirectUri, `${protocol}://${requestHost}`);
				if (url.host !== requestHost) {
					reply.status(400);
					return reply.send({
						error: "Bad Request",
						message: "redirect_uri must be same-origin",
					});
				}
				relativePath = url.pathname + url.search + url.hash;
				if (!relativePath.startsWith("/") || relativePath.startsWith("//")) {
					reply.status(400);
					return reply.send({
						error: "Bad Request",
						message: "Invalid redirect_uri path",
					});
				}
			} catch (_) {
				reply.status(400);
				return reply.send({
					error: "Bad Request",
					message: "Invalid redirect_uri format",
				});
			}

			const token = (request as any).token || "";
			const responseMode = query.response_mode || "fragment";
			const separator =
				responseMode === "query"
					? relativePath.includes("?")
						? "&"
						: "?"
					: "#";
			const redirectUrl = `${relativePath}${separator}token=${encodeURIComponent(token)}`;

			return reply.redirect(redirectUrl);
		},
	);

	// 2b. Explicit refresh endpoint for SPAs
	api.post("/route/:workspaceId/_auth/refresh", async (request, reply) => {
		setCorsHeaders(reply);

		const { workspaceId } = request.params as { workspaceId: string };
		if (!workspaceId) {
			reply.status(400);
			return reply.send({
				error: "Bad Request",
				message: "Workspace ID is required",
			});
		}

		// 1. Look up workspace pod to check user sub and mode annotation
		const {
			DEFAULT_NAMESPACE,
			MODE,
			resolveNamespace,
			getSessionKey,
			extractTokenFromCookie,
			decryptRefreshToken,
			encryptRefreshToken,
			createSessionCookie,
			extractUserIdentity,
		} = await import("~/k8s/index.js");

		const ns = resolveNamespace(undefined, MODE, DEFAULT_NAMESPACE);
		const k8sCtx = deps.getK8sContext();
		let pod: any;
		try {
			const res = await k8sCtx.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector: `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${workspaceId}`,
			});
			if (res.items.length === 0) {
				reply.status(404);
				return reply.send({
					error: "Not Found",
					message: "Workspace not found",
				});
			}
			pod = res.items[0];
		} catch (err) {
			logger.error("Failed to query workspace pod during refresh: {error}", {
				error: err,
			});
			reply.status(500);
			return reply.send({
				error: "Internal Server Error",
				message: "Internal Server Error",
			});
		}

		// 2. Verify if token-api mode is enabled
		const annotations = pod.metadata?.annotations || {};
		const authMode = annotations[ANNOTATION_KEYS.WORKSPACE_AUTH_MODE] || "";
		const modes = authMode
			.split(",")
			.map((m: string) => m.trim().toLowerCase());

		if (!modes.includes("token-api")) {
			reply.status(403);
			return reply.send({
				error: "Forbidden",
				message: "token-api mode is not enabled for this workspace",
			});
		}

		if (!config.auth.enabled) {
			return { token: "auth-disabled" };
		}

		const sessKey = getSessionKey();
		if (!sessKey) {
			reply.status(500);
			return reply.send({
				error: "Internal Server Error",
				message: "Session secret not resolved",
			});
		}

		const refreshCookie = extractTokenFromCookie(
			request.headers.cookie,
			"nocr_refresh",
		);
		if (!refreshCookie) {
			reply.status(401);
			return reply.send({
				error: "Unauthorized",
				message: "Missing refresh cookie",
			});
		}

		const decryptedRefresh = decryptRefreshToken(refreshCookie, sessKey);
		if (!decryptedRefresh) {
			reply.status(401);
			return reply.send({
				error: "Unauthorized",
				message: "Invalid refresh cookie",
			});
		}

		try {
			const { performTokenRefresh } = await import("~/server/auth.js");
			const basePrefix = getBasePrefix();
			const result = await performTokenRefresh(
				request,
				decryptedRefresh,
				sessKey,
				basePrefix,
			);

			// 3. Verify user owns the workspace
			const podSub = pod.metadata?.labels?.["nogoo9/user-sub"];
			const userSub = extractUserIdentity(
				result.jwtPayload,
				config.auth.subJsonPath,
			);

			if (podSub !== userSub) {
				reply.status(403);
				return reply.send({
					error: "Forbidden",
					message: "You do not own this workspace",
				});
			}

			// 4. Update cookies
			const newSessCookie = createSessionCookie(
				result.jwtPayload,
				sessKey,
				config.auth.sessionTtlSeconds,
				config.auth.subJsonPath,
				config.auth.rolesJsonPath,
			);
			reply.header(
				"Set-Cookie",
				`nocr_sess=${newSessCookie}; Path=/; SameSite=Lax; HttpOnly; Max-Age=${config.auth.sessionTtlSeconds}`,
			);

			const encryptedNewRefresh = encryptRefreshToken(
				result.rotatedRefreshToken,
				sessKey,
			);
			reply.header(
				"Set-Cookie",
				`nocr_refresh=${encryptedNewRefresh}; Path=/; SameSite=Lax; HttpOnly; Max-Age=604800`,
			);

			reply.header(
				"Set-Cookie",
				`nocr_token=${result.token}; Path=/route/${workspaceId}/; SameSite=Lax; HttpOnly; Max-Age=86400`,
			);

			return { token: result.token };
		} catch (err) {
			logger.warn("SPA refresh request failed: {error}", {
				error: err instanceof Error ? err.message : String(err),
			});
			reply.status(401);
			return reply.send({
				error: "Unauthorized",
				message: err instanceof Error ? err.message : String(err),
			});
		}
	});

	// 3. HTTP Proxy with request header rewriting
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
				rewriteRequestHeaders: (request: any, headers: any) => {
					const newHeaders = { ...headers };
					const annotations = request.workspaceAnnotations || {};
					const authMode =
						annotations[ANNOTATION_KEYS.WORKSPACE_AUTH_MODE] || "";
					const modes = authMode
						.split(",")
						.map((m: string) => m.trim().toLowerCase());

					const injectHeaders =
						config.auth.enabled || modes.includes("inject-headers");

					if (injectHeaders) {
						// Inject user subject identity
						const jwtPayload = request.jwtPayload;
						if (jwtPayload) {
							if (jwtPayload.sub) {
								newHeaders["x-user-sub"] = jwtPayload.sub;
							}
							const roles = jwtPayload.realm_access?.roles || jwtPayload.roles;
							if (roles) {
								newHeaders["x-user-roles"] = Array.isArray(roles)
									? roles.join(",")
									: String(roles);
							}
						}

						// Inject raw JWT token if present
						const token = request.token;
						if (token) {
							newHeaders["x-workspace-jwt"] = token;
							newHeaders.authorization = `Bearer ${token}`;
						}
					}

					return newHeaders;
				},
				onResponse: (request: any, reply: any, res: any) => {
					setCorsHeaders(reply);
					const token = (request as any).token;
					const workspaceId = (request as any).workspaceId;
					if (token && workspaceId) {
						// Cookie Path uses raw "/route/{id}/" without basePrefix because
						// Fastify registers all routes under { prefix: basePrefix }. The
						// browser sees the full URL (e.g. /gateway/no-crd/route/ws-1/)
						// but the cookie Path in the Set-Cookie header is taken literally.
						// The logout handler clears with the same raw path, keeping them
						// consistent. See ADR-011 for the full analysis.
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
}
