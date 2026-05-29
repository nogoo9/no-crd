import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Searches upward starting from the calling file's path to find a directory.
 * This is robust across both ts-node/bun source execution and built dist/ JS.
 *
 * @param metaUrl The import.meta.url of the calling module.
 * @param dirName The name of the folder to resolve (e.g. "templates", "themes").
 * @returns Resolved absolute path to the directory.
 */
export function resolveBuiltinDir(metaUrl: string, dirName: string): string {
	const filename = fileURLToPath(metaUrl);
	const dir = dirname(filename);

	let current = dir;
	// Walk up to 4 directories looking for the target directory name
	for (let i = 0; i < 4; i++) {
		const target = join(current, dirName);
		if (existsSync(target)) {
			return target;
		}
		current = join(current, "..");
	}

	// Fallback relative path from dist/
	return join(dir, "..", dirName);
}

/**
 * Resolves the first environment variable in the list that is defined and non-empty.
 *
 * @param env A single environment variable key or list of keys to resolve.
 * @returns Resolves to the value of the environment variable, or undefined.
 */
export function getEnv(env: string | string[]): string | undefined {
	if (Array.isArray(env)) {
		for (const key of env) {
			const val = process.env[key];
			if (val !== undefined && val !== "") return val;
		}
		return undefined;
	}
	return process.env[env];
}

export type ConfigValueType<T> = {
	[K in keyof T]: T[K] extends { value: infer V } ? V : never;
};

/**
 * Unifies the configuration schema by dynamically mapping schema items to runtime getters.
 *
 * @param schema The category-specific configuration schema.
 * @returns A typed configuration object with runtime getters.
 */
export function parseConfig<T extends Record<string, { value: any }>>(
	schema: T,
): ConfigValueType<T> {
	const res = {} as any;
	for (const key of Object.keys(schema)) {
		Object.defineProperty(res, key, {
			get() {
				return schema[key].value;
			},
			enumerable: true,
			configurable: true,
		});
	}
	return res;
}
