/// <reference lib="dom" />
import { App } from "@modelcontextprotocol/ext-apps";

// Initialize the MCP App client bridge
const app = new App(
	{ name: "nogoo9-pod-manager", version: "0.5.0" },
	{ tools: {} },
);

// State management
let currentNamespace = "nogoo9";
interface WorkspaceApi {
	name: string;
	port: string;
	path: string;
	desc?: string;
	method?: string;
}

let workspaces: Array<{
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
}> = [];

let templates: Array<{
	name: string;
	namespace: string;
	description: string;
	tag: string;
	requiredContext?: string[];
	workspacePath?: string;
	workspaceType?: string;
	apis?: WorkspaceApi[];
}> = [];

// Server capabilities state
let capabilities: {
	enabledTools: string[];
	managedOnly: boolean;
	authEnabled: boolean;
	isAdmin: boolean;
} = {
	enabledTools: [],
	managedOnly: true,
	authEnabled: false,
	isAdmin: false,
};
let _unmanagedCount: number | undefined;

// Authentication & token state
let activeToken = "";

// Log viewer state
let activeLogPod: string | null = null;

// UI elements caching
const nsBadge = document.getElementById("ns-badge");
const refreshBtn = document.getElementById("refresh-btn");
const errorBanner = document.getElementById("error-banner");
const errorMessage = document.getElementById("error-message");
const wsCount = document.getElementById("ws-count");
const workspacesList = document.getElementById("workspaces-list");
const templatesList = document.getElementById("templates-list");
const eventsModal = document.getElementById("events-modal");
const closeEventsBtn = document.getElementById("close-events-btn");
const closeEventsFooterBtn = document.getElementById("close-events-footer-btn");
const refreshEventsBtn = document.getElementById("refresh-events-btn");
const eventsContent = document.getElementById("events-content");
const eventsTitle = document.getElementById("events-title");
const upgradeAllBtn = document.getElementById("upgrade-all-btn");
let activeEventWsId: string | null = null;

// Theme Toggle
const themeBtn = document.getElementById("theme-btn");
const themeIcon = document.getElementById("theme-icon");

// OIDC Login
const loginOverlay = document.getElementById("login-overlay");
const loginBtn = document.getElementById("login-btn");
const useManualTokenLink = document.getElementById("use-manual-token-link");

// 403 Forbidden Overlay
const forbiddenOverlay = document.getElementById("forbidden-overlay");
const forbiddenMessage = document.getElementById("forbidden-message");
const forbiddenRetryBtn = document.getElementById("forbidden-retry-btn");
const forbiddenBackBtn = document.getElementById("forbidden-back-btn");

const logoutBtn = document.getElementById("logout-btn");

// Workspace Preview Modal
const previewModal = document.getElementById("preview-modal");
const previewModalTitle = document.getElementById("preview-modal-title");
const previewModalSubtitle = document.getElementById("preview-modal-subtitle");
const previewContentArea = document.getElementById("preview-content-area");
const closePreviewBtn = document.getElementById("close-preview-btn");
const closePreviewFooterBtn = document.getElementById(
	"close-preview-footer-btn",
);
const refreshPreviewBtn = document.getElementById("refresh-preview-btn");
let activePreviewWorkspaceId: string | null = null;
let activePreviewPath: string | null = null;

// Modals
const logsModal = document.getElementById("logs-modal");
const logsTitle = document.getElementById("logs-title");
const logsContent = document.getElementById("logs-content");
const closeLogsBtn = document.getElementById("close-logs-btn");
const closeLogsFooterBtn = document.getElementById("close-logs-footer-btn");
const refreshLogsBtn = document.getElementById("refresh-logs-btn");

const spawnModal = document.getElementById("spawn-modal");
const spawnTemplateTitle = document.getElementById("spawn-template-title");
const spawnTemplateRef = document.getElementById(
	"spawn-template-ref",
) as HTMLInputElement;
const workspaceIdInput = document.getElementById(
	"workspace-id",
) as HTMLInputElement;
const workspaceNameInput = document.getElementById(
	"workspace-name",
) as HTMLInputElement;
const spawnForm = document.getElementById("spawn-form");
const closeSpawnBtn = document.getElementById("close-spawn-btn");
const cancelSpawnBtn = document.getElementById("cancel-spawn-btn");

const contextVariablesContainer = document.getElementById(
	"context-variables-container",
);
const contextInputs = document.getElementById("context-inputs");

const targetUserContainer = document.getElementById("target-user-container");
const targetUserSubInput = document.getElementById(
	"target-user-sub",
) as HTMLInputElement;

// Token Modal Elements
const _userBadgeBtn = document.getElementById("user-badge-btn");
const userBadgeName = document.getElementById("user-badge-name");
const userAdminBadge = document.getElementById("user-admin-badge");
const tokenModal = document.getElementById("token-modal");
const _tokenForm = document.getElementById("token-form");
const jwtTokenInput = document.getElementById(
	"jwt-token-input",
) as HTMLTextAreaElement;
const _closeTokenBtn = document.getElementById("close-token-btn");
const _clearTokenBtn = document.getElementById("clear-token-btn");

// Template Spec Modal Elements
const tmplSpecModal = document.getElementById("tmpl-spec-modal");
const tmplSpecTitle = document.getElementById("tmpl-spec-title");
const tmplSpecSubtitle = document.getElementById("tmpl-spec-subtitle");
const tmplSpecLoading = document.getElementById("tmpl-spec-loading");
const tmplSpecAnnotationsContainer = document.getElementById(
	"tmpl-spec-annotations-container",
);
const tmplSpecAnnotationsGrid = document.getElementById(
	"tmpl-spec-annotations-grid",
);
const tmplSpecLabelsContainer = document.getElementById(
	"tmpl-spec-labels-container",
);
const tmplSpecLabelsList = document.getElementById("tmpl-spec-labels-list");
const tmplSpecCodeContainer = document.getElementById(
	"tmpl-spec-code-container",
);
const tmplSpecCode = document.getElementById("tmpl-spec-code");
const closeTmplSpecBtn = document.getElementById("close-tmpl-spec-btn");
const closeTmplSpecFooterBtn = document.getElementById(
	"close-tmpl-spec-footer-btn",
);

// Create Template Modal Elements
const createTmplBtn = document.getElementById("create-tmpl-btn");
const createTmplModal = document.getElementById("create-tmpl-modal");
const createTmplForm = document.getElementById("create-tmpl-form");
const closeCreateTmplBtn = document.getElementById("close-create-tmpl-btn");
const cancelCreateTmplBtn = document.getElementById("cancel-create-tmpl-btn");

const createTmplNameInput = document.getElementById(
	"create-tmpl-name",
) as HTMLInputElement;
const createTmplDescInput = document.getElementById(
	"create-tmpl-desc",
) as HTMLInputElement;
const createTmplTagInput = document.getElementById(
	"create-tmpl-tag",
) as HTMLInputElement;
const createTmplSpecInput = document.getElementById(
	"create-tmpl-spec",
) as HTMLTextAreaElement;

// Toast Container
const toastContainer = document.getElementById("toast-container");

// Toast Notification System
function showToast(message: string, type: "success" | "error" = "success") {
	if (!toastContainer) return;
	const toast = document.createElement("div");
	toast.className = `toast-item toast-${type} p-4 rounded-xl border flex items-start gap-3 shadow-lg transition duration-300`;

	const icon =
		type === "success"
			? `<span class="toast-icon-success">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
				</svg>
		   </span>`
			: `<span class="toast-icon-error">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
		   </span>`;

	toast.innerHTML = `
		${icon}
		<div class="flex-1">
			<p class="text-sm font-semibold theme-text-title">${type === "success" ? "Success" : "Error"}</p>
			<p class="text-xs theme-text-muted mt-0.5 leading-relaxed toast-message-content"></p>
		</div>
	`;
	const msgEl = toast.querySelector(".toast-message-content");
	if (msgEl) {
		msgEl.textContent = message;
	}

	toastContainer.appendChild(toast);

	// Remove toast after 4 seconds
	setTimeout(() => {
		toast.classList.add("toast-out");
		toast.addEventListener("animationend", () => {
			toast.remove();
		});
	}, 4000);
}

// JWT Token Decoder
function decodeJwt(t: string): any {
	try {
		const parts = t.split(".");
		if (parts.length !== 3) return null;
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const json = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => {
					return `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`;
				})
				.join(""),
		);
		return JSON.parse(json);
	} catch (_e) {
		return null;
	}
}

function getValueByJsonPath(obj: any, path: string): any {
	if (!obj || !path) return undefined;
	if (path.startsWith("$.")) {
		const parts = path.substring(2).split(".");
		let current = obj;
		for (const part of parts) {
			if (current === null || typeof current !== "object") return undefined;
			current = current[part];
		}
		return current;
	}
	return undefined;
}

// Token State Management
function initToken() {
	const urlParams = new URLSearchParams(window.location.search);
	let token = urlParams.get("token");
	if (token) {
		localStorage.setItem("nocr_token", token);
		// Clean the token parameter from URL to keep address bar clean
		const cleanUrl = window.location.pathname + window.location.hash;
		window.history.replaceState({}, document.title, cleanUrl);
	} else {
		token = localStorage.getItem("nocr_token");
	}

	if (token) {
		const payload = decodeJwt(token);
		if (payload?.exp && payload.exp < Date.now() / 1000) {
			console.log("Token in local storage has expired. Clearing it...");
			localStorage.removeItem("nocr_token");
			token = null;
		}
	}

	if (token) {
		activeToken = token;
		if (jwtTokenInput) jwtTokenInput.value = token;
		updateUserBadge(token);
	} else {
		updateUserBadge("");
	}
}

function updateUserBadge(token: string) {
	if (!userBadgeName) return;
	if (token) {
		if (logoutBtn) logoutBtn.classList.remove("hidden");
		const payload = decodeJwt(token);
		if (payload) {
			const jsonPath = oauthConfig.subJsonPath || "$.sub";
			const sub =
				getValueByJsonPath(payload, jsonPath) ||
				payload.sub ||
				payload.identity ||
				payload.name ||
				"User";
			userBadgeName.textContent = String(sub);
			return;
		}
	} else {
		if (logoutBtn) logoutBtn.classList.add("hidden");
	}
	userBadgeName.textContent = "Anonymous";
	if (userAdminBadge) userAdminBadge.classList.add("hidden");
}

function getJwtPayload() {
	return activeToken ? decodeJwt(activeToken) : undefined;
}

// Error display helper
function showError(msg: string) {
	if (errorBanner && errorMessage) {
		errorMessage.textContent = msg;
		errorBanner.classList.remove("hidden");
	}
	showToast(msg, "error");
}

function clearError() {
	if (errorBanner) {
		errorBanner.classList.add("hidden");
	}
}

