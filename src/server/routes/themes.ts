import path from "node:path";
import type { FastifyInstance } from "fastify";
import { config } from "~/config/index.js";
import {
	readThemeCssFile,
	scanThemeDir,
	setCorsHeaders,
	themeDisplayName,
} from "~/server/helpers.js";
import type { RouteDeps } from "./index.js";

export function registerThemesRoutes(
	api: FastifyInstance,
	deps: RouteDeps,
): void {
	api.get("/api/themes", async (_request, reply) => {
		setCorsHeaders(reply);
		try {
			const themes: Array<{ id: string; name: string }> = [
				{ id: "default", name: "Claude" },
			];

			// Source 1: ConfigMap (highest priority)
			const themesConfigMap = config.ui.themesConfigMap;
			if (themesConfigMap) {
				try {
					const k8sCtx = deps.getK8sContext();
					const ns = config.k8s.namespace;
					const cm = await k8sCtx.coreApi.readNamespacedConfigMap({
						name: themesConfigMap,
						namespace: ns,
					});
					const data = cm.data || {};
					for (const [file, content] of Object.entries(data)) {
						if (file.endsWith(".css")) {
							const id = file.slice(0, -4);
							themes.push({
								id,
								name: themeDisplayName(id, content as string | undefined),
							});
						}
					}
					return themes;
				} catch (_) {}
			}

			const seenIds = new Set(themes.map((t) => t.id));

			// Source 2: Custom themes directory
			const themesDir = config.ui.themesDir;
			const resolvedDir = path.normalize(
				path.isAbsolute(themesDir)
					? themesDir
					: path.join(process.cwd(), themesDir),
			);
			scanThemeDir(resolvedDir, seenIds, themes);

			// Source 3: Built-in themes (lowest priority)
			const builtinDir = config.ui.builtinThemesDir;
			if (builtinDir) {
				scanThemeDir(builtinDir, seenIds, themes);
			}

			return themes;
		} catch (err) {
			reply.status(500);
			return { error: err instanceof Error ? err.message : String(err) };
		}
	});

	api.get("/api/themes/:themeId", async (request, reply) => {
		setCorsHeaders(reply);

		const { themeId } = request.params as { themeId: string };
		const id = themeId.endsWith(".css") ? themeId.slice(0, -4) : themeId;

		if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
			reply.status(400);
			return reply.send("Invalid theme ID");
		}

		if (id === "default") {
			reply.type("text/css; charset=utf-8");
			return reply.send("");
		}

		try {
			// Source 1: ConfigMap
			const themesConfigMap = config.ui.themesConfigMap;
			if (themesConfigMap) {
				try {
					const k8sCtx = deps.getK8sContext();
					const ns = config.k8s.namespace;
					const cm = await k8sCtx.coreApi.readNamespacedConfigMap({
						name: themesConfigMap,
						namespace: ns,
					});
					const dataMap = new Map(Object.entries(cm.data || {}));
					const content = dataMap.get(`${id}.css`);
					if (content !== undefined) {
						reply.type("text/css; charset=utf-8");
						return reply.send(content);
					}
				} catch (_) {}
			}

			// Source 2: Custom themes directory
			const cssContent = readThemeCssFile(config.ui.themesDir, id);
			if (cssContent !== null) {
				reply.type("text/css; charset=utf-8");
				return reply.send(cssContent);
			}

			// Source 3: Built-in themes
			const builtinDir = config.ui.builtinThemesDir;
			if (builtinDir) {
				const builtinContent = readThemeCssFile(builtinDir, id);
				if (builtinContent !== null) {
					reply.type("text/css; charset=utf-8");
					return reply.send(builtinContent);
				}
			}

			reply.status(404);
			return reply.send("Theme not found");
		} catch (err) {
			reply.status(500);
			return reply.send(err instanceof Error ? err.message : String(err));
		}
	});
}
