import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as k8s from "@kubernetes/client-node";
import { initK8sContext } from "./client.js";
import {
	checkPermission,
	clearPermissionCache,
	evaluatePermissions,
} from "./permissions.js";

const mockCreateSelfSubjectAccessReview = mock();
const mockAuthApi = {
	createSelfSubjectAccessReview: mockCreateSelfSubjectAccessReview,
} as any;

describe("Permissions Module", () => {
	let testKc: k8s.KubeConfig;
	let k8sContext: any;
	let originalMakeApiClient: any;

	beforeEach(() => {
		mockCreateSelfSubjectAccessReview.mockReset();
		testKc = new k8s.KubeConfig();
		testKc.loadFromString(`
apiVersion: v1
clusters:
- cluster:
    server: https://localhost:8443
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
kind: Config
preferences: {}
users:
- name: test-user
  user:
    token: test-token
`);
		originalMakeApiClient = testKc.makeApiClient;
		testKc.makeApiClient = (apiClass: any) => {
			if (apiClass === k8s.AuthorizationV1Api) {
				return mockAuthApi;
			}
			return originalMakeApiClient.call(testKc, apiClass);
		};
		k8sContext = initK8sContext(testKc);
	});

	afterEach(() => {
		clearPermissionCache();
	});

	test("checkPermission returns true when allowed", async () => {
		mockCreateSelfSubjectAccessReview.mockResolvedValue({
			status: { allowed: true },
		});

		const allowed = await checkPermission(
			mockAuthApi,
			"list",
			"pods",
			"default",
		);
		expect(allowed).toBe(true);
		expect(mockCreateSelfSubjectAccessReview).toHaveBeenCalledTimes(1);
	});

	test("checkPermission returns false when denied", async () => {
		mockCreateSelfSubjectAccessReview.mockResolvedValue({
			status: { allowed: false },
		});

		const allowed = await checkPermission(
			mockAuthApi,
			"list",
			"pods",
			"default",
		);
		expect(allowed).toBe(false);
	});

	test("checkPermission returns false on exception", async () => {
		mockCreateSelfSubjectAccessReview.mockRejectedValue(
			new Error("Network Error"),
		);

		const allowed = await checkPermission(
			mockAuthApi,
			"list",
			"pods",
			"default",
		);
		expect(allowed).toBe(false);
	});

	test("evaluatePermissions returns correct enabled/disabled lists", async () => {
		mockCreateSelfSubjectAccessReview.mockImplementation(
			(args: {
				body: {
					spec: { resourceAttributes: { verb: string; resource: string } };
				};
			}) => {
				const { resource } = args.body.spec.resourceAttributes;
				// Grant pods permissions, deny configmaps permissions
				if (resource === "pods" || resource === "namespaces") {
					return Promise.resolve({ status: { allowed: true } });
				}
				return Promise.resolve({ status: { allowed: false } });
			},
		);

		const report = await evaluatePermissions(
			k8sContext,
			"test-ns",
			"cluster",
			true,
		);
		expect(report.configuredFlags.mode).toBe("cluster");
		expect(report.configuredFlags.namespace).toBe("test-ns");
		expect(report.permissions.pods?.list).toBe(true);
		expect(report.permissions.configmaps?.create).toBe(false);

		// Pod tools should be enabled
		expect(report.enabledTools).toContain("list_pods");
		expect(report.enabledTools).toContain("get_pod");

		// Template read tools should be enabled (graceful ConfigMap fallback — see ADR-010)
		expect(report.enabledTools).toContain("list_templates");
		expect(report.enabledTools).toContain("get_template");

		// Template write tools should be disabled (require ConfigMap write access)
		expect(report.disabledTools).toContain("create_template");
		expect(report.disabledTools).toContain("update_template");
		expect(report.disabledTools).toContain("delete_template");
	});
});

// ─── Permission Denial Matrix ─────────────────────────────────────────────────

/**
 * Diagnostic tools that are ALWAYS enabled regardless of RBAC.
 * These must never appear in disabledTools.
 */
