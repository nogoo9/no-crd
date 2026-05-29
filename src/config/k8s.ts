import { getEnv, parseConfig, resolveBuiltinDir } from "./helpers.js";
import type { SchemaItem } from "./types.js";

export const k8sSchema = {
	mode: {
		cli: "-m, --mode",
		env: "MODE",
		defaultVal: "cluster" as "cluster" | "namespaced",
		allowed: ["cluster", "namespaced"],
		description:
			"Kubernetes access scope. `namespaced` locks operations to a single namespace.",
		get value(): "cluster" | "namespaced" {
			const val = getEnv(this.env);
			return (
				val === "cluster" || val === "namespaced" ? val : this.defaultVal
			) as "cluster" | "namespaced";
		},
	} satisfies SchemaItem<"cluster" | "namespaced">,

	namespace: {
		cli: "-n, --namespace",
		env: ["NAMESPACE", "DEFAULT_NAMESPACE"],
		defaultVal: "nogoo9",
		allowed: "String",
		description: "Default Kubernetes namespace for operations.",
		get value(): string {
			return getEnv(this.env) ?? "default";
		},
	} satisfies SchemaItem<string>,

	disablePermissionChecks: {
		cli: "--disable-permission-checks",
		env: "DISABLE_PERMISSION_CHECKS",
		defaultVal: false,
		allowed: ["true", "false"],
		description:
			"Disable Kubernetes RBAC permission checks and assume all tools are enabled.",
		get value(): boolean {
			return getEnv(this.env) === "true";
		},
	} satisfies SchemaItem<boolean>,

	defaultWorkspacePort: {
		cli: "--default-workspace-port",
		env: "DEFAULT_WORKSPACE_PORT",
		defaultVal: undefined as number | undefined,
		allowed: "Number",
		description:
			"Default target port inside the workspace pods to proxy traffic to.",
		get value(): number | undefined {
			const val = getEnv(this.env);
			return val ? Number(val) : undefined;
		},
	} satisfies SchemaItem<number | undefined>,

	registryUrl: {
		cli: "-",
		env: "REGISTRY_URL",
		defaultVal: undefined as string | undefined,
		allowed: "URL string",
		description:
			"Target container registry URL to query for images (e.g. `http://localhost:5001`).",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	templatesDir: {
		cli: "-",
		env: "TEMPLATES_DIR",
		defaultVal: undefined as string | undefined,
		allowed: "Path string",
		description:
			"Path to local directory containing pod template files (YAML/JSON). See [ADR-001](docs/decisions/ADR-001-template-file-format.md).",
		get value(): string {
			return getEnv(this.env) ?? "";
		},
	} satisfies SchemaItem<string | undefined>,

	builtinTemplates: {
		cli: "-",
		env: "BUILTIN_TEMPLATES",
		defaultVal: true,
		allowed: ["true", "false"],
		description:
			"Set to `false` to disable built-in templates shipped with the package.",
		get value(): boolean {
			return getEnv(this.env) !== "false";
		},
	} satisfies SchemaItem<boolean>,

	builtinTemplatesDir: {
		cli: "-",
		env: "",
		defaultVal: "",
		allowed: "Path string",
		description: "Internal directory for built-in template files.",
		get value(): string {
			return resolveBuiltinDir(import.meta.url, "templates");
		},
	} satisfies SchemaItem<string>,
};

export const k8sConfig = parseConfig(k8sSchema);
