import { getLogger } from "@logtape/logtape";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "~/config/index.js";
import {
	evaluatePermissions,
	extractAdminRole,
	type K8sContext,
	requestContextStore,
	verifyAccessOrThrow,
} from "~/k8s/index.js";

const _logger = getLogger(["nogoo9", "mcp-namespace"]);

const APP_URI = "ui://nogoo9/app";

export const CurrentNamespaceOutputSchema = z.object({
	namespace: z.string().describe("Active namespace"),
	mode: z.string().describe('"cluster" or "namespaced"'),
});

export const CheckPermissionsOutputSchema = z.object({
	mode: z.string(),
	namespace: z.string(),
	enabledTools: z.array(z.string()),
	disabledTools: z.array(z.string()),
	permissions: z.record(z.string(), z.record(z.string(), z.boolean())),
});

export const GetCapabilitiesOutputSchema = z.object({
	enabledTools: z.array(z.string()),
	managedOnly: z.boolean(),
	authEnabled: z.boolean(),
	isAdmin: z.boolean(),
});

/**
 * Packages the current namespace configuration into a structured object.
 *
 * @param defaultNamespace The configured default namespace.
 * @param mode Mode of access control (cluster or namespaced).
 * @returns Structured namespace configuration object.
 */
export function currentNamespaceData(defaultNamespace: string, mode: string) {
	return { namespace: defaultNamespace, mode };
}

/**
 * Returns a human-readable text block showing the configured namespace and mode.
 *
 * @param defaultNamespace The default namespace.
 * @param mode Mode of access control.
 * @returns Human-readable configuration details.
 */
export function currentNamespaceText(
	defaultNamespace: string,
	mode: string,
): string {
	return `Namespace: ${defaultNamespace}\nMode: ${mode}`;
}

/**
 * Registers namespace diagnostics and metadata tools into the MCP server.
 * Registered tools: `current_namespace`, `check_permissions`, `get_capabilities`.
 *
 * @param server The McpServer instance.
 * @param k8sContext Active K8sContext containing API clients.
 * @param defaultNamespace The default namespace.
 * @param mode The access mode (cluster or namespaced).
 */
export function registerNamespaceTools(
	server: McpServer,
	k8sContext: K8sContext,
	defaultNamespace: string,
	mode: string,
): void {
	registerAppTool(
		server,
		"current_namespace",
		{
			description:
				"Show the namespace and mode this MCP server is currently configured to use",
			inputSchema: {
				jwtPayload: z.record(z.string(), z.unknown()).optional(),
			},
			outputSchema: CurrentNamespaceOutputSchema.shape,
			_meta: { ui: { resourceUri: APP_URI } },
		},
		async ({
			jwtPayload,
		}): Promise<{
			content: Array<{ type: "text"; text: string }>;
			structuredContent: z.infer<typeof CurrentNamespaceOutputSchema>;
		}> => {
			const authEnabled = config.auth.enabled;
			const store = requestContextStore.getStore();
			const activeJwtPayload = jwtPayload || store?.jwtPayload;
			if (authEnabled) {
				if (!activeJwtPayload) {
					throw new Error("Unauthorized: jwtPayload required");
				}
				verifyAccessOrThrow(activeJwtPayload, "read");
			}
			return {
				content: [
					{
						type: "text" as const,
						text: currentNamespaceText(defaultNamespace, mode),
					},
				],
				structuredContent: currentNamespaceData(defaultNamespace, mode),
			};
		},
	);

	registerAppTool(
		server,
		"check_permissions",
		{
			description:
				"Verify the Kubernetes RBAC permissions of the current session and list enabled/disabled tools",
			inputSchema: {
				jwtPayload: z.record(z.string(), z.unknown()).optional(),
			},
			outputSchema: CheckPermissionsOutputSchema.shape,
			_meta: { ui: { resourceUri: APP_URI } },
		},
		async ({
			jwtPayload,
		}): Promise<{
			content: Array<{ type: "text"; text: string }>;
			structuredContent?: z.infer<typeof CheckPermissionsOutputSchema>;
			isError?: boolean;
		}> => {
			try {
				const authEnabled = config.auth.enabled;
				const store = requestContextStore.getStore();
				const activeJwtPayload = jwtPayload || store?.jwtPayload;
				if (authEnabled) {
					if (!activeJwtPayload) {
						throw new Error("Unauthorized: jwtPayload required");
					}
					verifyAccessOrThrow(activeJwtPayload, "read");
				}
				const report = await evaluatePermissions(
					k8sContext,
					defaultNamespace,
					mode,
				);

				const header = "RESOURCE\tVERB\tALLOWED";
				const rows: string[] = [];
				for (const [res, verbs] of Object.entries(report.permissions)) {
					for (const [verb, allowed] of Object.entries(verbs)) {
						rows.push(`${res}\t${verb}\t${allowed ? "✔ YES" : "❌ NO"}`);
					}
				}

				const toolHeader = "TOOL\tSTATUS";
				const toolRows: string[] = [];
				for (const tool of report.enabledTools) {
					toolRows.push(`${tool}\tENABLED`);
				}
				for (const tool of report.disabledTools) {
					toolRows.push(`${tool}\tDISABLED`);
				}

				const text = [
					"--- RBAC PERMISSIONS ---",
					header,
					...rows,
					"",
					"--- MCP TOOLS ---",
					toolHeader,
					...toolRows,
				].join("\n");

				return {
					content: [{ type: "text" as const, text }],
					structuredContent: {
						mode: report.configuredFlags.mode,
						namespace: report.configuredFlags.namespace,
						enabledTools: report.enabledTools,
						disabledTools: report.disabledTools,
						permissions: report.permissions,
					},
				};
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [
						{
							type: "text" as const,
							text: `Error checking permissions: ${msg}`,
						},
					],
					isError: true,
				};
			}
		},
	);

	registerAppTool(
		server,
		"get_capabilities",
		{
			description:
				"Get the server capabilities for the current user — enabled tools, access mode, and role",
			inputSchema: {
				jwtPayload: z.record(z.string(), z.unknown()).optional(),
			},
			outputSchema: GetCapabilitiesOutputSchema.shape,
			_meta: { ui: { resourceUri: APP_URI } },
		},
		async ({
			jwtPayload,
		}): Promise<{
			content: Array<{ type: "text"; text: string }>;
			structuredContent: z.infer<typeof GetCapabilitiesOutputSchema>;
		}> => {
			const authEnabled = config.auth.enabled;
			const store = requestContextStore.getStore();
			const activeJwtPayload = jwtPayload || store?.jwtPayload;

			let isAdmin = false;
			if (authEnabled && activeJwtPayload) {
				try {
					isAdmin = extractAdminRole(
						activeJwtPayload,
						config.auth.rolesJsonPath,
						config.auth.adminRole,
					);
				} catch {
					// Not admin if extraction fails
				}
			}

			const report = await evaluatePermissions(
				k8sContext,
				defaultNamespace,
				mode,
			);

			const capabilities = {
				enabledTools: report.enabledTools,
				managedOnly: config.k8s.managedOnly,
				authEnabled,
				isAdmin,
			};

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(capabilities, null, 2),
					},
				],
				structuredContent: capabilities,
			};
		},
	);
}
