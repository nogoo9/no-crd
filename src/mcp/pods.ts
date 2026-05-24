import type * as k8s from "@kubernetes/client-node";
import { Observable } from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	createPodFromArgs,
	DEFAULT_NAMESPACE,
	errorResult,
	getAccessibleNamespaces,
	type K8sContext,
	MODE,
	type PodCreateArgs,
	PodSpecSchema,
	podToSummary,
	resolveNamespace,
} from "~/k8s/index.js";

const logger = getLogger(["nogoo9", "mcp-pods"]);

export const ListPodsOutputSchema = z.object({
	pods: z.array(
		z.object({
			name: z.string(),
			namespace: z.string(),
			phase: z.string(),
			ready: z.number().int(),
			total: z.number().int(),
			restarts: z.number().int(),
			podIP: z.string(),
			node: z.string(),
			labels: z.record(z.string(), z.string()),
			annotations: z.record(z.string(), z.string()),
		}),
	),
});

export const GetPodOutputSchema = z.object({
	pod: z.record(z.string(), z.unknown()),
});

export const CreatePodOutputSchema = z.object({
	name: z.string(),
	namespace: z.string(),
});

export const DeletePodOutputSchema = z.object({
	name: z.string(),
	namespace: z.string(),
});

export const PatchPodOutputSchema = z.object({
	name: z.string(),
	namespace: z.string(),
	resourceVersion: z.string(),
});

export const GetPodLogsOutputSchema = z.object({
	logs: z.string(),
});

export const ListNamespacesOutputSchema = z.object({
	namespaces: z.array(z.string()),
});

export const ListRegistryImagesOutputSchema = z.object({
	images: z.array(z.string()),
	registry: z.string(),
});

// ─── Tool registration ────────────────────────────────────────────────────────

const APP_URI = "ui://nogoo9/app";
const UI_META = { ui: { resourceUri: APP_URI } } as const;

const nsParam = z
	.string()
	.optional()
	.describe(
		`Namespace (defaults to "${DEFAULT_NAMESPACE}"${MODE === "namespaced" ? "; locked — namespaced mode ignores this" : ""})`,
	);

/**
 * Registers core Kubernetes pod management tools with the MCP server.
 * Registered tools:
 * - `list_pods`: Lists pods with optional label/field selectors.
 * - `get_pod`: Retrieves full JSON configuration details for a specific pod.
 * - `create_pod`: Provisions and launches a pod from raw parameters.
 * - `delete_pod`: Terminates a pod with optional grace period.
 * - `patch_pod`: Applies a strategic merge patch to a pod.
 * - `get_pod_logs`: Retrieves container logs.
 * - `list_namespaces`: Lists accessible namespaces.
 * - `list_registry_images`: Lists images in the configured local registry.
 *
 * @param server The MCP Server instance to register the tools on.
 * @param k8sContext Active Kubernetes API client context.
 * @param enabledTools List of tool names that are allowed/enabled to be registered.
 */
