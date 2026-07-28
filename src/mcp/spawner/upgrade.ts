import { Observable } from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { ANNOTATION_KEYS } from "~/config/index.js";
import {
	applySpawnerAnnotations,
	createPodFromArgs,
	DEFAULT_NAMESPACE,
	findLocalTemplate,
	type K8sContext,
	type PodCreateArgs,
	PodSpecSchema,
	parseSpecString,
	parseTemplateRef,
	readTemplateMap,
} from "~/k8s/index.js";

const logger = getLogger(["nogoo9", "mcp-spawner"]);

export async function upgradeWorkspaceInner(
	k8sContext: K8sContext,
	id: string,
	ns: string,
	userSub: string,
	isAdmin: boolean,
): Promise<{ podName: string }> {
	// Find the old workspace pod
	let labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}`;
	if (!isAdmin) {
		labelSelector += `,${ANNOTATION_KEYS.USER_SUB}=${userSub}`;
	}
	const res = await k8sContext.coreApi.listNamespacedPod({
		namespace: ns,
		labelSelector,
	});
	if (!res.items || res.items.length === 0) {
		throw new Error(`Workspace ${id} not found or access denied`);
	}
	const oldPod = res.items[0];
	const oldPodName = oldPod.metadata?.name;
	if (!oldPodName) {
		throw new Error(`Workspace pod for ${id} has no name`);
	}
	const oldPodSpec = oldPod.spec;
	if (!oldPodSpec) {
		throw new Error(`Workspace pod for ${id} has no spec`);
	}
	const oldPodAnnotations = oldPod.metadata?.annotations ?? {};
	const oldPodLabels = oldPod.metadata?.labels ?? {};
	const oldPodOwner =
		oldPodLabels[ANNOTATION_KEYS.USER_SUB] ||
		oldPodAnnotations[ANNOTATION_KEYS.USER_SUB] ||
		userSub;
	const templateRef = oldPodAnnotations[ANNOTATION_KEYS.TEMPLATE_REF];
	if (!templateRef) {
		throw new Error(
			`Workspace ${id} does not have an associated templateRef annotation`,
		);
	}

	// Fetch new template spec & version
	const { ns: tmplNs, name: tmplName } = parseTemplateRef(
		templateRef,
		DEFAULT_NAMESPACE,
	);
	const cm = await readTemplateMap(k8sContext.coreApi, tmplNs, tmplName).catch(
		() => null,
	);

	let raw: string | undefined;
	let newTemplateVersion = "1.0.0";
	const newTemplateAnnotations: Record<string, string> = {};
	const newTemplateLabels: Record<string, string> = {};

	// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
	const VAR_USER = "${{user}}";
	// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
	const VAR_WORKSPACE_ID = "${{workspace_id}}";
	// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
	const VAR_WORKSPACE = "${{workspace}}";
	const templateUser = oldPodOwner || "guest";

	if (cm?.data?.spec) {
		raw = cm.data.spec;
		newTemplateVersion =
			cm.metadata?.annotations?.[ANNOTATION_KEYS.TEMPLATE_VERSION] || "1.0.0";
		if (cm.metadata?.annotations) {
			for (const [k, v] of Object.entries(cm.metadata.annotations)) {
				if (k === "__proto__" || k === "constructor") continue;
				newTemplateAnnotations[k] = v
					.replaceAll(VAR_USER, templateUser)
					.replaceAll(VAR_WORKSPACE_ID, id)
					.replaceAll(VAR_WORKSPACE, id);
			}
		}
		if (cm.metadata?.labels) {
			for (const [k, v] of Object.entries(cm.metadata.labels)) {
				if (k === "__proto__" || k === "constructor") continue;
				newTemplateLabels[k] = v
					.replaceAll(VAR_USER, templateUser)
					.replaceAll(VAR_WORKSPACE_ID, id)
					.replaceAll(VAR_WORKSPACE, id);
			}
		}
	} else {
		// Fallback to local/built-in templates
		const localTmpl = findLocalTemplate(tmplName);
		if (localTmpl) {
			raw = JSON.stringify(localTmpl.spec);
			newTemplateVersion = localTmpl.version || "1.0.0";
			for (const [k, v] of Object.entries(localTmpl.annotations)) {
				if (k === "__proto__" || k === "constructor") continue;
				newTemplateAnnotations[k] = v
					.replaceAll(VAR_USER, templateUser)
					.replaceAll(VAR_WORKSPACE_ID, id)
					.replaceAll(VAR_WORKSPACE, id);
			}
			if (localTmpl.labels) {
				for (const [k, v] of Object.entries(localTmpl.labels)) {
					if (k === "__proto__" || k === "constructor") continue;
					newTemplateLabels[k] = v
						.replaceAll(VAR_USER, templateUser)
						.replaceAll(VAR_WORKSPACE_ID, id)
						.replaceAll(VAR_WORKSPACE, id);
				}
			}
		}
	}

	if (!raw) {
		throw new Error(
			`Template "${templateRef}" not found in ConfigMaps, local templates, or built-in templates during upgrade`,
		);
	}

	const interpolatedRaw = raw
		.replaceAll(VAR_USER, templateUser)
		.replaceAll(VAR_WORKSPACE_ID, id)
		.replaceAll(VAR_WORKSPACE, id);
	let parsedSpec = PodSpecSchema.parse(
		parseSpecString(interpolatedRaw),
	) as PodCreateArgs;

	// Extract all environment variables from old pod's main container as context
	const oldContext: Record<string, string> = {};
	if (oldPodSpec.containers && oldPodSpec.containers.length > 0) {
		const mainContainer = oldPodSpec.containers[0];
		if (mainContainer.env) {
			for (const ev of mainContainer.env) {
				if (ev.name && ev.value !== undefined) {
					oldContext[ev.name] = ev.value;
				}
			}
		}
	}

	// Apply annotations/context
	// Note: We merge annotations first to satisfy required context
	const mergedAnnotations = {
		...newTemplateAnnotations,
		...oldPodAnnotations,
	};
	// Update version annotation
	mergedAnnotations[ANNOTATION_KEYS.TEMPLATE_VERSION] = newTemplateVersion;

	try {
		parsedSpec = applySpawnerAnnotations(
			parsedSpec,
			mergedAnnotations,
			oldContext,
		);
	} catch (err) {
		throw new Error(
			`Failed to apply annotations: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	// Merge volumes from old pod to preserve PVCs and dynamic configurations
	const mergedVolumes = [...(parsedSpec.volumes || [])];
	if (oldPodSpec.volumes) {
		for (const oldVol of oldPodSpec.volumes) {
			const idx = mergedVolumes.findIndex((v) => v.name === oldVol.name);
			if (idx !== -1) {
				mergedVolumes[idx] = oldVol as any;
			} else {
				mergedVolumes.push(oldVol as any);
			}
		}
	}
	parsedSpec.volumes = mergedVolumes;

	// Merge volumeMounts and env in container specs to keep custom mounts & env vars
	if (
		oldPodSpec.containers &&
		oldPodSpec.containers.length > 0 &&
		parsedSpec.containers.length > 0
	) {
		const oldMain = oldPodSpec.containers[0];
		const newMain = parsedSpec.containers[0];

		// Volume mounts
		const mergedMounts = [...(newMain.volumeMounts || [])];
		if (oldMain.volumeMounts) {
			for (const oldMount of oldMain.volumeMounts) {
				if (!mergedMounts.some((m) => m.name === oldMount.name)) {
					mergedMounts.push(oldMount as any);
				}
			}
		}
		newMain.volumeMounts = mergedMounts;

		// Env vars
		const mergedEnv = [...(newMain.env || [])];
		if (oldMain.env) {
			for (const oldEnvVar of oldMain.env) {
				const idx = mergedEnv.findIndex((e) => e.name === oldEnvVar.name);
				if (idx !== -1) {
					mergedEnv[idx] = oldEnvVar as any;
				} else {
					mergedEnv.push(oldEnvVar as any);
				}
			}
		}
		newMain.env = mergedEnv;
	}

	// Re-apply labels and serviceAccountName
	parsedSpec.serviceAccountName =
		oldPodSpec.serviceAccountName || parsedSpec.serviceAccountName;
	parsedSpec.labels = {
		...newTemplateLabels,
		...oldPodLabels,
		...(parsedSpec.labels || {}),
		[ANNOTATION_KEYS.TYPE]: "workspace",
		[ANNOTATION_KEYS.WORKSPACE_ID]: id,
		[ANNOTATION_KEYS.MANAGED_BY]: "nogoo9-spawner",
		[ANNOTATION_KEYS.USER_SUB]: oldPodOwner,
	};
	parsedSpec.annotations = {
		...mergedAnnotations,
		...(parsedSpec.annotations || {}),
		[ANNOTATION_KEYS.USER_SUB]: oldPodOwner,
	};

	// 5. Detect RWO PVCs to decide on recreate vs side-by-side
	const hasPvc =
		oldPodSpec.volumes?.some((v) => v.persistentVolumeClaim) ?? false;

	// Generate a unique pod name for the upgraded pod to support concurrent run
	const suffix = `-up-${Math.random().toString(36).substring(2, 7)}`;
	const basePodName = `ws-${oldPodOwner.replace(/[^a-z0-9-]/gi, "").slice(0, 10)}-${id}`;
	const newPodName = basePodName.slice(0, 63 - suffix.length) + suffix;

	logger.info(
		"Upgrading workspace {workspaceId}: hasPvc={hasPvc}, oldPod={oldPodName}, newPod={newPodName}",
		{ workspaceId: id, hasPvc, oldPodName, newPodName },
	);

	// Start background upgrade workflow
	if (hasPvc) {
		// Recreate-style: Spawn new pod, then immediately delete old pod
		Promise.resolve().then(async () => {
			try {
				logger.info(
					"Upgrading workspace (recreate): Spawning new pod {podName}",
					{
						podName: newPodName,
					},
				);
				await createPodFromArgs(k8sContext.coreApi, ns, newPodName, parsedSpec);

				logger.info(
					"Upgrading workspace (recreate): Deleting old pod {podName}",
					{
						podName: oldPodName,
					},
				);
				await k8sContext.coreApi.deleteNamespacedPod({
					name: oldPodName,
					namespace: ns,
				});
			} catch (err: any) {
				logger.error("Failed background recreate-style upgrade: {error}", {
					error: err instanceof Error ? err.message : String(err),
				});
			}
		});
	} else {
		// Side-by-side: Spawn new pod, wait for ready, then delete old pod
		Promise.resolve().then(async () => {
			try {
				logger.info(
					"Upgrading workspace (side-by-side): Spawning new pod {podName}",
					{
						podName: newPodName,
					},
				);
				await createPodFromArgs(k8sContext.coreApi, ns, newPodName, parsedSpec);

				// Poll for readiness (10-minute timeout: 120 attempts of 5 seconds)
				let ready = false;
				let lastErrorDetails = "Unknown error during readiness polling";
				for (let i = 0; i < 120; i++) {
					try {
						const podStatus = await k8sContext.coreApi.readNamespacedPod({
							name: newPodName,
							namespace: ns,
						});
						const phase = podStatus.status?.phase;
						const podIP = podStatus.status?.podIP;
						if (phase === "Running" && podIP) {
							ready = true;
							break;
						}
						const containerStatuses = podStatus.status?.containerStatuses;
						if (containerStatuses && containerStatuses.length > 0) {
							const state = containerStatuses[0].state;
							if (state?.waiting) {
								lastErrorDetails = `${state.waiting.reason}: ${state.waiting.message}`;
							} else if (state?.terminated) {
								lastErrorDetails = `${state.terminated.reason}: ${state.terminated.message}`;
							}
						}
					} catch (e: any) {
						lastErrorDetails = e instanceof Error ? e.message : String(e);
					}
					// Check config/test env variables or default to 5000ms
					const pollInterval = process.env.NODE_ENV === "test" ? 1 : 5000;
					await new Promise((resolve) => setTimeout(resolve, pollInterval));
				}

				if (!ready) {
					logger.error(
						"Failed background upgrade: new pod did not become ready. Details: {details}",
						{
							details: lastErrorDetails,
						},
					);

					// Annotate old pod
					try {
						const oldPodCurrent = await k8sContext.coreApi.readNamespacedPod({
							name: oldPodName,
							namespace: ns,
						});
						const currentAnn = oldPodCurrent.metadata?.annotations || {};
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
									post: (context: any) =>
										new Observable(Promise.resolve(context)),
								},
							],
						};
						await k8sContext.coreApi.patchNamespacedPod(
							{
								name: oldPodName,
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
						logger.warn(
							"Failed to annotate old pod with upgrade failure: {error}",
							{
								error: patchErr,
							},
						);
					}

					// Delete new pod
					logger.info(
						"Upgrading workspace (side-by-side): Deleting failed new pod {podName}",
						{
							podName: newPodName,
						},
					);
					await k8sContext.coreApi
						.deleteNamespacedPod({
							name: newPodName,
							namespace: ns,
						})
						.catch(() => null);
				} else {
					logger.info(
						"Upgrading workspace (side-by-side): New pod ready. Deleting old pod {podName}",
						{
							podName: oldPodName,
						},
					);
					await k8sContext.coreApi
						.deleteNamespacedPod({
							name: oldPodName,
							namespace: ns,
						})
						.catch((err) => {
							logger.error(
								"Failed to delete old pod during upgrade cleanup: {error}",
								{
									error: err,
								},
							);
						});
				}
			} catch (err: any) {
				logger.error("Error during side-by-side upgrade loop: {error}", {
					error: err instanceof Error ? err.message : String(err),
				});
			}
		});
	}

	return { podName: newPodName };
}

export { reconcileUpgradingWorkspaces } from "./upgrade-reconciler.js";
