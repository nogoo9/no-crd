/// <reference lib="dom" />
import { App } from "@modelcontextprotocol/ext-apps";

// Initialize the MCP App client bridge
const app = new App(
	{ name: "nogoo9-pod-manager", version: "0.3.0" },
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
}> = [];
let pods: Array<{
	name: string;
	namespace: string;
	phase: string;
	ready: number;
	total: number;
	restarts: number;
	podIP: string;
	node: string;
	labels: Record<string, string>;
	annotations: Record<string, string>;
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
const podsCount = document.getElementById("pods-count");
const podsTableBody = document.getElementById("pods-table-body");
const templatesList = document.getElementById("templates-list");

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

// Token Modal Elements
const _userBadgeBtn = document.getElementById("user-badge-btn");
const userBadgeName = document.getElementById("user-badge-name");
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
			<p class="text-xs theme-text-muted mt-0.5 leading-relaxed">${message}</p>
		</div>
	`;

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
			const sub = payload.sub || payload.identity || payload.name || "User";
			userBadgeName.textContent = String(sub);
			return;
		}
	} else {
		if (logoutBtn) logoutBtn.classList.add("hidden");
	}
	userBadgeName.textContent = "Anonymous";
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

		// 3. Fetch pods
		const podsRes = await app.callServerTool({
			name: "list_pods",
			arguments: { namespace: currentNamespace, jwtPayload: getJwtPayload() },
		});
		if (podsRes && !podsRes.isError && podsRes.structuredContent) {
			pods = (podsRes.structuredContent as any).pods || [];
		} else if (podsRes?.isError) {
			showError(
				`Pods error: ${(podsRes.content?.[0] as any)?.text || "Unknown"}`,
			);
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
	renderPods();
	renderTemplates();
}

function renderWorkspaces() {
	if (!wsCount || !workspacesList) return;
	wsCount.textContent = String(workspaces.length);

	if (workspaces.length === 0) {
		workspacesList.innerHTML = `
      <div class="p-6 text-center theme-text-muted text-sm">
        No active workspaces. Click a template to spawn one.
      </div>
    `;
		return;
	}

	workspacesList.innerHTML = workspaces
		.map((ws) => {
			let statusClass = "status-unknown";
			let pulseDot = "";
			if (ws.status === "Running") {
				statusClass = "status-running";
				pulseDot = `<span class="w-1.5 h-1.5 status-pulse-running rounded-full animate-ping"></span>`;
			} else if (ws.status === "Pending") {
				statusClass = "status-pending";
				pulseDot = `<span class="w-1.5 h-1.5 status-pulse-pending rounded-full animate-pulse"></span>`;
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
				const cleanPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
				const workspaceUrl = `${basePath}/route/${ws.id}${cleanPath}${tokenQuery}`;
				openLinkHtml = `
					<a href="${workspaceUrl}" target="_blank" class="theme-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer">
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
						Open Workspace
					</a>
				`;
				viewSpecBtnHtml = `
					<button data-ws-id="${ws.id}" class="view-ws-spec-btn theme-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer">
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
						</svg>
						View Spec
					</button>
				`;
				const previewTarget = ws.previewPath || ws.workspacePath;
				if (previewTarget) {
					previewBtnHtml = `
						<button data-ws-id="${ws.id}" data-preview-path="${previewTarget}" data-preview-type="${ws.previewType || ws.workspaceType || "html"}" class="preview-ws-btn theme-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer">
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
			if (ws.podIP) {
				let apisHtml = "";
				if (ws.apis && ws.apis.length > 0) {
					apisHtml = ws.apis
						.map((api) => {
							const apiPath = api.path.startsWith("/")
								? api.path
								: `/${api.path}`;
							const methodBadge = api.method
								? `<span class="opacity-75 text-[9px] uppercase font-bold mr-0.5">${api.method.split(",")[0]}</span>`
								: "";
							const tooltip = api.desc ? `title="${api.desc}"` : "";
							const tokenQuery = activeToken
								? `?token=${encodeURIComponent(activeToken)}`
								: "";
							const linkUrl = `${basePath}/route/${ws.id}${apiPath}${tokenQuery}`;
							return `<a href="${linkUrl}" target="_blank" ${tooltip} class="px-2 py-0.5 theme-button-secondary rounded text-[10px] font-medium transition hover:brightness-110 flex items-center gap-1">
								${methodBadge}${api.name}
							</a>`;
						})
						.join(" ");
				}

				infoHtml = `<div class="text-[10px] theme-text-muted mt-1 flex flex-col gap-1.5">
					<div class="flex flex-wrap gap-x-3 gap-y-1">
						<span><strong>IP:</strong> <span class="font-mono">${ws.podIP}</span></span>
						${ws.port ? `<span><strong>Port:</strong> <span class="font-mono">${ws.port}</span></span>` : ""}
						${ws.userSub ? `<span><strong>Owner:</strong> <span class="font-mono">${ws.userSub}</span></span>` : ""}
					</div>
					${apisHtml ? `<div class="flex flex-wrap gap-1.5 items-center mt-0.5"><strong>APIs:</strong> ${apisHtml}</div>` : ""}
				</div>`;
			}

			return `
      <div class="theme-card-row p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition">
        <div class="flex items-center gap-3">
          <span class="theme-icon-box">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          <div>
            <h4 class="font-bold theme-text-title text-sm flex items-center gap-2">
              ${ws.name}
            </h4>
            <p class="text-xs theme-text-muted font-mono mt-0.5">
              ID: ${ws.id}
              ${ws.templateRef ? ` | Template: <span class="px-1.5 py-0.5 theme-badge-pill text-[10px] font-bold rounded-md">${ws.templateRef}</span>` : ""}
            </p>
            ${infoHtml}
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span class="px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 ${statusClass}">
            ${pulseDot}
            ${ws.status}
          </span>
          ${viewSpecBtnHtml}
          ${previewBtnHtml}
          ${openLinkHtml}
          <button data-ws-id="${ws.id}" class="stop-ws-btn theme-button-danger inline-flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Stop
          </button>
        </div>
      </div>
    `;
		})
		.join("");

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

