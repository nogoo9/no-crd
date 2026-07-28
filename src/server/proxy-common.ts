import type * as k8s from "@kubernetes/client-node";
import { ANNOTATION_KEYS } from "~/config/index.js";

/**
 * Checks if a specific workspace auth mode annotation is enabled on the workspace pod.
 */
export function isWorkspaceAuthModeEnabled(
	annotations: Record<string, string>,
	mode: string,
): boolean {
	const authMode = annotations[ANNOTATION_KEYS.WORKSPACE_AUTH_MODE] || "";
	return authMode
		.split(",")
		.map((m) => m.trim().toLowerCase())
		.includes(mode.toLowerCase());
}

/**
 * Discovers a workspace pod in a namespace by its workspace ID label.
 */
export async function findWorkspacePod(
	coreApi: k8s.CoreV1Api,
	ns: string,
	workspaceId: string,
): Promise<k8s.V1Pod | null> {
	const labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${workspaceId}`;
	const res = await coreApi.listNamespacedPod({
		namespace: ns,
		labelSelector,
	});
	if (!res.items || res.items.length === 0) {
		return null;
	}
	return res.items[0];
}
