import { AsyncLocalStorage } from "node:async_hooks";
import { getLogger } from "@logtape/logtape";
import { JSONPath } from "jsonpath-plus";
import { config } from "~/config.js";

const logger = getLogger(["nogoo9", "k8s-auth"]);

export const requestContextStore = new AsyncLocalStorage<{
	jwtPayload?: any;
}>();

/**
 * Extracts the user sub/identity identifier from a decrypted JWT payload object.
 * Evaluates the specified JsonPath expression (e.g. `"$.sub"` or `"$.identity"`) against the payload.
 *
 * @param jwtPayload Decrypted JWT payload dictionary.
 * @param jsonPathExpr JSONPath expression specifying where the identity claim resides. Defaults to `"$.sub"`.
 * @returns The resolved identity string.
 * @throws An Error if the identity claim is missing or invalid.
 */
export function extractUserIdentity(
	jwtPayload: unknown,
	jsonPathExpr = "$.sub",
): string {
	logger.debug(
		"Extracting identity from JWT payload using expression: {expr}",
		{
			expr: jsonPathExpr,
		},
	);
	if (!jwtPayload || typeof jwtPayload !== "object") {
		const err = new Error("Unauthorized: Invalid token payload");
		logger.warn(
			"Identity extraction failed: payload is null or not an object.",
		);
		throw err;
	}

	const match = JSONPath<unknown[]>({
		path: jsonPathExpr,
		json: jwtPayload as object,
	});
	if (!match || match.length === 0) {
		const err = new Error("Unauthorized: Identity claim not found in token");
		logger.warn(
			"Identity extraction failed: claim path '{expr}' returned no results.",
			{
				expr: jsonPathExpr,
			},
		);
		throw err;
	}

	const identity = match[0];
	if (typeof identity !== "string" && typeof identity !== "number") {
		const err = new Error(
			"Unauthorized: Identity claim must be a string or number",
		);
		logger.warn(
			"Identity extraction failed: claim resolved to a non-primitive type: {type}",
			{
				type: typeof identity,
			},
		);
		throw err;
	}

	const sub = String(identity);
	logger.info("Successfully extracted identity claim: {sub}", { sub });
	return sub;
}

/**
 * Base64url decode a string.
 */
export function base64urlDecode(str: string): string {
	let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	while (base64.length % 4) {
		base64 += "=";
	}
	// Support cross-runtime base64 decoding (Buffer in Node/Bun, atob in Deno/Browser)
	if (typeof Buffer !== "undefined") {
		return Buffer.from(base64, "base64").toString("utf8");
	}
	return atob(base64);
}

/**
 * Decodes the JWT payload without signature verification.
 */
export function decodeJwtPayload(token: string): any {
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid token format");
	}
	const payloadStr = base64urlDecode(parts[1]);
	return JSON.parse(payloadStr);
}

/**
 * Base64url decode a string to Uint8Array.
 */
