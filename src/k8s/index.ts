export { applySpawnerAnnotations } from "./annotations.js";
export {
	base64urlDecode,
	decodeJwtPayload,
	extractAdminRole,
	extractTokenFromCookie,
	extractUserIdentity,
	hasRequiredRole,
	hasRequiredScope,
	requestContextStore,
	verifyAccessOrThrow,
	verifyRoleOrThrow,
	verifyScopeOrThrow,
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
	findLocalTemplate,
	type LocalTemplate,
	listLocalTemplates,
	parseSpecString,
	parseTemplateContent,
	readLocalTemplate,
} from "./local-templates.js";
export {
	type ContainerOverrideType,
	type ContainerType,
	type EnvVarType,
	mergeContainersByName,
	mergeTopLevel,
	type TopLevelArgsType,
} from "./merge.js";
export {
	checkPermission,
	evaluatePermissions,
	type PermissionReport,
	type RbacPermission,
	REQUIRED_PERMISSIONS,
} from "./permissions.js";
export {
	createPodFromArgs,
	parseWorkspaceApis,
	podToSummary,
	provisionServiceAccount,
	type WorkspaceApi,
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
	createSessionCookie,
	extractSessionCookieUserSub,
	getSessionKey,
	resolveSessionSecret,
	type SessionPayload,
	verifySessionCookie,
} from "./session.js";
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
