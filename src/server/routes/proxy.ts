import http from "node:http";
import fastifyHttpProxy from "@fastify/http-proxy";
import { getLogger } from "@logtape/logtape";
import type { FastifyInstance } from "fastify";
import { ANNOTATION_KEYS, config } from "~/config/index.js";
import { computeTokenCookieTtl } from "~/server/auth.js";
import { getBasePrefix, setCorsHeaders } from "~/server/helpers.js";
import type { RouteDeps } from "./index.js";

const _logger = getLogger(["nogoo9", "routes", "proxy"]);

import { registerProxyAuthRoutes } from "./proxy-auth.js";

export async function registerProxyRoutes(
	api: FastifyInstance,
	deps: RouteDeps,
): Promise<void> {
	const { proxyPreHandler } = deps.guards;
	const basePrefix = getBasePrefix();

	// Register OAuth and token authentication endpoints
	registerProxyAuthRoutes(api, deps);

	const keepAliveAgent = new http.Agent({
		keepAlive: true,
		maxSockets: 100,
		keepAliveMsecs: 1000,
	});

	// 3. HTTP Proxy with request header rewriting
	await api.register(
		fastifyHttpProxy as any,
		{
			upstream: "http://localhost:3000",
			prefix: "/route/:workspaceId",
			websocket: false,
			undici: false,
			http: {
				agent: config.server.proxyKeepAlive ? keepAliveAgent : undefined,
				requestOptions: {
					timeout: config.server.proxyTimeout,
				},
			},
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
							if (config.auth.injectWorkspaceJwt) {
								newHeaders["x-workspace-jwt"] = token;
							}
							newHeaders.authorization = `Bearer ${token}`;
						}
					}

					return newHeaders;
				},
				onResponse: (request: any, reply: any, res: any) => {
					setCorsHeaders(reply);

					// Strip frame blocking headers from downstream containers to allow iframe previews
					reply.removeHeader("x-frame-options");
					reply.removeHeader("X-Frame-Options");

					const csp =
						reply.getHeader("content-security-policy") ||
						reply.getHeader("Content-Security-Policy");
					if (typeof csp === "string") {
						const cleanedCsp = csp.replace(
							/frame-ancestors\s+[^;]+(;?)/gi,
							"frame-ancestors 'self'$1",
						);
						reply.header("content-security-policy", cleanedCsp);
					} else {
						reply.header("content-security-policy", "frame-ancestors 'self'");
					}

					const token = (request as any).token;
					const workspaceId = (request as any).workspaceId;
					if (token && workspaceId) {
						// Cookie Path uses "/route/{id}/" prefixed with basePrefix because
						// the cookie Path in the Set-Cookie header is matched against the
						// full browser request path (which includes basePrefix). The logout
						// handler also clears with the same prefix-consistent path.
						// See ADR-011 for context on cookie path alignment.
						const tokenTtl = computeTokenCookieTtl((request as any).jwtPayload);
						reply.header(
							"Set-Cookie",
							`nocr_token=${token}; Path=${basePrefix}/route/${workspaceId}/; SameSite=Lax; HttpOnly; Max-Age=${tokenTtl}`,
						);
					}
					reply.send(res.stream);
				},
			},
			preHandler: proxyPreHandler,
		} as any,
	);
}
