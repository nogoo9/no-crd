import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as extApps from "@modelcontextprotocol/ext-apps/server";
import { ANNOTATION_KEYS } from "~/config/index.js";

const registeredTools = new Map<string, (...args: any[]) => any>();

const coreApi = {
	readNamespacedConfigMap: async () => ({}) as any,
	createNamespacedPod: async (args: any) => ({ body: args.body }),
	createNamespacedConfigMap: async (args: any) => ({
		metadata: args.body.metadata,
		data: args.body.data,
	}),
	replaceNamespacedConfigMap: async (args: any) => ({
		metadata: args.body.metadata,
		data: args.body.data,
	}),
	deleteNamespacedConfigMap: async () => ({}) as any,
};
const kc = {
	getCurrentCluster: () => null,
};
const k8sContext = {
	coreApi,
	kc,
} as any;

import { registerTemplateResources } from "./templates/index.js";

describe("Templates MCP Tools", () => {
	let registerSpy: any;

	beforeEach(() => {
		registeredTools.clear();
		registerSpy = spyOn(extApps, "registerAppTool").mockImplementation(
			(_server: any, name: string, _schema: any, handler: any) => {
				registeredTools.set(name, handler);
				return {} as any;
			},
		);
		registerTemplateResources({} as any, k8sContext, [
			"create_pod_from_template",
			"create_template",
			"update_template",
			"delete_template",
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
		if ((coreApi as any).readNamespacedConfigMap?.mockRestore) {
			spyOn(coreApi, "readNamespacedConfigMap" as any).mockRestore();
		}
		if ((coreApi as any).createNamespacedPod?.mockRestore) {
			spyOn(coreApi, "createNamespacedPod").mockRestore();
		}
		if ((coreApi as any).createNamespacedConfigMap?.mockRestore) {
			spyOn(coreApi, "createNamespacedConfigMap" as any).mockRestore();
		}
		if ((coreApi as any).replaceNamespacedConfigMap?.mockRestore) {
			spyOn(coreApi, "replaceNamespacedConfigMap" as any).mockRestore();
		}
		if ((coreApi as any).deleteNamespacedConfigMap?.mockRestore) {
			spyOn(coreApi, "deleteNamespacedConfigMap" as any).mockRestore();
		}
		delete process.env.AUTH_REQUIRED_READ_ROLE;
		delete process.env.AUTH_REQUIRED_WRITE_ROLE;
		delete process.env.AUTH_REQUIRED_READ_SCOPE;
		delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
	});

	test("registers all template tools", () => {
		expect(registeredTools.has("create_pod_from_template")).toBe(true);
		expect(registeredTools.has("create_template")).toBe(true);
		expect(registeredTools.has("update_template")).toBe(true);
		expect(registeredTools.has("delete_template")).toBe(true);
	});

	test("create_pod_from_template interpolates user variable in pod spec with auth disabled (guest)", async () => {
		const mockCM = {
			metadata: {
				name: "tmpl-test",
			},
			data: {
				spec: JSON.stringify({
					containers: [
						{
							name: "app",
							image: "node:latest",
							// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
							command: ["echo", "${{user}}"],
						},
					],
				}),
			},
		};

		const readSpy = spyOn(
			coreApi,
			"readNamespacedConfigMap" as any,
		).mockResolvedValue(mockCM as any);
		const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue({
			body: { metadata: { name: "ws-pod" } },
		} as any);

		const handler = registeredTools.get("create_pod_from_template")!;
		const result = await handler({
			templateRef: "tmpl-test",
			name: "ws-pod",
			namespace: "default",
		});

		expect(result.isError).toBeUndefined();
		expect(createSpy).toHaveBeenCalledTimes(1);
		const firstCall = createSpy.mock.calls[0] as any;
		expect(firstCall[0].body.spec.containers[0].command).toEqual([
			"echo",
			"guest",
		]);

		readSpy.mockRestore();
		createSpy.mockRestore();
	});

	test("create_pod_from_template interpolates user variable in pod spec with auth enabled", async () => {
		process.env.AUTH_ENABLED = "true";
		const mockCM = {
			metadata: {
				name: "tmpl-test",
			},
			data: {
				spec: JSON.stringify({
					containers: [
						{
							name: "app",
							image: "node:latest",
							// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
							command: ["echo", "${{user}}"],
						},
					],
				}),
			},
		};

		const readSpy = spyOn(
			coreApi,
			"readNamespacedConfigMap" as any,
		).mockResolvedValue(mockCM as any);
		const createSpy = spyOn(coreApi, "createNamespacedPod").mockResolvedValue({
			body: { metadata: { name: "ws-pod" } },
		} as any);

		const handler = registeredTools.get("create_pod_from_template")!;
		const result = await handler({
			templateRef: "tmpl-test",
			name: "ws-pod",
			namespace: "default",
			jwtPayload: {
				sub: "alice-123",
				realm_access: { roles: ["user"] },
			},
		});

		expect(result.isError).toBeUndefined();
		expect(createSpy).toHaveBeenCalledTimes(1);
		const firstCall = createSpy.mock.calls[0] as any;
		expect(firstCall[0].body.spec.containers[0].command).toEqual([
			"echo",
			"alice-123",
		]);

		readSpy.mockRestore();
		createSpy.mockRestore();
	});

	describe("Template lifecycle controls (ADR-020)", () => {
		let tempDir: string;

		beforeEach(() => {
			const fs = require("node:fs");
			const path = require("node:path");
			tempDir = path.join(import.meta.dir, "__test_templates_lifecycle__");
			fs.mkdirSync(tempDir, { recursive: true });
			fs.writeFileSync(
				path.join(tempDir, "local-tmpl.yaml"),
				`metadata:
  name: local-tmpl
spec:
  containers:
    - name: agent
      image: node
`,
			);
			process.env.TEMPLATES_DIR = tempDir;
		});

		afterEach(() => {
			const fs = require("node:fs");
			try {
				fs.rmSync(tempDir, { recursive: true, force: true });
			} catch (_) {}
			delete process.env.TEMPLATES_DIR;
		});

		test("create_template stamps the ConfigMap with creator sub when auth enabled", async () => {
			process.env.AUTH_ENABLED = "true";
			const createSpy = spyOn(coreApi, "createNamespacedConfigMap");

			const handler = registeredTools.get("create_template")!;
			const result = await handler({
				name: "custom-tmpl",
				namespace: "default",
				spec: { containers: [{ name: "agent", image: "node" }] },
				jwtPayload: {
					sub: "creator-123",
					realm_access: { roles: ["user"] },
				},
			});

			expect(result.isError).toBeUndefined();
			expect(createSpy).toHaveBeenCalledTimes(1);
			const call = createSpy.mock.calls[0] as any;
			const body = call[0].body;
			expect(body.metadata.labels[ANNOTATION_KEYS.USER_SUB]).toBe(
				"creator-123",
			);
			expect(body.metadata.annotations[ANNOTATION_KEYS.USER_SUB]).toBe(
				"creator-123",
			);
		});

		test("update_template blocks local templates", async () => {
			const handler = registeredTools.get("update_template")!;
			const result = await handler({
				name: "local-tmpl",
				namespace: "default",
				spec: { containers: [{ name: "agent", image: "node" }] },
			});
			expect(result.isError).toBe(true);
			expect(result.message).toContain(
				'Local template "local-tmpl" is immutable',
			);
		});

		test("update_template blocks non-owner on ConfigMap template", async () => {
			process.env.AUTH_ENABLED = "true";
			const existingCM = {
				metadata: {
					name: "custom-tmpl",
					labels: {
						[ANNOTATION_KEYS.USER_SUB]: "creator-123",
					},
				},
				data: {},
			};
			spyOn(coreApi, "readNamespacedConfigMap" as any).mockResolvedValue(
				existingCM as any,
			);

			const handler = registeredTools.get("update_template")!;
			const result = await handler({
				name: "custom-tmpl",
				namespace: "default",
				spec: { containers: [] },
				jwtPayload: {
					sub: "stranger-456",
					realm_access: { roles: ["user"] },
				},
			});

			expect(result.isError).toBe(true);
			expect(result.message).toContain("You are not the creator of template");
		});

		test("update_template allows owner on ConfigMap template", async () => {
			process.env.AUTH_ENABLED = "true";
			const existingCM = {
				metadata: {
					name: "custom-tmpl",
					labels: {
						[ANNOTATION_KEYS.USER_SUB]: "creator-123",
					},
				},
				data: {},
			};
			spyOn(coreApi, "readNamespacedConfigMap" as any).mockResolvedValue(
				existingCM as any,
			);
			const replaceSpy = spyOn(coreApi, "replaceNamespacedConfigMap");

			const handler = registeredTools.get("update_template")!;
			const result = await handler({
				name: "custom-tmpl",
				namespace: "default",
				spec: { containers: [] },
				jwtPayload: {
					sub: "creator-123",
					realm_access: { roles: ["user"] },
				},
			});

			expect(result.isError).toBeUndefined();
			expect(replaceSpy).toHaveBeenCalledTimes(1);
		});

		test("update_template allows admin to bypass owner check", async () => {
			process.env.AUTH_ENABLED = "true";
			const existingCM = {
				metadata: {
					name: "custom-tmpl",
					labels: {
						[ANNOTATION_KEYS.USER_SUB]: "creator-123",
					},
				},
				data: {},
			};
			spyOn(coreApi, "readNamespacedConfigMap" as any).mockResolvedValue(
				existingCM as any,
			);
			const replaceSpy = spyOn(coreApi, "replaceNamespacedConfigMap");

			const handler = registeredTools.get("update_template")!;
			const result = await handler({
				name: "custom-tmpl",
				namespace: "default",
				spec: { containers: [] },
				jwtPayload: {
					sub: "admin-user",
					realm_access: { roles: ["admin"] },
				},
			});

			expect(result.isError).toBeUndefined();
			expect(replaceSpy).toHaveBeenCalledTimes(1);
		});

		test("delete_template blocks local templates", async () => {
			const handler = registeredTools.get("delete_template")!;
			const result = await handler({
				name: "local-tmpl",
				namespace: "default",
			});
			expect(result.isError).toBe(true);
			expect(result.message).toContain(
				'Local template "local-tmpl" is immutable',
			);
		});

		test("delete_template blocks non-owner on ConfigMap template", async () => {
			process.env.AUTH_ENABLED = "true";
			const existingCM = {
				metadata: {
					name: "custom-tmpl",
					labels: {
						[ANNOTATION_KEYS.USER_SUB]: "creator-123",
					},
				},
				data: {},
			};
			spyOn(coreApi, "readNamespacedConfigMap" as any).mockResolvedValue(
				existingCM as any,
			);

			const handler = registeredTools.get("delete_template")!;
			const result = await handler({
				name: "custom-tmpl",
				namespace: "default",
				jwtPayload: {
					sub: "stranger-456",
					realm_access: { roles: ["user"] },
				},
			});

			expect(result.isError).toBe(true);
			expect(result.message).toContain("You are not the creator of template");
		});

		test("delete_template allows owner on ConfigMap template", async () => {
			process.env.AUTH_ENABLED = "true";
			const existingCM = {
				metadata: {
					name: "custom-tmpl",
					labels: {
						[ANNOTATION_KEYS.USER_SUB]: "creator-123",
					},
				},
				data: {},
			};
			spyOn(coreApi, "readNamespacedConfigMap" as any).mockResolvedValue(
				existingCM as any,
			);
			const deleteSpy = spyOn(coreApi, "deleteNamespacedConfigMap");

			const handler = registeredTools.get("delete_template")!;
			const result = await handler({
				name: "custom-tmpl",
				namespace: "default",
				jwtPayload: {
					sub: "creator-123",
					realm_access: { roles: ["user"] },
				},
			});

			expect(result.isError).toBeUndefined();
			expect(deleteSpy).toHaveBeenCalledTimes(1);
		});
	});
});
