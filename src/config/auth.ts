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
			return getEnv(this.env) === "true" && getEnv("TRANSPORT") !== "stdio";
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
		defaultVal: "admin",
		allowed: "String",
		description: "Role name signifying administrator access.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	requiredReadScope: {
		cli: "--auth-required-read-scope",
		env: "AUTH_REQUIRED_READ_SCOPE",
		defaultVal: "nogoo9:read" as string | undefined,
		allowed: "String",
		description:
			"OAuth scope required for read operations. If not set, read scope check is bypassed.",
		get value(): string | undefined {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string | undefined>,

	requiredWriteScope: {
		cli: "--auth-required-write-scope",
		env: "AUTH_REQUIRED_WRITE_SCOPE",
		defaultVal: "nogoo9:write" as string | undefined,
		allowed: "String",
		description:
			"OAuth scope required for write/mutation operations. If not set, write scope check is bypassed.",
		get value(): string | undefined {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string | undefined>,

	requiredAdminScope: {
		cli: "--auth-required-admin-scope",
		env: "AUTH_REQUIRED_ADMIN_SCOPE",
		defaultVal: "nogoo9:admin" as string | undefined,
		allowed: "String",
		description:
			"OAuth scope required for administrator operations. If not set, admin scope check is bypassed.",
		get value(): string | undefined {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string | undefined>,

	adminUsers: {
		cli: "-",
		env: "AUTH_ADMIN_USERS",
		defaultVal: [] as string[],
		allowed: "Comma-separated list of user subject IDs (sub)",
		description:
			"Comma-separated list of user subject IDs (sub) granted admin privileges without requiring OIDC scope/role claims (workaround fallback).",
		get value(): string[] {
			const raw = getEnv(this.env);
			if (!raw) return this.defaultVal;
			return raw
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		},
	} satisfies SchemaItem<string[]>,

	requiredReadRole: {
		cli: "--auth-required-read-role",
		env: "AUTH_REQUIRED_READ_ROLE",
		defaultVal: "viewer" as string | undefined,
		allowed: "String",
		description:
			"User role required for read operations. If not set, read role check is bypassed.",
		get value(): string | undefined {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string | undefined>,

	requiredWriteRole: {
		cli: "--auth-required-write-role",
		env: "AUTH_REQUIRED_WRITE_ROLE",
		defaultVal: "user" as string | undefined,
		allowed: "String",
		description:
			"User role required for write/mutation operations. If not set, write role check is bypassed.",
		get value(): string | undefined {
			return getEnv(this.env) ?? this.defaultVal;
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

	refreshCookieTtlSeconds: {
		cli: "-",
		env: "PROXY_REFRESH_COOKIE_TTL",
		defaultVal: 604800,
		allowed: "Number",
		description:
			"Default Max-Age for the encrypted refresh token cookie (nocr_refresh). Overridden by the IdP's refresh_expires_in when available.",
		get value(): number {
			const val = getEnv(this.env);
			return val ? Number(val) : this.defaultVal;
		},
	} satisfies SchemaItem<number>,

	tokenCookieTtlSeconds: {
		cli: "-",
		env: "PROXY_TOKEN_COOKIE_TTL",
		defaultVal: 86400,
		allowed: "Number",
		description:
			"Default Max-Age for the access token cookie (nocr_token). Overridden by the JWT exp claim when available.",
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

	oauthScopes: {
		cli: "-",
		env: "OAUTH_SCOPES",
		defaultVal: "openid profile email offline_access",
		allowed: "Space-separated scope string",
		description:
			"OAuth scopes to request during authorization. Include 'offline_access' for refresh tokens.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	authorizationUrl: {
		cli: "-",
		env: "OAUTH_AUTHORIZATION_URL",
		defaultVal: undefined as string | undefined,
		allowed: "URL string",
		description: "Direct OAuth authorization URL.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	serverDiscoveryUrl: {
		cli: "-",
		env: ["OAUTH_SERVER_DISCOVERY_URL", "OAUTH_DISCOVERY_URL"],
		defaultVal: undefined as string | undefined,
		allowed: "URL string",
		description:
			"Discovery URL for the OAuth server used by the backend gateway. Falls back to OAUTH_DISCOVERY_URL.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	tokenUrl: {
		cli: "-",
		env: ["OAUTH_SERVER_TOKEN_URL", "OAUTH_TOKEN_URL"],
		defaultVal: undefined as string | undefined,
		allowed: "URL string",
		description: "Direct OAuth token exchange endpoint for the backend server.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	endSessionUrl: {
		cli: "-",
		env: "OAUTH_END_SESSION_URL",
		defaultVal: undefined as string | undefined,
		allowed: "URL string",
		description: "Direct OAuth logout endpoint.",
		get value(): string | undefined {
			return getEnv(this.env);
		},
	} satisfies SchemaItem<string | undefined>,

	injectWorkspaceJwt: {
		cli: "--auth-inject-workspace-jwt",
		env: "AUTH_INJECT_WORKSPACE_JWT",
		defaultVal: true,
		allowed: ["true", "false"],
		description:
			"Determines if the custom 'x-workspace-jwt' header containing the raw token is injected into proxy requests.",
		get value(): boolean {
			return getEnv(this.env) !== "false";
		},
	} satisfies SchemaItem<boolean>,

	defaultRole: {
		cli: "-",
		env: "AUTH_DEFAULT_ROLE",
		defaultVal: "viewer",
		allowed: "String",
		description: "Fallback role if the token does not provide scopes/roles.",
		get value(): string {
			return getEnv(this.env) ?? this.defaultVal;
		},
	} satisfies SchemaItem<string>,

	maxWorkspacesPerUser: {
		cli: "--max-workspaces-per-user",
		env: "MAX_WORKSPACES_PER_USER",
		defaultVal: 0,
		allowed: "Number",
		description:
			"Maximum number of concurrent active workspaces a non-admin user can own (0 for unlimited).",
		get value(): number {
			const val = getEnv(this.env);
			return val ? Number(val) : this.defaultVal;
		},
	} satisfies SchemaItem<number>,
};

export const authConfig = parseConfig(authSchema);
