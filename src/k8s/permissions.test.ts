import { beforeEach, describe, expect, mock, test } from "bun:test";
import * as k8s from "@kubernetes/client-node";
import { initK8sContext } from "./client.js";
import { checkPermission, evaluatePermissions } from "./permissions.js";

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