// Fetch all data from the MCP server
async function refreshAll() {
	clearError();
	if (refreshBtn) {
		refreshBtn.classList.add("animate-spin");
		refreshBtn.setAttribute("disabled", "true");
	}

	try {
		// 0. Fetch capabilities first (so we know what tools are available)
		const capRes = await app.callServerTool({
			name: "get_capabilities",
			arguments: { jwtPayload: getJwtPayload() },
		});
		if (capRes && !capRes.isError && capRes.structuredContent) {
			const cap = capRes.structuredContent as any;
			capabilities = {
				enabledTools: cap.enabledTools || [],
				managedOnly: cap.managedOnly ?? true,
				authEnabled: cap.authEnabled ?? false,
				isAdmin: cap.isAdmin ?? false,
			};
			if (userAdminBadge) {
				if (capabilities.isAdmin) {
					userAdminBadge.classList.remove("hidden");
				} else {
					userAdminBadge.classList.add("hidden");
				}
			}
		}

		// 1. Get current namespace and mode
		const nsRes = await app.callServerTool({
			name: "current_namespace",
			arguments: {},
		});
		if (nsRes && !nsRes.isError && nsRes.structuredContent) {
			currentNamespace =
				(nsRes.structuredContent as any).namespace || "default";
			if (nsBadge) nsBadge.textContent = currentNamespace;
		}

		// 2. Fetch workspaces
		const wsRes = await app.callServerTool({
			name: "list_workspaces",
			arguments: { namespace: currentNamespace, jwtPayload: getJwtPayload() },
		});
		if (wsRes && !wsRes.isError && wsRes.structuredContent) {
			const wsList = (wsRes.structuredContent as any).workspaces || [];
			workspaces = await Promise.all(
				wsList.map(async (ws: any) => {
					if (ws.status === "Running") {
						try {
							const detailsRes = await app.callServerTool({
								name: "get_workspace",
								arguments: {
									id: ws.id,
									namespace: currentNamespace,
									jwtPayload: getJwtPayload(),
								},
							});
							if (
								detailsRes &&
								!detailsRes.isError &&
								detailsRes.structuredContent
							) {
								return detailsRes.structuredContent as any;
							}
						} catch (e) {
							console.error("Failed to fetch workspace details for", ws.id, e);
						}
					}
					return {
						...ws,
						workspacePath: "/",
						workspaceType: "html",
						previewPath: "",
						previewType: "",
						podIP: "",
						port: "",
						apis: ws.apis || [],
					};
				}),
			);
		} else if (wsRes?.isError) {
			console.warn("Failed to list workspaces", wsRes);
		}

		// 4. Fetch templates
		const tmplRes = await app.callServerTool({
			name: "list_templates",
			arguments: { namespace: currentNamespace },
		});
		if (tmplRes && !tmplRes.isError && tmplRes.structuredContent) {
			templates = (tmplRes.structuredContent as any).templates || [];
		} else if (tmplRes?.isError) {
			console.warn("Failed to list templates", tmplRes);
		}

		renderAll();
	} catch (err) {
		console.error("Refresh error:", err);
		showError(err instanceof Error ? err.message : String(err));
	} finally {
		if (refreshBtn) {
			refreshBtn.classList.remove("animate-spin");
			refreshBtn.removeAttribute("disabled");
		}
	}
}

// Render dynamic elements
function renderAll() {
	renderWorkspaces();
	renderTemplates();
}

