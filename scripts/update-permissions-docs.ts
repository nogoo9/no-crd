import fs from "node:fs";
import path from "node:path";
import { REQUIRED_PERMISSIONS } from "../src/k8s/permissions.js";

// Define human-readable descriptions for each resource + verb combination
const permissionDescriptions: Record<string, string> = {
	"pods:list": "Retrieve lists of pods or agent workspace pods.",
	"pods:get": "Retrieve detailed JSON spec for a specific pod.",
	"pods:create": "Provision and deploy new pods or workspace sandboxes.",
	"pods:delete": "Terminate and clean up pods or workspace sandboxes.",
	"pods:patch":
		"Strategic merge patch labels, annotations, or resource requests/limits.",
	"pods/log:get": "Retrieve standard output/error logs from pod containers.",
	"configmaps:list": "Find ConfigMaps registered as reusable pod templates.",
	"configmaps:get": "Read template pod specifications stored in ConfigMaps.",
	"configmaps:create": "Save a new pod template definition as a ConfigMap.",
	"configmaps:update":
		"Modify metadata, annotations, or specifications of an existing template.",
	"configmaps:delete": "Delete a stored pod template ConfigMap.",
	"namespaces:list":
		"Discover namespaces in the cluster (only required in cluster access mode).",
};

// Group tools by resource and verb
// Structure: Record<Resource, Record<Verb, ToolName[]>>
const grouped: Record<string, Record<string, string[]>> = {};

for (const [tool, perms] of Object.entries(REQUIRED_PERMISSIONS)) {
	for (const p of perms) {
		if (!grouped[p.resource]) {
			grouped[p.resource] = {};
		}
		if (!grouped[p.resource][p.verb]) {
			grouped[p.resource][p.verb] = [];
		}
		if (!grouped[p.resource][p.verb].includes(tool)) {
			grouped[p.resource][p.verb].push(tool);
		}
	}
}

// Generate the grouped Markdown
const mdBlocks: string[] = [];

const sortedResources = Object.keys(grouped).sort();
for (const resource of sortedResources) {
	mdBlocks.push(`### Resource: \`${resource}\``);
	mdBlocks.push("");
	mdBlocks.push(
		"| Required Verb | Associated MCP Tools | Description / Purpose |",
	);
	mdBlocks.push("|---|---|---|");

	const sortedVerbs = Object.keys(grouped[resource]).sort();
	for (const verb of sortedVerbs) {
		const tools = grouped[resource][verb]
			.sort()
			.map((t) => `\`${t}\``)
			.join(", ");
		const descKey = `${resource}:${verb}`;
		const desc = permissionDescriptions[descKey] || "";
		mdBlocks.push(`| \`${verb}\` | ${tools} | ${desc} |`);
	}
	mdBlocks.push("");
}

const markdownContent = mdBlocks.join("\n");

// Replace in README.md
const readmePath = path.join(process.cwd(), "README.md");
if (fs.existsSync(readmePath)) {
	let readmeContent = fs.readFileSync(readmePath, "utf-8");
	const readmeRegex =
		/(<!-- PERMISSIONS_TABLE_START -->)([\s\S]*?)(<!-- PERMISSIONS_TABLE_END -->)/;
	if (readmeRegex.test(readmeContent)) {
		readmeContent = readmeContent.replace(
			readmeRegex,
			`$1\n\n${markdownContent}\n\n$3`,
		);
		fs.writeFileSync(readmePath, readmeContent, "utf-8");
		console.log("Updated README.md with grouped permissions mapping.");
	} else {
		console.warn(
			"Warning: Could not find PERMISSIONS_TABLE placeholders in README.md",
		);
	}
}

// Replace or write to docs/permissions.md
const docsPath = path.join(process.cwd(), "docs/permissions.md");
const docsHeader = `# Kubernetes RBAC Permissions Mapping

This page documents the mapping between the required Kubernetes RBAC permissions (grouped by resource and verb) and the corresponding Model Context Protocol (MCP) tools exposed by \`@nogoo9/no-crd\`.

The server dynamically checks these permissions at startup (unless disabled via \`DISABLE_PERMISSION_CHECKS=true\`) and only enables tools for which the active service account has sufficient RBAC access.

<!-- PERMISSIONS_TABLE_START -->
<!-- PERMISSIONS_TABLE_END -->
`;

let docsContent = docsHeader;
if (fs.existsSync(docsPath)) {
	docsContent = fs.readFileSync(docsPath, "utf-8");
}
const docsRegex =
	/(<!-- PERMISSIONS_TABLE_START -->)([\s\S]*?)(<!-- PERMISSIONS_TABLE_END -->)/;
if (docsRegex.test(docsContent)) {
	docsContent = docsContent.replace(
		docsRegex,
		`$1\n\n${markdownContent}\n\n$3`,
	);
	fs.writeFileSync(docsPath, docsContent, "utf-8");
	console.log("Updated docs/permissions.md with grouped permissions mapping.");
} else {
	console.warn(
		"Warning: Could not find PERMISSIONS_TABLE placeholders in docs/permissions.md",
	);
}
