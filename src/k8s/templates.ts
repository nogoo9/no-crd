import type * as k8s from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { ANNOTATION_KEYS } from "~/config/index.js";

const logger = getLogger(["nogoo9", "k8s-templates"]);

/** Kubernetes label selector indicating a ConfigMap is a pod template. */
export const TEMPLATE_LABEL = `${ANNOTATION_KEYS.POD_TEMPLATE}=true`;
/** Kubernetes label key indicating a ConfigMap is a pod template. */
export const TEMPLATE_LABEL_KEY = ANNOTATION_KEYS.POD_TEMPLATE;
/** ConfigMap annotation key holding the description text of the template. */
export const DESCRIPTION_ANNOTATION = ANNOTATION_KEYS.DESCRIPTION;
/** ConfigMap annotation key holding the tag/version info of the template. */
export const TAG_ANNOTATION = ANNOTATION_KEYS.TAG;

/**
 * Lists all template ConfigMap resources located in the target namespace.
 * Filters resources matching `TEMPLATE_LABEL` (`nogoo9/pod-template=true`).
 *
 * @param coreApi CoreV1Api client dependency.
 * @param ns Target namespace.
 * @returns Array of ConfigMap resources representing templates.
 */
export async function listTemplateMaps(
	coreApi: k8s.CoreV1Api,
	ns: string,
): Promise<k8s.V1ConfigMap[]> {
	logger.info("Listing template ConfigMaps in namespace '{ns}'", { ns });
	const res = await coreApi.listNamespacedConfigMap({
		namespace: ns,
		labelSelector: TEMPLATE_LABEL,
	});
	const items = res.items ?? [];
	logger.debug("Found {count} template ConfigMaps in namespace '{ns}'", {
		count: items.length,
		ns,
	});
	return items;
}

/**
 * Reads a single template ConfigMap by name in the target namespace.
 *
 * @param coreApi CoreV1Api client dependency.
 * @param ns Target namespace.
 * @param name Name of the template ConfigMap.
 * @returns The matching raw ConfigMap resource.
 */
export async function readTemplateMap(
	coreApi: k8s.CoreV1Api,
	ns: string,
	name: string,
): Promise<k8s.V1ConfigMap> {
	logger.info("Reading template ConfigMap '{name}' in namespace '{ns}'", {
		name,
		ns,
	});
	return await coreApi.readNamespacedConfigMap({
		name,
		namespace: ns,
	});
}

/**
 * Parses an MCP resource template URI or string into namespace and name components.
 * Format support: `pod-template://{namespace}/{name}` or bare `{name}`.
 *
 * @param ref Raw template reference URI/string.
 * @param defaultNs Default namespace fallback if no namespace is in the ref.
 * @returns Object holding the parsed namespace and name.
 */
export function parseTemplateRef(
	ref: string,
	defaultNs: string,
): { ns: string; name: string } {
	const stripped = ref.replace(/^pod-template:\/\//, "");
	const slash = stripped.indexOf("/");
	let parsed: { ns: string; name: string };
	if (slash === -1) {
		parsed = { ns: defaultNs, name: stripped };
	} else {
		parsed = { ns: stripped.slice(0, slash), name: stripped.slice(slash + 1) };
	}
	logger.debug(
		"Parsed template reference '{ref}' -> namespace: '{ns}', name: '{name}'",
		{
			ref,
			ns: parsed.ns,
			name: parsed.name,
		},
	);
	return parsed;
}