function renderWorkspaces() {
	if (!wsCount || !workspacesList) return;

	workspacesList.className = "flex flex-col gap-10 py-4";

	const filteredWorkspaces = workspaces.filter((ws) => {
		if (!searchQuery) return true;
		return (
			ws.id.toLowerCase().includes(searchQuery) ||
			ws.name.toLowerCase().includes(searchQuery) ||
			ws.templateRef?.toLowerCase().includes(searchQuery) ||
			ws.status.toLowerCase().includes(searchQuery)
		);
	});

	wsCount.textContent = String(filteredWorkspaces.length);

	const hasOutdated = filteredWorkspaces.some((ws) => ws.isOutdated);
	if (upgradeAllBtn) {
		if (
			hasOutdated &&
			capabilities.enabledTools.includes("upgrade_all_workspaces")
		) {
			upgradeAllBtn.classList.remove("hidden");
		} else {
			upgradeAllBtn.classList.add("hidden");
		}
	}

	const groups: {
		templateName: string;
		templateTag?: string;
		templateDesc?: string;
		workspaces: typeof workspaces;
		isRealTemplate: boolean;
		apis?: (typeof templates)[0]["apis"];
	}[] = [];

	// Group workspaces by template name
	for (const tmpl of templates) {
		const wsForTmpl = filteredWorkspaces.filter(
			(ws) => ws.templateRef?.toLowerCase() === tmpl.name.toLowerCase(),
		);

		const tmplMatchesQuery = searchQuery
			? tmpl.name.toLowerCase().includes(searchQuery) ||
				tmpl.description?.toLowerCase().includes(searchQuery) ||
				tmpl.tag?.toLowerCase().includes(searchQuery)
			: false;

		if (!searchQuery || wsForTmpl.length > 0 || tmplMatchesQuery) {
			groups.push({
				templateName: tmpl.name,
				templateTag: tmpl.tag,
				templateDesc: tmpl.description,
				workspaces: wsForTmpl,
				isRealTemplate: true,
				apis: tmpl.apis,
			});
		}
	}

	// Workspaces not associated with any registered template
	const otherWorkspaces = filteredWorkspaces.filter((ws) => {
		if (!ws.templateRef) return true;
		return !templates.some(
			(tmpl) => tmpl.name.toLowerCase() === ws.templateRef?.toLowerCase(),
		);
	});

	if (
		otherWorkspaces.length > 0 ||
		(searchQuery && "other workspaces".includes(searchQuery))
	) {
		groups.push({
			templateName: "Other Workspaces",
			templateDesc: "Workspaces not associated with any registered template",
			workspaces: otherWorkspaces,
			isRealTemplate: false,
		});
	}

	if (groups.length === 0) {
		workspacesList.innerHTML = `
			<div class="py-8 text-center theme-text-muted text-sm">
				${searchQuery ? "No matching workspaces or templates found." : "No workspaces or templates registered."}
			</div>
		`;
		return;
	}

	const collapsedTmplsStr =
		localStorage.getItem("nocr_collapsed_templates") || "[]";
	let collapsedTmplNames: string[] = [];
	try {
		collapsedTmplNames = JSON.parse(collapsedTmplsStr);
	} catch (_) {}

	let html = "";

	for (const group of groups) {
		const isTmplCollapsed = collapsedTmplNames.includes(group.templateName);

		// Render APIs compact badge layout
		let apisHtml = "";
		if (group.apis && group.apis.length > 0) {
			apisHtml = group.apis
				.map((api) => {
					const tooltip = api.desc ? `title="${api.desc}"` : "";
					const methodText = api.method
						? api.method.split(",")[0].toUpperCase()
						: "GET";
					let methodClass =
						"bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20";
					if (methodText === "GET") {
						methodClass =
							"bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
					} else if (methodText === "POST") {
						methodClass =
							"bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
					} else if (methodText === "WS" || methodText === "WEBSOCKET") {
						methodClass =
							"bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20";
					}
					return `<span ${tooltip} class="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider ${methodClass}">${methodText}:${api.name}</span>`;
				})
				.join(" ");
		}

		// Group Header (borderless)
		const groupHeader = `
			<div class="space-y-1 py-3">
				<div class="flex flex-wrap items-center justify-between gap-3 group-header-clickable">
					<div class="flex items-center gap-2 min-w-0">
						<button class="toggle-group-btn p-1 rounded hover:bg-[var(--panel-hover-bg)] transition cursor-pointer shrink-0" title="Toggle Group">
							<svg class="w-4 h-4 transform transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						<span class="theme-icon-box shrink-0 p-1.5 rounded-lg">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
							</svg>
						</span>
						<h3 class="text-sm font-extrabold theme-text-title font-mono truncate group-title-text" title="${group.templateName}">${group.templateName}</h3>
						${group.templateTag ? `<span class="theme-badge-coral text-[9px] uppercase font-bold tracking-wider">${group.templateTag}</span>` : ""}
						<span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-neutral-500/10 text-neutral-500 font-mono">${group.workspaces.length}</span>
					</div>
					
					<div class="flex items-center gap-3 shrink-0 ml-auto" onclick="event.stopPropagation()">
						${apisHtml ? `<div class="hidden sm:flex items-center gap-1">${apisHtml}</div>` : ""}
						${
							group.isRealTemplate
								? `
							<button data-tmpl-name="${group.templateName}" class="view-spec-btn theme-button-secondary px-2.5 py-1 text-[11px] flex items-center gap-1 cursor-pointer">
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
								Spec
							</button>
						`
								: ""
						}
					</div>
				</div>
				${group.templateDesc ? `<p class="text-xs theme-text-muted leading-normal pl-14 mt-1">${group.templateDesc}</p>` : ""}
			</div>
		`;

		// Cards list layout classes
		const containerClass =
			currentLayout === "grid"
				? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-4"
				: "flex flex-col gap-6 py-4";

		const workspacesCards = group.workspaces
			.map((ws) => {
				let statusClass = "status-unknown";
				let pulseDot = "";
				if (ws.status === "Running") {
					statusClass = "status-running";
					pulseDot = `
					<span class="relative flex h-1.5 w-1.5 shrink-0">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
					</span>`;
				} else if (ws.status === "Pending") {
					statusClass = "status-pending";
					pulseDot = `
					<span class="relative flex h-1.5 w-1.5 shrink-0">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
					</span>`;
				} else if (ws.status === "Failed") {
					statusClass = "status-failed";
				}

				let openLinkHtml = "";
				let previewBtnHtml = "";
				let viewSpecBtnHtml = "";
				if (ws.status === "Running") {
					const tokenQuery = activeToken
						? `?token=${encodeURIComponent(activeToken)}`
						: "";
					const pathPart = ws.workspacePath || ws.previewPath || "/";
					const cleanPath = pathPart.startsWith("/")
						? pathPart
						: `/${pathPart}`;
					const workspaceUrl = `${basePath}/route/${ws.id}${cleanPath}${tokenQuery}`;
					openLinkHtml = `
					<a href="${workspaceUrl}" target="_blank" class="theme-button-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] cursor-pointer text-center font-bold">
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
						Open
					</a>
				`;
					viewSpecBtnHtml = `
					<button data-ws-id="${ws.id}" class="view-ws-spec-btn theme-button-secondary inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer">
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						Spec
					</button>
				`;
					const previewTarget = ws.previewPath || ws.workspacePath;
					if (previewTarget) {
						previewBtnHtml = `
						<button data-ws-id="${ws.id}" data-preview-path="${previewTarget}" data-preview-type="${ws.previewType || ws.workspaceType || "html"}" class="preview-ws-btn theme-button-secondary inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer">
							<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
							Preview
						</button>
					`;
					}
				}

				let infoHtml = "";
				if (ws.podIP || ws.templateRef) {
					let apisHtml = "";
					if (ws.apis && ws.apis.length > 0) {
						apisHtml = ws.apis
							.map((api) => {
								const apiPath = api.path.startsWith("/")
									? api.path
									: `/${api.path}`;
								const methodText = api.method
									? api.method.split(",")[0].toUpperCase()
									: "GET";
								let methodClass =
									"bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20";
								if (methodText === "GET") {
									methodClass =
										"bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
								} else if (methodText === "POST") {
									methodClass =
										"bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
								} else if (methodText === "WS" || methodText === "WEBSOCKET") {
									methodClass =
										"bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20";
								}

								const tooltip = api.desc ? `title="${api.desc}"` : "";
								const tokenQuery = activeToken
									? `?token=${encodeURIComponent(activeToken)}`
									: "";
								const linkUrl = `${basePath}/route/${ws.id}${apiPath}${tokenQuery}`;
								const isGet = methodText === "GET";
								const pathHtml = isGet
									? `<a href="${linkUrl}" target="_blank" ${tooltip} class="theme-text-link hover:underline break-all">${apiPath}</a>`
									: `<span ${tooltip} class="theme-text-muted break-all">${apiPath}</span>`;
								return `
								<tr class="hover:bg-[var(--panel-hover-bg)] transition-colors duration-150">
									<td class="px-4 py-2.5 font-bold theme-text-title">${api.name}</td>
									<td class="px-4 py-2.5 font-mono">
										<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono tracking-wider ${methodClass}">
											${methodText}
										</span>
									</td>
									<td class="px-4 py-2.5 font-mono">
										${pathHtml}
									</td>
									<td class="px-4 py-2.5 theme-text-muted leading-normal">${api.desc || "-"}</td>
								</tr>
							`;
							})
							.join("");
					}

					infoHtml = `<div class="text-xs theme-text-muted mt-2 space-y-4">
					<div class="flex flex-wrap gap-2.5">
						${ws.templateRef ? `<span><strong>Template:</strong> <span class="px-1.5 py-0.5 theme-badge-pill text-[10px] font-bold rounded-md font-mono">${ws.templateRef}</span></span>` : ""}
						${ws.podIP ? `<span><strong>IP:</strong> <span class="font-mono">${ws.podIP}</span></span>` : ""}
						${ws.port ? `<span><strong>Port:</strong> <span class="font-mono">${ws.port}</span></span>` : ""}
						${ws.userSub ? `<span><strong>Owner:</strong> <span class="font-mono">${ws.userSub}</span></span>` : ""}
					</div>
					${
						apisHtml
							? `
					<div class="space-y-2 mt-3">
						<div class="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Workspace Endpoints</div>
						<div class="overflow-x-auto">
							<table class="w-full text-left text-xs border-collapse min-w-[500px]">
								<thead>
									<tr class="theme-table-header opacity-75 uppercase text-[9px] font-bold tracking-wider">
										<th class="px-4 py-2">Name</th>
										<th class="px-4 py-2">Method</th>
										<th class="px-4 py-2">Path</th>
										<th class="px-4 py-2">Description</th>
									</tr>
								</thead>
								<tbody>
									${apisHtml}
								</tbody>
							</table>
						</div>
					</div>`
							: ""
					}
				</div>`;
				}

				return `
      <div data-ws-id="${ws.id}" class="theme-card-row w-full p-6 flex flex-col justify-between transition workspace-card">
        <!-- Card Header -->
        <div class="flex items-center justify-between gap-4 w-full">
          <div class="flex items-center gap-3 min-w-0">
            <span class="theme-icon-box shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <div class="min-w-0">
              <h4 class="font-bold theme-text-title text-sm truncate" title="${ws.name}">
                ${ws.name}
              </h4>
              <div class="text-[11px] theme-text-muted font-mono mt-0.5 truncate">
                ID: ${ws.id}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1.5 shrink-0 ${statusClass}">
              ${pulseDot}
              ${ws.status}
            </span>
          </div>
        </div>

        <!-- Card Details (Always Visible) -->
        <div class="workspace-details mt-4 flex flex-col gap-4">
          ${infoHtml}
        </div>

        <!-- Card Actions (Always visible at the bottom) -->
        <div class="flex items-center justify-between gap-3 mt-4 pt-1">
          <div class="flex items-center gap-1.5 flex-wrap min-w-0">
            ${
							ws.isOutdated
								? `<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1 shrink-0" title="A newer template version is available">
                  <svg class="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Outdated
                </span>`
								: ""
						}
            ${
							ws.isOutdated &&
							capabilities.enabledTools.includes("upgrade_workspace")
								? `<button data-ws-id="${ws.id}" class="upgrade-ws-btn theme-button-primary inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer bg-amber-600 border-amber-600 hover:bg-amber-700">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" />
                  </svg>
                  Upgrade
                </button>`
								: ""
						}
            ${viewSpecBtnHtml}
            ${previewBtnHtml}
            ${
							ws.podName && capabilities.enabledTools.includes("get_pod_logs")
								? `<button data-pod-name="${ws.podName}" data-ws-id="${ws.id}" class="logs-ws-btn theme-button-secondary inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Logs
                </button>`
								: ""
						}
            ${
							capabilities.enabledTools.includes("get_workspace_events")
								? `<button data-ws-id="${ws.id}" class="events-ws-btn theme-button-secondary inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Events
                </button>`
								: ""
						}
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button data-ws-id="${ws.id}" class="stop-ws-btn theme-button-danger inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer"${!capabilities.enabledTools.includes("stop_workspace") ? ' disabled title="Insufficient permissions"' : ""}>
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Stop
            </button>
            ${openLinkHtml}
          </div>
        </div>
      </div>
    `;
			})
			.join("");

		// Spawn template button using the new dotted outline styling
		let dottedCardHtml = "";
		if (
			group.isRealTemplate &&
			capabilities.enabledTools.includes("spawn_workspace")
		) {
			dottedCardHtml = `
				<button data-tmpl-name="${group.templateName}" class="spawn-ws-dotted-btn create-ws-dotted-btn p-6">
					<div class="plus-box">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
					</div>
					<div>
						<div class="font-bold text-xs theme-text-title font-mono">Spawn ${group.templateName}</div>
						<div class="text-[11px] theme-text-muted mt-1">Create sandbox using this template</div>
					</div>
				</button>
			`;
		}

		html += `
			<div class="template-group ${isTmplCollapsed ? "is-collapsed" : ""}" data-tmpl-name="${group.templateName}">
				${groupHeader}
				<div class="group-content">
					<div class="${containerClass}">
						${workspacesCards}
						${dottedCardHtml}
					</div>
				</div>
			</div>
		`;
	}

	workspacesList.innerHTML = html;

	// Attach template group collapse toggle listener
	document
		.querySelectorAll(".group-header-clickable")
		.forEach((el: Element) => {
			el.addEventListener("click", (e: Event) => {
				const target = e.target as HTMLElement;
				// Ignore clicks inside the right-side actions area (apis badge or Spec button)
				if (target.closest(".ml-auto")) return;

				const groupContainer = el.closest(".template-group");
				if (!groupContainer) return;
				const tmplName = groupContainer.getAttribute("data-tmpl-name");
				if (!tmplName) return;

				const currentCollapsedStr =
					localStorage.getItem("nocr_collapsed_templates") || "[]";
				let currentCollapsed: string[] = [];
				try {
					currentCollapsed = JSON.parse(currentCollapsedStr);
				} catch (_) {}

				if (groupContainer.classList.contains("is-collapsed")) {
					groupContainer.classList.remove("is-collapsed");
					currentCollapsed = currentCollapsed.filter(
						(name) => name !== tmplName,
					);
				} else {
					groupContainer.classList.add("is-collapsed");
					if (!currentCollapsed.includes(tmplName)) {
						currentCollapsed.push(tmplName);
					}
				}
				localStorage.setItem(
					"nocr_collapsed_templates",
					JSON.stringify(currentCollapsed),
				);
			});
		});

	// Attach dotted card listeners
	document.querySelectorAll(".spawn-ws-dotted-btn").forEach((btn: Element) => {
		btn.addEventListener("click", (e: Event) => {
			const target = e.currentTarget as HTMLElement;
			// Stop propagation so it doesn't trigger parent group toggle collapse
			e.stopPropagation();
			const name = target.getAttribute("data-tmpl-name");
			if (name) openSpawnModal(name);
		});
	});

	// Attach spec view modal listeners inside workspace card / template headers
	document.querySelectorAll(".view-spec-btn").forEach((btn: Element) => {
		btn.addEventListener("click", async (e: Event) => {
			const name = (e.currentTarget as HTMLButtonElement).getAttribute(
				"data-tmpl-name",
			);
			if (name) await openTmplSpecModal(name);
		});
	});

	// Attach event listeners
	document.querySelectorAll(".stop-ws-btn").forEach((btn: Element) => {
		btn.addEventListener("click", async (e: Event) => {
			const target = e.currentTarget as HTMLButtonElement;
			const wsId = target.getAttribute("data-ws-id");
			if (wsId) {
				target.setAttribute("disabled", "true");
				target.textContent = "Stopping...";
				await stopWorkspace(wsId);
			}
		});
	});

	document.querySelectorAll(".upgrade-ws-btn").forEach((btn: Element) => {
		btn.addEventListener("click", async (e: Event) => {
			const target = e.currentTarget as HTMLButtonElement;
			const wsId = target.getAttribute("data-ws-id");
			if (wsId) {
				if (
					confirm(
						`Are you sure you want to upgrade workspace ${wsId}? This will delete the current pod and spawn a new one.`,
					)
				) {
					target.setAttribute("disabled", "true");
					target.textContent = "Upgrading...";
					await upgradeWorkspace(wsId);
				}
			}
		});
	});

	document.querySelectorAll(".logs-ws-btn").forEach((btn: Element) => {
		btn.addEventListener("click", (e: Event) => {
			const target = e.currentTarget as HTMLButtonElement;
			const podName = target.getAttribute("data-pod-name");
			if (podName) openLogsModal(podName);
		});
	});

	document.querySelectorAll(".events-ws-btn").forEach((btn: Element) => {
		btn.addEventListener("click", (e: Event) => {
			const target = e.currentTarget as HTMLButtonElement;
			const wsId = target.getAttribute("data-ws-id");
			if (wsId) openEventsModal(wsId);
		});
	});

	document.querySelectorAll(".preview-ws-btn").forEach((btn: Element) => {
		btn.addEventListener("click", (e: Event) => {
			const target = e.currentTarget as HTMLButtonElement;
			const wsId = target.getAttribute("data-ws-id");
			const path = target.getAttribute("data-preview-path");
			const type = target.getAttribute("data-preview-type") || "html";
			if (wsId && path) {
				openPreviewModal(wsId, path, type);
			}
		});
	});

	document.querySelectorAll(".view-ws-spec-btn").forEach((btn: Element) => {
		btn.addEventListener("click", async (e: Event) => {
			const target = e.currentTarget as HTMLButtonElement;
			const wsId = target.getAttribute("data-ws-id");
			if (wsId) {
				await openWsSpecModal(wsId);
			}
		});
	});
}

async function upgradeWorkspace(id: string) {
	clearError();
	try {
		showToast(`Workspace "${id}" upgrade started...`, "success");
		const res = await app.callServerTool({
			name: "upgrade_workspace",
			arguments: {
				id,
				namespace: currentNamespace,
				jwtPayload: getJwtPayload(),
			},
		});
		if (res.isError) {
			showToast(
				`Failed to upgrade workspace: ${(res.content?.[0] as any)?.text || "Unknown error"}`,
				"error",
			);
		} else {
			showToast(`Workspace "${id}" upgraded successfully`, "success");
		}
	} catch (err) {
		showError(`Error calling upgrade_workspace: ${err}`);
	}
	await refreshAll();
}

async function upgradeAllWorkspaces() {
	clearError();
	if (upgradeAllBtn) {
		upgradeAllBtn.setAttribute("disabled", "true");
		upgradeAllBtn.textContent = "Upgrading All...";
	}
	try {
		showToast("Upgrading all outdated workspaces...", "success");
		const res = await app.callServerTool({
			name: "upgrade_all_workspaces",
			arguments: {
				namespace: currentNamespace,
				jwtPayload: getJwtPayload(),
			},
		});
		if (res.isError) {
			showToast(
				`Failed to upgrade workspaces: ${(res.content?.[0] as any)?.text || "Unknown error"}`,
				"error",
			);
		} else {
			const sc = res.structuredContent as any;
			const upgradedCount = sc?.upgraded?.length || 0;
			const failedCount = sc?.failed?.length || 0;
			if (failedCount > 0) {
				showToast(
					`Upgraded ${upgradedCount} workspaces, ${failedCount} failed`,
					"error",
				);
			} else {
				showToast(
					`Successfully upgraded ${upgradedCount} workspaces`,
					"success",
				);
			}
		}
	} catch (err) {
		showError(`Error calling upgrade_all_workspaces: ${err}`);
	} finally {
		if (upgradeAllBtn) {
			upgradeAllBtn.removeAttribute("disabled");
			upgradeAllBtn.textContent = "Upgrade All Outdated";
		}
	}
	await refreshAll();
}

