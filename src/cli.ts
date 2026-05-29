#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authSchema } from "./config/auth.js";
import { corsSchema } from "./config/cors.js";
import { k8sSchema } from "./config/k8s.js";
import { serverSchema } from "./config/server.js";
import { tlsSchema } from "./config/tls.js";
import { uiSchema } from "./config/ui.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isSource = __filename.endsWith(".ts");
const targetFile = isSource
	? join(__dirname, "server-entry.ts")
	: join(__dirname, "server-entry.js");

function getCliSuffix(schemaKey: string, allowed: any): string {
	if (schemaKey === "namespace") return " <name>";
	if (schemaKey === "host") return " <hostname>";
	if (schemaKey === "logLevel") return " <level>";
	if (allowed === "Number" || schemaKey === "port") return " <number>";
	if (
		schemaKey.toLowerCase().includes("path") ||
		schemaKey.toLowerCase().includes("cert") ||
		schemaKey.toLowerCase().includes("key") ||
		schemaKey.toLowerCase().includes("ca")
	)
		return " <path>";
	if (schemaKey.toLowerCase().includes("scope")) return " <scope>";
	if (schemaKey.toLowerCase().includes("role")) return " <role>";
	if (schemaKey.toLowerCase().includes("origin")) return " <origin>";
	if (schemaKey.toLowerCase().includes("methods")) return " <methods>";
	if (schemaKey.toLowerCase().includes("headers")) return " <headers>";
	if (
		schemaKey.toLowerCase().includes("seconds") ||
		schemaKey.toLowerCase().includes("age") ||
		schemaKey === "maxAge"
	)
		return " <seconds>";
	return " <type>";
}

/**
 * Prints a helpful usage command-line guide showing all supported options
 * for running the nogoo9-no-crd CLI binary.
 */
