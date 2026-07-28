import { getLogger } from "@logtape/logtape";
import { ANNOTATION_KEYS, config } from "~/config/index.js";
import {
	applySpawnerAnnotations,
	createPodFromArgs,
	DEFAULT_NAMESPACE,
	errorResult,
	type K8sContext,
	MODE,
	PodSpecSchema,
	parseSpecString,
	provisionServiceAccount,
	requestContextStore,
	resolveNamespace,
} from "~/k8s/index.js";
import {
	buildWorkspaceDetails,
	getTemplateLatestVersion,
	mergeContainerOverrides,
	reconcileUpgradeTransition,
	resolveTemplateSpec,
	verifyAuthAndGetContext,
} from "~/mcp/spawner/helpers.js";
import { upgradeWorkspaceInner } from "~/mcp/spawner/upgrade.js";

const logger = getLogger(["nogoo9", "mcp-spawner"]);

function resolveActiveJwt(
	jwtPayload: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	const store = requestContextStore.getStore();
	return jwtPayload || store?.jwtPayload;
}

export function listWorkspacesHandler(k8sContext: K8sContext) {
	return async ({
		namespace,
		jwtPayload,
	}: {
		namespace?: string;
		jwtPayload?: Record<string, unknown>;
	}) => {
		const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
		const activeJwtPayload = resolveActiveJwt(jwtPayload);
		logger.info(
			"Tool list_workspaces called in namespace {namespace} (authEnabled: {authEnabled})",
			{ namespace: ns, authEnabled: config.auth.enabled },
		);
		try {
			const authCtx = verifyAuthAndGetContext(activeJwtPayload, "read");
			const labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace${authCtx.subFilter}`;

			const res = await k8sContext.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector,
			});

			// Group pods by workspace ID
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

			const workspaces = await Promise.all(
				Array.from(podsByWorkspace.entries()).map(async ([wsId, pods]) => {
					const { activePod, isTransitioning } =
						await reconcileUpgradeTransition(k8sContext, ns, pods);
					return buildWorkspaceDetails(
						k8sContext,
						wsId,
						activePod,
						isTransitioning,
					);
				}),
			);

			logger.debug("Successfully listed {count} workspaces", {
				count: workspaces.length,
			});
			if (!workspaces.length) {
				return {
					content: [{ type: "text" as const, text: "(no workspaces)" }],
					structuredContent: { workspaces: [] },
				};
			}

			const rows = workspaces.map((w) => `${w.id}\t${w.name}\t${w.status}`);
			return {
				content: [
					{
						type: "text" as const,
						text: ["ID\tNAME\tSTATUS", ...rows].join("\n"),
					},
				],
				structuredContent: { workspaces },
			};
		} catch (err: any) {
			logger.error("Failed to list workspaces: {error}", { error: err });
			return errorResult(k8sContext.kc, err, { workspaces: [] });
		}
	};
}

export function spawnWorkspaceHandler(k8sContext: K8sContext) {
	return async ({
		id,
		templateRef,
		namespace,
		context,
		containerOverrides,
		topLevelOverrides,
		labels,
		annotations,
		spec,
		jwtPayload,
	}: {
		id: string;
		templateRef?: string;
		namespace?: string;
		context?: Record<string, string>;
		containerOverrides?: any[];
		topLevelOverrides?: any;
		labels?: Record<string, string>;
		annotations?: Record<string, string>;
		spec?: any;
		jwtPayload?: Record<string, unknown>;
	}) => {
		const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
		const activeJwtPayload = resolveActiveJwt(jwtPayload);
		logger.info(
			"Tool spawn_workspace called for workspace ID {id} in namespace {namespace}",
			{
				id,
				namespace: ns,
			},
		);

		try {
			const authCtx = verifyAuthAndGetContext(
				activeJwtPayload,
				"workspace:write",
			);
			const userSub = authCtx.userSub;

			let resolvedSpec: any;
			let resolvedAnnotations: Record<string, string> = {};
			let resolvedLabels: Record<string, string> = {};
			let _templateVersion = "1.0.0";

			if (templateRef) {
				const resolved = await resolveTemplateSpec(
					k8sContext,
					templateRef,
					userSub,
					id,
				);
				resolvedSpec = (resolved as any).spec;
				resolvedAnnotations = resolved.annotations;
				resolvedLabels = resolved.labels;
				_templateVersion = resolved.version;
			} else if (spec) {
				const raw = JSON.stringify(spec);
				// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
				const VAR_USER = "${{user}}";
				// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
				const VAR_WORKSPACE_ID = "${{workspace_id}}";
				// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
				const VAR_WORKSPACE = "${{workspace}}";
				const interpolated = raw
					.replaceAll(VAR_USER, userSub)
					.replaceAll(VAR_WORKSPACE_ID, id)
					.replaceAll(VAR_WORKSPACE, id);
				resolvedSpec = PodSpecSchema.parse(parseSpecString(interpolated));

				if (annotations) {
					for (const [k, v] of Object.entries(annotations)) {
						if (k === "__proto__" || k === "constructor") continue;
						resolvedAnnotations[k] = v
							.replaceAll(VAR_USER, userSub)
							.replaceAll(VAR_WORKSPACE_ID, id)
							.replaceAll(VAR_WORKSPACE, id);
					}
				}
				if (labels) {
					for (const [k, v] of Object.entries(labels)) {
						if (k === "__proto__" || k === "constructor") continue;
						resolvedLabels[k] = v
							.replaceAll(VAR_USER, userSub)
							.replaceAll(VAR_WORKSPACE_ID, id)
							.replaceAll(VAR_WORKSPACE, id);
					}
				}
			} else {
				throw new Error("Either templateRef or spec must be provided");
			}

			const mergedSpec = topLevelOverrides
				? { ...resolvedSpec, ...topLevelOverrides }
				: resolvedSpec;

			if (
				containerOverrides &&
				containerOverrides.length > 0 &&
				mergedSpec.containers
			) {
				mergedSpec.containers = mergeContainerOverrides(
					mergedSpec.containers,
					containerOverrides,
				);
			}

			let serviceAccountName = mergedSpec.serviceAccountName;
			if (!serviceAccountName) {
				serviceAccountName = await provisionServiceAccount(
					k8sContext.coreApi,
					ns,
					id,
					userSub,
				);
				mergedSpec.serviceAccountName = serviceAccountName;
			}

			const podName = `ws-${userSub}-${id}`;
			const finalPodArgs = applySpawnerAnnotations(
				mergedSpec,
				resolvedAnnotations,
				context,
			);

			const createdPod = await createPodFromArgs(
				k8sContext.coreApi,
				ns,
				podName,
				finalPodArgs,
			);

			logger.info(
				"Successfully spawned workspace {id} (Pod: {podName}) in namespace {namespace}",
				{
					id,
					podName: createdPod.name,
					namespace: ns,
				},
			);

			return {
				content: [
					{
						type: "text" as const,
						text: `Successfully spawned workspace ${id} (Pod: ${createdPod.name})`,
					},
				],
				structuredContent: {
					id,
					status: "spawned",
					podName: createdPod.name,
					namespace: ns,
				},
			};
		} catch (err: any) {
			logger.error(
				"Failed to spawn workspace {id} in namespace {namespace}: {error}",
				{
					id,
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, {
				id,
				status: "Failed",
				podName: "",
			});
		}
	};
}

export function stopWorkspaceHandler(k8sContext: K8sContext) {
	return async ({
		id,
		namespace,
		jwtPayload,
	}: {
		id: string;
		namespace?: string;
		jwtPayload?: Record<string, unknown>;
	}) => {
		const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
		const activeJwtPayload = resolveActiveJwt(jwtPayload);
		logger.info(
			"Tool stop_workspace called for workspace ID {id} in namespace {namespace}",
			{
				id,
				namespace: ns,
			},
		);
		try {
			const authCtx = verifyAuthAndGetContext(
				activeJwtPayload,
				"workspace:write",
			);
			const labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}${authCtx.subFilter}`;

			const res = await k8sContext.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector,
			});

			if (!res.items || res.items.length === 0) {
				throw new Error(
					`Workspace ${id} not found or access denied in namespace ${ns}`,
				);
			}

			for (const pod of res.items) {
				const podName = pod.metadata?.name;
				if (podName) {
					logger.info(
						"Deleting workspace pod {podName} for workspace ID {id} in namespace {namespace}",
						{ podName, id, namespace: ns },
					);
					await k8sContext.coreApi.deleteNamespacedPod({
						name: podName,
						namespace: ns,
					});
				}
			}

			logger.info(
				"Successfully stopped workspace {id} in namespace {namespace}",
				{
					id,
					namespace: ns,
				},
			);

			return {
				content: [
					{
						type: "text" as const,
						text: `Stopped workspace ${id}`,
					},
				],
				structuredContent: {
					id,
					status: "stopped",
				},
			};
		} catch (err: any) {
			logger.error(
				"Failed to stop workspace {id} in namespace {namespace}: {error}",
				{
					id,
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, { id, status: "Failed" });
		}
	};
}

