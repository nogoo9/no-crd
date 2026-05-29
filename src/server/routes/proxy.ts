import fastifyHttpProxy from "@fastify/http-proxy";
import type { FastifyInstance } from "fastify";
import { setCorsHeaders } from "~/server/helpers.js";
import type { RouteDeps } from "./index.js";

export async function registerProxyRoutes(
	api: FastifyInstance,
	deps: RouteDeps,
): Promise<void> {
	const { proxyPreHandler } = deps.guards;

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
