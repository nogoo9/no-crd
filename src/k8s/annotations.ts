import type { PodCreateArgs } from "./schemas.js";

/**
 * Evaluates spawner-specific annotations and applies the corresponding mutations
 * to the Pod spec (such as injecting initContainers, lifecycle hooks, and env vars).
 *
 * @param spec Base Pod creation spec.
 * @param annotations Map of annotation keys and values.
 * @param context Dynamic context environment variables.
 * @returns Mutated Pod spec with annotations applied.
 */
export function applySpawnerAnnotations(
	spec: PodCreateArgs,
	annotations: Record<string, string>,
	context: Record<string, string> = {},
): PodCreateArgs {
	// Deep copy relevant parts to avoid mutating input spec directly
	const parsedSpec = {
		...spec,
		containers: spec.containers.map((c) => ({
			...c,
			env: c.env ? [...c.env] : undefined,
			volumeMounts: c.volumeMounts ? [...c.volumeMounts] : undefined,
		})),
		initContainers: spec.initContainers
			? spec.initContainers.map((c) => ({ ...c }))
			: undefined,
		volumes: spec.volumes ? [...spec.volumes] : undefined,
	};

	// 1. Required Context Validation
	const requiredRaw = annotations["nogoo9/required-context"];
	if (requiredRaw) {
		const requiredKeys = requiredRaw.split(",").map((k) => k.trim());
		const providedKeys = Object.keys(context);
		const missing = requiredKeys.filter((k) => !providedKeys.includes(k));
		if (missing.length > 0) {
			throw new Error(
				`Missing required context variables: ${missing.join(", ")}`,
			);
		}
	}

	const envVars = Object.entries(context).map(([name, value]) => ({
		name,
		value: String(value),
	}));

	// 2. Init Container Injection
	const initImage = annotations["nogoo9/init-image"];
	const initCmd = annotations["nogoo9/init-command"];
	if (initImage && initCmd && parsedSpec.containers.length > 0) {
		parsedSpec.initContainers = parsedSpec.initContainers || [];
		parsedSpec.initContainers.push({
			name: "spawner-init",
			image: initImage,
			command: ["/bin/sh", "-c", initCmd],
			volumeMounts: parsedSpec.containers[0].volumeMounts,
			env: envVars,
		});
	}

	// 3. Pre-Stop Hook / Sidecar Injection
	const preStopCmd = annotations["nogoo9/pre-stop-command"];
	if (preStopCmd && parsedSpec.containers.length > 0) {
		const sidecarImage = annotations["nogoo9/pre-stop-sidecar-image"];
		if (sidecarImage) {
			parsedSpec.containers.push({
				name: "spawner-sidecar",
				image: sidecarImage,
				command: ["/bin/sh", "-c", "sleep infinity"],
				volumeMounts: parsedSpec.containers[0].volumeMounts,
				env: envVars,
				lifecycle: {
					preStop: {
						exec: { command: ["/bin/sh", "-c", preStopCmd] },
					},
				},
			});
		} else {
			const mainContainer = parsedSpec.containers[0];
			mainContainer.lifecycle = mainContainer.lifecycle || {};
			mainContainer.lifecycle.preStop = {
				exec: { command: ["/bin/sh", "-c", preStopCmd] },
			};
		}
		parsedSpec.terminationGracePeriodSeconds = Number.parseInt(
			annotations["nogoo9/default-grace-period"] || "60",
			10,
		);
	}

	// 4. Inject Dynamic Context Env Vars
	if (parsedSpec.containers.length > 0 && envVars.length > 0) {
		const mainContainer = parsedSpec.containers[0];
		mainContainer.env = [...(mainContainer.env || []), ...envVars];
	}

	return parsedSpec;
}
