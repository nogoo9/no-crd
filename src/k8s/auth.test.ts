import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	extractAdminRole,
	extractTokenFromCookie,
	extractUserIdentity,
	hasRequiredRole,
	hasRequiredScope,
	isAdminUser,
	verifyAccessOrThrow,
	verifyScopeOrThrow,
	verifyToken,
} from "./auth.js";

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

describe("extractAdminRole", () => {
	test("returns true if role is present in array", () => {
		const payload = { realm_access: { roles: ["user", "nogoo9-admin"] } };
		expect(
			extractAdminRole(payload, "$.realm_access.roles", "nogoo9-admin"),
		).toBe(true);
	});

	test("returns false if role is not present in array", () => {
		const payload = { realm_access: { roles: ["user"] } };
		expect(
			extractAdminRole(payload, "$.realm_access.roles", "nogoo9-admin"),
		).toBe(false);
	});

	test("returns true if role matches string", () => {
		const payload = { realm_access: { roles: "nogoo9-admin" } };
		expect(
			extractAdminRole(payload, "$.realm_access.roles", "nogoo9-admin"),
		).toBe(true);
	});

	test("returns false if JSONPath match fails", () => {
		const payload = {};
		expect(
			extractAdminRole(payload, "$.realm_access.roles", "nogoo9-admin"),
		).toBe(false);
	});
});

describe("extractTokenFromCookie", () => {
	test("extracts cookie correctly", () => {
		const cookie = "nocr_token=abc-123; other=xyz";
		expect(extractTokenFromCookie(cookie, "nocr_token")).toBe("abc-123");
	});

	test("returns undefined if cookie missing", () => {
		const cookie = "other=xyz";
		expect(extractTokenFromCookie(cookie, "nocr_token")).toBeUndefined();
	});

	test("returns undefined if cookie header empty", () => {
		expect(extractTokenFromCookie(null, "nocr_token")).toBeUndefined();
	});
});

describe("hasRequiredScope", () => {
	test("returns true if no scope is required", () => {
		expect(hasRequiredScope({}, undefined)).toBe(true);
		expect(hasRequiredScope({}, "")).toBe(true);
	});

	test("returns false if payload is null or invalid", () => {
		expect(hasRequiredScope(null, "mcp:read")).toBe(false);
		expect(hasRequiredScope("invalid", "mcp:read")).toBe(false);
	});

	test("checks space-separated scope string", () => {
		const payload = { scope: "openid profile mcp:read" };
		expect(hasRequiredScope(payload, "mcp:read")).toBe(true);
		expect(hasRequiredScope(payload, "mcp:write")).toBe(false);
	});

	test("checks array scope list", () => {
		const payload = { scope: ["openid", "profile", "mcp:read"] };
		expect(hasRequiredScope(payload, "mcp:read")).toBe(true);
		expect(hasRequiredScope(payload, "mcp:write")).toBe(false);
	});

	test("checks scp fallback", () => {
		const payload = { scp: "openid profile mcp:read" };
		expect(hasRequiredScope(payload, "mcp:read")).toBe(true);
	});

	test("checks custom JSONPath claim location", () => {
		const payload = { custom: { myScope: "mcp:read" } };
		expect(hasRequiredScope(payload, "mcp:read", "$.custom.myScope")).toBe(
			true,
		);
		expect(hasRequiredScope(payload, "mcp:write", "$.custom.myScope")).toBe(
			false,
		);
	});
});

describe("verifyScopeOrThrow", () => {
	test("does not throw if valid scope", () => {
		const payload = { scope: "mcp:read" };
		expect(() => verifyScopeOrThrow(payload, "mcp:read")).not.toThrow();
	});

	test("throws if invalid scope", () => {
		const payload = { scope: "mcp:read" };
		expect(() => verifyScopeOrThrow(payload, "mcp:write")).toThrow(
			"Forbidden: Missing required scope: mcp:write",
		);
	});
});

