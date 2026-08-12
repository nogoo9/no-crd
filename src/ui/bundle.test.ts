// Ensure global browser primitives exist for Bun runtime microtasks
if (typeof (globalThis as any).File === "undefined") {
	(globalThis as any).File = class File {};
}

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("Bundled Admin UI", () => {
	const uiPath = join(process.cwd(), "dist", "ui", "index.html");

	test("dist/ui/index.html exists and contains essential HTML structure", () => {
		expect(existsSync(uiPath)).toBe(true);
		const html = readFileSync(uiPath, "utf-8");
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain('<div id="root"></div>');
		expect(html).toContain('<script type="module">');
	});

	test("bundled JavaScript has valid syntax and no top-level export statements", () => {
		const html = readFileSync(uiPath, "utf-8");
		const scriptMatch = html.match(
			/<script type="module">([\s\S]*?)<\/script>/i,
		);
		expect(scriptMatch).not.toBeNull();
		const bundledJs = scriptMatch?.[1] || "";

		expect(bundledJs.length).toBeGreaterThan(1000);
		// Ensure no standalone top-level export statements breaking non-module/standard scope
		expect(bundledJs).not.toMatch(/\bexport\s*\{/);
	});

	test("bundled JavaScript compiles without SyntaxError or parse errors", () => {
		const html = readFileSync(uiPath, "utf-8");
		const scriptMatch = html.match(
			/<script type="module">([\s\S]*?)<\/script>/i,
		);
		const bundledJs = scriptMatch?.[1] || "";

		expect(bundledJs.length).toBeGreaterThan(1000);
		// Verify JavaScript compiles clean without SyntaxError
		expect(() => new Function(bundledJs)).not.toThrow();
	});
});
