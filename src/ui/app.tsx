import { App as McpApp } from "@modelcontextprotocol/ext-apps";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { createRoot } from "react-dom/client";

import {
	CreateTemplateModal,
	EventsViewModal,
	LogsViewModal,
	SpawnWorkspaceModal,
	SystemInfoModal,
	TemplateSpecModal,
	TokenSettingsModal,
	WorkspacePreviewModal,
} from "~/ui/components/Modals.js";
import { MeowEasterEgg, TweaksWidgetPanel } from "~/ui/components/TweaksPanel.js";
import { WorkspaceCard } from "~/ui/components/WorkspaceCard.js";
import { WorkspaceConsoleView } from "~/ui/components/WorkspaceConsoleView.js";
import { AppProvider } from "~/ui/context/AppContext.js";
import { initHttpFallback, callServerToolFallback, lastHttpFallbackError } from "~/ui/fallback.js";
import { I } from "~/ui/icons.js";
import type { Capabilities, Template, Toast, Workspace } from "~/ui/types.js";
import {
	applyThemeStyles,
	checkTemplateAccess,
	decodeJwt,
	generateChallenge,
	generateRandomString,
	getValueByJsonPath,
	isSafeRedirectUri,
} from "~/ui/utils.js";

// Initialize the MCP App client bridge
export const app = new McpApp(
	{ name: "nogoo9-pod-manager", version: "0.8.1" },
	{ tools: {} },
);

// Constants
const basePath =
	(window as any).__NOCR_BASE_URL__ !== undefined
		? (window as any).__NOCR_BASE_URL__ || ""
		: (() => {
				const path = window.location.pathname.replace(/\/$/, "");
				if (path.endsWith("/ui")) {
					return path.substring(0, path.length - 3);
				}
				return path;
			})();
const oauthConfig = (window as any).__NOCR_OAUTH_CONFIG__ || {};
const uiConfig = (window as any).__NOCR_UI_CONFIG__ || {
	title: "nogoo9 / no-crd",
	subtitle: "Model Context Protocol Kubernetes Pod Manager",
};

