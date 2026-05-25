/// <reference lib="dom" />
import { App } from "@modelcontextprotocol/ext-apps";

// Initialize the MCP App client bridge
const app = new App(
	{ name: "nogoo9-pod-manager", version: "0.2.0" },
	{ tools: {} },
);

// State management
let currentNamespace = "nogoo9";
let workspaces: Array<{ id: string; name: string; status: string }> = [];
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
const _tokenModal = document.getElementById("token-modal");
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
const tmplSpecContent = document.getElementById("tmpl-spec-content");
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
	toast.className = `toast-item p-4 rounded-xl border flex items-start gap-3 shadow-lg transition duration-300 ${
		type === "success"
			? "bg-slate-900/95 border-emerald-500/30 text-slate-100"
			: "bg-slate-900/95 border-rose-500/30 text-slate-100"
	}`;

	const icon =
		type === "success"
			? `<span class="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
				</svg>
		   </span>`
			: `<span class="p-1 bg-rose-500/10 text-rose-400 rounded-lg shrink-0">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
		   </span>`;

	toast.innerHTML = `
		${icon}
		<div class="flex-1">
			<p class="text-sm font-semibold">${type === "success" ? "Success" : "Error"}</p>
			<p class="text-xs text-slate-400 mt-0.5 leading-relaxed">${message}</p>
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
		const payload = decodeJwt(token);
		if (payload) {
			const sub = payload.sub || payload.identity || payload.name || "User";
			userBadgeName.textContent = String(sub);
			return;
		}
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
			workspaces = (wsRes.structuredContent as any).workspaces || [];
		} else if (wsRes?.isError) {
			console.warn("Failed to list workspaces", wsRes);
		}

		// 3. Fetch pods
		const podsRes = await app.callServerTool({
			name: "list_pods",
			arguments: { namespace: currentNamespace },
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
      <div class="p-6 text-center text-slate-500 text-sm">
        No active workspaces. Click a template to spawn one.
      </div>
    `;
		return;
	}

	workspacesList.innerHTML = workspaces
		.map((ws) => {
			let statusClass = "bg-slate-800 text-slate-400";
			let pulseDot = "";
			if (ws.status === "Running") {
				statusClass =
					"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
				pulseDot = `<span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>`;
			} else if (ws.status === "Pending") {
				statusClass =
					"bg-amber-500/10 text-amber-400 border border-amber-500/20";
				pulseDot = `<span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>`;
			} else if (ws.status === "Failed") {
				statusClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
			}

			let openLinkHtml = "";
			if (ws.status === "Running") {
				const tokenQuery = activeToken
					? `?token=${encodeURIComponent(activeToken)}`
					: "";
				const workspaceUrl = `${basePath}/route/${ws.id}/${tokenQuery}`;
				openLinkHtml = `
					<a href="${workspaceUrl}" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-lg transition active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer">
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
						Open Workspace
					</a>
				`;
			}

			return `
      <div class="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition hover:bg-slate-900/20">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center justify-center p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-violet-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          <div>
            <h4 class="font-bold text-white text-sm flex items-center gap-2">
              ${ws.id}
            </h4>
            <p class="text-xs text-slate-400 font-mono mt-0.5">${ws.name}</p>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span class="px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 ${statusClass}">
            ${pulseDot}
            ${ws.status}
          </span>
          ${openLinkHtml}
          <button data-ws-id="${ws.id}" class="stop-ws-btn inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer">
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
}

function renderPods() {
	if (!podsCount || !podsTableBody) return;
	podsCount.textContent = String(pods.length);

	if (pods.length === 0) {
		podsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-slate-500">No active pods in namespace.</td>
      </tr>
    `;
		return;
	}

	podsTableBody.innerHTML = pods
		.map((pod) => {
			let phaseClass = "bg-slate-800 text-slate-400";
			if (pod.phase === "Running") {
				phaseClass =
					"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
			} else if (pod.phase === "Pending") {
				phaseClass =
					"bg-amber-500/10 text-amber-400 border border-amber-500/20";
			} else if (pod.phase === "Failed") {
				phaseClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
			}

			return `
      <tr class="hover:bg-slate-900/20 transition">
        <td class="px-6 py-4">
          <div class="font-bold text-white max-w-[200px] sm:max-w-xs truncate">${pod.name}</div>
          <div class="text-[10px] text-slate-400 font-mono mt-0.5">${pod.node || "Pending assignment"}</div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex px-2 py-0.5 text-xs font-bold rounded ${phaseClass}">${pod.phase}</span>
        </td>
        <td class="px-6 py-4 font-mono text-slate-300">${pod.ready}/${pod.total}</td>
        <td class="px-6 py-4 font-mono text-slate-300">${pod.restarts}</td>
        <td class="px-6 py-4 font-mono text-slate-300">${pod.podIP || "-"}</td>
        <td class="px-6 py-4 text-right shrink-0">
          <div class="inline-flex gap-2">
            <button data-pod-name="${pod.name}" class="view-logs-btn px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded transition cursor-pointer">Logs</button>
            <button data-pod-name="${pod.name}" class="delete-pod-btn px-2.5 py-1 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-transparent hover:border-rose-500/20 text-xs font-semibold rounded transition cursor-pointer">Delete</button>
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
      <div class="p-6 text-center text-slate-500 text-sm">
        No templates registered in the cluster.
      </div>
    `;
		return;
	}

	templatesList.innerHTML = templates
		.map((tmpl) => {
			return `
      <div class="p-5 hover:bg-slate-900/20 transition flex flex-col justify-between gap-3">
        <div>
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-white text-sm font-mono">${tmpl.name}</h4>
            ${tmpl.tag ? `<span class="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 rounded">${tmpl.tag}</span>` : ""}
          </div>
          <p class="text-xs text-slate-400 mt-1 leading-normal">${tmpl.description || "No description provided."}</p>
        </div>
        
        <div class="flex justify-end gap-2">
          <button data-tmpl-name="${tmpl.name}" class="view-spec-btn px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Spec
          </button>
          <button data-tmpl-name="${tmpl.name}" class="spawn-ws-modal-btn px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer">
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
					"block text-[10px] font-bold text-slate-400 font-mono";
				label.textContent = key;

				const input = document.createElement("input");
				input.type = "text";
				input.id = `context-var-${key}`;
				input.required = true;
				input.className =
					"w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2 text-xs font-mono text-white outline-none transition";
				input.placeholder = `Value for ${key}`;

				// Pre-populate defaults for common local/testing services
				if (key === "AWS_ENDPOINT_URL") {
					input.value = "http://localhost:9000";
				} else if (key === "S3_BUCKET") {
					input.value = "nogoo9-agent-workspace";
				} else if (key === "S3_FOLDER") {
					input.value = `folder-${Math.floor(Math.random() * 1000)}`;
				} else if (key === "AWS_ACCESS_KEY_ID") {
					input.value = "minioadmin";
				} else if (key === "AWS_SECRET_ACCESS_KEY") {
					input.value = "minioadmin";
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
	if (tmplSpecContent)
		tmplSpecContent.textContent = "Fetching template specification...";
	if (tmplSpecModal) tmplSpecModal.classList.remove("hidden");

	try {
		const res = await app.callServerTool({
			name: "get_template",
			arguments: { name: tmplName, namespace: currentNamespace },
		});
		if (res.isError) {
			if (tmplSpecContent)
				tmplSpecContent.textContent = `Error: ${(res.content?.[0] as any)?.text || "Could not fetch spec"}`;
		} else {
			const spec = (res.structuredContent as any)?.spec || {};
			if (tmplSpecContent)
				tmplSpecContent.textContent = JSON.stringify(spec, null, 2);
		}
	} catch (err) {
		if (tmplSpecContent) tmplSpecContent.textContent = `Error: ${err}`;
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

		closeCreateTmplModal();

		try {
			const res = await app.callServerTool({
				name: "create_template",
				arguments: {
					name,
					namespace: currentNamespace,
					description,
					tag,
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
			}
		} catch (err) {
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

	if (!resp.ok) {
		throw new Error(`HTTP error ${resp.status}`);
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

// Start connection handshake and retrieve stats
app
	.connect()
	.then(() => {
		console.log("Connected to MCP Host successfully!");
		refreshAll();
		// Poll every 5 seconds for updates
		setInterval(refreshAll, 5000);
	})
	.catch(async (err) => {
		console.warn("Connection to MCP Host failed, trying HTTP fallback...", err);
		const fallbackSuccess = await initHttpFallback();
		if (fallbackSuccess) {
			// Override callServerTool with HTTP fallback helper
			app.callServerTool = async (params) => {
				return callServerToolFallback(params.name, params.arguments);
			};
			console.log("HTTP fallback initialized successfully!");
			refreshAll();
			// Poll every 5 seconds for updates in fallback mode
			setInterval(refreshAll, 5000);
		} else {
			showError(`Failed to connect to MCP Host client: ${err}`);
		}
	});
