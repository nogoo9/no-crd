import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "bun";

async function main() {
	console.log("==> Building MCP App Frontend UI...");

	const rootDir = process.cwd();
	const srcHtmlPath = join(rootDir, "src", "ui", "index.template.html");
	const distDir = join(rootDir, "dist", "ui");
	const distHtmlPath = join(distDir, "index.html");

	if (!existsSync(distDir)) {
		mkdirSync(distDir, { recursive: true });
	}

	// 1. Bundle src/ui/app.ts for the browser
	const result = await build({
		entrypoints: [join(rootDir, "src", "ui", "app.ts")],
		target: "browser",
		minify: true,
	});

	if (!result.success) {
		console.error("Failed to build app.ts bundle:", result.logs);
		process.exit(1);
	}

	// Get compiled JS as string
	const bundledJs = await result.outputs[0].text();
	console.log(`==> Bundled app.ts successfully (${bundledJs.length} bytes).`);

	// 2. Read template HTML and inject compiled script
	const htmlTemplate = readFileSync(srcHtmlPath, "utf-8");
	const finalHtml = htmlTemplate.replace(
		"/* COMPILER_PLACEHOLDER */",
		() => bundledJs,
	);

	// 3. Write final HTML to dist/ui/index.html
	writeFileSync(distHtmlPath, finalHtml, "utf-8");
	console.log(`==> Wrote final self-contained UI HTML to ${distHtmlPath}`);
}

main().catch((err) => {
	console.error("UI build failed:", err);
	process.exit(1);
});
