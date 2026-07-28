import { getLogger } from "@logtape/logtape";
import { JSONPath } from "jsonpath-plus";

const logger = getLogger(["nogoo9", "auth", "jwt-parser"]);

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
 * Extracts user roles array from a JWT payload using JSONPath expression or standard fallbacks.
 *
 * @param jwtPayload Decrypted JWT payload dictionary.
 * @param rolesJsonPath JSONPath expression specifying where roles reside. Defaults to `"$.realm_access.roles"`.
 * @returns Array of role strings.
 */
export function extractUserRoles(
	jwtPayload: Record<string, unknown> | null | undefined,
	rolesJsonPath = "$.realm_access.roles",
): string[] {
	if (!jwtPayload || typeof jwtPayload !== "object") {
		return [];
	}

	try {
		const match = JSONPath<unknown[]>({
			path: rolesJsonPath || "$.realm_access.roles",
			json: jwtPayload as object,
		});
		const rolesVal = match && match.length > 0 ? match[0] : undefined;
		if (Array.isArray(rolesVal)) {
			return rolesVal.map(String);
		}
		if (typeof rolesVal === "string") {
			return rolesVal.split(/[\s,]+/);
		}
	} catch (err) {
		logger.debug("Failed JSONPath extraction for roles: {error}", {
			error: err,
		});
	}

	// Direct fallback checks
	const directRoles =
		jwtPayload.roles ?? (jwtPayload.realm_access as any)?.roles;
	if (Array.isArray(directRoles)) {
		return directRoles.map(String);
	}
	return [];
}

/**
 * Decodes an unverified JWT string payload (base64url) into a JSON object.
 */
export function decodeJwtPayload(
	token: string,
): Record<string, unknown> | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return null;
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const json = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
				.join(""),
		);
		return JSON.parse(json);
	} catch (_e) {
		return null;
	}
}
