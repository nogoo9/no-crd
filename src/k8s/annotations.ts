import { ANNOTATION_KEYS } from "~/config/index.js";
import type { PodCreateArgs } from "./schemas.js";

/**
 * Validates that all required context variables defined in annotations exist in context.
 */
function validateRequiredContext(
	annotations: Record<string, string>,
	context: Record<string, string>,
): void {
	const requiredRaw = annotations[ANNOTATION_KEYS.REQUIRED_CONTEXT];
	if (!requiredRaw) return;

	const requiredKeys = requiredRaw.split(",").map((k) => k.trim());
	const providedKeys = Object.keys(context);
	const missing = requiredKeys.filter((k) => !providedKeys.includes(k));
	if (missing.length > 0) {
		throw new Error(
			`Missing required context variables: ${missing.join(", ")}`,
		);
	}
}

/**
 * Injects optional initContainer into the pod spec if configured via annotations.
 */
function injectInitContainer(
	parsedSpec: PodCreateArgs,
	annotations: Record<string, string>,
	envVars: Array<{ name: string; value: string }>,
): void {
	const initImage = annotations[ANNOTATION_KEYS.INIT_IMAGE];
	const initCmd = annotations[ANNOTATION_KEYS.INIT_COMMAND];
	const shareVolumes =
		annotations[ANNOTATION_KEYS.INIT_SHARE_VOLUMES] !== "false";

	if (initImage && initCmd && parsedSpec.containers.length > 0) {
		parsedSpec.initContainers = parsedSpec.initContainers || [];
		parsedSpec.initContainers.push({
			name: "spawner-init",
			image: initImage,
			command: ["/bin/sh", "-c", initCmd],
			volumeMounts: shareVolumes
				? parsedSpec.containers[0].volumeMounts
				: undefined,
			env: envVars,
		});
	}
}

/**
 * Injects preStop lifecycle hook (or sidecar) into the pod spec if configured via annotations.
 */
function injectPreStopHook(
	parsedSpec: PodCreateArgs,
	annotations: Record<string, string>,
	envVars: Array<{ name: string; value: string }>,
): void {
	const preStopCmd = annotations[ANNOTATION_KEYS.PRE_STOP_COMMAND];
	if (!preStopCmd || parsedSpec.containers.length === 0) return;

	const sidecarImage = annotations[ANNOTATION_KEYS.PRE_STOP_SIDECAR_IMAGE];
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
		annotations[ANNOTATION_KEYS.DEFAULT_GRACE_PERIOD] || "60",
		10,
	);
}

/**
 * Evaluates spawner-specific annotations and applies corresponding mutations to the Pod spec.
 */
export function applySpawnerAnnotations(
	spec: PodCreateArgs,
	annotations: Record<string, string>,
	context: Record<string, string> = {},
): PodCreateArgs {
	const parsedSpec: PodCreateArgs = {
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

	validateRequiredContext(annotations, context);

	const envVars = Object.entries(context).map(([name, value]) => ({
		name,
		value: String(value),
	}));

	injectInitContainer(parsedSpec, annotations, envVars);
	injectPreStopHook(parsedSpec, annotations, envVars);

	if (parsedSpec.containers.length > 0 && envVars.length > 0) {
		const mainContainer = parsedSpec.containers[0];
		mainContainer.env = [...(mainContainer.env || []), ...envVars];
	}

	return parsedSpec;
}
