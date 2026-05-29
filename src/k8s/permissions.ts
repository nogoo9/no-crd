import * as k8s from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { config } from "~/config/index.js";
import { type K8sContext, makeApiClient } from "./client.js";

const logger = getLogger(["nogoo9", "permissions"]);

export interface RbacPermission {
	verb: string;
	resource: string;
}

export const REQUIRED_PERMISSIONS: Record<string, RbacPermission[]> = {
	list_pods: [{ verb: "list", resource: "pods" }],
	get_pod: [{ verb: "get", resource: "pods" }],
	create_pod: [{ verb: "create", resource: "pods" }],
	delete_pod: [{ verb: "delete", resource: "pods" }],
	patch_pod: [{ verb: "patch", resource: "pods" }],
	get_pod_logs: [{ verb: "get", resource: "pods/log" }],
	list_namespaces: [{ verb: "list", resource: "namespaces" }],
	list_templates: [{ verb: "list", resource: "configmaps" }],
	get_template: [{ verb: "get", resource: "configmaps" }],
	create_template: [{ verb: "create", resource: "configmaps" }],
	update_template: [{ verb: "update", resource: "configmaps" }],
	delete_template: [{ verb: "delete", resource: "configmaps" }],
	create_pod_from_template: [
		{ verb: "get", resource: "configmaps" },
		{ verb: "create", resource: "pods" },
	],
	list_workspaces: [{ verb: "list", resource: "pods" }],
	spawn_workspace: [{ verb: "create", resource: "pods" }],
	stop_workspace: [{ verb: "delete", resource: "pods" }],
	get_workspace: [{ verb: "get", resource: "pods" }],
};

export interface PermissionReport {
	configuredFlags: {
		mode: string;
		namespace: string;
	};
	permissions: Record<string, Record<string, boolean>>;
	enabledTools: string[];
	disabledTools: string[];
}

let cachedReport: PermissionReport | null = null;

/**
 * Checks a specific Kubernetes RBAC permission using the SelfSubjectAccessReview API.
 * Always returns true if `DISABLE_PERMISSION_CHECKS` environment variable is active.
 *
 * @param authApi AuthorizationV1Api client dependency.
 * @param verb The API verb to check (e.g. "list", "create").
 * @param resource The Kubernetes resource name (e.g. "pods", "configmaps").
 * @param namespace The target namespace.
 * @returns Promise resolving to true if authorization is granted.
 */
export async function checkPermission(
	authApi: k8s.AuthorizationV1Api,
	verb: string,
	resource: string,
	namespace: string,
): Promise<boolean> {
	if (config.k8s.disablePermissionChecks) {
		logger.debug("Bypassing permission check (DISABLE_PERMISSION_CHECKS=true)");
		return true;
	}
	logger.debug(
		"Checking RBAC authorization: verb={verb}, resource={resource}, namespace={namespace}",
		{
			verb,
			resource,
			namespace,
		},
	);
	try {
		const review = await authApi.createSelfSubjectAccessReview({
			body: {
				apiVersion: "authorization.k8s.io/v1",
				kind: "SelfSubjectAccessReview",
				spec: {
					resourceAttributes: {
						namespace,
						verb,
						resource,
					},
				},
			},
		});
		const allowed = review.status?.allowed ?? false;
		logger.debug(
			"Permission result: verb={verb}, resource={resource} -> allowed={allowed}",
			{
				verb,
				resource,
				allowed,
			},
		);
		return allowed;
	} catch (err) {
		logger.warn("Access review failed for {verb} on {resource}: {error}", {
			verb,
			resource,
			error: err,
		});
		return false;
	}
}

