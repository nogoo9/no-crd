#!/usr/bin/env bun
import "~/polyfill.js";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
	configure,
	getConsoleSink,
	getLogger,
	getStreamSink,
} from "@logtape/logtape";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initK8sContext } from "~/k8s/index.js";
import { createMcpServer } from "~/mcp/server.js";
import { startHttpServer } from "~/server.js";
import { registerUiApp } from "~/ui/index.js";
import { config } from "./config.js";

const TRANSPORT = config.server.transport;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = __filename.endsWith(".ts")
	? join(__dirname, "../dist")
	: __dirname;

const validLevels = ["debug", "info", "warning", "error", "fatal"] as const;
type LogLevel = (typeof validLevels)[number];

/**
 * Returns the LogTape logging level configured in the process environment.
 * Maps 'warn' to 'warning' and defaults to 'info' if invalid or missing.
 *
 * @returns Resolves to a valid LogLevel.
 */
function getLogLevel(): LogLevel {
	const raw = config.server.logLevel.toLowerCase();
	if (raw === "warn") return "warning";
	if (validLevels.includes(raw as any)) {
		return raw as LogLevel;
	}
	return "info";
}

const logger = getLogger(["nogoo9", "main"]);

/**
 * Application entrypoint. Configures global LogTape logging sinks,
 * boots the target server transport interface (stdio, http, or both),
 * and hooks SIGTERM exit handlers.
 */
async function main(): Promise<void> {
	const isStdio = TRANSPORT === "stdio" || TRANSPORT === "both";

	if (isStdio) {
		// Override global console methods to prevent stdio pollution
		console.log = () => {};
		console.info = () => {};
		console.warn = () => {};
		console.error = () => {};
	}

	const logFile = config.server.logFile;
	const fileStream = createWriteStream(logFile, { flags: "a" });
	const webStream = Writable.toWeb(fileStream);

	await configure({
		sinks: {
			console: getConsoleSink(),
			file: getStreamSink(webStream),
		},
		filters: {},
		loggers: [
			{
				category: ["nogoo9"],
				lowestLevel: getLogLevel(),
				sinks: [isStdio ? "file" : "console"],
			},
			{
				category: ["logtape", "meta"],
				lowestLevel: "warning",
				sinks: [isStdio ? "file" : "console"],
			},
		],
	});

	logger.info("Initializing nogoo9-mcp. Transport: {transport}", {
		transport: TRANSPORT,
	});

	if (TRANSPORT === "stdio") {
		const server = await createMcpServer(initK8sContext());
		registerUiApp(server, DIST_DIR);
		const transport = new StdioServerTransport();
		await server.connect(transport);

		const cleanup = async () => {
			await server.close();
		};

		const Deno = (
			globalThis as unknown as {
				Deno?: {
					addSignalListener?: (sig: string, cb: () => void) => void;
					exit?: (code: number) => void;
				};
			}
		).Deno;
		if (typeof process !== "undefined" && typeof process.on === "function") {
			process.on("SIGTERM", () => {
				void cleanup().then(() => process.exit(0));
			});
		} else if (
			Deno &&
			typeof Deno.addSignalListener === "function" &&
			typeof Deno.exit === "function"
		) {
			Deno.addSignalListener("SIGTERM", () => {
				void cleanup().then(() => Deno.exit?.(0));
			});
		}
		return;
	}

	if (TRANSPORT === "both") {
		const k8sCtx = initK8sContext();
		void startHttpServer(k8sCtx);
		const server = await createMcpServer(k8sCtx);
		registerUiApp(server, DIST_DIR);
		const transport = new StdioServerTransport();
		await server.connect(transport);
		return;
	}

	await startHttpServer(initK8sContext());
}

main().catch((err: unknown) => {
	try {
		logger.fatal("Application error: {error}", { error: err });
	} catch (_) {
		console.error(err);
	}
	const Deno = (
		globalThis as unknown as { Deno?: { exit?: (code: number) => void } }
	).Deno;
	if (typeof process !== "undefined" && typeof process.exit === "function") {
		process.exit(1);
	} else if (Deno && typeof Deno.exit === "function") {
		Deno.exit(1);
	}
});
