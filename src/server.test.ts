import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { EventEmitter } from "node:events";
import net from "node:net";
import { Readable } from "node:stream";
import * as k8s from "@kubernetes/client-node";
import { initK8sContext, type K8sContext } from "~/k8s/index.js";

let listenMock: any = null;

mock.module("fastify", () => {
	const originalFastify = require("fastify");
	const fastifyMock = (opts: any) => {
		const app = originalFastify(opts);
		const originalListen = app.listen;
		app.listen = function (options: any, cb: any) {
			if (listenMock) {
				return listenMock.call(this, options, cb);
			}
			return originalListen.call(this, options, cb);
		};

		// Intercept decorateReply so that if 'from' is decorated, we swap out the real function with our mock
		const originalDecorateReply = app.decorateReply;
		app.decorateReply = function (this: any, name: string, fn: any) {
			if (name === "from") {
				const mockFrom = function (this: any, source: string, replyOpts: any) {
					replyOpts = replyOpts || {};
					const req = this.request;
					const method = replyOpts.method || req.raw.method;
					const upstream = replyOpts.getUpstream
						? replyOpts.getUpstream(req)
						: "http://localhost:3000";

					const queryIndex = req.raw.url.indexOf("?");
					const qs = queryIndex >= 0 ? req.raw.url.substring(queryIndex) : "";
					const path =
						source ||
						(queryIndex >= 0
							? req.raw.url.substring(0, queryIndex)
							: req.raw.url);

					let destUrl = upstream + (path.startsWith("/") ? "" : "/") + path;
					if (qs && !destUrl.includes("?")) {
						destUrl += qs;
					}

					const requestHeaders: any = Object.create(null);
					for (const [k, v] of Object.entries(req.headers)) {
						if (k !== "__proto__" && k !== "constructor" && k !== "prototype") {
							requestHeaders[k] = v;
						}
					}
					const rewriteRequestHeaders =
						replyOpts.rewriteRequestHeaders || ((_: any, h: any) => h);
					const finalHeaders = rewriteRequestHeaders(req, requestHeaders);

					const headersObj = new Headers();
					for (const [k, v] of Object.entries(finalHeaders)) {
						if (v !== undefined) {
							if (Array.isArray(v)) {
								for (const item of v) {
									headersObj.append(k, String(item));
								}
							} else {
								headersObj.set(k, String(v));
							}
						}
					}

					globalThis
						.fetch(destUrl, {
							method,
							headers: headersObj,
							body: req.body
								? typeof req.body === "string" || Buffer.isBuffer(req.body)
									? req.body
									: JSON.stringify(req.body)
								: undefined,
						})
						.then(async (res) => {
							const responseHeaders: any = Object.create(null);
							res.headers.forEach((v, k) => {
								if (
									k !== "__proto__" &&
									k !== "constructor" &&
									k !== "prototype"
								) {
									responseHeaders[k] = v;
								}
							});
							const rewriteHeaders =
								replyOpts.rewriteHeaders || ((h: any) => h);
							const finalResponseHeaders = rewriteHeaders(responseHeaders, req);
							for (const [k, v] of Object.entries(finalResponseHeaders)) {
								this.header(k, v);
							}
							this.status(res.status);

							if (replyOpts.onResponse) {
								const mockRes = {
									statusCode: res.status,
									headers: finalResponseHeaders,
									stream: res.body ? Readable.from(res.body as any) : null,
								};
								replyOpts.onResponse(req, this, mockRes);
							} else {
								const text = await res.text();
								this.send(text);
							}
						})
						.catch((err) => {
							const onError =
								replyOpts.onError ||
								((reply: any, { error }: any) => reply.send(error));
							onError(this, { error: err });
						});

					return this;
				};
				return originalDecorateReply.call(this, name, mockFrom);
			}
			return originalDecorateReply.call(this, name, fn);
		};

		return app;
	};
	Object.assign(fastifyMock, originalFastify);
	fastifyMock.default = fastifyMock;
	fastifyMock.fastify = fastifyMock;
	return fastifyMock;
});

import { globalApp, handleWebRequest, resetMcpServer } from "./server.js";

const mockCreateSelfSubjectAccessReview = mock();
const mockAuthApi = {
	createSelfSubjectAccessReview: mockCreateSelfSubjectAccessReview,
} as any;

const mockListNamespacedPod = mock();
const mockReadNamespacedConfigMap = mock();
const mockCoreApi = {
	listNamespacedPod: mockListNamespacedPod,
	readNamespacedConfigMap: mockReadNamespacedConfigMap,
} as any;

