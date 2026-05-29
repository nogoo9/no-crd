import fs from "node:fs";
import path from "node:path";
import { ANNOTATION_METADATA, CONFIG_METADATA } from "../src/config/index.js";
import { REQUIRED_PERMISSIONS } from "../src/k8s/permissions.js";

// ==========================================
// Part 1: Kubernetes RBAC Permissions Table
// ==========================================

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

const permissionsMarkdown = mdBlocks.join("\n");

// ==========================================
// Part 2: Configuration & Environment Variables
// ==========================================

// Generate the configuration Markdown
const configBlocks: string[] = [];

for (const group of CONFIG_METADATA) {
	configBlocks.push(`### ${group.emoji} ${group.title}`);
	configBlocks.push("");
	configBlocks.push(
		"| CLI Option | Environment Variable | Default | Allowed Values | Description |",
	);
	configBlocks.push("|---|---|---|---|---|");

	for (const p of group.params) {
		configBlocks.push(
			`| ${p.cli} | ${p.env} | ${p.defaultVal} | ${p.allowed} | ${p.description} |`,
		);
	}
	configBlocks.push("");
}

const configMarkdown = configBlocks.join("\n");

// ==========================================
// Part 2.5: Template Annotations & Labels
// ==========================================

// Generate annotations Markdown
const annotationBlocks: string[] = [
	"| Annotation / Label Key | Type | Description |",
	"|---|---|---|",
];
for (const p of ANNOTATION_METADATA) {
	annotationBlocks.push(`| ${p.key} | ${p.type} | ${p.description} |`);
}
const annotationsMarkdown = annotationBlocks.join("\n");

// ==========================================
// Part 3: Write Updates to Markdown Files
// ==========================================

function replaceInFile(
	filePath: string,
	startMarker: string,
	endMarker: string,
	content: string,
): void {
	if (!fs.existsSync(filePath)) {
		console.warn(`Warning: File not found: ${filePath}`);
		return;
	}

	let fileContent = fs.readFileSync(filePath, "utf-8");
	const regex = new RegExp(`(${startMarker})([\\s\\S]*?)(${endMarker})`);

	let contentToWrite = content;
	// Resolve relative links inside docs subdirectories to prevent dead links in VitePress
	if (filePath.includes("/docs/") || filePath.startsWith("docs/")) {
		contentToWrite = content.replaceAll("](docs/decisions/", "](./decisions/");
	}

	if (regex.test(fileContent)) {
		fileContent = fileContent.replace(regex, `$1\n\n${contentToWrite}\n\n$3`);
		fs.writeFileSync(filePath, fileContent, "utf-8");
		console.log(`Updated ${path.basename(filePath)} placeholders.`);
	} else {
		console.warn(
			`Warning: Could not find placeholders ${startMarker} in ${filePath}`,
		);
	}
}

// 1. Update README.md with permissions, configuration & annotations
const readmePath = path.join(process.cwd(), "README.md");
replaceInFile(
	readmePath,
	"<!-- PERMISSIONS_TABLE_START -->",
	"<!-- PERMISSIONS_TABLE_END -->",
	permissionsMarkdown,
);
replaceInFile(
	readmePath,
	"<!-- CONFIG_TABLES_START -->",
	"<!-- CONFIG_TABLES_END -->",
	configMarkdown,
);
replaceInFile(
	readmePath,
	"<!-- TEMPLATE_ANNOTATIONS_TABLE_START -->",
	"<!-- TEMPLATE_ANNOTATIONS_TABLE_END -->",
	annotationsMarkdown,
);

// 2. Update docs/permissions.md with permissions
const permissionsDocPath = path.join(process.cwd(), "docs/permissions.md");
replaceInFile(
	permissionsDocPath,
	"<!-- PERMISSIONS_TABLE_START -->",
	"<!-- PERMISSIONS_TABLE_END -->",
	permissionsMarkdown,
);

// 3. Update docs/getting-started.md with configuration
const gettingStartedDocPath = path.join(
	process.cwd(),
	"docs/getting-started.md",
);
replaceInFile(
	gettingStartedDocPath,
	"<!-- CONFIG_TABLES_START -->",
	"<!-- CONFIG_TABLES_END -->",
	configMarkdown,
);

// 4. Update docs/pod-templates.md with annotations
const podTemplatesDocPath = path.join(process.cwd(), "docs/pod-templates.md");
replaceInFile(
	podTemplatesDocPath,
	"<!-- TEMPLATE_ANNOTATIONS_TABLE_START -->",
	"<!-- TEMPLATE_ANNOTATIONS_TABLE_END -->",
	annotationsMarkdown,
);

// 5. Update docs/spawner-guide.md with annotations
const spawnerGuideDocPath = path.join(process.cwd(), "docs/spawner-guide.md");
replaceInFile(
	spawnerGuideDocPath,
	"<!-- TEMPLATE_ANNOTATIONS_TABLE_START -->",
	"<!-- TEMPLATE_ANNOTATIONS_TABLE_END -->",
	annotationsMarkdown,
);
