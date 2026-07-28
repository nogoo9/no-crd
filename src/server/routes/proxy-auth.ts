import type { FastifyInstance } from "fastify";
import { config } from "~/config/index.js";
import { setCorsHeaders } from "~/server/helpers.js";
import { isWorkspaceAuthModeEnabled } from "~/server/proxy-common.js";
import type { RouteDeps } from "./index.js";

/**
 * Registers workspace-scoped OAuth and token authentication API routes.
 *
 * Routes registered:
 * - GET `/route/:workspaceId/_auth/token`
 * - GET `/route/:workspaceId/_auth/authorize`
 * - POST `/route/:workspaceId/_auth/refresh`
 */
export function registerProxyAuthRoutes(
	api: FastifyInstance,
	deps: RouteDeps,
): void {
	const { proxyPreHandler } = deps.guards;

	// 1. Path-scoped token retrieval endpoint
	api.get(
		"/route/:workspaceId/_auth/token",
		{
			config: {
				rateLimit: {
					max: config.server.rateLimitMax,
					timeWindow: config.server.rateLimitWindow,
				},
			},
			preHandler: proxyPreHandler,
		},
		async (request, reply) => {
			setCorsHeaders(reply);

			const annotations = (request as any).workspaceAnnotations || {};
			if (!isWorkspaceAuthModeEnabled(annotations, "token-api")) {
				reply.status(403);
				return reply.send({
					error: "Forbidden",
					message: "token-api mode is not enabled for this workspace",
				});
			}

			const token = (request as any).token;
			let session: {
				sub: string;
				roles: string[];
				iat?: number;
				exp?: number;
			} | null = null;

			const {
				getSessionKey,
				extractTokenFromCookie,
				verifySessionCookie,
				extractUserIdentity,
			} = await import("~/k8s/index.js");
			const sessKey = getSessionKey();
			const sessCookie = extractTokenFromCookie(
				request.headers.cookie,
				"nocr_sess",
			);
			if (sessCookie && sessKey) {
				const verified = verifySessionCookie(sessCookie, sessKey);
				if (verified) {
					session = {
						sub: verified.sub,
						roles: verified.roles,
						iat: verified.iat,
						exp: verified.exp,
					};
				}
			}

			if (!session && (request as any).jwtPayload) {
				const jwtPayload = (request as any).jwtPayload;
				let sub = "";
				try {
					sub = extractUserIdentity(jwtPayload, config.auth.subJsonPath);
				} catch (_) {
					sub = jwtPayload.sub || jwtPayload.name || "";
				}

				let roles: string[] = [];
				try {
					const { JSONPath } = await import("jsonpath-plus");
					const match = JSONPath<unknown[]>({
						path: config.auth.rolesJsonPath || "$.realm_access.roles",
						json: jwtPayload as object,
					});
					const rolesVal = match && match.length > 0 ? match[0] : undefined;
					if (Array.isArray(rolesVal)) {
						roles = rolesVal.map(String);
					} else if (typeof rolesVal === "string") {
						roles = rolesVal.split(/[\s,]+/);
					} else {
						const directRoles =
							jwtPayload.roles ?? jwtPayload.realm_access?.roles;
						if (Array.isArray(directRoles)) {
							roles = directRoles.map(String);
						}
					}
				} catch (_) {}

				session = {
					sub,
					roles,
					iat: typeof jwtPayload.iat === "number" ? jwtPayload.iat : undefined,
					exp: typeof jwtPayload.exp === "number" ? jwtPayload.exp : undefined,
				};
			}

			return {
				token: token || null,
				session,
			};
		},
	);

	// 2. Redirect authorize endpoint
	api.get(
		"/route/:workspaceId/_auth/authorize",
		{
			config: {
				rateLimit: {
					max: config.server.rateLimitMax,
					timeWindow: config.server.rateLimitWindow,
				},
			},
			preHandler: proxyPreHandler,
		},
		async (request, reply) => {
			setCorsHeaders(reply);

			const annotations = (request as any).workspaceAnnotations || {};
			if (!isWorkspaceAuthModeEnabled(annotations, "token-api")) {
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

	// 3. Refresh endpoint for SPAs
	api.post(
		"/route/:workspaceId/_auth/refresh",
		{
			config: {
				rateLimit: {
					max: config.server.rateLimitMax,
					timeWindow: config.server.rateLimitWindow,
				},
			},
		},
		async (request, reply) => {
			setCorsHeaders(reply);

			const { workspaceId } = request.params as { workspaceId: string };
			const {
				createSessionCookie,
				decryptRefreshToken,
				encryptRefreshToken,
				extractTokenFromCookie,
				getSessionKey,
			} = await import("~/k8s/index.js");
			const { performTokenRefresh } = await import("~/server/auth.js");
			const { getBasePrefix } = await import("~/server/helpers.js");

			const sessKey = getSessionKey();
			const encryptedRefresh = extractTokenFromCookie(
				request.headers.cookie,
				"nocr_refresh",
			);
			if (!encryptedRefresh || !sessKey) {
				reply.status(401);
				return reply.send({
					error: "Unauthorized",
					message: "No refresh token cookie found",
				});
			}

			const decryptedRefresh = decryptRefreshToken(encryptedRefresh, sessKey);
			if (!decryptedRefresh) {
				reply.status(401);
				return reply.send({
					error: "Unauthorized",
					message: "Invalid or corrupted refresh token cookie",
				});
			}

			try {
				const basePrefix = getBasePrefix();
				const result = await performTokenRefresh(
					request,
					decryptedRefresh,
					sessKey,
					basePrefix,
				);

				const { computeRefreshCookieTtl, computeTokenCookieTtl } = await import(
					"~/server/auth.js"
				);

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
				const refreshTtl = computeRefreshCookieTtl(result.refreshExpiresIn);
				reply.header(
					"Set-Cookie",
					`nocr_refresh=${encryptedNewRefresh}; Path=/; SameSite=Lax; HttpOnly; Max-Age=${refreshTtl}`,
				);

				const tokenTtl = computeTokenCookieTtl(result.jwtPayload);
				reply.header(
					"Set-Cookie",
					`nocr_token=${result.token}; Path=${basePrefix}/route/${workspaceId}/; SameSite=Lax; HttpOnly; Max-Age=${tokenTtl}`,
				);

				return { token: result.token };
			} catch (err: any) {
				reply.header(
					"Set-Cookie",
					"nocr_refresh=; Path=/; SameSite=Lax; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
				);
				reply.status(401);
				return reply.send({
					error: "Unauthorized",
					message: err.message || "Failed to refresh token",
				});
			}
		},
	);
}
