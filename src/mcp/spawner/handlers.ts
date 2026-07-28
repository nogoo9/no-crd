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
	reconcileUpgradeTransition,
	resolveTemplateSpec,
	verifyAuthAndGetContext,
} from "./helpers.js";
import { upgradeWorkspaceInner } from "./upgrade.js";

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
			logger.error(
				"Failed to list workspaces in namespace {namespace}: {error}",
				{
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, { workspaces: [] });
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
			"Tool get_workspace called for workspace ID {id} in namespace {namespace} (authEnabled: {authEnabled})",
			{ id, namespace: ns, authEnabled: config.auth.enabled },
		);
		try {
			const authCtx = verifyAuthAndGetContext(activeJwtPayload, "read");
			const labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}${authCtx.subFilter}`;

			const res = await k8sContext.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector,
			});
			if (res.items.length === 0) {
				throw new Error(`Workspace ${id} not found or access denied`);
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
			const fullWorkspaceObj = {
				metadata: {
					name: details.name,
					namespace: ns,
					labels: details.labels || {},
					annotations: details.annotations || {},
				},
				spec: details.spec,
			};
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(fullWorkspaceObj, null, 2),
					},
				],
				structuredContent: details,
			};
		} catch (err: any) {
			logger.error(
				"Failed to get workspace ID {id} in namespace {namespace}: {error}",
				{
					id,
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, {
				id,
				name: "",
				status: "",
				podIP: "",
				port: "",
				workspacePath: "",
				workspaceType: "",
				previewPath: "",
				previewType: "",
				userSub: "",
				annotations: {},
				templateRef: "",
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
			"Tool stop_workspace called for workspace ID {id} in namespace {namespace} (authEnabled: {authEnabled})",
			{ id, namespace: ns, authEnabled: config.auth.enabled },
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
			if (res.items.length === 0) {
				throw new Error(`Workspace ${id} not found or access denied`);
			}
			const podName = res.items[0].metadata?.name;
			if (!podName) {
				throw new Error("Pod missing name");
			}
			await k8sContext.coreApi.deleteNamespacedPod({
				name: podName,
				namespace: ns,
			});
			logger.info(
				"Successfully deleted workspace pod {podName} for workspace ID {id} in namespace {namespace}",
				{ podName, id, namespace: ns },
			);
			return {
				content: [
					{
						type: "text" as const,
						text: `Stopped workspace ${id} (Pod: ${podName})`,
					},
				],
				structuredContent: { id, status: "terminating" },
			};
		} catch (err: any) {
			logger.error(
				"Failed to stop workspace ID {id} in namespace {namespace}: {error}",
				{
					id,
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, { id, status: "" });
		}
	};
}

export function spawnWorkspaceHandler(k8sContext: K8sContext) {
	return async ({
		id,
		name,
		templateRef,
		spec: inlineSpec,
		annotations: inlineAnnotations,
		namespace,
		context,
		jwtPayload,
		userSub: inputUserSub,
	}: {
		id: string;
		name?: string;
		templateRef?: string;
		spec?: any;
		annotations?: Record<string, string>;
		namespace?: string;
		context?: Record<string, string>;
		jwtPayload?: Record<string, unknown>;
		userSub?: string;
	}) => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
		const VAR_USER = "${{user}}";
		// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
		const VAR_WORKSPACE_ID = "${{workspace_id}}";
		// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
		const VAR_WORKSPACE = "${{workspace}}";

		const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
		const activeJwtPayload = resolveActiveJwt(jwtPayload);
		logger.info(
			"Tool spawn_workspace called for workspace ID {id} (name: {name}) in namespace {namespace} (templateRef: {templateRef}, authEnabled: {authEnabled})",
			{
				id,
				name,
				namespace: ns,
				templateRef,
				authEnabled: config.auth.enabled,
			},
		);

		try {
			// Pre-flight uniqueness check
			const existingPods = await k8sContext.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector: `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}`,
			});
			if (existingPods.items && existingPods.items.length > 0) {
				throw new Error(`Workspace with ID "${id}" already exists`);
			}

			const authCtx = verifyAuthAndGetContext(
				activeJwtPayload,
				"workspace:write",
			);
			let userSub = authCtx.userSub;
			if (inputUserSub) {
				if (config.auth.enabled && !authCtx.isAdmin) {
					throw new Error(
						"Forbidden: Non-admin users cannot specify a different userSub",
					);
				}
				userSub = inputUserSub;
			}

			const templateUser =
				config.auth.enabled || userSub !== "anonymous" ? userSub : "guest";

			let parsedSpec: any;
			let annotations: Record<string, string> = {};
			const templateLabels: Record<string, string> = {};
			let templateVersion = "1.0.0";

			if (templateRef) {
				const resolved = await resolveTemplateSpec(
					k8sContext,
					templateRef,
					templateUser,
					id,
				);
				const interpolatedRaw = resolved.raw
					.replaceAll(VAR_USER, templateUser)
					.replaceAll(VAR_WORKSPACE_ID, id)
					.replaceAll(VAR_WORKSPACE, id);
				parsedSpec = PodSpecSchema.parse(parseSpecString(interpolatedRaw));
				annotations = resolved.annotations;
				Object.assign(templateLabels, resolved.labels);
				templateVersion = resolved.version;
			} else if (inlineSpec) {
				const rawSpec = JSON.stringify(inlineSpec);
				const interpolatedRawSpec = rawSpec
					.replaceAll(VAR_USER, templateUser)
					.replaceAll(VAR_WORKSPACE_ID, id)
					.replaceAll(VAR_WORKSPACE, id);
				parsedSpec = JSON.parse(interpolatedRawSpec);

				if (inlineAnnotations) {
					for (const [k, v] of Object.entries(inlineAnnotations)) {
						if (k === "__proto__" || k === "constructor") continue;
						annotations[k] = (v as string)
							.replaceAll(VAR_USER, templateUser)
							.replaceAll(VAR_WORKSPACE_ID, id)
							.replaceAll(VAR_WORKSPACE, id);
					}
				}
			} else {
				throw new Error("Either templateRef or spec must be provided");
			}

			parsedSpec = applySpawnerAnnotations(parsedSpec, annotations, context);

			const roleArn = annotations[ANNOTATION_KEYS.IAM_ROLE_ARN];
			if (roleArn) {
				logger.debug(
					"Provisioning ServiceAccount with IAM role ARN {roleArn}",
					{ roleArn },
				);
				parsedSpec.serviceAccountName = await provisionServiceAccount(
					k8sContext.coreApi,
					ns,
					id,
					roleArn,
					config.auth.enabled ? userSub : undefined,
				);
			}

			parsedSpec.labels = {
				...templateLabels,
				...(parsedSpec.labels || {}),
				[ANNOTATION_KEYS.TYPE]: "workspace",
				[ANNOTATION_KEYS.WORKSPACE_ID]: id,
				[ANNOTATION_KEYS.MANAGED_BY]: "nogoo9-spawner",
				[ANNOTATION_KEYS.USER_SUB]: userSub,
			};
			const displayName = name || id;
			parsedSpec.annotations = {
				...annotations,
				...(parsedSpec.annotations || {}),
				[ANNOTATION_KEYS.WORKSPACE_NAME]: displayName,
			};
			if (templateRef) {
				parsedSpec.annotations[ANNOTATION_KEYS.TEMPLATE_REF] = templateRef;
				parsedSpec.annotations[ANNOTATION_KEYS.TEMPLATE_VERSION] =
					templateVersion;
			}
			if (config.auth.enabled) {
				parsedSpec.annotations[ANNOTATION_KEYS.USER_SUB] = userSub;
			}

			const podName = `ws-${userSub.replace(/[^a-z0-9-]/gi, "").slice(0, 10)}-${id}`;
			logger.info(
				"Spawning workspace pod {podName} for workspace ID {id} in namespace {namespace}",
				{
					podName,
					id,
					namespace: ns,
				},
			);
			const result = await createPodFromArgs(
				k8sContext.coreApi,
				ns,
				podName,
				parsedSpec,
			);
			logger.info(
				"Successfully spawned workspace pod {podName} (actual name: {actualPodName})",
				{
					podName: id,
					actualPodName: result.name,
				},
			);
			return {
				content: [
					{
						type: "text" as const,
						text: `Spawned workspace ${id} (Pod: ${result.name})`,
					},
				],
				structuredContent: { id, podName: result.name },
			};
		} catch (err: any) {
			logger.error(
				"Failed to spawn workspace ID {id} in namespace {namespace}: {error}",
				{
					id,
					namespace: ns,
					error: err,
				},
			);
			return errorResult(k8sContext.kc, err, { id, podName: "" });
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

			const podRes = await k8sContext.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector,
			});
			if (!podRes.items || podRes.items.length === 0) {
				throw new Error(`Workspace ${id} not found or access denied`);
			}
			const podName = podRes.items[0].metadata?.name;
			if (!podName) {
				throw new Error("Workspace pod has no name");
			}
			const eventRes = await k8sContext.coreApi.listNamespacedEvent({
				namespace: ns,
				fieldSelector: `involvedObject.name=${podName}`,
			});
			const events = (eventRes.items || [])
				.map((e) => {
					const timestampVal =
						e.lastTimestamp ||
						e.firstTimestamp ||
						e.metadata?.creationTimestamp;
					let timestampStr = new Date().toISOString();
					if (timestampVal) {
						timestampStr =
							timestampVal instanceof Date
								? timestampVal.toISOString()
								: new Date(timestampVal).toISOString();
					}
					return {
						type: e.type || "Normal",
						reason: e.reason || "",
						message: e.message || "",
						timestamp: timestampStr,
					};
				})
				.sort(
					(a, b) =>
						new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
				);

			return {
				content: [
					{
						type: "text" as const,
						text:
							events.length > 0
								? events
										.map(
											(e) =>
												`[${e.timestamp}] [${e.type}] ${e.reason}: ${e.message}`,
										)
										.join("\n")
								: "(no events)",
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
