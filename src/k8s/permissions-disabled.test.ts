import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type * as k8s from "@kubernetes/client-node";
import { checkPermission, evaluatePermissions } from "./permissions.js";

describe("Permissions Module - Disabled Checks", () => {
	const originalEnvVal = process.env.DISABLE_PERMISSION_CHECKS;

	beforeEach(() => {
		process.env.DISABLE_PERMISSION_CHECKS = "true";
	});

	afterEach(() => {
		process.env.DISABLE_PERMISSION_CHECKS = originalEnvVal;
	});

	test("checkPermission returns true immediately", async () => {
		// Pass a null/dummy API client since it should not be called at all
		const result = await checkPermission(
			null as unknown as k8s.AuthorizationV1Api,
			"create",
			"pods",
			"default",
		);
		expect(result).toBe(true);
	});

	test("evaluatePermissions returns all tools enabled", async () => {
		const report = await evaluatePermissions(
			{ kc: {} as any, coreApi: {} as any },
			"default",
			"cluster",
			true,
		);
		expect(report.configuredFlags.mode).toBe("cluster");
		expect(report.configuredFlags.namespace).toBe("default");
		expect(report.disabledTools.length).toBe(0);
		expect(report.enabledTools).toContain("create_pod");
		expect(report.enabledTools).toContain("list_pods");
		expect(report.enabledTools).toContain("spawn_workspace");
		expect(report.permissions.pods.create).toBe(true);
		expect(report.permissions.configmaps.get).toBe(true);
	});
});
