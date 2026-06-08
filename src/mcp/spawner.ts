import { getLogger } from "@logtape/logtape";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ANNOTATION_KEYS, config } from "~/config/index.js";
import {
	applySpawnerAnnotations,
	createPodFromArgs,
	DEFAULT_NAMESPACE,
	errorResult,
	extractUserIdentity,
	findLocalTemplate,
	getK8sError,
	type K8sContext,
	MODE,
	type PodCreateArgs,
	PodSpecSchema,
	parseSpecString,
	parseTemplateRef,
	parseWorkspaceApis,
	provisionServiceAccount,
	readTemplateMap,
	requestContextStore,
	resolveNamespace,
	verifyAccessOrThrow,
} from "~/k8s/index.js";

const logger = getLogger(["nogoo9", "mcp-spawner"]);

export const WorkspaceApiSchema = z.object({
	name: z.string(),
	port: z.string(),
	path: z.string(),
	desc: z.string().optional(),
	method: z.string().optional(),
});

export const ListWorkspacesOutputSchema = z.object({
	workspaces: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			status: z.string(),
			templateRef: z.string().optional(),
			apis: z.array(WorkspaceApiSchema).optional(),
			podName: z.string().optional(),
			templateVersion: z.string().optional(),
			latestTemplateVersion: z.string().optional(),
			isOutdated: z.boolean().optional(),
		}),
	),
});

export const StopWorkspaceOutputSchema = z.object({
	id: z.string(),
	status: z.string(),
});

export const SpawnWorkspaceOutputSchema = z.object({
	id: z.string(),
	podName: z.string(),
});

export const GetWorkspaceOutputSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: z.string(),
	podIP: z.string(),
	port: z.string(),
	workspacePath: z.string(),
	workspaceType: z.string(),
	previewPath: z.string().optional(),
	previewType: z.string().optional(),
	userSub: z.string(),
	annotations: z.record(z.string(), z.string()),
	labels: z.record(z.string(), z.string()).optional(),
	templateRef: z.string().optional(),
	apis: z.array(WorkspaceApiSchema).optional(),
	spec: z.record(z.string(), z.unknown()).optional(),
	podName: z.string().optional(),
	templateVersion: z.string().optional(),
	latestTemplateVersion: z.string().optional(),
	isOutdated: z.boolean().optional(),
});

export const GetWorkspaceEventsOutputSchema = z.object({
	events: z.array(
		z.object({
			type: z.string(),
			reason: z.string(),
			message: z.string(),
			timestamp: z.string(),
		}),
	),
});

export const UpgradeWorkspaceOutputSchema = z.object({
	id: z.string(),
	status: z.string(),
	podName: z.string().optional(),
});

export const UpgradeAllWorkspacesOutputSchema = z.object({
	upgraded: z.array(z.string()),
	failed: z.array(
		z.object({
			id: z.string(),
			error: z.string(),
		}),
	),
});

