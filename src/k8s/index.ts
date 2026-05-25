export { applySpawnerAnnotations } from "./annotations.js";
export {
	base64urlDecode,
	decodeJwtPayload,
	extractUserIdentity,
	requestContextStore,
	verifyToken,
} from "./auth.js";
export {
	initK8sContext,
	type K8sContext,
	makeApiClient,
} from "./client.js";
export {
	DEFAULT_NAMESPACE,
	getAccessibleNamespaces,
	LABELS,
	MODE,
	resolveNamespace,
} from "./config.js";
export {
	type CustomToolResult,
	errorResult,
	getK8sError,
	type K8sErrorDetails,
} from "./errors.js";
export {
	mergeContainersByName,
	mergeTopLevel,
} from "./merge.js";
export {
	checkPermission,
	evaluatePermissions,
	type PermissionReport,
	REQUIRED_PERMISSIONS,
} from "./permissions.js";
export {
	createPodFromArgs,
	podToSummary,
	provisionServiceAccount,
} from "./pods.js";
export {
	Container,
	EnvFromSource,
	EnvVar,
	type PodCreateArgs,
	PodSpecSchema,
	ResourceQuantity,
	Volume,
} from "./schemas.js";
export {
	DESCRIPTION_ANNOTATION,
	listTemplateMaps,
	parseTemplateRef,
	readTemplateMap,
	TAG_ANNOTATION,
	TEMPLATE_LABEL,
	TEMPLATE_LABEL_KEY,
} from "./templates.js";

export type HealthResponse = {
	status: "ok" | "degraded" | "error";
	timestamp?: string;
};

export type PodPhase =
	| "Pending"
	| "Running"
	| "Succeeded"
	| "Failed"
	| "Unknown";
