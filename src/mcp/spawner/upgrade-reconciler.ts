import { Observable } from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { ANNOTATION_KEYS } from "~/config/index.js";
import type { K8sContext } from "~/k8s/index.js";

const logger = getLogger(["nogoo9", "mcp-spawner-reconciler"]);

export async function reconcileUpgradingWorkspaces(
	k8sContext: K8sContext,
	ns: string,
): Promise<void> {
	logger.info(
		"Running workspace upgrade reconciliation scan in namespace {namespace}...",
		{ namespace: ns },
	);
	try {
		const labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace`;
		const res = await k8sContext.coreApi.listNamespacedPod({
			namespace: ns,
			labelSelector,
		});

		const podsByWorkspace = new Map<string, any[]>();
		for (const pod of res.items) {
			const wsId = pod.metadata?.labels?.[ANNOTATION_KEYS.WORKSPACE_ID];
			if (wsId) {
				if (!podsByWorkspace.has(wsId)) {
					podsByWorkspace.set(wsId, []);
				}
				podsByWorkspace.get(wsId)!.push(pod);
			}
		}

		for (const [wsId, pods] of podsByWorkspace.entries()) {
			if (pods.length <= 1) continue;

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
				logger.info(
					"Reconciliation: new pod {newPod} is ready for workspace {workspaceId}. Deleting old pod {oldPod}",
					{
						newPod: newPod.metadata?.name,
						workspaceId: wsId,
						oldPod: oldPod.metadata?.name,
					},
				);
				await k8sContext.coreApi
					.deleteNamespacedPod({
						name: oldPod.metadata?.name,
						namespace: ns,
					})
					.catch((err) => {
						logger.error("Reconciliation: failed to delete old pod: {error}", {
							error: err,
						});
					});
			} else {
				const creationTime = new Date(
					newPod.metadata?.creationTimestamp || 0,
				).getTime();
				const elapsed = Date.now() - creationTime;
				if (elapsed > 600000) {
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
						"Reconciliation: upgrade timed out for pod {newPod} (workspace {workspaceId}). Deleting failed pod. Details: {details}",
						{
							newPod: newPod.metadata?.name,
							workspaceId: wsId,
							details: lastErrorDetails,
						},
					);

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
									post: (context: any) =>
										new Observable(Promise.resolve(context)),
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
						logger.warn("Reconciliation: failed to annotate old pod: {error}", {
							error: patchErr,
						});
					}

					await k8sContext.coreApi
						.deleteNamespacedPod({
							name: newPod.metadata?.name,
							namespace: ns,
						})
						.catch((err) => {
							logger.error(
								"Reconciliation: failed to delete failed new pod: {error}",
								{ error: err },
							);
						});
				}
			}
		}
		logger.info("Workspace upgrade reconciliation scan completed.");
	} catch (err) {
		logger.error("Failed to run workspace upgrade reconciliation: {error}", {
			error: err,
		});
	}
}
