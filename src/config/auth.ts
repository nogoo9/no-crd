import { getEnv, parseConfig } from "./helpers.js";
import type { SchemaItem } from "./types.js";

export const authSchema = {
	enabled: {
		cli: "--auth-enabled",
		env: "AUTH_ENABLED",
		defaultVal: false,
		allowed: ["true", "false"],
		description:
			"Enables JWT token authentication on MCP tools and route proxy.",
		get value(): boolean {
			return getEnv(this.env) === "true";
		},
	} satisfies SchemaItem<boolean>,

	verificationRequired: {
		cli: "-",
		env: "JWT_VERIFICATION_REQUIRED",
		defaultVal: true,
		allowed: ["true", "false"],
		description:
			"Enable/disable JWT signature verification (signature checks).",
		get value(): boolean {
			return getEnv(this.env) !== "false";
		},
	} satisfies SchemaItem<boolean>,

	secret: {
		cli: "-",
		env: "JWT_SECRET",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description: "Symmetric HMAC-SHA256 secret for token verification.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	publicKey: {
		cli: "-",
		env: "JWT_PUBLIC_KEY",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description:
			"PEM encoded RSA/ECDSA public key for asymmetric token verification.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	jwksUri: {
		cli: "-",
		env: "JWKS_URI",
		defaultVal: undefined as string | undefined,
		allowed: "URL string",
		description:
			"Remote JWKS endpoint URL to dynamically retrieve verification keys.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	introspectionEndpoint: {
		cli: "-",
		env: ["INTROSPECTION_ENDPOINT", "JWT_INTROSPECTION_ENDPOINT"],
		defaultVal: undefined as string | undefined,
		allowed: "URL string",
		description: "Endpoint for token introspection/validation.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	clientId: {
		cli: "-",
		env: "OAUTH_CLIENT_ID",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description: "OAuth client ID for auth configuration.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	clientSecret: {
		cli: "-",
		env: "OAUTH_CLIENT_SECRET",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description: "OAuth client secret for auth configuration.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	audience: {
		cli: "-",
		env: "JWT_AUDIENCE",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description:
			"Expected token audience. Falls back to `OAUTH_CLIENT_ID` if set.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	issuer: {
		cli: "-",
		env: ["AUTH_ISSUER", "JWT_ISSUER"],
		defaultVal: "",
		allowed: "URL string",
		description:
			"Identifier URL for the Authorization Server advertised in metadata discovery.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	subJsonPath: {
		cli: "-",
		env: "AUTH_SUB_JSONPATH",
		defaultVal: "$.sub",
		allowed: "JSONPath",
		description:
			"Payload path to extract unique user identity from JWT payload.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	scopeJsonPath: {
		cli: "--auth-scope-jsonpath",
		env: "AUTH_SCOPE_JSONPATH",
		defaultVal: "$.scope",
		allowed: "JSONPath",
		description: "Payload path to extract scopes claim from JWT payload.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	rolesJsonPath: {
		cli: "--auth-roles-jsonpath",
		env: ["AUTH_ROLES_JSONPATH", "AUTH_ADMIN_JSONPATH"],
		defaultVal: "$.realm_access.roles",
		allowed: "JSONPath",
		description: "Payload path to extract user roles from JWT payload.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	adminRole: {
		cli: "-",
		env: "AUTH_ADMIN_ROLE",
		defaultVal: "nogoo9-admin",
		allowed: "String",
		description: "Role name signifying administrator access.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	requiredReadScope: {
		cli: "--auth-required-read-scope",
		env: "AUTH_REQUIRED_READ_SCOPE",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description:
			"OAuth scope required for read operations. If not set, read scope check is bypassed.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	requiredWriteScope: {
		cli: "--auth-required-write-scope",
		env: "AUTH_REQUIRED_WRITE_SCOPE",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description:
			"OAuth scope required for write/mutation operations. If not set, write scope check is bypassed.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	requiredReadRole: {
		cli: "--auth-required-read-role",
		env: "AUTH_REQUIRED_READ_ROLE",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description:
			"User role required for read operations. If not set, read role check is bypassed.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	requiredWriteRole: {
		cli: "--auth-required-write-role",
		env: "AUTH_REQUIRED_WRITE_ROLE",
		defaultVal: undefined as string | undefined,
		allowed: "String",
		description:
			"User role required for write/mutation operations. If not set, write role check is bypassed.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	sessionTtlSeconds: {
		cli: "-",
		env: "PROXY_SESSION_TTL",
		defaultVal: 1800,
		allowed: "Number",
		description:
			"Session cookie expiration lifetime in seconds (sliding window duration).",
		get value(): number {
			const val = getEnv(this.env);
			return val ? Number(val) : this.defaultVal;
		},
	} satisfies SchemaItem<number>,

	sessionSecret: {
		cli: "-",
		env: "PROXY_SESSION_SECRET",
		defaultVal: "",
		allowed: "String",
		description:
			"HMAC secret key used to sign stateless session cookies. Falls back to `JWT_SECRET` if not configured.",
		get value(): string {
			return getEnv(this.env) ?? getEnv("JWT_SECRET") ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,
};

export const authConfig = parseConfig(authSchema);