describe("hasRequiredRole", () => {
	test("returns true if no role required", () => {
		expect(hasRequiredRole({ roles: ["user"] })).toBe(true);
	});

	test("returns false if invalid payload", () => {
		expect(hasRequiredRole(null, "admin")).toBe(false);
	});

	test("returns true if user is admin (bypass)", () => {
		const payload = { realm_access: { roles: ["admin"] } };
		expect(hasRequiredRole(payload, "some-other-role")).toBe(true);
	});

	test("checks space/comma-separated role string", () => {
		const payload = { roles: "user,admin viewer" };
		expect(hasRequiredRole(payload, "admin", "$.roles")).toBe(true);
		expect(hasRequiredRole(payload, "viewer", "$.roles")).toBe(true);
		expect(hasRequiredRole(payload, "other", "$.roles")).toBe(false);
	});

	test("checks array role list", () => {
		const payload = { roles: ["user", "admin"] };
		expect(hasRequiredRole(payload, "admin", "$.roles")).toBe(true);
		expect(hasRequiredRole(payload, "other", "$.roles")).toBe(false);
	});

	test("checks $.realm_access.roles default fallback", () => {
		const payload = { realm_access: { roles: ["mcp-reader"] } };
		expect(hasRequiredRole(payload, "mcp-reader")).toBe(true);
	});

	test("checks direct properties fallback", () => {
		const payload = { roles: ["reader"] };
		expect(hasRequiredRole(payload, "reader")).toBe(true);
	});
});

describe("verifyAccessOrThrow", () => {
	beforeEach(() => {
		process.env.AUTH_REQUIRED_READ_SCOPE = "read-scope";
		process.env.AUTH_REQUIRED_WRITE_SCOPE = "write-scope";
		process.env.AUTH_REQUIRED_READ_ROLE = "read-role";
		process.env.AUTH_REQUIRED_WRITE_ROLE = "write-role";
	});

	afterEach(() => {
		delete process.env.AUTH_REQUIRED_READ_SCOPE;
		delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
		delete process.env.AUTH_REQUIRED_READ_ROLE;
		delete process.env.AUTH_REQUIRED_WRITE_ROLE;
	});

	test("passes if both scope and role are valid", () => {
		const payload = {
			scope: "read-scope",
			realm_access: { roles: ["read-role"] },
		};
		expect(() => verifyAccessOrThrow(payload, "read")).not.toThrow();
	});

	test("throws if scope is missing", () => {
		const payload = {
			scope: "other-scope",
			realm_access: { roles: ["read-role"] },
		};
		expect(() => verifyAccessOrThrow(payload, "read")).toThrow(
			"Missing required scope",
		);
	});

	test("throws if role is missing", () => {
		const payload = {
			scope: "read-scope",
			realm_access: { roles: ["other-role"] },
		};
		expect(() => verifyAccessOrThrow(payload, "read")).toThrow(
			"Missing required role",
		);
	});

	test("allows admin to bypass missing role check", () => {
		const payload = {
			scope: "read-scope",
			realm_access: { roles: ["admin"] },
		};
		expect(() => verifyAccessOrThrow(payload, "read")).not.toThrow();
	});

	test("passes if scope claim is completely missing but role is valid (scope bypass)", () => {
		const payload = {
			realm_access: { roles: ["read-role"] },
		};
		expect(() => verifyAccessOrThrow(payload, "read")).not.toThrow();
	});

	test("throws if role claim is completely missing but scope is valid", () => {
		const payload = {
			scope: "read-scope",
		};
		expect(() => verifyAccessOrThrow(payload, "read")).toThrow(
			"Forbidden: Missing required role: read-role",
		);
	});
});

describe("verifyToken with local JWKS file", () => {
	let tempJwksFile: string;

	beforeEach(() => {
		tempJwksFile = `./scratch-jwks-${Date.now()}.json`;
	});

	afterEach(() => {
		try {
			const { unlinkSync } = require("node:fs");
			unlinkSync(tempJwksFile);
		} catch (_) {}
		delete process.env.JWKS_URI;
		delete process.env.JWT_AUDIENCE;
	});

	test("verifies token using local JWKS file and file:// URL", async () => {
		// 1. Generate an RS256 key pair
		const keyPair = await crypto.subtle.generateKey(
			{
				name: "RSASSA-PKCS1-v1_5",
				modulusLength: 2048,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: { name: "SHA-256" },
			},
			true,
			["sign", "verify"],
		);

		// 2. Export public key as JWK
		const jwk = (await crypto.subtle.exportKey(
			"jwk",
			keyPair.publicKey,
		)) as any;
		jwk.kid = "test-key-id";
		jwk.alg = "RS256";

		// 3. Write JWKS to local file
		const jwks = { keys: [jwk] };
		const { writeFileSync } = require("node:fs");
		writeFileSync(tempJwksFile, JSON.stringify(jwks));

		// 4. Create a signed JWT
		const header = { alg: "RS256", kid: "test-key-id" };
		const payload = {
			sub: "user-123",
			aud: "http://test-audience",
			exp: Math.floor(Date.now() / 1000) + 300,
		};

		const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
		const payloadB64 = Buffer.from(JSON.stringify(payload)).toString(
			"base64url",
		);
		const dataToSign = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

		const signatureBuffer = await crypto.subtle.sign(
			"RSASSA-PKCS1-v1_5",
			keyPair.privateKey,
			dataToSign,
		);
		const signatureB64 = Buffer.from(signatureBuffer).toString("base64url");
		const token = `${headerB64}.${payloadB64}.${signatureB64}`;

		// 5. Verify using the local JWKS file path
		process.env.JWKS_URI = tempJwksFile;
		process.env.JWT_AUDIENCE = "http://test-audience";

		const decoded = await verifyToken(token, "http://test-audience");
		expect(decoded.sub).toBe("user-123");

		// Test using file:// prefix as well
		const { resolve } = require("node:path");
		process.env.JWKS_URI = `file://${resolve(tempJwksFile)}`;

		const decoded2 = await verifyToken(token, "http://test-audience");
		expect(decoded2.sub).toBe("user-123");
	});
});