async function openEventsModal(wsId: string) {
	if (!eventsModal || !eventsTitle || !eventsContent) return;
	activeEventWsId = wsId;
	eventsTitle.textContent = wsId;
	eventsContent.textContent = "Fetching events...";
	eventsModal.classList.remove("hidden");
	await fetchEvents();
}

function closeEventsModal() {
	if (!eventsModal) return;
	eventsModal.classList.add("hidden");
	activeEventWsId = null;
}

async function fetchEvents() {
	if (!activeEventWsId || !eventsContent) return;
	try {
		const res = await app.callServerTool({
			name: "get_workspace_events",
			arguments: {
				id: activeEventWsId,
				namespace: currentNamespace,
				jwtPayload: getJwtPayload(),
			},
		});
		if (res.isError) {
			eventsContent.textContent = `Error fetching events: ${(res.content?.[0] as any)?.text || "Unknown error"}`;
		} else {
			const sc = res.structuredContent as any;
			if (sc?.events && sc.events.length > 0) {
				eventsContent.textContent = sc.events
					.map(
						(e: any) =>
							`[${e.timestamp}] [${e.type}] ${e.reason}: ${e.message}`,
					)
					.join("\n");
			} else {
				eventsContent.textContent = "No events found.";
			}
		}
	} catch (err) {
		eventsContent.textContent = `Error calling get_workspace_events: ${err}`;
	}
}

function renderTemplates() {
	if (!templatesList) return;

	const filteredTemplates = templates.filter((tmpl) => {
		if (!searchQuery) return true;
		return (
			tmpl.name.toLowerCase().includes(searchQuery) ||
			tmpl.tag?.toLowerCase().includes(searchQuery) ||
			tmpl.description?.toLowerCase().includes(searchQuery)
		);
	});

	if (filteredTemplates.length === 0) {
		templatesList.innerHTML = `
      <div class="p-6 text-center theme-text-muted text-sm">
        ${searchQuery ? "No matching templates found." : "No templates registered in the cluster."}
      </div>
    `;
		return;
	}

	templatesList.innerHTML = filteredTemplates
		.map((tmpl) => {
			let apisHtml = "";
			if (tmpl.apis && tmpl.apis.length > 0) {
				const badges = tmpl.apis
					.map((api) => {
						const tooltip = api.desc ? `title="${api.desc}"` : "";
						const methodBadge = api.method
							? `<span class="opacity-75 text-[9px] uppercase font-bold mr-0.5">${api.method.split(",")[0]}</span>`
							: "";
						return `<span ${tooltip} class="px-2 py-0.5 theme-button-secondary rounded text-[10px] font-medium flex items-center gap-1 select-none">
							${methodBadge}${api.name}
						</span>`;
					})
					.join(" ");
				apisHtml = `<div class="flex flex-wrap gap-1.5 items-center mt-2">
					<strong class="text-[10px] theme-text-muted">APIs:</strong>
					${badges}
				</div>`;
			}
			return `
      <div class="theme-card-row p-5 flex flex-col justify-between gap-3 transition">
        <div>
          <div class="flex items-center justify-between">
            <h4 class="font-bold theme-text-title text-sm font-mono">${tmpl.name}</h4>
            ${tmpl.tag ? `<span class="theme-badge-coral">${tmpl.tag}</span>` : ""}
          </div>
          <p class="text-xs theme-text-muted mt-1 leading-normal">${tmpl.description || "No description provided."}</p>
          ${apisHtml}
        </div>
        
        <div class="flex justify-end gap-2">
          <button data-tmpl-name="${tmpl.name}" class="view-spec-btn theme-button-secondary px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Spec
          </button>
          <button data-tmpl-name="${tmpl.name}" class="spawn-ws-modal-btn theme-button-primary px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer"${!capabilities.enabledTools.includes("spawn_workspace") ? ' disabled title="Insufficient permissions"' : ""}>
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Spawn Sandbox
          </button>
        </div>
      </div>
    `;
		})
		.join("");

	// Attach event listeners
	document.querySelectorAll(".spawn-ws-modal-btn").forEach((btn: Element) => {
		btn.addEventListener("click", (e: Event) => {
			const name = (e.currentTarget as HTMLButtonElement).getAttribute(
				"data-tmpl-name",
			);
			if (name) openSpawnModal(name);
		});
	});

	document.querySelectorAll(".view-spec-btn").forEach((btn: Element) => {
		btn.addEventListener("click", async (e: Event) => {
			const name = (e.currentTarget as HTMLButtonElement).getAttribute(
				"data-tmpl-name",
			);
			if (name) await openTmplSpecModal(name);
		});
	});
}

// Tool invocation: stop_workspace
async function stopWorkspace(id: string) {
	clearError();
	try {
		const res = await app.callServerTool({
			name: "stop_workspace",
			arguments: {
				id,
				namespace: currentNamespace,
				jwtPayload: getJwtPayload(),
			},
		});
		if (res.isError) {
			showToast(
				`Failed to stop workspace: ${(res.content?.[0] as any)?.text || "Unknown error"}`,
				"error",
			);
		} else {
			showToast(`Workspace "${id}" stopping...`, "success");
		}
	} catch (err) {
		showError(`Error calling stop_workspace: ${err}`);
	}
	await refreshAll();
}

// Tool invocation: delete_pod
async function _deletePod(name: string) {
	clearError();
	try {
		const res = await app.callServerTool({
			name: "delete_pod",
			arguments: { name, namespace: currentNamespace },
		});
		if (res.isError) {
			showToast(
				`Failed to delete pod: ${(res.content?.[0] as any)?.text || "Unknown error"}`,
				"error",
			);
		} else {
			showToast(`Pod "${name}" deleted successfully`, "success");
		}
	} catch (err) {
		showError(`Error calling delete_pod: ${err}`);
	}
	await refreshAll();
}

// Logs Modal functions
async function openLogsModal(podName: string) {
	activeLogPod = podName;
	if (logsTitle) logsTitle.textContent = podName;
	if (logsContent) logsContent.textContent = "Fetching logs...";
	if (logsModal) logsModal.classList.remove("hidden");
	await fetchLogs();
}

async function fetchLogs() {
	if (!activeLogPod || !logsContent) return;
	try {
		const res = await app.callServerTool({
			name: "get_pod_logs",
			arguments: {
				name: activeLogPod,
				namespace: currentNamespace,
				tailLines: 200,
			},
		});

		if (res.isError) {
			logsContent.textContent = `Error: ${(res.content?.[0] as any)?.text || "Could not fetch container logs."}`;
		} else {
			const logs = (res.structuredContent as any)?.logs || "(no logs)";
			logsContent.textContent = logs;
			// Scroll to bottom
			setTimeout(() => {
				logsContent.scrollTop = logsContent.scrollHeight;
			}, 50);
		}
	} catch (err) {
		logsContent.textContent = `Error: ${err}`;
	}
}

function closeLogsModal() {
	activeLogPod = null;
	if (logsModal) logsModal.classList.add("hidden");
}