export function base64urlDecodeToBuffer(str: string): Uint8Array {
	let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	while (base64.length % 4) {
		base64 += "=";
	}
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

interface JWK {
	kty: string;
	kid: string;
	alg?: string;
	[key: string]: any;
}

let jwksCache: JWK[] = [];
let jwksCacheTimestamp = 0;
const JWKS_CACHE_TTL = 300000; // 5 minutes

async function fetchJwks(jwksUri: string): Promise<JWK[]> {
	const now = Date.now();
	if (jwksCache.length > 0 && now - jwksCacheTimestamp < JWKS_CACHE_TTL) {
		return jwksCache;
	}
	try {
		if (jwksUri.startsWith("http://") || jwksUri.startsWith("https://")) {
			const res = await fetch(jwksUri);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			if (data && Array.isArray(data.keys)) {
				jwksCache = data.keys;
				jwksCacheTimestamp = now;
				return jwksCache;
			}
		} else {
			const { readFileSync } = await import("node:fs");
			let filePath = jwksUri;
			if (jwksUri.startsWith("file://")) {
				try {
					const { fileURLToPath } = await import("node:url");
					filePath = fileURLToPath(jwksUri);
				} catch {
					filePath = jwksUri.substring(7);
					if (process.platform === "win32" && filePath.startsWith("/")) {
						filePath = filePath.substring(1);
					}
				}
			}
			const content = readFileSync(filePath, "utf-8");
			const data = JSON.parse(content);
			if (data && Array.isArray(data.keys)) {
				jwksCache = data.keys;
				jwksCacheTimestamp = now;
				return jwksCache;
			}
		}
		return [];
	} catch (err) {
		logger.error("Failed to fetch JWKS from {jwksUri}: {error}", {
			jwksUri,
			error: err,
		});
		return jwksCache;
	}
}

/**
 * Normalizes and checks if a requested resource URL is allowed under a configured resource URL.
 * Follows the standard MCP checkResourceAllowed logic.
 */
export function checkResourceAllowed({
	requestedResource,
	configuredResource,
}: {
	requestedResource: string;
	configuredResource: string;
}): boolean {
	try {
		const reqUrl = new URL(requestedResource);
		const confUrl = new URL(configuredResource);
		if (reqUrl.protocol.toLowerCase() !== confUrl.protocol.toLowerCase()) {
			return false;
		}
		if (reqUrl.host.toLowerCase() !== confUrl.host.toLowerCase()) {
			return false;
		}
		const reqPath = `${reqUrl.pathname.replace(/\/$/, "")}/`;
		const confPath = `${confUrl.pathname.replace(/\/$/, "")}/`;
		return reqPath.startsWith(confPath);
	} catch (_) {
		const normReq = requestedResource.trim().replace(/\/$/, "").toLowerCase();
		const normConf = configuredResource.trim().replace(/\/$/, "").toLowerCase();
		return normReq === normConf;
	}
}

/**
 * Verifies a token's signature and expiration, returning its payload.
 * Supports symmetric HMAC (HS256), asymmetric public key PEM (RS256/ES256), dynamic JWKS URL keys, and OAuth Token Introspection (RFC 7662).
 */
export async function verifyToken(
	token: string,
	expectedAudience?: string,
): Promise<any> {
	const introspectionEndpoint = config.auth.introspectionEndpoint;

	if (introspectionEndpoint) {
		logger.debug("Performing token verification via introspection endpoint.");
		const clientId = config.auth.clientId || "";
		const clientSecret = config.auth.clientSecret || "";

		const params = new URLSearchParams({ token });
		if (clientId) params.set("client_id", clientId);
		if (clientSecret) params.set("client_secret", clientSecret);

		let response: Response;
		try {
			response = await fetch(introspectionEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: params.toString(),
			});
		} catch (e) {
			logger.error("Token introspection fetch failed: {error}", { error: e });
			throw new Error("Introspection endpoint communication error");
		}

		if (!response.ok) {
			const _txt = await response.text();
			logger.warn("Token introspection returned non-OK status: {status}", {
				status: response.status,
			});
			throw new Error("Introspection token verification failed");
		}

		const data = await response.json();
		if (!data || data.active === false) {
			throw new Error("Token is not active");
		}

		// Validate audience if expectedAudience or JWT_AUDIENCE is defined
		const targetAudience = config.auth.audience || expectedAudience;
		if (targetAudience) {
			if (!data.aud) {
				throw new Error("Token is missing required audience (aud) claim");
			}
			const audiences: string[] = Array.isArray(data.aud)
				? data.aud
				: [data.aud];
			const allowed = audiences.some((a) =>
				checkResourceAllowed({
					requestedResource: a,
					configuredResource: targetAudience,
				}),
			);
			if (!allowed) {
				throw new Error(
					`Token audience '${data.aud}' does not match expected audience: ${targetAudience}`,
				);
			}
		}

		return data;
	}

	// 2. Default JWT validation path
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid token format");
	}
	const header = JSON.parse(base64urlDecode(parts[0]));
	const payload = JSON.parse(base64urlDecode(parts[1]));
	const signature = parts[2];

	// 2.1 Basic expiration check
	if (payload.exp && typeof payload.exp === "number") {
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp < now) {
			const err = new Error("Token has expired");
			logger.warn("Token verification failed: token is expired.");
			throw err;
		}
	}

	// 2.2 Validate signature if required
	if (config.auth.verificationRequired) {
		const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
		const sigBytes = base64urlDecodeToBuffer(signature);
		let cryptoKey: CryptoKey | null = null;
		let algorithmName = "";

		const alg = header.alg || "RS256";
		if (alg === "HS256") {
			algorithmName = "HMAC";
			const secret = config.auth.secret;
			if (!secret)
				throw new Error("JWT_SECRET is not configured on the server");
			cryptoKey = await crypto.subtle.importKey(
				"raw",
				new TextEncoder().encode(secret),
				{ name: "HMAC", hash: { name: "SHA-256" } },
				false,
				["verify"],
			);
		} else if (alg === "RS256" || alg === "ES256") {
			algorithmName = alg === "RS256" ? "RSASSA-PKCS1-v1_5" : "ECDSA";
			const publicKeyPem = config.auth.publicKey;
			const jwksUri = config.auth.jwksUri;

			if (publicKeyPem) {
				const pemContents = publicKeyPem
					.replace(/-----BEGIN PUBLIC KEY-----/g, "")
					.replace(/-----END PUBLIC KEY-----/g, "")
					.replace(/\s+/g, "");
				const derBytes = Uint8Array.from(atob(pemContents), (c) =>
					c.charCodeAt(0),
				);
				cryptoKey = await crypto.subtle.importKey(
					"spki",
					derBytes,
					{
						name: algorithmName,
						hash: { name: "SHA-256" },
						...(alg === "ES256" ? { namedCurve: "P-256" } : {}),
					},
					false,
					["verify"],
				);
			} else if (jwksUri) {
				const keys = await fetchJwks(jwksUri);
				const kid = header.kid;
				const jwk = keys.find((k) => k.kid === kid);
				if (!jwk) throw new Error(`No key found in JWKS for kid: ${kid}`);
				cryptoKey = await crypto.subtle.importKey(
					"jwk",
					jwk,
					{
						name: jwk.kty === "RSA" ? "RSASSA-PKCS1-v1_5" : "ECDSA",
						hash: { name: "SHA-256" },
						...(jwk.kty === "EC" ? { namedCurve: "P-256" } : {}),
					},
					false,
					["verify"],
				);
			} else {
				throw new Error(
					"Neither JWT_PUBLIC_KEY nor JWKS_URI is configured on the server",
				);
			}
		} else {
			throw new Error(`Unsupported token algorithm: ${alg}`);
		}

		const isValid = await crypto.subtle.verify(
			(algorithmName === "HMAC"
				? "HMAC"
				: {
						name: algorithmName,
						...(algorithmName === "ECDSA" ? { hash: { name: "SHA-256" } } : {}),
					}) as any,
			cryptoKey,
			sigBytes as any,
			data as any,
		);

		if (!isValid) {
			throw new Error("Invalid token signature");
		}
	}

	// 2.3 Validate audience if expectedAudience or JWT_AUDIENCE is defined
	const targetAudience = config.auth.audience || expectedAudience;
	if (targetAudience) {
		if (!payload.aud) {
			throw new Error("Token is missing required audience (aud) claim");
		}
		const audiences: string[] = Array.isArray(payload.aud)
			? payload.aud
			: [payload.aud];
		const allowed = audiences.some((a) =>
			checkResourceAllowed({
				requestedResource: a,
				configuredResource: targetAudience,
			}),
		);
		if (!allowed) {
			throw new Error(
				`Token audience '${payload.aud}' does not match expected audience: ${targetAudience}`,
			);
		}
	}

	return payload;
}

