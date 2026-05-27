#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isSource = __filename.endsWith(".ts");
const targetFile = isSource
	? join(__dirname, "server-entry.ts")
	: join(__dirname, "server-entry.js");

/**
 * Prints a helpful usage command-line guide showing all supported options
 * for running the nogoo9-no-crd CLI binary.
 */
function printHelp(): void {
	console.log(`
Usage: nocrd9 [options]

Lightweight CLI tool to configure and start the nogoo9 MCP server.

Options:
  -t, --transport <type>     Transport mode: http, stdio, both (default: http)
  -m, --mode <type>          Kubernetes access mode: cluster, namespaced (default: cluster)
  -n, --namespace <name>     Kubernetes namespace to target (default: nogoo9)
  -p, --port <number>        HTTP server port (default: 3000)
  -H, --host <hostname>      HTTP server host to bind to (default: 0.0.0.0)
  -l, --log-level <level>    Logging level: debug, info, warning, error, fatal (default: info)
  -r, --runtime <type>       JS/TS runtime engine to use: bun, deno, node (default: bun)
  --tls-cert <path>          Path to TLS certificate file for HTTPS
  --tls-key <path>           Path to TLS private key file for HTTPS
  --tls-ca <path>            Path to TLS CA certificate file for HTTPS
  --disable-permission-checks Disable Kubernetes RBAC permission checks
  --cors-origin <origin>     CORS Allowed Origin (default: *)
  --cors-methods <methods>   CORS Allowed Methods (default: GET, POST, OPTIONS)
  --cors-headers <headers>   CORS Allowed Headers (default: Content-Type, Authorization, mcp-protocol-version)
  --cors-allow-credentials   Enable CORS Access-Control-Allow-Credentials (default: false)
  --cors-expose-headers <headers> CORS Exposed Headers (default: mcp-session-id)
  --cors-max-age <seconds>   CORS Access-Control-Max-Age header
  --auth-required-read-scope <scope>  OAuth scope required for read operations
  --auth-required-write-scope <scope> OAuth scope operations require write scope
  --auth-scope-jsonpath <path>        JSONPath to extract scope claims from JWT payload (default: $.scope)
  --auth-required-read-role <role>    User role required for read operations
  --auth-required-write-role <role>   User role required for write operations
  --auth-roles-jsonpath <path>        JSONPath to extract roles from JWT payload (default: $.realm_access.roles)
  -c, --check-permissions    Run Kubernetes RBAC permissions diagnostics and exit
  -h, --help                 Show this help message
`);
}

/**
 * Entrypoint for the CLI utility. Parses process arguments, executes
 * inline RBAC permission check diagnostic commands, or spawns the main MCP server
 * process with the resolved configuration variables and runtime environment.
 */
