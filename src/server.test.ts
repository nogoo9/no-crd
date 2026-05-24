import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as k8s from "@kubernetes/client-node";
import { initK8sContext, type K8sContext } from "~/k8s/index.js";
import { handleWebRequest, resetMcpServer } from "./server.js";

const mockCreateSelfSubjectAccessReview = mock();
// biome-ignore lint/suspicious/noExplicitAny: Mock API needs generic properties
const mockAuthApi = {
	createSelfSubjectAccessReview: mockCreateSelfSubjectAccessReview,
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
		// biome-ignore lint/suspicious/noExplicitAny: override internal method for testing
		testKc.makeApiClient = (apiClass: any) => {
			if (apiClass === k8s.AuthorizationV1Api) {
				return mockAuthApi;
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
});
