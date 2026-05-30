import { describe, expect, test } from "bun:test";
import { ANNOTATION_KEYS } from "~/config/index.js";
import { applySpawnerAnnotations } from "./annotations.js";
import type { PodCreateArgs } from "./schemas.js";

describe("applySpawnerAnnotations - init container volume mounts", () => {
	const baseSpec: PodCreateArgs = {
		containers: [
			{
				name: "main",
				image: "node:20",
				volumeMounts: [
					{
						name: "shared-vol",
						mountPath: "/data",
					},
				],
			},
		],
		initContainers: [],
	};

	test("auto-applies main container volume mounts by default (no annotation)", () => {
		const annotations = {
			[ANNOTATION_KEYS.INIT_IMAGE]: "alpine",
			[ANNOTATION_KEYS.INIT_COMMAND]: "echo init",
		};

		const result = applySpawnerAnnotations(baseSpec, annotations);

		expect(result.initContainers).toBeDefined();
		expect(result.initContainers!.length).toBe(1);
		expect(result.initContainers![0].name).toBe("spawner-init");
		expect(result.initContainers![0].volumeMounts).toEqual([
			{
				name: "shared-vol",
				mountPath: "/data",
			},
		]);
	});

	test("auto-applies main container volume mounts when sharing flag is explicitly true", () => {
		const annotations = {
			[ANNOTATION_KEYS.INIT_IMAGE]: "alpine",
			[ANNOTATION_KEYS.INIT_COMMAND]: "echo init",
			[ANNOTATION_KEYS.INIT_SHARE_VOLUMES]: "true",
		};

		const result = applySpawnerAnnotations(baseSpec, annotations);

		expect(result.initContainers).toBeDefined();
		expect(result.initContainers!.length).toBe(1);
		expect(result.initContainers![0].volumeMounts).toEqual([
			{
				name: "shared-vol",
				mountPath: "/data",
			},
		]);
	});

	test("does NOT apply main container volume mounts when sharing flag is false", () => {
		const annotations = {
			[ANNOTATION_KEYS.INIT_IMAGE]: "alpine",
			[ANNOTATION_KEYS.INIT_COMMAND]: "echo init",
			[ANNOTATION_KEYS.INIT_SHARE_VOLUMES]: "false",
		};

		const result = applySpawnerAnnotations(baseSpec, annotations);

		expect(result.initContainers).toBeDefined();
		expect(result.initContainers!.length).toBe(1);
		expect(result.initContainers![0].volumeMounts).toBeUndefined();
	});
});
