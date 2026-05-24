import { describe, expect, test } from "bun:test";
import type * as k8s from "@kubernetes/client-node";
import { getAccessibleNamespaces, resolveNamespace } from "./config.js";

describe("resolveNamespace", () => {
	test("namespaced mode always returns default namespace", () => {
		expect(resolveNamespace("user-ns", "namespaced", "default")).toBe(
			"default",
		);
		expect(resolveNamespace(undefined, "namespaced", "default")).toBe(
			"default",
		);
	});

	test("cluster mode returns requested namespace if provided", () => {
		expect(resolveNamespace("user-ns", "cluster", "default")).toBe("user-ns");
	});

	test("cluster mode returns default namespace if requested is undefined", () => {
		expect(resolveNamespace(undefined, "cluster", "default")).toBe("default");
	});
});

describe("getAccessibleNamespaces", () => {
	test("namespaced mode immediately returns default namespace without API calls", async () => {
		let listNamespaceCalled = false;
		const mockCoreApi = {
			listNamespace: async () => {
				listNamespaceCalled = true;
				return { items: [] };
			},
		} as unknown as k8s.CoreV1Api;

		const result = await getAccessibleNamespaces(
			mockCoreApi,
			"namespaced",
			"default",
		);
		expect(result).toEqual(["default"]);
		expect(listNamespaceCalled).toBe(false);
	});

	test("cluster mode lists namespaces and filters by pod list permissions", async () => {
		let listNamespaceCount = 0;
		const podsListedNamespaces: string[] = [];

		const mockCoreApi = {
			listNamespace: async () => {
				listNamespaceCount++;
				return {
					items: [
						{ metadata: { name: "ns-allow" } },
						{ metadata: { name: "ns-deny" } },
						{ metadata: { name: "" } }, // filtered out
					],
				};
			},
			listNamespacedPod: async (param: { namespace: string }) => {
				podsListedNamespaces.push(param.namespace);
				if (param.namespace === "ns-deny") {
					throw { response: { statusCode: 403 } };
				}
				return { items: [] };
			},
		} as unknown as k8s.CoreV1Api;

		const result = await getAccessibleNamespaces(
			mockCoreApi,
			"cluster",
			"default",
		);
		expect(result).toEqual(["ns-allow"]);
		expect(listNamespaceCount).toBe(1);
		expect(podsListedNamespaces).toEqual(["ns-allow", "ns-deny"]);
	});

	test("cluster mode lists namespaces and handles non-403 listNamespacedPod errors as allowed", async () => {
		const mockCoreApi = {
			listNamespace: async () => {
				return {
					items: [
						{ metadata: { name: "ns-allow" } },
						{ metadata: { name: "ns-err" } },
					],
				};
			},
			listNamespacedPod: async (param: { namespace: string }) => {
				if (param.namespace === "ns-err") {
					throw { response: { statusCode: 500 } };
				}
				return { items: [] };
			},
		} as unknown as k8s.CoreV1Api;

		const result = await getAccessibleNamespaces(
			mockCoreApi,
			"cluster",
			"default",
		);
		expect(result).toEqual(["ns-allow", "ns-err"]);
	});

	test("cluster mode falls back to default namespace if listNamespace returns 403 Forbidden", async () => {
		const mockCoreApi = {
			listNamespace: async () => {
				throw { response: { statusCode: 403 } };
			},
		} as unknown as k8s.CoreV1Api;

		const result = await getAccessibleNamespaces(
			mockCoreApi,
			"cluster",
			"default",
		);
		expect(result).toEqual(["default"]);
	});

	test("cluster mode throws non-403 listNamespace errors", async () => {
		const mockCoreApi = {
			listNamespace: async () => {
				throw { response: { statusCode: 500 } };
			},
		} as unknown as k8s.CoreV1Api;

		await expect(
			getAccessibleNamespaces(mockCoreApi, "cluster", "default"),
		).rejects.toEqual({ response: { statusCode: 500 } });
	});
});
