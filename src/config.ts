import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolves a built-in asset directory relative to the compiled source location.
 * Tries `../dir` first (from dist/), then `../../dir` (from src/ in dev).
 */
function resolveBuiltinDir(dirName: string): string {
	const fromCurr = join(__dirname, dirName);
	if (existsSync(fromCurr)) return fromCurr;
	const fromDist = join(__dirname, "..", dirName);
	if (existsSync(fromDist)) return fromDist;
	const fromSrc = join(__dirname, "..", "..", dirName);
	if (existsSync(fromSrc)) return fromSrc;
	return fromDist;
}

/**
 * Consolidated and typed configuration interface for the nogoo9-no-crd application.
 * Evaluates environment variables dynamically via getters so that modifications made
 * during unit tests are accurately reflected at runtime.
 */
export const config = {
	get server() {
		return {
			transport: process.env.TRANSPORT ?? "http",
			port: Number(process.env.PORT) || 3000,
			host: process.env.HOST || "0.0.0.0",
			baseUrl: process.env.BASE_URL || "",
			stateless: process.env.STATELESS === "true",
			logLevel: process.env.LOG_LEVEL || "info",
			logFile: process.env.LOG_FILE || "nogoo9-mcp.log",
		};
	},
	get tls() {
		return {
			cert: process.env.TLS_CERT,
			key: process.env.TLS_KEY,
			ca: process.env.TLS_CA,
			rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
		};
	},
	get cors() {
		return {
			origin: process.env.CORS_ALLOWED_ORIGIN || process.env.CORS_ORIGIN || "*",
			methods:
				process.env.CORS_ALLOWED_METHODS ||
				process.env.CORS_METHODS ||
				"GET, POST, OPTIONS",
			headers:
				process.env.CORS_ALLOWED_HEADERS ||
				process.env.CORS_HEADERS ||
				"Content-Type, Authorization, mcp-protocol-version, mcp-session-id",
			credentials:
				process.env.CORS_ALLOW_CREDENTIALS === "true" ||
				process.env.CORS_CREDENTIALS === "true",
			exposedHeaders:
				process.env.CORS_EXPOSED_HEADERS ||
				process.env.CORS_EXPOSED ||
				"mcp-session-id",
			maxAge: process.env.CORS_MAX_AGE
				? Number(process.env.CORS_MAX_AGE)
				: undefined,
		};
	},
	get k8s() {
		return {
			mode: (process.env.MODE ?? "cluster") as "cluster" | "namespaced",
			namespace:
				process.env.NAMESPACE || process.env.DEFAULT_NAMESPACE || "default",
			disablePermissionChecks: process.env.DISABLE_PERMISSION_CHECKS === "true",
			defaultWorkspacePort: process.env.DEFAULT_WORKSPACE_PORT
				? Number(process.env.DEFAULT_WORKSPACE_PORT)
				: undefined,
			registryUrl: process.env.REGISTRY_URL,
			templatesDir: process.env.TEMPLATES_DIR || "",
			builtinTemplates: process.env.BUILTIN_TEMPLATES !== "false",
			builtinTemplatesDir: resolveBuiltinDir("templates"),
		};
	},
	get auth() {
		const clientId = process.env.OAUTH_CLIENT_ID;
		return {
			enabled: process.env.AUTH_ENABLED === "true",
			verificationRequired: process.env.JWT_VERIFICATION_REQUIRED !== "false",
			secret: process.env.JWT_SECRET,
			publicKey: process.env.JWT_PUBLIC_KEY,
			jwksUri: process.env.JWKS_URI,
			introspectionEndpoint:
				process.env.INTROSPECTION_ENDPOINT ||
				process.env.JWT_INTROSPECTION_ENDPOINT,
			clientId,
			clientSecret: process.env.OAUTH_CLIENT_SECRET,
			audience: process.env.JWT_AUDIENCE,
			issuer: process.env.AUTH_ISSUER || process.env.JWT_ISSUER || "",
			subJsonPath: process.env.AUTH_SUB_JSONPATH || "$.sub",
			scopeJsonPath: process.env.AUTH_SCOPE_JSONPATH || "$.scope",
			rolesJsonPath:
				process.env.AUTH_ROLES_JSONPATH ||
				process.env.AUTH_ADMIN_JSONPATH ||
				"$.realm_access.roles",
			adminRole: process.env.AUTH_ADMIN_ROLE || "nogoo9-admin",
			requiredReadScope: process.env.AUTH_REQUIRED_READ_SCOPE,
			requiredWriteScope: process.env.AUTH_REQUIRED_WRITE_SCOPE,
			requiredReadRole: process.env.AUTH_REQUIRED_READ_ROLE,
			requiredWriteRole: process.env.AUTH_REQUIRED_WRITE_ROLE,
			sessionTtlSeconds: Number(process.env.PROXY_SESSION_TTL) || 1800,
			sessionSecret:
				process.env.PROXY_SESSION_SECRET || process.env.JWT_SECRET || "",
		};
	},
	get ui() {
		return {
			enabled: process.env.UI_ENABLED !== "false",
			themesDir: process.env.THEMES_DIR || "themes",
			themesConfigMap: process.env.THEMES_CONFIGMAP,
			builtinThemesDir: resolveBuiltinDir("themes"),
			docsDir: process.env.DOCS_DIR,
			oauth: {
				discoveryUrl: process.env.OAUTH_DISCOVERY_URL || "",
				clientId: process.env.OAUTH_CLIENT_ID || "",
				loginMethod: process.env.OAUTH_LOGIN_METHOD || "redirect",
			},
		};
	},
};