describe("HTTP/SSE Server - Stateful and Stateless MCP Tool Calls", () => {
	let testKc: k8s.KubeConfig;
	let k8sContext: K8sContext;
	let originalMakeApiClient: any;

	beforeEach(async () => {
		mockCreateSelfSubjectAccessReview.mockReset();
		mockReadNamespacedConfigMap.mockReset();
		testKc = new k8s.KubeConfig();
		testKc.loadFromString(`
apiVersion: v1
clusters:
- cluster:
    server: https://localhost:8443
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
kind: Config
preferences: {}
users:
- name: test-user
  user:
    token: test-token
`);
		originalMakeApiClient = testKc.makeApiClient;
		// Mock k8s API client to return allowed for all checks
		testKc.makeApiClient = (apiClass: any) => {
			if (apiClass === k8s.AuthorizationV1Api) {
				return mockAuthApi;
			}
			if (apiClass === k8s.CoreV1Api) {
				return mockCoreApi;
			}
			return originalMakeApiClient.call(testKc, apiClass);
		};
		// Grant permissions for all reviews
		mockCreateSelfSubjectAccessReview.mockResolvedValue({
			status: { allowed: true },
		});
		k8sContext = initK8sContext(testKc);
		await resetMcpServer(undefined, false, k8sContext);
	});

	afterEach(async () => {
		await resetMcpServer();
	});

	test("OPTIONS request returns 204", async () => {
		const req = new Request("http://localhost/mcp", { method: "OPTIONS" });
		const resp = await handleWebRequest(req);
		expect(resp.status).toBe(204);
	});

	test("Health checks (/healthz) return ok", async () => {
		const req = new Request("http://localhost/healthz", { method: "GET" });
		const resp = await handleWebRequest(req);
		expect(resp.status).toBe(200);
		const body = await resp.json();
		expect(body).toEqual({ status: "ok" });
	});

	test("Serves UI HTML at root and /ui paths", async () => {
		for (const path of [
			"http://localhost/",
			"http://localhost/ui",
			"http://localhost/ui/",
		]) {
			const req = new Request(path, { method: "GET" });
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(200);
			expect(resp.headers.get("Content-Type")).toContain("text/html");
			const html = await resp.text();
			expect(html).toContain("nogoo9 Pod Manager");
		}
	});

	test("Permissions endpoint returns permissions report", async () => {
		const req = new Request("http://localhost/permissions", { method: "GET" });
		const resp = await handleWebRequest(req);
		expect(resp.status).toBe(200);
		const body = (await resp.json()) as any;
		expect(body.configuredFlags).toBeDefined();
		expect(body.enabledTools).toContain("list_pods");
	});

	test("MCP endpoint (/mcp) - Stateful initialization and tool calling lifecycle", async () => {
		// 1. Send initialization request (POST)
		const initMsg = {
			jsonrpc: "2.0",
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "test-client", version: "1.0" },
			},
			id: 1,
		};
		const initReq = new Request("http://localhost/mcp", {
			method: "POST",
			headers: {
				Accept: "application/json, text/event-stream",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(initMsg),
		});

		const initResp = await handleWebRequest(initReq);
		expect(initResp.status).toBe(200);
		expect(initResp.headers.get("Content-Type")).toContain("application/json");

		// Extract session ID from mcp-session-id header
		const sessionId = initResp.headers.get("mcp-session-id");
		expect(sessionId).toBeDefined();
		expect(sessionId).not.toBeNull();

		// 2. Connect to GET event stream using the session ID
		const getReq = new Request("http://localhost/mcp", {
			method: "GET",
			headers: {
				Accept: "text/event-stream",
				"mcp-session-id": sessionId!,
				"mcp-protocol-version": "2024-11-05",
			},
		});

		const getResp = await handleWebRequest(getReq);
		expect(getResp.status).toBe(200);
		expect(getResp.headers.get("Content-Type")).toContain("text/event-stream");

		// 3. Make an MCP tool call (POST tools/list) using the session ID
		const listToolsMsg = {
			jsonrpc: "2.0",
			method: "tools/list",
			params: {},
			id: 2,
		};
		const postReq = new Request("http://localhost/mcp", {
			method: "POST",
			headers: {
				Accept: "application/json, text/event-stream",
				"Content-Type": "application/json",
				"mcp-session-id": sessionId!,
				"mcp-protocol-version": "2024-11-05",
			},
			body: JSON.stringify(listToolsMsg),
		});

		const postResp = await handleWebRequest(postReq);
		expect(postResp.status).toBe(200);
		expect(postResp.headers.get("Content-Type")).toContain("application/json");

		const postRespBody = (await postResp.json()) as any;
		expect(postRespBody.result).toBeDefined();
		expect(postRespBody.result.tools).toBeDefined();
	});

	test("MCP endpoint (/mcp) - Stateless initialization and tool calling lifecycle", async () => {
		// Initialize stateless mode
		await resetMcpServer(undefined, true, k8sContext);

		// 1. Send initialization request (POST) - stateless, so no session ID is generated or returned
		const initMsg = {
			jsonrpc: "2.0",
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "test-client", version: "1.0" },
			},
			id: 1,
		};
		const initReq = new Request("http://localhost/mcp", {
			method: "POST",
			headers: {
				Accept: "application/json, text/event-stream",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(initMsg),
		});

		const initResp = await handleWebRequest(initReq);
		expect(initResp.status).toBe(200);
		expect(initResp.headers.get("Content-Type")).toContain("application/json");
		expect(initResp.headers.get("mcp-session-id")).toBeNull();

		// 2. Make an MCP tool call (POST tools/list) without a session ID since we are stateless
		const listToolsMsg = {
			jsonrpc: "2.0",
			method: "tools/list",
			params: {},
			id: 2,
		};
		const postReq = new Request("http://localhost/mcp", {
			method: "POST",
			headers: {
				Accept: "application/json, text/event-stream",
				"Content-Type": "application/json",
				"mcp-protocol-version": "2024-11-05",
			},
			body: JSON.stringify(listToolsMsg),
		});

		const postResp = await handleWebRequest(postReq);
		expect(postResp.status).toBe(200);
		expect(postResp.headers.get("Content-Type")).toContain("application/json");

		const postRespBody = (await postResp.json()) as any;
		expect(postRespBody.result).toBeDefined();
		expect(postRespBody.result.tools).toBeDefined();
	});

	test("MCP endpoint (/mcp) - GET without session ID returns 400 Bad Request", async () => {
		const req = new Request("http://localhost/mcp", {
			method: "GET",
			headers: {
				Accept: "text/event-stream",
			},
		});
		const resp = await handleWebRequest(req);
		expect(resp.status).toBe(400);
		const body = (await resp.json()) as any;
		expect(body.error.message).toContain("Server not initialized");
	});

	test("Subpath prefix routing with BASE_URL env variable", async () => {
		process.env.BASE_URL = "/gateway/no-crd";
		try {
			const req = new Request("http://localhost/gateway/no-crd/healthz", {
				method: "GET",
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(200);
			const body = await resp.json();
			expect(body).toEqual({ status: "ok" });
		} finally {
			delete process.env.BASE_URL;
		}
	});

	test("Routing proxy - unauthorized if AUTH_ENABLED and missing token", async () => {
		process.env.AUTH_ENABLED = "true";
		try {
			const req = new Request("http://localhost/route/ws-1/subpath", {
				method: "GET",
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(401);
			expect(await resp.text()).toContain("Valid JWT token");
		} finally {
			delete process.env.AUTH_ENABLED;
		}
	});

	test("Routing proxy - routes successfully to running workspace pod IP", async () => {
		mockListNamespacedPod.mockResolvedValue({
			items: [
				{
					metadata: {
						name: "ws-anonymous-ws-1",
						labels: {
							"nogoo9/user-sub": "anonymous",
						},
						annotations: {
							"nogoo9/workspace-port": "8080",
						},
					},
					status: {
						phase: "Running",
						podIP: "10.0.0.5",
					},
				},
			],
		});

		const originalFetch = globalThis.fetch;
		const mockFetch = mock((url: string, init?: any) => {
			expect(url).toBe("http://10.0.0.5:8080/subpath?foo=bar");
			expect(init.method).toBe("POST");
			expect(init.headers.get("X-Test-Header")).toBe("hello");
			return Promise.resolve(
				new Response("proxied-response-body", {
					status: 200,
					headers: { "X-Proxy-Header": "yes" },
				}),
			);
		});
		globalThis.fetch = mockFetch as any;

		try {
			const req = new Request("http://localhost/route/ws-1/subpath?foo=bar", {
				method: "POST",
				headers: {
					"X-Test-Header": "hello",
				},
				body: "incoming-body",
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(200);
			expect(await resp.text()).toBe("proxied-response-body");
			expect(resp.headers.get("X-Proxy-Header")).toBe("yes");
			expect(mockFetch).toHaveBeenCalled();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("Routing proxy - dynamic API routing and URL prefix stripping with and without BASE_URL", async () => {
		mockListNamespacedPod.mockResolvedValue({
			items: [
				{
					metadata: {
						name: "ws-anonymous-ws-1",
						labels: {
							"nogoo9/user-sub": "anonymous",
						},
						annotations: {
							"nogoo9/workspace-port": "8080",
							"nogoo9/api.terminal.port": "7681",
							"nogoo9/api.terminal.path": "/terminal",
							"nogoo9/api.terminal.desc": "ttyd Web Terminal",
							"nogoo9/api.webhook.port": "8082",
							"nogoo9/api.webhook.path": "/api/webhook",
							"nogoo9/api.webhook.method": "POST",
						},
					},
					status: {
						phase: "Running",
						podIP: "10.0.0.5",
					},
				},
			],
		});

		const originalFetch = globalThis.fetch;
		let lastRequestUrl = "";
		const mockFetch = mock((url: string, _init?: any) => {
			lastRequestUrl = url;
			return Promise.resolve(
				new Response("proxied-response-body", {
					status: 200,
				}),
			);
		});
		globalThis.fetch = mockFetch as any;

		try {
			// Scenario 1: Access terminal endpoint (matches `/terminal` prefix on port 7681)
			const req1 = new Request(
				"http://localhost/route/ws-1/terminal/sub/path?foo=bar",
				{
					method: "GET",
				},
			);
			const resp1 = await handleWebRequest(req1);
			expect(resp1.status).toBe(200);
			// The URL prefix `/terminal` should be stripped: `/terminal/sub/path` -> `/sub/path`
			expect(lastRequestUrl).toBe("http://10.0.0.5:7681/sub/path?foo=bar");

			// Scenario 2: Access webhook endpoint with GET (fails method match check, should fallback to default port 8080 and keep prefix)
			const req2 = new Request("http://localhost/route/ws-1/api/webhook/test", {
				method: "GET",
			});
			const resp2 = await handleWebRequest(req2);
			expect(resp2.status).toBe(200);
			expect(lastRequestUrl).toBe("http://10.0.0.5:8080/api/webhook/test");

			// Scenario 3: Access webhook endpoint with POST (matches method check, routes to port 8082 and strips prefix)
			const req3 = new Request(
				"http://localhost/route/ws-1/api/webhook/test?abc=123",
				{
					method: "POST",
					body: "data",
				},
			);
			const resp3 = await handleWebRequest(req3);
			expect(resp3.status).toBe(200);
			expect(lastRequestUrl).toBe("http://10.0.0.5:8082/test?abc=123");

			// Scenario 4: With BASE_URL set
			process.env.BASE_URL = "/gateway/no-crd";
			await resetMcpServer(undefined, false, k8sContext); // Reset to pick up new BASE_URL

			const req4 = new Request(
				"http://localhost/gateway/no-crd/route/ws-1/terminal/sub/path?foo=bar",
				{
					method: "GET",
				},
			);
			const resp4 = await handleWebRequest(req4);
			expect(resp4.status).toBe(200);
			expect(lastRequestUrl).toBe("http://10.0.0.5:7681/sub/path?foo=bar");
		} finally {
			globalThis.fetch = originalFetch;
			delete process.env.BASE_URL;
			await resetMcpServer(undefined, false, k8sContext); // Reset to clear BASE_URL
		}
	});

	test("Routing proxy - authenticates with Cookie header and sets Set-Cookie", async () => {
		process.env.AUTH_ENABLED = "true";
		mockListNamespacedPod.mockResolvedValue({
			items: [
				{
					metadata: {
						name: "ws-userabc-ws-1",
						labels: {
							"nogoo9/user-sub": "user-abc",
						},
						annotations: {
							"nogoo9/workspace-port": "8080",
						},
					},
					status: {
						phase: "Running",
						podIP: "10.0.0.5",
					},
				},
			],
		});

		// Create a mock token
		const header = { alg: "RS256" };
		const payload = {
			sub: "user-abc",
			aud: "http://localhost",
			exp: Math.floor(Date.now() / 1000) + 3600,
		};
		const token =
			Buffer.from(JSON.stringify(header)).toString("base64url") +
			"." +
			Buffer.from(JSON.stringify(payload)).toString("base64url") +
			".sig";

		process.env.JWT_VERIFICATION_REQUIRED = "false";

		const originalFetch = globalThis.fetch;
		const mockFetch = mock((_url: string, _init?: any) => {
			return Promise.resolve(
				new Response("proxied-response-body", {
					status: 200,
					headers: { "X-Proxy-Header": "yes" },
				}),
			);
		});
		globalThis.fetch = mockFetch as any;

		try {
			const req = new Request("http://localhost/route/ws-1/subpath", {
				method: "GET",
				headers: {
					Cookie: `nocr_token=${token}`,
				},
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(200);
			const setCookies =
				typeof resp.headers.getSetCookie === "function"
					? resp.headers.getSetCookie()
					: resp.headers.get("Set-Cookie")?.split(",") || [];
			const tokenCookie = setCookies.find((c) => c.includes("nocr_token="));
			expect(tokenCookie).toContain(`nocr_token=${token}`);
			expect(tokenCookie).toContain("Path=/route/ws-1/");
			expect(mockFetch).toHaveBeenCalled();
		} finally {
			globalThis.fetch = originalFetch;
			delete process.env.AUTH_ENABLED;
			delete process.env.JWT_VERIFICATION_REQUIRED;
		}
	});

	test("GET /.well-known/oauth-protected-resource metadata endpoint", async () => {
		const req = new Request(
			"http://localhost/.well-known/oauth-protected-resource",
			{ method: "GET" },
		);
		const resp = await handleWebRequest(req);
		expect(resp.status).toBe(200);
		const body = await resp.json();
		expect(body.resource).toBe("http://localhost");
		expect(body.scopes_supported).toEqual(["mcp"]);
		expect(body.bearer_methods_supported).toEqual(["header"]);

		// Test dynamic scopes response
		process.env.AUTH_REQUIRED_READ_SCOPE = "custom:read";
		process.env.AUTH_REQUIRED_WRITE_SCOPE = "custom:write";
		try {
			const req2 = new Request(
				"http://localhost/.well-known/oauth-protected-resource",
				{ method: "GET" },
			);
			const resp2 = await handleWebRequest(req2);
			expect(resp2.status).toBe(200);
			const body2 = await resp2.json();
			expect(body2.scopes_supported).toEqual(["custom:read", "custom:write"]);
		} finally {
			delete process.env.AUTH_REQUIRED_READ_SCOPE;
			delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
		}
	});

	test("Request returns 401 with Link and WWW-Authenticate headers when AUTH_ENABLED and token is missing", async () => {
		process.env.AUTH_ENABLED = "true";
		try {
			const req = new Request("http://localhost/mcp", { method: "GET" });
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(401);
			expect(resp.headers.get("WWW-Authenticate")).toContain(
				"resource_metadata=",
			);
			expect(resp.headers.get("Link")).toContain(
				'rel="oauth-protected-resource"',
			);
		} finally {
			delete process.env.AUTH_ENABLED;
		}
	});

	test("JWT verification fails if token audience is mismatched", async () => {
		process.env.AUTH_ENABLED = "true";
		process.env.JWT_VERIFICATION_REQUIRED = "false";
		try {
			// Create a token with a mismatched audience
			const header = { alg: "RS256" };
			const payload = {
				sub: "test-user",
				aud: "http://mismatched-aud",
				exp: Math.floor(Date.now() / 1000) + 3600,
			};
			const token =
				Buffer.from(JSON.stringify(header)).toString("base64url") +
				"." +
				Buffer.from(JSON.stringify(payload)).toString("base64url") +
				".sig";

			const req = new Request("http://localhost/mcp", {
				method: "GET",
				headers: { Authorization: `Bearer ${token}` },
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(401);
			expect(await resp.text()).toContain("audience");
		} finally {
			delete process.env.AUTH_ENABLED;
			delete process.env.JWT_VERIFICATION_REQUIRED;
		}
	});

	test("Token verification via Introspection endpoint", async () => {
		process.env.AUTH_ENABLED = "true";
		process.env.INTROSPECTION_ENDPOINT = "https://auth.company.com/introspect";
		process.env.OAUTH_CLIENT_ID = "mcp-server";

		const originalFetch = globalThis.fetch;
		const mockFetch = mock((url: string, init: any) => {
			if (url === "https://auth.company.com/introspect") {
				const bodyParams = new URLSearchParams(init.body);
				if (
					bodyParams.get("token") === "opaque-access-token" &&
					bodyParams.get("client_id") === "mcp-server"
				) {
					return Promise.resolve(
						Response.json({
							active: true,
							sub: "introspection-user",
							aud: "http://localhost",
							scope: "mcp",
						}),
					);
				}
			}
			return Promise.resolve(new Response("Not Found", { status: 404 }));
		});
		globalThis.fetch = mockFetch as any;

		try {
			const req = new Request("http://localhost/mcp", {
				method: "GET",
				headers: {
					Authorization: "Bearer opaque-access-token",
					Accept: "text/event-stream",
				},
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(400); // Introspection passed, failed on missing session ID
		} finally {
			globalThis.fetch = originalFetch;
			delete process.env.AUTH_ENABLED;
			delete process.env.INTROSPECTION_ENDPOINT;
			delete process.env.OAUTH_CLIENT_ID;
		}
	});

	describe("HTTP and Proxy Scope Enforcement", () => {
		beforeEach(() => {
			process.env.AUTH_ENABLED = "true";
			process.env.JWT_VERIFICATION_REQUIRED = "false";
			process.env.AUTH_REQUIRED_READ_SCOPE = "mcp:read";
			process.env.AUTH_REQUIRED_WRITE_SCOPE = "mcp:write";
		});

		afterEach(() => {
			delete process.env.AUTH_ENABLED;
			delete process.env.JWT_VERIFICATION_REQUIRED;
			delete process.env.AUTH_REQUIRED_READ_SCOPE;
			delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
		});

		function createMockToken(payload: any) {
			const header = { alg: "RS256" };
			const p = {
				aud: "http://localhost",
				exp: Math.floor(Date.now() / 1000) + 3600,
				...payload,
			};
			return (
				Buffer.from(JSON.stringify(header)).toString("base64url") +
				"." +
				Buffer.from(JSON.stringify(p)).toString("base64url") +
				".sig"
			);
		}

		test("GET /permissions blocks if read scope is missing", async () => {
			const token = createMockToken({ sub: "user-1", scope: "openid" });
			const req = new Request("http://localhost/permissions", {
				method: "GET",
				headers: { Authorization: `Bearer ${token}` },
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(403);
			expect(await resp.text()).toContain(
				"Forbidden: Missing required scope: mcp:read",
			);
		});

		test("GET /permissions allows if read scope is present", async () => {
			const token = createMockToken({ sub: "user-1", scope: "mcp:read" });
			const req = new Request("http://localhost/permissions", {
				method: "GET",
				headers: { Authorization: `Bearer ${token}` },
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(200);
		});

		test("Proxy GET blocks if read scope is missing", async () => {
			const token = createMockToken({ sub: "user-1", scope: "mcp:write" });
			const req = new Request("http://localhost/route/ws-1/subpath", {
				method: "GET",
				headers: { Authorization: `Bearer ${token}` },
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(403);
			expect(await resp.text()).toContain(
				"Forbidden: Missing required scope: mcp:read",
			);
		});

		test("Proxy POST blocks if write scope is missing", async () => {
			const token = createMockToken({ sub: "user-1", scope: "mcp:read" });
			const req = new Request("http://localhost/route/ws-1/subpath", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			const resp = await handleWebRequest(req);
			expect(resp.status).toBe(403);
			expect(await resp.text()).toContain(
				"Forbidden: Missing required scope: mcp:write",
			);
		});

		test("Proxy POST allows if write scope is present", async () => {
			mockListNamespacedPod.mockResolvedValue({
				items: [
					{
						metadata: {
							name: "ws-user1-ws-1",
							labels: {
								"nogoo9/user-sub": "user-1",
							},
							annotations: {
								"nogoo9/workspace-port": "8080",
							},
						},
						status: {
							phase: "Running",
							podIP: "10.0.0.5",
						},
					},
				],
			});

			const originalFetch = globalThis.fetch;
			const mockFetch = mock(() => {
				return Promise.resolve(new Response("proxied", { status: 200 }));
			});
			globalThis.fetch = mockFetch as any;

			try {
				const token = createMockToken({ sub: "user-1", scope: "mcp:write" });
				const req = new Request("http://localhost/route/ws-1/subpath", {
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
				});
				const resp = await handleWebRequest(req);
				expect(resp.status).toBe(200);
				expect(await resp.text()).toBe("proxied");
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});

	test("logout endpoint clears cookies for active workspaces", async () => {
		mockListNamespacedPod.mockResolvedValue({
			items: [
				{
					metadata: {
						labels: {
							"nogoo9/workspace-id": "ws-123",
						},
					},
				},
				{
					metadata: {
						labels: {
							"nogoo9/workspace-id": "ws-456",
						},
					},
				},
			],
		});

		const req = new Request("http://localhost/logout", { method: "POST" });
		const resp = await handleWebRequest(req);
		expect(resp.status).toBe(200);

		const cookies =
			typeof resp.headers.getSetCookie === "function"
				? resp.headers.getSetCookie()
				: resp.headers.get("Set-Cookie")?.split(",") || [];

		expect(cookies.length).toBeGreaterThanOrEqual(3);

		const paths = cookies
			.map((c) => {
				const match = c.match(/Path=([^;]+)/i);
				return match ? match[1] : null;
			})
			.filter(Boolean);

		expect(paths).toContain("/route/ws-123/");
		expect(paths).toContain("/route/ws-456/");
		expect(paths).toContain("/");

		// Both nocr_token and nocr_sess cookies should be cleared
		const tokenCookies = cookies.filter((c) => c.includes("nocr_token="));
		const sessCookies = cookies.filter((c) => c.includes("nocr_sess="));
		expect(tokenCookies.length).toBeGreaterThanOrEqual(1);
		expect(sessCookies.length).toBeGreaterThanOrEqual(1);

		for (const cookie of cookies) {
			expect(cookie).toContain("Max-Age=0");
		}
	});

	test("serves custom themes list and files", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");
		const testThemesDir = path.resolve("./test-themes-temp");

		if (!fs.existsSync(testThemesDir)) {
			fs.mkdirSync(testThemesDir);
		}
		fs.writeFileSync(
			path.join(testThemesDir, "test-theme.css"),
			"/* Name: Test Theme */\n:root { --bg-color: #fff; }",
		);

		process.env.THEMES_DIR = testThemesDir;

		try {
			// 1. Test themes list
			const reqList = new Request("http://localhost/api/themes", {
				method: "GET",
			});
			const respList = await handleWebRequest(reqList);
			expect(respList.status).toBe(200);
			const list = await respList.json();
			// Default theme Claude is always present, plus our test-theme
			expect(list).toContainEqual({ id: "default", name: "Claude" });
			expect(list).toContainEqual({ id: "test-theme", name: "Test Theme" });

			// 2. Test theme file retrieval
			const reqFile = new Request("http://localhost/api/themes/test-theme", {
				method: "GET",
			});
			const respFile = await handleWebRequest(reqFile);
			expect(respFile.status).toBe(200);
			expect(respFile.headers.get("Content-Type")).toContain("text/css");
			expect(await respFile.text()).toContain("/* Name: Test Theme */");

			// 3. Test default theme retrieval (returns empty CSS)
			const reqDefault = new Request("http://localhost/api/themes/default", {
				method: "GET",
			});
			const respDefault = await handleWebRequest(reqDefault);
			expect(respDefault.status).toBe(200);
			expect(respDefault.headers.get("Content-Type")).toContain("text/css");
			expect(await respDefault.text()).toBe("");

			// 4. Test invalid theme ID validation
			const reqInvalid = new Request(
				"http://localhost/api/themes/invalid-theme$@",
				{ method: "GET" },
			);
			const respInvalid = await handleWebRequest(reqInvalid);
			expect(respInvalid.status).toBe(400); // Because /^[a-zA-Z0-9_-]+$/ check fails

			// 5. Test missing theme ID
			const reqMissing = new Request(
				"http://localhost/api/themes/missing-theme",
				{ method: "GET" },
			);
			const respMissing = await handleWebRequest(reqMissing);
			expect(respMissing.status).toBe(404);
		} finally {
			delete process.env.THEMES_DIR;
			try {
				fs.rmSync(testThemesDir, { recursive: true, force: true });
			} catch (_) {}
		}
	});

	test("serves built-in themes as fallback", async () => {
		const fs = await import("node:fs");
		const pathMod = await import("node:path");
		const emptyDir = pathMod.resolve("./test-themes-empty");
		if (!fs.existsSync(emptyDir)) {
			fs.mkdirSync(emptyDir);
		}
		process.env.THEMES_DIR = emptyDir;

		try {
			// 1. Themes list should include built-in themes
			const reqList = new Request("http://localhost/api/themes", {
				method: "GET",
			});
			const respList = await handleWebRequest(reqList);
			expect(respList.status).toBe(200);
			const list = (await respList.json()) as Array<{
				id: string;
				name: string;
			}>;
			const ids = list.map((t) => t.id);
			expect(ids).toContain("antigravity");
			expect(ids).toContain("dracula");
			expect(ids).toContain("nord");

			// 2. Retrieve a built-in theme by ID (fallback from empty custom dir)
			const reqFile = new Request("http://localhost/api/themes/antigravity", {
				method: "GET",
			});
			const respFile = await handleWebRequest(reqFile);
			expect(respFile.status).toBe(200);
			expect(respFile.headers.get("Content-Type")).toContain("text/css");
			const css = await respFile.text();
			expect(css.length).toBeGreaterThan(0);
		} finally {
			delete process.env.THEMES_DIR;
			try {
				fs.rmSync(emptyDir, { recursive: true, force: true });
			} catch (_) {}
		}
	});

	test("serves custom themes list and files from ConfigMap", async () => {
		mockReadNamespacedConfigMap.mockResolvedValue({
			data: {
				"cm-theme.css": "/* Name: CM Theme */\n:root { --bg-color: #000; }",
			},
		});

		process.env.THEMES_CONFIGMAP = "mcp-themes";
		process.env.NAMESPACE = "nogoo9";

		try {
			// 1. Test themes list from ConfigMap
			const reqList = new Request("http://localhost/api/themes", {
				method: "GET",
			});
			const respList = await handleWebRequest(reqList);
			expect(respList.status).toBe(200);
			const list = await respList.json();
			expect(list).toContainEqual({ id: "default", name: "Claude" });
			expect(list).toContainEqual({ id: "cm-theme", name: "CM Theme" });

			// Verify mock was called with correct configmap name and namespace
			expect(mockReadNamespacedConfigMap).toHaveBeenCalledWith({
				name: "mcp-themes",
				namespace: "nogoo9",
			});

			// 2. Test theme file retrieval from ConfigMap
			const reqFile = new Request("http://localhost/api/themes/cm-theme", {
				method: "GET",
			});
			const respFile = await handleWebRequest(reqFile);
			expect(respFile.status).toBe(200);
			expect(respFile.headers.get("Content-Type")).toContain("text/css");
			expect(await respFile.text()).toContain("/* Name: CM Theme */");

			// 3. Test nonexistent theme returns 404
			const reqMissing = new Request(
				"http://localhost/api/themes/nonexistent-theme",
				{ method: "GET" },
			);
			const respMissing = await handleWebRequest(reqMissing);
			expect(respMissing.status).toBe(404);
		} finally {
			delete process.env.THEMES_CONFIGMAP;
			delete process.env.NAMESPACE;
		}
	});

	test("serves documentation static files and prevents path traversal", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");
		const testDocsDir = path.resolve("./test-docs-temp");

		if (!fs.existsSync(testDocsDir)) {
			fs.mkdirSync(testDocsDir);
		}
		fs.writeFileSync(
			path.join(testDocsDir, "index.html"),
			"<html>Docs Home</html>",
		);
		fs.writeFileSync(
			path.join(testDocsDir, "style.css"),
			"body { color: red; }",
		);
		fs.writeFileSync(
			path.join(testDocsDir, "guide.html"),
			"<html>Guide</html>",
		);

		process.env.DOCS_DIR = testDocsDir;

		try {
			// 1. Test index serving
			const reqIndex = new Request("http://localhost/docs", { method: "GET" });
			const respIndex = await handleWebRequest(reqIndex);
			expect(respIndex.status).toBe(200);
			expect(respIndex.headers.get("Content-Type")).toContain("text/html");
			expect(await respIndex.text()).toBe("<html>Docs Home</html>");

			// 2. Test slash index serving
			const reqIndexSlash = new Request("http://localhost/docs/", {
				method: "GET",
			});
			const respIndexSlash = await handleWebRequest(reqIndexSlash);
			expect(respIndexSlash.status).toBe(200);
			expect(await respIndexSlash.text()).toBe("<html>Docs Home</html>");

			// 3. Test CSS serving
			const reqCss = new Request("http://localhost/docs/style.css", {
				method: "GET",
			});
			const respCss = await handleWebRequest(reqCss);
			expect(respCss.status).toBe(200);
			expect(respCss.headers.get("Content-Type")).toContain("text/css");
			expect(await respCss.text()).toBe("body { color: red; }");

			// 4. Test client-side route .html fallback (request /docs/guide should map to guide.html)
			const reqGuide = new Request("http://localhost/docs/guide", {
				method: "GET",
			});
			const respGuide = await handleWebRequest(reqGuide);
			expect(respGuide.status).toBe(200);
			expect(respGuide.headers.get("Content-Type")).toContain("text/html");
			expect(await respGuide.text()).toBe("<html>Guide</html>");

			// 5. Test path traversal prevention
			const reqTraversal = new Request(
				"http://localhost/docs/%2e%2e%2fpackage.json",
				{ method: "GET" },
			);
			const respTraversal = await handleWebRequest(reqTraversal);
			expect(respTraversal.status).toBe(403);
			expect(await respTraversal.text()).toBe("Forbidden");

			// 6. Test not found
			const reqNotFound = new Request("http://localhost/docs/missing.html", {
				method: "GET",
			});
			const respNotFound = await handleWebRequest(reqNotFound);
			expect(respNotFound.status).toBe(404);
		} finally {
			delete process.env.DOCS_DIR;
			try {
				fs.rmSync(testDocsDir, { recursive: true, force: true });
			} catch (_) {}
		}
	});

	test("startHttpServer uses process.env.HOST", async () => {
		let passedOptions: any = null;
		listenMock = function (this: any, options: any) {
			passedOptions = options;
			return Promise.resolve(this.server);
		};

		process.env.HOST = "127.0.0.1";
		try {
			const { startHttpServer } = await import("./server.js");
			await startHttpServer(k8sContext);
			expect(passedOptions).not.toBeNull();
			expect(passedOptions.host).toBe("127.0.0.1");
		} finally {
			listenMock = null;
			delete process.env.HOST;
		}
	});

	test("CORS headers are correctly configured via environment variables", async () => {
		process.env.CORS_ALLOWED_ORIGIN = "http://example.com";
		process.env.CORS_ALLOWED_METHODS = "GET, POST";
		process.env.CORS_ALLOWED_HEADERS = "X-Custom-Header";
		process.env.CORS_ALLOW_CREDENTIALS = "true";
		process.env.CORS_EXPOSED_HEADERS = "X-Exposed-Header";
		process.env.CORS_MAX_AGE = "86400";

		try {
			const { createFastifyApp } = await import("./server.js");
			const app = await createFastifyApp();
			const resp = await app.inject({
				method: "OPTIONS",
				url: "/",
			});
			expect(resp.statusCode).toBe(204);
			expect(resp.headers["access-control-allow-origin"]).toBe(
				"http://example.com",
			);
			expect(resp.headers["access-control-allow-methods"]).toBe("GET, POST");
			expect(resp.headers["access-control-allow-headers"]).toBe(
				"X-Custom-Header",
			);
			expect(resp.headers["access-control-allow-credentials"]).toBe("true");
			expect(resp.headers["access-control-expose-headers"]).toBe(
				"X-Exposed-Header",
			);
			expect(resp.headers["access-control-max-age"]).toBe("86400");
		} finally {
			delete process.env.CORS_ALLOWED_ORIGIN;
			delete process.env.CORS_ALLOWED_METHODS;
			delete process.env.CORS_ALLOWED_HEADERS;
			delete process.env.CORS_ALLOW_CREDENTIALS;
			delete process.env.CORS_EXPOSED_HEADERS;
			delete process.env.CORS_MAX_AGE;
		}
	});

	test("createFastifyApp passes ca option to https server configuration", async () => {
		const { createFastifyApp } = await import("./server.js");
		const app = await createFastifyApp({
			cert: "FAKE_CERT",
			key: "FAKE_KEY",
			ca: "FAKE_CA",
		});
		expect(app).toBeDefined();
	});

	test("WebSocket routing proxy - forwards upgrade request and pipes data", async () => {
		const mockUpstream = net.createServer((socket) => {
			socket.on("data", (data) => {
				const requestStr = data.toString();
				if (requestStr.toLowerCase().includes("upgrade: websocket")) {
					socket.write(
						"HTTP/1.1 101 Switching Protocols\r\n" +
							"Upgrade: websocket\r\n" +
							"Connection: Upgrade\r\n" +
							"\r\n" +
							"hello from upstream websocket",
					);
				}
			});
		});

		await new Promise<void>((resolve) =>
			mockUpstream.listen(0, "127.0.0.1", () => resolve()),
		);

		const upstreamPort = (mockUpstream.address() as net.AddressInfo).port;

		mockListNamespacedPod.mockResolvedValue({
			items: [
				{
					metadata: {
						name: "ws-anonymous-ws-1",
						labels: {
							"nogoo9/user-sub": "anonymous",
						},
						annotations: {
							"nogoo9/workspace-port": String(upstreamPort),
						},
					},
					status: {
						phase: "Running",
						podIP: "127.0.0.1",
					},
				},
			],
		});

		const initialReq = new Request("http://localhost/healthz", {
			method: "GET",
		});
		await handleWebRequest(initialReq);

		let resolvePromise: (value: string) => void;
		let _rejectPromise: (err: Error) => void;
		const responsePromise = new Promise<string>((resolve, reject) => {
			resolvePromise = resolve;
			_rejectPromise = reject;
		});

		const mockSocket = new (class extends EventEmitter {
			writable = true;
			destroyed = false;
			write(chunk: any) {
				const str = chunk.toString();
				if (str.includes("101 Switching Protocols")) {
					resolvePromise(str);
				}
				return true;
			}
			destroy() {
				this.destroyed = true;
				this.emit("close");
			}
		})();

		const mockReq = {
			url: "/route/ws-1/socket-path?foo=bar",
			method: "GET",
			httpVersion: "1.1",
			headers: {
				host: "localhost",
				upgrade: "websocket",
				connection: "Upgrade",
			},
		};

		globalApp!.server.emit(
			"upgrade",
			mockReq as any,
			mockSocket as any,
			Buffer.alloc(0),
		);

		try {
			const response = await responsePromise;
			expect(response).toContain("101 Switching Protocols");
			expect(response).toContain("hello from upstream websocket");
		} finally {
			mockSocket.destroy();
			await new Promise<void>((resolve) => mockUpstream.close(() => resolve()));
		}
	});
});
