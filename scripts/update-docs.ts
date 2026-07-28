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
		const relativePathToDocsRoot = path.relative(
			path.dirname(filePath),
			path.join(process.cwd(), "docs"),
		);
		const prefix = relativePathToDocsRoot
			? `${relativePathToDocsRoot}/decisions/`
			: "./decisions/";
		contentToWrite = content.replaceAll("](docs/decisions/", `](${prefix}`);
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

// 2. Update docs/deploy/rbac-permissions.md with permissions
const permissionsDocPath = path.join(
	process.cwd(),
	"docs/deploy/rbac-permissions.md",
);
replaceInFile(
	permissionsDocPath,
	"<!-- PERMISSIONS_TABLE_START -->",
	"<!-- PERMISSIONS_TABLE_END -->",
	permissionsMarkdown,
);

// 3. Update docs/deploy/configuration.md with configuration
const configurationDocPath = path.join(
	process.cwd(),
	"docs/deploy/configuration.md",
);
replaceInFile(
	configurationDocPath,
	"<!-- CONFIG_TABLES_START -->",
	"<!-- CONFIG_TABLES_END -->",
	configMarkdown,
);

// 4. Update docs/deploy/workspace-customization.md with annotations
const workspaceCustomizationDocPath = path.join(
	process.cwd(),
	"docs/deploy/workspace-customization.md",
);
replaceInFile(
	workspaceCustomizationDocPath,
	"<!-- TEMPLATE_ANNOTATIONS_TABLE_START -->",
	"<!-- TEMPLATE_ANNOTATIONS_TABLE_END -->",
	annotationsMarkdown,
);

// ==========================================
// Part 4: Auto-Discover & Sync ADRs in VitePress Config
// ==========================================

function syncAdrs(): void {
	const decisionsDir = path.join(process.cwd(), "docs/decisions");
	const configPath = path.join(process.cwd(), "docs/.vitepress/config.ts");

	if (!fs.existsSync(decisionsDir) || !fs.existsSync(configPath)) {
		return;
	}

	const files = fs
		.readdirSync(decisionsDir)
		.filter((f) => f.startsWith("ADR-") && f.endsWith(".md"))
		.sort((a, b) => {
			const numA = Number.parseInt(a.match(/ADR-(\d+)/)?.[1] || "0", 10);
			const numB = Number.parseInt(b.match(/ADR-(\d+)/)?.[1] || "0", 10);
			return numA - numB;
		});

	const adrItems: { text: string; link: string }[] = [
		{ text: "Overview", link: "/decisions/" },
	];

	for (const file of files) {
		const filePath = path.join(decisionsDir, file);
		const content = fs.readFileSync(filePath, "utf-8");
		const match = content.match(/^# (ADR-\d+:\s*.+)/m);
		let fullTitle = match ? match[1].trim() : file.replace(".md", "");

		// Remove inline code formatting markers if any
		fullTitle = fullTitle.replace(/`([^`]+)`/g, "$1");

		const link = `/decisions/${file.replace(/\.md$/, "")}`;
		adrItems.push({
			text: fullTitle,
			link,
		});
	}

	const configContent = fs.readFileSync(configPath, "utf-8");
	const startMarker = 'text: "Architecture Decisions",';
	const startIndex = configContent.indexOf(startMarker);
	if (startIndex === -1) {
		console.warn(
			"Warning: Could not find Architecture Decisions section in docs/.vitepress/config.ts",
		);
		return;
	}

	const itemsStart = configContent.indexOf("items: [", startIndex);
	if (itemsStart === -1) return;

	const itemsEnd = configContent.indexOf("],", itemsStart);
	if (itemsEnd === -1) return;

	const formattedItems = adrItems
		.map(
			(item) =>
				`						{\n\t\t\t\t\t\t\ttext: ${JSON.stringify(item.text)},\n\t\t\t\t\t\t\tlink: ${JSON.stringify(item.link)},\n\t\t\t\t\t\t},`,
		)
		.join("\n");

	const newConfigContent = `${configContent.slice(0, itemsStart + "items: [\n".length)}${formattedItems}\n${configContent.slice(itemsEnd)}`;

	fs.writeFileSync(configPath, newConfigContent, "utf-8");
	console.log(
		`Synced ${files.length} ADRs to docs/.vitepress/config.ts sidebar.`,
	);
}

syncAdrs();