export function registerPodTools(
	server: McpServer,
	k8sContext: K8sContext,
	enabledTools: string[],
): void {
	if (enabledTools.includes("list_pods")) {
		registerAppTool(
			server,
			"list_pods",
			{
				description:
					"List pods in a namespace with optional label/field selectors",
				inputSchema: {
					namespace: nsParam,
					labelSelector: z
						.string()
						.optional()
						.describe('e.g. "app=my-app,env=prod"'),
					fieldSelector: z
						.string()
						.optional()
						.describe('e.g. "status.phase=Running"'),
					limit: z
						.number()
						.int()
						.positive()
						.optional()
						.describe("Maximum results"),
				},
				outputSchema: ListPodsOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ namespace, labelSelector, fieldSelector, limit }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				logger.info(
					"Tool list_pods called for namespace {namespace} (labelSelector: {labelSelector}, fieldSelector: {fieldSelector})",
					{
						namespace: ns,
						labelSelector,
						fieldSelector,
						limit,
					},
				);
				try {
					const res = await k8sContext.coreApi.listNamespacedPod({
						namespace: ns,
						fieldSelector,
						labelSelector,
						limit,
					});
					const summaries = res.items.map(podToSummary);
					logger.debug("Successfully listed {count} pods", {
						count: summaries.length,
					});
					if (!summaries.length)
						return {
							content: [{ type: "text" as const, text: "(no pods)" }],
							structuredContent: { pods: [] },
						};
					const rows = summaries.map(
						(p) =>
							`${p.name}\t${p.phase}\t${p.ready}/${p.total}\t${p.restarts}\t${p.podIP || "-"}\t${p.node || "-"}`,
					);
					return {
						content: [
							{
								type: "text" as const,
								text: [
									"NAME\tPHASE\tREADY\tRESTARTS\tPOD-IP\tNODE",
									...rows,
								].join("\n"),
							},
						],
						structuredContent: { pods: summaries },
					};
				} catch (err) {
					logger.error(
						"Failed to list pods in namespace {namespace}: {error}",
						{
							namespace: ns,
							error: err,
						},
					);
					return errorResult(k8sContext.kc, err, { pods: [] });
				}
			},
		);
	}

	if (enabledTools.includes("get_pod")) {
		registerAppTool(
			server,
			"get_pod",
			{
				description: "Get full details of a specific pod as JSON",
				inputSchema: {
					name: z.string().describe("Pod name"),
					namespace: nsParam,
				},
				outputSchema: GetPodOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ name, namespace }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				logger.info(
					"Tool get_pod called for pod {name} in namespace {namespace}",
					{
						name,
						namespace: ns,
					},
				);
				try {
					const body = await k8sContext.coreApi.readNamespacedPod({
						name,
						namespace: ns,
					});
					logger.debug("Successfully retrieved details for pod {name}", {
						name,
					});
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(body, null, 2),
							},
						],
						structuredContent: {
							pod: JSON.parse(JSON.stringify(body)) as Record<string, unknown>,
						},
					};
				} catch (err) {
					logger.error("Failed to get pod {name} details: {error}", {
						name,
						error: err,
					});
					return errorResult(k8sContext.kc, err, { pod: {} });
				}
			},
		);
	}

	if (enabledTools.includes("create_pod")) {
		registerAppTool(
			server,
			"create_pod",
			{
				description: "Create a new pod with a comprehensive spec",
				inputSchema: {
					name: z.string().describe("Pod name"),
					namespace: nsParam,
					...PodSpecSchema.shape,
				},
				outputSchema: CreatePodOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ name, namespace, ...specArgs }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				logger.info(
					"Tool create_pod called for pod {name} in namespace {namespace}",
					{
						name,
						namespace: ns,
					},
				);
				try {
					const result = await createPodFromArgs(
						k8sContext.coreApi,
						ns,
						name,
						specArgs as PodCreateArgs,
					);
					logger.info(
						"Successfully created pod {name} in namespace {namespace}",
						{
							name: result.name,
							namespace: result.namespace,
						},
					);
					return {
						content: [{ type: "text" as const, text: result.text }],
						structuredContent: {
							name: result.name,
							namespace: result.namespace,
						},
					};
				} catch (err) {
					logger.error(
						"Failed to create pod {name} in namespace {namespace}: {error}",
						{
							name,
							namespace: ns,
							error: err,
						},
					);
					return errorResult(k8sContext.kc, err, { name: "", namespace: "" });
				}
			},
		);
	}

	if (enabledTools.includes("delete_pod")) {
		registerAppTool(
			server,
			"delete_pod",
			{
				description: "Delete a pod",
				inputSchema: {
					name: z.string().describe("Pod name"),
					namespace: nsParam,
					gracePeriodSeconds: z
						.number()
						.int()
						.nonnegative()
						.optional()
						.describe("0 for immediate"),
				},
				outputSchema: DeletePodOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ name, namespace, gracePeriodSeconds }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				logger.info(
					"Tool delete_pod called for pod {name} in namespace {namespace} (gracePeriodSeconds: {gracePeriodSeconds})",
					{
						name,
						namespace: ns,
						gracePeriodSeconds,
					},
				);
				try {
					await k8sContext.coreApi.deleteNamespacedPod({
						name,
						namespace: ns,
						gracePeriodSeconds,
					});
					logger.info(
						"Successfully deleted pod {name} from namespace {namespace}",
						{
							name,
							namespace: ns,
						},
					);
					return {
						content: [
							{
								type: "text" as const,
								text: `Deleted pod ${name} from namespace ${ns}`,
							},
						],
						structuredContent: { name, namespace: ns },
					};
				} catch (err) {
					logger.error(
						"Failed to delete pod {name} from namespace {namespace}: {error}",
						{
							name,
							namespace: ns,
							error: err,
						},
					);
					return errorResult(k8sContext.kc, err, { name: "", namespace: "" });
				}
			},
		);
	}

	if (enabledTools.includes("patch_pod")) {
		registerAppTool(
			server,
			"patch_pod",
			{
				description:
					"Patch a pod using strategic merge patch. Labels, annotations, and container resource limits/requests can be changed.",
				inputSchema: {
					name: z.string().describe("Pod name"),
					namespace: nsParam,
					patch: z
						.record(z.string(), z.unknown())
						.describe("Strategic merge patch body"),
				},
				outputSchema: PatchPodOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ name, namespace, patch }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				logger.info(
					"Tool patch_pod called for pod {name} in namespace {namespace}",
					{
						name,
						namespace: ns,
					},
				);
				try {
					const options = {
						middleware: [
							{
								pre: (context: k8s.RequestContext) => {
									context.setHeaderParam(
										"Content-Type",
										"application/strategic-merge-patch+json",
									);
									return new Observable(Promise.resolve(context));
								},
								post: (context: k8s.ResponseContext) => {
									return new Observable(Promise.resolve(context));
								},
							},
						],
					};
					const body = await k8sContext.coreApi.patchNamespacedPod(
						{
							name,
							namespace: ns,
							body: patch,
						},
						options,
					);
					const podName = body.metadata?.name ?? name;
					const rv = body.metadata?.resourceVersion ?? "";
					logger.info(
						"Successfully patched pod {name} (resourceVersion: {resourceVersion})",
						{
							name: podName,
							resourceVersion: rv,
						},
					);
					return {
						content: [
							{
								type: "text" as const,
								text: `Patched pod ${podName} (resourceVersion: ${rv})`,
							},
						],
						structuredContent: {
							name: podName,
							namespace: ns,
							resourceVersion: rv,
						},
					};
				} catch (err) {
					logger.error(
						"Failed to patch pod {name} in namespace {namespace}: {error}",
						{
							name,
							namespace: ns,
							error: err,
						},
					);
					return errorResult(k8sContext.kc, err, {
						name: "",
						namespace: "",
						resourceVersion: "",
					});
				}
			},
		);
	}

	if (enabledTools.includes("get_pod_logs")) {
		registerAppTool(
			server,
			"get_pod_logs",
			{
				description: "Retrieve logs from a pod container",
				inputSchema: {
					name: z.string().describe("Pod name"),
					namespace: nsParam,
					container: z
						.string()
						.optional()
						.describe("Container name (required for multi-container pods)"),
					tailLines: z
						.number()
						.int()
						.positive()
						.optional()
						.describe("Last N lines"),
					sinceSeconds: z
						.number()
						.int()
						.positive()
						.optional()
						.describe("Logs from last N seconds"),
					limitBytes: z
						.number()
						.int()
						.positive()
						.optional()
						.describe("Limit bytes"),
					timestamps: z
						.boolean()
						.optional()
						.describe("Prefix with RFC3339 timestamp"),
					previous: z
						.boolean()
						.optional()
						.describe("Logs from previous container instance"),
				},
				outputSchema: GetPodLogsOutputSchema.shape,
				_meta: UI_META,
			},
			async ({
				name,
				namespace,
				container,
				tailLines,
				sinceSeconds,
				limitBytes,
				timestamps,
				previous,
			}) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				logger.info(
					"Tool get_pod_logs called for pod {name} (container: {container}) in namespace {namespace}",
					{
						name,
						container,
						namespace: ns,
					},
				);
				try {
					const logs = await k8sContext.coreApi.readNamespacedPodLog({
						name,
						namespace: ns,
						container,
						follow: false,
						limitBytes,
						previous: previous ?? false,
						sinceSeconds,
						tailLines,
						timestamps: timestamps ?? false,
					});
					logger.debug("Successfully retrieved logs for pod {name}", { name });
					return {
						content: [
							{
								type: "text" as const,
								text: logs || "(no logs)",
							},
						],
						structuredContent: { logs: logs || "" },
					};
				} catch (err) {
					logger.error("Failed to get logs for pod {name}: {error}", {
						name,
						error: err,
					});
					return errorResult(k8sContext.kc, err, { logs: "" });
				}
			},
		);
	}

	if (enabledTools.includes("list_namespaces")) {
		registerAppTool(
			server,
			"list_namespaces",
			{
				description: "List namespaces this server has pod access to",
				inputSchema: {},
				outputSchema: ListNamespacesOutputSchema.shape,
				_meta: UI_META,
			},
			async () => {
				logger.info("Tool list_namespaces called");
				try {
					const namespaces = await getAccessibleNamespaces(
						k8sContext.coreApi,
						MODE,
						DEFAULT_NAMESPACE,
					);
					logger.debug("Found {count} accessible namespaces", {
						count: namespaces.length,
					});
					if (!namespaces.length)
						return {
							content: [
								{
									type: "text" as const,
									text: "(no accessible namespaces)",
								},
							],
							structuredContent: { namespaces: [] },
						};
					return {
						content: [
							{
								type: "text" as const,
								text: ["NAME", ...namespaces].join("\n"),
							},
						],
						structuredContent: { namespaces },
					};
				} catch (err) {
					logger.error("Failed to list accessible namespaces: {error}", {
						error: err,
					});
					return errorResult(k8sContext.kc, err, { namespaces: [] });
				}
			},
		);
	}

	const registryUrl = process.env.REGISTRY_URL;
	if (enabledTools.includes("list_registry_images")) {
		registerAppTool(
			server,
			"list_registry_images",
			{
				description: registryUrl
					? `List images available in the configured registry (${registryUrl})`
					: "List images available in the registry (set REGISTRY_URL env var to configure)",
				inputSchema: {
					repository: z
						.string()
						.optional()
						.describe("Filter by repository name prefix"),
				},
				outputSchema: ListRegistryImagesOutputSchema.shape,
				_meta: UI_META,
			},
			async ({ repository }) => {
				logger.info(
					"Tool list_registry_images called (repository filter: {repository}, registryUrl: {registryUrl})",
					{
						repository,
						registryUrl,
					},
				);
				if (!registryUrl) {
					logger.warn(
						"No registry URL configured; returning empty list of images",
					);
					return {
						content: [
							{
								type: "text" as const,
								text: "No registry configured. Set REGISTRY_URL env var (e.g. http://nogoo9-registry.localhost:5001).",
							},
						],
						structuredContent: { images: [], registry: "" },
					};
				}
				try {
					const catRes = await fetch(`${registryUrl}/v2/_catalog`);
					if (!catRes.ok)
						throw new Error(`Registry catalog returned ${catRes.status}`);
					const { repositories } = (await catRes.json()) as {
						repositories: string[];
					};
					const repos = repository
						? repositories.filter((r) => r.startsWith(repository))
						: repositories;
					const images: string[] = [];
					const registryHost = registryUrl.replace(/^https?:\/\//, "");
					await Promise.all(
						repos.map(async (repo) => {
							try {
								const tagsRes = await fetch(
									`${registryUrl}/v2/${repo}/tags/list`,
								);
								if (!tagsRes.ok) return;
								const { tags } = (await tagsRes.json()) as {
									tags: string[] | null;
								};
								if (tags) {
									for (const tag of tags)
										images.push(`${registryHost}/${repo}:${tag}`);
								}
							} catch {
								/* skip repos that fail */
							}
						}),
					);
					images.sort();
					logger.debug(
						"Successfully retrieved {count} registry images from {registryHost}",
						{
							count: images.length,
							registryHost,
						},
					);
					const text = images.length
						? images.join("\n")
						: `(no images found in ${registryHost})`;
					return {
						content: [{ type: "text" as const, text }],
						structuredContent: { images, registry: registryHost },
					};
				} catch (err) {
					logger.error(
						"Failed to list registry images from {registryUrl}: {error}",
						{
							registryUrl,
							error: err,
						},
					);
					return errorResult(k8sContext.kc, err, { images: [], registry: "" });
				}
			},
		);
	}
}
