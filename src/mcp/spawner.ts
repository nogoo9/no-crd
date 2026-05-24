import { getLogger } from "@logtape/logtape";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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
	parseTemplateRef,
	provisionServiceAccount,
	readTemplateMap,
	resolveNamespace,
} from "~/k8s/index.js";

const logger = getLogger(["nogoo9", "mcp-spawner"]);

export const ListWorkspacesOutputSchema = z.object({
	workspaces: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			status: z.string(),
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
				const authEnabled = process.env.AUTH_ENABLED === "true";
				logger.info(
					"Tool list_workspaces called in namespace {namespace} (authEnabled: {authEnabled})",
					{
						namespace: ns,
						authEnabled,
					},
				);
				let labelSelector = "nogoo9/type=workspace";
				if (authEnabled) {
					if (!jwtPayload) {
						const err = new Error(
							"Unauthorized: jwtPayload required when AUTH_ENABLED is true",
						);
						logger.error("Authentication failed: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { workspaces: [] });
					}
					try {
						const sub = extractUserIdentity(
							jwtPayload,
							process.env.AUTH_SUB_JSONPATH || "$.sub",
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
					const workspaces = res.items.map((pod) => ({
						id: pod.metadata?.labels?.["nogoo9/workspace-id"] ?? "unknown",
						name: pod.metadata?.name ?? "unknown",
						status: pod.status?.phase ?? "Unknown",
					}));
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
				const authEnabled = process.env.AUTH_ENABLED === "true";
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
					if (!jwtPayload) {
						const err = new Error("Unauthorized: jwtPayload required");
						logger.error("Authentication failed: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { id, status: "" });
					}
					try {
						const sub = extractUserIdentity(
							jwtPayload,
							process.env.AUTH_SUB_JSONPATH || "$.sub",
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
				templateRef,
				spec: inlineSpec,
				annotations: inlineAnnotations,
				namespace,
				context,
				jwtPayload,
			}) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = process.env.AUTH_ENABLED === "true";
				logger.info(
					"Tool spawn_workspace called for workspace ID {id} in namespace {namespace} (templateRef: {templateRef}, authEnabled: {authEnabled})",
					{
						id,
						namespace: ns,
						templateRef,
						authEnabled,
					},
				);
				let userSub = "anonymous";
				if (authEnabled) {
					if (!jwtPayload) {
						const err = new Error("Unauthorized: jwtPayload required");
						logger.error("Authentication failed: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { id, podName: "" });
					}
					try {
						userSub = extractUserIdentity(
							jwtPayload,
							process.env.AUTH_SUB_JSONPATH || "$.sub",
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
						parsedSpec = PodSpecSchema.parse(JSON.parse(raw)) as PodCreateArgs;
						annotations = cm.metadata?.annotations ?? {};
					} else if (inlineSpec) {
						parsedSpec = inlineSpec as PodCreateArgs;
						annotations = inlineAnnotations ?? {};
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
						);
					}
					parsedSpec.labels = {
						...(parsedSpec.labels || {}),
						"nogoo9/type": "workspace",
						"nogoo9/workspace-id": id,
						"nogoo9/managed-by": "nogoo9-spawner",
						"nogoo9/user-sub": userSub,
					};
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
