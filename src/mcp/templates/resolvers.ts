import type * as k8s from "@kubernetes/client-node";
import { config } from "~/config/index.js";
import {
	DEFAULT_NAMESPACE,
	DESCRIPTION_ANNOTATION,
	getAccessibleNamespaces,
	type LocalTemplate,
	listLocalTemplates,
	MODE,
	parseWorkspaceApis,
	TAG_ANNOTATION,
} from "~/k8s/index.js";

/**
 * Returns a list of accessible namespaces.
 */
export async function listAccessibleNamespaces(
	coreApi: k8s.CoreV1Api,
): Promise<string[]> {
	return getAccessibleNamespaces(coreApi, MODE, DEFAULT_NAMESPACE);
}

/**
 * Extracts template metadata from a {@link LocalTemplate} into the same shape
 * used by ConfigMap-based templates in tool responses.
 */
export function localTemplateToMeta(
	tmpl: LocalTemplate,
	ns: string,
): {
	name: string;
	namespace: string;
	description: string;
	tag: string;
	version: string;
	requiredContext: string[];
	workspacePath: string;
	workspaceType: string;
	apis: ReturnType<typeof parseWorkspaceApis>;
	isLocal: boolean;
	userSub: string;
} {
	const a = tmpl.annotations;
	const reqRaw = a["nogoo9/required-context"];
	return {
		name: tmpl.name,
		namespace: ns,
		description: a[DESCRIPTION_ANNOTATION] ?? "",
		tag: a[TAG_ANNOTATION] ?? "",
		version: tmpl.version,
		requiredContext: reqRaw
			? reqRaw
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: [],
		workspacePath:
			a["nogoo9/workspace-path"] ?? a["nogoo9/preview-path"] ?? "/",
		workspaceType:
			a["nogoo9/workspace-type"] ?? a["nogoo9/preview-type"] ?? "html",
		apis: parseWorkspaceApis(a),
		isLocal: true,
		userSub: "",
	};
}

/**
 * Collects local + built-in templates (if configured), returning them
 * as {@link LocalTemplate} entries.
 */
export function collectLocalTemplates(): LocalTemplate[] {
	const results: LocalTemplate[] = [];
	const k8sCfg = config.k8s;

	if (k8sCfg.templatesDir) {
		results.push(...listLocalTemplates(k8sCfg.templatesDir));
	}
	if (k8sCfg.builtinTemplates) {
		const builtins = listLocalTemplates(k8sCfg.builtinTemplatesDir);
		const existingNames = new Set(results.map((t) => t.name));
		for (const b of builtins) {
			if (!existingNames.has(b.name)) {
				results.push(b);
			}
		}
	}
	return results;
}
