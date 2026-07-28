import { config } from "~/config/index.js";

/**
 * Builds header dictionary for proxy forwarding to upstream workspace containers.
 * Injects `x-workspace-jwt` and user context headers when `AUTH_INJECT_WORKSPACE_JWT` is enabled.
 *
 * @param incomingHeaders Raw request headers dictionary.
 * @param jwtPayload Decrypted JWT payload of the caller.
 * @param rawToken Raw bearer token or session JWT string.
 * @returns Modifiable headers object for upstream proxying.
 */
export function buildUpstreamAuthHeaders(
	incomingHeaders: Record<string, string | string[] | undefined>,
	jwtPayload?: Record<string, unknown>,
	rawToken?: string,
): Record<string, string> {
	const headers: Record<string, string> = {};

	// Copy non-host headers
	for (const [key, value] of Object.entries(incomingHeaders)) {
		if (key.toLowerCase() !== "host" && value !== undefined) {
			headers[key] = Array.isArray(value) ? value.join(", ") : String(value);
		}
	}

	if (config.auth.injectWorkspaceJwt && rawToken) {
		headers["x-workspace-jwt"] = rawToken;
	}

	if (jwtPayload) {
		if (jwtPayload.sub) {
			headers["x-forwarded-user"] = String(jwtPayload.sub);
		}
		if (jwtPayload.email) {
			headers["x-forwarded-email"] = String(jwtPayload.email);
		}
	}

	return headers;
}
