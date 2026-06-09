import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getLogger } from "@logtape/logtape";
import {
	RESOURCE_MIME_TYPE,
	registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { config } from "~/config/index.js";

const logger = getLogger(["nogoo9", "ui"]);

const APP_URI = "ui://nogoo9/app";
const UI_ENABLED = config.ui.enabled;

/**
 * Reads the HTML interface bundle from the build target directory.
 * If the asset is missing or not yet built, returns a fallback error UI.
 *
 * @param distDir Path to the directory where static build assets are located.
 * @returns Serialized HTML application payload.
 */
export function loadUiHtml(distDir: string, basePrefix = ""): string {
	const htmlPath = join(distDir, "ui", "index.html");
	try {
		logger.debug("Loading UI HTML index page from {htmlPath}", { htmlPath });
		let html = readFileSync(htmlPath, "utf-8");
		const oauthScopes = config.auth.oauthScopes.split(/\s+/).filter(Boolean);
		const readScope = config.auth.requiredReadScope;
		const writeScope = config.auth.requiredWriteScope;
		if (readScope && !oauthScopes.includes(readScope)) {
			oauthScopes.push(readScope);
		}
		if (writeScope && !oauthScopes.includes(writeScope)) {
			oauthScopes.push(writeScope);
		}
		const oauthConfig = {
			discoveryUrl: config.ui.oauth.discoveryUrl,
			clientId: config.ui.oauth.clientId,
			loginMethod: config.ui.oauth.loginMethod,
			scopes: oauthScopes,
			authorizationUrl: config.ui.oauth.authorizationUrl,
			tokenUrl: config.ui.oauth.tokenUrl,
			endSessionUrl: config.ui.oauth.endSessionUrl,
			subJsonPath: config.auth.subJsonPath,
		};
		const uiConfig = {
			title: config.ui.title,
			subtitle: config.ui.subtitle,
		};
		const configScript = `<script>
window.__NOCR_BASE_URL__ = ${JSON.stringify(basePrefix)};
window.__NOCR_OAUTH_CONFIG__ = ${JSON.stringify(oauthConfig)};
window.__NOCR_UI_CONFIG__ = ${JSON.stringify(uiConfig)};
</script>`;
		html = html.replace("<head>", `<head>${configScript}`);
		html = html.replace(
			/<title>[^<]*<\/title>/i,
			`<title>${config.ui.title}</title>`,
		);
		return html;
	} catch (err) {
		logger.warn("Could not load UI HTML asset: {error}", { error: err });
		return `<!DOCTYPE html><html><body><p>UI not built. Run: bun run build</p></body></html>`;
	}
}

/**
 * Reads the Error HTML template, injects base URL configurations, and returns it.
 */
export function loadErrorHtml(distDir: string, basePrefix = ""): string {
	const htmlPath = join(distDir, "ui", "error.html");
	try {
		logger.debug("Loading Error HTML page from {htmlPath}", { htmlPath });
		let html = readFileSync(htmlPath, "utf-8");
		const configScript = `<script>
window.__NOCR_BASE_URL__ = ${JSON.stringify(basePrefix)};
</script>`;
		html = html.replace("<head>", `<head>${configScript}`);
		return html;
	} catch (err) {
		logger.warn("Could not load Error HTML asset: {error}", { error: err });
		return `<!DOCTYPE html><html><body><h1>Error</h1><p>An error occurred, and the error UI template could not be loaded.</p></body></html>`;
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
