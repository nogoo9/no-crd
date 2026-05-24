import { getLogger } from "@logtape/logtape";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	DEFAULT_NAMESPACE,
	evaluatePermissions,
	type K8sContext,
	MODE,
} from "~/k8s/index.js";
import { registerNamespaceTools } from "~/mcp/namespace.js";
import { registerPodTools } from "~/mcp/pods.js";
import { registerSpawnerTools } from "~/mcp/spawner.js";
import { registerTemplateResources } from "~/mcp/templates.js";

const logger = getLogger(["nogoo9", "mcp-server"]);

/**
 * Creates and configures a fresh instance of the Model Context Protocol (MCP) server.
 * Instantiates the SDK server, runs RBAC diagnostics on Kubernetes, and conditionally
 * registers pod tools, template resources, namespace tools, and workspace spawner tools.
 *
 * @param k8sContext Active K8sContext containing API clients.
 * @returns Instantiated and registered McpServer instance.
 */
export async function createMcpServer(
	k8sContext: K8sContext,
): Promise<McpServer> {
	logger.info("Initializing MCP Server...");
	const server = new McpServer({ name: "nogoo9", version: "0.1.1" });
	const report = await evaluatePermissions(k8sContext, DEFAULT_NAMESPACE, MODE);

	logger.info("Registering MCP tools and resources...");
	registerPodTools(server, k8sContext, report.enabledTools);
	registerTemplateResources(server, k8sContext, report.enabledTools);
	registerNamespaceTools(server, k8sContext, DEFAULT_NAMESPACE, MODE);
	registerSpawnerTools(server, k8sContext, report.enabledTools);

	logger.info("MCP Server created and configured successfully.");
	return server;
}
