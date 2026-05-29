import { createHmac, randomBytes } from "node:crypto";
import type * as k8s from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { config } from "~/config/index.js";

const logger = getLogger(["nogoo9", "session"]);

/** Name of the Kubernetes Secret used to persist the session signing key. */
const SESSION_SECRET_NAME = "nogoo9-session-key";
/** Key within the Kubernetes Secret data holding the signing key. */
const SESSION_SECRET_DATA_KEY = "key";

/** In-memory cached session key, set after first successful resolution. */
let cachedSessionKey = "";

/**
 * Minimal claims extracted from the original JWT, carried in the session cookie.
 */
export interface SessionPayload {
	sub: string;
	roles: string[];
	iat: number;
	exp: number;
}

/**
 * Resolves the session signing key via a 5-step priority cascade:
 * 1. `PROXY_SESSION_SECRET` env var
 * 2. `JWT_SECRET` env var
 * 3. Best-effort k8s Secret (read/create with 409 retry)
 * 4. Peer discovery (query sibling pods' internal endpoint)
 * 5. In-memory random key
 *
 * The result is cached in-memory for the process lifetime.
 *
 * @param coreApi Kubernetes CoreV1Api client.
 * @param namespace Deployment namespace.
 * @param port Server port (for peer discovery).
 * @returns The resolved signing key.
 */
export async function resolveSessionSecret(
	coreApi: k8s.CoreV1Api | null,
	namespace: string,
	port = 3000,
): Promise<string> {
	if (cachedSessionKey) return cachedSessionKey;

	// Step 1 & 2: Environment variables (already read via config)
	const envSecret = config.auth.sessionSecret;
	if (envSecret) {
		logger.info("Session key resolved from environment variable");
		cachedSessionKey = envSecret;
		return cachedSessionKey;
	}

	// Step 3: Best-effort Kubernetes Secret
	if (coreApi) {
		try {
			const existing = await coreApi.readNamespacedSecret({
				name: SESSION_SECRET_NAME,
				namespace,
			});
			const encoded = existing.data?.[SESSION_SECRET_DATA_KEY];
			if (encoded) {
				cachedSessionKey = Buffer.from(encoded, "base64").toString("utf-8");
				logger.info("Session key resolved from Kubernetes Secret");
				return cachedSessionKey;
			}
		} catch (err: unknown) {
			const status = (err as { response?: { statusCode?: number } }).response
				?.statusCode;
			if (status === 404) {
				// Secret doesn't exist — try to create it
				const newKey = randomBytes(32).toString("hex");
				try {
					await coreApi.createNamespacedSecret({
						namespace,
						body: {
							apiVersion: "v1",
							kind: "Secret",
							metadata: { name: SESSION_SECRET_NAME, namespace },
							data: {
								[SESSION_SECRET_DATA_KEY]:
									Buffer.from(newKey).toString("base64"),
							},
						},
					});
					cachedSessionKey = newKey;
					logger.info("Session key created in Kubernetes Secret '{name}'", {
						name: SESSION_SECRET_NAME,
					});
					return cachedSessionKey;
				} catch (createErr: unknown) {
					const createStatus = (
						createErr as { response?: { statusCode?: number } }
					).response?.statusCode;
					if (createStatus === 409) {
						// Race condition — another replica created it first
						try {
							const raceWinner = await coreApi.readNamespacedSecret({
								name: SESSION_SECRET_NAME,
								namespace,
							});
							const winnerKey = raceWinner.data?.[SESSION_SECRET_DATA_KEY];
							if (winnerKey) {
								cachedSessionKey = Buffer.from(winnerKey, "base64").toString(
									"utf-8",
								);
								logger.info(
									"Session key resolved from Kubernetes Secret (409 retry)",
								);
								return cachedSessionKey;
							}
						} catch {
							// Fall through to peer discovery
						}
					}
					if (createStatus !== 403) {
						logger.warn("Failed to create session key Secret: {error}", {
							error: createErr,
						});
					}
					// 403 = no RBAC — fall through to peer discovery
				}
			} else if (status !== 403) {
				logger.warn("Failed to read session key Secret: {error}", {
					error: err,
				});
			}
			// 403 = no RBAC — fall through to peer discovery
		}
	}

	// Step 4: Peer discovery
	if (coreApi) {
		try {
			const podList = await coreApi.listNamespacedPod({
				namespace,
				labelSelector: "app=nogoo9-mcp",
			});
			const myPodName = process.env.HOSTNAME || "";
			const peers = (podList.items ?? []).filter(
				(p) =>
					p.metadata?.name !== myPodName &&
					p.status?.phase === "Running" &&
					p.status?.podIP,
			);

			for (const peer of peers) {
				const peerIP = peer.status?.podIP;
				try {
					const res = await fetch(
						`http://${peerIP}:${port}/internal/session-key`,
						{
							headers: { "X-Nogoo9-Internal": namespace },
							signal: AbortSignal.timeout(2000),
						},
					);
					if (res.ok) {
						const data = (await res.json()) as { key?: string };
						if (data.key) {
							cachedSessionKey = data.key;
							logger.info("Session key adopted from peer pod '{peer}'", {
								peer: peer.metadata?.name,
							});
							return cachedSessionKey;
						}
					}
				} catch {
					// Peer unreachable — try next
				}
			}
		} catch (err) {
			logger.debug("Peer discovery failed: {error}", { error: err });
		}
	}

	// Step 5: In-memory random key
	cachedSessionKey = randomBytes(32).toString("hex");
	logger.warn(
		"Session key generated in-memory. Multi-replica deployments should set PROXY_SESSION_SECRET for consistent sessions.",
	);
	return cachedSessionKey;
}

