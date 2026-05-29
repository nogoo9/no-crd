import { getEnv, parseConfig } from "./helpers.js";
import type { SchemaItem } from "./types.js";

export const serverSchema = {
	transport: {
		cli: "-t, --transport",
		env: "TRANSPORT",
		defaultVal: "http",
		allowed: ["http", "stdio", "both"],
		description:
			"Server transport mode. `both` fires up both transports simultaneously.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	port: {
		cli: "-p, --port",
		env: "PORT",
		defaultVal: 3000,
		allowed: "Number",
		description: "HTTP server port for SSE transport.",
		get value(): number {
			const val = getEnv(this.env);
			return val ? Number(val) : this.defaultVal;
		},
	} satisfies SchemaItem<number>,

	host: {
		cli: "-H, --host",
		env: "HOST",
		defaultVal: "0.0.0.0",
		allowed: "String",
		description: "Host interface to bind the HTTP/SSE server to.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	baseUrl: {
		cli: "--base-url",
		env: "BASE_URL",
		defaultVal: "",
		allowed: "Path string",
		description:
			"Base URL path prefix for hosting behind a reverse proxy (e.g. `/gateway/no-crd`).",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	stateless: {
		cli: "-",
		env: "STATELESS",
		defaultVal: false,
		allowed: ["true", "false"],
		description: "Enable stateless request handling (no session affinity).",
		get value(): boolean {
			return getEnv(this.env) === "true";
		},
	} satisfies SchemaItem<boolean>,

	logLevel: {
		cli: "-l, --log-level",
		env: "LOG_LEVEL",
		defaultVal: "info",
		allowed: ["debug", "info", "warning", "error", "fatal"],
		description: "Logging verbosity filter.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	logFile: {
		cli: "-",
		env: "LOG_FILE",
		defaultVal: "nogoo9-mcp.log",
		allowed: "String",
		description: "Output file path for file logging.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,
};

export const serverConfig = parseConfig(serverSchema);
