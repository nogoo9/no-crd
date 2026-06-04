import { readFileSync } from "node:fs";

// Get the commit message file path from arguments
const commitMsgFile = process.argv[2];
if (!commitMsgFile) {
	console.error("Error: Please provide a commit message file path.");
	process.exit(1);
}

// Read the commit message
let commitMsg: string;
try {
	commitMsg = readFileSync(commitMsgFile, "utf8");
} catch (err: any) {
	console.error(`Error reading commit message file: ${err.message}`);
	process.exit(1);
}

// Remove trailing whitespace and split into lines
const rawLines = commitMsg.trim().split("\n");
// Filter out git comment lines (starting with #)
const lines = rawLines.filter((line) => !line.trim().startsWith("#"));

if (lines.length === 0 || lines[0].trim() === "") {
	console.error("Error: Commit message cannot be empty.");
	process.exit(1);
}

const subject = lines[0].trim();

// Regex for Conventional Commits
// e.g., feat(spawner)!: add limits
// type: feat, fix, docs, refactor, perf, test, chore, ci, style, revert
const commitRegex =
	/^(feat|fix|docs|refactor|perf|test|chore|ci|style|revert)(?:\([a-z0-9_.-]+\))?!?:\s.+$/i;

if (!commitRegex.test(subject)) {
	console.error(
		"\x1b[31mError: Commit message subject does not match the Conventional Commits specification.\x1b[0m",
	);
	console.error("\nExpected format:");
	console.error("  <type>(<scope>)<optional !>: <description>");
	console.error("\nValid types:");
	console.error(
		"  feat, fix, docs, refactor, perf, test, chore, ci, style, revert",
	);
	console.error("\nExample:");
	console.error("  feat(spawner): implement CPU limits");
	console.error("  fix: resolve memory leak in k8s client\n");
	console.error(`Received subject: "${subject}"`);
	process.exit(1);
}

if (subject.length > 72) {
	console.error(
		`\x1b[31mError: Commit message subject line exceeds 72 characters (${subject.length} chars).\x1b[0m`,
	);
	console.error(`Subject: "${subject}"`);
	process.exit(1);
}

// Check for empty line separating header and body if a body exists
if (lines.length > 1) {
	// The second line (index 1) of the message (ignoring comments) should be empty if there are further lines
	const secondLine = lines[1].trim();
	if (secondLine !== "" && lines.slice(1).some((line) => line.trim() !== "")) {
		console.error(
			"\x1b[31mError: Subject line must be separated from the body/footer by a blank line.\x1b[0m",
		);
		process.exit(1);
	}
}

console.log("\x1b[32m✔ Commit message validation passed.\x1b[0m");
process.exit(0);