/**
 * Extracts the user's roles from a decrypted JWT payload using JSONPath.
 * Checks if the configured admin role is present in those roles.
 *
 * @param jwtPayload Decrypted JWT payload dictionary.
 * @param jsonPathExpr JSONPath expression specifying where the roles array resides. Defaults to `"$.realm_access.roles"`.
 * @param adminRole Name of the admin role to check for. Defaults to `"nogoo9-admin"`.
 * @returns true if the user has the admin role, false otherwise.
 */
export function extractAdminRole(
	jwtPayload: unknown,
	jsonPathExpr = "$.realm_access.roles",
	adminRole = "nogoo9-admin",
): boolean {
	logger.debug(
		"Checking admin role in JWT payload using expression '{expr}' and role name '{role}'",
		{
			expr: jsonPathExpr,
			role: adminRole,
		},
	);
	if (!jwtPayload || typeof jwtPayload !== "object") {
		return false;
	}
	try {
		const match = JSONPath<unknown[]>({
			path: jsonPathExpr,
			json: jwtPayload as object,
		});
		if (!match || match.length === 0) {
			return false;
		}
		const roles = match[0];
		if (Array.isArray(roles)) {
			return roles.includes(adminRole);
		}
		if (typeof roles === "string") {
			return roles === adminRole;
		}
		return false;
	} catch (err) {
		logger.warn("Failed to extract admin role using JSONPath: {error}", {
			error: err,
		});
		return false;
	}
}

