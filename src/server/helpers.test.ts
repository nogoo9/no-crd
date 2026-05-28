import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
	CORS_HEADERS,
	getBasePrefix,
	getCorsHeaders,
	getRequestHostAndProto,
	readThemeCssFile,
	scanThemeDir,
	setCorsHeaders,
	themeDisplayName,
	uuidv7,
} from "./helpers.js";

describe("Server Helpers", () => {
	describe("getBasePrefix", () => {
		beforeEach(() => {
			delete process.env.BASE_URL;
		});

		afterEach(() => {
			delete process.env.BASE_URL;
		});

		test("returns empty string when BASE_URL is not set", () => {
			expect(getBasePrefix()).toBe("");
		});

		test("adds leading slash and strips trailing slash from BASE_URL", () => {
			process.env.BASE_URL = "my-prefix/";
			expect(getBasePrefix()).toBe("/my-prefix");

			process.env.BASE_URL = "/another-prefix/";
			expect(getBasePrefix()).toBe("/another-prefix");

			process.env.BASE_URL = "deep/nested/path";
			expect(getBasePrefix()).toBe("/deep/nested/path");
		});
	});

	describe("getRequestHostAndProto", () => {
		test("extracts host and proto from headers or request fields", () => {
			const req1 = {
				headers: {
					host: "example.com",
				},
				protocol: "https",
			};
			expect(getRequestHostAndProto(req1)).toEqual({
				host: "example.com",
				proto: "https",
			});

			const req2 = {
				headers: {
					"x-forwarded-host": "forwarded.com",
					"x-forwarded-proto": "https",
					host: "original.com",
				},
				protocol: "http",
			};
			expect(getRequestHostAndProto(req2)).toEqual({
				host: "forwarded.com",
				proto: "https",
			});

			const req3 = {
				headers: {},
				protocol: "ws",
			};
			expect(getRequestHostAndProto(req3)).toEqual({
				host: "localhost",
				proto: "http",
			});

			const req4 = {
				headers: {},
				protocol: "wss",
			};
			expect(getRequestHostAndProto(req4)).toEqual({
				host: "localhost",
				proto: "https",
			});
		});
	});

	describe("CORS helpers", () => {
		beforeEach(() => {
			delete process.env.CORS_ALLOWED_ORIGIN;
			delete process.env.CORS_ALLOWED_METHODS;
			delete process.env.CORS_ALLOWED_HEADERS;
			delete process.env.CORS_ALLOW_CREDENTIALS;
			delete process.env.CORS_EXPOSED_HEADERS;
			delete process.env.CORS_MAX_AGE;
		});

		afterEach(() => {
			delete process.env.CORS_ALLOWED_ORIGIN;
			delete process.env.CORS_ALLOWED_METHODS;
			delete process.env.CORS_ALLOWED_HEADERS;
			delete process.env.CORS_ALLOW_CREDENTIALS;
			delete process.env.CORS_EXPOSED_HEADERS;
			delete process.env.CORS_MAX_AGE;
		});

		test("getCorsHeaders returns default values", () => {
			const headers = getCorsHeaders();
			expect(headers["Access-Control-Allow-Origin"]).toBe("*");
			expect(headers["Access-Control-Allow-Methods"]).toBe(
				"GET, POST, OPTIONS",
			);
			expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
		});

		test("getCorsHeaders reflects environment variables", () => {
			process.env.CORS_ALLOWED_ORIGIN = "https://custom.com";
			process.env.CORS_ALLOWED_METHODS = "GET, PUT";
			process.env.CORS_ALLOW_CREDENTIALS = "true";
			process.env.CORS_MAX_AGE = "3600";

			const headers = getCorsHeaders();
			expect(headers["Access-Control-Allow-Origin"]).toBe("https://custom.com");
			expect(headers["Access-Control-Allow-Methods"]).toBe("GET, PUT");
			expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
			expect(headers["Access-Control-Max-Age"]).toBe("3600");
		});

		test("CORS_HEADERS Proxy accesses properties dynamically", () => {
			expect(CORS_HEADERS["Access-Control-Allow-Origin"]).toBe("*");
			process.env.CORS_ALLOWED_ORIGIN = "https://proxy-test.com";
			expect(CORS_HEADERS["Access-Control-Allow-Origin"]).toBe(
				"https://proxy-test.com",
			);
		});

		test("setCorsHeaders sets headers on response reply", () => {
			const headersSet: Record<string, string> = {};
			const reply = {
				header(key: string, value: string) {
					headersSet[key] = value;
				},
			};
			setCorsHeaders(reply);
			expect(headersSet["Access-Control-Allow-Origin"]).toBeDefined();
			expect(headersSet["Access-Control-Allow-Methods"]).toBeDefined();
		});
	});

	describe("Themes helper functions", () => {
		test("themeDisplayName extracts name or formats ID fallback", () => {
			expect(themeDisplayName("my-cool-theme")).toBe("My Cool Theme");
			expect(themeDisplayName("simple")).toBe("Simple");

			const cssWithComment = `/* Name: Awesome Dark Mode */\n:root { --bg: #000; }`;
			expect(themeDisplayName("awesome-dark", cssWithComment)).toBe(
				"Awesome Dark Mode",
			);

			const cssWithSpacesInComment = `/*   Name:   Sleek Light   */\n:root { --bg: #fff; }`;
			expect(themeDisplayName("sleek", cssWithSpacesInComment)).toBe(
				"Sleek Light",
			);
		});

		test("scanThemeDir and readThemeCssFile", () => {
			const tempDir = path.resolve("./test-helpers-themes-temp");
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir);
			}

			try {
				fs.writeFileSync(
					path.join(tempDir, "theme-a.css"),
					"/* Name: Theme A */\nbody { color: red; }",
				);
				fs.writeFileSync(
					path.join(tempDir, "theme-b.css"),
					"body { color: blue; }",
				);
				fs.writeFileSync(path.join(tempDir, "not-a-theme.txt"), "plain text");

				// Test scanThemeDir
				const seenIds = new Set<string>();
				const themesList: Array<{ id: string; name: string }> = [];
				scanThemeDir(tempDir, seenIds, themesList);

				expect(themesList).toContainEqual({ id: "theme-a", name: "Theme A" });
				expect(themesList).toContainEqual({ id: "theme-b", name: "Theme B" });
				expect(themesList.some((t) => t.id === "not-a-theme")).toBe(false);

				// Test readThemeCssFile
				const contentA = readThemeCssFile(tempDir, "theme-a");
				expect(contentA).toContain("/* Name: Theme A */");

				const contentNonexistent = readThemeCssFile(tempDir, "nonexistent");
				expect(contentNonexistent).toBeNull();

				// Path traversal checks
				const contentTraversal = readThemeCssFile(tempDir, "../package.json");
				expect(contentTraversal).toBeNull();
			} finally {
				try {
					fs.rmSync(tempDir, { recursive: true, force: true });
				} catch (_) {}
			}
		});
	});

	describe("uuidv7", () => {
		test("generates valid UUID v7 compliant format", () => {
			const uuid = uuidv7();
			// UUID v7 structure: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx where y is 8, 9, a, or b
			const regex =
				/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
			expect(regex.test(uuid)).toBe(true);

			// Test uniqueness
			const uuidSet = new Set<string>();
			for (let i = 0; i < 100; i++) {
				const generated = uuidv7();
				expect(uuidSet.has(generated)).toBe(false);
				uuidSet.add(generated);
			}
		});
	});
});
