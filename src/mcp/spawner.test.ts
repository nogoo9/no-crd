import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";

// Capture registered tools in a Map to avoid bracket notation lint issues
const registeredTools = new Map<string, (...args: any[]) => any>();

import * as extApps from "@modelcontextprotocol/ext-apps/server";

// Mock K8s dependencies
const coreApi = {
	listNamespacedPod: async () => ({ items: [] }),
	createNamespacedPod: async (args: any) => ({ body: args.body }),
	readNamespacedConfigMap: async (_args: any) => ({}) as any,
};
const kc = {
	getCurrentCluster: () => null,
};
const k8sContext = {
	coreApi,
	kc,
} as any;

// Import target under test (needs mock to be registered first)
import { registerSpawnerTools } from "./spawner.js";

describe("Spawner MCP Tools - get_workspace", () => {
	let registerSpy: any;

	beforeEach(() => {
		registeredTools.clear();
		registerSpy = spyOn(extApps, "registerAppTool").mockImplementation(
			(_server: any, name: string, _schema: any, handler: any) => {
				registeredTools.set(name, handler);
				return {} as any;
			},
		);
		// Register the spawner tools
		registerSpawnerTools({} as any, k8sContext, [
			"get_workspace",
			"list_workspaces",
			"stop_workspace",
			"spawn_workspace",
		]);
		process.env.AUTH_ENABLED = "false";
		delete process.env.AUTH_SUB_JSONPATH;
		delete process.env.AUTH_REQUIRED_READ_SCOPE;
		delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
		delete process.env.AUTH_SCOPE_JSONPATH;
	});

	afterEach(() => {
		registerSpy.mockRestore();
		spyOn(coreApi, "listNamespacedPod").mockRestore();
	});

	test("registers get_workspace tool", () => {
		expect(registeredTools.has("get_workspace")).toBe(true);
	});

	test("get_workspace returns workspace details (auth disabled)", async () => {
		const mockPod = {
			metadata: {
				name: "ws-pod-123",
				labels: {
					"nogoo9/workspace-id": "ws-123",
					"nogoo9/user-sub": "anonymous",
				},
				annotations: {
					"nogoo9/workspace-port": "8081",
					"nogoo9/preview-path": "/preview",
					"nogoo9/preview-type": "markdown",
					custom: "val",
				},
			},
			spec: {
				containers: [
					{
						name: "agent",
						image: "node:latest",
					},
				],
			},
			status: {
				phase: "Running",
				podIP: "10.244.0.5",
			},
		};

		const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
			items: [mockPod],
		} as any);

		const handler = registeredTools.get("get_workspace");
		expect(handler).toBeDefined();
		const result = await handler!({ id: "ws-123", namespace: "default" });

		expect(listSpy).toHaveBeenCalledTimes(1);
		const firstCall = listSpy.mock.calls[0] as any;
		expect(firstCall[0].labelSelector).toBe(
			"nogoo9/type=workspace,nogoo9/workspace-id=ws-123",
		);

		expect(result.structuredContent).toEqual({
			id: "ws-123",
			name: "ws-pod-123",
			status: "Running",
			podIP: "10.244.0.5",
			port: "8081",
			previewPath: "/preview",
			previewType: "markdown",
			workspacePath: "/preview",
			workspaceType: "markdown",
			templateRef: undefined,
			apis: [],
			userSub: "anonymous",
			annotations: {
				"nogoo9/workspace-port": "8081",
				"nogoo9/preview-path": "/preview",
				"nogoo9/preview-type": "markdown",
				custom: "val",
			},
			labels: {
				"nogoo9/workspace-id": "ws-123",
				"nogoo9/user-sub": "anonymous",
			},
			spec: {
				containers: [
					{
						name: "agent",
						image: "node:latest",
					},
				],
			},
		});
	});

	test("get_workspace enforces user sub check when auth enabled", async () => {
		process.env.AUTH_ENABLED = "true";
		const mockPod = {
			metadata: {
				name: "ws-pod-123",
				labels: {
					"nogoo9/workspace-id": "ws-123",
					"nogoo9/user-sub": "user-456",
				},
				annotations: {},
			},
			status: {
				phase: "Running",
				podIP: "10.244.0.5",
			},
		};

		const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
			items: [mockPod],
		} as any);

		const handler = registeredTools.get("get_workspace");
		expect(handler).toBeDefined();
		const result = await handler!({
			id: "ws-123",
			namespace: "default",
			jwtPayload: { sub: "user-456" },
		});

		expect(listSpy).toHaveBeenCalledTimes(1);
		const firstCall = listSpy.mock.calls[0] as any;
		expect(firstCall[0].labelSelector).toBe(
			"nogoo9/type=workspace,nogoo9/workspace-id=ws-123,nogoo9/user-sub=user-456",
		);
		expect((result.structuredContent as any).id).toBe("ws-123");
	});

	test("get_workspace returns error if not found", async () => {
		spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
			items: [],
		} as any);

		const handler = registeredTools.get("get_workspace");
		expect(handler).toBeDefined();
		const result = await handler!({ id: "nonexistent" });

		expect(result.isError).toBe(true);
		expect(result.message).toContain(
			"Workspace nonexistent not found or access denied",
		);
	});

	test("get_workspace throws error if auth enabled and jwtPayload missing", async () => {
		process.env.AUTH_ENABLED = "true";
		const handler = registeredTools.get("get_workspace");
		expect(handler).toBeDefined();
		const result = await handler!({ id: "ws-123" });

		expect(result.isError).toBe(true);
		expect(result.message).toContain("Unauthorized: jwtPayload required");
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

		test("list_workspaces blocks if read scope is missing", async () => {
			const handler = registeredTools.get("list_workspaces")!;
			const result = await handler({
				namespace: "default",
				jwtPayload: { sub: "user-abc", scope: "openid profile" },
			});
			expect(result.isError).toBe(true);
			expect(result.message).toContain(
				"Forbidden: Missing required scope: mcp:read",
			);
		});

		test("list_workspaces allows if read scope is present", async () => {
			spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [],
			} as any);

			const handler = registeredTools.get("list_workspaces")!;
			const result = await handler({
				namespace: "default",
				jwtPayload: { sub: "user-abc", scope: "openid mcp:read" },
			});
			expect(result.isError).toBeUndefined();
		});

		test("spawn_workspace blocks if write scope is missing", async () => {
			const handler = registeredTools.get("spawn_workspace")!;
			const result = await handler({
				id: "ws-123",
				namespace: "default",
				jwtPayload: { sub: "user-abc", scope: "openid mcp:read" },
				spec: { containers: [] },
			});
			expect(result.isError).toBe(true);
			expect(result.message).toContain(
				"Forbidden: Missing required scope: mcp:write",
			);
		});
	});

	describe("workspace uniqueness and display name", () => {
		afterEach(() => {
			spyOn(coreApi, "listNamespacedPod").mockRestore();
			if ((coreApi as any).createNamespacedPod.mockRestore) {
				spyOn(coreApi, "createNamespacedPod").mockRestore();
			}
		});

		test("spawn_workspace fails if workspace ID already exists", async () => {
			const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [
					{
						metadata: {
							name: "ws-existing-pod",
							labels: { "nogoo9/workspace-id": "ws-dup" },
						},
					},
				],
			} as any);

			const handler = registeredTools.get("spawn_workspace")!;
			const result = await handler({
				id: "ws-dup",
				namespace: "default",
				spec: { containers: [{ name: "agent", image: "node" }] },
			});

			expect(result.isError).toBe(true);
			expect(result.message).toContain(
				'Workspace with ID "ws-dup" already exists',
			);
			expect(listSpy).toHaveBeenCalledTimes(1);
			const firstCall = listSpy.mock.calls[0] as any;
			expect(firstCall[0].labelSelector).toBe(
				"nogoo9/type=workspace,nogoo9/workspace-id=ws-dup",
			);
		});

		test("spawn_workspace succeeds and sets custom display name", async () => {
			const _listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [],
			} as any);
			const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue(
				{
					body: { metadata: { name: "ws-anonymous-ws-new" } },
				} as any,
			);

			const handler = registeredTools.get("spawn_workspace")!;
			const result = await handler({
				id: "ws-new",
				name: "Custom Display Name",
				namespace: "default",
				spec: { containers: [{ name: "agent", image: "node" }] },
			});

			expect(result.isError).toBeUndefined();
			expect(result.structuredContent.id).toBe("ws-new");
			expect(createSpy).toHaveBeenCalledTimes(1);
			const firstCreateCall = createSpy.mock.calls[0] as any;
			const body = firstCreateCall[0].body;
			expect(body.metadata.annotations["nogoo9/workspace-name"]).toBe(
				"Custom Display Name",
			);
			expect(body.metadata.labels["nogoo9/workspace-id"]).toBe("ws-new");
		});

		test("list_workspaces resolves display name from annotations", async () => {
			const mockPod = {
				metadata: {
					name: "ws-pod-123",
					labels: {
						"nogoo9/workspace-id": "ws-123",
					},
					annotations: {
						"nogoo9/workspace-name": "Friendly Workspace Name",
					},
				},
				status: {
					phase: "Running",
				},
			};

			spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [mockPod],
			} as any);

			const handler = registeredTools.get("list_workspaces")!;
			const result = await handler({ namespace: "default" });

			expect(result.structuredContent.workspaces[0].name).toBe(
				"Friendly Workspace Name",
			);
		});
	});

	describe("template variable user interpolation", () => {
		afterEach(() => {
			if ((coreApi as any).readNamespacedConfigMap?.mockRestore) {
				spyOn(coreApi, "readNamespacedConfigMap" as any).mockRestore();
			}
			if ((coreApi as any).createNamespacedPod?.mockRestore) {
				spyOn(coreApi, "createNamespacedPod").mockRestore();
			}
		});

		test("spawn_workspace interpolates user variable in template spec and annotations", async () => {
			const mockCM = {
				metadata: {
					name: "tmpl-user",
					annotations: {
						"nogoo9/init-image": "alpine",
						// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
						"nogoo9/init-command": "echo ${{user}}",
						// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
						"nogoo9/pre-stop-command": "sync ${{user}}",
					},
				},
				data: {
					spec: JSON.stringify({
						containers: [
							{
								name: "agent",
								image: "node",
								// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
								command: ["echo", "${{user}}"],
							},
						],
					}),
				},
			};

			const mockRead = spyOn(
				coreApi,
				"readNamespacedConfigMap" as any,
			).mockResolvedValue(mockCM as any);
			const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue(
				{
					body: { metadata: { name: "ws-test" } },
				} as any,
			);

			const handler = registeredTools.get("spawn_workspace")!;
			const result = await handler({
				id: "ws-test",
				templateRef: "tmpl-user",
				namespace: "default",
				jwtPayload: { sub: "test-user-identity" },
			});

			expect(result.isError).toBeUndefined();
			expect(createSpy).toHaveBeenCalledTimes(1);
			const firstCreateCall = createSpy.mock.calls[0] as any;
			const body = firstCreateCall[0].body;

			// Verify template spec variable replacement
			expect(body.spec.containers[0].command).toEqual([
				"echo",
				"test-user-identity",
			]);

			// Verify template annotations variable replacement
			expect(body.spec.initContainers[0].command).toEqual([
				"/bin/sh",
				"-c",
				"echo test-user-identity",
			]);
			expect(body.spec.containers[0].lifecycle.preStop.exec.command).toEqual([
				"/bin/sh",
				"-c",
				"sync test-user-identity",
			]);

			// Verify template annotations are copied and user identity is interpolated
			expect(body.metadata.annotations["nogoo9/init-image"]).toBe("alpine");
			expect(body.metadata.annotations["nogoo9/init-command"]).toBe(
				"echo test-user-identity",
			);
			expect(body.metadata.annotations["nogoo9/pre-stop-command"]).toBe(
				"sync test-user-identity",
			);

			mockRead.mockRestore();
			createSpy.mockRestore();
		});

		test("spawn_workspace interpolates user variable to guest if no auth payload present", async () => {
			const mockCM = {
				metadata: {
					name: "tmpl-user",
					annotations: {
						"nogoo9/init-image": "alpine",
						// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
						"nogoo9/init-command": "echo ${{user}}",
					},
				},
				data: {
					spec: JSON.stringify({
						containers: [
							{
								name: "agent",
								image: "node",
								// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
								command: ["echo", "${{user}}"],
							},
						],
					}),
				},
			};

			const mockRead = spyOn(
				coreApi,
				"readNamespacedConfigMap" as any,
			).mockResolvedValue(mockCM as any);
			const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue(
				{
					body: { metadata: { name: "ws-test" } },
				} as any,
			);

			const handler = registeredTools.get("spawn_workspace")!;
			const result = await handler({
				id: "ws-test",
				templateRef: "tmpl-user",
				namespace: "default",
			});

			expect(result.isError).toBeUndefined();
			expect(createSpy).toHaveBeenCalledTimes(1);
			const firstCreateCall = createSpy.mock.calls[0] as any;
			const body = firstCreateCall[0].body;

			expect(body.spec.containers[0].command).toEqual(["echo", "guest"]);
			expect(body.spec.initContainers[0].command).toEqual([
				"/bin/sh",
				"-c",
				"echo guest",
			]);

			mockRead.mockRestore();
			createSpy.mockRestore();
		});

		test("spawn_workspace interpolates workspace_id and workspace variables in template spec and annotations", async () => {
			const mockCM = {
				metadata: {
					name: "tmpl-workspace-test",
					annotations: {
						"nogoo9/init-image": "alpine",
						// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
						"nogoo9/init-command": "echo ${{workspace_id}}",
						// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
						"nogoo9/pre-stop-command": "sync ${{workspace}}",
					},
				},
				data: {
					spec: JSON.stringify({
						containers: [
							{
								name: "agent",
								image: "node",
								env: [
									{
										name: "SUBFOLDER",
										// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
										value: "/route/${{workspace_id}}/",
									},
								],
							},
						],
					}),
				},
			};

			const mockRead = spyOn(
				coreApi,
				"readNamespacedConfigMap" as any,
			).mockResolvedValue(mockCM as any);
			const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue(
				{
					body: { metadata: { name: "ws-test" } },
				} as any,
			);

			const handler = registeredTools.get("spawn_workspace")!;
			const result = await handler({
				id: "ws-dynamic-123",
				templateRef: "tmpl-workspace-test",
				namespace: "default",
			});

			expect(result.isError).toBeUndefined();
			expect(createSpy).toHaveBeenCalledTimes(1);
			const firstCreateCall = createSpy.mock.calls[0] as any;
			const body = firstCreateCall[0].body;

			// Verify template spec variable replacement
			expect(body.spec.containers[0].env).toContainEqual({
				name: "SUBFOLDER",
				value: "/route/ws-dynamic-123/",
			});

			// Verify template annotations variable replacement
			expect(body.spec.initContainers[0].command).toEqual([
				"/bin/sh",
				"-c",
				"echo ws-dynamic-123",
			]);
			expect(body.metadata.annotations["nogoo9/pre-stop-command"]).toBe(
				"sync ws-dynamic-123",
			);

			mockRead.mockRestore();
			createSpy.mockRestore();
		});

		test("spawn_workspace sets templateRef annotation and it is returned by list and get tools", async () => {
			const mockCM = {
				metadata: {
					name: "tmpl-ref-test",
					annotations: {
						"nogoo9/init-image": "alpine",
						"nogoo9/init-command": "echo hello",
					},
				},
				data: {
					spec: JSON.stringify({
						containers: [{ name: "agent", image: "node" }],
					}),
				},
			};

			const mockRead = spyOn(
				coreApi,
				"readNamespacedConfigMap" as any,
			).mockResolvedValue(mockCM as any);
			const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue(
				{
					body: {
						metadata: {
							name: "ws-ref-test-pod",
							labels: {
								"nogoo9/type": "workspace",
								"nogoo9/workspace-id": "ws-ref-test",
							},
							annotations: {
								"nogoo9/workspace-name": "ws-ref-test-display",
								"nogoo9/template-ref": "tmpl-ref-test",
							},
						},
						status: { phase: "Running" },
					},
				} as any,
			);

			const spawnHandler = registeredTools.get("spawn_workspace")!;
			const spawnResult = await spawnHandler({
				id: "ws-ref-test",
				templateRef: "tmpl-ref-test",
				namespace: "default",
			});

			expect(spawnResult.isError).toBeUndefined();
			expect(createSpy).toHaveBeenCalledTimes(1);
			const body = (createSpy.mock.calls[0] as any)[0].body;
			expect(body.metadata.annotations["nogoo9/template-ref"]).toBe(
				"tmpl-ref-test",
			);

			const listPodsSpy = spyOn(
				coreApi,
				"listNamespacedPod" as any,
			).mockResolvedValue({
				items: [
					{
						metadata: {
							name: "ws-ref-test-pod",
							labels: {
								"nogoo9/type": "workspace",
								"nogoo9/workspace-id": "ws-ref-test",
							},
							annotations: {
								"nogoo9/workspace-name": "ws-ref-test-display",
								"nogoo9/template-ref": "tmpl-ref-test",
							},
						},
						status: { phase: "Running", podIP: "1.2.3.4" },
					},
				],
			} as any);

			const listHandler = registeredTools.get("list_workspaces")!;
			const listResult = await listHandler({ namespace: "default" });
			expect(listResult.isError).toBeUndefined();
			expect(listResult.structuredContent.workspaces[0].templateRef).toBe(
				"tmpl-ref-test",
			);

			const getHandler = registeredTools.get("get_workspace")!;
			const getResult = await getHandler({
				id: "ws-ref-test",
				namespace: "default",
			});
			expect(getResult.isError).toBeUndefined();
			expect(getResult.structuredContent.templateRef).toBe("tmpl-ref-test");

			mockRead.mockRestore();
			createSpy.mockRestore();
			listPodsSpy.mockRestore();
		});

		test("parseWorkspaceApis parses custom API annotations and spawner handles them", async () => {
			const listPodsSpy = spyOn(
				coreApi,
				"listNamespacedPod" as any,
			).mockResolvedValue({
				items: [
					{
						metadata: {
							name: "ws-apis-test-pod",
							labels: {
								"nogoo9/type": "workspace",
								"nogoo9/workspace-id": "ws-apis-test",
							},
							annotations: {
								"nogoo9/workspace-name": "ws-apis-test",
								"nogoo9/workspace-port": "8080",
								"nogoo9/workspace-path": "/main",
								"nogoo9/workspace-type": "html",
								"nogoo9/api.terminal.port": "7681",
								"nogoo9/api.terminal.path": "/terminal",
								"nogoo9/api.terminal.desc": "web terminal",
								"nogoo9/api.terminal.method": "GET,POST",
							},
						},
						spec: {
							containers: [
								{
									name: "agent",
									image: "node:latest",
								},
							],
						},
						status: { phase: "Running", podIP: "1.2.3.4" },
					},
				],
			} as any);

			const listHandler = registeredTools.get("list_workspaces")!;
			const listResult = await listHandler({ namespace: "default" });
			expect(listResult.isError).toBeUndefined();
			const ws = listResult.structuredContent.workspaces[0];
			expect(ws.apis).toBeDefined();
			expect(ws.apis.length).toBe(1);
			expect(ws.apis[0].name).toBe("terminal");
			expect(ws.apis[0].port).toBe("7681");
			expect(ws.apis[0].path).toBe("/terminal");
			expect(ws.apis[0].desc).toBe("web terminal");
			expect(ws.apis[0].method).toBe("GET,POST");

			const getHandler = registeredTools.get("get_workspace")!;
			const getResult = await getHandler({
				id: "ws-apis-test",
				namespace: "default",
			});
			expect(getResult.isError).toBeUndefined();
			expect(getResult.structuredContent.workspacePath).toBe("/main");
			expect(getResult.structuredContent.workspaceType).toBe("html");
			expect(getResult.structuredContent.apis).toBeDefined();
			expect(getResult.structuredContent.apis.length).toBe(1);
			expect(getResult.structuredContent.labels).toBeDefined();
			expect(getResult.structuredContent.labels["nogoo9/type"]).toBe(
				"workspace",
			);
			expect(getResult.structuredContent.spec).toBeDefined();
			expect((getResult.structuredContent.spec as any).containers[0].name).toBe(
				"agent",
			);

			listPodsSpy.mockRestore();
		});
	});
});
