import { describe, expect, test } from "bun:test";
import { mergeContainersByName, mergeTopLevel } from "./merge.js";

describe("mergeContainersByName", () => {
	test("no override returns base unchanged", () => {
		const base = [{ name: "app", image: "nginx" }];
		expect(mergeContainersByName(base, [])).toEqual(base);
	});

	test("override merges fields and keeps rest of base", () => {
		const base = [
			{
				name: "app",
				image: "nginx:1",
				command: ["run"],
				env: [{ name: "PORT", value: "80" }],
			},
		];
		const overrides = [{ name: "app", image: "nginx:2" }];
		const result = mergeContainersByName(base, overrides);
		expect(result[0].image).toBe("nginx:2");
		expect(result[0].command).toEqual(["run"]);
		expect(result[0].env).toEqual([{ name: "PORT", value: "80" }]);
	});

	test("env vars are merged by name; override wins", () => {
		const base = [
			{
				name: "app",
				image: "nginx",
				env: [
					{ name: "A", value: "1" },
					{ name: "B", value: "2" },
				],
			},
		];
		const overrides = [
			{
				name: "app",
				env: [
					{ name: "B", value: "99" },
					{ name: "C", value: "3" },
				],
			},
		];
		const result = mergeContainersByName(base, overrides);
		expect(result[0].env).toEqual([
			{ name: "A", value: "1" },
			{ name: "B", value: "99" },
			{ name: "C", value: "3" },
		]);
	});

	test("container not in overrides is untouched", () => {
		const base = [
			{ name: "a", image: "a" },
			{ name: "b", image: "b" },
		];
		const result = mergeContainersByName(base, [{ name: "a", image: "A" }]);
		expect(result[1].image).toBe("b");
	});
});

describe("mergeTopLevel", () => {
	test("labels and annotations are deep-merged", () => {
		const base = {
			labels: { x: "1", y: "base-y" },
			annotations: { a: "1" },
			restartPolicy: "Always",
		};
		const overrides = {
			labels: { y: "override-y", z: "3" },
			annotations: { b: "2" },
			restartPolicy: "Never",
		};
		const result = mergeTopLevel(base, overrides);
		expect(result.labels).toEqual({ x: "1", y: "override-y", z: "3" });
		expect(result.annotations).toEqual({ a: "1", b: "2" });
		expect(result.restartPolicy).toBe("Never");
	});

	test("handles missing labels/annotations gracefully", () => {
		const base = { restartPolicy: "Always" };
		const overrides = { labels: { k: "v" } };
		const result = mergeTopLevel(base, overrides);
		expect(result.labels).toEqual({ k: "v" });
		expect(result.annotations).toEqual({});
	});
});
