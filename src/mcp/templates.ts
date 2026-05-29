import type * as k8s from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "~/config/index.js";
import {
	createPodFromArgs,
	DEFAULT_NAMESPACE,
	DESCRIPTION_ANNOTATION,
	EnvFromSource,
	EnvVar,
	errorResult,
	extractUserIdentity,
	getAccessibleNamespaces,
	type K8sContext,
	type LocalTemplate,
	listLocalTemplates,
	listTemplateMaps,
	MODE,
	mergeContainersByName,
	mergeTopLevel,
	type PodCreateArgs,
	PodSpecSchema,
	parseSpecString,
	parseTemplateRef,
	parseWorkspaceApis,
	ResourceQuantity,
	readLocalTemplate,
	readTemplateMap,
	requestContextStore,
	resolveNamespace,
	TAG_ANNOTATION,
	TEMPLATE_LABEL_KEY,
	verifyAccessOrThrow,
} from "~/k8s/index.js";
import { WorkspaceApiSchema } from "~/mcp/spawner.js";

const logger = getLogger(["nogoo9", "mcp-templates"]);

const APP_URI = "ui://nogoo9/app";

export const ListTemplatesOutputSchema = z.object({
	templates: z.array(
		z.object({
			name: z.string(),
			namespace: z.string(),
			description: z.string(),
			tag: z.string(),
			requiredContext: z.array(z.string()).optional(),
			workspacePath: z.string().optional(),
			workspaceType: z.string().optional(),
			apis: z.array(WorkspaceApiSchema).optional(),
		}),
	),
});

export const GetTemplateOutputSchema = z.object({
	name: z.string(),
	namespace: z.string(),
	description: z.string(),
	tag: z.string(),
	labels: z.record(z.string(), z.string()).optional(),
	annotations: z.record(z.string(), z.string()).optional(),
	spec: z.record(z.string(), z.unknown()),
	requiredContext: z.array(z.string()).optional(),
	workspacePath: z.string().optional(),
	workspaceType: z.string().optional(),
	apis: z.array(WorkspaceApiSchema).optional(),
});

export const CreateTemplateOutputSchema = z.object({
	name: z.string(),
	namespace: z.string(),
});

export const UpdateTemplateOutputSchema = z.object({
	name: z.string(),
	namespace: z.string(),
});

export const DeleteTemplateOutputSchema = z.object({
	name: z.string(),
	namespace: z.string(),
});

export const CreatePodFromTemplateOutputSchema = z.object({
	name: z.string(),
	namespace: z.string(),
});

/**
 * Returns a list of accessible namespaces.
 *
 * @param coreApi Kubernetes Core API client.
 * @returns Array of namespace names.
 */
async function listAccessibleNamespaces(
	coreApi: k8s.CoreV1Api,
): Promise<string[]> {
	return getAccessibleNamespaces(coreApi, MODE, DEFAULT_NAMESPACE);
}

/**
 * Extracts template metadata from a {@link LocalTemplate} into the same shape
 * used by ConfigMap-based templates in tool responses.
 */
function localTemplateToMeta(
	tmpl: LocalTemplate,
	ns: string,
): {
	name: string;
	namespace: string;
	description: string;
	tag: string;
	requiredContext: string[];
	workspacePath: string;
	workspaceType: string;
	apis: ReturnType<typeof parseWorkspaceApis>;
} {
	const a = tmpl.annotations;
	const reqRaw = a["nogoo9/required-context"];
	return {
		name: tmpl.name,
		namespace: ns,
		description: a[DESCRIPTION_ANNOTATION] ?? "",
		tag: a[TAG_ANNOTATION] ?? "",
		requiredContext: reqRaw
			? reqRaw
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: [],
		workspacePath:
			a["nogoo9/workspace-path"] ?? a["nogoo9/preview-path"] ?? "/",
		workspaceType:
			a["nogoo9/workspace-type"] ?? a["nogoo9/preview-type"] ?? "html",
		apis: parseWorkspaceApis(a),
	};
}

/**
 * Collects local + built-in templates (if configured), returning them
 * as {@link LocalTemplate} entries.
 */