/**
 * Creates an HMAC-SHA256 signed session cookie value from JWT claims.
 *
 * @param jwtPayload Original JWT payload.
 * @param secret HMAC signing key.
 * @param ttlSeconds Cookie TTL in seconds.
 * @param subJsonPath JSONPath to extract `sub` from the JWT payload.
 * @param rolesJsonPath JSONPath to extract `roles` from the JWT payload.
 * @returns Cookie value string: `base64url(json_payload).signature`.
 */
export function createSessionCookie(
	jwtPayload: Record<string, unknown>,
	secret: string,
	ttlSeconds: number,
	subJsonPath = "$.sub",
	rolesJsonPath = "$.realm_access.roles",
): string {
	const now = Math.floor(Date.now() / 1000);

	// Extract sub — simple JSONPath support for common patterns
	const sub = extractJsonPathValue(jwtPayload, subJsonPath, "") as string;

	// Extract roles
	const roles = (extractJsonPathValue(jwtPayload, rolesJsonPath, []) ??
		[]) as string[];

	const payload: SessionPayload = {
		sub,
		roles: Array.isArray(roles) ? roles : [],
		iat: now,
		exp: now + ttlSeconds,
	};

	const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const signature = createHmac("sha256", secret)
		.update(payloadStr)
		.digest("base64url");

	return `${payloadStr}.${signature}`;
}

/**
 * Verifies an HMAC-signed session cookie and returns the payload if valid.
 *
 * @param cookie Raw cookie value (`payload.signature`).
 * @param secret HMAC signing key.
 * @returns Decoded session payload, or `null` if invalid/expired/tampered.
 */
export function verifySessionCookie(
	cookie: string,
	secret: string,
): SessionPayload | null {
	const dotIndex = cookie.indexOf(".");
	if (dotIndex === -1) return null;

	const payloadStr = cookie.slice(0, dotIndex);
	const receivedSig = cookie.slice(dotIndex + 1);

	// Verify HMAC
	const expectedSig = createHmac("sha256", secret)
		.update(payloadStr)
		.digest("base64url");

	if (receivedSig !== expectedSig) return null;

	// Decode payload
	try {
		const payload = JSON.parse(
			Buffer.from(payloadStr, "base64url").toString("utf-8"),
		) as SessionPayload;

		// Check expiry
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp <= now) return null;

		return payload;
	} catch {
		return null;
	}
}

/**
 * Convenience: extract `sub` from a session cookie without full parsing.
 *
 * @param cookie Raw cookie value.
 * @param secret HMAC signing key.
 * @returns User subject string, or `null` if invalid.
 */
export function extractSessionCookieUserSub(
	cookie: string,
	secret: string,
): string | null {
	const payload = verifySessionCookie(cookie, secret);
	return payload?.sub ?? null;
}

/**
 * Returns the current cached session key (for the internal endpoint).
 * Returns empty string if no key has been resolved yet.
 */
export function getSessionKey(): string {
	return cachedSessionKey;
}

/**
 * Resets the cached session key. Used for testing only.
 * @internal
 */
export function _resetSessionKeyForTesting(): void {
	cachedSessionKey = "";
}

/**
 * Simple JSONPath value extractor for common patterns like `$.sub` or
 * `$.realm_access.roles`. Supports only dot-notation paths.
 */
function extractJsonPathValue(
	obj: Record<string, unknown>,
	path: string,
	defaultValue: unknown,
): unknown {
	const cleaned = path.replace(/^\$\.?/, "");
	if (!cleaned) return defaultValue;

	const parts = cleaned.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return defaultValue;
		current = (current as Record<string, unknown>)[part];
	}
	return current ?? defaultValue;
}