/**
 * Utility to extract a cookie value from a `Cookie` header.
 *
 * @param cookieHeader The raw `Cookie` header value.
 * @param cookieName The name of the cookie to extract. Defaults to `"nocr_token"`.
 * @returns The cookie value, or undefined if not found.
 */
export function extractTokenFromCookie(
	cookieHeader: string | undefined | null,
	cookieName = "nocr_token",
): string | undefined {
	if (!cookieHeader) return undefined;
	const cookies = cookieHeader.split(";");
	for (const cookie of cookies) {
		const parts = cookie.trim().split("=");
		const name = parts[0];
		if (name === cookieName) {
			return parts.slice(1).join("=");
		}
	}
	return undefined;
}

/**
 * Checks if the JWT payload contains the required scope.
 * Supports both space-separated scope strings and array of scopes.
 *
 * @param jwtPayload Decrypted JWT payload dictionary.
 * @param requiredScope The required scope string (e.g., "mcp:read"). If undefined, returns true.
 * @param jsonPathExpr JSONPath expression specifying where the scope claim resides. Defaults to "$.scope".
 * @returns true if scope is present/valid, false otherwise.
 */
export function hasRequiredScope(
	jwtPayload: unknown,
	requiredScope?: string,
	jsonPathExpr = "$.scope",
): boolean {
	if (!requiredScope) {
		return true;
	}
	if (!jwtPayload || typeof jwtPayload !== "object") {
		return false;
	}
	try {
		// First try JSONPath lookup
		const match = JSONPath<unknown[]>({
			path: jsonPathExpr,
			json: jwtPayload as object,
		});
		let scopesVal: unknown = match && match.length > 0 ? match[0] : undefined;

		// Fallback to $.scp if default $.scope returned nothing
		if (scopesVal === undefined && jsonPathExpr === "$.scope") {
			const fallbackMatch = JSONPath<unknown[]>({
				path: "$.scp",
				json: jwtPayload as object,
			});
			scopesVal =
				fallbackMatch && fallbackMatch.length > 0
					? fallbackMatch[0]
					: undefined;
		}

		// Direct fallback checks if JSONPath didn't resolve anything
		if (scopesVal === undefined) {
			scopesVal = (jwtPayload as any).scope ?? (jwtPayload as any).scp;
		}

		if (scopesVal === undefined || scopesVal === null) {
			return false;
		}

		if (Array.isArray(scopesVal)) {
			return scopesVal.some((s) => String(s) === requiredScope);
		}
		if (typeof scopesVal === "string") {
			const parts = scopesVal.split(/\s+/);
			return parts.includes(requiredScope);
		}
		return false;
	} catch (err) {
		logger.warn("Failed to extract scope using JSONPath: {error}", {
			error: err,
		});
		return false;
	}
}

/**
 * Validates scope against JWT payload, throwing a clear error if mismatch.
 */
export function verifyScopeOrThrow(
	jwtPayload: unknown,
	requiredScope?: string,
	jsonPathExpr = "$.scope",
): void {
	if (!requiredScope) {
		return;
	}
	if (!hasRequiredScope(jwtPayload, requiredScope, jsonPathExpr)) {
		throw new Error(`Forbidden: Missing required scope: ${requiredScope}`);
	}
}