function sanitizeId(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

// Spawn Modal functions
async function openSpawnModal(tmplName: string) {
	if (spawnTemplateTitle)
		spawnTemplateTitle.textContent = `Template: ${tmplName}`;
	if (spawnTemplateRef) spawnTemplateRef.value = tmplName;
	if (workspaceIdInput) {
		const payload = getJwtPayload();
		const userId = payload
			? payload.sub || payload.identity || payload.name
			: undefined;
		const sanitizedUser = userId ? sanitizeId(String(userId)) : "";
		const prefix = sanitizedUser ? `${sanitizedUser}-` : "ws-";
		const rand = Math.floor(1000 + Math.random() * 9000);
		let generatedId = `${prefix}${tmplName}-${rand}`;

		// If too long, truncate the sanitized user prefix part first to keep template name and rand intact
		if (generatedId.length > 55) {
			const suffix = `${tmplName}-${rand}`;
			const allowedUserLen = 55 - suffix.length - 1; // -1 for the extra hyphen
			if (allowedUserLen > 0) {
				const truncatedUser = sanitizedUser
					.slice(0, allowedUserLen)
					.replace(/-$/, "");
				generatedId = truncatedUser ? `${truncatedUser}-${suffix}` : suffix;
			} else {
				generatedId = suffix.slice(0, 55);
			}
		}

		workspaceIdInput.value = generatedId;
		workspaceIdInput.placeholder = generatedId;
	}
	if (workspaceNameInput) {
		workspaceNameInput.value = "";
	}

	// Dynamic context inputs based on template
	const tmpl = templates.find((t) => t.name === tmplName);
	const reqContext = tmpl?.requiredContext || [];

	if (contextVariablesContainer && contextInputs) {
		contextInputs.innerHTML = "";
		if (reqContext.length > 0) {
			contextVariablesContainer.classList.remove("hidden");
			for (const key of reqContext) {
				const div = document.createElement("div");
				div.className = "flex flex-col space-y-1";

				const label = document.createElement("label");
				label.setAttribute("for", `context-var-${key}`);
				label.className =
					"block text-[10px] font-bold theme-text-muted font-mono uppercase tracking-wider";
				label.textContent = key;

				const input = document.createElement("input");
				input.type = "text";
				input.id = `context-var-${key}`;
				input.required = true;
				input.className =
					"theme-text-input w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none transition";
				input.placeholder = `Value for ${key}`;

				// Pre-populate defaults for common local/testing services
				if (key === "AWS_ENDPOINT_URL") {
					input.value =
						window.location.port === "8080"
							? "http://rustfs.nogoo9.svc.cluster.local:80"
							: "http://localhost:9000";
				} else if (key === "S3_BUCKET") {
					input.value = "nogoo9-test-bucket";
				} else if (key === "S3_FOLDER") {
					input.value = `folder-${Math.floor(Math.random() * 1000)}`;
				} else if (key === "AWS_ACCESS_KEY_ID") {
					input.value =
						window.location.port === "8080" ? "test-access-key" : "minioadmin";
				} else if (key === "AWS_SECRET_ACCESS_KEY") {
					input.value =
						window.location.port === "8080" ? "test-secret-key" : "minioadmin";
				}

				div.appendChild(label);
				div.appendChild(input);
				const note = document.createElement("span");
				note.className = "text-[10px] text-amber-500 font-sans mt-1 block";
				note.textContent =
					"⚠️ Note: This secret will be visible to all. We will implement a proper secret management later.";
				div.appendChild(note);
				contextInputs.appendChild(div);
			}
		} else {
			contextVariablesContainer.classList.add("hidden");
		}
	}

	if (targetUserContainer) {
		if (capabilities.isAdmin) {
			targetUserContainer.classList.remove("hidden");
			if (targetUserSubInput) targetUserSubInput.value = "";
		} else {
			targetUserContainer.classList.add("hidden");
		}
	}

	if (spawnModal) spawnModal.classList.remove("hidden");
}

function closeSpawnModal() {
	if (spawnModal) spawnModal.classList.add("hidden");
}

// Spawn Workspace Submit
if (spawnForm) {
	spawnForm.addEventListener("submit", async (e: Event) => {
		e.preventDefault();
		const tmplName = spawnTemplateRef.value;
		let wsId = workspaceIdInput.value.trim();
		if (!wsId) wsId = workspaceIdInput.placeholder;
		const wsName = workspaceNameInput?.value.trim() || undefined;
		const userSub = targetUserSubInput?.value.trim() || undefined;

		// Collect context values
		const context: Record<string, string> = {};
		const tmpl = templates.find((t) => t.name === tmplName);
		const reqContext = tmpl?.requiredContext || [];
		for (const key of reqContext) {
			const input = document.getElementById(
				`context-var-${key}`,
			) as HTMLInputElement;
			if (input) {
				context[key] = input.value.trim();
			}
		}

		closeSpawnModal();
		clearError();

		// Call spawn_workspace
		try {
			const res = await app.callServerTool({
				name: "spawn_workspace",
				arguments: {
					id: wsId,
					name: wsName,
					templateRef: tmplName,
					namespace: currentNamespace,
					context,
					jwtPayload: getJwtPayload(),
					...(capabilities.isAdmin && userSub ? { userSub } : {}),
				},
			});
			if (res.isError) {
				showToast(
					`Failed to spawn workspace: ${(res.content?.[0] as any)?.text || "Unknown error"}`,
					"error",
				);
			} else {
				showToast(`Workspace "${wsId}" spawned successfully`, "success");
			}
		} catch (err) {
			showError(`Error spawning workspace: ${err}`);
		}

		await refreshAll();
	});
}

// Template Spec Modal functions
async function openTmplSpecModal(tmplName: string) {
	if (tmplSpecTitle) tmplSpecTitle.textContent = `${tmplName} Specification`;
	if (tmplSpecSubtitle) tmplSpecSubtitle.textContent = `ConfigMap: ${tmplName}`;

	if (tmplSpecLoading) {
		tmplSpecLoading.textContent = "Fetching template specification...";
		tmplSpecLoading.classList.remove("hidden");
	}
	if (tmplSpecAnnotationsContainer)
		tmplSpecAnnotationsContainer.classList.add("hidden");
	if (tmplSpecLabelsContainer) tmplSpecLabelsContainer.classList.add("hidden");
	if (tmplSpecCodeContainer) tmplSpecCodeContainer.classList.add("hidden");
	if (tmplSpecModal) tmplSpecModal.classList.remove("hidden");

	try {
		const res = await app.callServerTool({
			name: "get_template",
			arguments: { name: tmplName, namespace: currentNamespace },
		});
		if (res.isError) {
			if (tmplSpecLoading) {
				tmplSpecLoading.textContent = `Error: ${(res.content?.[0] as any)?.text || "Could not fetch spec"}`;
			}
		} else {
			const data = res.structuredContent as any;

			// Show/Hide Loading
			if (tmplSpecLoading) tmplSpecLoading.classList.add("hidden");

			// Populate Annotations Grid
			const annotations = data.annotations || {};
			const supported = [
				{ key: "nogoo9/description", label: "Description" },
				{ key: "nogoo9/tag", label: "Tag" },
				{ key: "nogoo9/required-context", label: "Required Context" },
				{ key: "nogoo9/workspace-port", label: "Workspace Port" },
				{ key: "nogoo9/workspace-path", label: "Workspace Path" },
				{ key: "nogoo9/workspace-type", label: "Workspace Type" },
				{ key: "nogoo9/preview-path", label: "Preview Path (Fallback)" },
				{ key: "nogoo9/preview-type", label: "Preview Type (Fallback)" },
				{ key: "nogoo9/default-grace-period", label: "Grace Period (Sec)" },
				{ key: "nogoo9/init-image", label: "Init Image" },
				{ key: "nogoo9/init-command", label: "Init Command" },
				{ key: "nogoo9/pre-stop-command", label: "Pre-Stop Command" },
				{
					key: "nogoo9/pre-stop-sidecar-image",
					label: "Pre-Stop Sidecar Image",
				},
			];

			const gridHtml = supported
				.map(({ key, label }) => {
					const val = annotations[key];
					if (!val) return "";
					return `
						<div class="flex flex-col space-y-1">
							<span class="text-[10px] font-bold theme-text-muted uppercase tracking-wider">${label}</span>
							<span class="text-xs theme-text-body font-mono break-all">${val}</span>
						</div>
					`;
				})
				.filter(Boolean)
				.join("");

			let apisHtml = "";
			if (data.apis && data.apis.length > 0) {
				const apisList = data.apis
					.map((api: any) => {
						const methodText = api.method ? ` [${api.method}]` : "";
						const descText = api.desc ? ` - ${api.desc}` : "";
						return `<div class="text-xs theme-text-body font-mono break-all">• ${api.name} (Port ${api.port}, Path ${api.path})${methodText}${descText}</div>`;
					})
					.join("");
				apisHtml = `
					<div class="flex flex-col space-y-1 col-span-1 sm:col-span-2 mt-2">
						<span class="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Configured APIs</span>
						<div class="flex flex-col gap-1">${apisList}</div>
					</div>
				`;
			}

			if (tmplSpecAnnotationsGrid && tmplSpecAnnotationsContainer) {
				if (gridHtml || apisHtml) {
					tmplSpecAnnotationsGrid.innerHTML = gridHtml + apisHtml;
					tmplSpecAnnotationsContainer.classList.remove("hidden");
				} else {
					tmplSpecAnnotationsContainer.classList.add("hidden");
				}
			}

			// Populate Labels Badge List
			const labels = data.labels || {};
			const labelBadges = Object.entries(labels)
				.map(
					([k, v]) =>
						`<span class="theme-badge-coral font-mono text-[10px]">${k}=${v}</span>`,
				)
				.join(" ");

			if (tmplSpecLabelsList && tmplSpecLabelsContainer) {
				if (labelBadges) {
					tmplSpecLabelsList.innerHTML = labelBadges;
					tmplSpecLabelsContainer.classList.remove("hidden");
				} else {
					tmplSpecLabelsContainer.classList.add("hidden");
				}
			}

			// Populate Spec Code block
			if (tmplSpecCode && tmplSpecCodeContainer) {
				const fullSpec = {
					metadata: {
						name: data.name,
						namespace: data.namespace,
						labels: data.labels || {},
						annotations: data.annotations || {},
					},
					spec: data.spec || {},
				};
				tmplSpecCode.textContent = JSON.stringify(fullSpec, null, 2);
				tmplSpecCodeContainer.classList.remove("hidden");
			}
		}
	} catch (err) {
		if (tmplSpecLoading) {
			tmplSpecLoading.textContent = `Error: ${err}`;
		}
	}
}

// Workspace Spec Modal functions
async function openWsSpecModal(wsId: string) {
	if (tmplSpecTitle) tmplSpecTitle.textContent = `${wsId} Specification`;
	if (tmplSpecSubtitle) tmplSpecSubtitle.textContent = `Workspace Pod: ${wsId}`;

	if (tmplSpecLoading) {
		tmplSpecLoading.textContent = "Fetching workspace specification...";
		tmplSpecLoading.classList.remove("hidden");
	}
	if (tmplSpecAnnotationsContainer)
		tmplSpecAnnotationsContainer.classList.add("hidden");
	if (tmplSpecLabelsContainer) tmplSpecLabelsContainer.classList.add("hidden");
	if (tmplSpecCodeContainer) tmplSpecCodeContainer.classList.add("hidden");
	if (tmplSpecModal) tmplSpecModal.classList.remove("hidden");

	try {
		const res = await app.callServerTool({
			name: "get_workspace",
			arguments: {
				id: wsId,
				namespace: currentNamespace,
				jwtPayload: getJwtPayload(),
			},
		});
		if (res.isError) {
			if (tmplSpecLoading) {
				tmplSpecLoading.textContent = `Error: ${(res.content?.[0] as any)?.text || "Could not fetch spec"}`;
			}
		} else {
			const data = res.structuredContent as any;

			// Show/Hide Loading
			if (tmplSpecLoading) tmplSpecLoading.classList.add("hidden");

			// Populate Annotations Grid
			const annotations = data.annotations || {};
			const supported = [
				{ key: "nogoo9/workspace-name", label: "Name" },
				{ key: "nogoo9/template-ref", label: "Template Ref" },
				{ key: "nogoo9/user-sub", label: "Owner" },
				{ key: "nogoo9/workspace-port", label: "Workspace Port" },
				{ key: "nogoo9/workspace-path", label: "Workspace Path" },
				{ key: "nogoo9/workspace-type", label: "Workspace Type" },
				{ key: "nogoo9/preview-path", label: "Preview Path (Fallback)" },
				{ key: "nogoo9/preview-type", label: "Preview Type (Fallback)" },
				{ key: "nogoo9/default-grace-period", label: "Grace Period (Sec)" },
				{ key: "nogoo9/init-image", label: "Init Image" },
				{ key: "nogoo9/init-command", label: "Init Command" },
				{ key: "nogoo9/pre-stop-command", label: "Pre-Stop Command" },
				{
					key: "nogoo9/pre-stop-sidecar-image",
					label: "Pre-Stop Sidecar Image",
				},
			];

			const gridHtml = supported
				.map(({ key, label }) => {
					const val = annotations[key];
					if (!val) return "";
					return `
						<div class="flex flex-col space-y-1">
							<span class="text-[10px] font-bold theme-text-muted uppercase tracking-wider">${label}</span>
							<span class="text-xs theme-text-body font-mono break-all">${val}</span>
						</div>
					`;
				})
				.filter(Boolean)
				.join("");

			let apisHtml = "";
			if (data.apis && data.apis.length > 0) {
				const apisList = data.apis
					.map((api: any) => {
						const apiPath = api.path.startsWith("/")
							? api.path
							: `/${api.path}`;
						const methodText = api.method
							? api.method.split(",")[0].toUpperCase()
							: "GET";
						const tokenQuery = activeToken
							? `?token=${encodeURIComponent(activeToken)}`
							: "";
						const linkUrl = `${basePath}/route/${wsId}${apiPath}${tokenQuery}`;
						const isGet = methodText === "GET";

						const methodBadge = api.method ? ` [${api.method}]` : "";
						const descText = api.desc ? ` - ${api.desc}` : "";
						const pathHtml = isGet
							? `<a href="${linkUrl}" target="_blank" class="theme-text-link hover:underline break-all">${api.path}</a>`
							: `<span class="theme-text-muted break-all">${api.path}</span>`;

						return `<div class="text-xs theme-text-body font-mono break-all">• ${api.name} (Port ${api.port}, Path ${pathHtml})${methodBadge}${descText}</div>`;
					})
					.join("");
				apisHtml = `
					<div class="flex flex-col space-y-1 col-span-1 sm:col-span-2 mt-2">
						<span class="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Configured APIs</span>
						<div class="flex flex-col gap-1">${apisList}</div>
					</div>
				`;
			}

			if (tmplSpecAnnotationsGrid && tmplSpecAnnotationsContainer) {
				if (gridHtml || apisHtml) {
					tmplSpecAnnotationsGrid.innerHTML = gridHtml + apisHtml;
					tmplSpecAnnotationsContainer.classList.remove("hidden");
				} else {
					tmplSpecAnnotationsContainer.classList.add("hidden");
				}
			}

			// Populate Labels Badge List
			const labels = data.labels || {};
			const labelBadges = Object.entries(labels)
				.map(
					([k, v]) =>
						`<span class="theme-badge-coral font-mono text-[10px]">${k}=${v}</span>`,
				)
				.join(" ");

			if (tmplSpecLabelsList && tmplSpecLabelsContainer) {
				if (labelBadges) {
					tmplSpecLabelsList.innerHTML = labelBadges;
					tmplSpecLabelsContainer.classList.remove("hidden");
				} else {
					tmplSpecLabelsContainer.classList.add("hidden");
				}
			}

			// Populate Spec Code block
			if (tmplSpecCode && tmplSpecCodeContainer) {
				const fullSpec = {
					metadata: {
						name: data.name,
						namespace: currentNamespace,
						labels: data.labels || {},
						annotations: data.annotations || {},
					},
					spec: data.spec || {},
				};
				tmplSpecCode.textContent = JSON.stringify(fullSpec, null, 2);
				tmplSpecCodeContainer.classList.remove("hidden");
			}
		}
	} catch (err) {
		if (tmplSpecLoading) {
			tmplSpecLoading.textContent = `Error: ${err}`;
		}
	}
}

function closeTmplSpecModal() {
	if (tmplSpecModal) tmplSpecModal.classList.add("hidden");
}

if (closeTmplSpecBtn)
	closeTmplSpecBtn.addEventListener("click", closeTmplSpecModal);
if (closeTmplSpecFooterBtn)
	closeTmplSpecFooterBtn.addEventListener("click", closeTmplSpecModal);

// Create Template Modal functions
function closeCreateTmplModal() {
	if (createTmplModal) createTmplModal.classList.add("hidden");
}

if (createTmplBtn) {
	createTmplBtn.addEventListener("click", () => {
		if (createTmplNameInput) createTmplNameInput.value = "";
		if (createTmplDescInput) createTmplDescInput.value = "";
		if (createTmplTagInput) createTmplTagInput.value = "";
		if (createTmplSpecInput) {
			createTmplSpecInput.value = `{
  "containers": [
    {
      "name": "workspace",
      "image": "node:20-alpine",
      "command": ["sleep", "infinity"]
    }
  ]
}`;
		}
		const clearInput = (id: string) => {
			const el = document.getElementById(id) as
				| HTMLInputElement
				| HTMLSelectElement;
			if (el) el.value = el.tagName === "SELECT" ? "html" : "";
		};
		clearInput("create-tmpl-req-context");
		clearInput("create-tmpl-port");
		clearInput("create-tmpl-preview-path");
		clearInput("create-tmpl-preview-type");
		clearInput("create-tmpl-grace-period");
		clearInput("create-tmpl-init-image");
		clearInput("create-tmpl-init-cmd");
		clearInput("create-tmpl-prestop-cmd");
		clearInput("create-tmpl-prestop-sidecar");

		if (createTmplModal) createTmplModal.classList.remove("hidden");
	});
}

if (closeCreateTmplBtn)
	closeCreateTmplBtn.addEventListener("click", closeCreateTmplModal);
if (cancelCreateTmplBtn)
	cancelCreateTmplBtn.addEventListener("click", closeCreateTmplModal);

if (createTmplForm) {
	createTmplForm.addEventListener("submit", async (e: Event) => {
		e.preventDefault();
		const name = createTmplNameInput.value.trim();
		const description = createTmplDescInput.value.trim();
		const tag = createTmplTagInput.value.trim();
		const specRaw = createTmplSpecInput.value.trim();

		let spec: any;
		try {
			spec = JSON.parse(specRaw);
		} catch (err) {
			showToast(`Invalid JSON in pod specification: ${err}`, "error");
			return;
		}

		// Collect annotations from the form fields
		const annotations: Record<string, string> = {};
		const reqContext = (
			document.getElementById("create-tmpl-req-context") as HTMLInputElement
		)?.value.trim();
		if (reqContext) annotations["nogoo9/required-context"] = reqContext;
		const port = (
			document.getElementById("create-tmpl-port") as HTMLInputElement
		)?.value.trim();
		if (port) annotations["nogoo9/workspace-port"] = port;
		const previewPath = (
			document.getElementById("create-tmpl-preview-path") as HTMLInputElement
		)?.value.trim();
		if (previewPath) annotations["nogoo9/preview-path"] = previewPath;
		const previewType = (
			document.getElementById("create-tmpl-preview-type") as HTMLSelectElement
		)?.value;
		if (previewType) annotations["nogoo9/preview-type"] = previewType;
		const gracePeriod = (
			document.getElementById("create-tmpl-grace-period") as HTMLInputElement
		)?.value.trim();
		if (gracePeriod) annotations["nogoo9/default-grace-period"] = gracePeriod;
		const initImage = (
			document.getElementById("create-tmpl-init-image") as HTMLInputElement
		)?.value.trim();
		if (initImage) annotations["nogoo9/init-image"] = initImage;
		const initCmd = (
			document.getElementById("create-tmpl-init-cmd") as HTMLInputElement
		)?.value.trim();
		if (initCmd) annotations["nogoo9/init-command"] = initCmd;
		const prestopCmd = (
			document.getElementById("create-tmpl-prestop-cmd") as HTMLInputElement
		)?.value.trim();
		if (prestopCmd) annotations["nogoo9/pre-stop-command"] = prestopCmd;
		const prestopSidecar = (
			document.getElementById("create-tmpl-prestop-sidecar") as HTMLInputElement
		)?.value.trim();
		if (prestopSidecar)
			annotations["nogoo9/pre-stop-sidecar-image"] = prestopSidecar;

		closeCreateTmplModal();

		try {
			const res = await app.callServerTool({
				name: "create_template",
				arguments: {
					name,
					namespace: currentNamespace,
					description,
					tag,
					annotations,
					spec,
				},
			});
			if (res.isError) {
				showToast(
					`Failed to create template: ${(res.content?.[0] as any)?.text || "Unknown error"}`,
					"error",
				);
			} else {
				showToast(`Template "${name}" created successfully`, "success");
			}
		} catch (err) {
			showToast(`Error creating template: ${err}`, "error");
		}
		await refreshAll();
	});
}

// Global modal and action listeners
if (refreshBtn) refreshBtn.addEventListener("click", () => refreshAll());
if (closeLogsBtn) closeLogsBtn.addEventListener("click", closeLogsModal);
if (closeLogsFooterBtn)
	closeLogsFooterBtn.addEventListener("click", closeLogsModal);
if (refreshLogsBtn) refreshLogsBtn.addEventListener("click", fetchLogs);

if (closeEventsBtn) closeEventsBtn.addEventListener("click", closeEventsModal);
if (closeEventsFooterBtn)
	closeEventsFooterBtn.addEventListener("click", closeEventsModal);
if (refreshEventsBtn) refreshEventsBtn.addEventListener("click", fetchEvents);
if (upgradeAllBtn)
	upgradeAllBtn.addEventListener("click", upgradeAllWorkspaces);

if (closeSpawnBtn) closeSpawnBtn.addEventListener("click", closeSpawnModal);
if (cancelSpawnBtn) cancelSpawnBtn.addEventListener("click", closeSpawnModal);

// Fallback HTTP Transport Client (when opened outside an MCP App Host iframe).
// basePath is the server-injected BASE_URL prefix (e.g. "/gateway/no-crd").
// All fetch calls to server endpoints (MCP, themes, logout, route proxy) MUST
// use basePath so they resolve correctly behind reverse proxies. See ADR-011.
let _fallbackMode = false;
let httpSessionId: string | null = null;
const basePath = (window as any).__NOCR_BASE_URL__ || "";
let mcpEndpointUrl = `${basePath}/mcp`;
const mcpVersion = "2024-11-05";
let lastHttpFallbackError = "";

// Fetch version and branding from server and populate the header
const appVersionEl = document.getElementById("app-version");
const appTitleEl = document.getElementById("app-title");
const appSubtitleEl = document.getElementById("app-subtitle");
fetch(`${basePath}/healthz`)
	.then((r) => r.json())
	.then((data: any) => {
		if (appVersionEl && data.version) {
			appVersionEl.textContent = `v${data.version}`;
			appVersionEl.classList.remove("hidden");
		}
		if (data.branding) {
			if (appTitleEl && data.branding.title) {
				appTitleEl.textContent = data.branding.title;
				document.title = data.branding.title;
			}
			if (appSubtitleEl && data.branding.subtitle) {
				appSubtitleEl.textContent = data.branding.subtitle;
			}
		}
	})
	.catch(() => {});

async function initHttpFallback(): Promise<boolean> {
	const endpoint = `${basePath}/mcp`;
	try {
		console.log(`Trying HTTP fallback endpoint: ${endpoint}`);
		const initPayload = {
			jsonrpc: "2.0",
			method: "initialize",
			params: {
				protocolVersion: mcpVersion,
				capabilities: {},
				clientInfo: { name: "nogoo9-ui-fallback", version: "0.2.0" },
			},
			id: 1,
		};
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		};
		if (activeToken) {
			headers.Authorization = `Bearer ${activeToken}`;
		}
		const resp = await fetch(endpoint, {
			method: "POST",
			headers,
			body: JSON.stringify(initPayload),
		});
		if (resp.status === 401) {
			console.warn(
				"Unauthorized initialization call. Clearing expired token...",
			);
			localStorage.removeItem("nocr_token");
			activeToken = "";
			// Don't reload — let initOidc() handle the login prompt/redirect.
			// Reloading here races with the OIDC triggerRedirect() and causes
			// an infinite refresh loop. See ADR-011.
			if (loginOverlay) loginOverlay.classList.remove("hidden");
			lastHttpFallbackError = "401: Unauthorized";
			return false;
		}
		if (resp.status === 403) {
			const text = await resp.text().catch(() => "");
			lastHttpFallbackError = `${resp.status}${text ? `: ${text}` : ""}`;
			console.warn(`Access forbidden (403): ${text}`);
			if (forbiddenOverlay) {
				if (forbiddenMessage) {
					forbiddenMessage.textContent =
						text ||
						"You do not have the required scopes or roles to access this resource.";
				}
				forbiddenOverlay.classList.remove("hidden");
			}
			return false;
		}
		if (resp.ok) {
			const refreshedToken = resp.headers.get("x-refreshed-token");
			if (refreshedToken) {
				localStorage.setItem("nocr_token", refreshedToken);
				activeToken = refreshedToken;
				updateUserBadge(refreshedToken);
			}
			const sessId = resp.headers.get("mcp-session-id");
			if (sessId) {
				httpSessionId = sessId;
			}
			mcpEndpointUrl = endpoint;
			_fallbackMode = true;
			console.log(
				`HTTP fallback initialized successfully on endpoint: ${endpoint}`,
			);
			return true;
		}
		const text = await resp.text().catch(() => "");
		lastHttpFallbackError = `${resp.status}${text ? `: ${text}` : ""}`;
		console.warn(
			`HTTP fallback failed for ${endpoint} with status ${resp.status}`,
		);
	} catch (err) {
		lastHttpFallbackError = String(err);
		console.warn(`HTTP fallback initialization failed for ${endpoint}:`, err);
	}
	return false;
}

