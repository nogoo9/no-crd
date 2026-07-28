import { config } from "~/config/index.js";

/**
 * Computes cookie Max-Age from a JWT's exp claim, falling back to config default.
 */
export function computeTokenCookieTtl(jwtPayload: any): number {
	if (jwtPayload?.exp && typeof jwtPayload.exp === "number") {
		const remaining = jwtPayload.exp - Math.floor(Date.now() / 1000);
		if (remaining > 0) {
			return remaining;
		}
	}
	return config.auth.tokenCookieTtlSeconds;
}

/**
 * Computes cookie Max-Age for the refresh token cookie, using the IdP's
 * refresh_expires_in when available, otherwise falling back to config default.
 */
export function computeRefreshCookieTtl(refreshExpiresIn?: number): number {
	if (refreshExpiresIn && refreshExpiresIn > 0) {
		return refreshExpiresIn;
	}
	return config.auth.refreshCookieTtlSeconds;
}
