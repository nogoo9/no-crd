import {
	ANNOTATION_KEYS,
	ANNOTATION_METADATA as rawAnnotations,
} from "./annotations.js";
import { authConfig, authSchema } from "./auth.js";
import { corsConfig, corsSchema } from "./cors.js";
import { k8sConfig, k8sSchema } from "./k8s.js";
import { serverConfig, serverSchema } from "./server.js";
import { tlsConfig, tlsSchema } from "./tls.js";
import type { ConfigGroup, ConfigParam } from "./types.js";
import { uiConfig, uiSchema } from "./ui.js";

export * from "./types.js";
export { ANNOTATION_KEYS };

export const ANNOTATION_METADATA = rawAnnotations.map((item) => ({
	...item,
	key: `\`${item.key}\``,
}));

// Helper to format schema items into documentation-ready ConfigParam objects
function mapSchemaToParams(schema: Record<string, any>): ConfigParam[] {
	return Object.entries(schema)
		.filter(([_, item]) => item.env !== "") // skip internal-only fields
		.map(([_, item]) => {
			const envFormatted = Array.isArray(item.env)
				? item.env.map((e: string) => `\`${e}\``).join(", ")
				: item.env
					? `\`${item.env}\``
					: "-";

			let defaultFormatted = "-";
			if (item.defaultVal !== undefined) {
				if (item.defaultVal === "") {
					defaultFormatted = '`""`';
				} else {
					defaultFormatted = `\`${item.defaultVal}\``;
				}
			}

			let allowedFormatted = "-";
			if (item.allowed !== undefined) {
				if (Array.isArray(item.allowed)) {
					allowedFormatted = item.allowed
						.map((a: any) => `\`${a}\``)
						.join(", ");
				} else {
					allowedFormatted = String(item.allowed);
				}
			}

			let cliFormatted = "-";
			if (item.cli && item.cli !== "-") {
				cliFormatted = `\`${item.cli}\``;
			}

			return {
				cli: cliFormatted,
				env: envFormatted,
				defaultVal: defaultFormatted,
				allowed: allowedFormatted,
				description: item.description,
			};
		});
}

export const CONFIG_METADATA: ConfigGroup[] = [
	{
		title: "Server Configuration",
		emoji: "🔌",
		params: mapSchemaToParams(serverSchema),
	},
	{
		title: "TLS Configuration",
		emoji: "🔒",
		params: mapSchemaToParams(tlsSchema),
	},
	{
		title: "CORS Configuration",
		emoji: "🌐",
		params: mapSchemaToParams(corsSchema),
	},
	{
		title: "Kubernetes Configuration",
		emoji: "☸️",
		params: mapSchemaToParams(k8sSchema),
	},
	{
		title: "Authentication Configuration",
		emoji: "🔑",
		params: mapSchemaToParams(authSchema),
	},
	{
		title: "UI & Themes Configuration",
		emoji: "🖥️",
		params: mapSchemaToParams(uiSchema),
	},
];

export const config = {
	get server() {
		return serverConfig;
	},
	get tls() {
		return tlsConfig;
	},
	get cors() {
		return corsConfig;
	},
	get k8s() {
		return k8sConfig;
	},
	get auth() {
		return authConfig;
	},
	get ui() {
		return uiConfig;
	},
};
