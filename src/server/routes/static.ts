import fs from "node:fs";
import path, { join } from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "~/config/index.js";
import {
	CORS_HEADERS,
	getBasePrefix,
	setCorsHeaders,
} from "~/server/helpers.js";
import { loadUiHtml } from "~/ui/index.js";
import type { RouteDeps } from "./index.js";

export async function registerStaticRoutes(
	api: FastifyInstance,
	deps: RouteDeps,
): Promise<void> {
	const basePrefix = getBasePrefix();

	// Static Web UI templates and assets
	const uiDir = join(deps.distDir, "ui");
	await api.register(fastifyStatic, {
		root: uiDir,
		prefix: "/ui/",
		name: "ui",
		index: false,
		decorateReply: false,
		setHeaders: (res: any) => {
			for (const [k, v] of Object.entries(CORS_HEADERS)) {
				res.setHeader(k, v);
			}
		},
	} as any);

	const uiHtmlHandler = async (
		_request: FastifyRequest,
		reply: FastifyReply,
	) => {
		try {
			const html = loadUiHtml(deps.distDir, basePrefix);
			reply.type("text/html; charset=utf-8");
			setCorsHeaders(reply);
			return reply.send(html);
		} catch (err) {
			reply.status(500);
			setCorsHeaders(reply);
			return reply.send(err instanceof Error ? err.message : String(err));
		}
	};

	api.get("/", uiHtmlHandler);
	api.get("/ui", uiHtmlHandler);
	api.get("/ui/", uiHtmlHandler);

	// Static documentation site
	const docsEnvDir = config.ui.docsDir;
	let docsDir = "";
	if (docsEnvDir) {
		docsDir = path.normalize(
			path.isAbsolute(docsEnvDir)
				? docsEnvDir
				: path.join(process.cwd(), docsEnvDir),
		);
	} else {
		const localDocs = path.normalize(
			path.join(process.cwd(), "docs/.vitepress/dist"),
		);
		const binaryDocs = path.normalize(path.join(deps.distDir, "docs"));
		if (fs.existsSync(binaryDocs)) {
			docsDir = binaryDocs;
		} else if (fs.existsSync(localDocs)) {
			docsDir = localDocs;
		} else {
			docsDir = path.normalize(path.join(process.cwd(), "docs"));
		}
	}

	await api.register(fastifyStatic, {
		root: docsDir,
		prefix: "/docs/",
		name: "docs",
		extensions: ["html"],
		index: "index.html",
		decorateReply: false,
		setHeaders: (res: any) => {
			for (const [k, v] of Object.entries(CORS_HEADERS)) {
				res.setHeader(k, v);
			}
		},
	} as any);

	api.get("/docs", async (_request, reply) => {
		return reply.redirect(`${basePrefix}/docs/`);
	});
}