async function callServerToolFallback(name: string, args: any): Promise<any> {
	const payload = {
		jsonrpc: "2.0",
		method: "tools/call",
		params: {
			name,
			arguments: args,
		},
		id: Math.floor(Math.random() * 1000000),
	};

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json, text/event-stream",
		"mcp-protocol-version": mcpVersion,
	};
	if (httpSessionId) {
		headers["mcp-session-id"] = httpSessionId;
	}
	if (activeToken) {
		headers.Authorization = `Bearer ${activeToken}`;
	}

	const resp = await fetch(mcpEndpointUrl, {
		method: "POST",
		headers,
		body: JSON.stringify(payload),
	});

	if (resp.status === 401) {
		console.warn("Unauthorized server call. Clearing expired token...");
		localStorage.removeItem("nocr_token");
		activeToken = "";
		// Show login overlay instead of reloading to avoid infinite refresh loop.
		if (loginOverlay) loginOverlay.classList.remove("hidden");
		throw new Error("HTTP error 401 (Unauthorized — token expired or missing)");
	}

	if (resp.status === 403) {
		const text = await resp.text().catch(() => "");
		console.warn(`Access forbidden (403): ${text}`);
		if (forbiddenOverlay) {
			if (forbiddenMessage) {
				forbiddenMessage.textContent =
					text ||
					"You do not have the required scopes or roles to access this resource.";
			}
			forbiddenOverlay.classList.remove("hidden");
		}
		throw new Error(`HTTP error 403 (${text || "Forbidden"})`);
	}

	if (!resp.ok) {
		const text = await resp.text().catch(() => "");
		const detailedMsg = text ? `${resp.status} (${text})` : `${resp.status}`;
		throw new Error(`HTTP error ${detailedMsg}`);
	}

	const refreshedToken = resp.headers.get("x-refreshed-token");
	if (refreshedToken) {
		localStorage.setItem("nocr_token", refreshedToken);
		activeToken = refreshedToken;
		updateUserBadge(refreshedToken);
	}

	const returnedSessionId = resp.headers.get("mcp-session-id");
	if (returnedSessionId) {
		httpSessionId = returnedSessionId;
	}

	const json = await resp.json();
	if (json.error) {
		return {
			isError: true,
			content: [{ type: "text", text: json.error.message }],
		};
	}
	return json.result;
}

