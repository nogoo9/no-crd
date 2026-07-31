export interface WorkspaceApi {
	name: string;
	port: string;
	path: string;
	desc?: string;
	method?: string;
	refresh?: string;
}

export interface Workspace {
	id: string;
	name: string;
	status: string;
	podIP?: string;
	port?: string;
	workspacePath?: string;
	workspaceType?: string;
	previewPath?: string;
	previewType?: string;
	userSub?: string;
	annotations?: Record<string, string>;
	templateRef?: string;
	apis?: WorkspaceApi[];
	isOutdated?: boolean;
	templateVersion?: string;
	latestTemplateVersion?: string;
	podName?: string;
	owner?: string;
	creationTime?: string;
	description?: string;
	pod?: any;
}

export interface Template {
	name: string;
	namespace: string;
	description: string;
	tag: string;
	requiredContext?: string[];
	workspacePath?: string;
	workspaceType?: string;
	apis?: WorkspaceApi[];
	isLocal?: boolean;
	userSub?: string;
	version?: string;
	allowedRoles?: string[];
	allowedScopes?: string[];
}

export interface Toast {
	id: string;
	message: string;
	type: "success" | "error";
}

export interface Capabilities {
	isAdmin: boolean;
	authEnabled: boolean;
	managedOnly: boolean;
	version: string;
	enabledTools: string[];
}

export interface TokenSettingsModalProps {
	activeToken: string;
	onSave: (token: string) => void;
	onClear: () => void;
	onClose: () => void;
}

export interface SpawnWorkspaceModalProps {
	template: Template;
	isAdmin: boolean;
	existingWorkspaces: Workspace[];
	currentUser: string;
	onSpawn: (
		id: string,
		name: string,
		userSub: string,
		contextVars: Record<string, string>,
	) => void;
	onClose: () => void;
	onMeowTrigger?: () => void;
}

export interface CreateTemplateModalProps {
	onSave: (
		name: string,
		description: string,
		tag: string,
		specJson: string,
		advData: any,
	) => void;
	onClose: () => void;
}

export interface TemplateSpecModalProps {
	template: Template;
	namespace: string;
	onClose: () => void;
}

export interface LogsViewModalProps {
	workspace: Workspace;
	logs: string;
	onRefresh: () => void;
	onClose: () => void;
}

export interface EventsViewModalProps {
	workspace: Workspace;
	events: any[];
	onRefresh: () => void;
	onClose: () => void;
}

export interface SystemInfoModalProps {
	capabilities: Capabilities;
	namespace: string;
	activeToken: string;
	basePath: string;
	onClose: () => void;
}

export interface WorkspacePreviewModalProps {
	workspace: Workspace;
	path: string;
	type: string;
	basePath: string;
	activeToken: string;
	onClose: () => void;
}
