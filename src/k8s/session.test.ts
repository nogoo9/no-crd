import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	_resetSessionKeyForTesting,
	createSessionCookie,
	decryptRefreshToken,
	encryptRefreshToken,
	extractSessionCookieUserSub,
	reconstructSessionPayload,
	resolveSessionSecret,
	type SessionPayload,
	setJsonPathValue,
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

describe("encryptRefreshToken & decryptRefreshToken", () => {
	test("successfully encrypts and decrypts a token (round-trip)", () => {
		const originalToken = "my-secret-refresh-token-12345!@#";
		const encrypted = encryptRefreshToken(originalToken, TEST_SECRET);
		expect(encrypted).not.toBe(originalToken);
		expect(encrypted).toContain(".");
		expect(encrypted.split(".").length).toBe(3); // iv.ciphertext.tag

		const decrypted = decryptRefreshToken(encrypted, TEST_SECRET);
		expect(decrypted).toBe(originalToken);
	});

	test("returns null if ciphertext is tampered", () => {
		const originalToken = "refresh-token";
		const encrypted = encryptRefreshToken(originalToken, TEST_SECRET);
		const parts = encrypted.split(".");
		// Tamper with the ciphertext (middle part)
		parts[1] = `${parts[1]}abc`;
		const tampered = parts.join(".");

		const decrypted = decryptRefreshToken(tampered, TEST_SECRET);
		expect(decrypted).toBeNull();
	});

	test("returns null if wrong secret key is used for decryption", () => {
		const originalToken = "refresh-token";
		const encrypted = encryptRefreshToken(originalToken, TEST_SECRET);

		const decrypted = decryptRefreshToken(
			encrypted,
			"wrong-decryption-key-123",
		);
		expect(decrypted).toBeNull();
	});

	test("returns null for malformed encrypted inputs", () => {
		expect(decryptRefreshToken("no-dots-here", TEST_SECRET)).toBeNull();
		expect(decryptRefreshToken("one.dot", TEST_SECRET)).toBeNull();
		expect(
			decryptRefreshToken("too.many.dots.here.abc", TEST_SECRET),
		).toBeNull();
		expect(decryptRefreshToken("", TEST_SECRET)).toBeNull();
	});
});

describe("setJsonPathValue", () => {
	test("sets a value at flat path", () => {
		const obj: any = {};
		setJsonPathValue(obj, "$.sub", "user-123");
		expect(obj.sub).toBe("user-123");
	});

	test("sets a value at nested path", () => {
		const obj: any = {};
		setJsonPathValue(obj, "$.user.profile.id", "profile-456");
		expect(obj.user?.profile?.id).toBe("profile-456");
	});

	test("sets value on existing object paths", () => {
		const obj: any = { user: { name: "Alice" } };
		setJsonPathValue(obj, "$.user.id", "user-789");
		expect(obj.user.name).toBe("Alice");
		expect(obj.user.id).toBe("user-789");
	});
});

describe("reconstructSessionPayload", () => {
	test("reconstructs standard paths", () => {
		const payload = reconstructSessionPayload("user-1", ["admin"]);
		expect(payload.sub).toBe("user-1");
		expect(payload.realm_access?.roles).toEqual(["admin"]);
	});

	test("reconstructs custom paths based on config", () => {
		const origSub = process.env.AUTH_SUB_JSONPATH;
		const origRoles = process.env.AUTH_ROLES_JSONPATH;

		try {
			process.env.AUTH_SUB_JSONPATH = "$.user.id";
			process.env.AUTH_ROLES_JSONPATH = "$.user.roles";

			const payload = reconstructSessionPayload("user-custom", ["custom-role"]);
			expect(payload.sub).toBe("user-custom");
			expect(payload.realm_access?.roles).toEqual(["custom-role"]);
			expect(payload.user?.id).toBe("user-custom");
			expect(payload.user?.roles).toEqual(["custom-role"]);
		} finally {
			if (origSub !== undefined) {
				process.env.AUTH_SUB_JSONPATH = origSub;
			} else {
				delete process.env.AUTH_SUB_JSONPATH;
			}
			if (origRoles !== undefined) {
				process.env.AUTH_ROLES_JSONPATH = origRoles;
			} else {
				delete process.env.AUTH_ROLES_JSONPATH;
			}
		}
	});
});