const ALWAYS_ENABLED = [
	"list_registry_images",
	"current_namespace",
	"check_permissions",
	"get_capabilities",
	"list_templates",
	"get_template",
];

/** All RBAC-gated tools from REQUIRED_PERMISSIONS. */
const ALL_RBAC_TOOLS = [
	"list_pods",
	"get_pod",
	"create_pod",
	"delete_pod",
	"patch_pod",
	"get_pod_logs",
	"list_namespaces",
	"create_template",
	"update_template",
	"delete_template",
	"create_pod_from_template",
	"list_workspaces",
	"spawn_workspace",
	"stop_workspace",
	"get_workspace",
];

/** Tools that require pod permissions (any verb on pods or pods/log). */
const POD_TOOLS = [
	"list_pods",
	"get_pod",
	"create_pod",
	"delete_pod",
	"patch_pod",
	"get_pod_logs",
	"list_workspaces",
	"spawn_workspace",
	"stop_workspace",
	"get_workspace",
];

/** Tools that require configmap write permissions. */
const CONFIGMAP_WRITE_TOOLS = [
	"create_template",
	"update_template",
	"delete_template",
];

describe("Permission denial matrix", () => {
	let testKc: k8s.KubeConfig;
	let k8sContext: any;
	let originalMakeApiClient: any;

	beforeEach(() => {
		mockCreateSelfSubjectAccessReview.mockReset();
		testKc = new k8s.KubeConfig();
		testKc.loadFromString(`
apiVersion: v1
clusters:
- cluster:
    server: https://localhost:8443
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
kind: Config
preferences: {}
users:
- name: test-user
  user:
    token: test-token
`);
		originalMakeApiClient = testKc.makeApiClient;
		testKc.makeApiClient = (apiClass: any) => {
			if (apiClass === k8s.AuthorizationV1Api) {
				return mockAuthApi;
			}
			return originalMakeApiClient.call(testKc, apiClass);
		};
		k8sContext = initK8sContext(testKc);
	});

	afterEach(() => {
		clearPermissionCache();
	});

	test("all permissions granted → all tools enabled", async () => {
		mockCreateSelfSubjectAccessReview.mockResolvedValue({
			status: { allowed: true },
		});

		const report = await evaluatePermissions(
			k8sContext,
			"test-ns",
			"cluster",
			true,
		);

		// All RBAC tools should be enabled
		for (const tool of ALL_RBAC_TOOLS) {
			expect(report.enabledTools).toContain(tool);
		}
		// Diagnostic tools always enabled
		for (const tool of ALWAYS_ENABLED) {
			expect(report.enabledTools).toContain(tool);
		}
		expect(report.disabledTools).toHaveLength(0);
	});

	test("pods denied → pod/workspace tools disabled, template tools enabled", async () => {
		mockCreateSelfSubjectAccessReview.mockImplementation(
			(args: {
				body: {
					spec: {
						resourceAttributes: { verb: string; resource: string };
					};
				};
			}) => {
				const { resource } = args.body.spec.resourceAttributes;
				// Deny all pod-related resources
				if (resource === "pods" || resource === "pods/log") {
					return Promise.resolve({ status: { allowed: false } });
				}
				return Promise.resolve({ status: { allowed: true } });
			},
		);

		const report = await evaluatePermissions(
			k8sContext,
			"test-ns",
			"cluster",
			true,
		);

		// Pod tools should be disabled
		for (const tool of POD_TOOLS) {
			expect(report.disabledTools).toContain(tool);
		}
		// create_pod_from_template requires pods/create too
		expect(report.disabledTools).toContain("create_pod_from_template");

		// Template write tools should be enabled (configmaps are allowed)
		for (const tool of CONFIGMAP_WRITE_TOOLS) {
			expect(report.enabledTools).toContain(tool);
		}

		// Diagnostic tools always enabled
		for (const tool of ALWAYS_ENABLED) {
			expect(report.enabledTools).toContain(tool);
		}
	});

	test("configmaps denied → template write tools disabled, pod tools enabled, template read still works (ADR-010)", async () => {
		mockCreateSelfSubjectAccessReview.mockImplementation(
			(args: {
				body: {
					spec: {
						resourceAttributes: { verb: string; resource: string };
					};
				};
			}) => {
				const { resource } = args.body.spec.resourceAttributes;
				if (resource === "configmaps") {
					return Promise.resolve({ status: { allowed: false } });
				}
				return Promise.resolve({ status: { allowed: true } });
			},
		);

		const report = await evaluatePermissions(
			k8sContext,
			"test-ns",
			"cluster",
			true,
		);

		// Template write tools should be disabled
		for (const tool of CONFIGMAP_WRITE_TOOLS) {
			expect(report.disabledTools).toContain(tool);
		}
		// create_pod_from_template requires configmaps/get
		expect(report.disabledTools).toContain("create_pod_from_template");

		// Template read tools still enabled via local fallback (ADR-010)
		expect(report.enabledTools).toContain("list_templates");
		expect(report.enabledTools).toContain("get_template");

		// Pod tools should be enabled
		for (const tool of POD_TOOLS) {
			expect(report.enabledTools).toContain(tool);
		}

		// Diagnostic tools always enabled
		for (const tool of ALWAYS_ENABLED) {
			expect(report.enabledTools).toContain(tool);
		}
	});

	test("namespaces denied → only list_namespaces disabled", async () => {
		mockCreateSelfSubjectAccessReview.mockImplementation(
			(args: {
				body: {
					spec: {
						resourceAttributes: { verb: string; resource: string };
					};
				};
			}) => {
				const { resource } = args.body.spec.resourceAttributes;
				if (resource === "namespaces") {
					return Promise.resolve({ status: { allowed: false } });
				}
				return Promise.resolve({ status: { allowed: true } });
			},
		);

		const report = await evaluatePermissions(
			k8sContext,
			"test-ns",
			"cluster",
			true,
		);

		expect(report.disabledTools).toContain("list_namespaces");
		// Only list_namespaces should be disabled
		expect(report.disabledTools).toHaveLength(1);

		// Everything else should be enabled
		for (const tool of ALWAYS_ENABLED) {
			expect(report.enabledTools).toContain(tool);
		}
	});

	test("all permissions denied → only diagnostic tools remain", async () => {
		mockCreateSelfSubjectAccessReview.mockResolvedValue({
			status: { allowed: false },
		});

		const report = await evaluatePermissions(
			k8sContext,
			"test-ns",
			"cluster",
			true,
		);

		// All RBAC tools should be disabled
		for (const tool of ALL_RBAC_TOOLS) {
			expect(report.disabledTools).toContain(tool);
		}

		// Diagnostic tools always enabled
		for (const tool of ALWAYS_ENABLED) {
			expect(report.enabledTools).toContain(tool);
		}

		// enabledTools should contain ONLY diagnostic tools
		expect(report.enabledTools).toHaveLength(ALWAYS_ENABLED.length);
	});

	test("K8s auth API completely unreachable → degrades same as all denied", async () => {
		mockCreateSelfSubjectAccessReview.mockRejectedValue(
			new Error("ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:6443"),
		);

		// evaluatePermissions must NOT throw — the server must be able to boot
		const report = await evaluatePermissions(
			k8sContext,
			"test-ns",
			"cluster",
			true,
		);

		// All RBAC tools should be disabled (checkPermission returns false on error)
		for (const tool of ALL_RBAC_TOOLS) {
			expect(report.disabledTools).toContain(tool);
		}

		// Diagnostic tools always enabled
		for (const tool of ALWAYS_ENABLED) {
			expect(report.enabledTools).toContain(tool);
		}

		// enabledTools should contain ONLY diagnostic tools
		expect(report.enabledTools).toHaveLength(ALWAYS_ENABLED.length);
	});
});
