import type * as k8s from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { config } from "~/config/index.js";
import { getK8sError } from "./errors.js";

const logger = getLogger(["nogoo9", "k8s-config"]);

/**
 * Access mode for the orchestration manager.
 * - `"cluster"`: Allows operating across all namespaces if permissions permit.
 * - `"namespaced"`: Locks the server operation to a single namespace.
 */
export const MODE = config.k8s.mode;

/** Default Kubernetes namespace to fallback onto. */
export const DEFAULT_NAMESPACE = config.k8s.namespace;

/** Standard annotation/label keys used to tag managed pod workloads. */
export const LABELS = {
	MANAGED_BY: "app.kubernetes.io/managed-by",
	OWNER: "nogoo9.dev/owner",
	TEMPLATE: "nogoo9.dev/template",
	SESSION: "nogoo9.dev/session",
} as const;

/**
 * Resolves the target namespace based on the current mode and requested namespace.
 * Under `"namespaced"` mode, always returns the locked default namespace.
 *
 * @param requested The requested namespace parameter.
 * @param mode The current active MODE.
 * @param defaultNs The default namespace fallback.
 * @returns The resolved namespace to execute workloads in.
 */
export function resolveNamespace(
	requested: string | undefined,
	mode: string,
	defaultNs: string,
): string {
	const resolved = mode === "namespaced" ? defaultNs : (requested ?? defaultNs);
	logger.debug(
		"Resolved namespace: requested={requested}, mode={mode} -> resolved={resolved}",
		{
			requested,
			mode,
			resolved,
		},
	);
	return resolved;
}

/**
 * Discovers namespaces accessible by checking pod listing authorization.
 * If cluster-level namespace listing is forbidden, falls back to the default namespace.
 *
 * @param api CoreV1Api client dependency.
 * @param mode Current operation mode (cluster or namespaced).
 * @param defaultNs Default namespace fallback.
 * @returns Array of namespaces that are verified accessible.
 */
export async function getAccessibleNamespaces(
	api: k8s.CoreV1Api,
	mode: string,
	defaultNs: string,
): Promise<string[]> {
	logger.info(
		"Discovering accessible namespaces. Mode: {mode}, defaultNs: {defaultNs}",
		{
			mode,
			defaultNs,
		},
	);
	if (mode === "namespaced") return [defaultNs];

	let names: string[];
	try {
		const res = await api.listNamespace();
		names = (res.items ?? [])
			.map((ns) => ns.metadata?.name ?? "")
			.filter(Boolean);
	} catch (err: unknown) {
		const k8sErr = getK8sError(err);
		if (k8sErr.statusCode === 403) {
			logger.warn(
				"Cluster-wide namespace listing forbidden. Falling back to default namespace: {defaultNs}",
				{
					defaultNs,
				},
			);
			return [defaultNs];
		}
		logger.error("Failed to list cluster namespaces: {error}", { error: err });
		throw err;
	}

	const results = await Promise.all(
		names.map(async (name) => {
			try {
				await api.listNamespacedPod({
					namespace: name,
					limit: 1,
				});
				logger.debug("Access verified for namespace: {name}", { name });
				return name;
			} catch (e: unknown) {
				const k8sErr = getK8sError(e);
				if (k8sErr.statusCode === 403) {
					logger.debug("Namespace access denied (forbidden): {name}", { name });
					return null;
				}
				logger.warn("Non-fatal namespace check error on {name}: {error}", {
					name,
					error: e,
				});
				return name;
			}
		}),
	);
	const filtered = results.filter((n): n is string => n !== null);
	logger.info("Found {count} accessible namespaces.", {
		count: filtered.length,
	});
	return filtered;
}
