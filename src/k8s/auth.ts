import { getLogger } from "@logtape/logtape";
import { JSONPath } from "jsonpath-plus";

const logger = getLogger(["nogoo9", "k8s-auth"]);

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
