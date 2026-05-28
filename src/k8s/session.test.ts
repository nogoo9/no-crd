import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	_resetSessionKeyForTesting,
	createSessionCookie,
	extractSessionCookieUserSub,
	resolveSessionSecret,
	type SessionPayload,
	verifySessionCookie,
} from "./session.js";

const TEST_SECRET = "test-secret-key-for-hmac-signing";

describe("createSessionCookie", () => {
	test("creates a base64url payload + signature", () => {
		const jwt = { sub: "user-1", realm_access: { roles: ["admin"] } };
		const cookie = createSessionCookie(jwt, TEST_SECRET, 1800);

		expect(cookie).toContain(".");
		const [payloadStr, sig] = cookie.split(".");
		expect(payloadStr).toBeTruthy();
		expect(sig).toBeTruthy();

		// Decode and verify payload structure
		const payload = JSON.parse(
			Buffer.from(payloadStr, "base64url").toString("utf-8"),
		) as SessionPayload;
		expect(payload.sub).toBe("user-1");
		expect(payload.roles).toEqual(["admin"]);
		expect(payload.exp).toBeGreaterThan(payload.iat);
		expect(payload.exp - payload.iat).toBe(1800);
	});

	test("uses custom subJsonPath", () => {
		const jwt = { user_id: "custom-user" };
		const cookie = createSessionCookie(jwt, TEST_SECRET, 1800, "$.user_id");

		const payload = verifySessionCookie(cookie, TEST_SECRET);
		expect(payload?.sub).toBe("custom-user");
	});

	test("uses custom rolesJsonPath", () => {
		const jwt = { sub: "u1", app_roles: ["reader", "writer"] };
		const cookie = createSessionCookie(
			jwt,
			TEST_SECRET,
			1800,
			"$.sub",
			"$.app_roles",
		);

		const payload = verifySessionCookie(cookie, TEST_SECRET);
		expect(payload?.roles).toEqual(["reader", "writer"]);
	});

	test("handles missing sub gracefully", () => {
		const jwt = {};
		const cookie = createSessionCookie(jwt, TEST_SECRET, 1800);
		const payload = verifySessionCookie(cookie, TEST_SECRET);
		expect(payload?.sub).toBe("");
	});

	test("handles missing roles gracefully", () => {
		const jwt = { sub: "user" };
		const cookie = createSessionCookie(jwt, TEST_SECRET, 1800);
		const payload = verifySessionCookie(cookie, TEST_SECRET);
		expect(payload?.roles).toEqual([]);
	});
});

describe("verifySessionCookie", () => {
	test("verifies a valid cookie", () => {
		const jwt = { sub: "user-1", realm_access: { roles: ["viewer"] } };
		const cookie = createSessionCookie(jwt, TEST_SECRET, 1800);

		const payload = verifySessionCookie(cookie, TEST_SECRET);
		expect(payload).not.toBeNull();
		expect(payload!.sub).toBe("user-1");
		expect(payload!.roles).toEqual(["viewer"]);
	});

	test("returns null for tampered payload", () => {
		const jwt = { sub: "user-1" };
		const cookie = createSessionCookie(jwt, TEST_SECRET, 1800);

		// Tamper with the payload
		const [_, sig] = cookie.split(".");
		const tamperedPayload = Buffer.from(
			JSON.stringify({ sub: "hacker", roles: [], iat: 0, exp: 9999999999 }),
		).toString("base64url");

		expect(
			verifySessionCookie(`${tamperedPayload}.${sig}`, TEST_SECRET),
		).toBeNull();
	});

	test("returns null for tampered signature", () => {
		const jwt = { sub: "user-1" };
		const cookie = createSessionCookie(jwt, TEST_SECRET, 1800);

		const [payloadStr] = cookie.split(".");
		expect(
			verifySessionCookie(`${payloadStr}.tampered-sig`, TEST_SECRET),
		).toBeNull();
	});

	test("returns null for wrong secret", () => {
		const jwt = { sub: "user-1" };
		const cookie = createSessionCookie(jwt, TEST_SECRET, 1800);
		expect(verifySessionCookie(cookie, "wrong-secret")).toBeNull();
	});

	test("returns null for expired cookie", () => {
		const jwt = { sub: "user-1" };
		// Create a cookie that expired 10 seconds ago
		const cookie = createSessionCookie(jwt, TEST_SECRET, -10);
		expect(verifySessionCookie(cookie, TEST_SECRET)).toBeNull();
	});

	test("returns null for malformed cookie (no dot)", () => {
		expect(verifySessionCookie("nodothere", TEST_SECRET)).toBeNull();
	});

	test("returns null for empty string", () => {
		expect(verifySessionCookie("", TEST_SECRET)).toBeNull();
	});

	test("returns null for invalid base64 payload", () => {
		expect(verifySessionCookie("!!!.sig", TEST_SECRET)).toBeNull();
	});
});

describe("extractSessionCookieUserSub", () => {
	test("extracts sub from valid cookie", () => {
		const jwt = { sub: "user-42" };
		const cookie = createSessionCookie(jwt, TEST_SECRET, 1800);
		expect(extractSessionCookieUserSub(cookie, TEST_SECRET)).toBe("user-42");
	});

	test("returns null for invalid cookie", () => {
		expect(extractSessionCookieUserSub("bad.cookie", TEST_SECRET)).toBeNull();
	});
});

describe("resolveSessionSecret", () => {
	beforeEach(() => {
		_resetSessionKeyForTesting();
	});

	afterEach(() => {
		_resetSessionKeyForTesting();
		delete process.env.PROXY_SESSION_SECRET;
		delete process.env.JWT_SECRET;
	});

	test("resolves from PROXY_SESSION_SECRET env var", async () => {
		process.env.PROXY_SESSION_SECRET = "my-session-secret";
		const key = await resolveSessionSecret(null, "default");
		expect(key).toBe("my-session-secret");
	});

	test("resolves from JWT_SECRET env var", async () => {
		process.env.JWT_SECRET = "my-jwt-secret";
		const key = await resolveSessionSecret(null, "default");
		expect(key).toBe("my-jwt-secret");
	});

	test("prefers PROXY_SESSION_SECRET over JWT_SECRET", async () => {
		process.env.PROXY_SESSION_SECRET = "session-key";
		process.env.JWT_SECRET = "jwt-key";
		const key = await resolveSessionSecret(null, "default");
		expect(key).toBe("session-key");
	});

	test("generates random key when no env vars and no k8s API", async () => {
		const key = await resolveSessionSecret(null, "default");
		expect(key.length).toBe(64); // 32 random bytes → 64 hex chars
	});

	test("caches key across calls", async () => {
		const key1 = await resolveSessionSecret(null, "default");
		const key2 = await resolveSessionSecret(null, "default");
		expect(key1).toBe(key2);
	});
});