/**
 * Evaluates the required permissions for all registered MCP tools and constructs a PermissionReport.
 * Under `"namespaced"` mode, some checks (such as namespace listing) are adjusted/bypassed.
 * Uses caching to optimize startup and requests unless `forceRefresh` is enabled.
 *
 * @param k8sContext Active K8sContext containing API clients.
 * @param namespace The default namespace parameter.
 * @param mode The active mode (cluster or namespaced).
 * @param forceRefresh Force reloading permissions even if cached report exists.
 * @returns Structured PermissionReport containing permitted verbs and enabled/disabled lists.
 */
export async function evaluatePermissions(
	k8sContext: K8sContext,
	namespace: string,
	mode: string,
	forceRefresh = false,
): Promise<PermissionReport> {
	logger.info(
		"Evaluating permissions report for namespace: '{namespace}', mode: '{mode}'",
		{
			namespace,
			mode,
		},
	);
	if (config.k8s.disablePermissionChecks) {
		logger.info(
			"Permission checks are disabled via environment variable. Granting full access.",
		);
		const permissions: Record<string, Record<string, boolean>> = {};
		for (const reqs of Object.values(REQUIRED_PERMISSIONS)) {
			for (const p of reqs) {
				if (!permissions[p.resource]) {
					permissions[p.resource] = {};
				}
				permissions[p.resource][p.verb] = true;
			}
		}
		const enabledTools: string[] = [
			"list_registry_images",
			"current_namespace",
			"check_permissions",
			"get_capabilities",
			...Object.keys(REQUIRED_PERMISSIONS),
		];
		return {
			configuredFlags: { mode, namespace },
			permissions,
			enabledTools,
			disabledTools: [],
		};
	}

	if (cachedReport && !forceRefresh) {
		logger.debug("Returning cached permissions report.");
		return cachedReport;
	}

	const authApi = makeApiClient(k8sContext.kc, k8s.AuthorizationV1Api);

	// Collect unique verb+resource pairs to test
	const uniqueChecks = new Map<string, RbacPermission>();
	for (const permissions of Object.values(REQUIRED_PERMISSIONS)) {
		for (const p of permissions) {
			const key = `${p.verb}:${p.resource}`;
			uniqueChecks.set(key, p);
		}
	}

	// Always check list namespaces unless in namespaced mode
	if (mode !== "namespaced") {
		uniqueChecks.set("list:namespaces", {
			verb: "list",
			resource: "namespaces",
		});
	}

	const permissions: Record<string, Record<string, boolean>> = {};

	// Run checks
	await Promise.all(
		Array.from(uniqueChecks.values()).map(async ({ verb, resource }) => {
			const allowed = await checkPermission(authApi, verb, resource, namespace);
			if (!permissions[resource]) {
				permissions[resource] = {};
			}
			permissions[resource][verb] = allowed;
		}),
	);

	// Evaluate each tool
	const enabledTools: string[] = [
		"list_registry_images",
		"current_namespace",
		"check_permissions",
		"get_capabilities",
	];
	const disabledTools: string[] = [];

	for (const [toolName, reqs] of Object.entries(REQUIRED_PERMISSIONS)) {
		let meetsAll = true;
		for (const req of reqs) {
			const allowed = permissions[req.resource]?.[req.verb] ?? false;
			if (!allowed) {
				// Special check: in namespace mode, list_namespaces does not need cluster-level namespaces list
				if (toolName === "list_namespaces" && mode === "namespaced") {
					continue;
				}
				meetsAll = false;
				break;
			}
		}
		if (meetsAll) {
			enabledTools.push(toolName);
		} else {
			disabledTools.push(toolName);
			logger.warn(
				"Tool {tool} is disabled due to missing Kubernetes permissions.",
				{ tool: toolName },
			);
		}
	}

	cachedReport = {
		configuredFlags: { mode, namespace },
		permissions,
		enabledTools,
		disabledTools,
	};

	logger.info(
		"Permissions check completed. Enabled tools: {enabledCount}, Disabled tools: {disabledCount}",
		{
			enabledCount: enabledTools.length,
			disabledCount: disabledTools.length,
		},
	);

	return cachedReport;
}
