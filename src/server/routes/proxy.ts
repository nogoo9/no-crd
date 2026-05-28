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
