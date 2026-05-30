import type { AnnotationParam } from "./types.js";

export const ANNOTATION_KEYS = {
	POD_TEMPLATE: "nogoo9/pod-template",
	TYPE: "nogoo9/type",
	WORKSPACE_ID: "nogoo9/workspace-id",
	USER_SUB: "nogoo9/user-sub",
	DESCRIPTION: "nogoo9/description",
	TAG: "nogoo9/tag",
	REQUIRED_CONTEXT: "nogoo9/required-context",
	IAM_ROLE_ARN: "nogoo9/iam-role-arn",
	INIT_IMAGE: "nogoo9/init-image",
	INIT_COMMAND: "nogoo9/init-command",
	PRE_STOP_COMMAND: "nogoo9/pre-stop-command",
	PRE_STOP_SIDECAR_IMAGE: "nogoo9/pre-stop-sidecar-image",
	DEFAULT_GRACE_PERIOD: "nogoo9/default-grace-period",
	WORKSPACE_PORT: "nogoo9/workspace-port",
	WORKSPACE_PATH: "nogoo9/workspace-path",
	WORKSPACE_TYPE: "nogoo9/workspace-type",
	PREVIEW_PATH: "nogoo9/preview-path",
	PREVIEW_TYPE: "nogoo9/preview-type",
	PORT_PREFIX: "nogoo9/api.",
	MANAGED_BY: "nogoo9/managed-by",
	WORKSPACE_NAME: "nogoo9/workspace-name",
	TEMPLATE_REF: "nogoo9/template-ref",
	INIT_SHARE_VOLUMES: "nogoo9/init-share-volumes",
} as const;

export const ANNOTATION_METADATA: AnnotationParam[] = [
	{
		key: ANNOTATION_KEYS.POD_TEMPLATE,
		type: 'Label (`"true"`)',
		description:
			"Identifies a Kubernetes `ConfigMap` as a reusable pod template.",
	},
	{
		key: ANNOTATION_KEYS.TYPE,
		type: 'Label (`"workspace"`)',
		description:
			"Applied automatically by the spawner to identify running agent workspace pods.",
	},
	{
		key: ANNOTATION_KEYS.WORKSPACE_ID,
		type: "Label",
		description:
			"Identifies the unique agent session / workspace ID associated with the running pod.",
	},
	{
		key: ANNOTATION_KEYS.USER_SUB,
		type: "Label / Annotation",
		description:
			"Represents the authenticated user subject (owner) of the workspace pod, used for access control validation and ServiceAccount labeling.",
	},
	{
		key: ANNOTATION_KEYS.DESCRIPTION,
		type: "Annotation (String)",
		description:
			"A friendly, human-readable summary of the template's purpose and contents.",
	},
	{
		key: ANNOTATION_KEYS.TAG,
		type: "Annotation (String)",
		description:
			"A version or tag associated with the template environment (e.g. `node-20`).",
	},
	{
		key: ANNOTATION_KEYS.REQUIRED_CONTEXT,
		type: "Annotation (Comma-separated)",
		description:
			"Validates that target environment variables are provided in the tool call's `context` parameter (e.g. `GITHUB_TOKEN,DATABASE_URL`).",
	},
	{
		key: ANNOTATION_KEYS.IAM_ROLE_ARN,
		type: "Annotation (AWS Role ARN)",
		description:
			"Instructs the spawner to provision a dedicated Kubernetes `ServiceAccount` annotated for EKS IAM Role mapping (IRSA).",
	},
	{
		key: ANNOTATION_KEYS.INIT_IMAGE,
		type: "Annotation (Image string)",
		description:
			"The container image to run in the dynamic `spawner-init` init-container.",
	},
	{
		key: ANNOTATION_KEYS.INIT_COMMAND,
		type: "Annotation (Shell command)",
		description:
			"The shell command to run in the init-container. It automatically shares the main container's volume mounts.",
	},
	{
		key: ANNOTATION_KEYS.INIT_SHARE_VOLUMES,
		type: 'Annotation ("true" | "false")',
		description:
			"Determines if the dynamic init-container shares the main container's volume mounts. Defaults to `true`.",
	},
	{
		key: ANNOTATION_KEYS.PRE_STOP_COMMAND,
		type: "Annotation (Shell command)",
		description:
			"A shell command executed in a Kubernetes `preStop` lifecycle exec hook when the workspace is terminated (e.g. to save/push state).",
	},
	{
		key: ANNOTATION_KEYS.PRE_STOP_SIDECAR_IMAGE,
		type: "Annotation (Image string)",
		description:
			"If specified alongside `pre-stop-command`, runs the pre-stop command inside a dedicated sidecar container instead of the main container.",
	},
	{
		key: ANNOTATION_KEYS.DEFAULT_GRACE_PERIOD,
		type: "Annotation (Number in seconds)",
		description:
			"Overrides the Pod's `terminationGracePeriodSeconds` (defaults to `60` if a pre-stop command is defined) to give cleanup commands time to finish.",
	},
	{
		key: ANNOTATION_KEYS.WORKSPACE_PORT,
		type: "Annotation (Number)",
		description:
			"The port inside the container to proxy traffic to. Defaults to `DEFAULT_WORKSPACE_PORT` or `3000`.",
	},
	{
		key: ANNOTATION_KEYS.WORKSPACE_PATH,
		type: "Annotation (String)",
		description:
			"The default URL subpath mapping for the workspace web interface (defaults to `/`).",
	},
	{
		key: ANNOTATION_KEYS.WORKSPACE_TYPE,
		type: "Annotation (String)",
		description:
			"The format specification of the main entry point (e.g. `iframe`, `novnc`).",
	},
	{
		key: ANNOTATION_KEYS.PREVIEW_PATH,
		type: "Annotation (String)",
		description:
			"The default folder or file subpath to render in the UI files preview tab.",
	},
	{
		key: ANNOTATION_KEYS.PREVIEW_TYPE,
		type: "Annotation (String)",
		description:
			"Fallback preview rendering mode for the preview tab (e.g. `markdown`, `html`).",
	},
	{
		key: "nogoo9/api.<api-name>.port",
		type: "Annotation (Number)",
		description:
			"Defines an additional HTTP service port exposed by the workspace.",
	},
	{
		key: "nogoo9/api.<api-name>.path",
		type: "Annotation (String)",
		description:
			"Defines the subpath routing prefix for this specific API (e.g. `/terminal`).",
	},
	{
		key: "nogoo9/api.<api-name>.desc",
		type: "Annotation (String)",
		description:
			"A short description of this additional API, shown in the UI interface.",
	},
	{
		key: "nogoo9/api.<api-name>.method",
		type: "Annotation (String)",
		description:
			"Comma-separated list of supported HTTP methods (e.g. `GET,POST`, `*`, defaults to any method).",
	},
];