async function getTemplateLatestVersion(
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

const APP_URI = "ui://nogoo9/app";
const UI_META = { ui: { resourceUri: APP_URI } } as const;

async function upgradeWorkspaceInner(
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
	const templateUser = userSub || "guest";

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
		[ANNOTATION_KEYS.USER_SUB]: userSub,
	};
	parsedSpec.annotations = {
		...mergedAnnotations,
		...(parsedSpec.annotations || {}),
	};

	// 5. Delete the old pod
	logger.info("Upgrading workspace: Deleting old pod {podName}", {
		podName: oldPodName,
	});
	await k8sContext.coreApi.deleteNamespacedPod({
		name: oldPodName,
		namespace: ns,
	});

	// Wait for complete pod deletion to avoid conflicts (polling up to 60s)
	let deleted = false;
	for (let i = 0; i < 30; i++) {
		try {
			await k8sContext.coreApi.readNamespacedPod({
				name: oldPodName,
				namespace: ns,
			});
			logger.debug("Waiting for pod {podName} to be deleted...", {
				podName: oldPodName,
			});
			await new Promise((resolve) => setTimeout(resolve, 2000));
		} catch (err: any) {
			const k8sErr = getK8sError(err);
			if (k8sErr.statusCode === 404) {
				deleted = true;
				break;
			}
			logger.warn("Error checking pod deletion status: {error}", {
				error: err,
			});
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
	}
	if (!deleted) {
		throw new Error(
			`Timeout waiting for old pod ${oldPodName} to be deleted during upgrade`,
		);
	}

	// 6. Spawn the new pod using merged spec!
	logger.info("Upgrading workspace: Spawning new pod {podName}", {
		podName: oldPodName,
	});
	const result = await createPodFromArgs(
		k8sContext.coreApi,
		ns,
		oldPodName,
		parsedSpec,
	);
	return { podName: result.name };
}

/**
 * Registers workspace management tools (the Spawner subsystem) with the MCP Server.
 * Registered tools:
 * - `list_workspaces`: Lists active agent workspaces (pods labeled nogoo9/type=workspace).
 * - `stop_workspace`: Deletes/terminates a workspace pod.
 * - `spawn_workspace`: Configures and deploys a workspace pod using templates/spec with annotations.
 *
 * @param server The MCP Server instance.
 * @param k8sContext Active Kubernetes API client context.
 * @param enabledTools List of tool names that are allowed/enabled to be registered.
 */
export function registerSpawnerTools(
	server: McpServer,
	k8sContext: K8sContext,
	enabledTools: string[],
): void {
	if (enabledTools.includes("list_workspaces")) {
		registerAppTool(
			server,
			"list_workspaces",
			{
				description: "List active agent workspaces",
				inputSchema: {
					namespace: z
						.string()
						.optional()
						.describe(`Namespace (defaults to "${DEFAULT_NAMESPACE}")`),
					jwtPayload: z
						.record(z.string(), z.unknown())
						.optional()
						.describe(
							"JWT payload for identity extraction (if AUTH_ENABLED=true)",
						),
				},
				outputSchema: ListWorkspacesOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ namespace, jwtPayload }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				logger.info(
					"Tool list_workspaces called in namespace {namespace} (authEnabled: {authEnabled})",
					{
						namespace: ns,
						authEnabled,
					},
				);
				let labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace`;
				if (authEnabled) {
					if (!activeJwtPayload) {
						const err = new Error(
							"Unauthorized: jwtPayload required when AUTH_ENABLED is true",
						);
						logger.error("Authentication failed: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { workspaces: [] });
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "read");
						let isAdmin = false;
						try {
							verifyAccessOrThrow(activeJwtPayload, "admin");
							isAdmin = true;
						} catch (_) {
							isAdmin = false;
						}
						if (!isAdmin) {
							const sub = extractUserIdentity(
								activeJwtPayload,
								config.auth.subJsonPath,
							);
							logger.debug("Extracted user identity subject: {sub}", { sub });
							labelSelector += `,${ANNOTATION_KEYS.USER_SUB}=${sub}`;
						} else {
							logger.debug(
								"Admin listing all workspaces (bypassing userSub filter)",
							);
						}
					} catch (err) {
						logger.error("Failed to extract user identity: {error}", {
							error: err,
						});
						return errorResult(k8sContext.kc, err, { workspaces: [] });
					}
				}
				try {
					const res = await k8sContext.coreApi.listNamespacedPod({
						namespace: ns,
						labelSelector,
					});
					const workspaces = await Promise.all(
						res.items.map(async (pod) => {
							const ann = pod.metadata?.annotations ?? {};
							const templateRef = ann[ANNOTATION_KEYS.TEMPLATE_REF];
							const templateVersion =
								ann[ANNOTATION_KEYS.TEMPLATE_VERSION] || "1.0.0";
							const latestTemplateVersion = templateRef
								? await getTemplateLatestVersion(k8sContext, templateRef)
								: undefined;
							const isOutdated =
								templateRef && latestTemplateVersion
									? templateVersion !== latestTemplateVersion
									: false;

							return {
								id:
									pod.metadata?.labels?.[ANNOTATION_KEYS.WORKSPACE_ID] ??
									"unknown",
								name:
									ann[ANNOTATION_KEYS.WORKSPACE_NAME] ??
									pod.metadata?.name ??
									"unknown",
								status: pod.status?.phase ?? "Unknown",
								templateRef,
								apis: parseWorkspaceApis(ann),
								podName: pod.metadata?.name,
								templateVersion,
								latestTemplateVersion,
								isOutdated,
							};
						}),
					);
					logger.debug("Successfully listed {count} workspaces", {
						count: workspaces.length,
					});
					if (!workspaces.length)
						return {
							content: [{ type: "text" as const, text: "(no workspaces)" }],
							structuredContent: { workspaces: [] },
						};
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
				} catch (err) {
					logger.error(
						"Failed to list workspaces in namespace {namespace}: {error}",
						{
							namespace: ns,
							error: err,
						},
					);
					return errorResult(k8sContext.kc, err, { workspaces: [] });
				}
			},
		);
	}

	if (enabledTools.includes("get_workspace")) {
		registerAppTool(
			server,
			"get_workspace",
			{
				description: "Get workspace details by ID",
				inputSchema: {
					id: z.string().describe("Workspace ID to inspect"),
					namespace: z
						.string()
						.optional()
						.describe(`Namespace (defaults to "${DEFAULT_NAMESPACE}")`),
					jwtPayload: z
						.record(z.string(), z.unknown())
						.optional()
						.describe(
							"JWT payload for identity extraction (if AUTH_ENABLED=true)",
						),
				},
				outputSchema: GetWorkspaceOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ id, namespace, jwtPayload }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				logger.info(
					"Tool get_workspace called for workspace ID {id} in namespace {namespace} (authEnabled: {authEnabled})",
					{
						id,
						namespace: ns,
						authEnabled,
					},
				);
				let labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}`;
				if (authEnabled) {
					if (!activeJwtPayload) {
						const err = new Error(
							"Unauthorized: jwtPayload required when AUTH_ENABLED is true",
						);
						logger.error("Authentication failed: {error}", { error: err });
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
					try {
						verifyAccessOrThrow(activeJwtPayload, "read");
						let isAdmin = false;
						try {
							verifyAccessOrThrow(activeJwtPayload, "admin");
							isAdmin = true;
						} catch (_) {
							isAdmin = false;
						}
						if (!isAdmin) {
							const sub = extractUserIdentity(
								activeJwtPayload,
								config.auth.subJsonPath,
							);
							logger.debug("Extracted user identity subject: {sub}", { sub });
							labelSelector += `,${ANNOTATION_KEYS.USER_SUB}=${sub}`;
						} else {
							logger.debug(
								"Admin getting workspace (bypassing userSub filter)",
							);
						}
					} catch (err) {
						logger.error("Failed to extract user identity: {error}", {
							error: err,
						});
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
				}
				try {
					const res = await k8sContext.coreApi.listNamespacedPod({
						namespace: ns,
						labelSelector,
					});
					if (res.items.length === 0) {
						const err = new Error(`Workspace ${id} not found or access denied`);
						logger.warn("Workspace not found: {error}", { error: err });
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
					const pod = res.items[0];
					const annotations = pod.metadata?.annotations ?? {};
					const userSub =
						pod.metadata?.labels?.[ANNOTATION_KEYS.USER_SUB] ??
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
					const apis = parseWorkspaceApis(annotations);
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
					const details = {
						id,
						name:
							annotations[ANNOTATION_KEYS.WORKSPACE_NAME] ??
							pod.metadata?.name ??
							"unknown",
						status: pod.status?.phase ?? "Unknown",
						podIP: pod.status?.podIP ?? "",
						port: annotations[ANNOTATION_KEYS.WORKSPACE_PORT] ?? "",
						workspacePath,
						workspaceType,
						previewPath: workspacePath,
						previewType: workspaceType,
						userSub,
						annotations,
						labels: pod.metadata?.labels ?? {},
						templateRef,
						apis,
						spec: pod.spec ? JSON.parse(JSON.stringify(pod.spec)) : undefined,
						podName: pod.metadata?.name,
						templateVersion,
						latestTemplateVersion,
						isOutdated,
					};
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
				} catch (err) {
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
					});
				}
			},
		);
	}

	if (enabledTools.includes("stop_workspace")) {
		registerAppTool(
			server,
			"stop_workspace",
			{
				description: "Stop and delete an agent workspace",
				inputSchema: {
					id: z.string().describe("Workspace ID to stop"),
					namespace: z.string().optional(),
					jwtPayload: z.record(z.string(), z.unknown()).optional(),
				},
				outputSchema: StopWorkspaceOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ id, namespace, jwtPayload }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				logger.info(
					"Tool stop_workspace called for workspace ID {id} in namespace {namespace} (authEnabled: {authEnabled})",
					{
						id,
						namespace: ns,
						authEnabled,
					},
				);
				let labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}`;
				if (authEnabled) {
					if (!activeJwtPayload) {
						const err = new Error("Unauthorized: jwtPayload required");
						logger.error("Authentication failed: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { id, status: "" });
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "write");
						let isAdmin = false;
						try {
							verifyAccessOrThrow(activeJwtPayload, "admin");
							isAdmin = true;
						} catch (_) {
							isAdmin = false;
						}
						if (!isAdmin) {
							const sub = extractUserIdentity(
								activeJwtPayload,
								config.auth.subJsonPath,
							);
							logger.debug("Extracted user identity subject: {sub}", { sub });
							labelSelector += `,${ANNOTATION_KEYS.USER_SUB}=${sub}`;
						} else {
							logger.debug(
								"Admin stopping workspace (bypassing userSub filter)",
							);
						}
					} catch (err) {
						logger.error("Failed to extract user identity: {error}", {
							error: err,
						});
						return errorResult(k8sContext.kc, err, { id, status: "" });
					}
				}
				try {
					const res = await k8sContext.coreApi.listNamespacedPod({
						namespace: ns,
						labelSelector,
					});
					if (res.items.length === 0) {
						const err = new Error(`Workspace ${id} not found or access denied`);
						logger.warn("Workspace not found: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { id, status: "" });
					}
					const podName = res.items[0].metadata?.name;
					if (!podName) {
						const err = new Error("Pod missing name");
						logger.error("Workspace pod is invalid: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { id, status: "" });
					}
					await k8sContext.coreApi.deleteNamespacedPod({
						name: podName,
						namespace: ns,
					});
					logger.info(
						"Successfully deleted workspace pod {podName} for workspace ID {id} in namespace {namespace}",
						{
							podName,
							id,
							namespace: ns,
						},
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
				} catch (err) {
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
			},
		);
	}

	if (enabledTools.includes("spawn_workspace")) {
		registerAppTool(
			server,
			"spawn_workspace",
			{
				description:
					"Spawn a new agent workspace from a template or inline declaration",
				inputSchema: {
					id: z.string().describe("Unique Workspace ID"),
					name: z
						.string()
						.optional()
						.describe("Optional display name for the workspace"),
					templateRef: z
						.string()
						.optional()
						.describe("Template ConfigMap reference"),
					spec: PodSpecSchema.optional().describe(
						"Inline pod spec (if templateRef is not provided)",
					),
					annotations: z
						.record(z.string(), z.string())
						.optional()
						.describe("Inline annotations (if templateRef is not provided)"),
					namespace: z.string().optional(),
					context: z
						.record(z.string(), z.string())
						.optional()
						.describe("Environment variables to satisfy required-context"),
					jwtPayload: z.record(z.string(), z.unknown()).optional(),
					userSub: z
						.string()
						.optional()
						.describe(
							"Target user subject for whom the workspace is spawned (admin only)",
						),
				},
				outputSchema: SpawnWorkspaceOutputSchema.shape,
				_meta: UI_META,
			},
			async ({
				id,
				name,
				templateRef,
				spec: inlineSpec,
				annotations: inlineAnnotations,
				namespace,
				context,
				jwtPayload,
				userSub: inputUserSub,
			}) => {
				// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
				const VAR_USER = "${{user}}";
				// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
				const VAR_WORKSPACE_ID = "${{workspace_id}}";
				// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable placeholder
				const VAR_WORKSPACE = "${{workspace}}";

				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				logger.info(
					"Tool spawn_workspace called for workspace ID {id} (name: {name}) in namespace {namespace} (templateRef: {templateRef}, authEnabled: {authEnabled})",
					{
						id,
						name,
						namespace: ns,
						templateRef,
						authEnabled,
					},
				);

				// Pre-flight uniqueness check
				try {
					const existingPods = await k8sContext.coreApi.listNamespacedPod({
						namespace: ns,
						labelSelector: `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}`,
					});
					if (existingPods.items && existingPods.items.length > 0) {
						const err = new Error(`Workspace with ID "${id}" already exists`);
						logger.warn("Workspace ID uniqueness check failed: {error}", {
							error: err,
						});
						return errorResult(k8sContext.kc, err, { id, podName: "" });
					}
				} catch (err) {
					logger.error(
						"Failed to check workspace ID uniqueness for {id}: {error}",
						{
							id,
							error: err,
						},
					);
					return errorResult(
						k8sContext.kc,
						err instanceof Error ? err : new Error(String(err)),
						{ id, podName: "" },
					);
				}

				let userSub = "anonymous";
				if (authEnabled) {
					if (!activeJwtPayload) {
						const err = new Error("Unauthorized: jwtPayload required");
						logger.error("Authentication failed: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { id, podName: "" });
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "write");
						const callerSub = extractUserIdentity(
							activeJwtPayload,
							config.auth.subJsonPath,
						);
						if (inputUserSub) {
							try {
								verifyAccessOrThrow(activeJwtPayload, "admin");
							} catch (_err) {
								const finalErr = new Error(
									"Forbidden: Non-admin users cannot specify a different userSub",
								);
								logger.error("Spawn workspace failed: {error}", {
									error: finalErr,
								});
								return errorResult(k8sContext.kc, finalErr, {
									id,
									podName: "",
								});
							}
							userSub = inputUserSub;
						} else {
							userSub = callerSub;
						}
						logger.debug("Extracted user identity subject: {sub}", {
							sub: userSub,
						});
					} catch (err) {
						logger.error("Failed to extract user identity: {error}", {
							error: err,
						});
						return errorResult(k8sContext.kc, err, { id, podName: "" });
					}
				} else {
					if (inputUserSub) {
						userSub = inputUserSub;
					}
				}
				let templateUser = "guest";
				if (authEnabled) {
					templateUser = userSub;
				} else if (activeJwtPayload) {
					try {
						templateUser = extractUserIdentity(
							activeJwtPayload,
							config.auth.subJsonPath,
						);
					} catch (_) {
						// fallback to guest
					}
				}

				try {
					let parsedSpec: PodCreateArgs;
					let annotations: Record<string, string> = {};
					const templateLabels: Record<string, string> = {};
					let templateVersion = "1.0.0";

					if (templateRef) {
						const { ns: tmplNs, name: tmplName } = parseTemplateRef(
							templateRef,
							DEFAULT_NAMESPACE,
						);
						const cm = await readTemplateMap(
							k8sContext.coreApi,
							tmplNs,
							tmplName,
						).catch(() => null);

						let raw: string | undefined;
						if (cm?.data?.spec) {
							raw = cm.data.spec;
							templateVersion =
								cm.metadata?.annotations?.[ANNOTATION_KEYS.TEMPLATE_VERSION] ||
								"1.0.0";
						} else {
							// Fallback to local/built-in templates
							const localTmpl = findLocalTemplate(tmplName);
							if (localTmpl) {
								logger.warn(
									"ConfigMap template '{templateRef}' not available (likely missing permissions). Using local template '{name}' instead.",
									{ templateRef, name: localTmpl.name },
								);
								raw = JSON.stringify(localTmpl.spec);
								templateVersion = localTmpl.version || "1.0.0";
								annotations = { ...localTmpl.annotations };
								if (localTmpl.labels) {
									for (const [k, v] of Object.entries(localTmpl.labels)) {
										if (k === "__proto__" || k === "constructor") continue;
										Object.defineProperty(templateLabels, k, {
											value: v
												.replaceAll(VAR_USER, templateUser)
												.replaceAll(VAR_WORKSPACE_ID, id)
												.replaceAll(VAR_WORKSPACE, id),
											writable: true,
											enumerable: true,
											configurable: true,
										});
									}
								}
							}
						}

						if (!raw) {
							const err = new Error(
								`Template "${templateRef}" not found in ConfigMaps, local templates, or built-in templates`,
							);
							logger.error("Template not found: {error}", { error: err });
							return errorResult(k8sContext.kc, err, { id, podName: "" });
						}

						const interpolatedRaw = raw
							.replaceAll(VAR_USER, templateUser)
							.replaceAll(VAR_WORKSPACE_ID, id)
							.replaceAll(VAR_WORKSPACE, id);
						parsedSpec = PodSpecSchema.parse(
							parseSpecString(interpolatedRaw),
						) as PodCreateArgs;

						if (cm?.metadata?.annotations) {
							for (const [k, v] of Object.entries(cm.metadata.annotations)) {
								if (k === "__proto__" || k === "constructor") continue;
								Object.defineProperty(annotations, k, {
									value: v
										.replaceAll(VAR_USER, templateUser)
										.replaceAll(VAR_WORKSPACE_ID, id)
										.replaceAll(VAR_WORKSPACE, id),
									writable: true,
									enumerable: true,
									configurable: true,
								});
							}
						}

						if (cm?.metadata?.labels) {
							for (const [k, v] of Object.entries(cm.metadata.labels)) {
								if (k === "__proto__" || k === "constructor") continue;
								Object.defineProperty(templateLabels, k, {
									value: v
										.replaceAll(VAR_USER, templateUser)
										.replaceAll(VAR_WORKSPACE_ID, id)
										.replaceAll(VAR_WORKSPACE, id),
									writable: true,
									enumerable: true,
									configurable: true,
								});
							}
						}
					} else if (inlineSpec) {
						const rawSpec = JSON.stringify(inlineSpec);
						const interpolatedRawSpec = rawSpec
							.replaceAll(VAR_USER, templateUser)
							.replaceAll(VAR_WORKSPACE_ID, id)
							.replaceAll(VAR_WORKSPACE, id);
						parsedSpec = JSON.parse(interpolatedRawSpec) as PodCreateArgs;

						annotations = {};
						if (inlineAnnotations) {
							for (const [k, v] of Object.entries(inlineAnnotations)) {
								if (k === "__proto__" || k === "constructor") continue;
								Object.defineProperty(annotations, k, {
									value: v
										.replaceAll(VAR_USER, templateUser)
										.replaceAll(VAR_WORKSPACE_ID, id)
										.replaceAll(VAR_WORKSPACE, id),
									writable: true,
									enumerable: true,
									configurable: true,
								});
							}
						}
					} else {
						const err = new Error(
							"Either templateRef or spec must be provided",
						);
						logger.error("Invocation error: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { id, podName: "" });
					}
					try {
						parsedSpec = applySpawnerAnnotations(
							parsedSpec,
							annotations,
							context,
						);
					} catch (err) {
						const errorObj =
							err instanceof Error ? err : new Error(String(err));
						logger.warn("Annotation parsing failed: {error}", {
							error: errorObj,
						});
						return errorResult(k8sContext.kc, errorObj, { id, podName: "" });
					}

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
							authEnabled ? userSub : undefined,
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
					if (authEnabled) {
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
				} catch (err) {
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
			},
		);
	}

	if (enabledTools.includes("get_workspace_events")) {
		registerAppTool(
			server,
			"get_workspace_events",
			{
				description: "Get workspace pod events by workspace ID",
				inputSchema: {
					id: z.string().describe("Workspace ID to query events for"),
					namespace: z
						.string()
						.optional()
						.describe(`Namespace (defaults to "${DEFAULT_NAMESPACE}")`),
					jwtPayload: z
						.record(z.string(), z.unknown())
						.optional()
						.describe(
							"JWT payload for identity extraction (if AUTH_ENABLED=true)",
						),
				},
				outputSchema: GetWorkspaceEventsOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ id, namespace, jwtPayload }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				logger.info(
					"Tool get_workspace_events called for workspace ID {id} in namespace {namespace}",
					{ id, namespace: ns },
				);
				let labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${id}`;
				if (authEnabled) {
					if (!activeJwtPayload) {
						const err = new Error("Unauthorized: jwtPayload required");
						return errorResult(k8sContext.kc, err, { events: [] });
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "read");
						let isAdmin = false;
						try {
							verifyAccessOrThrow(activeJwtPayload, "admin");
							isAdmin = true;
						} catch (_) {}
						if (!isAdmin) {
							const sub = extractUserIdentity(
								activeJwtPayload,
								config.auth.subJsonPath,
							);
							labelSelector += `,${ANNOTATION_KEYS.USER_SUB}=${sub}`;
						}
					} catch (err) {
						return errorResult(k8sContext.kc, err, { events: [] });
					}
				}
				try {
					const podRes = await k8sContext.coreApi.listNamespacedPod({
						namespace: ns,
						labelSelector,
					});
					if (!podRes.items || podRes.items.length === 0) {
						const err = new Error(`Workspace ${id} not found or access denied`);
						return errorResult(k8sContext.kc, err, { events: [] });
					}
					const podName = podRes.items[0].metadata?.name;
					if (!podName) {
						const err = new Error("Workspace pod has no name");
						return errorResult(k8sContext.kc, err, { events: [] });
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
								if (timestampVal instanceof Date) {
									timestampStr = timestampVal.toISOString();
								} else {
									timestampStr = new Date(timestampVal).toISOString();
								}
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
								new Date(b.timestamp).getTime() -
								new Date(a.timestamp).getTime(),
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
				} catch (err) {
					logger.error(
						"Failed to get workspace events for {id} in namespace {namespace}: {error}",
						{ id, namespace: ns, error: err },
					);
					return errorResult(k8sContext.kc, err, { events: [] });
				}
			},
		);
	}

	if (enabledTools.includes("upgrade_workspace")) {
		registerAppTool(
			server,
			"upgrade_workspace",
			{
				description:
					"Upgrade an existing workspace pod to the latest template version",
				inputSchema: {
					id: z.string().describe("Workspace ID to upgrade"),
					namespace: z
						.string()
						.optional()
						.describe(`Namespace (defaults to "${DEFAULT_NAMESPACE}")`),
					jwtPayload: z
						.record(z.string(), z.unknown())
						.optional()
						.describe(
							"JWT payload for identity extraction (if AUTH_ENABLED=true)",
						),
				},
				outputSchema: UpgradeWorkspaceOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ id, namespace, jwtPayload }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				logger.info(
					"Tool upgrade_workspace called for workspace ID {id} in namespace {namespace}",
					{ id, namespace: ns },
				);
				let userSub = "anonymous";
				let isAdmin = false;
				if (authEnabled) {
					if (!activeJwtPayload) {
						const err = new Error("Unauthorized: jwtPayload required");
						return errorResult(k8sContext.kc, err, { id, status: "Failed" });
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "write");
						try {
							verifyAccessOrThrow(activeJwtPayload, "admin");
							isAdmin = true;
						} catch (_) {}
						userSub = extractUserIdentity(
							activeJwtPayload,
							config.auth.subJsonPath,
						);
					} catch (err) {
						return errorResult(k8sContext.kc, err, { id, status: "Failed" });
					}
				}
				try {
					const result = await upgradeWorkspaceInner(
						k8sContext,
						id,
						ns,
						userSub,
						isAdmin,
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
							status: "Running",
							podName: result.podName,
						},
					};
				} catch (err) {
					logger.error(
						"Failed to upgrade workspace {id} in namespace {namespace}: {error}",
						{ id, namespace: ns, error: err },
					);
					return errorResult(k8sContext.kc, err, { id, status: "Failed" });
				}
			},
		);
	}

	if (enabledTools.includes("upgrade_all_workspaces")) {
		registerAppTool(
			server,
			"upgrade_all_workspaces",
			{
				description:
					"Upgrade all outdated workspaces to their latest template versions",
				inputSchema: {
					namespace: z
						.string()
						.optional()
						.describe(`Namespace (defaults to "${DEFAULT_NAMESPACE}")`),
					jwtPayload: z
						.record(z.string(), z.unknown())
						.optional()
						.describe(
							"JWT payload for identity extraction (if AUTH_ENABLED=true)",
						),
				},
				outputSchema: UpgradeAllWorkspacesOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ namespace, jwtPayload }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				logger.info(
					"Tool upgrade_all_workspaces called in namespace {namespace}",
					{ namespace: ns },
				);
				let userSub = "anonymous";
				let isAdmin = false;
				let labelSelector = `${ANNOTATION_KEYS.TYPE}=workspace`;
				if (authEnabled) {
					if (!activeJwtPayload) {
						const err = new Error("Unauthorized: jwtPayload required");
						return errorResult(k8sContext.kc, err, {
							upgraded: [],
							failed: [],
						});
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "write");
						try {
							verifyAccessOrThrow(activeJwtPayload, "admin");
							isAdmin = true;
						} catch (_) {}
						userSub = extractUserIdentity(
							activeJwtPayload,
							config.auth.subJsonPath,
						);
						if (!isAdmin) {
							labelSelector += `,${ANNOTATION_KEYS.USER_SUB}=${userSub}`;
						}
					} catch (err) {
						return errorResult(k8sContext.kc, err, {
							upgraded: [],
							failed: [],
						});
					}
				}
				try {
					// 1. Find all active workspace pods
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
					const failedList: Array<{ id: string; error: string }> = [];

					for (const ws of outdated) {
						try {
							await upgradeWorkspaceInner(
								k8sContext,
								ws.id,
								ns,
								userSub,
								isAdmin,
							);
							upgradedList.push(ws.id);
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
						structuredContent: { upgraded: upgradedList, failed: failedList },
					};
				} catch (err) {
					logger.error(
						"Failed to upgrade all workspaces in namespace {namespace}: {error}",
						{ namespace: ns, error: err },
					);
					return errorResult(k8sContext.kc, err, { upgraded: [], failed: [] });
				}
			},
		);
	}
}
