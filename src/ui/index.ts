import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getLogger } from "@logtape/logtape";
import {
	RESOURCE_MIME_TYPE,
	registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const logger = getLogger(["nogoo9", "ui"]);

const APP_URI = "ui://nogoo9/app";
const UI_ENABLED = process.env.UI_ENABLED !== "false";

/**
 * Reads the HTML interface bundle from the build target directory.
 * If the asset is missing or not yet built, returns a fallback error UI.
 *
 * @param distDir Path to the directory where static build assets are located.
 * @returns Serialized HTML application payload.
 */
export function loadUiHtml(distDir: string): string {
	const htmlPath = join(distDir, "ui", "index.html");
	try {
		logger.debug("Loading UI HTML index page from {htmlPath}", { htmlPath });
		return readFileSync(htmlPath, "utf-8");
	} catch (err) {
		logger.warn("Could not load UI HTML asset: {error}", { error: err });
		return `<!DOCTYPE html><html><body><p>UI not built. Run: moon run web:build</p></body></html>`;
	}
}

/**
 * Registers the Model Context Protocol application resource containing the HTML UI.
 * This makes the Pod Manager user interface available under `ui://nogoo9/app`.
 *
 * @param server Active McpServer instance.
 * @param distDir Directory path containing the compiled frontend index.html.
 */
export function registerUiApp(server: McpServer, distDir: string): void {
	if (!UI_ENABLED) {
		logger.info(
			"UI registration is disabled via environment variable (UI_ENABLED=false).",
		);
		return;
	}

	logger.info(
		"Registering UI Application resource at URI {uri} (distDir: {distDir})",
		{
			uri: APP_URI,
			distDir,
		},
	);

	registerAppResource(
		server,
		"nogoo9 Pod Manager",
		APP_URI,
		{
			description:
				"Kubernetes pod management IDE — browse pods, manage templates, chat with AI",
		},
		async () => {
			logger.debug("Serving UI Application resource at URI {uri}", {
				uri: APP_URI,
			});
			return {
				contents: [
					{
						uri: APP_URI,
						mimeType: RESOURCE_MIME_TYPE,
						text: loadUiHtml(distDir),
					},
				],
			};
		},
	);
}