// Density handling
function getDensity(): string {
	return localStorage.getItem("nocr_density") || "comfortable";
}

function applyDensity(density: string) {
	document.documentElement.setAttribute("data-density", density);
	const densitySelect = document.getElementById(
		"density-select",
	) as HTMLSelectElement;
	if (densitySelect) {
		densitySelect.value = density;
	}
}

function initDensity() {
	const currentDensity = getDensity();
	applyDensity(currentDensity);

	const densitySelect = document.getElementById("density-select");
	if (densitySelect) {
		densitySelect.addEventListener("change", (e) => {
			const target = e.target as HTMLSelectElement;
			const nextDensity = target.value;
			localStorage.setItem("nocr_density", nextDensity);
			applyDensity(nextDensity);
			showToast(`Density set to: ${nextDensity}`, "success");
		});
	}
}

// Layout handling
let currentLayout = "grid";
function getLayout(): string {
	return localStorage.getItem("nocr_layout") || "grid";
}

function applyLayout(layout: string) {
	currentLayout = layout;
	const gridBtn = document.getElementById("view-grid-btn");
	const listBtn = document.getElementById("view-list-btn");
	if (gridBtn && listBtn) {
		if (layout === "grid") {
			gridBtn.classList.add("bg-[var(--panel-hover-bg)]", "theme-text-title");
			gridBtn.classList.remove("theme-text-muted");
			listBtn.classList.remove(
				"bg-[var(--panel-hover-bg)]",
				"theme-text-title",
			);
			listBtn.classList.add("theme-text-muted");
		} else {
			listBtn.classList.add("bg-[var(--panel-hover-bg)]", "theme-text-title");
			listBtn.classList.remove("theme-text-muted");
			gridBtn.classList.remove(
				"bg-[var(--panel-hover-bg)]",
				"theme-text-title",
			);
			gridBtn.classList.add("theme-text-muted");
		}
	}
	// Re-render workspaces to apply layout-specific classes
	renderWorkspaces();
}

function initLayout() {
	const layout = getLayout();
	applyLayout(layout);

	const gridBtn = document.getElementById("view-grid-btn");
	const listBtn = document.getElementById("view-list-btn");
	if (gridBtn) {
		gridBtn.addEventListener("click", () => {
			localStorage.setItem("nocr_layout", "grid");
			applyLayout("grid");
		});
	}
	if (listBtn) {
		listBtn.addEventListener("click", () => {
			localStorage.setItem("nocr_layout", "list");
			applyLayout("list");
		});
	}
}

// Search handling
let searchQuery = "";
function initSearch() {
	const searchInput = document.getElementById(
		"local-search-input",
	) as HTMLInputElement;
	if (searchInput) {
		searchInput.addEventListener("input", (e) => {
			const target = e.target as HTMLInputElement;
			searchQuery = target.value.trim().toLowerCase();
			renderWorkspaces();
			renderTemplates();
		});
	}
}

// Theme handling
const THEMES = ["system", "light", "dark"] as const;
type Theme = (typeof THEMES)[number];

function getTheme(): Theme {
	return (localStorage.getItem("nocr_theme") as Theme) || "system";
}

function applyTheme(theme: Theme) {
	const isDark =
		theme === "dark" ||
		(theme === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);

	if (isDark) {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	} else {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	}

	if (themeIcon) {
		if (theme === "dark") {
			themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />`;
		} else if (theme === "light") {
			themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />`;
		} else {
			themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />`;
		}
	}
}

function initTheme() {
	const currentTheme = getTheme();
	applyTheme(currentTheme);

	if (themeBtn) {
		themeBtn.addEventListener("click", () => {
			const activeTheme = getTheme();
			const nextTheme =
				THEMES[(THEMES.indexOf(activeTheme) + 1) % THEMES.length];
			localStorage.setItem("nocr_theme", nextTheme);
			applyTheme(nextTheme);
			showToast(`Theme set to: ${nextTheme}`, "success");
		});
	}

	window
		.matchMedia("(prefers-color-scheme: dark)")
		.addEventListener("change", () => {
			if (getTheme() === "system") {
				applyTheme("system");
			}
		});

	void initCustomThemes();
}

async function fetchAndApplyCustomTheme(themeId: string) {
	const customStyleTag = document.getElementById("custom-theme-style");
	if (!customStyleTag) return;

	if (themeId === "default") {
		customStyleTag.innerHTML = "";
		return;
	}

	try {
		const res = await fetch(`${basePath}/api/themes/${themeId}.css`);
		if (res.ok) {
			const css = await res.text();
			customStyleTag.innerHTML = css;
		} else {
			showToast(`Failed to load theme: ${res.statusText}`, "error");
		}
	} catch (err) {
		console.error("Error loading theme:", err);
		showToast("Error loading theme", "error");
	}
}

async function initCustomThemes() {
	const themeSelect = document.getElementById(
		"theme-select",
	) as HTMLSelectElement | null;
	if (!themeSelect) return;

	try {
		const res = await fetch(`${basePath}/api/themes`);
		if (res.ok) {
			const themesList: Array<{ id: string; name: string }> = await res.json();
			themeSelect.innerHTML = "";
			for (const theme of themesList) {
				const opt = document.createElement("option");
				opt.value = theme.id;
				opt.textContent = theme.name;
				themeSelect.appendChild(opt);
			}

			// Restore selected theme preference
			const savedCustomTheme =
				localStorage.getItem("nocr_custom_theme") || "default";
			if (themesList.some((t) => t.id === savedCustomTheme)) {
				themeSelect.value = savedCustomTheme;
				await fetchAndApplyCustomTheme(savedCustomTheme);
			}
		}
	} catch (err) {
		console.error("Error fetching available themes:", err);
	}

	themeSelect.addEventListener("change", async () => {
		const selectedId = themeSelect.value;
		localStorage.setItem("nocr_custom_theme", selectedId);
		await fetchAndApplyCustomTheme(selectedId);
		const selectedOption = themeSelect.options.item(themeSelect.selectedIndex);
		const themeName = selectedOption ? selectedOption.text : selectedId;
		showToast(`Applied theme: ${themeName}`, "success");
	});
}

// OIDC PKCE Helpers
function generateRandomString(length: number): string {
	const array = new Uint32Array(length);
	window.crypto.getRandomValues(array);
	return Array.from(
		array,
		(dec) =>
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
				dec % 62
			],
	).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return window.crypto.subtle.digest("SHA-256", data);
}

function base64urlEncode(a: ArrayBuffer): string {
	const bytes = new Uint8Array(a);
	let str = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		str += String.fromCharCode(bytes[i]);
	}
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateChallenge(verifier: string): Promise<string> {
	const hashed = await sha256(verifier);
	return base64urlEncode(hashed);
}

interface OAuthConfig {
	discoveryUrl?: string;
	clientId?: string;
	loginMethod?: "redirect";
	scopes?: string[];
	subJsonPath?: string;
}

const oauthConfig: OAuthConfig = (window as any).__NOCR_OAUTH_CONFIG__ || {};

async function initOidc() {
	if (!oauthConfig.discoveryUrl || !oauthConfig.clientId) {
		return;
	}

	const safeRedirect = (relativePath: string, token: string) => {
		if (relativePath.startsWith("/") && !relativePath.startsWith("//")) {
			const separator = relativePath.includes("?") ? "&" : "?";
			const finalUrl = `${relativePath}${separator}token=${encodeURIComponent(token)}`;
			const loc = window.location as any;
			loc.href = finalUrl;
		}
	};

	const urlParams = new URLSearchParams(window.location.search);
	const targetRedirect = urlParams.get("redirect_uri");
	if (targetRedirect) {
		localStorage.setItem("nocr_redirect_after_login", targetRedirect);
		// Clean the parameter to keep address bar clean
		const cleanParams = new URLSearchParams(window.location.search);
		cleanParams.delete("redirect_uri");
		const newSearch = cleanParams.toString();
		const cleanUrl =
			window.location.pathname +
			(newSearch ? `?${newSearch}` : "") +
			window.location.hash;
		window.history.replaceState({}, document.title, cleanUrl);

		// If user already has a valid token, redirect back immediately
		const currentToken = localStorage.getItem("nocr_token") || activeToken;
		if (currentToken) {
			localStorage.removeItem("nocr_redirect_after_login");
			try {
				const testUrl = new URL(targetRedirect, window.location.origin);
				if (testUrl.origin === window.location.origin) {
					// Coerce to a purely relative path to prevent any chance of open redirect (CWE-601)
					const relativePath = testUrl.pathname + testUrl.search + testUrl.hash;
					safeRedirect(relativePath, currentToken);
					return;
				}
			} catch (_) {}
		}
	}

	async function triggerRedirect() {
		try {
			const state = generateRandomString(16);
			const verifier = generateRandomString(64);
			localStorage.setItem("nocr_oauth_state", state);
			localStorage.setItem("nocr_oauth_verifier", verifier);

			const challenge = await generateChallenge(verifier);

			const discRes = await fetch(oauthConfig.discoveryUrl!);
			const discData = await discRes.json();
			const authEndpoint = discData.authorization_endpoint;

			const redirectUri = window.location.origin + window.location.pathname;
			const url = new URL(authEndpoint);
			url.searchParams.set("response_type", "code");
			url.searchParams.set("client_id", oauthConfig.clientId!);
			url.searchParams.set("redirect_uri", redirectUri);
			url.searchParams.set("state", state);
			url.searchParams.set("code_challenge", challenge);
			url.searchParams.set("code_challenge_method", "S256");
			const scopes =
				Array.isArray(oauthConfig.scopes) && oauthConfig.scopes.length > 0
					? oauthConfig.scopes
					: ["openid", "profile", "email"];
			url.searchParams.set("scope", scopes.join(" "));

			window.location.href = url.toString();
		} catch (err) {
			console.error("Login redirect failed:", err);
			showToast("Failed to initialize SSO redirect", "error");
		}
	}

	// 1. Check if returning from redirect flow
	const callbackParams = new URLSearchParams(window.location.search);
	const code = callbackParams.get("code");
	const state = callbackParams.get("state");
	const error = callbackParams.get("error");
	const hasOauthCallback = code || error;

	if (code) {
		const savedState = localStorage.getItem("nocr_oauth_state");
		const codeVerifier = localStorage.getItem("nocr_oauth_verifier");
		if (state === savedState && codeVerifier) {
			try {
				const discRes = await fetch(oauthConfig.discoveryUrl);
				const discData = await discRes.json();
				const tokenEndpoint = discData.token_endpoint;

				const redirectUri = window.location.origin + window.location.pathname;
				const params = new URLSearchParams({
					grant_type: "authorization_code",
					client_id: oauthConfig.clientId,
					code,
					redirect_uri: redirectUri,
					code_verifier: codeVerifier,
				});

				const tokenRes = await fetch(tokenEndpoint, {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: params.toString(),
				});

				if (!tokenRes.ok) {
					throw new Error(`Token exchange failed: ${tokenRes.status}`);
				}
				const tokenData = await tokenRes.json();

				if (tokenData.access_token) {
					localStorage.setItem("nocr_token", tokenData.access_token);
					activeToken = tokenData.access_token;
					if (tokenData.id_token) {
						localStorage.setItem("nocr_id_token", tokenData.id_token);
					}
					if (tokenData.refresh_token) {
						await fetch(`${basePath}/mcp/auth/set-refresh`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${tokenData.access_token}`,
							},
							body: JSON.stringify({ refresh_token: tokenData.refresh_token }),
						}).catch((err) => {
							console.error("Failed to send refresh token to gateway:", err);
						});
					}
					updateUserBadge(activeToken);
					showToast("Login successful!", "success");

					const redirectAfterLogin = localStorage.getItem(
						"nocr_redirect_after_login",
					);
					if (redirectAfterLogin) {
						localStorage.removeItem("nocr_redirect_after_login");
						try {
							const testUrl = new URL(
								redirectAfterLogin,
								window.location.origin,
							);
							if (testUrl.origin === window.location.origin) {
								// Coerce to a purely relative path to prevent any chance of open redirect (CWE-601)
								const relativePath =
									testUrl.pathname + testUrl.search + testUrl.hash;
								safeRedirect(relativePath, tokenData.access_token);
								return;
							}
						} catch (_) {}
					}
				}
			} catch (e) {
				console.error("OAuth token exchange failed:", e);
				showToast("Authentication failed", "error");
				sessionStorage.setItem("nocr_oauth_failed", "true");
			} finally {
				localStorage.removeItem("nocr_oauth_state");
				localStorage.removeItem("nocr_oauth_verifier");
				const cleanUrl = window.location.pathname + window.location.hash;
				window.history.replaceState({}, document.title, cleanUrl);
			}
		}
	}

	// 2. Control visibility of login overlay and trigger auto-redirect if unauthenticated
	const token = localStorage.getItem("nocr_token") || activeToken;
	const oidcFailed = sessionStorage.getItem("nocr_oauth_failed") === "true";
	if (oidcFailed) {
		sessionStorage.removeItem("nocr_oauth_failed");
	}

	if (!token) {
		if (loginOverlay) loginOverlay.classList.remove("hidden");
		if (!hasOauthCallback && !oidcFailed) {
			console.log("Automatically redirecting to OIDC login...");
			void triggerRedirect();
		}
	}

	if (loginBtn) {
		loginBtn.addEventListener("click", async () => {
			await triggerRedirect();
		});
	}

	if (useManualTokenLink) {
		useManualTokenLink.addEventListener("click", (e) => {
			e.preventDefault();
			if (loginOverlay) loginOverlay.classList.add("hidden");
			if (tokenModal) tokenModal.classList.remove("hidden");
		});
	}

	if (forbiddenRetryBtn) {
		forbiddenRetryBtn.addEventListener("click", () => {
			localStorage.removeItem("nocr_token");
			activeToken = "";
			if (forbiddenOverlay) forbiddenOverlay.classList.add("hidden");
			window.location.reload();
		});
	}

	if (forbiddenBackBtn) {
		forbiddenBackBtn.addEventListener("click", () => {
			if (forbiddenOverlay) forbiddenOverlay.classList.add("hidden");
			if (tokenModal) tokenModal.classList.remove("hidden");
		});
	}
}

