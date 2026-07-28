import { Observable } from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { ANNOTATION_KEYS, config } from "~/config/index.js";
import {
	DEFAULT_NAMESPACE,
	extractUserIdentity,
	findLocalTemplate,
	type K8sContext,
	PodSpecSchema,
	parseSpecString,
	parseTemplateRef,
	parseWorkspaceApis,
	readTemplateMap,
	verifyAccessOrThrow,
} from "~/k8s/index.js";

const logger = getLogger(["nogoo9", "mcp-spawner"]);

export async function getTemplateLatestVersion(
	k8sContext: K8sContext,
	templateRef: string | undefined,
): Promise<string> {
	if (!templateRef) return "1.0.0";
	try {
		const { ns: tmplNs, name: tmplName } = parseTemplateRef(
			templateRef,
			DEFAULT_NAMESPACE,
		);
		const cm = await readTemplateMap(
			k8sContext.coreApi,
			tmplNs,
			tmplName,
		).catch(() => null);

		if (cm?.metadata?.annotations) {
			const version = cm.metadata.annotations[ANNOTATION_KEYS.TEMPLATE_VERSION];
			if (version) return version;
		}
		// Fallback to local/built-in templates
		const localTmpl = findLocalTemplate(tmplName);
		if (localTmpl?.version) {
			return localTmpl.version;
		}
	} catch (_) {
		// Ignore and return default
	}
	return "1.0.0";
}

export interface UserAuthContext {
	userSub: string;
	isAdmin: boolean;
	subFilter: string;
}

export function verifyAuthAndGetContext(
	jwtPayload: Record<string, unknown> | undefined,
	requiredPermission:
		| "admin"
		| "read"
		| "write"
		| "workspace:write"
		| "template:create"
		| "template:write",
): UserAuthContext {
	if (!config.auth.enabled) {
		let userSub = "guest";
		if (jwtPayload) {
			try {
				userSub = extractUserIdentity(jwtPayload, config.auth.subJsonPath);
			} catch (_) {
				// Ignore
			}
		}
		return { userSub, isAdmin: false, subFilter: "" };
	}
	if (!jwtPayload) {
		throw new Error(
			"Unauthorized: jwtPayload required when AUTH_ENABLED is true",
		);
	}
	verifyAccessOrThrow(jwtPayload, requiredPermission);

	let isAdmin = false;
	try {
		verifyAccessOrThrow(jwtPayload, "admin");
		isAdmin = true;
	} catch (_) {
		// Ignore
	}

	const sub = extractUserIdentity(jwtPayload, config.auth.subJsonPath);
	return {
		userSub: sub,
		isAdmin,
		subFilter: isAdmin ? "" : `,${ANNOTATION_KEYS.USER_SUB}=${sub}`,
	};
}

