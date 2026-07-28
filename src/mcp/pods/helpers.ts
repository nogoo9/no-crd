import type * as k8s from "@kubernetes/client-node";
import { ANNOTATION_KEYS } from "~/config/index.js";

/**
 * Checks if a pod is owned by a given user identifier.
 */
export function isPodOwnedByUser(pod: k8s.V1Pod, userSub: string): boolean {
	if (!userSub) return true;
	const owner =
		pod.metadata?.labels?.[ANNOTATION_KEYS.USER_SUB] ??
		pod.metadata?.annotations?.[ANNOTATION_KEYS.USER_SUB];
	return owner === userSub;
}