function collectLocalTemplates(): LocalTemplate[] {
	const results: LocalTemplate[] = [];
	const k8sCfg = config.k8s;

	if (k8sCfg.templatesDir) {
		results.push(...listLocalTemplates(k8sCfg.templatesDir));
	}
	if (k8sCfg.builtinTemplates) {
		const builtins = listLocalTemplates(k8sCfg.builtinTemplatesDir);
		// Only add built-ins that don't collide with custom dir templates
		const existingNames = new Set(results.map((t) => t.name));
		for (const b of builtins) {
			if (!existingNames.has(b.name)) {
				results.push(b);
			}
		}
	}
	return results;
}

/**
 * Tries to find a local or built-in template by name.
 * Checks custom TEMPLATES_DIR first, then built-in dir.
 */
function findLocalTemplate(name: string): LocalTemplate | null {
	const k8sCfg = config.k8s;
	if (k8sCfg.templatesDir) {
		const found = readLocalTemplate(k8sCfg.templatesDir, name);
		if (found) return found;
	}
	if (k8sCfg.builtinTemplates) {
		const found = readLocalTemplate(k8sCfg.builtinTemplatesDir, name);
		if (found) return found;
	}
	return null;
}

const nsParam = z
	.string()
	.optional()
	.describe(
		`Namespace (defaults to "${DEFAULT_NAMESPACE}"${MODE === "namespaced" ? "; locked — namespaced mode ignores this" : ""})`,
	);

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Registers MCP template resources and tools with the MCP Server.
 * Registered resources:
 * - `pod-template://{namespace}/{name}`: Provides the JSON config of a template.
 *
 * Registered tools:
 * - `list_templates`: Lists template ConfigMaps in a namespace.
 * - `get_template`: Gets a template's raw configuration spec.
 * - `create_template`: Creates a template ConfigMap.
 * - `update_template`: Modifies an existing template ConfigMap.
 * - `delete_template`: Deletes a template ConfigMap.
 * - `create_pod_from_template`: Creates a new Kubernetes Pod from a template with optional overrides.
 *
 * @param server The MCP Server instance.
 * @param k8sContext Active Kubernetes API client context.
 * @param enabledTools List of tool names that are allowed/enabled to be registered.
 */
