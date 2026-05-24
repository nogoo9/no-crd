import { getLogger } from "@logtape/logtape";

const logger = getLogger(["nogoo9", "k8s-merge"]);

type EnvVarType = { name: string; value?: string; valueFrom?: unknown };
type ContainerType = {
	name: string;
	image?: string;
	env?: EnvVarType[];
	[key: string]: unknown;
};
type ContainerOverrideType = {
	name: string;
	env?: EnvVarType[];
	[key: string]: unknown;
};
type TopLevelArgsType = {
	labels?: Record<string, string>;
	annotations?: Record<string, string>;
	[key: string]: unknown;
};

/**
 * Merges container configuration overrides into a list of base containers by name.
 * Overwrites simple fields directly and deep-merges environment variables by their key name.
 *
 * @param base Array of original base container configurations.
 * @param overrides Array of container configuration overrides to apply.
 * @returns A new array of merged container configurations.
 */
export function mergeContainersByName(
	base: ContainerType[],
	overrides: ContainerOverrideType[],
): ContainerType[] {
	logger.debug(
		"Merging containers by name. Base count: {baseCount}, override count: {overrideCount}",
		{
			baseCount: base.length,
			overrideCount: overrides.length,
		},
	);
	return base.map((c) => {
		const override = overrides.find((o) => o.name === c.name);
		if (!override) return c;
		logger.debug("Applying container config override for container: {name}", {
			name: c.name,
		});
		const { name: _name, env: overrideEnv, ...restOverride } = override;
		const mergedEnv =
			overrideEnv !== undefined
				? mergeEnvByName(c.env ?? [], overrideEnv)
				: c.env;
		return {
			...c,
			...restOverride,
			...(mergedEnv !== undefined ? { env: mergedEnv } : {}),
		};
	});
}

/**
 * Merges two arrays of Environment Variables by name (key).
 * Override entries will overwrite base entries with the same name.
 *
 * @param base Original environment variables.
 * @param overrides Environment variables to inject/overwrite.
 * @returns Array of merged environment variables.
 */
function mergeEnvByName(
	base: EnvVarType[],
	overrides: EnvVarType[],
): EnvVarType[] {
	const map = new Map(base.map((e) => [e.name, e]));
	for (const e of overrides) map.set(e.name, e);
	return [...map.values()];
}

/**
 * Merges top-level pod creation metadata and parameters.
 * Automatically deep-merges labels and annotations objects.
 *
 * @param base Base/default top-level options.
 * @param overrides Target overrides (e.g. from template or CLI arguments).
 * @returns Packaged merged metadata dictionary.
 */
export function mergeTopLevel(
	base: TopLevelArgsType,
	overrides: TopLevelArgsType,
): TopLevelArgsType {
	logger.debug("Merging top-level Pod metadata (labels and annotations).");
	return {
		...base,
		...overrides,
		labels: { ...(base.labels ?? {}), ...(overrides.labels ?? {}) },
		annotations: {
			...(base.annotations ?? {}),
			...(overrides.annotations ?? {}),
		},
	};
}