// React App Root
function Dashboard() {
	// States
	const [isInitialized, setIsInitialized] = useState(false);
	const [connectionError, setConnectionError] = useState("");
	const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
	const [templates, setTemplates] = useState<Template[]>([]);
	const [namespace, setNamespace] = useState("nogoo9");
	const [capabilities, setCapabilities] = useState<Capabilities>({
		enabledTools: [] as string[],
		managedOnly: true,
		authEnabled: false,
		isAdmin: false,
		version: "",
	});
	const [activeToken, setActiveToken] = useState("");
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [isSessionExpiringSoon, setIsSessionExpiringSoon] = useState(false);
	const [hasRefreshCookie, setHasRefreshCookie] = useState(() => {
		return localStorage.getItem("nocr_no_refresh") !== "true";
	});
	const [workspaceOpenMode, setWorkspaceOpenMode] = useState<"tab" | "inline">(() => {
		const noRefresh = localStorage.getItem("nocr_no_refresh") === "true";
		if (noRefresh) return "inline";
		return (localStorage.getItem("nocr_workspace_mode") as "tab" | "inline") || "tab";
	});
	const [isAutoRefresh, setIsAutoRefresh] = useState(() => {
		return localStorage.getItem("nocr_auto_refresh") !== "false";
	});
	const [mcpRefreshInterval, setMcpRefreshInterval] = useState<number>(() => {
		const saved = localStorage.getItem("nocr_mcp_refresh_interval");
		if (saved !== null) {
			const parsed = Number(saved);
			return Number.isNaN(parsed) ? 5 : parsed;
		}
		return 5;
	});

	const [showProfileMenu, setShowProfileMenu] = useState(false);
	const [isRefreshingState, setIsRefreshingState] = useState(false);
	const isAuthRequired = !!(oauthConfig.discoveryUrl && oauthConfig.clientId);
	const canConnect = !isAuthRequired || !!activeToken;

	// Initialize the connection handshake (with HTTP fallback for direct browser context)
	useEffect(() => {
		if (!canConnect) return;

		let isMounted = true;
		const init = async () => {
			try {
				console.log("Connecting to MCP Host bridge...");
				await app.connect();
				console.log("Connected to MCP Host successfully!");
				if (isMounted) setIsInitialized(true);
			} catch (err) {
				console.warn("Connection to MCP Host failed, trying HTTP fallback...", err);
				const fallbackSuccess = await initHttpFallback(activeToken, () => {
					localStorage.removeItem("nocr_token");
					if (isMounted) setActiveToken("");
				});
				if (fallbackSuccess) {
					app.callServerTool = async (params: any) => {
						const currentToken =
							localStorage.getItem("nocr_token") || activeToken || "";
						if (isAuthRequired && !currentToken) {
							triggerToast(
								"Authentication required: Please sign in to perform this action.",
								"error",
							);
							return {
								isError: true,
								error:
									"Authentication required: Please sign in to perform this action.",
							};
						}
						return callServerToolFallback(
							params.name,
							params.arguments,
							currentToken,
							(t) => {
								if (isMounted) setActiveToken(t);
							},
						);
					};
					console.log("HTTP fallback initialized successfully!");
					if (isMounted) setIsInitialized(true);
				} else {
					const errorMsg = `Failed to connect to MCP Host client: ${err}${
						lastHttpFallbackError ? ` (HTTP Fallback: ${lastHttpFallbackError})` : ""
					}`;
					console.error(errorMsg);
					if (isMounted) setConnectionError(errorMsg);
				}
			}
		};
		void init();
		return () => {
			isMounted = false;
		};
	}, [canConnect, activeToken]);

	// App Views & Nav States
	const [activeConsoleWsId, setActiveConsoleWsId] = useState<string | null>(null);
	const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
	const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
	const [activeTmplSpec, setActiveTmplSpec] = useState<Template | null>(null);
	const [activeLogsWs, setActiveLogsWs] = useState<Workspace | null>(null);
	const [activeEventsWs, setActiveEventsWs] = useState<Workspace | null>(null);
	const [logsText, setLogsText] = useState("");
	const [eventsList, setEventsList] = useState<any[]>([]);
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [showSystemInfo, setShowSystemInfo] = useState(false);
	const [showTweaks, setShowTweaks] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
	const [isMeowActive, setIsMeowActive] = useState(false);

	// Theme states
	const [theme, setTheme] = useState(() => localStorage.getItem("nocr_theme") || "dark");
	const [customTheme, setCustomTheme] = useState(() => localStorage.getItem("nocr_custom_theme") || "default");
	const [availableThemes, setAvailableThemes] = useState<Array<{ id: string; name: string }>>([
		{ id: "default", name: "Default (System)" },
	]);

	const [density, setDensity] = useState(() => localStorage.getItem("nocr_density") || "comfortable");
	const [accentColor, setAccentColor] = useState(() => localStorage.getItem("nocr_accent") || "#c96442");

	// Active Preview State
	const [previewModalConfig, setPreviewModalConfig] = useState<{
		ws: Workspace;
		path: string;
		type: string;
	} | null>(null);

	const [, startTransition] = useTransition();

	const triggerToast = (message: string, type: "success" | "error" = "success") => {
		const id = Math.random().toString(36).substring(2, 9);
		setToasts((prev) => [...prev, { id, message, type }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 4000);
	};

	// PKCE OAuth Login flow helper
	const handleLogin = async () => {
		try {
			const verifier = generateRandomString(64);
			const challenge = await generateChallenge(verifier);
			sessionStorage.setItem("nocr_code_verifier", verifier);

			const redirectUri = `${window.location.origin}${basePath}/ui`;

			let authEndpoint = oauthConfig.authorizationUrl;
			if ((!authEndpoint || authEndpoint.includes(".svc.cluster.local")) && oauthConfig.discoveryUrl) {
				authEndpoint = oauthConfig.discoveryUrl.replace(
					/\/\.well-known\/openid-configuration$/,
					"/protocol/openid-connect/auth",
				);
			}

			const authUrl = new URL(authEndpoint);
			authUrl.searchParams.set("client_id", oauthConfig.clientId);
			authUrl.searchParams.set("response_type", "code");
			authUrl.searchParams.set("redirect_uri", redirectUri);
			authUrl.searchParams.set("code_challenge", challenge);
			authUrl.searchParams.set("code_challenge_method", "S256");

			const scopeStr = Array.isArray(oauthConfig.scopes)
				? oauthConfig.scopes.join(" ")
				: oauthConfig.scope || "openid profile email offline_access mcp:read mcp:write";
			authUrl.searchParams.set("scope", scopeStr);

			window.location.href = authUrl.toString();
		} catch (err) {
			triggerToast(`OAuth initialization failed: ${err}`, "error");
		}
	};

	const handleLogout = () => {
		void (async () => {
			try {
				await fetch(`${basePath}/logout`, { method: "POST" });
				await fetch(`${basePath}/mcp/logout`, { method: "POST" });
			} catch (_) {}
		})();
		localStorage.removeItem("nocr_token");
		sessionStorage.removeItem("nocr_code_verifier");
		setIsAutoRefresh(false);
		localStorage.setItem("nocr_auto_refresh", "false");
		setActiveToken("");
		setWorkspaces([]);
		setTemplates([]);
		setCapabilities({
			enabledTools: [],
			managedOnly: true,
			authEnabled: false,
			isAdmin: false,
			version: "",
		});
		triggerToast("Logged out successfully");
	};

	// Read token from storage or handle PKCE auth code callback on mount
	useEffect(() => {
		const savedToken = localStorage.getItem("nocr_token");
		if (savedToken) {
			setActiveToken(savedToken);
		}

		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		if (code) {
			const verifier = sessionStorage.getItem("nocr_code_verifier");
			if (verifier) {
				const exchangeCode = async () => {
					try {
						const redirectUri = `${window.location.origin}${basePath}/ui`;
						const body = new URLSearchParams({
							grant_type: "authorization_code",
							client_id: oauthConfig.clientId,
							code,
							redirect_uri: redirectUri,
							code_verifier: verifier,
						});

						let tokenEndpoint = oauthConfig.tokenUrl;
						if ((!tokenEndpoint || tokenEndpoint.includes(".svc.cluster.local")) && oauthConfig.discoveryUrl) {
							tokenEndpoint = oauthConfig.discoveryUrl.replace(
								/\/\.well-known\/openid-configuration$/,
								"/protocol/openid-connect/token",
							);
						}

						const resp = await fetch(tokenEndpoint, {
							method: "POST",
							headers: { "Content-Type": "application/x-www-form-urlencoded" },
							body: body.toString(),
						});

						if (resp.ok) {
							const data = await resp.json();
							const token = data.id_token || data.access_token;
							if (token) {
								localStorage.setItem("nocr_token", token);
								setActiveToken(token);
								setIsAutoRefresh(true);
								localStorage.setItem("nocr_auto_refresh", "true");
								sessionStorage.removeItem("nocr_code_verifier");
								const cleanUrl = new URL(window.location.href);
								cleanUrl.searchParams.delete("code");
								cleanUrl.searchParams.delete("session_state");
								cleanUrl.searchParams.delete("iss");
								window.history.replaceState({}, "", cleanUrl.toString());
								triggerToast("Logged in via Single Sign-On (SSO)!");
							}
						} else {
							triggerToast(`Token exchange failed: ${resp.statusText}`, "error");
						}
					} catch (e) {
						triggerToast(`SSO Token exchange error: ${e}`, "error");
					}
				};
				void exchangeCode();
			}
		}
	}, []);

	// Proactive OIDC Refresh Token Watcher
	useEffect(() => {
		if (!activeToken) {
			setIsSessionExpiringSoon(false);
			return;
		}

		const payload = decodeJwt(activeToken);
		if (!payload || !payload.exp) {
			setIsSessionExpiringSoon(false);
			return;
		}

		const checkExpiry = () => {
			const nowSeconds = Math.floor(Date.now() / 1000);
			const timeRemaining = payload.exp - nowSeconds;
			if (timeRemaining <= 0) {
				setIsSessionExpiringSoon(false);
				if (!isAutoRefresh) {
					localStorage.removeItem("nocr_token");
					setActiveToken("");
					triggerToast("Session expired. Please re-authenticate.", "error");
				} else {
					void handleLogin();
				}
			} else if (timeRemaining <= 300) {
				setIsSessionExpiringSoon(true);
			} else {
				setIsSessionExpiringSoon(false);
			}
		};

		checkExpiry();
		const intervalId = setInterval(checkExpiry, 10000);
		return () => clearInterval(intervalId);
	}, [activeToken, isAutoRefresh]);

	// Fetch themes list on load
	useEffect(() => {
		const fetchThemes = async () => {
			try {
				let res = await fetch(`${basePath}/api/themes`);
				if (!res.ok) {
					res = await fetch(`${basePath}/api/v1/themes`);
				}
				if (res.ok) {
					const data = await res.json();
					if (Array.isArray(data)) {
						setAvailableThemes(data);
					} else if (data && Array.isArray(data.themes)) {
						setAvailableThemes(data.themes);
					}
				}
			} catch (_) {}
		};
		void fetchThemes();
	}, []);

	// Fetch themes CSS on theme change
	useEffect(() => {
		applyThemeStyles(theme, density, accentColor);

		if (!customTheme || customTheme === "default") {
			const el = document.getElementById("nocr-custom-theme-style");
			if (el) el.remove();
			return;
		}

		const loadThemeCss = async () => {
			try {
				let res = await fetch(`${basePath}/api/themes/${customTheme}`);
				if (!res.ok) {
					res = await fetch(`${basePath}/api/v1/themes/${customTheme}`);
				}
				if (res.ok) {
					const cssText = await res.text();
					let el = document.getElementById("nocr-custom-theme-style");
					if (!el) {
						el = document.createElement("style");
						el.id = "nocr-custom-theme-style";
						document.head.appendChild(el);
					}
					el.textContent = cssText;
				}
			} catch (_) {}
		};
		void loadThemeCss();
	}, [customTheme, theme, density, accentColor]);

	// Fetch data from MCP Server
	const refreshData = async () => {
		if (!isInitialized) return;
		try {
			const jwtPayload = activeToken ? decodeJwt(activeToken) : undefined;

			const capRes = await app.callServerTool({
				name: "get_capabilities",
				arguments: { jwtPayload },
			});
			if (capRes && !capRes.isError && capRes.structuredContent) {
				const content = capRes.structuredContent as any;
				setCapabilities({
					enabledTools: content.enabledTools || [],
					managedOnly: content.managedOnly ?? true,
					authEnabled: content.authEnabled ?? false,
					isAdmin: content.isAdmin ?? false,
					version: content.version || "",
				});
			}

			const nsRes = await app.callServerTool({
				name: "current_namespace",
				arguments: {},
			});
			if (nsRes && !nsRes.isError && nsRes.structuredContent) {
				setNamespace((nsRes.structuredContent as any).namespace || "default");
			}

			const tmplRes = await app.callServerTool({
				name: "list_templates",
				arguments: { namespace, jwtPayload },
			});
			if (tmplRes && !tmplRes.isError && tmplRes.structuredContent) {
				setTemplates((tmplRes.structuredContent as any).templates || []);
			}

			const wsRes = await app.callServerTool({
				name: "list_workspaces",
				arguments: { namespace, jwtPayload },
			});
			if (wsRes && !wsRes.isError && wsRes.structuredContent) {
				const wsList = (wsRes.structuredContent as any).workspaces || [];
				const fullWorkspaces = await Promise.all(
					wsList.map(async (ws: any) => {
						if (ws.status === "Running") {
							try {
								const detail = await app.callServerTool({
									name: "get_workspace",
									arguments: { id: ws.id, namespace, jwtPayload },
								});
								if (detail && !detail.isError && detail.structuredContent) {
									return detail.structuredContent as any;
								}
							} catch (e) {
								console.error("Failed details fetch for workspace", ws.id, e);
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
				setWorkspaces(fullWorkspaces);
			}
		} catch (err) {
			triggerToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	useEffect(() => {
		if (!isInitialized) return;
		startTransition(() => {
			refreshData();
		});
	}, [isInitialized, namespace]);

	// Auto-Refresh Effect
	const refreshDataRef = useRef(refreshData);
	useEffect(() => {
		refreshDataRef.current = refreshData;
	}, [refreshData]);

	useEffect(() => {
		if (!isInitialized || mcpRefreshInterval <= 0) return;

		const intervalId = setInterval(() => {
			void refreshDataRef.current();
		}, mcpRefreshInterval * 1000);

		return () => clearInterval(intervalId);
	}, [isInitialized, mcpRefreshInterval]);

	// Workspace actions
	const spawnWorkspace = async (
		id: string,
		name: string,
		userSub: string,
		contextVars: Record<string, string>,
	) => {
		if (!selectedTemplate) return;
		try {
			triggerToast(`Spawning sandbox "${id}"...`);
			setSelectedTemplate(null);
			const jwtPayload = activeToken ? decodeJwt(activeToken) : undefined;
			const res = await app.callServerTool({
				name: "spawn_workspace",
				arguments: {
					templateRef: selectedTemplate.name,
					id,
					name,
					userSub: userSub || undefined,
					namespace,
					context: contextVars,
					jwtPayload,
				},
			});

			if (res && res.isError) {
				const errMsg = res.error || (res.content && (res.content[0] as any)?.text) || "Spawn failed";
				triggerToast(`Failed to spawn: ${errMsg}`, "error");
			} else {
				triggerToast(`Successfully spawned workspace ${id}`);
				await refreshData();
			}
		} catch (err) {
			triggerToast(`Error spawning workspace: ${err}`, "error");
		}
	};

	const stopWorkspace = async (id: string) => {
		try {
			triggerToast(`Stopping workspace "${id}"...`);
			const jwtPayload = activeToken ? decodeJwt(activeToken) : undefined;
			const res = await app.callServerTool({
				name: "stop_workspace",
				arguments: { id, namespace, jwtPayload },
			});
			if (res && res.isError) {
				const errMsg = res.error || (res.content && (res.content[0] as any)?.text) || "Stop failed";
				triggerToast(`Failed to stop: ${errMsg}`, "error");
			} else {
				triggerToast(`Stopped workspace ${id}`);
				await refreshData();
			}
		} catch (err) {
			triggerToast(`Error stopping workspace: ${err}`, "error");
		}
	};

	const upgradeWorkspace = async (id: string) => {
		try {
			triggerToast(`Initiating background upgrade for workspace "${id}"...`);
			const jwtPayload = activeToken ? decodeJwt(activeToken) : undefined;
			const res = await app.callServerTool({
				name: "upgrade_workspace",
				arguments: { id, namespace, jwtPayload },
			});
			if (res && res.isError) {
				const errMsg = res.error || (res.content && (res.content[0] as any)?.text) || "Upgrade failed";
				triggerToast(`Failed to upgrade: ${errMsg}`, "error");
			} else {
				triggerToast(`Background upgrade started for workspace ${id}`);
				await refreshData();
			}
		} catch (err) {
			triggerToast(`Error upgrading workspace: ${err}`, "error");
		}
	};

	const upgradeAllWorkspaces = async () => {
		try {
			triggerToast("Initiating bulk upgrade for all outdated workspaces...");
			const jwtPayload = activeToken ? decodeJwt(activeToken) : undefined;
			const res = await app.callServerTool({
				name: "upgrade_all_workspaces",
				arguments: { namespace, jwtPayload },
			});
			if (res && res.isError) {
				const errMsg = res.error || (res.content && (res.content[0] as any)?.text) || "Bulk upgrade failed";
				triggerToast(`Failed bulk upgrade: ${errMsg}`, "error");
			} else {
				triggerToast("Bulk background upgrade successfully initiated!");
				await refreshData();
			}
		} catch (err) {
			triggerToast(`Error in bulk upgrade: ${err}`, "error");
		}
	};

	const createTemplate = async (
		name: string,
		desc: string,
		tag: string,
		specString: string,
		advData: any,
	) => {
		try {
			let parsedSpec: any;
			try {
				parsedSpec = JSON.parse(specString);
			} catch (_) {
				triggerToast("Invalid JSON in Pod spec field", "error");
				return;
			}
			triggerToast(`Registering template spec "${name}"...`);
			setIsCreatingTemplate(false);

			const annotations: Record<string, string> = {};
			if (desc) annotations["nogoo9/description"] = desc;
			if (tag) annotations["nogoo9/tag"] = tag;

			if (advData.context) annotations["nogoo9/context"] = advData.context;
			if (advData.port) annotations["nogoo9/port"] = advData.port;
			if (advData.previewPath) annotations["nogoo9/preview.path"] = advData.previewPath;
			if (advData.previewType) annotations["nogoo9/preview.type"] = advData.previewType;
			if (advData.gracePeriod) annotations["nogoo9/grace-period"] = advData.gracePeriod;
			if (advData.initImage) annotations["nogoo9/init.image"] = advData.initImage;
			if (advData.initCmd) annotations["nogoo9/init.cmd"] = advData.initCmd;
			if (advData.prestopCmd) annotations["nogoo9/prestop.cmd"] = advData.prestopCmd;
			if (advData.prestopSidecar) annotations["nogoo9/prestop.sidecar"] = advData.prestopSidecar;

			const jwtPayload = activeToken ? decodeJwt(activeToken) : undefined;
			const res = await app.callServerTool({
				name: "create_template",
				arguments: {
					name,
					namespace,
					spec: parsedSpec,
					annotations,
					jwtPayload,
				},
			});

			if (res && res.isError) {
				const errMsg = res.error || (res.content && (res.content[0] as any)?.text) || "Registration failed";
				triggerToast(`Failed to register template: ${errMsg}`, "error");
			} else {
				triggerToast(`Registered template ${name}`);
				await refreshData();
			}
		} catch (err) {
			triggerToast(`Error creating template: ${err}`, "error");
		}
	};

	const deleteTemplate = async (name: string) => {
		if (!confirm(`Are you sure you want to delete template ConfigMap "${name}"?`)) return;
		try {
			triggerToast(`Deleting template "${name}"...`);
			const jwtPayload = activeToken ? decodeJwt(activeToken) : undefined;
			const res = await app.callServerTool({
				name: "delete_template",
				arguments: { name, namespace, jwtPayload },
			});
			if (res && res.isError) {
				const errMsg = res.error || (res.content && (res.content[0] as any)?.text) || "Delete failed";
				triggerToast(`Failed to delete template: ${errMsg}`, "error");
			} else {
				triggerToast(`Deleted template ${name}`);
				await refreshData();
			}
		} catch (err) {
			triggerToast(`Error deleting template: ${err}`, "error");
		}
	};

	const fetchLogs = async (ws: Workspace) => {
		try {
			if (!ws.podName) {
				triggerToast("No active pod name found for logs fetch", "error");
				return;
			}
			const res = await app.callServerTool({
				name: "get_pod_logs",
				arguments: {
					name: ws.podName,
					namespace,
					jwtPayload: activeToken ? decodeJwt(activeToken) : undefined,
				},
			});
			if (res && !res.isError && res.structuredContent) {
				setLogsText((res.structuredContent as any).logs || "");
				setActiveLogsWs(ws);
			} else {
				triggerToast("Failed to fetch pod logs", "error");
			}
		} catch (err) {
			triggerToast(`Logs error: ${err}`, "error");
		}
	};

	const fetchEvents = async (ws: Workspace) => {
		try {
			const res = await app.callServerTool({
				name: "get_workspace_events",
				arguments: {
					id: ws.id,
					namespace,
					jwtPayload: activeToken ? decodeJwt(activeToken) : undefined,
				},
			});
			if (res && !res.isError && res.structuredContent) {
				setEventsList((res.structuredContent as any).events || []);
				setActiveEventsWs(ws);
			} else {
				triggerToast("Failed to fetch workspace events", "error");
			}
		} catch (err) {
			triggerToast(`Events error: ${err}`, "error");
		}
	};

	const triggerMeowEasterEgg = () => {
		setIsMeowActive(true);
		setTimeout(() => {
			setIsMeowActive(false);
		}, 4600);
	};

	const getDisplayUser = () => {
		if (!activeToken) return "Anonymous";
		const payload = decodeJwt(activeToken);
		if (payload) {
			const jsonPath = oauthConfig.subJsonPath || "$.sub";
			return getValueByJsonPath(payload, jsonPath) || payload.sub || payload.name || "User";
		}
		return "Anonymous";
	};

	const activeUserWorkspaces = workspaces.filter((ws) => {
		const matchesQuery =
			!searchQuery ||
			ws.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(ws.name && ws.name.toLowerCase().includes(searchQuery.toLowerCase()));
		if (!matchesQuery) return false;
		if (capabilities.isAdmin) return true;
		const displayUser = getDisplayUser();
		return ws.userSub === displayUser;
	});

	const sharedWorkspaces = capabilities.isAdmin
		? workspaces.filter((ws) => ws.userSub !== getDisplayUser())
		: [];
	const upgradeAllBtn = capabilities.isAdmin && workspaces.some((ws) => ws.isOutdated);

	if (!isInitialized) {
		if (connectionError) {
			return (
				<div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] flex items-center justify-center p-6">
					<div className="max-w-md w-full card p-8 space-y-6 text-center shadow-xl border border-[var(--line)]">
						<div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
							<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<div className="space-y-2">
							<h2 className="text-lg font-extrabold serif text-[var(--ink)]">Connection Failed</h2>
							<p className="text-xs text-[var(--ink-3)] leading-relaxed font-mono">{connectionError}</p>
						</div>
						<button
							onClick={() => window.location.reload()}
							className="btn btn-primary w-full py-2 text-xs cursor-pointer"
						>
							Retry Connection
						</button>
					</div>
				</div>
			);
		}

		if (!canConnect) {
			const isExchangingCode = window.location.search.includes("code=");
			if (isExchangingCode) {
				return (
					<div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] flex items-center justify-center p-6">
						<div className="max-w-sm w-full card p-8 space-y-4 text-center border border-[var(--line)] shadow-lg">
							<div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto"></div>
							<div className="space-y-1">
								<h3 className="text-sm font-bold text-[var(--ink)]">Authenticating with Identity Provider</h3>
								<p className="text-xs text-[var(--ink-3)] font-mono">Exchanging authorization code for session token...</p>
							</div>
						</div>
					</div>
				);
			}

			return (
				<div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] flex items-center justify-center p-6">
					<div className="max-w-md w-full card p-8 space-y-6 text-center border border-[var(--line)] shadow-2xl">
						<div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto shadow-sm">
							<I.lock className="w-7 h-7" />
						</div>
						<div className="space-y-2">
							<h2 className="text-xl font-extrabold serif text-[var(--ink)]">{uiConfig.title}</h2>
							<p className="text-xs text-[var(--ink-3)] leading-relaxed">{uiConfig.subtitle}</p>
						</div>
						<div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] text-left space-y-2 text-xs">
							<div className="font-semibold text-[var(--ink)] flex items-center justify-between">
								<span>Authentication Required</span>
								<span className="text-[10px] px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-mono">OIDC / OAuth2</span>
							</div>
							<p className="text-[var(--ink-3)]">Please sign in with your Single Sign-On (SSO) credentials to access pod orchestration tools and workspace management.</p>
						</div>
						<button
							onClick={handleLogin}
							className="btn btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all"
						>
							<I.lock className="w-4 h-4" />
							<span>Sign In with Single Sign-On (SSO)</span>
						</button>
						<div className="pt-4 border-t border-[var(--line)] text-left space-y-3">
							<details className="group">
								<summary className="text-xs text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer font-mono select-none flex items-center justify-between">
									<span>Or use manual JWT Bearer token</span>
									<span className="text-[10px]">▼</span>
								</summary>
								<div className="mt-3 space-y-2">
									<input
										type="password"
										placeholder="Paste Bearer JWT token..."
										className="input w-full text-xs font-mono py-2"
										onKeyDown={(e) => {
											if (e.key === "Enter" && e.currentTarget.value.trim()) {
												const token = e.currentTarget.value.trim();
												localStorage.setItem("nocr_token", token);
												setActiveToken(token);
												setIsAutoRefresh(true);
												localStorage.setItem("nocr_auto_refresh", "true");
												triggerToast("Bearer token saved!");
											}
										}}
									/>
									<button
										onClick={(e) => {
											const input = e.currentTarget.previousElementSibling as HTMLInputElement;
											if (input && input.value.trim()) {
												const token = input.value.trim();
												localStorage.setItem("nocr_token", token);
												setActiveToken(token);
											}
										}}
										className="btn btn-secondary w-full py-1.5 text-xs font-mono cursor-pointer"
									>
										Save & Connect
									</button>
								</div>
							</details>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] flex items-center justify-center p-6">
				<div className="max-w-sm w-full card p-8 space-y-4 text-center border border-[var(--line)] shadow-lg">
					<div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto"></div>
					<div className="space-y-1">
						<h3 className="text-sm font-bold text-[var(--ink)]">Connecting to MCP Host</h3>
						<p className="text-xs text-[var(--ink-3)] font-mono">Initializing Model Context Protocol Client Handshake...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] transition-colors duration-200">
			{/* Top Navbar */}
			<header className="sticky top-0 z-40 bg-[var(--surface)]/85 backdrop-blur-md border-b border-[var(--line)] px-6 py-3 transition-colors">
				<div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-amber-500/10">
							N
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-base font-extrabold serif tracking-tight text-[var(--ink)] leading-none">
									{uiConfig.title}
								</h1>
								{capabilities.isAdmin && (
									<span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-500 font-bold tracking-wider uppercase border border-amber-500/20">
										Admin
									</span>
								)}
							</div>
							<p className="text-[11px] text-[var(--ink-3)] font-medium mt-0.5">
								{uiConfig.subtitle}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{/* Search Bar */}
						<div className="relative hidden md:block w-48 lg:w-64">
							<I.search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
							<input
								type="text"
								placeholder="Search workspaces..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="theme-text-input w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg outline-none border border-[var(--line)]"
							/>
						</div>

						{/* Layout view toggler */}
						<div className="flex bg-[var(--sunken)] p-1 rounded-lg border border-[var(--line)]">
							<button
								onClick={() => setLayoutMode("grid")}
								className={`p-1 rounded text-xs transition-colors ${layoutMode === "grid" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
								title="Grid View"
							>
								<I.grid className="w-3.5 h-3.5" />
							</button>
							<button
								onClick={() => setLayoutMode("list")}
								className={`p-1 rounded text-xs transition-colors ${layoutMode === "list" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
								title="List View"
							>
								<I.list className="w-3.5 h-3.5" />
							</button>
						</div>

						{/* Workspace open mode toggler */}
						<div className="flex bg-[var(--sunken)] p-1 rounded-lg border border-[var(--line)]" title="Default launch target for workspaces">
							<button
								onClick={() => {
									setWorkspaceOpenMode("tab");
									localStorage.setItem("nocr_workspace_mode", "tab");
								}}
								className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${workspaceOpenMode === "tab" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm font-bold" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
								title="Open workspaces in a new browser tab"
							>
								<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
								<span className="hidden lg:inline">Tab</span>
							</button>
							<button
								onClick={() => {
									setWorkspaceOpenMode("inline");
									localStorage.setItem("nocr_workspace_mode", "inline");
								}}
								className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${workspaceOpenMode === "inline" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm font-bold" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
								title="Open workspaces in-frame embedded view"
							>
								<I.eye className="w-3 h-3" />
								<span className="hidden lg:inline">Frame</span>
							</button>
						</div>

						{/* Manual MCP State Sync Button */}
						<button
							onClick={() => {
								setIsRefreshingState(true);
								void refreshData().finally(() => {
									setTimeout(() => setIsRefreshingState(false), 500);
								});
							}}
							className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] hover:border-[var(--accent)] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs text-xs font-semibold"
							title={`Sync MCP Workspaces & Templates (Current Polling: ${mcpRefreshInterval > 0 ? `${mcpRefreshInterval}s` : "Disabled (Manual)"})`}
						>
							<I.sync className={`w-3.5 h-3.5 text-[var(--accent)] ${isRefreshingState ? "animate-spin" : ""}`} />
							<span className="hidden sm:inline">Sync</span>
						</button>

						{/* SSO & User Identity section */}
						<div className="flex items-center gap-2 border-l border-[var(--line)] pl-3">
							{isAuthRequired ? (
								activeToken ? (
									<div className="relative">
										<button
											onClick={() => setShowProfileMenu(!showProfileMenu)}
											className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] hover:border-[var(--accent)] transition-all cursor-pointer select-none group"
											title="User Profile & Session Details"
										>
											<div className="relative w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-bold text-xs">
												<I.user className="w-3.5 h-3.5" />
												<span
													className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--card)] ${
														isAutoRefresh ? "bg-emerald-500 animate-pulse" : "bg-blue-500"
													}`}
												/>
											</div>
											<div className="text-left hidden sm:block">
												<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1 group-hover:text-[var(--accent)] transition-colors">
													{getDisplayUser()}
												</div>
												<div className="text-[9px] font-mono text-[var(--ink-3)] flex items-center gap-1">
													<span>{isAutoRefresh ? "Auto-Relogin ON" : "SSO Active"}</span>
												</div>
											</div>
										</button>

										{/* Reactive User Profile Menu Popover */}
										{showProfileMenu && (
											<div className="absolute right-0 top-11 z-50 w-72 bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-2xl p-4 space-y-3 animate-pop text-left">
												<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
													<div className="flex items-center gap-2.5">
														<div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-bold">
															<I.user className="w-5 h-5" />
														</div>
														<div>
															<div className="text-xs font-bold text-[var(--ink)]">{getDisplayUser()}</div>
															<div className="text-[10px] text-[var(--ink-3)] font-mono">
																{capabilities.isAdmin ? "Cluster Admin" : "User Workspace"}
															</div>
														</div>
													</div>
													<button
														onClick={() => setShowProfileMenu(false)}
														className="btn btn-quiet p-1 rounded hover:bg-[var(--surface)] text-[var(--ink-3)]"
													>
														<I.cross className="w-3.5 h-3.5" />
													</button>
												</div>

												{/* Live Session & Auto-Relogin Policy */}
												<div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line)] space-y-2 text-xs">
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-1.5">
															<I.key className="w-3.5 h-3.5 text-[var(--accent)]" />
															<span className="text-xs font-bold text-[var(--ink)]">
																Auto-Relogin
															</span>
														</div>
														<button
															type="button"
															onClick={() => {
																const next = !isAutoRefresh;
																setIsAutoRefresh(next);
																localStorage.setItem("nocr_auto_refresh", String(next));
																triggerToast(`Auto-Relogin ${next ? "Enabled" : "Disabled"}`);
															}}
															className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
																isAutoRefresh ? "bg-emerald-500" : "bg-[var(--line)]"
															}`}
															title="Toggle Automatic SSO Relogin on session expiry"
														>
															<span
																className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
																	isAutoRefresh ? "translate-x-4" : "translate-x-0"
																}`}
															/>
														</button>
													</div>
													<p className="text-[11px] text-[var(--ink-2)] leading-relaxed">
														{isAutoRefresh
															? "Automatically renews SSO session in background when token expires."
															: "Manual re-authentication required on session expiry."}
													</p>
												</div>

												<div className="pt-1 flex gap-2">
													<button
														onClick={() => {
															setShowProfileMenu(false);
															void handleLogin();
														}}
														className="flex-1 btn btn-secondary text-xs py-2 flex items-center justify-center gap-1 cursor-pointer"
													>
														<I.refresh className="w-3.5 h-3.5" />
														<span>Re-Authenticate</span>
													</button>
													<button
														onClick={() => {
															setShowProfileMenu(false);
															handleLogout();
														}}
														className="btn text-xs py-2 px-3 text-red-500 hover:bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer"
													>
														Logout
													</button>
												</div>
											</div>
										)}
									</div>
								) : (
									<button
										onClick={handleLogin}
										className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
									>
										<I.users className="w-3.5 h-3.5" />
										Login with SSO
									</button>
								)
							) : (
								<button
									onClick={() => setShowTokenModal(true)}
									className="btn btn-quiet text-xs py-1 px-2.5 text-[var(--ink-2)] flex items-center gap-1"
									title="Configure Manual Token"
								>
									<I.settings className="w-3.5 h-3.5" />
									Token
								</button>
							)}

							<button
								onClick={() => setShowSystemInfo(true)}
								className="btn btn-quiet p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink)]"
								title="System Metadata & Capabilities"
							>
								<I.info className="w-4 h-4" />
							</button>

							<button
								onClick={() => setShowTweaks(true)}
								className="btn btn-quiet p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink)]"
								title="Visual Customizer"
							>
								<I.spark className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="max-w-7xl mx-auto p-6 space-y-8">
				{/* Top Session Expiry Notice (Only when Auto-Relogin is OFF and token expires in <= 5 minutes) */}
				{isSessionExpiringSoon && !isAutoRefresh && (
					<div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-pulse">
						<div className="flex items-center gap-2">
							<I.info className="w-4 h-4 text-amber-500 shrink-0" />
							<span>Your SSO session expires in less than 5 minutes. Click Re-Authenticate to maintain active workspace connections.</span>
						</div>
						{isAuthRequired && (
							<button onClick={handleLogin} className="btn bg-amber-500 text-white text-xs py-1 px-3 rounded-lg font-bold hover:bg-amber-600 cursor-pointer">
								Re-Authenticate
							</button>
						)}
					</div>
				)}

				{activeConsoleWsId ? (
					<WorkspaceConsoleView
						workspaceId={activeConsoleWsId}
						namespace={namespace}
						activeToken={activeToken}
						currentUser={getDisplayUser()}
						basePath={basePath}
						onBack={() => setActiveConsoleWsId(null)}
						refreshAll={refreshData}
					/>
				) : (
					<>
						{/* Available Pod Templates section */}
						<section className="space-y-4">
							<div className="flex items-center gap-2">
								<h2 className="eyebrow">Available Pod Templates</h2>
								<div className="flex-grow h-[1px] bg-[var(--line)]"></div>
								{capabilities.enabledTools.includes("create_template") && (
									<button className="btn btn-ghost text-xs py-1" onClick={() => setIsCreatingTemplate(true)}>
										<I.plus className="w-3.5 h-3.5 mr-1" /> Add Template Spec
									</button>
								)}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
								{templates.map((tmpl) => {
									const access = checkTemplateAccess(tmpl, activeToken, capabilities.isAdmin);
									const hasRestrictions = (tmpl.allowedRoles && tmpl.allowedRoles.length > 0) || (tmpl.allowedScopes && tmpl.allowedScopes.length > 0);
									return (
										<div
											key={tmpl.name}
											className={`card p-5 flex flex-col justify-between min-h-[140px] transition-all ${
												access.isAllowed ? "card-ws-hover" : "opacity-60 bg-[var(--surface-muted)] border-dashed"
											}`}
										>
											<div>
												<div className="flex items-center justify-between mb-2">
													<div className="flex items-center gap-1.5 truncate">
														{!access.isAllowed && (
															<span className="text-amber-500 shrink-0" title={access.reason}>
																<I.lock className="w-3.5 h-3.5" />
															</span>
														)}
														<h3 className="text-sm font-extrabold font-mono text-[var(--ink)] truncate" title={tmpl.name}>
															{tmpl.name}
														</h3>
													</div>
													<div className="flex items-center gap-1.5 shrink-0">
														<span className="badge-pill text-[9px]">{tmpl.tag || "dev"}</span>
														{!tmpl.isLocal && (tmpl.userSub === getDisplayUser() || capabilities.isAdmin) && (
															<button
																onClick={() => deleteTemplate(tmpl.name)}
																className="btn btn-ghost p-1 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
																title="Delete Template Spec"
															>
																<I.trash className="w-3.5 h-3.5" />
															</button>
														)}
													</div>
												</div>
												<p className="text-xs text-[var(--ink-2)] leading-relaxed">{tmpl.description || "Reusable container pod sandbox template ConfigMap."}</p>
												<div className="flex flex-wrap gap-2 text-[10px] text-[var(--ink-3)] mt-2 font-mono">
													{tmpl.version && <span>Version: <strong className="text-[var(--ink-2)]">{tmpl.version}</strong></span>}
													{tmpl.isLocal ? (
														<span>Source: <strong className="text-[var(--ink-2)]">Local (Immutable)</strong></span>
													) : (
														tmpl.userSub && <span>Creator: <strong className="text-[var(--ink-2)]">{tmpl.userSub}</strong></span>
													)}
												</div>
												{hasRestrictions && (
													<div className="flex flex-wrap gap-1.5 mt-2.5 text-[9px]">
														{tmpl.allowedRoles?.map((role: string) => (
															<span key={role} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono font-bold" title={`Required role: ${role}`}>
																role:{role}
															</span>
														))}
														{tmpl.allowedScopes?.map((scope: string) => (
															<span key={scope} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-mono font-bold" title={`Required scope: ${scope}`}>
																scope:{scope}
															</span>
														))}
													</div>
												)}
											</div>
											<div className="flex items-center justify-between mt-4 border-t border-[var(--line)] pt-3">
												<button className="btn btn-quiet text-xs py-1" onClick={() => setActiveTmplSpec(tmpl)}>
													View Spec JSON
												</button>
												<button
													className={`btn text-xs py-1 px-3 ${
														access.isAllowed ? "btn-primary" : "btn-ghost opacity-50 cursor-not-allowed text-[var(--ink-3)]"
													}`}
													disabled={!access.isAllowed}
													title={access.isAllowed ? "Spawn Sandbox" : access.reason}
													onClick={() => access.isAllowed && setSelectedTemplate(tmpl)}
												>
													{access.isAllowed ? "Spawn Sandbox" : "Restricted"}
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</section>

						{/* Personal Active Workspaces section */}
						<section className="space-y-4">
							<div className="flex items-center gap-2">
								<h2 className="eyebrow">My Workspace Sandboxes</h2>
								<span className="badge-pill text-[9px]">{activeUserWorkspaces.length}</span>
								{upgradeAllBtn && (
									<button className="btn btn-ghost text-xs text-amber-500 py-1" onClick={upgradeAllWorkspaces}>
										Upgrade All Outdated
									</button>
								)}
								<div className="flex-grow h-[1px] bg-[var(--line)]"></div>
								<button
									onClick={() => {
										setIsRefreshingState(true);
										void refreshData().finally(() => {
											setTimeout(() => setIsRefreshingState(false), 500);
										});
									}}
									className="btn btn-ghost text-xs py-1 text-[var(--ink-2)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer"
									title="Sync Workspaces & Pod Status"
								>
									<I.sync className={`w-3.5 h-3.5 ${isRefreshingState ? "animate-spin text-[var(--accent)]" : ""}`} />
									<span className="hidden sm:inline">Sync State</span>
								</button>
							</div>

							{activeUserWorkspaces.length > 0 ? (
								<div className={layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
									{activeUserWorkspaces.map((ws) => (
										<WorkspaceCard
											key={ws.id}
											ws={ws}
											layoutMode={layoutMode}
											basePath={basePath}
											activeToken={activeToken}
											density={density}
											currentUser={getDisplayUser()}
											workspaceOpenMode={workspaceOpenMode}
											isAdmin={capabilities.isAdmin}
											onStop={() => stopWorkspace(ws.id)}
											onUpgrade={() => upgradeWorkspace(ws.id)}
											onShowLogs={() => fetchLogs(ws)}
											onShowEvents={() => fetchEvents(ws)}
											onOpenDetails={() => setActiveConsoleWsId(ws.id)}
											onShowPreview={(path, type) => setPreviewModalConfig({ ws, path, type })}
										/>
									))}
								</div>
							) : (
								<div className="card p-12 text-center space-y-3">
									<div className="w-10 h-10 rounded-full bg-[var(--sunken)] flex items-center justify-center mx-auto text-[var(--ink-3)] border border-[var(--line)]">
										<I.spark className="w-5 h-5" />
									</div>
									<p className="text-xs text-[var(--ink-3)] font-mono">No active personal workspace sandboxes found.</p>
								</div>
							)}
						</section>

						{/* Shared Admin Workspaces section */}
						{capabilities.isAdmin && sharedWorkspaces.length > 0 && (
							<section className="space-y-4 pt-4 border-t border-[var(--line)]">
								<div className="flex items-center gap-2">
									<h2 className="eyebrow text-amber-500">Other User Workspaces (Admin Access)</h2>
									<span className="badge-pill bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px]">{sharedWorkspaces.length}</span>
									<div className="flex-grow h-[1px] bg-[var(--line)]"></div>
								</div>

								<div className={layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
									{sharedWorkspaces.map((ws) => (
										<WorkspaceCard
											key={ws.id}
											ws={ws}
											layoutMode={layoutMode}
											basePath={basePath}
											activeToken={activeToken}
											density={density}
											currentUser={getDisplayUser()}
											workspaceOpenMode={workspaceOpenMode}
											isAdmin={capabilities.isAdmin}
											onStop={() => stopWorkspace(ws.id)}
											onUpgrade={() => upgradeWorkspace(ws.id)}
											onShowLogs={() => fetchLogs(ws)}
											onShowEvents={() => fetchEvents(ws)}
											onOpenDetails={() => setActiveConsoleWsId(ws.id)}
											onShowPreview={(path, type) => setPreviewModalConfig({ ws, path, type })}
										/>
									))}
								</div>
							</section>
						)}
					</>
				)}
			</main>

			{/* Modals & Dialogs */}
			{selectedTemplate && (
				<SpawnWorkspaceModal
					template={selectedTemplate}
					isAdmin={capabilities.isAdmin}
					existingWorkspaces={workspaces}
					currentUser={getDisplayUser()}
					onSpawn={spawnWorkspace}
					onClose={() => setSelectedTemplate(null)}
					onMeowTrigger={triggerMeowEasterEgg}
				/>
			)}

			{isCreatingTemplate && (
				<CreateTemplateModal
					onSave={createTemplate}
					onClose={() => setIsCreatingTemplate(false)}
				/>
			)}

			{activeTmplSpec && (
				<TemplateSpecModal
					template={activeTmplSpec}
					namespace={namespace}
					onClose={() => setActiveTmplSpec(null)}
				/>
			)}

			{activeLogsWs && (
				<LogsViewModal
					workspace={activeLogsWs}
					logs={logsText}
					onRefresh={() => fetchLogs(activeLogsWs)}
					onClose={() => setActiveLogsWs(null)}
				/>
			)}

			{activeEventsWs && (
				<EventsViewModal
					workspace={activeEventsWs}
					events={eventsList}
					onRefresh={() => fetchEvents(activeEventsWs)}
					onClose={() => setActiveEventsWs(null)}
				/>
			)}

			{showTokenModal && (
				<TokenSettingsModal
					activeToken={activeToken}
					onSave={(tok) => {
						localStorage.setItem("nocr_token", tok);
						setActiveToken(tok);
						setShowTokenModal(false);
						triggerToast("Updated manual JWT token");
					}}
					onClear={() => {
						localStorage.removeItem("nocr_token");
						setActiveToken("");
						setShowTokenModal(false);
						triggerToast("Cleared manual JWT token");
					}}
					onClose={() => setShowTokenModal(false)}
				/>
			)}

			{showSystemInfo && (
				<SystemInfoModal
					capabilities={capabilities}
					namespace={namespace}
					activeToken={activeToken}
					basePath={basePath}
					onClose={() => setShowSystemInfo(false)}
				/>
			)}

			{previewModalConfig && (
				<WorkspacePreviewModal
					workspace={previewModalConfig.ws}
					path={previewModalConfig.path}
					type={previewModalConfig.type}
					basePath={basePath}
					activeToken={activeToken}
					onClose={() => setPreviewModalConfig(null)}
				/>
			)}

			<TweaksWidgetPanel
				theme={theme}
				density={density}
				accent={accentColor}
				customTheme={customTheme}
				availableThemes={availableThemes}
				open={showTweaks}
				workspaceOpenMode={workspaceOpenMode}
				isAutoRefresh={isAutoRefresh}
				mcpRefreshInterval={mcpRefreshInterval}
				isLoggedIn={!isAuthRequired || !!activeToken}
				onThemeChange={(t) => {
					setTheme(t);
					localStorage.setItem("nocr_theme", t);
					applyThemeStyles(t, density, accentColor);
				}}
				onCustomThemeChange={(ct) => {
					setCustomTheme(ct);
					localStorage.setItem("nocr_custom_theme", ct);
				}}
				onDensityChange={(d) => {
					setDensity(d);
					localStorage.setItem("nocr_density", d);
					applyThemeStyles(theme, d, accentColor);
				}}
				onAccentChange={(a) => {
					setAccentColor(a);
					localStorage.setItem("nocr_accent", a);
					applyThemeStyles(theme, density, a);
				}}
				onWorkspaceOpenModeChange={(m) => {
					setWorkspaceOpenMode(m);
					localStorage.setItem("nocr_workspace_mode", m);
				}}
				onAutoRefreshChange={(enabled) => {
					setIsAutoRefresh(enabled);
					localStorage.setItem("nocr_auto_refresh", String(enabled));
					triggerToast(
						`Auto-Relogin ${enabled ? "Enabled" : "Disabled"}`,
					);
				}}
				onMcpRefreshIntervalChange={(intervalSec) => {
					setMcpRefreshInterval(intervalSec);
					localStorage.setItem("nocr_mcp_refresh_interval", String(intervalSec));
					triggerToast(
						`MCP State Refresh ${intervalSec > 0 ? `set to ${intervalSec}s` : "Disabled (Manual)"}`,
					);
				}}
				onClose={() => setShowTweaks(false)}
			/>

			{/* Toast notifications container */}
			<div id="toast-container" className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
				{toasts.map((t) => (
					<div
						key={t.id}
						className={`toast-item toast-${t.type} p-4 rounded-xl border flex items-start gap-3 shadow-lg bg-[var(--card)] border-[var(--line)]`}
					>
						<span
							className={
								t.type === "success"
									? "p-1 rounded-md bg-emerald-500/10 text-emerald-500"
									: "p-1 rounded-md bg-red-500/10 text-red-500"
							}
						>
							{t.type === "success" ? (
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
								</svg>
							) : (
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							)}
						</span>
						<div className="flex-1 text-left">
							<p className="text-xs font-bold text-[var(--ink)]">
								{t.type === "success" ? "Success" : "Error"}
							</p>
							<p className="text-[11px] text-[var(--ink-2)] mt-0.5 leading-normal">
								{t.message}
							</p>
						</div>
					</div>
				))}
			</div>

			{isMeowActive && <MeowEasterEgg />}

			<footer className="mt-16 pb-8 border-t border-[var(--line)] pt-8 flex flex-col items-center gap-4 text-center">
				<div className="flex items-center gap-4">
					<a
						href="https://github.com/nogoo9/no-crd"
						target="_blank"
						rel="noopener noreferrer"
						className="text-[var(--ink-3)] hover:text-[var(--accent)] transition-all hover:-translate-y-0.5 transform duration-200"
						title="GitHub Repository"
					>
						<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
						</svg>
					</a>
					<a
						href="https://www.npmjs.com/package/@nogoo9/no-crd"
						target="_blank"
						rel="noopener noreferrer"
						className="text-[var(--ink-3)] hover:text-[var(--accent)] transition-all hover:-translate-y-0.5 transform duration-200"
						title="npm Package"
					>
						<svg className="w-5 h-5" viewBox="0 0 256 256" fill="currentColor">
							<path d="M0 256h153.6V102.4H204.8V256H256V0H0v256zm25.6-128h51.2v76.8H102.4V128h25.6v76.8h25.6V128H25.6z" />
						</svg>
					</a>
				</div>
				<div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-mono text-[var(--ink-3)]">
					<span>
						Powered by{" "}
						<a
							href="https://github.com/nogoo9/no-crd"
							target="_blank"
							rel="noopener noreferrer"
							className="font-semibold text-[var(--accent)] hover:underline"
						>
							nogoo9
						</a>
					</span>
					<span className="hidden sm:inline text-[var(--line-2)]">|</span>
					<span className="px-2 py-0.5 rounded-full bg-[var(--sunken)] border border-[var(--line)] text-[10px]">
						no-crd v{capabilities.version || "0.8.1"}
					</span>
				</div>
			</footer>
		</div>
	);
}

// Render root mount
const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(
		<AppProvider>
			<Dashboard />
		</AppProvider>,
	);
}
