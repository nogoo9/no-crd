import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { getLogger } from "@logtape/logtape";
import { load as yamlLoad } from "js-yaml";
import { config } from "~/config/index.js";

const logger = getLogger(["nogoo9", "local-templates"]);

/**
 * Unified template shape returned by both ConfigMap and local template readers.
 */
export interface LocalTemplate {
	name: string;
	annotations: Record<string, string>;
	labels?: Record<string, string>;
	spec: Record<string, unknown>;
}

/** File extensions treated as YAML. */
const YAML_EXTS = new Set([".yaml", ".yml"]);
/** File extensions treated as JSON. */
const JSON_EXTS = new Set([".json"]);
/** All supported template file extensions. */
const SUPPORTED_EXTS = new Set([...YAML_EXTS, ...JSON_EXTS]);

/**
 * Parses a spec string that may be JSON or YAML.
 * Auto-detects: if the trimmed string starts with `{`, parses as JSON;
 * otherwise parses as YAML. This is backward-compatible with existing
 * JSON-only ConfigMap `data.spec` fields.
 *
 * @param specStr Raw spec string from a ConfigMap or file.
 * @returns Parsed object.
 * @throws If the string cannot be parsed as either JSON or YAML.
 */
export function parseSpecString(specStr: string): Record<string, unknown> {
	const trimmed = specStr.trim();
	if (trimmed.startsWith("{")) {
		return JSON.parse(trimmed) as Record<string, unknown>;
	}
	return yamlLoad(trimmed) as Record<string, unknown>;
}

/**
 * Parses a template file's content (YAML or JSON) into a {@link LocalTemplate}.
 * The file must contain a wrapped format with `metadata` and `spec` keys.
 *
 * @param content Raw file content.
 * @param filename Filename used for extension-based format detection and fallback name.
 * @returns Parsed local template.
 * @throws If content is malformed or missing required fields.
 */
export function parseTemplateContent(
	content: string,
	filename: string,
): LocalTemplate {
	const ext = extname(filename).toLowerCase();
	let parsed: Record<string, unknown>;

	if (YAML_EXTS.has(ext)) {
		parsed = yamlLoad(content) as Record<string, unknown>;
	} else {
		parsed = JSON.parse(content) as Record<string, unknown>;
	}

	if (!parsed || typeof parsed !== "object") {
		throw new Error(`Invalid template file: ${filename} — expected an object`);
	}

	const metadata = (parsed.metadata ?? {}) as Record<string, unknown>;
	const spec = parsed.spec as Record<string, unknown> | undefined;

	if (!spec || typeof spec !== "object") {
		throw new Error(
			`Invalid template file: ${filename} — missing or invalid 'spec' field`,
		);
	}

	const name =
		(metadata.name as string) || basename(filename, extname(filename));
	const annotations = (metadata.annotations ?? {}) as Record<string, string>;
	const labels = metadata.labels as Record<string, string> | undefined;

	return { name, annotations, labels, spec };
}

/**
 * Lists all template files in a directory.
 * Reads `*.yaml`, `*.yml`, and `*.json` files and parses each as a local template.
 * Files that fail to parse are logged as warnings and skipped.
 *
 * @param dir Absolute path to the templates directory.
 * @returns Array of parsed local templates.
 */
export function listLocalTemplates(dir: string): LocalTemplate[] {
	const templates: LocalTemplate[] = [];
	let entries: string[];

	try {
		entries = readdirSync(dir);
	} catch (err) {
		logger.warn("Could not read templates directory '{dir}': {error}", {
			dir,
			error: err,
		});
		return [];
	}

	for (const entry of entries) {
		const ext = extname(entry).toLowerCase();
		if (!SUPPORTED_EXTS.has(ext)) continue;

		try {
			const content = readFileSync(join(dir, entry), "utf-8");
			templates.push(parseTemplateContent(content, entry));
		} catch (err) {
			logger.warn("Skipping template file '{entry}' in '{dir}': {error}", {
				entry,
				dir,
				error: err,
			});
		}
	}

	logger.debug("Loaded {count} local templates from '{dir}'", {
		count: templates.length,
		dir,
	});
	return templates;
}

/**
 * Reads a single local template by name from a directory.
 * Tries `name.yaml`, `name.yml`, `name.json` in order.
 *
 * @param dir Absolute path to the templates directory.
 * @param name Template name (without extension).
 * @returns The parsed template, or `null` if not found.
 */
export function readLocalTemplate(
	dir: string,
	name: string,
): LocalTemplate | null {
	const candidates = [`${name}.yaml`, `${name}.yml`, `${name}.json`];

	for (const filename of candidates) {
		try {
			const content = readFileSync(join(dir, filename), "utf-8");
			return parseTemplateContent(content, filename);
		} catch {
			// File doesn't exist or can't be read — try next candidate
		}
	}

	return null;
}

/**
 * Tries to find a local or built-in template by name.
 * Checks custom `TEMPLATES_DIR` first, then the built-in templates directory.
 *
 * @param name Template name (without extension).
 * @returns The parsed template, or `null` if not found in any source.
 */
export function findLocalTemplate(name: string): LocalTemplate | null {
	const k8sCfg = config.k8s;
	if (k8sCfg.templatesDir) {
		const found = readLocalTemplate(k8sCfg.templatesDir, name);
		if (found) return found;
	}
	if (k8sCfg.builtinTemplates) {
		const found = readLocalTemplate(k8sCfg.builtinTemplatesDir, name);
		if (found) return found;
	}
	return null;
}