export function getWorkspaceHandler(k8sContext: K8sContext) {
	return async ({
		id,
		namespace,
		jwtPayload,
	}: {
		id: string;
		namespace?: string;
		jwtPayload?: Record<string, unknown>;
	}) => {
		const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
		const activeJwtPayload = resolveActiveJwt(jwtPayload);
		logger.info(
			"Tool get_workspace called for workspace ID {id} in namespace {namespace}",
			{
				id,
				namespace: ns,
			},
		);
		try {
			const authCtx = verifyAuthAndGetContext(activeJwtPayload, "read");
			const labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}${authCtx.subFilter}`;

			const res = await k8sContext.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector,
			});

			if (!res.items || res.items.length === 0) {
				throw new Error(
					`Workspace ${id} not found or access denied in namespace ${ns}`,
				);
			}

			const { activePod, isTransitioning } = await reconcileUpgradeTransition(
				k8sContext,
				ns,
				res.items,
			);
			const details = await buildWorkspaceDetails(
				k8sContext,
				id,
				activePod,
				isTransitioning,
			);

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(details, null, 2),
					},
				],
				structuredContent: details,
			};
		} catch (err: any) {
			logger.error(
				"Failed to get workspace {id} in namespace {namespace}: {error}",
				{
					id,
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, { id, status: "NotFound" });
		}
	};
}

export function getWorkspaceEventsHandler(k8sContext: K8sContext) {
	return async ({
		id,
		namespace,
		jwtPayload,
	}: {
		id: string;
		namespace?: string;
		jwtPayload?: Record<string, unknown>;
	}) => {
		const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
		const activeJwtPayload = resolveActiveJwt(jwtPayload);
		logger.info(
			"Tool get_workspace_events called for workspace ID {id} in namespace {namespace}",
			{
				id,
				namespace: ns,
			},
		);
		try {
			const authCtx = verifyAuthAndGetContext(activeJwtPayload, "read");
			const labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}${authCtx.subFilter}`;

			const res = await k8sContext.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector,
			});

			if (!res.items || res.items.length === 0) {
				throw new Error(
					`Workspace ${id} not found or access denied in namespace ${ns}`,
				);
			}

			const podNames = res.items
				.map((p) => p.metadata?.name)
				.filter(Boolean) as string[];

			const eventsRes = await k8sContext.coreApi.listNamespacedEvent({
				namespace: ns,
			});

			const events = (eventsRes.items || [])
				.filter(
					(e) =>
						e.involvedObject?.name && podNames.includes(e.involvedObject.name),
				)
				.map((e) => ({
					type: e.type || "Normal",
					reason: e.reason || "",
					message: e.message || "",
					timestamp: e.lastTimestamp || e.eventTime || e.firstTimestamp,
					podName: e.involvedObject?.name,
				}));

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(events, null, 2),
					},
				],
				structuredContent: { events },
			};
		} catch (err: any) {
			logger.error(
				"Failed to get workspace events for {id} in namespace {namespace}: {error}",
				{
					id,
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, { events: [] });
		}
	};
}