function renderPods() {
	if (!podsCount || !podsTableBody) return;
	podsCount.textContent = String(pods.length);

	if (pods.length === 0) {
		podsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center theme-text-muted">No active pods in namespace.</td>
      </tr>
    `;
		return;
	}

	podsTableBody.innerHTML = pods
		.map((pod) => {
			let phaseClass = "status-unknown";
			if (pod.phase === "Running") {
				phaseClass = "status-running";
			} else if (pod.phase === "Pending") {
				phaseClass = "status-pending";
			} else if (pod.phase === "Failed") {
				phaseClass = "status-failed";
			}

			return `
      <tr class="theme-card-row transition">
        <td class="px-6 py-4">
          <div class="font-bold theme-text-title max-w-[200px] sm:max-w-xs truncate">${pod.name}</div>
          <div class="text-[10px] theme-text-muted font-mono mt-0.5">${pod.node || "Pending assignment"}</div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex px-2 py-0.5 text-xs font-bold rounded ${phaseClass}">${pod.phase}</span>
        </td>
        <td class="px-6 py-4 font-mono theme-text-body">${pod.ready}/${pod.total}</td>
        <td class="px-6 py-4 font-mono theme-text-body">${pod.restarts}</td>
        <td class="px-6 py-4 font-mono theme-text-body">${pod.podIP || "-"}</td>
        <td class="px-6 py-4 text-right shrink-0">
          <div class="inline-flex gap-2">
            <button data-pod-name="${pod.name}" class="view-logs-btn theme-button-secondary px-2.5 py-1 text-xs cursor-pointer">Logs</button>
            <button data-pod-name="${pod.name}" class="delete-pod-btn theme-button-danger px-2.5 py-1 text-xs cursor-pointer">Delete</button>
          </div>
        </td>
      </tr>
    `;
		})
		.join("");

	// Attach event listeners
	document.querySelectorAll(".view-logs-btn").forEach((btn: Element) => {
		btn.addEventListener("click", (e: Event) => {
			const podName = (e.currentTarget as HTMLButtonElement).getAttribute(
				"data-pod-name",
			);
			if (podName) openLogsModal(podName);
		});
	});

	document.querySelectorAll(".delete-pod-btn").forEach((btn: Element) => {
		btn.addEventListener("click", async (e: Event) => {
			const target = e.currentTarget as HTMLButtonElement;
			const podName = target.getAttribute("data-pod-name");
			if (podName) {
				if (confirm(`Are you sure you want to delete pod ${podName}?`)) {
					target.setAttribute("disabled", "true");
					target.textContent = "Deleting...";
					await deletePod(podName);
				}
			}
		});
	});
}

function renderTemplates() {
	if (!templatesList) return;

	if (templates.length === 0) {
		templatesList.innerHTML = `
      <div class="p-6 text-center theme-text-muted text-sm">
        No templates registered in the cluster.
      </div>
    `;
		return;
	}

	templatesList.innerHTML = templates
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
          <button data-tmpl-name="${tmpl.name}" class="spawn-ws-modal-btn theme-button-primary px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer">
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
async function deletePod(name: string) {
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

// Spawn Modal functions
async function openSpawnModal(tmplName: string) {
	if (spawnTemplateTitle)
		spawnTemplateTitle.textContent = `Template: ${tmplName}`;
	if (spawnTemplateRef) spawnTemplateRef.value = tmplName;
	if (workspaceIdInput) {
		workspaceIdInput.value = "";
		workspaceIdInput.placeholder = `ws-${tmplName}-${Math.floor(Math.random() * 1000)}`;
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
					input.value = "nogoo9-agent-workspace";
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
				contextInputs.appendChild(div);
			}
		} else {
			contextVariablesContainer.classList.add("hidden");
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

if (closeSpawnBtn) closeSpawnBtn.addEventListener("click", closeSpawnModal);
if (cancelSpawnBtn) cancelSpawnBtn.addEventListener("click", closeSpawnModal);

// Fallback HTTP Transport Client (when opened outside an MCP App Host iframe)
let _fallbackMode = false;
let httpSessionId: string | null = null;
const basePath = (window as any).__NOCR_BASE_URL__ || "";
let mcpEndpointUrl = `${basePath}/mcp`;
const mcpVersion = "2024-11-05";
let lastHttpFallbackError = "";

async function initHttpFallback(): Promise<boolean> {
	const endpointsToTry = [`${basePath}/mcp`, "http://localhost:3000/mcp"];

	// If the current origin is not localhost:3000, prioritize absolute local server URL
	if (window.location.origin !== "http://localhost:3000") {
		endpointsToTry.reverse();
	}

	for (const endpoint of endpointsToTry) {
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
				window.location.reload();
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
			} else {
				const text = await resp.text().catch(() => "");
				lastHttpFallbackError = `${resp.status}${text ? `: ${text}` : ""}`;
				console.warn(
					`HTTP fallback failed for ${endpoint} with status ${resp.status}`,
				);
			}
		} catch (err) {
			lastHttpFallbackError = String(err);
			console.warn(`HTTP fallback initialization failed for ${endpoint}:`, err);
		}
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
		window.location.reload();
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
	} else {
		document.documentElement.classList.remove("dark");
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
}

const oauthConfig: OAuthConfig = (window as any).__NOCR_OAUTH_CONFIG__ || {};

async function initOidc() {
	if (!oauthConfig.discoveryUrl || !oauthConfig.clientId) {
		return;
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
			const scopes = ["openid", "profile", "email"];
			if (Array.isArray(oauthConfig.scopes)) {
				for (const s of oauthConfig.scopes) {
					if (s && !scopes.includes(s)) scopes.push(s);
				}
			}
			url.searchParams.set("scope", scopes.join(" "));

			window.location.href = url.toString();
		} catch (err) {
			console.error("Login redirect failed:", err);
			showToast("Failed to initialize SSO redirect", "error");
		}
	}

	// 1. Check if returning from redirect flow
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get("code");
	const state = urlParams.get("state");
	const error = urlParams.get("error");
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
					updateUserBadge(activeToken);
					showToast("Login successful!", "success");
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

	if (toolName === "list_pods" && params.structuredContent) {
		pods = (params.structuredContent as any).pods || [];
		renderPods();
	} else if (toolName === "list_workspaces" && params.structuredContent) {
		workspaces = (params.structuredContent as any).workspaces || [];
		renderWorkspaces();
	} else if (toolName === "list_templates" && params.structuredContent) {
		templates = (params.structuredContent as any).templates || [];
		renderTemplates();
	} else if (toolName === "get_pod_logs" && activeToolArgs?.name) {
		openLogsModal(activeToolArgs.name);
		const logs = (params.structuredContent as any)?.logs || "(no logs)";
		if (logsContent) logsContent.textContent = logs;
	} else if (toolName === "spawn_workspace") {
		refreshAll();
	}
};

// Initialize authentication and settings listeners
initToken();
initTheme();
void initOidc();

if (logoutBtn) {
	logoutBtn.addEventListener("click", async () => {
		const token = localStorage.getItem("nocr_token");
		const idToken = localStorage.getItem("nocr_id_token");

		// 1. Call server /logout endpoint to clear path-scoped workspace cookies
		try {
			await fetch("/logout", {
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
