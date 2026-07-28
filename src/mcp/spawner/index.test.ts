import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";

// Capture registered tools in a Map to avoid bracket notation lint issues
const registeredTools = new Map<string, (...args: any[]) => any>();

import * as extApps from "@modelcontextprotocol/ext-apps/server";

// Mock K8s dependencies
const coreApi = {
	listNamespacedPod: async () => ({ items: [] }),
	createNamespacedPod: async (args: any) => ({ body: args.body }),
	readNamespacedConfigMap: async (_args: any) => ({}) as any,
	listNamespacedEvent: async () => ({ items: [] }),
	deleteNamespacedPod: async () => ({}) as any,
	readNamespacedPod: async (..._args: any[]) => ({}) as any,
};
const kc = {
	getCurrentCluster: () => null,
};
const k8sContext = {
	coreApi,
	kc,
} as any;

// Import target under test (needs mock to be registered first)
import { registerSpawnerTools } from "./index.js";

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
			"get_workspace_events",
			"upgrade_workspace",
			"upgrade_all_workspaces",
		]);
		process.env.AUTH_ENABLED = "false";
		process.env.AUTH_REQUIRED_READ_ROLE = "";
		process.env.AUTH_REQUIRED_WRITE_ROLE = "";
		process.env.AUTH_REQUIRED_READ_SCOPE = "";
		process.env.AUTH_REQUIRED_WRITE_SCOPE = "";
		delete process.env.AUTH_SUB_JSONPATH;
		delete process.env.AUTH_SCOPE_JSONPATH;
	});

	afterEach(() => {
		registerSpy.mockRestore();
		spyOn(coreApi, "listNamespacedPod").mockRestore();
		delete process.env.AUTH_REQUIRED_READ_ROLE;
		delete process.env.AUTH_REQUIRED_WRITE_ROLE;
		delete process.env.AUTH_REQUIRED_READ_SCOPE;
		delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
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
			podName: "ws-pod-123",
			templateVersion: "1.0.0",
			latestTemplateVersion: undefined,
			isOutdated: false,
			owner: "anonymous",
			creationTime: undefined,
			description: "",
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
			pod: {
				metadata: {
					name: "ws-pod-123",
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

		test("spawn_workspace merges template labels from ConfigMap", async () => {
			const mockCM = {
				metadata: {
					name: "tmpl-labels",
					labels: {
						// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
						"custom-label": "value-${{user}}",
						"other-label": "static-val",
					},
					annotations: {},
				},
				data: {
					spec: JSON.stringify({
						containers: [
							{
								name: "agent",
								image: "node",
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
				templateRef: "tmpl-labels",
				namespace: "default",
				jwtPayload: { sub: "test-user-identity" },
			});

			expect(result.isError).toBeUndefined();
			expect(createSpy).toHaveBeenCalledTimes(1);
			const body = (createSpy.mock.calls[0] as any)[0].body;

			// Verify template labels are copied and user identity is interpolated
			expect(body.metadata.labels["custom-label"]).toBe(
				"value-test-user-identity",
			);
			expect(body.metadata.labels["other-label"]).toBe("static-val");
			// System labels should still exist and not be overridden
			expect(body.metadata.labels["nogoo9/type"]).toBe("workspace");
			expect(body.metadata.labels["nogoo9/workspace-id"]).toBe("ws-test");

			mockRead.mockRestore();
			createSpy.mockRestore();
		});

		test("spawn_workspace merges template labels from local fallback template", async () => {
			const fs = require("node:fs");
			const path = require("node:path");
			const tempDir = path.join(import.meta.dir, "__test_templates_spawner__");
			fs.mkdirSync(tempDir, { recursive: true });

			fs.writeFileSync(
				path.join(tempDir, "local-labels.yaml"),
				`metadata:
  name: local-labels
  labels:
    custom-local-label: "val-\${{user}}"
spec:
  containers:
    - name: agent
      image: node
`,
			);

			const origTemplatesDir = process.env.TEMPLATES_DIR;
			process.env.TEMPLATES_DIR = tempDir;

			// Force spawner to fallback by having readNamespacedConfigMap fail
			const mockRead = spyOn(
				coreApi,
				"readNamespacedConfigMap" as any,
			).mockRejectedValue(new Error("ConfigMap permission denied"));

			const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue(
				{
					body: { metadata: { name: "ws-test" } },
				} as any,
			);

			try {
				const handler = registeredTools.get("spawn_workspace")!;
				const result = await handler({
					id: "ws-test",
					templateRef: "local-labels",
					namespace: "default",
					jwtPayload: { sub: "test-user-identity" },
				});

				expect(result.isError).toBeUndefined();
				expect(createSpy).toHaveBeenCalledTimes(1);
				const body = (createSpy.mock.calls[0] as any)[0].body;

				// Verify template labels are copied and user identity is interpolated
				expect(body.metadata.labels["custom-local-label"]).toBe(
					"val-test-user-identity",
				);
				expect(body.metadata.labels["nogoo9/pod-template"]).toBe("true");
				// System labels should still exist and not be overridden
				expect(body.metadata.labels["nogoo9/type"]).toBe("workspace");
				expect(body.metadata.labels["nogoo9/workspace-id"]).toBe("ws-test");
			} finally {
				process.env.TEMPLATES_DIR = origTemplatesDir;
				fs.rmSync(tempDir, { recursive: true, force: true });
				mockRead.mockRestore();
				createSpy.mockRestore();
			}
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

describe("Spawner MCP Tools - Admin Capabilities", () => {
	let registerSpy: any;

	beforeEach(() => {
		registeredTools.clear();
		registerSpy = spyOn(extApps, "registerAppTool").mockImplementation(
			(_server: any, name: string, _schema: any, handler: any) => {
				registeredTools.set(name, handler);
				return {} as any;
			},
		);
		registerSpawnerTools({} as any, k8sContext, [
			"get_workspace",
			"list_workspaces",
			"stop_workspace",
			"spawn_workspace",
			"get_workspace_events",
			"upgrade_workspace",
			"upgrade_all_workspaces",
		]);
		process.env.AUTH_ENABLED = "true";
		process.env.AUTH_ADMIN_ROLE = "admin";
		process.env.AUTH_ROLES_JSONPATH = "$.realm_access.roles";
		process.env.AUTH_SUB_JSONPATH = "$.sub";
		process.env.AUTH_REQUIRED_READ_SCOPE = "";
		process.env.AUTH_REQUIRED_WRITE_SCOPE = "";
	});

	afterEach(() => {
		registerSpy.mockRestore();
		spyOn(coreApi, "listNamespacedPod").mockRestore();
		if ((coreApi as any).createNamespacedPod?.mockRestore) {
			spyOn(coreApi, "createNamespacedPod").mockRestore();
		}
		delete process.env.AUTH_ENABLED;
		delete process.env.AUTH_ADMIN_ROLE;
		delete process.env.AUTH_ROLES_JSONPATH;
		delete process.env.AUTH_SUB_JSONPATH;
		delete process.env.AUTH_REQUIRED_READ_SCOPE;
		delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
	});

	test("spawn_workspace as admin allows specifying target userSub", async () => {
		spyOn(coreApi, "listNamespacedPod").mockResolvedValue({ items: [] } as any);
		const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue({
			body: { metadata: { name: "ws-user2-ws-1" } },
		} as any);

		const handler = registeredTools.get("spawn_workspace")!;
		const result = await handler({
			id: "ws-1",
			namespace: "default",
			spec: { containers: [{ name: "agent", image: "node" }] },
			jwtPayload: {
				sub: "admin-user",
				scope: "nogoo9:admin",
				realm_access: { roles: ["admin"] },
			},
			userSub: "user-target",
		});

		expect(result.isError).toBeUndefined();
		expect(createSpy).toHaveBeenCalledTimes(1);
		const body = (createSpy.mock.calls[0] as any)[0].body;
		expect(body.metadata.labels["nogoo9/user-sub"]).toBe("user-target");
		expect(body.metadata.annotations["nogoo9/user-sub"]).toBe("user-target");
	});

	test("spawn_workspace as admin blocks specifying target userSub if admin scope is missing", async () => {
		spyOn(coreApi, "listNamespacedPod").mockResolvedValue({ items: [] } as any);
		const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue({
			body: { metadata: { name: "ws-user2-ws-1" } },
		} as any);

		const handler = registeredTools.get("spawn_workspace")!;
		const result = await handler({
			id: "ws-1",
			namespace: "default",
			spec: { containers: [{ name: "agent", image: "node" }] },
			jwtPayload: {
				sub: "admin-user",
				scope: "nogoo9:write",
				realm_access: { roles: ["admin"] },
			},
			userSub: "user-target",
		});

		expect(result.isError).toBe(true);
		expect(result.message).toContain(
			"Forbidden: Non-admin users cannot specify a different userSub",
		);
		expect(createSpy).not.toHaveBeenCalled();
	});

	test("spawn_workspace as non-admin blocks specifying target userSub", async () => {
		spyOn(coreApi, "listNamespacedPod").mockResolvedValue({ items: [] } as any);
		const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue({
			body: { metadata: { name: "ws-user2-ws-1" } },
		} as any);

		const handler = registeredTools.get("spawn_workspace")!;
		const result = await handler({
			id: "ws-1",
			namespace: "default",
			spec: { containers: [{ name: "agent", image: "node" }] },
			jwtPayload: {
				sub: "non-admin-user",
				realm_access: { roles: ["user"] },
			},
			userSub: "user-target",
		});

		expect(result.isError).toBe(true);
		expect(result.message).toContain(
			"Forbidden: Non-admin users cannot specify a different userSub",
		);
		expect(createSpy).not.toHaveBeenCalled();
	});

	test("list_workspaces as admin lists all workspaces without filtering by userSub", async () => {
		const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
			items: [],
		} as any);

		const handler = registeredTools.get("list_workspaces")!;
		await handler({
			namespace: "default",
			jwtPayload: {
				sub: "admin-user",
				scope: "nogoo9:admin",
				realm_access: { roles: ["admin"] },
			},
		});

		expect(listSpy).toHaveBeenCalledTimes(1);
		const labelSelector = (listSpy.mock.calls[0] as any)[0].labelSelector;
		expect(labelSelector).toBe("nogoo9/type=workspace");
	});

	test("list_workspaces as admin filters by userSub if admin scope is missing", async () => {
		const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
			items: [],
		} as any);

		const handler = registeredTools.get("list_workspaces")!;
		await handler({
			namespace: "default",
			jwtPayload: {
				sub: "admin-user",
				scope: "nogoo9:read",
				realm_access: { roles: ["admin"] },
			},
		});

		expect(listSpy).toHaveBeenCalledTimes(1);
		const labelSelector = (listSpy.mock.calls[0] as any)[0].labelSelector;
		expect(labelSelector).toBe(
			"nogoo9/type=workspace,nogoo9/user-sub=admin-user",
		);
	});

	test("list_workspaces as non-admin filters workspaces by caller sub", async () => {
		const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
			items: [],
		} as any);

		const handler = registeredTools.get("list_workspaces")!;
		await handler({
			namespace: "default",
			jwtPayload: {
				sub: "regular-user",
				realm_access: { roles: ["viewer"] },
			},
		});

		expect(listSpy).toHaveBeenCalledTimes(1);
		const labelSelector = (listSpy.mock.calls[0] as any)[0].labelSelector;
		expect(labelSelector).toBe(
			"nogoo9/type=workspace,nogoo9/user-sub=regular-user",
		);
	});

	describe("get_workspace_events", () => {
		test("get_workspace_events retrieves and returns sorted pod events", async () => {
			const mockPod = {
				metadata: { name: "ws-pod-abc" },
			};
			const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [mockPod],
			} as any);

			const mockEvents = {
				items: [
					{
						type: "Warning",
						reason: "Failed",
						message: "Error spawning container",
						lastTimestamp: new Date("2026-06-08T10:00:00Z"),
					},
					{
						type: "Normal",
						reason: "Created",
						message: "Created container",
						lastTimestamp: new Date("2026-06-08T09:00:00Z"),
					},
				],
			};

			const eventsSpy = spyOn(coreApi, "listNamespacedEvent").mockResolvedValue(
				mockEvents as any,
			);

			const handler = registeredTools.get("get_workspace_events")!;
			const result = await handler({
				id: "ws-abc",
				namespace: "default",
				jwtPayload: {
					sub: "admin-user",
					scope: "nogoo9:admin",
					realm_access: { roles: ["admin"] },
				},
			});

			expect(listSpy).toHaveBeenCalledTimes(1);
			expect(eventsSpy).toHaveBeenCalledTimes(1);
			expect((eventsSpy.mock.calls[0] as any)[0].fieldSelector).toBe(
				"involvedObject.name=ws-pod-abc",
			);

			expect(result.structuredContent.events).toHaveLength(2);
			expect(result.structuredContent.events[0].reason).toBe("Failed");
			expect(result.structuredContent.events[1].reason).toBe("Created");

			eventsSpy.mockRestore();
		});
	});

	describe("upgrade_workspace", () => {
		test("upgrade_workspace deletes old pod and spawns new pod preserving PVC/env state", async () => {
			const mockPod = {
				metadata: {
					name: "ws-pod-xyz",
					labels: {
						"nogoo9/workspace-id": "ws-xyz",
						"nogoo9/user-sub": "user-abc",
						"nogoo9/type": "workspace",
					},
					annotations: {
						"nogoo9/template-ref": "default/node-template",
						"nogoo9/template-version": "1.0.0",
						"nogoo9/workspace-name": "My Node Sandbox",
					},
				},
				spec: {
					serviceAccountName: "ws-sa-ws-xyz",
					containers: [
						{
							name: "workspace",
							image: "node:18",
							env: [{ name: "CUSTOM_ENV", value: "custom-value" }],
							volumeMounts: [{ name: "data-volume", mountPath: "/workspace" }],
						},
					],
					volumes: [
						{
							name: "data-volume",
							persistentVolumeClaim: { claimName: "pvc-xyz" },
						},
					],
				},
			};

			const mockTemplateCM = {
				metadata: {
					name: "node-template",
					annotations: {
						"nogoo9/template-version": "2.0.0",
					},
				},
				data: {
					spec: JSON.stringify({
						containers: [
							{
								name: "workspace",
								image: "node:20",
								env: [{ name: "TEMPLATE_ENV", value: "template-default" }],
							},
						],
					}),
				},
			};

			const listSpy = spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [mockPod],
			} as any);

			const readCMSpy = spyOn(
				coreApi,
				"readNamespacedConfigMap",
			).mockResolvedValue(mockTemplateCM as any);
			const deleteSpy = spyOn(coreApi, "deleteNamespacedPod").mockResolvedValue(
				{} as any,
			);
			const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue(
				{ body: { metadata: { name: "ws-pod-xyz" } } } as any,
			);

			// Mock readNamespacedPod for deletion check & readiness check
			const readPodSpy = spyOn(coreApi, "readNamespacedPod").mockImplementation(
				async (req: any) => {
					const name = req?.name || "";
					if (name.includes("-up-")) {
						return {
							metadata: { name },
							status: { phase: "Running", podIP: "10.0.0.1" },
						} as any;
					}
					throw { response: { statusCode: 404 } };
				},
			);

			const handler = registeredTools.get("upgrade_workspace")!;
			const result = await handler({
				id: "ws-xyz",
				namespace: "default",
				jwtPayload: {
					sub: "admin-user",
					scope: "nogoo9:admin",
					realm_access: { roles: ["admin"] },
				},
			});

			expect(result.isError).toBeUndefined();
			expect(result.structuredContent.status).toBe("upgrading");

			// Yield execution to let background promises execute
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(listSpy).toHaveBeenCalledTimes(1);
			expect(readCMSpy).toHaveBeenCalledTimes(1);
			expect(deleteSpy).toHaveBeenCalledTimes(1);
			expect(createSpy).toHaveBeenCalledTimes(1);

			const createCallBody = (createSpy.mock.calls[0] as any)[0].body;
			expect(
				createCallBody.metadata.annotations["nogoo9/template-version"],
			).toBe("2.0.0");
			expect(createCallBody.spec.containers[0].image).toBe("node:20"); // image upgraded
			expect(createCallBody.spec.containers[0].env).toContainEqual({
				name: "CUSTOM_ENV",
				value: "custom-value",
			}); // custom env preserved
			expect(createCallBody.spec.containers[0].env).toContainEqual({
				name: "TEMPLATE_ENV",
				value: "template-default",
			}); // template default env added
			expect(
				createCallBody.spec.volumes[0].persistentVolumeClaim.claimName,
			).toBe("pvc-xyz"); // PVC volume preserved

			// Verify owner (nogoo9/user-sub) remains the original owner ("user-abc"), NOT the caller ("admin-user")
			expect(createCallBody.metadata.labels["nogoo9/user-sub"]).toBe(
				"user-abc",
			);
			expect(createCallBody.metadata.annotations["nogoo9/user-sub"]).toBe(
				"user-abc",
			);

			readCMSpy.mockRestore();
			deleteSpy.mockRestore();
			createSpy.mockRestore();
			readPodSpy.mockRestore();
		});

		test("upgrade_workspace as non-admin on another user's workspace is denied", async () => {
			const mockPod = {
				metadata: {
					name: "ws-pod-user-b",
					labels: {
						"nogoo9/workspace-id": "ws-user-b",
						"nogoo9/user-sub": "user-b",
						"nogoo9/type": "workspace",
					},
					annotations: {
						"nogoo9/template-ref": "default/node-template",
					},
				},
				spec: { containers: [{ name: "workspace", image: "node:18" }] },
			};

			spyOn(coreApi, "listNamespacedPod" as any).mockImplementation(
				async (args: any) => {
					if (args.labelSelector?.includes("nogoo9/user-sub=user-a")) {
						return { items: [] } as any;
					}
					return { items: [mockPod] } as any;
				},
			);

			const handler = registeredTools.get("upgrade_workspace")!;
			const result = await handler({
				id: "ws-user-b",
				namespace: "default",
				jwtPayload: {
					sub: "user-a",
					realm_access: { roles: ["user"] },
				},
			});

			expect(result.isError).toBe(true);
			expect(result.message).toContain(
				"Workspace ws-user-b not found or access denied",
			);
		});

		test("upgrade_workspace as non-admin on own workspace succeeds", async () => {
			const mockPod = {
				metadata: {
					name: "ws-pod-user-a",
					labels: {
						"nogoo9/workspace-id": "ws-user-a",
						"nogoo9/user-sub": "user-a",
						"nogoo9/type": "workspace",
					},
					annotations: {
						"nogoo9/template-ref": "default/node-template",
						"nogoo9/template-version": "1.0.0",
					},
				},
				spec: { containers: [{ name: "workspace", image: "node:18" }] },
			};

			spyOn(coreApi, "listNamespacedPod").mockResolvedValue({
				items: [mockPod],
			} as any);
			spyOn(coreApi, "readNamespacedConfigMap").mockResolvedValue({
				metadata: {
					name: "node-template",
					annotations: { "nogoo9/template-version": "2.0.0" },
				},
				data: {
					spec: JSON.stringify({
						containers: [{ name: "workspace", image: "node:20" }],
					}),
				},
			} as any);
			spyOn(coreApi, "deleteNamespacedPod").mockResolvedValue({} as any);
			spyOn(coreApi, "createNamespacedPod").mockResolvedValue({
				body: { metadata: { name: "ws-pod-user-a" } },
			} as any);

			const handler = registeredTools.get("upgrade_workspace")!;
			const result = await handler({
				id: "ws-user-a",
				namespace: "default",
				jwtPayload: {
					sub: "user-a",
					realm_access: { roles: ["user"] },
				},
			});

			expect(result.isError).toBeUndefined();
			expect(result.structuredContent.status).toBe("upgrading");
		});
	});

	describe("upgrade_all_workspaces", () => {
		test("upgrade_all_workspaces as non-admin is forbidden", async () => {
			const handler = registeredTools.get("upgrade_all_workspaces")!;
			const result = await handler({
				namespace: "default",
				jwtPayload: {
					sub: "user-a",
					realm_access: { roles: ["user"] },
				},
			});

			expect(result.isError).toBe(true);
			expect(result.message).toContain(
				"Forbidden: Only admin users can upgrade all workspaces",
			);
		});

		test("upgrade_all_workspaces as admin succeeds and processes outdated workspaces across users", async () => {
			const mockPods = [
				{
					metadata: {
						name: "ws-pod-user-a",
						labels: {
							"nogoo9/workspace-id": "ws-user-a",
							"nogoo9/user-sub": "user-a",
							"nogoo9/type": "workspace",
						},
						annotations: {
							"nogoo9/template-ref": "default/node-template",
							"nogoo9/template-version": "1.0.0",
						},
					},
					spec: { containers: [{ name: "workspace", image: "node:18" }] },
				},
				{
					metadata: {
						name: "ws-pod-user-b",
						labels: {
							"nogoo9/workspace-id": "ws-user-b",
							"nogoo9/user-sub": "user-b",
							"nogoo9/type": "workspace",
						},
						annotations: {
							"nogoo9/template-ref": "default/node-template",
							"nogoo9/template-version": "1.0.0",
						},
					},
					spec: { containers: [{ name: "workspace", image: "node:18" }] },
				},
			];

			spyOn(coreApi, "listNamespacedPod" as any).mockImplementation(
				async (args: any) => {
					const selector = args?.labelSelector || "";
					if (selector.includes("nogoo9/workspace-id=ws-user-a")) {
						return { items: [mockPods[0]] } as any;
					}
					if (selector.includes("nogoo9/workspace-id=ws-user-b")) {
						return { items: [mockPods[1]] } as any;
					}
					return { items: mockPods } as any;
				},
			);
			spyOn(coreApi, "readNamespacedConfigMap").mockResolvedValue({
				metadata: {
					name: "node-template",
					annotations: { "nogoo9/template-version": "2.0.0" },
				},
				data: {
					spec: JSON.stringify({
						containers: [{ name: "workspace", image: "node:20" }],
					}),
				},
			} as any);
			spyOn(coreApi, "deleteNamespacedPod").mockResolvedValue({} as any);
			const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue(
				{ body: { metadata: { name: "ws-upgraded" } } } as any,
			);

			const handler = registeredTools.get("upgrade_all_workspaces")!;
			const result = await handler({
				namespace: "default",
				jwtPayload: {
					sub: "admin-user",
					scope: "nogoo9:admin",
					realm_access: { roles: ["admin"] },
				},
			});

			expect(result.isError).toBeUndefined();
			expect(result.structuredContent.upgraded).toEqual([
				"ws-user-a",
				"ws-user-b",
			]);

			// Yield execution for background promise in upgradeWorkspaceInner
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Verify create calls preserved respective original owners
			const createCalls = createSpy.mock.calls as any[];
			expect(createCalls.length).toBe(2);
			const firstOwner =
				createCalls[0][0].body.metadata.labels["nogoo9/user-sub"];
			const secondOwner =
				createCalls[1][0].body.metadata.labels["nogoo9/user-sub"];
			expect([firstOwner, secondOwner]).toEqual(["user-a", "user-b"]);
		});
	});
});
