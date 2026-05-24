import type * as k8s from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import { getK8sError } from "./errors.js";
import type { PodCreateArgs } from "./schemas.js";

const logger = getLogger(["nogoo9", "k8s-pods"]);

/**
 * Maps a full raw Kubernetes V1Pod structure to a simplified metadata and status summary.
 *
 * @param pod Raw V1Pod object from Kubernetes API.
 * @returns Simple summary dictionary of the pod status and details.
 */
export function podToSummary(pod: k8s.V1Pod) {
	return {
		name: pod.metadata?.name ?? "",
		namespace: pod.metadata?.namespace ?? "",
		phase: pod.status?.phase ?? "",
		ready: pod.status?.containerStatuses?.filter((cs) => cs.ready).length ?? 0,
		total: pod.spec?.containers?.length ?? 0,
		restarts:
			pod.status?.containerStatuses?.reduce(
				(s, cs) => s + cs.restartCount,
				0,
			) ?? 0,
		podIP: pod.status?.podIP ?? "",
		node: pod.spec?.nodeName ?? "",
		labels: pod.metadata?.labels ?? {},
		annotations: pod.metadata?.annotations ?? {},
	};
}

/**
 * Provisions a Kubernetes ServiceAccount in the target namespace and annotates it
 * with an AWS IAM Role ARN for EKS service account role mapping.
 *
 * @param coreApi CoreV1Api client dependency.
 * @param ns Target namespace.
 * @param workspaceId Unique Workspace ID mapping.
 * @param roleArn The AWS IAM Role ARN.
 * @returns The generated ServiceAccount name string.
 */
export async function provisionServiceAccount(
	coreApi: k8s.CoreV1Api,
	ns: string,
	workspaceId: string,
	roleArn: string,
): Promise<string> {
	const saName = `ws-sa-${workspaceId}`;
	logger.info(
		"Provisioning ServiceAccount '{saName}' in namespace '{ns}' for IAM Role '{roleArn}'",
		{
			saName,
			ns,
			roleArn,
		},
	);
	const saManifest = {
		apiVersion: "v1",
		kind: "ServiceAccount",
		metadata: {
			name: saName,
			namespace: ns,
			annotations: { "eks.amazonaws.com/role-arn": roleArn },
			labels: {
				"nogoo9/workspace-id": workspaceId,
				"nogoo9/managed-by": "nogoo9-spawner",
			},
		},
	};

	try {
		await coreApi.createNamespacedServiceAccount({
			namespace: ns,
			body: saManifest,
		});
		logger.debug("Successfully created ServiceAccount '{saName}'", { saName });
	} catch (err: unknown) {
		const k8sErr = getK8sError(err);
		if (k8sErr.statusCode === 409) {
			logger.warn(
				"ServiceAccount '{saName}' already exists, skipping creation.",
				{ saName },
			);
			return saName;
		}
		logger.error("Failed to provision ServiceAccount '{saName}': {error}", {
			saName,
			error: err,
		});
		throw err;
	}
	return saName;
}

/**
 * Constructs a Pod manifest from specific creation arguments, posts it to the
 * Kubernetes API, and returns a confirmation summary.
 *
 * @param coreApi CoreV1Api client dependency.
 * @param ns Target namespace.
 * @param name Desired pod name.
 * @param args Spec, label, and lifecycle arguments to configure the Pod.
 * @returns Description text, actual name, and namespace of the created Pod.
 */
export async function createPodFromArgs(
	coreApi: k8s.CoreV1Api,
	ns: string,
	name: string,
	args: PodCreateArgs,
): Promise<{ text: string; name: string; namespace: string }> {
	logger.info(
		"Creating Pod '{name}' in namespace '{ns}' with {containerCount} containers.",
		{
			name,
			ns,
			containerCount: args.containers?.length ?? 0,
		},
	);
	const podBody = {
		apiVersion: "v1",
		kind: "Pod",
		metadata: {
			name,
			namespace: ns,
			labels: args.labels,
			annotations: args.annotations,
		},
		spec: {
			containers: args.containers,
			initContainers: args.initContainers,
			volumes: args.volumes,
			restartPolicy: args.restartPolicy,
			serviceAccountName: args.serviceAccountName,
			automountServiceAccountToken: args.automountServiceAccountToken,
			nodeSelector: args.nodeSelector,
			nodeName: args.nodeName,
			hostNetwork: args.hostNetwork,
			hostPID: args.hostPID,
			hostIPC: args.hostIPC,
			dnsPolicy: args.dnsPolicy,
			imagePullSecrets: args.imagePullSecrets,
			securityContext: args.securityContext,
			tolerations: args.tolerations,
			affinity: args.affinity,
			topologySpreadConstraints: args.topologySpreadConstraints,
			priorityClassName: args.priorityClassName,
			priority: args.priority,
			runtimeClassName: args.runtimeClassName,
			terminationGracePeriodSeconds: args.terminationGracePeriodSeconds,
			activeDeadlineSeconds: args.activeDeadlineSeconds,
		},
	};
	const clean = JSON.parse(JSON.stringify(podBody)) as k8s.V1Pod;
	try {
		const body = await coreApi.createNamespacedPod({
			namespace: ns,
			body: clean,
		});
		const podName = body.metadata?.name ?? name;
		const podNs = body.metadata?.namespace ?? ns;
		logger.debug(
			"Successfully created Pod '{podName}' in namespace '{podNs}'",
			{
				podName,
				podNs,
			},
		);
		return {
			text: `Created pod ${podName} in namespace ${podNs}`,
			name: podName,
			namespace: podNs,
		};
	} catch (err: unknown) {
		logger.error("Failed to create Pod '{name}' in namespace '{ns}': {error}", {
			name,
			ns,
			error: err,
		});
		throw err;
	}
}