// Workspace Preview Rendering
function parseMarkdown(md: string): string {
	return md
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(
			/^### (.*$)/gim,
			'<h3 class="text-lg font-bold my-3 theme-text-title">$1</h3>',
		)
		.replace(
			/^## (.*$)/gim,
			'<h2 class="text-xl font-bold my-4 theme-text-title">$1</h2>',
		)
		.replace(
			/^# (.*$)/gim,
			'<h1 class="text-2xl font-extrabold my-5 theme-text-title">$1</h1>',
		)
		.replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
		.replace(/\*(.*)\*/gim, "<em>$1</em>")
		.replace(
			/```([\s\S]*?)```/gim,
			'<pre class="theme-code-window-card p-4 rounded-xl font-mono text-xs overflow-x-auto my-3">$1</pre>',
		)
		.replace(/`(.*?)`/gim, '<code class="theme-code-inline">$1</code>')
		.replace(
			/\[(.*?)\]\((.*?)\)/gim,
			'<a href="$2" target="_blank" class="theme-text-link hover:underline">$1</a>',
		)
		.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc my-1">$1</li>')
		.replace(/^\s*\*\s+(.*$)/gim, '<li class="ml-4 list-disc my-1">$1</li>')
		.replace(/\n/g, "<br />");
}

async function openPreviewModal(wsId: string, path: string, type: string) {
	activePreviewWorkspaceId = wsId;
	activePreviewPath = path;

	if (previewModalTitle) {
		previewModalTitle.textContent = `Workspace Preview: ${wsId}`;
	}
	if (previewModalSubtitle) {
		previewModalSubtitle.textContent = `File: ${path} (Type: ${type})`;
	}
	if (previewContentArea) {
		previewContentArea.textContent = "Loading preview...";
	}
	if (previewModal) {
		previewModal.classList.remove("hidden");
	}

	await fetchPreview(wsId, path, type);
}

async function fetchPreview(wsId: string, path: string, type: string) {
	if (!previewContentArea) return;
	const tokenQuery = activeToken
		? `?token=${encodeURIComponent(activeToken)}`
		: "";
	const url = `${basePath}/route/${wsId}/${path.replace(/^\//, "")}${tokenQuery}`;

	try {
		if (type === "html") {
			const iframe = document.createElement("iframe");
			iframe.sandbox.add("allow-scripts");
			iframe.sandbox.add("allow-same-origin");
			iframe.sandbox.add("allow-forms");
			iframe.sandbox.add("allow-popups");
			iframe.setAttribute("data-workspace-id", wsId);
			iframe.src = url;
			iframe.className =
				"w-full h-full min-h-[50vh] border-0 rounded-xl bg-white";
			previewContentArea.innerHTML = "";
			previewContentArea.appendChild(iframe);
		} else if (type === "markdown") {
			const res = await fetch(url);
			if (res.status === 403) {
				const text = await res.text().catch(() => "");
				if (forbiddenOverlay) {
					if (forbiddenMessage) {
						forbiddenMessage.textContent =
							text ||
							"You do not have the required scopes or roles to access this resource.";
					}
					forbiddenOverlay.classList.remove("hidden");
				}
				throw new Error(`HTTP error 403 (${text || "Forbidden"})`);
			}
			if (!res.ok) {
				const text = await res.text().catch(() => "");
				const detailedMsg = text ? `${res.status} (${text})` : `${res.status}`;
				throw new Error(`HTTP error ${detailedMsg}`);
			}
			const text = await res.text();
			previewContentArea.className =
				"flex-1 overflow-auto theme-feature-card p-6 min-h-[50vh] max-h-[70vh] theme-text-body";
			previewContentArea.innerHTML = parseMarkdown(text);
		} else {
			previewContentArea.textContent = `Unsupported preview type: ${type}`;
		}
	} catch (e) {
		previewContentArea.textContent = `Failed to fetch preview: ${e}`;
	}
}

function closePreviewModal() {
	activePreviewWorkspaceId = null;
	activePreviewPath = null;
	if (previewModal) {
		previewModal.classList.add("hidden");
	}
}

if (closePreviewBtn) {
	closePreviewBtn.addEventListener("click", closePreviewModal);
}
if (closePreviewFooterBtn) {
	closePreviewFooterBtn.addEventListener("click", closePreviewModal);
}
if (refreshPreviewBtn) {
	refreshPreviewBtn.addEventListener("click", () => {
		if (activePreviewWorkspaceId && activePreviewPath) {
			const ws = workspaces.find((w) => w.id === activePreviewWorkspaceId);
			const type = ws?.previewType || "html";
			fetchPreview(activePreviewWorkspaceId, activePreviewPath, type);
		}
	});
}

// Register MCP App lifecycle event listeners before connecting
let activeToolArgs: any = null;

app.ontoolinput = (params) => {
	console.log("Received tool input from host:", params);
	activeToolArgs = params.arguments;
};

app.ontoolresult = (params) => {
	console.log("Received tool result from host:", params);
	const toolName = app.getHostContext()?.toolInfo?.tool.name;
	if (!toolName) return;

	if (toolName === "list_workspaces" && params.structuredContent) {
		workspaces = (params.structuredContent as any).workspaces || [];
		renderWorkspaces();
	} else if (toolName === "list_templates" && params.structuredContent) {
		templates = (params.structuredContent as any).templates || [];
		renderTemplates();
	} else if (toolName === "get_pod_logs" && activeToolArgs?.name) {
		openLogsModal(activeToolArgs.name);
		const logs = (params.structuredContent as any)?.logs || "(no logs)";
		if (logsContent) logsContent.textContent = logs;
	} else if (toolName === "get_workspace_events" && activeToolArgs?.id) {
		openEventsModal(activeToolArgs.id);
		const sc = params.structuredContent as any;
		if (eventsContent) {
			if (sc?.events && sc.events.length > 0) {
				eventsContent.textContent = sc.events
					.map(
						(e: any) =>
							`[${e.timestamp}] [${e.type}] ${e.reason}: ${e.message}`,
					)
					.join("\n");
			} else {
				eventsContent.textContent = "No events found.";
			}
		}
	} else if (toolName === "spawn_workspace") {
		refreshAll();
	}
};

// Initialize authentication and settings listeners
initToken();
initTheme();
initDensity();
initLayout();
initSearch();
void initOidc();

if (logoutBtn) {
	logoutBtn.addEventListener("click", async () => {
		const token = localStorage.getItem("nocr_token");
		const idToken = localStorage.getItem("nocr_id_token");

		// 1. Call server /logout endpoint to clear path-scoped workspace cookies
		try {
			await fetch(`${basePath}/logout`, {
				method: "POST",
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});
		} catch (err) {
			console.warn("Failed to clear server cookies during logout:", err);
		}

		// 2. Clear local storage tokens
		localStorage.removeItem("nocr_token");
		localStorage.removeItem("nocr_id_token");
		activeToken = "";

		// 3. Trigger OIDC logout if configured
		if (oauthConfig.discoveryUrl && oauthConfig.clientId) {
			try {
				const discRes = await fetch(oauthConfig.discoveryUrl);
				const discData = await discRes.json();
				const endSessionEndpoint = discData.end_session_endpoint;
				if (endSessionEndpoint) {
					const redirectUri = window.location.origin + window.location.pathname;
					const logoutUrl = new URL(endSessionEndpoint);
					logoutUrl.searchParams.set("client_id", oauthConfig.clientId);
					logoutUrl.searchParams.set("post_logout_redirect_uri", redirectUri);
					if (idToken) {
						logoutUrl.searchParams.set("id_token_hint", idToken);
					}
					window.location.href = logoutUrl.toString();
					return;
				}
			} catch (err) {
				console.error("Failed to query OIDC end session endpoint:", err);
			}
		}

		// Fallback/standard reload
		window.location.reload();
	});
}

// Start connection handshake and retrieve stats
app
	.connect()
	.then(() => {
		console.log("Connected to MCP Host successfully!");
		refreshAll();
		setInterval(refreshAll, 5000);
	})
	.catch(async (err) => {
		console.warn("Connection to MCP Host failed, trying HTTP fallback...", err);
		const fallbackSuccess = await initHttpFallback();
		if (fallbackSuccess) {
			app.callServerTool = async (params) => {
				return callServerToolFallback(params.name, params.arguments);
			};
			console.log("HTTP fallback initialized successfully!");
			refreshAll();
			setInterval(refreshAll, 5000);
		} else {
			showError(
				`Failed to connect to MCP Host client: ${err}${
					lastHttpFallbackError
						? ` (HTTP Fallback: ${lastHttpFallbackError})`
						: ""
				}`,
			);
		}
	});
