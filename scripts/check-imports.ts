import fs from "node:fs";
import path from "node:path";

function getAllFiles(dir: string, ext = ".ts"): string[] {
	const files: string[] = [];
	if (!fs.existsSync(dir)) return files;
	for (const file of fs.readdirSync(dir)) {
		const fullPath = path.join(dir, file);
		if (fs.statSync(fullPath).isDirectory()) {
			files.push(...getAllFiles(fullPath, ext));
		} else if (file.endsWith(ext)) {
			files.push(fullPath);
		}
	}
	return files;
}

const srcDir = path.resolve("./src");
const files = getAllFiles(srcDir);
let hasError = false;

// Regex to extract relative or alias import paths:
// Matches: from "~/config.js", from "./helpers.js", import("./mcp.js"), etc.
const importPathRegex =
	/(?:from|import)\s+['"](~\/|\.\.?\/[^'"]*?)['"]|import\(\s*['"](~\/|\.\.?\/[^'"]*?)['"]\s*\)/;

// Allowed trailing extensions for local imports
const allowedExtensions = /\.(?:js|json|yaml|yml|css)$/;

for (const file of files) {
	const content = fs.readFileSync(file, "utf8");
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// Skip commented lines
		if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
			continue;
		}

		const match = line.match(importPathRegex);
		if (match) {
			const importPath = match[1] || match[2];
			const relativeFile = path.relative(process.cwd(), file);

			// Check 1: Disallow parent relative imports (../)
			if (importPath.startsWith("../") || importPath.includes("/../")) {
				console.error(
					`Error: Relative parent import found in ${relativeFile}:${i + 1}`,
				);
				console.error(`  > ${line.trim()}`);
				console.error(
					`  > Please use path alias (e.g. '~/') instead of relative parent paths ('../').\n`,
				);
				hasError = true;
			}

			// Check 2: Require trailing extension (.js, .json, etc.)
			if (!allowedExtensions.test(importPath)) {
				console.error(
					`Error: Missing or invalid file extension in ${relativeFile}:${i + 1}`,
				);
				console.error(`  > ${line.trim()}`);
				console.error(
					`  > ESM imports must have a trailing file extension (e.g. '.js', '.json').\n`,
				);
				hasError = true;
			}
		}
	}
}

if (hasError) {
	console.error(
		"Check failed: Please fix the import path violations listed above.",
	);
	process.exit(1);
} else {
	console.log(
		"Success: All local imports are using path aliases and trailing file extensions correctly.",
	);
	process.exit(0);
}