function printHelp(): void {
	console.log(`Usage: nocrd9 [options]

Lightweight CLI tool to configure and start the nogoo9 MCP server.

Options:`);

	const schemas = [
		serverSchema,
		tlsSchema,
		corsSchema,
		k8sSchema,
		authSchema,
		uiSchema,
	];
	for (const schema of schemas) {
		for (const [schemaKey, item] of Object.entries(schema)) {
			if (item.cli && item.cli !== "-") {
				const suffix =
					typeof item.defaultVal === "boolean"
						? ""
						: getCliSuffix(schemaKey, item.allowed);
				const defaultStr =
					item.defaultVal !== undefined ? ` (default: ${item.defaultVal})` : "";
				const cliStr = `  ${item.cli}${suffix}`;
				const cleanDesc = item.description.replace(/`/g, "");
				console.log(`${cliStr.padEnd(29)} ${cleanDesc}${defaultStr}`);
			}
		}
	}

	console.log(
		`${"  -r, --runtime <type>".padEnd(29)} JS/TS runtime engine to use: bun, deno, node (default: bun)`,
	);
	console.log(
		`${"  -c, --check-permissions".padEnd(29)} Run Kubernetes RBAC permissions diagnostics and exit`,
	);
	console.log(`${"  -h, --help".padEnd(29)} Show this help message`);
}

/**
 * Entrypoint for the CLI utility. Parses process arguments, executes
 * inline RBAC permission check diagnostic commands, or spawns the main MCP server
 * process with the resolved configuration variables and runtime environment.
 */
async function main(): Promise<void> {
	const schemas = [
		serverSchema,
		tlsSchema,
		corsSchema,
		k8sSchema,
		authSchema,
		uiSchema,
	];
	const cliFlagsMap = new Map<string, { schemaKey: string; item: any }>();
	const resolvedValues = new Map<string, any>();

	// Initialize with defaults and process.env overrides
	for (const schema of schemas) {
		for (const [schemaKey, item] of Object.entries(schema)) {
			if (!item.env) continue;
			const envKeys = Array.isArray(item.env) ? item.env : [item.env];
			const primaryEnvKey = envKeys[0];
			if (!primaryEnvKey) continue;

			// Priority 1: process.env
			let val: any;
			for (const envKey of envKeys) {
				if (process.env[envKey] !== undefined) {
					val = process.env[envKey];
				}
			}

			// Priority 2: schema defaultVal
			if (val === undefined) {
				val = item.defaultVal;
			}

			resolvedValues.set(primaryEnvKey, val);

			// Map CLI flags
			if (item.cli && item.cli !== "-") {
				const flags = item.cli.split(",").map((f: string) => f.trim());
				for (const flag of flags) {
					cliFlagsMap.set(flag, { schemaKey, item });
				}
			}
		}
	}

	let runtime = "bun";
	let checkPermissionsOnly = false;

	const args = process.argv;
	for (let i = 2; i < args.length; i++) {
		const arg = args[i];

		if (arg === "-c" || arg === "--check-permissions") {
			checkPermissionsOnly = true;
		} else if (arg === "-r" || arg === "--runtime") {
			const val = args[++i];
			if (!val || !["bun", "deno", "node"].includes(val)) {
				console.error(
					`Error: Invalid runtime engine "${val}". Must be: bun, deno, node.`,
				);
				process.exit(1);
			}
			runtime = val;
		} else if (arg === "-h" || arg === "--help") {
			printHelp();
			process.exit(0);
		} else {
			const matched = cliFlagsMap.get(arg);
			if (matched) {
				const { item } = matched;
				const envKeys = Array.isArray(item.env) ? item.env : [item.env];
				const primaryEnvKey = envKeys[0];

				if (typeof item.defaultVal === "boolean") {
					resolvedValues.set(primaryEnvKey, true);
				} else {
					const val = args[++i];
					if (val === undefined) {
						console.error(`Error: Missing value for argument "${arg}".`);
						process.exit(1);
					}
					// Validate allowed values if specified as an array
					if (Array.isArray(item.allowed)) {
						if (!item.allowed.includes(val)) {
							console.error(
								`Error: Invalid value "${val}" for ${arg}. Must be one of: ${item.allowed.join(", ")}.`,
							);
							process.exit(1);
						}
					} else if (item.allowed === "Number") {
						if (Number.isNaN(Number(val))) {
							console.error(
								`Error: Invalid numeric value "${val}" for ${arg}.`,
							);
							process.exit(1);
						}
					}
					resolvedValues.set(primaryEnvKey, val);
				}
			} else {
				console.error(`Error: Unknown argument "${arg}".`);
				printHelp();
				process.exit(1);
			}
		}
	}

	const mode = resolvedValues.get("MODE");
	const namespace = resolvedValues.get("NAMESPACE");

	if (checkPermissionsOnly) {
		console.log(`==> Running Kubernetes RBAC permission diagnostics...`);
		console.log(`    Access Mode: ${mode}`);
		console.log(`    Namespace  : ${namespace}`);
		console.log(
			"--------------------------------------------------------------------------------",
		);
		try {
			const { evaluatePermissions, initK8sContext } = await import(
				"~/k8s/index.js"
			);
			const k8sContext = initK8sContext();
			const report = await evaluatePermissions(k8sContext, namespace, mode);

			console.log("\n--- RBAC Permissions Check ---");
			for (const [res, verbs] of Object.entries(report.permissions)) {
				for (const [verb, allowed] of Object.entries(verbs)) {
					console.log(
						`  ${res.padEnd(20)} ${verb.padEnd(10)} [${allowed ? "✔ ALLOWED" : "❌ DENIED"}]`,
					);
				}
			}

			console.log("\n--- MCP Tools Availability ---");
			for (const tool of report.enabledTools) {
				console.log(`  ${tool.padEnd(30)} [✔ ENABLED]`);
			}
			for (const tool of report.disabledTools) {
				console.log(
					`  ${tool.padEnd(30)} [❌ DISABLED] (missing RBAC permissions)`,
				);
			}

			console.log("\nDiagnostics completed successfully.");
			process.exit(0);
		} catch (err) {
			console.error("\nError during diagnostics:", err);
			process.exit(1);
		}
	}

	if (!existsSync(targetFile)) {
		console.error(`Error: Target entrypoint file not found: ${targetFile}`);
		process.exit(1);
	}

	const tlsCert = resolvedValues.get("TLS_CERT");
	const tlsKey = resolvedValues.get("TLS_KEY");
	const tlsCa = resolvedValues.get("TLS_CA");

	if (tlsCert || tlsKey || tlsCa) {
		if (!tlsCert || !tlsKey) {
			console.error(
				"Error: Both --tls-cert and --tls-key must be specified to enable HTTPS (even when using --tls-ca).",
			);
			process.exit(1);
		}
	}

	const env: Record<string, string | undefined> = {
		...process.env,
	};

	for (const [key, value] of resolvedValues.entries()) {
		if (value !== undefined && value !== null) {
			if (typeof value === "boolean") {
				env[key] = value ? "true" : "false";
			} else {
				env[key] = String(value);
			}
		}
	}

	let runCmd = "";
	let runArgs: string[] = [];

	if (runtime === "bun") {
		runCmd = "bun";
		runArgs = isSource ? ["run", targetFile] : [targetFile];
	} else if (runtime === "deno") {
		runCmd = "deno";
		runArgs = ["run", "--allow-all", targetFile];
	} else if (runtime === "node") {
		if (isSource) {
			runCmd = "npx";
			runArgs = ["tsx", targetFile];
		} else {
			runCmd = "node";
			runArgs = [targetFile];
		}
	}

	console.error(`==> Starting MCP server via ${runtime}...`);
	console.error(
		`    Config: Host=${env.HOST ?? "0.0.0.0"}, Transport=${env.TRANSPORT ?? "http"}, Mode=${env.MODE ?? "cluster"}, Namespace=${env.NAMESPACE ?? "nogoo9"}, Port=${env.PORT ?? "3000"}, LogLevel=${env.LOG_LEVEL ?? "info"}${
			env.TLS_CERT ? ", HTTPS=enabled" : ""
		}, CORSOrigin=${env.CORS_ALLOWED_ORIGIN ?? "*"}`,
	);
	console.error(`    Command: ${runCmd} ${runArgs.join(" ")}`);
	console.error(
		"--------------------------------------------------------------------------------",
	);

	const child = spawn(runCmd, runArgs, {
		env,
		stdio: "inherit",
	});

	child.on("exit", (code) => {
		process.exit(code ?? 0);
	});
}

main().catch((err) => {
	console.error("CLI failure:", err);
	process.exit(1);
});
