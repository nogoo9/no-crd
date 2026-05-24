import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
	listTemplateMaps,
	parseTemplateRef,
	readTemplateMap,
	TEMPLATE_LABEL,
} from "./templates.js";

const coreApi = {
	listNamespacedConfigMap: async () => ({}) as any,
	readNamespacedConfigMap: async () => ({}) as any,
} as any;

describe("parseTemplateRef", () => {
	test("parses full reference with namespace and name", () => {
		const result = parseTemplateRef(
			"pod-template://custom-ns/gpu-node",
			"default-ns",
		);
		expect(result).toEqual({ ns: "custom-ns", name: "gpu-node" });
	});

	test("parses bare reference using default namespace", () => {
		const result = parseTemplateRef("pod-template://cpu-only", "default-ns");
		expect(result).toEqual({ ns: "default-ns", name: "cpu-only" });
	});

	test("handles string without prefix correctly", () => {
		const result = parseTemplateRef("cpu-only", "default-ns");
		expect(result).toEqual({ ns: "default-ns", name: "cpu-only" });
	});
});

describe("listTemplateMaps", () => {
	afterEach(() => {
		spyOn(coreApi, "listNamespacedConfigMap").mockRestore();
	});

	test("lists template ConfigMaps with correct namespace and selector", async () => {
		const mockItems = [
			{ metadata: { name: "t1" } },
			{ metadata: { name: "t2" } },
		];
		const mockList = spyOn(
			coreApi,
			"listNamespacedConfigMap",
		).mockResolvedValue({
			items: mockItems,
		} as any);

		const result = await listTemplateMaps(coreApi, "test-ns");

		expect(result).toEqual(mockItems as any);
		expect(mockList).toHaveBeenCalledTimes(1);
		expect(mockList.mock.calls[0][0]).toEqual({
			namespace: "test-ns",
			labelSelector: TEMPLATE_LABEL,
		});
	});
});

describe("readTemplateMap", () => {
	afterEach(() => {
		spyOn(coreApi, "readNamespacedConfigMap").mockRestore();
	});

	test("reads specific ConfigMap map from correct namespace", async () => {
		const mockCM = { metadata: { name: "t1" }, data: { spec: "{}" } };
		const mockRead = spyOn(
			coreApi,
			"readNamespacedConfigMap",
		).mockResolvedValue(mockCM as any);

		const result = await readTemplateMap(coreApi, "test-ns", "t1");

		expect(result).toEqual(mockCM as any);
		expect(mockRead).toHaveBeenCalledTimes(1);
		expect(mockRead.mock.calls[0][0]).toEqual({
			name: "t1",
			namespace: "test-ns",
		});
	});
});
