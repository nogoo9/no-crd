import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { registerMcpRoutes } from "./mcp.js";
import { registerProxyRoutes } from "./proxy.js";
import { registerStaticRoutes } from "./static.js";
import { registerThemesRoutes } from "./themes.js";

export interface RouteDeps {
	guards: {
		requireMcpAuth: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<any>;
		requireRouteAuth: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<any>;
		proxyPreHandler: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<any>;
	};
	getK8sContext: () => any;
	getMcpServerAndTransport: (
		req: Request,
	) => Promise<{ server: any; transport: any }>;
	distDir: string;
}

export async function registerRoutes(
	api: FastifyInstance,
	deps: RouteDeps,
): Promise<void> {
	registerMcpRoutes(api, deps);
	registerThemesRoutes(api, deps);
	await registerStaticRoutes(api, deps);
	await registerProxyRoutes(api, deps);
}