/**
 * Checks if the JWT payload contains the required role.
 * Supports checking standard roles arrays or strings, and always allows admins.
 *
 * @param jwtPayload Decrypted JWT payload dictionary.
 * @param requiredRole The required role string (e.g., "mcp-reader"). If undefined, returns true.
 * @param jsonPathExpr JSONPath expression specifying where the roles claim resides. Defaults to "$.realm_access.roles".
 * @returns true if role is present/valid, false otherwise.
 */
export function hasRequiredRole(
	jwtPayload: unknown,
	requiredRole?: string,
	jsonPathExpr = "$.realm_access.roles",
): boolean {
	if (!requiredRole) {
		return true;
	}
	if (!jwtPayload || typeof jwtPayload !== "object") {
		return false;
	}

	// Admins always bypass role checks
	const adminRole = config.auth.adminRole;
	const adminJsonPath = config.auth.rolesJsonPath;
	if (extractAdminRole(jwtPayload, adminJsonPath, adminRole)) {
		return true;
	}

	try {
		// First try JSONPath lookup
		const match = JSONPath<unknown[]>({
			path: jsonPathExpr,
			json: jwtPayload as object,
		});
		let rolesVal: unknown = match && match.length > 0 ? match[0] : undefined;

		// Fallback to $.roles if default $.realm_access.roles returned nothing
		if (rolesVal === undefined && jsonPathExpr === "$.realm_access.roles") {
			const fallbackMatch = JSONPath<unknown[]>({
				path: "$.roles",
				json: jwtPayload as object,
			});
			rolesVal =
				fallbackMatch && fallbackMatch.length > 0
					? fallbackMatch[0]
					: undefined;
		}

		// Direct fallback checks if JSONPath didn't resolve anything
		if (rolesVal === undefined) {
			rolesVal =
				(jwtPayload as any).roles ?? (jwtPayload as any).realm_access?.roles;
		}

		if (rolesVal === undefined || rolesVal === null) {
			return false;
		}

		if (Array.isArray(rolesVal)) {
			return rolesVal.some((r) => String(r) === requiredRole);
		}
		if (typeof rolesVal === "string") {
			const parts = rolesVal.split(/[\s,]+/);
			return parts.includes(requiredRole);
		}
		return false;
	} catch (err) {
		logger.warn("Failed to extract roles using JSONPath: {error}", {
			error: err,
		});
		return false;
	}
}

/**
 * Validates role against JWT payload, throwing a clear error if mismatch.
 */
export function verifyRoleOrThrow(
	jwtPayload: unknown,
	requiredRole?: string,
	jsonPathExpr = "$.realm_access.roles",
): void {
	if (!requiredRole) {
		return;
	}
	if (!hasRequiredRole(jwtPayload, requiredRole, jsonPathExpr)) {
		throw new Error(`Forbidden: Missing required role: ${requiredRole}`);
	}
}

/**
 * Verifies both scope and role constraints against the JWT payload for a given action.
 */
export function verifyAccessOrThrow(
	jwtPayload: unknown,
	action: "read" | "write",
): void {
	// 1. Verify Scope
	const requiredScope =
		action === "read"
			? config.auth.requiredReadScope
			: config.auth.requiredWriteScope;
	const scopeJsonPath = config.auth.scopeJsonPath;
	if (
		requiredScope &&
		!hasRequiredScope(jwtPayload, requiredScope, scopeJsonPath)
	) {
		throw new Error(`Forbidden: Missing required scope: ${requiredScope}`);
	}

	// 2. Verify Role
	const requiredRole =
		action === "read"
			? config.auth.requiredReadRole
			: config.auth.requiredWriteRole;
	const rolesJsonPath = config.auth.rolesJsonPath;
	if (
		requiredRole &&
		!hasRequiredRole(jwtPayload, requiredRole, rolesJsonPath)
	) {
		throw new Error(`Forbidden: Missing required role: ${requiredRole}`);
	}
}
