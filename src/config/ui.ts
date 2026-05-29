import { getEnv, resolveBuiltinDir } from "./helpers.js";
import type { SchemaItem } from "./types.js";

export const uiSchema = {
	enabled: {
		cli: "-",
		env: "UI_ENABLED",
		defaultVal: true,
		allowed: ["true", "false"],
		description: "Enables the embedded HTML Pod Manager UI resource.",
		get value(): boolean {
			return getEnv(this.env) !== "false";
		},
	} satisfies SchemaItem<boolean>,

	themesDir: {
		cli: "-",
		env: "THEMES_DIR",
		defaultVal: "themes",
		allowed: "Path string",
		description: "Local directory path containing custom CSS UI themes.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	themesConfigMap: {
		cli: "-",
		env: "THEMES_CONFIGMAP",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description:
			"Name of Kubernetes ConfigMap containing custom UI theme configurations.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	builtinThemesDir: {
		cli: "-",
		env: "",
		defaultVal: "",
		allowed: "Path string",
		description: "Internal directory for built-in custom UI themes.",
		get value(): string {
			return resolveBuiltinDir(import.meta.url, "themes");
		},
	} satisfies SchemaItem<string>,

	docsDir: {
		cli: "-",
		env: "DOCS_DIR",
		defaultVal: "/app/docs (Docker) or docs/.vitepress/dist (Local)",
		allowed: "Path string",
		description:
			"Base directory from which static documentation files are served.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	oauthDiscoveryUrl: {
		cli: "-",
		env: "OAUTH_DISCOVERY_URL",
		defaultVal: "",
		allowed: "URL string",
		description:
			"Discovery URL for the OAuth authorization server used by the UI client.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	oauthClientId: {
		cli: "-",
		env: "OAUTH_CLIENT_ID",
		defaultVal: "",
		allowed: "String",
		description: "OAuth client ID for UI authorization.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	oauthLoginMethod: {
		cli: "-",
		env: "OAUTH_LOGIN_METHOD",
		defaultVal: "redirect",
		allowed: ["redirect", "popup"],
		description: "Login interaction mode for UI OAuth client.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,
};

export const uiConfig = {
	get enabled() {
		return uiSchema.enabled.value;
	},
	get themesDir() {
		return uiSchema.themesDir.value;
	},
	get themesConfigMap() {
		return uiSchema.themesConfigMap.value;
	},
	get builtinThemesDir() {
		return uiSchema.builtinThemesDir.value;
	},
	get docsDir() {
		return uiSchema.docsDir.value;
	},
	get oauth() {
		return {
			get discoveryUrl() {
				return uiSchema.oauthDiscoveryUrl.value;
			},
			get clientId() {
				return uiSchema.oauthClientId.value;
			},
			get loginMethod() {
				return uiSchema.oauthLoginMethod.value;
			},
		};
	},
};
