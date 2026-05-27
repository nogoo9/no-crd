import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from "bun:test";

// Capture registered tools in a Map to avoid bracket notation lint issues
const registeredTools = new Map<string, (...args: any[]) => any>();

mock.module("@modelcontextprotocol/ext-apps/server", () => {
	return {
		registerAppTool: (
			_server: any,
			name: string,
			_schema: any,
			handler: any,
		) => {
			registeredTools.set(name, handler);
		},
	};
});

// Mock K8s dependencies
const coreApi = {
	listNamespacedPod: async () => ({ items: [] }),
	readNamespacedPod: async () => ({ metadata: {} }),
	deleteNamespacedPod: async () => ({}),
	patchNamespacedPod: async () => ({ metadata: {} }),
	readNamespacedPodLog: async () => "mock-logs",
};
const kc = {
	getCurrentCluster: () => null,
};
const k8sContext = {
	coreApi,
	kc,
} as any;

// Import target under test (needs mock to be registered first)
import { registerPodTools } from "./pods.js";

describe("Pods MCP Tools", () => {
	beforeEach(() => {
		registeredTools.clear();
		// Register pod tools
		registerPodTools({} as any, k8sContext, [
			"list_pods",
			"get_pod",
			"create_pod",
			"delete_pod",
			"patch_pod",
			"get_pod_logs",
		]);
		process.env.AUTH_ENABLED = "false";
		delete process.env.AUTH_SUB_JSONPATH;
		delete process.env.AUTH_ADMIN_JSONPATH;
		delete process.env.AUTH_ADMIN_ROLE;
		delete process.env.AUTH_REQUIRED_READ_SCOPE;
		delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
		delete process.env.AUTH_SCOPE_JSONPATH;
	});

	afterEach(() => {
		spyOn(coreApi, "listNamespacedPod").mockRestore();
		spyOn(coreApi, "readNamespacedPod").mockRestore();
		spyOn(coreApi, "deleteNamespacedPod").mockRestore();
		spyOn(coreApi, "patchNamespacedPod").mockRestore();
		spyOn(coreApi, "readNamespacedPodLog").mockRestore();
	});

	test("registers all pod tools", () => {
		expect(registeredTools.has("list_pods")).toBe(true);
		expect(registeredTools.has("get_pod")).toBe(true);
		expect(registeredTools.has("create_pod")).toBe(true);
		expect(registeredTools.has("delete_pod")).toBe(true);
		expect(registeredTools.has("patch_pod")).toBe(true);
		expect(registeredTools.has("get_pod_logs")).toBe(true);
	});

	describe("list_pods", () => {
		test("lists all pods normally when auth is disabled", async () => {
			const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [],
			} as any);

			const handler = registeredTools.get("list_pods")!;
			await handler({ namespace: "default" });

			expect(listSpy).toHaveBeenCalledTimes(1);
			const firstCall = listSpy.mock.calls[0] as any;
			expect(firstCall[0].labelSelector).toBeUndefined();
		});

		test("appends user sub filter when auth is enabled and user is not admin", async () => {
			process.env.AUTH_ENABLED = "true";
			const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [],
			} as any);

			const handler = registeredTools.get("list_pods")!;
			await handler({
				namespace: "default",
				jwtPayload: { sub: "user-abc" },
			});

			expect(listSpy).toHaveBeenCalledTimes(1);
			const firstCall = listSpy.mock.calls[0] as any;
			expect(firstCall[0].labelSelector).toBe("nogoo9/user-sub=user-abc");
		});

		test("does not append user sub filter when user is admin", async () => {
			process.env.AUTH_ENABLED = "true";
			const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [],
			} as any);

			const handler = registeredTools.get("list_pods")!;
			await handler({
				namespace: "default",
				jwtPayload: {
					sub: "admin-user",
					realm_access: { roles: ["nogoo9-admin"] },
				},
			});

			expect(listSpy).toHaveBeenCalledTimes(1);
			const firstCall = listSpy.mock.calls[0] as any;
			expect(firstCall[0].labelSelector).toBeUndefined();
		});
	});

	describe("get_pod", () => {
		test("allows reading any pod when auth is disabled", async () => {
			const readSpy = spyOn(coreApi, "readNamespacedPod").mockResolvedValue({
				metadata: { name: "pod-1", labels: { "nogoo9/user-sub": "someone" } },
			} as any);

			const handler = registeredTools.get("get_pod")!;
			const result = await handler({ name: "pod-1" });

			expect(readSpy).toHaveBeenCalledTimes(1);
			expect(result.isError).toBeUndefined();
		});

		test("blocks reading other user's pod when auth is enabled", async () => {
			process.env.AUTH_ENABLED = "true";
			spyOn(coreApi, "readNamespacedPod").mockResolvedValue({
				metadata: {
					name: "pod-1",
					labels: { "nogoo9/user-sub": "someone-else" },
				},
			} as any);

			const handler = registeredTools.get("get_pod")!;
			const result = await handler({
				name: "pod-1",
				jwtPayload: { sub: "user-abc" },
			});

			expect(result.isError).toBe(true);
			expect(result.message).toContain("Pod pod-1 not found or access denied");
		});

		test("allows reading other user's pod when admin", async () => {
			process.env.AUTH_ENABLED = "true";
			const readSpy = spyOn(coreApi, "readNamespacedPod").mockResolvedValue({
				metadata: {
					name: "pod-1",
					labels: { "nogoo9/user-sub": "someone-else" },
				},
			} as any);

			const handler = registeredTools.get("get_pod")!;
			const result = await handler({
				name: "pod-1",
				jwtPayload: {
					sub: "admin-user",
					realm_access: { roles: ["nogoo9-admin"] },
				},
			});

			expect(readSpy).toHaveBeenCalledTimes(1);
			expect(result.isError).toBeUndefined();
		});
	});

	describe("delete_pod", () => {
		test("allows deleting other user's pod when admin", async () => {
			process.env.AUTH_ENABLED = "true";
			const readSpy = spyOn(coreApi, "readNamespacedPod").mockResolvedValue({
				metadata: { name: "pod-1", labels: { "nogoo9/user-sub": "user-abc" } },
			} as any);
			const deleteSpy = spyOn(coreApi, "deleteNamespacedPod").mockResolvedValue(
				{} as any,
			);

			const handler = registeredTools.get("delete_pod")!;
			const result = await handler({
				name: "pod-1",
				jwtPayload: {
					sub: "admin-user",
					realm_access: { roles: ["nogoo9-admin"] },
				},
			});

			expect(readSpy).toHaveBeenCalledTimes(0);
			expect(deleteSpy).toHaveBeenCalledTimes(1);
			expect(result.isError).toBeUndefined();
		});

		test("blocks deleting other user's pod when not admin", async () => {
			process.env.AUTH_ENABLED = "true";
			spyOn(coreApi, "readNamespacedPod").mockResolvedValue({
				metadata: {
					name: "pod-1",
					labels: { "nogoo9/user-sub": "someone-else" },
				},
			} as any);
			const deleteSpy = spyOn(coreApi, "deleteNamespacedPod");

			const handler = registeredTools.get("delete_pod")!;
			const result = await handler({
				name: "pod-1",
				jwtPayload: { sub: "user-abc" },
			});

			expect(deleteSpy).toHaveBeenCalledTimes(0);
			expect(result.isError).toBe(true);
			expect(result.message).toContain("Pod pod-1 not found or access denied");
		});
	});

	describe("scope checks", () => {
		beforeEach(() => {
			process.env.AUTH_ENABLED = "true";
			process.env.AUTH_REQUIRED_READ_SCOPE = "mcp:read";
			process.env.AUTH_REQUIRED_WRITE_SCOPE = "mcp:write";
		});

		afterEach(() => {
			delete process.env.AUTH_REQUIRED_READ_SCOPE;
			delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
		});

		test("list_pods blocks if read scope is missing", async () => {
			const handler = registeredTools.get("list_pods")!;
			const result = await handler({
				namespace: "default",
				jwtPayload: { sub: "user-abc", scope: "openid profile" },
			});
			expect(result.isError).toBe(true);
			expect(result.message).toContain(
				"Forbidden: Missing required scope: mcp:read",
			);
		});

		test("list_pods allows if read scope is present", async () => {
			spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [],
			} as any);

			const handler = registeredTools.get("list_pods")!;
			const result = await handler({
				namespace: "default",
				jwtPayload: { sub: "user-abc", scope: "openid mcp:read" },
			});
			expect(result.isError).toBeUndefined();
		});

		test("create_pod blocks if write scope is missing", async () => {
			const handler = registeredTools.get("create_pod")!;
			const result = await handler({
				name: "my-pod",
				namespace: "default",
				jwtPayload: { sub: "user-abc", scope: "openid mcp:read" },
				containers: [],
			});
			expect(result.isError).toBe(true);
			expect(result.message).toContain(
				"Forbidden: Missing required scope: mcp:write",
			);
		});
	});
});