export async function reconcileUpgradeTransition(
	k8sContext: K8sContext,
	ns: string,
	pods: any[],
): Promise<{ activePod: any; isTransitioning: boolean }> {
	if (pods.length <= 1) {
		return { activePod: pods[0], isTransitioning: false };
	}

	// Sort by creation time descending (newest first)
	const sortedPods = pods.sort((a, b) => {
		const timeA = new Date(a.metadata?.creationTimestamp || 0).getTime();
		const timeB = new Date(b.metadata?.creationTimestamp || 0).getTime();
		return timeB - timeA;
	});

	const newPod = sortedPods[0];
	const oldPod = sortedPods[1];
	const newPodReady =
		newPod.status?.phase === "Running" && newPod.status?.podIP;

	if (newPodReady) {
		// Trigger deletion of old pod dynamically
		logger.info(
			"Dynamic cleanup: new pod {newPod} is ready. Deleting old pod {oldPod}",
			{
				newPod: newPod.metadata?.name,
				oldPod: oldPod.metadata?.name,
			},
		);
		k8sContext.coreApi
			.deleteNamespacedPod({
				name: oldPod.metadata?.name,
				namespace: ns,
			})
			.catch((err) => {
				logger.error("Dynamic cleanup: failed to delete old pod: {error}", {
					error: err,
				});
			});
		return { activePod: newPod, isTransitioning: false };
	}

	// New pod is not ready yet
	const creationTime = new Date(
		newPod.metadata?.creationTimestamp || 0,
	).getTime();
	const elapsed = Date.now() - creationTime;
	if (elapsed > 600000) {
		// 10 minutes
		// Timeout: extract error details, annotate old pod, delete new pod
		let lastErrorDetails = "Upgrade timed out waiting for pod readiness";
		const containerStatuses = newPod.status?.containerStatuses;
		if (containerStatuses && containerStatuses.length > 0) {
			const state = containerStatuses[0].state;
			if (state?.waiting) {
				lastErrorDetails = `${state.waiting.reason}: ${state.waiting.message}`;
			} else if (state?.terminated) {
				lastErrorDetails = `${state.terminated.reason}: ${state.terminated.message}`;
			}
		}
		logger.warn(
			"Dynamic cleanup: upgrade timed out for pod {newPod}. Deleting it. Details: {details}",
			{
				newPod: newPod.metadata?.name,
				details: lastErrorDetails,
			},
		);

		// Annotate old pod
		try {
			const currentAnn = oldPod.metadata?.annotations || {};
			currentAnn["nogoo9/last-upgrade-error"] =
				`Upgrade failed at ${new Date().toISOString()}: ${lastErrorDetails}`;

			const options = {
				middleware: [
					{
						pre: (context: any) => {
							context.setHeaderParam(
								"Content-Type",
								"application/strategic-merge-patch+json",
							);
							return new Observable(Promise.resolve(context));
						},
						post: (context: any) => new Observable(Promise.resolve(context)),
					},
				],
			};
			await k8sContext.coreApi.patchNamespacedPod(
				{
					name: oldPod.metadata?.name,
					namespace: ns,
					body: {
						metadata: {
							annotations: currentAnn,
						},
					},
				},
				options,
			);
		} catch (patchErr) {
			logger.warn("Dynamic cleanup: failed to annotate old pod: {error}", {
				error: patchErr,
			});
		}

		// Delete new pod
		k8sContext.coreApi
			.deleteNamespacedPod({
				name: newPod.metadata?.name,
				namespace: ns,
			})
			.catch((err) => {
				logger.error(
					"Dynamic cleanup: failed to delete failed new pod: {error}",
					{ error: err },
				);
			});

		return { activePod: oldPod, isTransitioning: false };
	}

	// Not timed out yet: route/active is old pod, but status is "Upgrading"
	return { activePod: oldPod, isTransitioning: true };
}

export async function buildWorkspaceDetails(
	k8sContext: K8sContext,
	wsId: string,
	pod: any,
	isTransitioning = false,
): Promise<any> {
	const annotations = pod.metadata?.annotations ?? {};
	const labels = pod.metadata?.labels ?? {};
	const templateRef = annotations[ANNOTATION_KEYS.TEMPLATE_REF];
	const templateVersion =
		annotations[ANNOTATION_KEYS.TEMPLATE_VERSION] || "1.0.0";
	const latestTemplateVersion = templateRef
		? await getTemplateLatestVersion(k8sContext, templateRef)
		: undefined;
	const isOutdated =
		templateRef && latestTemplateVersion
			? templateVersion !== latestTemplateVersion
			: false;

	const userSub =
		labels[ANNOTATION_KEYS.USER_SUB] ??
		annotations[ANNOTATION_KEYS.USER_SUB] ??
		"";
	const workspacePath =
		annotations[ANNOTATION_KEYS.WORKSPACE_PATH] ??
		annotations[ANNOTATION_KEYS.PREVIEW_PATH] ??
		"/";
	const workspaceType =
		annotations[ANNOTATION_KEYS.WORKSPACE_TYPE] ??
		annotations[ANNOTATION_KEYS.PREVIEW_TYPE] ??
		"html";

	let status = pod.status?.phase ?? "Unknown";
	if (isTransitioning) {
		status = "Upgrading";
	}

	return {
		id: wsId,
		name:
			annotations[ANNOTATION_KEYS.WORKSPACE_NAME] ??
			pod.metadata?.name ??
			"unknown",
		status,
		podIP: pod.status?.podIP ?? "",
		port: annotations[ANNOTATION_KEYS.WORKSPACE_PORT] ?? "",
		workspacePath,
		workspaceType,
		previewPath: workspacePath,
		previewType: workspaceType,
		userSub,
		owner: userSub,
		annotations,
		labels,
		templateRef,
		apis: parseWorkspaceApis(annotations),
		spec: pod.spec ? JSON.parse(JSON.stringify(pod.spec)) : undefined,
		pod: JSON.parse(JSON.stringify(pod)),
		podName: pod.metadata?.name,
		templateVersion,
		latestTemplateVersion,
		isOutdated,
		creationTime: pod.metadata?.creationTimestamp
			? new Date(pod.metadata.creationTimestamp).toISOString()
			: undefined,
		description:
			annotations[ANNOTATION_KEYS.DESCRIPTION] ??
			annotations["nogoo9/template-description"] ??
			"",
	};
}

