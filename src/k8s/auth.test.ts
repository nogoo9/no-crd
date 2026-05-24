import { describe, expect, test } from "bun:test";
import { extractUserIdentity } from "./auth.js";

describe("extractUserIdentity", () => {
	test("extracts sub correctly", () => {
		const payload = { sub: "user-123" };
		expect(extractUserIdentity(payload, "$.sub")).toBe("user-123");
	});

	test("extracts numeric sub correctly", () => {
		const payload = { sub: 123 };
		expect(extractUserIdentity(payload, "$.sub")).toBe("123");
	});

	test("extracts custom claims with jsonpath", () => {
		const payload = {
			user: {
				id: "user-456",
			},
			roles: ["admin"],
		};
		expect(extractUserIdentity(payload, "$.user.id")).toBe("user-456");
	});

	test("throws if claim missing", () => {
		expect(() => extractUserIdentity({ name: "Bob" }, "$.sub")).toThrow(
			"Unauthorized: Identity claim not found in token",
		);
	});

	test("throws if payload is null or not object", () => {
		expect(() => extractUserIdentity(null, "$.sub")).toThrow(
			"Unauthorized: Invalid token payload",
		);
		expect(() => extractUserIdentity("string", "$.sub")).toThrow(
			"Unauthorized: Invalid token payload",
		);
	});

	test("throws if identity claim is not primitive", () => {
		const payload = { sub: { id: "user-123" } };
		expect(() => extractUserIdentity(payload, "$.sub")).toThrow(
			"Unauthorized: Identity claim must be a string or number",
		);
	});
});
