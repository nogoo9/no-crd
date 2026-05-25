import { AsyncLocalStorage } from "node:async_hooks";
import { getLogger } from "@logtape/logtape";
import { JSONPath } from "jsonpath-plus";

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
		const res = await fetch(jwksUri);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		if (data && Array.isArray(data.keys)) {
			jwksCache = data.keys;
			jwksCacheTimestamp = now;
			return jwksCache;
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
	// 1. Check for Token Introspection (RFC 7662)
	const introspectionEndpoint =
		process.env.INTROSPECTION_ENDPOINT ||
		process.env.JWT_INTROSPECTION_ENDPOINT;

	if (introspectionEndpoint) {
		logger.debug("Performing token verification via introspection endpoint.");
		const clientId = process.env.OAUTH_CLIENT_ID || "";
		const clientSecret = process.env.OAUTH_CLIENT_SECRET || "";

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
		const targetAudience = process.env.JWT_AUDIENCE || expectedAudience;
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
	if (process.env.JWT_VERIFICATION_REQUIRED !== "false") {
		const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
		const sigBytes = base64urlDecodeToBuffer(signature);
		let cryptoKey: CryptoKey | null = null;
		let algorithmName = "";

		const alg = header.alg || "RS256";
		if (alg === "HS256") {
			algorithmName = "HMAC";
			const secret = process.env.JWT_SECRET;
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
			const publicKeyPem = process.env.JWT_PUBLIC_KEY;
			const jwksUri = process.env.JWKS_URI;

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
	const targetAudience = process.env.JWT_AUDIENCE || expectedAudience;
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
