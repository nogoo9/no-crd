import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as k8s from "@kubernetes/client-node";
import { initK8sContext, type K8sContext } from "~/k8s/index.js";
import { handleWebRequest, resetMcpServer } from "./server.js";

const mockCreateSelfSubjectAccessReview = mock();
const mockAuthApi = {
	createSelfSubjectAccessReview: mockCreateSelfSubjectAccessReview,
} as any;

const mockListNamespacedPod = mock();
const mockCoreApi = {
	listNamespacedPod: mockListNamespacedPod,
} as any;

describe("HTTP/SSE Server - Stateful and Stateless MCP Tool Calls", () => {
	let testKc: k8s.KubeConfig;
	let k8sContext: K8sContext;
	let originalMakeApiClient: any;

	beforeEach(async () => {
		mockCreateSelfSubjectAccessReview.mockReset();
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

	test("startHttpServer uses process.env.HOST", async () => {
		const originalServe = Bun.serve;
		let passedOptions: any = null;
		(Bun as any).serve = (options: any) => {
			passedOptions = options;
			return {
				hostname: options.hostname || "localhost",
				port: options.port || 3000,
				stop: () => {},
			} as any;
		};

		process.env.HOST = "127.0.0.1";
		try {
			const { startHttpServer } = await import("./server.js");
			await startHttpServer(k8sContext);
			expect(passedOptions).not.toBeNull();
			expect(passedOptions.hostname).toBe("127.0.0.1");
		} finally {
			(Bun as any).serve = originalServe;
			delete process.env.HOST;
		}
	});
});