export function registerTemplateResources(
	server: McpServer,
	k8sContext: K8sContext,
	enabledTools: string[],
): void {
	// MCP resource: pod-template://{namespace}/{name}
	if (
		enabledTools.includes("list_templates") &&
		enabledTools.includes("get_template")
	) {
		logger.info("Registering pod-template resource template");
		server.registerResource(
			"pod-template",
			new ResourceTemplate("pod-template://{namespace}/{name}", {
				list: async () => {
					logger.info("Listing resources for pod-template");
					try {
						const namespaces = await listAccessibleNamespaces(
							k8sContext.coreApi,
						);
						const resources: Array<{
							uri: string;
							name: string;
							description?: string;
							mimeType: string;
						}> = [];
						for (const ns of namespaces) {
							const maps = await listTemplateMaps(k8sContext.coreApi, ns);
							for (const cm of maps) {
								const tmplName = cm.metadata?.name ?? "";
								resources.push({
									uri: `pod-template://${ns}/${tmplName}`,
									name: `${ns}/${tmplName}`,
									description:
										cm.metadata?.annotations?.[DESCRIPTION_ANNOTATION],
									mimeType: "application/json",
								});
							}
						}
						logger.debug("Successfully listed {count} pod-template resources", {
							count: resources.length,
						});
						return { resources };
					} catch (err) {
						logger.error("Failed to list pod-template resources: {error}", {
							error: err,
						});
						return { resources: [] };
					}
				},
			}),
			{
				description:
					"Pod template ConfigMaps (label: nogoo9/pod-template=true).",
			},
			async (uri, variables) => {
				const ns = resolveNamespace(
					variables.namespace as string,
					MODE,
					DEFAULT_NAMESPACE,
				);
				const name = variables.name as string;
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = store?.jwtPayload;
				if (authEnabled) {
					if (!activeJwtPayload) {
						return {
							contents: [
								{
									uri: uri.href,
									text: "Error: Unauthorized",
									mimeType: "text/plain",
								},
							],
						};
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "read");
					} catch (err) {
						return {
							contents: [
								{
									uri: uri.href,
									text: `Error: ${err instanceof Error ? err.message : String(err)}`,
									mimeType: "text/plain",
								},
							],
						};
					}
				}
				logger.info(
					"Reading pod-template resource at URI {uri} (namespace: {namespace}, name: {name})",
					{
						uri: uri.href,
						namespace: ns,
						name,
					},
				);
				try {
					const cm = await readTemplateMap(k8sContext.coreApi, ns, name);
					logger.debug("Successfully read pod-template resource {name}", {
						name,
					});
					return {
						contents: [
							{
								uri: uri.href,
								text: cm.data?.spec ?? "{}",
								mimeType: "application/json",
							},
						],
					};
				} catch (err) {
					logger.error("Failed to read pod-template resource {name}: {error}", {
						name,
						error: err,
					});
					const msg = err instanceof Error ? err.message : String(err);
					return {
						contents: [
							{ uri: uri.href, text: `Error: ${msg}`, mimeType: "text/plain" },
						],
					};
				}
			},
		);
	}

	// ── list_templates ─────────────────────────────────────────────────────────
	if (enabledTools.includes("list_templates")) {
		registerAppTool(
			server,
			"list_templates",
			{
				description:
					"List pod template ConfigMaps (label: nogoo9/pod-template=true)",
				inputSchema: {
					namespace: nsParam,
					jwtPayload: z.record(z.string(), z.unknown()).optional(),
				},
				outputSchema: ListTemplatesOutputSchema.shape,
				_meta: { ui: { resourceUri: APP_URI } },
			},
			async ({ namespace, jwtPayload }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				if (authEnabled) {
					if (!activeJwtPayload) {
						return errorResult(
							k8sContext.kc,
							new Error("Unauthorized: jwtPayload required"),
							{ templates: [] },
						);
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "read");
					} catch (err) {
						return errorResult(k8sContext.kc, err, { templates: [] });
					}
				}
				logger.info("Tool list_templates called for namespace {namespace}", {
					namespace: ns,
				});
				try {
					// 1. ConfigMap templates (highest priority)
					const maps = await listTemplateMaps(k8sContext.coreApi, ns);
					const seenNames = new Set<string>();
					const templates = maps.map((cm) => {
						const reqContextRaw =
							cm.metadata?.annotations?.["nogoo9/required-context"];
						const requiredContext = reqContextRaw
							? reqContextRaw
									.split(",")
									.map((s) => s.trim())
									.filter(Boolean)
							: [];
						const annotations = cm.metadata?.annotations ?? {};
						const workspacePath =
							annotations["nogoo9/workspace-path"] ??
							annotations["nogoo9/preview-path"] ??
							"/";
						const workspaceType =
							annotations["nogoo9/workspace-type"] ??
							annotations["nogoo9/preview-type"] ??
							"html";
						const tmplName = cm.metadata?.name ?? "";
						seenNames.add(tmplName);
						return {
							name: tmplName,
							namespace: ns,
							description: annotations[DESCRIPTION_ANNOTATION] ?? "",
							tag: annotations[TAG_ANNOTATION] ?? "",
							requiredContext,
							workspacePath,
							workspaceType,
							apis: parseWorkspaceApis(annotations),
						};
					});

					// 2. Local + built-in templates (lower priority, skip name collisions)
					const localTemplates = collectLocalTemplates();
					for (const lt of localTemplates) {
						if (!seenNames.has(lt.name)) {
							seenNames.add(lt.name);
							templates.push(localTemplateToMeta(lt, ns));
						}
					}

					logger.debug("Successfully found {count} templates", {
						count: templates.length,
					});
					if (!templates.length)
						return {
							content: [{ type: "text" as const, text: "(no templates)" }],
							structuredContent: { templates: [] },
						};
					return {
						content: [
							{
								type: "text" as const,
								text: templates
									.map((t) => `${t.name}\t${t.description}`)
									.join("\n"),
							},
						],
						structuredContent: { templates },
					};
				} catch (err) {
					logger.error(
						"Failed to list templates in namespace {namespace}: {error}",
						{
							namespace: ns,
							error: err,
						},
					);
					return errorResult(k8sContext.kc, err, { templates: [] });
				}
			},
		);
	}

	// ── get_template ───────────────────────────────────────────────────────────
	if (enabledTools.includes("get_template")) {
		registerAppTool(
			server,
			"get_template",
			{
				description: "Get a pod template spec as JSON",
				inputSchema: {
					name: z.string().describe("Template name"),
					namespace: nsParam,
					jwtPayload: z.record(z.string(), z.unknown()).optional(),
				},
				outputSchema: GetTemplateOutputSchema.shape,
				_meta: { ui: { resourceUri: APP_URI } },
			},
			async ({ name, namespace, jwtPayload }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				if (authEnabled) {
					if (!activeJwtPayload) {
						return errorResult(
							k8sContext.kc,
							new Error("Unauthorized: jwtPayload required"),
							{
								name: "",
								namespace: "",
								description: "",
								tag: "",
								labels: {},
								annotations: {},
								spec: {},
							},
						);
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "read");
					} catch (err) {
						return errorResult(k8sContext.kc, err, {
							name: "",
							namespace: "",
							description: "",
							tag: "",
							labels: {},
							annotations: {},
							spec: {},
						});
					}
				}
				logger.info(
					"Tool get_template called for template {name} in namespace {namespace}",
					{
						name,
						namespace: ns,
					},
				);
				try {
					const cm = await readTemplateMap(k8sContext.coreApi, ns, name);
					const spec = parseSpecString(cm.data?.spec ?? "{}") as Record<
						string,
						unknown
					>;
					logger.debug("Successfully retrieved template {name}", { name });
					const annotations = cm.metadata?.annotations ?? {};
					const workspacePath =
						annotations["nogoo9/workspace-path"] ??
						annotations["nogoo9/preview-path"] ??
						"/";
					const workspaceType =
						annotations["nogoo9/workspace-type"] ??
						annotations["nogoo9/preview-type"] ??
						"html";
					const reqContextRaw = annotations["nogoo9/required-context"];
					const requiredContext = reqContextRaw
						? reqContextRaw
								.split(",")
								.map((s) => s.trim())
								.filter(Boolean)
						: [];
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										metadata: {
											name: cm.metadata?.name ?? name,
											namespace: ns,
											labels: cm.metadata?.labels ?? {},
											annotations,
										},
										spec,
									},
									null,
									2,
								),
							},
						],
						structuredContent: {
							name: cm.metadata?.name ?? name,
							namespace: ns,
							description: annotations[DESCRIPTION_ANNOTATION] ?? "",
							tag: annotations[TAG_ANNOTATION] ?? "",
							labels: cm.metadata?.labels ?? {},
							annotations,
							spec,
							requiredContext,
							workspacePath,
							workspaceType,
							apis: parseWorkspaceApis(annotations),
						},
					};
				} catch (err) {
					// Fallback to local/built-in templates
					const localTmpl = findLocalTemplate(name);
					if (localTmpl) {
						const meta = localTemplateToMeta(localTmpl, ns);
						return {
							content: [
								{
									type: "text" as const,
									text: JSON.stringify(
										{
											metadata: {
												name: localTmpl.name,
												namespace: ns,
												annotations: localTmpl.annotations,
												labels: localTmpl.labels ?? {},
											},
											spec: localTmpl.spec,
										},
										null,
										2,
									),
								},
							],
							structuredContent: {
								...meta,
								labels: localTmpl.labels ?? {},
								annotations: localTmpl.annotations,
								spec: localTmpl.spec,
							},
						};
					}
					logger.error(
						"Failed to read template {name} from namespace {namespace}: {error}",
						{
							name,
							namespace: ns,
							error: err,
						},
					);
					return errorResult(k8sContext.kc, err, {
						name: "",
						namespace: "",
						description: "",
						tag: "",
						labels: {},
						annotations: {},
						spec: {},
						workspacePath: "",
						workspaceType: "",
						apis: [],
					});
				}
			},
		);
	}

	// ── create_template ────────────────────────────────────────────────────────
	if (enabledTools.includes("create_template")) {
		registerAppTool(
			server,
			"create_template",
			{
				description: "Create a pod template ConfigMap",
				inputSchema: {
					name: z.string().describe("Template name"),
					namespace: nsParam,
					description: z
						.string()
						.optional()
						.describe("Human-readable description"),
					tag: z
						.string()
						.optional()
						.describe("Annotation tag for grouping in the UI (nogoo9/tag)"),
					labels: z
						.record(z.string(), z.string())
						.optional()
						.describe("Additional labels to apply to the template ConfigMap"),
					annotations: z
						.record(z.string(), z.string())
						.optional()
						.describe(
							"Additional annotations to apply to the template ConfigMap",
						),
					spec: PodSpecSchema.describe("Pod spec to store as the template"),
					jwtPayload: z.record(z.string(), z.unknown()).optional(),
				},
				outputSchema: CreateTemplateOutputSchema.shape,
				_meta: { ui: { resourceUri: APP_URI } },
			},
			async ({
				name,
				namespace,
				description,
				tag,
				labels: passedLabels,
				annotations: passedAnnotations,
				spec,
				jwtPayload,
			}) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				if (authEnabled) {
					if (!activeJwtPayload) {
						return errorResult(
							k8sContext.kc,
							new Error("Unauthorized: jwtPayload required"),
							{ name: "", namespace: "" },
						);
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "write");
					} catch (err) {
						return errorResult(k8sContext.kc, err, { name: "", namespace: "" });
					}
				}
				logger.info(
					"Tool create_template called for template {name} in namespace {namespace}",
					{
						name,
						namespace: ns,
					},
				);
				try {
					const annotations: Record<string, string> = {
						...(passedAnnotations ?? {}),
					};
					if (description) annotations[DESCRIPTION_ANNOTATION] = description;
					if (tag) annotations[TAG_ANNOTATION] = tag;
					const labels: Record<string, string> = {
						[TEMPLATE_LABEL_KEY]: "true",
						...(passedLabels ?? {}),
					};
					const cm: k8s.V1ConfigMap = {
						apiVersion: "v1",
						kind: "ConfigMap",
						metadata: {
							name,
							namespace: ns,
							labels,
							annotations,
						},
						data: { spec: JSON.stringify(spec) },
					};
					const body = await k8sContext.coreApi.createNamespacedConfigMap({
						namespace: ns,
						body: cm,
					});
					logger.info(
						"Successfully created template ConfigMap {name} in namespace {namespace}",
						{
							name: body.metadata?.name ?? name,
							namespace: ns,
						},
					);
					return {
						content: [
							{
								type: "text" as const,
								text: `Created template ${body.metadata?.name ?? name}`,
							},
						],
						structuredContent: {
							name: body.metadata?.name ?? name,
							namespace: ns,
						},
					};
				} catch (err) {
					logger.error("Failed to create template: {error}", {
						error: err,
					});
					return errorResult(k8sContext.kc, err, { name: "", namespace: "" });
				}
			},
		);
	}

	// ── update_template ────────────────────────────────────────────────────────
	if (enabledTools.includes("update_template")) {
		registerAppTool(
			server,
			"update_template",
			{
				description: "Update an existing pod template ConfigMap",
				inputSchema: {
					name: z.string().describe("Template name"),
					namespace: nsParam,
					description: z.string().optional(),
					tag: z.string().optional(),
					labels: z
						.record(z.string(), z.string())
						.optional()
						.describe("Labels to merge with the existing template"),
					annotations: z
						.record(z.string(), z.string())
						.optional()
						.describe("Annotations to merge with the existing template"),
					spec: PodSpecSchema.optional().describe(
						"New pod spec (replaces existing if provided)",
					),
					jwtPayload: z.record(z.string(), z.unknown()).optional(),
				},
				outputSchema: UpdateTemplateOutputSchema.shape,
				_meta: { ui: { resourceUri: APP_URI } },
			},
			async ({
				name,
				namespace,
				description,
				tag,
				labels: passedLabels,
				annotations: passedAnnotations,
				spec,
				jwtPayload,
			}) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				if (authEnabled) {
					if (!activeJwtPayload) {
						return errorResult(
							k8sContext.kc,
							new Error("Unauthorized: jwtPayload required"),
							{ name: "", namespace: "" },
						);
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "write");
					} catch (err) {
						return errorResult(k8sContext.kc, err, { name: "", namespace: "" });
					}
				}
				logger.info(
					"Tool update_template called for template {name} in namespace {namespace}",
					{
						name,
						namespace: ns,
					},
				);
				try {
					const existing = await readTemplateMap(k8sContext.coreApi, ns, name);
					const annotations = {
						...(existing.metadata?.annotations ?? {}),
						...(passedAnnotations ?? {}),
					};
					if (description !== undefined)
						annotations[DESCRIPTION_ANNOTATION] = description;
					if (tag !== undefined) annotations[TAG_ANNOTATION] = tag;

					const labels = {
						...(existing.metadata?.labels ?? {}),
						...(passedLabels ?? {}),
					};

					const data = { ...(existing.data ?? {}) };
					if (spec !== undefined) data.spec = JSON.stringify(spec);
					const updated: k8s.V1ConfigMap = {
						...existing,
						metadata: { ...existing.metadata, labels, annotations },
						data,
					};
					const body = await k8sContext.coreApi.replaceNamespacedConfigMap({
						name,
						namespace: ns,
						body: updated,
					});
					logger.info(
						"Successfully updated template ConfigMap {name} in namespace {namespace}",
						{
							name: body.metadata?.name ?? name,
							namespace: ns,
						},
					);
					return {
						content: [
							{
								type: "text" as const,
								text: `Updated template ${body.metadata?.name ?? name}`,
							},
						],
						structuredContent: {
							name: body.metadata?.name ?? name,
							namespace: ns,
						},
					};
				} catch (err) {
					logger.error(
						"Failed to update template {name} in namespace {namespace}: {error}",
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

	// ── delete_template ────────────────────────────────────────────────────────
	if (enabledTools.includes("delete_template")) {
		registerAppTool(
			server,
			"delete_template",
			{
				description: "Delete a pod template ConfigMap",
				inputSchema: {
					name: z.string().describe("Template name"),
					namespace: nsParam,
					jwtPayload: z.record(z.string(), z.unknown()).optional(),
				},
				outputSchema: DeleteTemplateOutputSchema.shape,
				_meta: { ui: { resourceUri: APP_URI } },
			},
			async ({ name, namespace, jwtPayload }) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				if (authEnabled) {
					if (!activeJwtPayload) {
						return errorResult(
							k8sContext.kc,
							new Error("Unauthorized: jwtPayload required"),
							{ name: "", namespace: "" },
						);
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "write");
					} catch (err) {
						return errorResult(k8sContext.kc, err, { name: "", namespace: "" });
					}
				}
				logger.info(
					"Tool delete_template called for template {name} in namespace {namespace}",
					{
						name,
						namespace: ns,
					},
				);
				try {
					await k8sContext.coreApi.deleteNamespacedConfigMap({
						name,
						namespace: ns,
					});
					logger.info(
						"Successfully deleted template ConfigMap {name} in namespace {namespace}",
						{
							name,
							namespace: ns,
						},
					);
					return {
						content: [
							{ type: "text" as const, text: `Deleted template ${name}` },
						],
						structuredContent: { name, namespace: ns },
					};
				} catch (err) {
					logger.error(
						"Failed to delete template {name} in namespace {namespace}: {error}",
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

	// ── create_pod_from_template ───────────────────────────────────────────────
	if (enabledTools.includes("create_pod_from_template")) {
		const ContainerOverride = z.object({
			name: z.string().describe("Container name to match in the template"),
			image: z.string().optional(),
			command: z.array(z.string()).optional(),
			args: z.array(z.string()).optional(),
			env: z
				.array(EnvVar)
				.optional()
				.describe("Merged with template env by name; override wins"),
			envFrom: z.array(EnvFromSource).optional(),
			resources: z
				.object({
					limits: ResourceQuantity.optional(),
					requests: ResourceQuantity.optional(),
				})
				.optional(),
			volumeMounts: z
				.array(
					z.object({
						name: z.string(),
						mountPath: z.string(),
						subPath: z.string().optional(),
						readOnly: z.boolean().optional(),
					}),
				)
				.optional(),
		});

		registerAppTool(
			server,
			"create_pod_from_template",
			{
				description:
					'Create a pod from a stored template. templateRef formats: "pod-template://namespace/name", "namespace/name", or "name".',
				inputSchema: {
					templateRef: z.string().describe("Template reference"),
					name: z.string().describe("Name for the new pod"),
					namespace: nsParam,
					containerOverrides: z
						.array(ContainerOverride)
						.optional()
						.describe("Per-container overrides matched by name"),
					topLevelOverrides: PodSpecSchema.omit({ containers: true })
						.partial()
						.optional()
						.describe(
							"Pod-level overrides; labels/annotations are deep-merged",
						),
					jwtPayload: z.record(z.string(), z.unknown()).optional(),
				},
				outputSchema: CreatePodFromTemplateOutputSchema.shape,
				_meta: { ui: { resourceUri: APP_URI } },
			},
			async ({
				templateRef,
				name,
				namespace,
				containerOverrides,
				topLevelOverrides,
				jwtPayload,
			}) => {
				const ns = resolveNamespace(namespace, MODE, DEFAULT_NAMESPACE);
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				if (authEnabled) {
					if (!activeJwtPayload) {
						return errorResult(
							k8sContext.kc,
							new Error("Unauthorized: jwtPayload required"),
							{ name: "", namespace: "" },
						);
					}
					try {
						verifyAccessOrThrow(activeJwtPayload, "write");
					} catch (err) {
						return errorResult(k8sContext.kc, err, { name: "", namespace: "" });
					}
				}
				logger.info(
					"Tool create_pod_from_template called for pod {name} in namespace {namespace} using templateRef {templateRef}",
					{
						name,
						namespace: ns,
						templateRef,
					},
				);
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

					let raw: string | undefined;
					let _tmplAnnotations: Record<string, string> = {};
					if (cm?.data?.spec) {
						raw = cm.data.spec;
						_tmplAnnotations = cm.metadata?.annotations ?? {};
					} else {
						// Fallback to local/built-in templates
						const localTmpl = findLocalTemplate(tmplName);
						if (localTmpl) {
							raw = JSON.stringify(localTmpl.spec);
							_tmplAnnotations = localTmpl.annotations;
						}
					}

					if (!raw) {
						const err = new Error(
							`Template "${templateRef}" not found in ConfigMaps, local templates, or built-in templates`,
						);
						logger.error("Template not found: {error}", { error: err });
						return errorResult(k8sContext.kc, err, { name: "", namespace: "" });
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

					// biome-ignore lint/suspicious/noTemplateCurlyInString: template variable replacement
					const interpolatedRaw = raw.replaceAll("${{user}}", templateUser);
					const parsedSpec = PodSpecSchema.parse(
						parseSpecString(interpolatedRaw),
					);
					const merged: PodCreateArgs = topLevelOverrides
						? (mergeTopLevel(parsedSpec, topLevelOverrides) as PodCreateArgs)
						: parsedSpec;
					if (containerOverrides?.length) {
						merged.containers = mergeContainersByName(
							merged.containers,
							containerOverrides,
						) as PodCreateArgs["containers"];
					}
					const result = await createPodFromArgs(
						k8sContext.coreApi,
						ns,
						name,
						merged,
					);
					logger.info(
						"Successfully created pod {name} in namespace {namespace} from template {templateRef}",
						{
							name: result.name,
							namespace: result.namespace,
							templateRef,
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
					logger.error("Failed to create pod from template: {error}", {
						error: err,
					});
					return errorResult(k8sContext.kc, err, { name: "", namespace: "" });
				}
			},
		);
	}
}
