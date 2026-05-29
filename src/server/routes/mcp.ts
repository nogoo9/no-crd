import { getLogger } from "@logtape/logtape";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ANNOTATION_KEYS, config } from "~/config.js";
import {
	getBasePrefix,
	getRequestHostAndProto,
	setCorsHeaders,
} from "~/server/helpers.js";
import type { RouteDeps } from "./index.js";

const logger = getLogger(["nogoo9", "routes", "mcp"]);

export function registerMcpRoutes(api: FastifyInstance, deps: RouteDeps): void {
	const basePrefix = getBasePrefix();
	const { requireMcpAuth } = deps.guards;

	// OAuth protected resource metadata endpoint
	api.get("/.well-known/oauth-protected-resource", async (request, reply) => {
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
	});

	// Health check endpoints
	const healthHandler = async (
		_request: FastifyRequest,
		reply: FastifyReply,
	) => {
		setCorsHeaders(reply);
		return { status: "ok" };
	};
	api.get("/healthz", healthHandler);
	api.get("/mcp/healthz", healthHandler);

	// Logout endpoints
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
			const k8sCtx = deps.getK8sContext();
			const res = await k8sCtx.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector: `${ANNOTATION_KEYS.TYPE}=workspace`,
			});
			const workspaceIds = res.items
				.map((pod: any) => pod.metadata?.labels?.[ANNOTATION_KEYS.WORKSPACE_ID])
				.filter(Boolean);

			for (const id of workspaceIds) {
				reply.header(
					"Set-Cookie",
					`nocr_token=; Path=/route/${id}/; SameSite=Lax; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
				);
			}
		} catch (err) {
			logger.error("Failed to list workspaces for cookie clearing: {error}", {
				error: err,
			});
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

	// Permissions endpoints
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
				deps.getK8sContext(),
				DEFAULT_NAMESPACE,
				MODE,
			);
			return report;
		} catch (err) {
			reply.status(500);
			return { error: err instanceof Error ? err.message : String(err) };
		}
	};
	api.get("/permissions", { preHandler: requireMcpAuth }, permissionsHandler);
	api.get(
		"/mcp/permissions",
		{ preHandler: requireMcpAuth },
		permissionsHandler,
	);

	// MCP event-stream and tool call handlers
	const mcpHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const host = request.headers.host || `${request.hostname}:${request.port}`;
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

		const { transport } = await deps.getMcpServerAndTransport(standardReq);
		const res = await transport.handleRequest(standardReq);

		reply.status(res.status);
		res.headers.forEach((value: string, key: string) => {
			reply.header(key, value);
		});

		setCorsHeaders(reply);
		reply.header("X-Accel-Buffering", "no");

		if (res.body) {
			const contentType = res.headers.get("content-type");
			if (res.status === 200 && contentType?.includes("text/event-stream")) {
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
}
