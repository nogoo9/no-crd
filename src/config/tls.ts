import { getEnv, parseConfig } from "./helpers.js";
import type { SchemaItem } from "./types.js";

export const tlsSchema = {
	cert: {
		cli: "--tls-cert",
		env: "TLS_CERT",
		defaultVal: undefined as string | undefined,
		allowed: "Path string",
		description: "Path to TLS certificate file to enable HTTPS.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	key: {
		cli: "--tls-key",
		env: "TLS_KEY",
		defaultVal: undefined as string | undefined,
		allowed: "Path string",
		description: "Path to TLS private key file to enable HTTPS.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	ca: {
		cli: "--tls-ca",
		env: "TLS_CA",
		defaultVal: undefined as string | undefined,
		allowed: "Path string",
		description:
			"Path to TLS CA certificate file for HTTPS client/verification.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	rejectUnauthorized: {
		cli: "-",
		env: "NODE_TLS_REJECT_UNAUTHORIZED",
		defaultVal: true,
		allowed: ["0 (false)", "1 (true)"],
		description:
			"Set to `0` to bypass TLS verification (for development/testing only).",
		get value(): boolean {
			return getEnv(this.env) !== "0";
		},
	} satisfies SchemaItem<boolean>,
};

export const tlsConfig = parseConfig(tlsSchema);
