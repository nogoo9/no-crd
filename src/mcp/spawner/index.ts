import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { K8sContext } from "~/k8s/index.js";
import { DEFAULT_NAMESPACE, PodSpecSchema } from "~/k8s/index.js";

// Re-export schemas for external consumers (e.g. templates.ts)
export { WorkspaceApiSchema } from "./types.js";
export { reconcileUpgradingWorkspaces } from "./upgrade.js";

import {
	getWorkspaceEventsHandler,
	getWorkspaceHandler,
	listWorkspacesHandler,
	spawnWorkspaceHandler,
	stopWorkspaceHandler,
	upgradeAllWorkspacesHandler,
	upgradeWorkspaceHandler,
} from "./handlers/index.js";
import {
	GetWorkspaceEventsOutputSchema,
	GetWorkspaceOutputSchema,
	ListWorkspacesOutputSchema,
	SpawnWorkspaceOutputSchema,
	StopWorkspaceOutputSchema,
	UpgradeAllWorkspacesOutputSchema,
	UpgradeWorkspaceOutputSchema,
} from "./types.js";

const APP_URI = "ui://nogoo9/app";
const UI_META = { ui: { resourceUri: APP_URI } } as const;

/**
 * Registers workspace management tools (the Spawner subsystem) with the MCP Server.
 * Registered tools:
 * - `list_workspaces`: Lists active agent workspaces (pods labeled nogoo9/type=workspace).
 * - `stop_workspace`: Deletes/terminates a workspace pod.
 * - `spawn_workspace`: Configures and deploys a workspace pod using templates/spec with annotations.
 * - `get_workspace`: Fetch details of a single workspace by ID.
 * - `get_workspace_events`: Fetch event logs of a workspace by ID.
 * - `upgrade_workspace`: Upgrade a workspace to the latest version.
 * - `upgrade_all_workspaces`: Upgrade all outdated workspaces.
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
			listWorkspacesHandler(k8sContext),
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
			getWorkspaceHandler(k8sContext),
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
			stopWorkspaceHandler(k8sContext),
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
			spawnWorkspaceHandler(k8sContext),
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
			getWorkspaceEventsHandler(k8sContext),
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
			upgradeWorkspaceHandler(k8sContext),
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
			upgradeAllWorkspacesHandler(k8sContext),
		);
	}
}
