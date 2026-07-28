import { getLogger } from "@logtape/logtape";

const logger = getLogger(["nogoo9", "auth", "singleflight"]);

export type RefreshResult = {
	jwtPayload: any;
	token: string;
	rotatedRefreshToken: string;
	refreshExpiresIn?: number;
};

/**
 * In-flight refresh promises keyed by the decrypted refresh token.
 * Ensures concurrent requests for the same token coalesce into
 * a single IdP round-trip (singleflight pattern).
 */
const inflightRefreshes = new Map<string, Promise<RefreshResult>>();

// Exported for testing only
export const _testInflightRefreshes = inflightRefreshes;

/**
 * Singleflight wrapper for refresh token exchange.
 * Coalesces concurrent calls sharing the same refresh token into a single request.
 */
export function deduplicateRefreshCall(
	decryptedRefresh: string,
	executor: () => Promise<RefreshResult>,
): Promise<RefreshResult> {
	const existing = inflightRefreshes.get(decryptedRefresh);
	if (existing) {
		logger.debug("Coalescing concurrent refresh request (singleflight hit)");
		return existing;
	}

	const promise = executor().finally(() => {
		inflightRefreshes.delete(decryptedRefresh);
	});

	inflightRefreshes.set(decryptedRefresh, promise);
	return promise;
}
