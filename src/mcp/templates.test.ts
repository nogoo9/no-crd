import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";

const registeredTools = new Map<string, (...args: any[]) => any>();

import * as extApps from "@modelcontextprotocol/ext-apps/server";

const coreApi = {
	readNamespacedConfigMap: async () => ({}),
	createNamespacedPod: async (args: any) => ({ body: args.body }),
};
const kc = {
	getCurrentCluster: () => null,
};
const k8sContext = {
	coreApi,
	kc,
} as any;

import { registerTemplateResources } from "./templates.js";

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
		]);
		process.env.AUTH_ENABLED = "false";
		delete process.env.AUTH_SUB_JSONPATH;
	});

	afterEach(() => {
		registerSpy.mockRestore();
		if ((coreApi as any).readNamespacedConfigMap?.mockRestore) {
			spyOn(coreApi, "readNamespacedConfigMap" as any).mockRestore();
		}
		if ((coreApi as any).createNamespacedPod?.mockRestore) {
			spyOn(coreApi, "createNamespacedPod").mockRestore();
		}
	});

	test("registers create_pod_from_template tool", () => {
		expect(registeredTools.has("create_pod_from_template")).toBe(true);
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
			jwtPayload: { sub: "alice-123" },
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
});
