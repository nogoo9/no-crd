import "~/polyfill.js";

// Re-export everything from Kubernetes client modules
export * from "./k8s/index.js";
export { registerNamespaceTools } from "./mcp/namespace.js";
export { registerPodTools } from "./mcp/pods.js";
// Re-export main MCP and HTTP server creation factory functions
export { createMcpServer } from "./mcp/server.js";
// Re-export MCP tool registration helpers
export { registerSpawnerTools } from "./mcp/spawner.js";
export { registerTemplateResources } from "./mcp/templates.js";
export {
	handleWebRequest,
	resetMcpServer,
	startHttpServer,
} from "./server/index.js";

// Re-export Embedded UI registration utilities
export { loadUiHtml, registerUiApp } from "./ui/index.js";