async function main(): Promise<void> {
	let transport = "http";
	let mode = "cluster";
	let namespace = "nogoo9";
	let port = "3000";
	let host = "0.0.0.0";
	let logLevel = "info";
	let runtime = "bun";
	let tlsCert: string | undefined;
	let tlsKey: string | undefined;
	let tlsCa: string | undefined;
	let checkPermissionsOnly = false;
	let disablePermissionChecks = false;
	let corsOrigin = "*";
	let corsMethods = "GET, POST, OPTIONS";
	let corsHeaders = "Content-Type, Authorization, mcp-protocol-version";
	let corsAllowCredentials = "false";
	let corsExposeHeaders = "mcp-session-id";
	let corsMaxAge: string | undefined;
	let authRequiredReadScope: string | undefined;
	let authRequiredWriteScope: string | undefined;
	let authScopeJsonpath = "$.scope";
	let authRequiredReadRole: string | undefined;
	let authRequiredWriteRole: string | undefined;
	let authRolesJsonpath = "$.realm_access.roles";

	const args = process.argv;
	for (let i = 2; i < args.length; i++) {
		const arg = args[i];

		if (arg === "-t" || arg === "--transport") {
			const val = args[++i];
			if (!val || !["http", "stdio", "both"].includes(val)) {
				console.error(
					`Error: Invalid transport type "${val}". Must be: http, stdio, both.`,
				);
				process.exit(1);
			}
			transport = val;
		} else if (arg === "-m" || arg === "--mode") {
			const val = args[++i];
			if (!val || !["cluster", "namespaced"].includes(val)) {
				console.error(
					`Error: Invalid mode "${val}". Must be: cluster, namespaced.`,
				);
				process.exit(1);
			}
			mode = val;
		} else if (arg === "-n" || arg === "--namespace") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing namespace value.");
				process.exit(1);
			}
			namespace = val;
		} else if (arg === "-p" || arg === "--port") {
			const val = args[++i];
			if (!val || Number.isNaN(Number(val))) {
				console.error(`Error: Invalid port value "${val}".`);
				process.exit(1);
			}
			port = val;
		} else if (arg === "-H" || arg === "--host") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing host value.");
				process.exit(1);
			}
			host = val;
		} else if (arg === "-l" || arg === "--log-level") {
			const val = args[++i];
			if (
				!val ||
				!["debug", "info", "warning", "error", "fatal"].includes(val)
			) {
				console.error(
					`Error: Invalid log-level "${val}". Must be: debug, info, warning, error, fatal.`,
				);
				process.exit(1);
			}
			logLevel = val;
		} else if (arg === "-r" || arg === "--runtime") {
			const val = args[++i];
			if (!val || !["bun", "deno", "node"].includes(val)) {
				console.error(
					`Error: Invalid runtime engine "${val}". Must be: bun, deno, node.`,
				);
				process.exit(1);
			}
			runtime = val;
		} else if (arg === "--tls-cert") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --tls-cert path value.");
				process.exit(1);
			}
			tlsCert = val;
		} else if (arg === "--tls-key") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --tls-key path value.");
				process.exit(1);
			}
			tlsKey = val;
		} else if (arg === "--tls-ca") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --tls-ca path value.");
				process.exit(1);
			}
			tlsCa = val;
		} else if (arg === "-c" || arg === "--check-permissions") {
			checkPermissionsOnly = true;
		} else if (arg === "--disable-permission-checks") {
			disablePermissionChecks = true;
		} else if (arg === "--cors-origin") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --cors-origin value.");
				process.exit(1);
			}
			corsOrigin = val;
		} else if (arg === "--cors-methods") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --cors-methods value.");
				process.exit(1);
			}
			corsMethods = val;
		} else if (arg === "--cors-headers") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --cors-headers value.");
				process.exit(1);
			}
			corsHeaders = val;
		} else if (arg === "--cors-allow-credentials") {
			corsAllowCredentials = "true";
		} else if (arg === "--cors-expose-headers") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --cors-expose-headers value.");
				process.exit(1);
			}
			corsExposeHeaders = val;
		} else if (arg === "--cors-max-age") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --cors-max-age value.");
				process.exit(1);
			}
			corsMaxAge = val;
		} else if (arg === "--auth-required-read-scope") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --auth-required-read-scope value.");
				process.exit(1);
			}
			authRequiredReadScope = val;
		} else if (arg === "--auth-required-write-scope") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --auth-required-write-scope value.");
				process.exit(1);
			}
			authRequiredWriteScope = val;
		} else if (arg === "--auth-scope-jsonpath") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --auth-scope-jsonpath value.");
				process.exit(1);
			}
			authScopeJsonpath = val;
		} else if (arg === "--auth-required-read-role") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --auth-required-read-role value.");
				process.exit(1);
			}
			authRequiredReadRole = val;
		} else if (arg === "--auth-required-write-role") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --auth-required-write-role value.");
				process.exit(1);
			}
			authRequiredWriteRole = val;
		} else if (arg === "--auth-roles-jsonpath") {
			const val = args[++i];
			if (!val) {
				console.error("Error: Missing --auth-roles-jsonpath value.");
				process.exit(1);
			}
			authRolesJsonpath = val;
		} else if (arg === "-h" || arg === "--help") {
			printHelp();
			process.exit(0);
		} else {
			console.error(`Error: Unknown argument "${arg}".`);
			printHelp();
			process.exit(1);
		}
	}

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

	if (tlsCert || tlsKey || tlsCa) {
		if (!tlsCert || !tlsKey) {
			console.error(
				"Error: Both --tls-cert and --tls-key must be specified to enable HTTPS (even when using --tls-ca).",
			);
			process.exit(1);
		}
	}

	const env = {
		...process.env,
		TRANSPORT: transport,
		MODE: mode,
		NAMESPACE: namespace,
		PORT: port,
		HOST: host,
		LOG_LEVEL: logLevel,
		DISABLE_PERMISSION_CHECKS: disablePermissionChecks ? "true" : "false",
		CORS_ALLOWED_ORIGIN: corsOrigin,
		CORS_ALLOWED_METHODS: corsMethods,
		CORS_ALLOWED_HEADERS: corsHeaders,
		CORS_ALLOW_CREDENTIALS: corsAllowCredentials,
		CORS_EXPOSED_HEADERS: corsExposeHeaders,
		...(corsMaxAge ? { CORS_MAX_AGE: corsMaxAge } : {}),
		...(authRequiredReadScope
			? { AUTH_REQUIRED_READ_SCOPE: authRequiredReadScope }
			: {}),
		...(authRequiredWriteScope
			? { AUTH_REQUIRED_WRITE_SCOPE: authRequiredWriteScope }
			: {}),
		AUTH_SCOPE_JSONPATH: authScopeJsonpath,
		...(authRequiredReadRole
			? { AUTH_REQUIRED_READ_ROLE: authRequiredReadRole }
			: {}),
		...(authRequiredWriteRole
			? { AUTH_REQUIRED_WRITE_ROLE: authRequiredWriteRole }
			: {}),
		AUTH_ROLES_JSONPATH: authRolesJsonpath,
		...(tlsCert && tlsKey ? { TLS_CERT: tlsCert, TLS_KEY: tlsKey } : {}),
		...(tlsCa ? { TLS_CA: tlsCa } : {}),
	};

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
		`    Config: Host=${host}, Transport=${transport}, Mode=${mode}, Namespace=${namespace}, Port=${port}, LogLevel=${logLevel}${
			tlsCert ? ", HTTPS=enabled" : ""
		}, CORSOrigin=${corsOrigin}`,
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