export interface TemplateResolution {
	raw: string;
	spec: any;
	version: string;
	annotations: Record<string, string>;
	labels: Record<string, string>;
}

export async function resolveTemplateSpec(
	k8sContext: K8sContext,
	templateRef: string,
	templateUser: string,
	id: string,
): Promise<TemplateResolution> {
	const { ns: tmplNs, name: tmplName } = parseTemplateRef(
		templateRef,
		DEFAULT_NAMESPACE,
	);
	const cm = await readTemplateMap(k8sContext.coreApi, tmplNs, tmplName).catch(
		() => null,
	);

	let raw: string | undefined;
	let version = "1.0.0";
	const annotations: Record<string, string> = {};
	const labels: Record<string, string> = {};

	// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
	const VAR_USER = "${{user}}";
	// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
	const VAR_WORKSPACE_ID = "${{workspace_id}}";
	// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
	const VAR_WORKSPACE = "${{workspace}}";

	const replacePlaceholders = (val: string) => {
		return val
			.replaceAll(VAR_USER, templateUser)
			.replaceAll(VAR_WORKSPACE_ID, id)
			.replaceAll(VAR_WORKSPACE, id);
	};

	if (cm?.data?.spec) {
		raw = cm.data.spec;
		version =
			cm.metadata?.annotations?.[ANNOTATION_KEYS.TEMPLATE_VERSION] || "1.0.0";
		if (cm.metadata?.annotations) {
			for (const [k, v] of Object.entries(cm.metadata.annotations)) {
				if (k === "__proto__" || k === "constructor") continue;
				annotations[k] = replacePlaceholders(v as string);
			}
		}
		if (cm.metadata?.labels) {
			for (const [k, v] of Object.entries(cm.metadata.labels)) {
				if (k === "__proto__" || k === "constructor") continue;
				labels[k] = replacePlaceholders(v as string);
			}
		}
	} else {
		// Fallback to local/built-in templates
		const localTmpl = findLocalTemplate(tmplName);
		if (localTmpl) {
			logger.warn(
				"ConfigMap template '{templateRef}' not available (likely missing permissions). Using local template '{name}' instead.",
				{ templateRef, name: localTmpl.name },
			);
			raw = JSON.stringify(localTmpl.spec);
			version = localTmpl.version || "1.0.0";
			for (const [k, v] of Object.entries(localTmpl.annotations)) {
				if (k === "__proto__" || k === "constructor") continue;
				annotations[k] = replacePlaceholders(v as string);
			}
			if (localTmpl.labels) {
				for (const [k, v] of Object.entries(localTmpl.labels)) {
					if (k === "__proto__" || k === "constructor") continue;
					labels[k] = replacePlaceholders(v as string);
				}
			}
		}
	}

	if (!raw) {
		throw new Error(
			`Template "${templateRef}" not found in ConfigMaps, local templates, or built-in templates`,
		);
	}

	const interpolatedRaw = replacePlaceholders(raw);
	const spec = PodSpecSchema.parse(parseSpecString(interpolatedRaw));

	return {
		raw: interpolatedRaw,
		spec,
		version,
		annotations,
		labels,
	};
}

/**
 * Merges container overrides into base container list.
 */
export function mergeContainerOverrides(
	baseContainers: any[],
	overrides: any[],
): any[] {
	if (!overrides || overrides.length === 0) return baseContainers;
	const result = [...baseContainers];
	for (const override of overrides) {
		const match = result.find((c: any) => c.name === override.name);
		if (match) {
			Object.assign(match, override);
		} else {
			result.push(override);
		}
	}
	return result;
}
