import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	listLocalTemplates,
	parseSpecString,
	parseTemplateContent,
	readLocalTemplate,
} from "./local-templates.js";

const TEST_DIR = join(import.meta.dir, "__test_templates__");

beforeAll(() => {
	mkdirSync(TEST_DIR, { recursive: true });

	// YAML template
	writeFileSync(
		join(TEST_DIR, "workspace-terminal.yaml"),
		`metadata:
  name: workspace-terminal
  annotations:
    nogoo9/description: "Interactive web terminal"
    nogoo9/tag: terminal
    nogoo9/workspace-port: "7681"
spec:
  containers:
    - name: agent
      image: tsl0922/ttyd:latest
`,
	);

	// JSON template
	writeFileSync(
		join(TEST_DIR, "workspace-default.json"),
		JSON.stringify(
			{
				metadata: {
					name: "workspace-default",
					annotations: {
						"nogoo9/description": "Default workspace",
						"nogoo9/tag": "default",
					},
				},
				spec: {
					containers: [{ name: "agent", image: "bun:latest" }],
				},
			},
			null,
			2,
		),
	);

	// .yml extension variant
	writeFileSync(
		join(TEST_DIR, "custom.yml"),
		`metadata:
  name: custom-workspace
spec:
  containers:
    - name: app
      image: node:20
`,
	);

	// Invalid file (no spec)
	writeFileSync(
		join(TEST_DIR, "bad-template.yaml"),
		`metadata:
  name: bad
`,
	);

	// Non-template file (should be skipped)
	writeFileSync(join(TEST_DIR, "README.md"), "# Templates");
});

afterAll(() => {
	rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("parseSpecString", () => {
	test("parses JSON string", () => {
		const result = parseSpecString('{ "containers": [{ "name": "a" }] }');
		expect(result).toEqual({ containers: [{ name: "a" }] });
	});

	test("parses YAML string", () => {
		const result = parseSpecString("containers:\n  - name: a\n");
		expect(result).toEqual({ containers: [{ name: "a" }] });
	});

	test("auto-detects JSON when string starts with {", () => {
		const json = '{"containers": []}';
		expect(parseSpecString(json)).toEqual({ containers: [] });
	});

	test("auto-detects YAML when string does not start with {", () => {
		const yaml = "containers: []";
		expect(parseSpecString(yaml)).toEqual({ containers: [] });
	});

	test("throws on invalid JSON", () => {
		expect(() => parseSpecString("{invalid json")).toThrow();
	});
});

describe("parseTemplateContent", () => {
	test("parses YAML template file", () => {
		const content = `metadata:
  name: test-ws
  annotations:
    nogoo9/description: "A test workspace"
spec:
  containers:
    - name: main
      image: alpine
`;
		const result = parseTemplateContent(content, "test-ws.yaml");
		expect(result.name).toBe("test-ws");
		expect(result.annotations["nogoo9/description"]).toBe("A test workspace");
		expect(result.spec.containers).toBeDefined();
	});

	test("parses JSON template file", () => {
		const content = JSON.stringify({
			metadata: { name: "json-ws", annotations: { "nogoo9/tag": "v1" } },
			spec: { containers: [{ name: "app", image: "node" }] },
		});
		const result = parseTemplateContent(content, "json-ws.json");
		expect(result.name).toBe("json-ws");
		expect(result.annotations["nogoo9/tag"]).toBe("v1");
	});

	test("uses filename as fallback name when metadata.name is missing", () => {
		const content = `metadata:
  annotations: {}
spec:
  containers:
    - name: x
      image: y
`;
		const result = parseTemplateContent(content, "my-template.yaml");
		expect(result.name).toBe("my-template");
	});

	test("throws when spec is missing", () => {
		const content = `metadata:
  name: bad
`;
		expect(() => parseTemplateContent(content, "bad.yaml")).toThrow(
			/missing or invalid 'spec' field/,
		);
	});

	test("throws on invalid JSON content", () => {
		expect(() => parseTemplateContent("{bad json", "bad.json")).toThrow();
	});
});

describe("listLocalTemplates", () => {
	test("lists all valid template files", () => {
		const templates = listLocalTemplates(TEST_DIR);
		const names = templates.map((t) => t.name);
		expect(names).toContain("workspace-terminal");
		expect(names).toContain("workspace-default");
		expect(names).toContain("custom-workspace");
	});

	test("skips invalid template files", () => {
		const templates = listLocalTemplates(TEST_DIR);
		const names = templates.map((t) => t.name);
		expect(names).not.toContain("bad");
	});

	test("skips non-template files", () => {
		const templates = listLocalTemplates(TEST_DIR);
		// README.md should not be parsed
		expect(templates.length).toBe(3);
	});

	test("returns empty array for non-existent directory", () => {
		const templates = listLocalTemplates("/tmp/nonexistent-dir-12345");
		expect(templates).toEqual([]);
	});
});

describe("readLocalTemplate", () => {
	test("reads YAML template by name", () => {
		const tmpl = readLocalTemplate(TEST_DIR, "workspace-terminal");
		expect(tmpl).not.toBeNull();
		expect(tmpl!.name).toBe("workspace-terminal");
		expect(tmpl!.annotations["nogoo9/tag"]).toBe("terminal");
	});

	test("reads JSON template by name", () => {
		const tmpl = readLocalTemplate(TEST_DIR, "workspace-default");
		expect(tmpl).not.toBeNull();
		expect(tmpl!.name).toBe("workspace-default");
	});

	test("reads .yml extension template", () => {
		const tmpl = readLocalTemplate(TEST_DIR, "custom");
		expect(tmpl).not.toBeNull();
		expect(tmpl!.name).toBe("custom-workspace");
	});

	test("returns null for non-existent template", () => {
		const tmpl = readLocalTemplate(TEST_DIR, "does-not-exist");
		expect(tmpl).toBeNull();
	});

	test("prefers .yaml over .yml over .json", () => {
		// Create a template that exists as both .yaml and .json
		writeFileSync(
			join(TEST_DIR, "priority.yaml"),
			`metadata:
  name: priority-yaml
spec:
  containers:
    - name: a
      image: b
`,
		);
		writeFileSync(
			join(TEST_DIR, "priority.json"),
			JSON.stringify({
				metadata: { name: "priority-json" },
				spec: { containers: [{ name: "a", image: "b" }] },
			}),
		);

		const tmpl = readLocalTemplate(TEST_DIR, "priority");
		expect(tmpl).not.toBeNull();
		expect(tmpl!.name).toBe("priority-yaml");
	});
});