describe("defaultRole fallback checks", () => {
	beforeEach(() => {
		process.env.AUTH_DEFAULT_ROLE = "viewer";
	});

	afterEach(() => {
		delete process.env.AUTH_DEFAULT_ROLE;
	});

	test("hasRequiredRole returns true if role is missing but requested role is the default role", () => {
		const payload = {}; // missing role completely
		expect(hasRequiredRole(payload, "viewer")).toBe(true);
		expect(hasRequiredRole(payload, "admin")).toBe(false);
	});

	test("hasRequiredScope returns true if scope is missing completely (bypassed)", () => {
		const payload = {}; // missing scope completely
		expect(hasRequiredScope(payload, "viewer")).toBe(true);
		expect(hasRequiredScope(payload, "read")).toBe(true);
	});
});

describe("admin scope and access hierarchy", () => {
	beforeEach(() => {
		process.env.AUTH_ADMIN_ROLE = "admin";
		process.env.AUTH_REQUIRED_ADMIN_SCOPE = "nogoo9:admin";
		process.env.AUTH_REQUIRED_READ_SCOPE = "nogoo9:read";
		process.env.AUTH_REQUIRED_WRITE_SCOPE = "nogoo9:write";
		process.env.AUTH_REQUIRED_READ_ROLE = "viewer";
		process.env.AUTH_REQUIRED_WRITE_ROLE = "user";
	});

	afterEach(() => {
		delete process.env.AUTH_ADMIN_ROLE;
		delete process.env.AUTH_REQUIRED_ADMIN_SCOPE;
		delete process.env.AUTH_REQUIRED_READ_SCOPE;
		delete process.env.AUTH_REQUIRED_WRITE_SCOPE;
		delete process.env.AUTH_REQUIRED_READ_ROLE;
		delete process.env.AUTH_REQUIRED_WRITE_ROLE;
	});

	test("verifyAccessOrThrow(payload, 'admin') passes if both admin role and admin scope are present", () => {
		const payload = {
			scope: "nogoo9:admin",
			realm_access: { roles: ["admin"] },
		};
		expect(() => verifyAccessOrThrow(payload, "admin")).not.toThrow();
	});

	test("verifyAccessOrThrow(payload, 'admin') throws if admin role is present but admin scope is missing", () => {
		const payload = {
			scope: "nogoo9:read",
			realm_access: { roles: ["admin"] },
		};
		expect(() => verifyAccessOrThrow(payload, "admin")).toThrow(
			"Forbidden: Missing required scope: nogoo9:admin",
		);
	});

	test("verifyAccessOrThrow(payload, 'admin') throws if admin scope is present but admin role is missing", () => {
		const payload = {
			scope: "nogoo9:admin",
			realm_access: { roles: ["user"] },
		};
		expect(() => verifyAccessOrThrow(payload, "admin")).toThrow(
			"Forbidden: Missing required role: admin",
		);
	});

	test("verifyAccessOrThrow(payload, 'admin') passes if admin scope is missing completely but admin role is present (scope bypass)", () => {
		const payload = {
			realm_access: { roles: ["admin"] },
		};
		expect(() => verifyAccessOrThrow(payload, "admin")).not.toThrow();
	});

	test("verifyAccessOrThrow(payload, 'admin') throws if admin scope is present but role is missing completely", () => {
		const payload = {
			scope: "nogoo9:admin",
		};
		expect(() => verifyAccessOrThrow(payload, "admin")).toThrow(
			"Forbidden: Missing required role: admin",
		);
	});

	describe("AUTH_ADMIN_USERS whitelist workaround", () => {
		const origAdminUsers = process.env.AUTH_ADMIN_USERS;

		afterEach(() => {
			if (origAdminUsers !== undefined) {
				process.env.AUTH_ADMIN_USERS = origAdminUsers;
			} else {
				delete process.env.AUTH_ADMIN_USERS;
			}
		});

		test("whitelisted user sub bypasses scope and role checks for admin access", () => {
			process.env.AUTH_ADMIN_USERS = "whitelisted-sub-123, other-admin";
			const payload = { sub: "whitelisted-sub-123" };
			expect(() => verifyAccessOrThrow(payload, "admin")).not.toThrow();
			expect(isAdminUser(payload)).toBe(true);
		});

		test("non-whitelisted user sub is rejected if missing admin scope and role", () => {
			process.env.AUTH_ADMIN_USERS = "whitelisted-sub-123, other-admin";
			const payload = { sub: "regular-user-456" };
			expect(() => verifyAccessOrThrow(payload, "admin")).toThrow("Forbidden:");
			expect(isAdminUser(payload)).toBe(false);
		});
	});

	test("hasRequiredScope allows nogoo9:admin to satisfy nogoo9:read and nogoo9:write checks", () => {
		const payload = { scope: "nogoo9:admin" };
		expect(hasRequiredScope(payload, "nogoo9:read")).toBe(true);
		expect(hasRequiredScope(payload, "nogoo9:write")).toBe(true);
	});

	test("hasRequiredScope allows nogoo9:write to satisfy nogoo9:read checks", () => {
		const payload = { scope: "nogoo9:write" };
		expect(hasRequiredScope(payload, "nogoo9:read")).toBe(true);
	});

	describe("granular matrix combinations (ADR-020)", () => {
		test("Missing scope + viewer role + workspace:write -> Allowed", () => {
			const payload = { realm_access: { roles: ["viewer"] } };
			expect(() =>
				verifyAccessOrThrow(payload, "workspace:write"),
			).not.toThrow();
		});

		test("nogoo9:read scope + viewer role + workspace:write -> Blocked", () => {
			const payload = {
				scope: "nogoo9:read",
				realm_access: { roles: ["viewer"] },
			};
			expect(() => verifyAccessOrThrow(payload, "workspace:write")).toThrow(
				"Forbidden: Missing required scope: nogoo9:write",
			);
		});

		test("nogoo9:write scope + viewer role + workspace:write -> Allowed", () => {
			const payload = {
				scope: "nogoo9:write",
				realm_access: { roles: ["viewer"] },
			};
			expect(() =>
				verifyAccessOrThrow(payload, "workspace:write"),
			).not.toThrow();
		});

		test("nogoo9:write scope + viewer role + template:create -> Blocked", () => {
			const payload = {
				scope: "nogoo9:write",
				realm_access: { roles: ["viewer"] },
			};
			expect(() => verifyAccessOrThrow(payload, "template:create")).toThrow(
				"Forbidden: Missing required role: user",
			);
		});

		test("nogoo9:write scope + user role + template:create -> Allowed", () => {
			const payload = {
				scope: "nogoo9:write",
				realm_access: { roles: ["user"] },
			};
			expect(() =>
				verifyAccessOrThrow(payload, "template:create"),
			).not.toThrow();
		});

		test("nogoo9:write scope + user role + template:write -> Allowed", () => {
			const payload = {
				scope: "nogoo9:write",
				realm_access: { roles: ["user"] },
			};
			expect(() =>
				verifyAccessOrThrow(payload, "template:write"),
			).not.toThrow();
		});

		test("nogoo9:admin scope + admin role + workspace:write -> Allowed", () => {
			const payload = {
				scope: "nogoo9:admin",
				realm_access: { roles: ["admin"] },
			};
			expect(() =>
				verifyAccessOrThrow(payload, "workspace:write"),
			).not.toThrow();
		});

		test("nogoo9:admin scope + user role + admin -> Blocked", () => {
			const payload = {
				scope: "nogoo9:admin",
				realm_access: { roles: ["user"] },
			};
			expect(() => verifyAccessOrThrow(payload, "admin")).toThrow(
				"Forbidden: Missing required role: admin",
			);
		});

		test("nogoo9:write scope + admin role + admin -> Blocked", () => {
			const payload = {
				scope: "nogoo9:write",
				realm_access: { roles: ["admin"] },
			};
			expect(() => verifyAccessOrThrow(payload, "admin")).toThrow(
				"Forbidden: Missing required scope: nogoo9:admin",
			);
		});
	});
});
