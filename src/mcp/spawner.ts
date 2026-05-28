import { getLogger } from "@logtape/logtape";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "~/config.js";
import {
	applySpawnerAnnotations,
	createPodFromArgs,
	DEFAULT_NAMESPACE,
	errorResult,
	extractUserIdentity,
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
});

const APP_URI = "ui://nogoo9/app";
const UI_META = { ui: { resourceUri: APP_URI } } as const;

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
				let labelSelector = "nogoo9/type=workspace";
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
						const sub = extractUserIdentity(
							activeJwtPayload,
							config.auth.subJsonPath,
						);
						logger.debug("Extracted user identity subject: {sub}", { sub });
						labelSelector += `,nogoo9/user-sub=${sub}`;
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
					const workspaces = res.items.map((pod) => {
						const ann = pod.metadata?.annotations ?? {};
						return {
							id: pod.metadata?.labels?.["nogoo9/workspace-id"] ?? "unknown",
							name:
								ann["nogoo9/workspace-name"] ?? pod.metadata?.name ?? "unknown",
							status: pod.status?.phase ?? "Unknown",
							templateRef: ann["nogoo9/template-ref"],
							apis: parseWorkspaceApis(ann),
						};
					});
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
				let labelSelector = `nogoo9/type=workspace,nogoo9/workspace-id=${id}`;
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
						const sub = extractUserIdentity(
							activeJwtPayload,
							config.auth.subJsonPath,
						);
						logger.debug("Extracted user identity subject: {sub}", { sub });
						labelSelector += `,nogoo9/user-sub=${sub}`;
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
						pod.metadata?.labels?.["nogoo9/user-sub"] ??
						annotations["nogoo9/user-sub"] ??
						"";
					const workspacePath =
						annotations["nogoo9/workspace-path"] ??
						annotations["nogoo9/preview-path"] ??
						"/";
					const workspaceType =
						annotations["nogoo9/workspace-type"] ??
						annotations["nogoo9/preview-type"] ??
						"html";
					const apis = parseWorkspaceApis(annotations);
					const details = {
						id,
						name:
							annotations["nogoo9/workspace-name"] ??
							pod.metadata?.name ??
							"unknown",
						status: pod.status?.phase ?? "Unknown",
						podIP: pod.status?.podIP ?? "",
						port: annotations["nogoo9/workspace-port"] ?? "",
						workspacePath,
						workspaceType,
						previewPath: workspacePath,
						previewType: workspaceType,
						userSub,
						annotations,
						labels: pod.metadata?.labels ?? {},
						templateRef: annotations["nogoo9/template-ref"],
						apis,
						spec: pod.spec,
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
				let labelSelector = `nogoo9/type=workspace,nogoo9/workspace-id=${id}`;
				if (authEnabled) {
					if (!activeJwtPayload) {
						const err = new Error("Unauthorized: jwtPayload required");
						logger.error("Authentication failed: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { id, status: "" });
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "write");
						const sub = extractUserIdentity(
							activeJwtPayload,
							config.auth.subJsonPath,
						);
						logger.debug("Extracted user identity subject: {sub}", { sub });
						labelSelector += `,nogoo9/user-sub=${sub}`;
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
						labelSelector: `nogoo9/type=workspace,nogoo9/workspace-id=${id}`,
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
						userSub = extractUserIdentity(
							activeJwtPayload,
							config.auth.subJsonPath,
						);
						logger.debug("Extracted user identity subject: {sub}", {
							sub: userSub,
						});
					} catch (err) {
						logger.error("Failed to extract user identity: {error}", {
							error: err,
						});
						return errorResult(k8sContext.kc, err, { id, podName: "" });
					}
				}
				let templateUser = "guest";
				if (activeJwtPayload) {
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
					let annotations: Record<string, string>;

					if (templateRef) {
						const { ns: tmplNs, name: tmplName } = parseTemplateRef(
							templateRef,
							DEFAULT_NAMESPACE,
						);
						const cm = await readTemplateMap(
							k8sContext.coreApi,
							tmplNs,
							tmplName,
						);
						const raw = cm.data?.spec;
						if (!raw) {
							const err = new Error(
								`Template "${templateRef}" has no data.spec`,
							);
							logger.error("Template invalid: {error}", { error: err });
							return errorResult(k8sContext.kc, err, { id, podName: "" });
						}
						const interpolatedRaw = raw
							.replaceAll(VAR_USER, templateUser)
							.replaceAll(VAR_WORKSPACE_ID, id)
							.replaceAll(VAR_WORKSPACE, id);
						parsedSpec = PodSpecSchema.parse(
							parseSpecString(interpolatedRaw),
						) as PodCreateArgs;

						annotations = {};
						if (cm.metadata?.annotations) {
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

					const roleArn = annotations["nogoo9/iam-role-arn"];
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
						...(parsedSpec.labels || {}),
						"nogoo9/type": "workspace",
						"nogoo9/workspace-id": id,
						"nogoo9/managed-by": "nogoo9-spawner",
						"nogoo9/user-sub": userSub,
					};
					const displayName = name || id;
					parsedSpec.annotations = {
						...annotations,
						...(parsedSpec.annotations || {}),
						"nogoo9/workspace-name": displayName,
					};
					if (templateRef) {
						parsedSpec.annotations["nogoo9/template-ref"] = templateRef;
					}
					if (authEnabled) {
						parsedSpec.annotations["nogoo9/user-sub"] = userSub;
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
}