export function upgradeWorkspaceHandler(k8sContext: K8sContext) {
	return async ({
		id,
		namespace,
		jwtPayload,
	}: {
		id: string;
		namespace?: string;
		jwtPayload?: Record<string, unknown>;
	}) => {
		const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
		const activeJwtPayload = resolveActiveJwt(jwtPayload);
		logger.info(
			"Tool upgrade_workspace called for workspace ID {id} in namespace {namespace}",
			{
				id,
				namespace: ns,
			},
		);
		try {
			const authCtx = verifyAuthAndGetContext(
				activeJwtPayload,
				"workspace:write",
			);
			const result = await upgradeWorkspaceInner(
				k8sContext,
				id,
				ns,
				authCtx.userSub,
				authCtx.isAdmin,
			);
			return {
				content: [
					{
						type: "text" as const,
						text: `Successfully upgraded workspace ${id} (Pod: ${result.podName})`,
					},
				],
				structuredContent: {
					id,
					status: "upgrading",
					podName: result.podName,
				},
			};
		} catch (err: any) {
			logger.error(
				"Failed to upgrade workspace {id} in namespace {namespace}: {error}",
				{
					id,
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, { id, status: "Failed" });
		}
	};
}

export function upgradeAllWorkspacesHandler(k8sContext: K8sContext) {
	return async ({
		namespace,
		jwtPayload,
	}: {
		namespace?: string;
		jwtPayload?: Record<string, unknown>;
	}) => {
		const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
		const activeJwtPayload = resolveActiveJwt(jwtPayload);
		logger.info("Tool upgrade_all_workspaces called in namespace {namespace}", {
			namespace: ns,
		});
		try {
			const authCtx = verifyAuthAndGetContext(
				activeJwtPayload,
				"workspace:write",
			);
			if (config.auth.enabled && !authCtx.isAdmin) {
				throw new Error(
					"Forbidden: Only admin users can upgrade all workspaces",
				);
			}
			const labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace${authCtx.subFilter}`;

			const res = await k8sContext.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector,
			});
			const outdated: Array<{ id: string }> = [];
			for (const pod of res.items) {
				const ann = pod.metadata?.annotations ?? {};
				const templateRef = ann[ANNOTATION_KEYS.TEMPLATE_REF];
				if (!templateRef) continue;
				const templateVersion =
					ann[ANNOTATION_KEYS.TEMPLATE_VERSION] || "1.0.0";
				const latestTemplateVersion = await getTemplateLatestVersion(
					k8sContext,
					templateRef,
				);
				if (templateVersion !== latestTemplateVersion) {
					const id = pod.metadata?.labels?.[ANNOTATION_KEYS.WORKSPACE_ID];
					if (id) outdated.push({ id });
				}
			}

			logger.info("Found {count} outdated workspaces to upgrade", {
				count: outdated.length,
			});

			const upgradedList: string[] = [];
			const upgradedPodsList: Array<{ id: string; podName: string }> = [];
			const failedList: Array<{ id: string; error: string }> = [];

			for (const ws of outdated) {
				try {
					const result = await upgradeWorkspaceInner(
						k8sContext,
						ws.id,
						ns,
						authCtx.userSub,
						authCtx.isAdmin,
					);
					upgradedList.push(ws.id);
					upgradedPodsList.push({ id: ws.id, podName: result.podName });
				} catch (err: any) {
					failedList.push({ id: ws.id, error: err.message || String(err) });
				}
			}

			return {
				content: [
					{
						type: "text" as const,
						text: `Upgraded ${upgradedList.length} workspaces. Failed ${failedList.length} upgrades.`,
					},
				],
				structuredContent: {
					upgraded: upgradedList,
					failed: failedList,
					upgradedPods: upgradedPodsList,
				},
			};
		} catch (err: any) {
			logger.error(
				"Failed to upgrade all workspaces in namespace {namespace}: {error}",
				{
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, { upgraded: [], failed: [] });
		}
	};
}

export function runAgentInWorkspaceHandler(k8sContext: K8sContext) {
	return async ({
		id,
		command,
		namespace,
		jwtPayload,
	}: {
		id: string;
		command: string[];
		namespace?: string;
		jwtPayload?: Record<string, unknown>;
	}) => {
		const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
		const activeJwtPayload = resolveActiveJwt(jwtPayload);
		logger.info(
			"Tool run_agent_in_workspace called for workspace ID {id} in namespace {namespace}",
			{
				id,
				namespace: ns,
			},
		);

		try {
			const authCtx = verifyAuthAndGetContext(
				activeJwtPayload,
				"workspace:write",
			);
			const labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}${authCtx.subFilter}`;

			const res = await k8sContext.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector,
			});

			if (!res.items || res.items.length === 0) {
				throw new Error(
					`Workspace ${id} not found or access denied in namespace ${ns}`,
				);
			}

			const pod = res.items[0];
			const podName = pod.metadata?.name;
			if (!podName) {
				throw new Error(`Workspace pod for ${id} has no name`);
			}

			const exec = new (await import("@kubernetes/client-node")).Exec(
				k8sContext.kc,
			);
			const stdoutStream = new (await import("node:stream")).PassThrough();
			const stderrStream = new (await import("node:stream")).PassThrough();

			let stdoutText = "";
			let stderrText = "";

			stdoutStream.on("data", (chunk) => {
				stdoutText += chunk.toString();
			});
			stderrStream.on("data", (chunk) => {
				stderrText += chunk.toString();
			});

			await new Promise<void>((resolve, reject) => {
				exec
					.exec(
						ns,
						podName,
						"agent",
						command,
						stdoutStream,
						stderrStream,
						null,
						false,
					)
					.then((ws) => {
						ws.on("close", () => resolve());
						ws.on("error", (err: any) => reject(err));
					})
					.catch(reject);
			});

			logger.info("Successfully executed agent command in workspace {id}", {
				id,
			});

			return {
				content: [
					{
						type: "text" as const,
						text: stdoutText || stderrText || "Command executed successfully",
					},
				],
				structuredContent: {
					stdout: stdoutText,
					stderr: stderrText,
				},
			};
		} catch (err: any) {
			logger.error("Failed to run agent command in workspace {id}: {error}", {
				id,
				error: err,
			});
			return errorResult(k8sContext.kc, err, { stdout: "", stderr: "" });
		}
	};
}
