import { getEnv, parseConfig } from "./helpers.js";
import type { SchemaItem } from "./types.js";

export const corsSchema = {
	origin: {
		cli: "--cors-origin",
		env: ["CORS_ALLOWED_ORIGIN", "CORS_ORIGIN"],
		defaultVal: "*",
		allowed: "String",
		description: "CORS Allowed Origin header.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	methods: {
		cli: "--cors-methods",
		env: ["CORS_ALLOWED_METHODS", "CORS_METHODS"],
		defaultVal: "GET, POST, OPTIONS",
		allowed: "String",
		description: "CORS Allowed Methods header.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	headers: {
		cli: "--cors-headers",
		env: ["CORS_ALLOWED_HEADERS", "CORS_HEADERS"],
		defaultVal:
			"Content-Type, Authorization, mcp-protocol-version, mcp-session-id",
		allowed: "String",
		description: "CORS Allowed Headers header.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	credentials: {
		cli: "--cors-allow-credentials",
		env: ["CORS_ALLOW_CREDENTIALS", "CORS_CREDENTIALS"],
		defaultVal: false,
		allowed: ["true", "false"],
		description: "Enable CORS Access-Control-Allow-Credentials header.",
		get value(): boolean {
			const val = getEnv(this.env);
			return val === "true";
		},
	} satisfies SchemaItem<boolean>,

	exposedHeaders: {
		cli: "--cors-expose-headers",
		env: ["CORS_EXPOSED_HEADERS", "CORS_EXPOSED"],
		defaultVal: "mcp-session-id",
		allowed: "String",
		description: "Custom CORS Access-Control-Expose-Headers header.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	maxAge: {
		cli: "--cors-max-age",
		env: "CORS_MAX_AGE",
		defaultVal: undefined as number | undefined,
		allowed: "Number",
		description: "Custom CORS Access-Control-Max-Age header in seconds.",
		get value(): number | undefined {
			const val = getEnv(this.env);
			return val ? Number(val) : undefined;
		},
	} satisfies SchemaItem<number | undefined>,
};

export const corsConfig = parseConfig(corsSchema);
