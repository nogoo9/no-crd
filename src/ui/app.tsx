import React, { useState, useEffect, useRef, useTransition } from "react";
import { createRoot } from "react-dom/client";
import { App as McpApp } from "@modelcontextprotocol/ext-apps";

// Initialize the MCP App client bridge
const app = new McpApp(
	{ name: "nogoo9-pod-manager", version: "0.8.1" },
	{ tools: {} },
);

// Constants
const basePath = (window as any).__NOCR_BASE_URL__ !== undefined 
	? ((window as any).__NOCR_BASE_URL__ || "")
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

// Fallback HTTP Transport client configuration (for running directly in browser outside MCP client host)
let _fallbackMode = false;
let httpSessionId: string | null = null;
let mcpEndpointUrl = `${basePath}/mcp`;
const mcpVersion = "2024-11-05";
let lastHttpFallbackError = "";

async function initHttpFallback(activeToken: string, onClearToken: () => void): Promise<boolean> {
	const endpoint = `${basePath}/mcp`;
	try {
		console.log(`Trying HTTP fallback endpoint: ${endpoint}`);
		const initPayload = {
			jsonrpc: "2.0",
			method: "initialize",
			params: {
				protocolVersion: mcpVersion,
				capabilities: {},
				clientInfo: { name: "nogoo9-ui-fallback", version: "0.8.1" },
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
			console.warn("Unauthorized initialization call. Clearing expired token...");
			onClearToken();
			lastHttpFallbackError = "401: Unauthorized";
			return false;
		}
		if (resp.status === 403) {
			const text = await resp.text().catch(() => "");
			lastHttpFallbackError = `${resp.status}${text ? `: ${text}` : ""}`;
			console.warn(`Access forbidden (403): ${text}`);
			return false;
		}
		if (resp.ok) {
			const refreshedToken = resp.headers.get("x-refreshed-token");
			if (refreshedToken) {
				localStorage.setItem("nocr_token", refreshedToken);
			}
			const sessId = resp.headers.get("mcp-session-id");
			if (sessId) {
				httpSessionId = sessId;
			}
			mcpEndpointUrl = endpoint;
			_fallbackMode = true;
			console.log(`HTTP fallback initialized successfully on endpoint: ${endpoint}`);
			return true;
		}
		const text = await resp.text().catch(() => "");
		lastHttpFallbackError = `${resp.status}${text ? `: ${text}` : ""}`;
		console.warn(`HTTP fallback failed for ${endpoint} with status ${resp.status}`);
	} catch (err) {
		lastHttpFallbackError = String(err);
		console.warn(`HTTP fallback initialization failed for ${endpoint}:`, err);
	}
	return false;
}

async function callServerToolFallback(
	name: string,
	args: any,
	activeToken: string,
	onUpdateToken: (t: string) => void,
): Promise<any> {
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
		console.warn("Unauthorized server call. Clearing token...");
		onUpdateToken("");
		throw new Error("HTTP error 401 (Unauthorized — token expired or missing)");
	}

	if (resp.status === 403) {
		const text = await resp.text().catch(() => "");
		console.warn(`Access forbidden (403): ${text}`);
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
		onUpdateToken(refreshedToken);
	}

	const returnedSessionId = resp.headers.get("mcp-session-id");
	if (returnedSessionId) {
		httpSessionId = returnedSessionId;
	}

	const resultData = await resp.json();
	if (resultData && resultData.error) {
		return { isError: true, error: resultData.error.message || String(resultData.error) };
	}
	return {
		isError: false,
		...resultData.result,
	};
}

// Helpers for PKCE / Random strings
function generateRandomString(length: number): string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	const values = new Uint8Array(length);
	crypto.getRandomValues(values);
	for (let i = 0; i < length; i++) {
		result += charset[values[i] % charset.length];
	}
	return result;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return crypto.subtle.digest("SHA-256", data);
}

function base64urlEncode(a: ArrayBuffer): string {
	const str = String.fromCharCode(...new Uint8Array(a));
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateChallenge(verifier: string): Promise<string> {
	const hashed = await sha256(verifier);
	return base64urlEncode(hashed);
}

function decodeJwt(t: string): any {
	try {
		const parts = t.split(".");
		if (parts.length !== 3) return null;
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const json = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
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

function isSafeRedirectUri(uri: string | null): boolean {
	if (!uri) return false;
	if (uri.startsWith("/") && !uri.startsWith("//")) return true;
	try {
		const url = new URL(uri, window.location.origin);
		return url.origin === window.location.origin;
	} catch (_) {
		return false;
	}
}

// Icon Definitions
const I = {
	plus: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M12 4v16m8-8H4" />
		</svg>
	),
	trash: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
		</svg>
	),
	spark: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M13 10V3L4 14h7v7l9-11h-7z" />
		</svg>
	),
	terminal: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
		</svg>
	),
	eye: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
		</svg>
	),
	back: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	),
	settings: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
	),
	cross: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2.5} d="M6 18L18 6M6 6l12 12" />
		</svg>
	),
	users: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
		</svg>
	),
	user: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
		</svg>
	),
	search: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
	),
	refresh: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" />
		</svg>
	),
	grid: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
		</svg>
	),
	list: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M4 6h16M4 12h16M4 18h16" />
		</svg>
	),
	info: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	),
};

// Types & Interfaces
interface WorkspaceApi {
	name: string;
	port: string;
	path: string;
	desc?: string;
	method?: string;
}

interface Workspace {
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

interface Template {
	name: string;
	namespace: string;
	description: string;
	tag: string;
	requiredContext?: string[];
	workspacePath?: string;
	workspaceType?: string;
	apis?: WorkspaceApi[];
}

interface Toast {
	id: string;
	message: string;
	type: "success" | "error";
}

// Global hook listener for custom styles
function applyThemeStyles(theme: string, density: string, accent: string) {
	const root = document.documentElement;
	root.setAttribute("data-theme", theme);
	root.setAttribute("data-density", density);
	root.style.setProperty("--accent", accent);
	
	// Derivations for territorial/press colors
	if (accent === "#c96442") {
		root.style.setProperty("--accent-press", "#b1543a");
		root.style.setProperty("--accent-soft", "#f3e7e0");
	} else if (accent === "#2a6fdb") {
		root.style.setProperty("--accent-press", "#1a51aa");
		root.style.setProperty("--accent-soft", "#e0eaf8");
	} else if (accent === "#1f8a5b") {
		root.style.setProperty("--accent-press", "#13623f");
		root.style.setProperty("--accent-soft", "#e0f2e9");
	} else if (accent === "#7a5ae0") {
		root.style.setProperty("--accent-press", "#5d3db8");
		root.style.setProperty("--accent-soft", "#eae6fa");
	} else {
		root.style.setProperty("--accent-press", accent);
		root.style.setProperty("--accent-soft", "rgba(0, 0, 0, 0.05)");
	}
}

// React App Root
function Dashboard() {
	// States
	const [isInitialized, setIsInitialized] = useState(false);
	const [connectionError, setConnectionError] = useState("");
	const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
	const [templates, setTemplates] = useState<Template[]>([]);
	const [namespace, setNamespace] = useState("nogoo9");
	const [capabilities, setCapabilities] = useState({
		enabledTools: [] as string[],
		managedOnly: true,
		authEnabled: false,
		isAdmin: false,
		version: "",
	});
	const [activeToken, setActiveToken] = useState("");
	const [toasts, setToasts] = useState<Toast[]>([]);

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
					// Override app.callServerTool to route requests through HTTP fallback
					app.callServerTool = async (params: any) => {
						const currentToken = localStorage.getItem("nocr_token") || "";
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
	}, [canConnect]);
	
	// App Views & Nav
	const [route, setRoute] = useState<{ view: "landing" | "workspace"; id?: string }>({ view: "landing" });
	
	// Search, Density & View mode
	const [searchQuery, setSearchQuery] = useState("");
	const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
	const [density, setDensity] = useState("comfortable");
	const [theme, setTheme] = useState("light");
	const [accentColor, setAccentColor] = useState("#c96442");
	const [showTweaks, setShowTweaks] = useState(false);
	
	// Modals States
	const [showTokenSettings, setShowTokenSettings] = useState(false);
	const [showSystemInfo, setShowSystemInfo] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
	const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
	const [activeTmplSpec, setActiveTmplSpec] = useState<Template | null>(null);
	const [activeLogsWs, setActiveLogsWs] = useState<Workspace | null>(null);
	const [logsContent, setLogsContent] = useState("Fetching container logs...");
	const [activeEventsWs, setActiveEventsWs] = useState<Workspace | null>(null);
	const [eventsContent, setEventsContent] = useState("Fetching workspace events...");
	const [activePreviewWs, setActivePreviewWs] = useState<{ ws: Workspace; path: string; type: string } | null>(null);

	// Fetch triggers
	const [isPending, startTransition] = useTransition();

	// Toast trigger
	const triggerToast = (message: string, type: "success" | "error" = "success") => {
		const id = generateRandomString(8);
		setToasts((prev) => [...prev, { id, message, type }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 4000);
	};

	// Local Storage Init
	useEffect(() => {
		const localTheme = localStorage.getItem("nocr_theme") || "light";
		const localDensity = localStorage.getItem("nocr_density") || "comfortable";
		const localAccent = localStorage.getItem("nocr_accent") || "#c96442";
		const localLayout = localStorage.getItem("nocr_layout") || "grid";

		setTheme(localTheme);
		setDensity(localDensity);
		setAccentColor(localAccent);
		setLayoutMode(localLayout as any);

		applyThemeStyles(localTheme, localDensity, localAccent);
	}, []);

	// Token Setup & Auto Redirect Check
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const redirectUri = urlParams.get("redirect_uri");
		if (isSafeRedirectUri(redirectUri)) {
			sessionStorage.setItem("nocr_post_login_redirect_uri", redirectUri!);
			// Clean the parameter to keep the address bar clean
			const cleanParams = new URLSearchParams(window.location.search);
			cleanParams.delete("redirect_uri");
			const newSearch = cleanParams.toString();
			const cleanUrl =
				window.location.pathname +
				(newSearch ? `?${newSearch}` : "") +
				window.location.hash;
			window.history.replaceState({}, document.title, cleanUrl);
		}

		let token = urlParams.get("token");
		if (token) {
			localStorage.setItem("nocr_token", token);
			const cleanUrl = window.location.pathname + window.location.hash;
			window.history.replaceState({}, document.title, cleanUrl);
		} else {
			token = localStorage.getItem("nocr_token");
		}

		if (token) {
			const payload = decodeJwt(token);
			if (payload?.exp && payload.exp < Date.now() / 1000) {
				localStorage.removeItem("nocr_token");
				token = null;
			}
		}

		if (token) {
			setActiveToken(token);
			const savedRedirect = sessionStorage.getItem("nocr_post_login_redirect_uri") || urlParams.get("redirect_uri");
			if (isSafeRedirectUri(savedRedirect)) {
				sessionStorage.removeItem("nocr_post_login_redirect_uri");
				const separator = savedRedirect!.includes("?") ? "&" : "?";
				window.location.href = `${savedRedirect}${separator}token=${encodeURIComponent(token)}`;
				return;
			}
		} else if (oauthConfig.discoveryUrl && oauthConfig.clientId) {
			const oidcFailed = sessionStorage.getItem("nocr_oauth_failed") === "true";
			const code = urlParams.get("code");
			if (!code && !oidcFailed) {
				// Trigger automatic PKCE redirection
				void triggerOidcLogin();
			}
		}
	}, []);

	// Retrieve Data Hook
	const refreshData = async () => {
		try {
			const jwtPayload = activeToken ? decodeJwt(activeToken) : undefined;

			// Fetch Capabilities
			const capRes = await app.callServerTool({
				name: "get_capabilities",
				arguments: { jwtPayload },
			});
			if (capRes && !capRes.isError && capRes.structuredContent) {
				const cap = capRes.structuredContent as any;
				setCapabilities({
					enabledTools: cap.enabledTools || [],
					managedOnly: cap.managedOnly ?? true,
					authEnabled: cap.authEnabled ?? false,
					isAdmin: cap.isAdmin ?? false,
					version: cap.version || "",
				});
			}

			// Fetch Namespace
			const nsRes = await app.callServerTool({
				name: "current_namespace",
				arguments: {},
			});
			if (nsRes && !nsRes.isError && nsRes.structuredContent) {
				setNamespace((nsRes.structuredContent as any).namespace || "default");
			}

			// Fetch Templates
			const tmplRes = await app.callServerTool({
				name: "list_templates",
				arguments: { namespace },
			});
			if (tmplRes && !tmplRes.isError && tmplRes.structuredContent) {
				setTemplates((tmplRes.structuredContent as any).templates || []);
			}

			// Fetch Workspaces
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

	// PKCE Redirection Trigger
	const triggerOidcLogin = async () => {
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
			const scopes = Array.isArray(oauthConfig.scopes) && oauthConfig.scopes.length > 0
				? oauthConfig.scopes
				: ["openid", "profile", "email"];
			url.searchParams.set("scope", scopes.join(" "));

			window.location.href = url.toString();
		} catch (err) {
			triggerToast("Failed to initialize OIDC redirect", "error");
		}
	};

	// Auto redirect/re-login when token is cleared or expired
	useEffect(() => {
		if (isAuthRequired && !activeToken) {
			const oidcFailed = sessionStorage.getItem("nocr_oauth_failed") === "true";
			const urlParams = new URLSearchParams(window.location.search);
			const code = urlParams.get("code");
			if (!code && !oidcFailed) {
				console.log("Active token is missing or expired. Redirecting to SSO Identity Provider...");
				void triggerOidcLogin();
			}
		}
	}, [activeToken, isAuthRequired]);

	// OAuth callback processing
	useEffect(() => {
		const callbackParams = new URLSearchParams(window.location.search);
		const code = callbackParams.get("code");
		const state = callbackParams.get("state");
		
		if (code) {
			const savedState = localStorage.getItem("nocr_oauth_state");
			const codeVerifier = localStorage.getItem("nocr_oauth_verifier");
			if (state === savedState && codeVerifier) {
				const exchangeToken = async () => {
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

						if (!tokenRes.ok) throw new Error("Token exchange failed");
						const tokenData = await tokenRes.json();
						if (tokenData.access_token) {
							localStorage.setItem("nocr_token", tokenData.access_token);
							setActiveToken(tokenData.access_token);
							triggerToast("Signed in successfully!", "success");

							const savedRedirect = sessionStorage.getItem("nocr_post_login_redirect_uri");
							if (isSafeRedirectUri(savedRedirect)) {
								sessionStorage.removeItem("nocr_post_login_redirect_uri");
								const separator = savedRedirect!.includes("?") ? "&" : "?";
								window.location.href = `${savedRedirect}${separator}token=${encodeURIComponent(tokenData.access_token)}`;
								return;
							}
						}
					} catch (e) {
						triggerToast("SSO token exchange failed", "error");
						sessionStorage.setItem("nocr_oauth_failed", "true");
					} finally {
						localStorage.removeItem("nocr_oauth_state");
						localStorage.removeItem("nocr_oauth_verifier");
						const cleanUrl = window.location.pathname + window.location.hash;
						window.history.replaceState({}, document.title, cleanUrl);
					}
				};
				void exchangeToken();
			}
		}
	}, []);

	// Sign out
	const handleLogout = async () => {
		try {
			const token = localStorage.getItem("nocr_token") || activeToken;
			try {
				await fetch(`${basePath}/logout`, {
					method: "POST",
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				});
			} catch (err) {
				console.warn("Failed to clear server cookies during logout:", err);
			}

			if (oauthConfig.discoveryUrl && oauthConfig.clientId) {
				const discRes = await fetch(oauthConfig.discoveryUrl);
				const discData = await discRes.json();
				const logoutEndpoint = discData.end_session_endpoint;
				if (logoutEndpoint) {
					const logoutUrl = new URL(logoutEndpoint);
					logoutUrl.searchParams.set("client_id", oauthConfig.clientId);
					logoutUrl.searchParams.set("post_logout_redirect_uri", window.location.origin + window.location.pathname);
					localStorage.removeItem("nocr_token");
					setActiveToken("");
					window.location.href = logoutUrl.toString();
					return;
				}
			}
			localStorage.removeItem("nocr_token");
			setActiveToken("");
			triggerToast("Logged out successfully");
		} catch (_) {
			localStorage.removeItem("nocr_token");
			setActiveToken("");
		}
	};

	// Actions execution
	const stopWorkspace = async (id: string) => {
		try {
			triggerToast(`Stopping workspace ${id}...`);
			const res = await app.callServerTool({
				name: "stop_workspace",
				arguments: { id, namespace, jwtPayload: activeToken ? decodeJwt(activeToken) : undefined },
			});
			if (res && !res.isError) {
				triggerToast(`Workspace ${id} stopped successfully.`, "success");
				refreshData();
			} else {
				throw new Error(String(res?.error || "Error stopping workspace"));
			}
		} catch (err) {
			triggerToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	const upgradeWorkspace = async (id: string) => {
		try {
			triggerToast(`Upgrading workspace ${id}...`);
			const res = await app.callServerTool({
				name: "upgrade_workspace",
				arguments: { id, namespace, jwtPayload: activeToken ? decodeJwt(activeToken) : undefined },
			});
			if (res && !res.isError) {
				triggerToast(`Workspace ${id} upgraded successfully.`, "success");
				refreshData();
			} else {
				throw new Error(String(res?.error || "Error upgrading workspace"));
			}
		} catch (err) {
			triggerToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	const upgradeAllWorkspaces = async () => {
		try {
			triggerToast("Upgrading all outdated workspaces...");
			const res = await app.callServerTool({
				name: "upgrade_all_workspaces",
				arguments: { namespace, jwtPayload: activeToken ? decodeJwt(activeToken) : undefined },
			});
			if (res && !res.isError) {
				triggerToast("All outdated workspaces upgraded successfully.", "success");
				refreshData();
			} else {
				throw new Error(String(res?.error || "Error upgrading workspaces"));
			}
		} catch (err) {
			triggerToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	// Logs loading helper
	const loadLogs = async (ws: Workspace) => {
		if (!ws.podName) return;
		try {
			setLogsContent("Loading logs...");
			const res = await app.callServerTool({
				name: "get_pod_logs",
				arguments: { name: ws.podName, namespace, jwtPayload: activeToken ? decodeJwt(activeToken) : undefined },
			});
			if (res && !res.isError && res.structuredContent) {
				setLogsContent((res.structuredContent as any).logs || "No logs available.");
			} else {
				setLogsContent(`Error retrieving logs: ${res?.error || "Unknown error"}`);
			}
		} catch (err) {
			setLogsContent(`Failed to load logs: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	useEffect(() => {
		if (activeLogsWs) {
			void loadLogs(activeLogsWs);
		}
	}, [activeLogsWs]);

	// Events loading helper
	const loadEvents = async (ws: Workspace) => {
		try {
			setEventsContent("Loading events...");
			const res = await app.callServerTool({
				name: "get_workspace_events",
				arguments: { id: ws.id, namespace, jwtPayload: activeToken ? decodeJwt(activeToken) : undefined },
			});
			if (res && !res.isError && res.structuredContent) {
				const events = (res.structuredContent as any).events || [];
				if (events.length === 0) {
					setEventsContent("No namespace events found for this workspace.");
				} else {
					setEventsContent(
						events
							.map((ev: any) => `[${ev.lastTimestamp || ev.firstTimestamp}] ${ev.type} - ${ev.reason}: ${ev.message}`)
							.join("\n"),
					);
				}
			} else {
				setEventsContent(`Error retrieving events: ${res?.error || "Unknown error"}`);
			}
		} catch (err) {
			setEventsContent(`Failed to load events: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	useEffect(() => {
		if (activeEventsWs) {
			void loadEvents(activeEventsWs);
		}
	}, [activeEventsWs]);

	// Sub-components UI
	const getDisplayUser = () => {
		if (!activeToken) return "Anonymous";
		const payload = decodeJwt(activeToken);
		if (payload) {
			const jsonPath = oauthConfig.subJsonPath || "$.sub";
			return getValueByJsonPath(payload, jsonPath) || payload.sub || payload.name || "User";
		}
		return "Anonymous";
	};

	// Workspace list filtering
	const activeUserWorkspaces = workspaces.filter((ws) => {
		const matchesQuery = !searchQuery || ws.id.toLowerCase().includes(searchQuery.toLowerCase()) || (ws.name && ws.name.toLowerCase().includes(searchQuery.toLowerCase()));
		if (!matchesQuery) return false;
		if (capabilities.isAdmin) return true;
		const displayUser = getDisplayUser();
		return ws.userSub === displayUser;
	});

	const sharedWorkspaces = capabilities.isAdmin ? workspaces.filter((ws) => ws.userSub !== getDisplayUser()) : [];
	const upgradeAllBtn = activeUserWorkspaces.some((ws) => ws.isOutdated);

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

		const loadingMessage = !canConnect
			? "Authenticating with Identity Provider..."
			: "Initializing connection...";

		return (
			<div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] flex flex-col items-center justify-center gap-4">
				<div className="w-8 h-8 rounded-full border-2 border-[var(--line-2)] border-t-[var(--accent)] animate-spin"></div>
				<p className="text-xs font-mono tracking-widest uppercase text-[var(--ink-3)] animate-pulse">{loadingMessage}</p>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
			{/* Top Header */}
			<header className="flex flex-col md:flex-row md:items-center md:justify-between pb-8 border-b border-[var(--line)] gap-4">
				<div className="flex items-center gap-3">
					<span className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-lg">
						<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
					</span>
					<div>
						<h1 className="text-xl font-extrabold serif text-[var(--ink)]">{uiConfig.title}</h1>
						<p className="text-xs font-mono text-[var(--ink-3)]">{uiConfig.subtitle}</p>
					</div>
				</div>

				<div className="flex items-center gap-3 flex-wrap">
					{/* System Info Activator */}
					<button className="btn btn-ghost text-xs py-1.5" onClick={() => setShowSystemInfo(true)}>
						<I.info className="w-3.5 h-3.5 mr-1 text-[var(--accent)]" />
						System Info
					</button>

					{/* Theme & Tweak Widget Activator */}
					<button className="btn btn-ghost text-xs py-1.5" onClick={() => setShowTweaks(!showTweaks)}>
						<I.settings className="w-3.5 h-3.5 mr-1" />
						Design Customize
					</button>

					{/* Namespace display */}
					<div className="px-3 py-1.5 badge-pill text-xs font-mono flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
						Namespace: <span className="font-bold text-[var(--accent)]">{namespace}</span>
					</div>

					{/* OIDC User Info */}
					<button className="btn btn-ghost text-xs flex items-center gap-1.5" onClick={() => setShowTokenSettings(true)}>
						<I.user className="w-3.5 h-3.5 text-[var(--accent)]" />
						{getDisplayUser()}
						{capabilities.isAdmin && <span className="px-1 py-0.5 rounded text-[8px] bg-amber-500/10 text-amber-500 font-bold ml-1 uppercase">Admin</span>}
					</button>

					{/* Sign out */}
					{activeToken && (
						<button className="btn btn-ghost text-xs text-red-500" onClick={handleLogout}>
							Sign Out
						</button>
					)}

					{/* Refresh btn */}
					<button className="btn btn-primary text-xs py-1.5 flex items-center gap-1" disabled={isPending} onClick={refreshData}>
						<I.refresh className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
						Refresh
					</button>
				</div>
			</header>

			{/* Main Toolbar */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 mt-2">
				<div className="relative flex-1 max-w-md">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<I.search className="w-4 h-4 text-[var(--ink-3)]" />
					</div>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="theme-text-input w-full pl-9 pr-4 py-2 text-sm outline-none transition"
						placeholder="Search workspaces, templates, or statuses..."
					/>
				</div>

				<div className="flex items-center gap-3">
					{/* Layout views toggle */}
					<div className="flex items-center border border-[var(--line)] rounded-lg overflow-hidden bg-[var(--card)]">
						<button
							onClick={() => { setLayoutMode("grid"); localStorage.setItem("nocr_layout", "grid"); }}
							className={`px-3 py-2 text-xs transition-colors cursor-pointer ${layoutMode === "grid" ? "bg-[var(--surface)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:bg-[var(--surface)]"}`}
							title="Grid View"
						>
							<I.grid className="w-4 h-4" />
						</button>
						<button
							onClick={() => { setLayoutMode("list"); localStorage.setItem("nocr_layout", "list"); }}
							className={`px-3 py-2 text-xs transition-colors border-l border-[var(--line)] cursor-pointer ${layoutMode === "list" ? "bg-[var(--surface)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:bg-[var(--surface)]"}`}
							title="List View"
						>
							<I.list className="w-4 h-4" />
						</button>
					</div>

					{/* Density toggler */}
					<select
						value={density}
						onChange={(e) => {
							setDensity(e.target.value);
							localStorage.setItem("nocr_density", e.target.value);
							applyThemeStyles(theme, e.target.value, accentColor);
						}}
						className="theme-text-input text-xs px-3 py-2 cursor-pointer outline-none rounded-lg font-medium"
					>
						<option value="comfortable">Comfortable Layout</option>
						<option value="compact">Compact Layout</option>
					</select>
				</div>
			</div>

			{/* Main Grid content */}
			{route.view === "landing" ? (
				<main className="mt-8 space-y-10">
					{/* Available templates block */}
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
							{templates.map((tmpl) => (
								<div key={tmpl.name} className="card card-ws-hover p-5 flex flex-col justify-between min-h-[140px]">
									<div>
										<div className="flex items-center justify-between mb-2">
											<h3 className="text-sm font-extrabold font-mono text-[var(--ink)]">{tmpl.name}</h3>
											<span className="badge-pill text-[9px]">{tmpl.tag || "dev"}</span>
										</div>
										<p className="text-xs text-[var(--ink-2)] leading-relaxed">{tmpl.description || "Reusable container pod sandbox template ConfigMap."}</p>
									</div>
									<div className="flex items-center justify-between mt-4 border-t border-[var(--line)] pt-3">
										<button className="btn btn-quiet text-xs py-1" onClick={() => setActiveTmplSpec(tmpl)}>
											View Spec JSON
										</button>
										<button className="btn btn-primary text-xs py-1 px-3" onClick={() => setSelectedTemplate(tmpl)}>
											Spawn Sandbox
										</button>
									</div>
								</div>
							))}
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
						</div>

						{activeUserWorkspaces.length === 0 ? (
							<div className="py-12 text-center border border-dashed border-[var(--line)] rounded-xl text-[var(--ink-3)] text-sm">
								No active sandboxes. Click "Spawn Sandbox" on a template above.
							</div>
						) : (
							<div className={layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
								{activeUserWorkspaces.map((ws) => (
									<WorkspaceCard
										key={ws.id}
										ws={ws}
										layoutMode={layoutMode}
										basePath={basePath}
										activeToken={activeToken}
										density={density}
										onStop={() => stopWorkspace(ws.id)}
										onUpgrade={() => upgradeWorkspace(ws.id)}
										onShowLogs={() => setActiveLogsWs(ws)}
										onShowEvents={() => setActiveEventsWs(ws)}
										onOpenDetails={() => setRoute({ view: "workspace", id: ws.id })}
										onShowPreview={(path, type) => setActivePreviewWs({ ws, path, type })}
									/>
								))}
							</div>
						)}
					</section>

					{/* Shared Active Workspaces section (admin view) */}
					{capabilities.isAdmin && sharedWorkspaces.length > 0 && (
						<section className="space-y-4 pt-4">
							<div className="flex items-center gap-2">
								<h2 className="eyebrow text-amber-500">Shared/Other Sandboxes (Admin Mode)</h2>
								<span className="badge-pill text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">{sharedWorkspaces.length}</span>
								<div className="flex-grow h-[1px] bg-[var(--line)]"></div>
							</div>

							<div className={layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
								{sharedWorkspaces.map((ws) => (
									<WorkspaceCard
										key={ws.id}
										ws={ws}
										layoutMode={layoutMode}
										basePath={basePath}
										activeToken={activeToken}
										density={density}
										onStop={() => stopWorkspace(ws.id)}
										onUpgrade={() => upgradeWorkspace(ws.id)}
										onShowLogs={() => setActiveLogsWs(ws)}
										onShowEvents={() => setActiveEventsWs(ws)}
										onOpenDetails={() => setRoute({ view: "workspace", id: ws.id })}
										onShowPreview={(path, type) => setActivePreviewWs({ ws, path, type })}
									/>
								))}
							</div>
						</section>
					)}
				</main>
			) : (
				/* Detail split console view */
				<WorkspaceConsoleView
					workspaceId={route.id!}
					namespace={namespace}
					activeToken={activeToken}
					onBack={() => setRoute({ view: "landing" })}
					refreshAll={refreshData}
				/>
			)}

			{/* Settings Token Configuration Modal */}
			{showTokenSettings && (
				<TokenSettingsModal
					activeToken={activeToken}
					onSave={(token) => {
						localStorage.setItem("nocr_token", token);
						setActiveToken(token);
						setShowTokenSettings(false);
						triggerToast("JWT token updated.", "success");
						void refreshData();
					}}
					onClear={() => {
						localStorage.removeItem("nocr_token");
						setActiveToken("");
						setShowTokenSettings(false);
						triggerToast("Manual JWT token cleared.");
						void refreshData();
					}}
					onClose={() => setShowTokenSettings(false)}
				/>
			)}

			{/* Spawn Workspace stepper parameters modal */}
			{selectedTemplate && (
				<SpawnWorkspaceModal
					template={selectedTemplate}
					isAdmin={capabilities.isAdmin}
					existingWorkspaces={workspaces}
					onSpawn={async (id, name, userSub, contextVars) => {
						try {
							setSelectedTemplate(null);
							triggerToast(`Spawning sandbox ${id}...`);
							const res = await app.callServerTool({
								name: "spawn_workspace",
								arguments: {
									id,
									namespace,
									name,
									templateRef: selectedTemplate.name,
									userSub: userSub || undefined,
									contextVariables: contextVars,
									jwtPayload: activeToken ? decodeJwt(activeToken) : undefined,
								},
							});
							if (res && !res.isError) {
								triggerToast(`Workspace sandbox ${id} spawned successfully.`, "success");
								refreshData();
							} else {
								throw new Error(String(res?.error || "Failed spawning workspace"));
							}
						} catch (err) {
							triggerToast(err instanceof Error ? err.message : String(err), "error");
						}
					}}
					onClose={() => setSelectedTemplate(null)}
				/>
			)}

			{/* Create Pod Template specification modal */}
			{isCreatingTemplate && (
				<CreateTemplateModal
					onSave={async (name, desc, tag, specString, advData) => {
						try {
							setIsCreatingTemplate(false);
							triggerToast(`Registering template spec ${name}...`);
							let podSpec = {};
							try {
								podSpec = JSON.parse(specString);
							} catch (_) {
								throw new Error("Invalid Pod Spec JSON formatting");
							}

							const annotations: Record<string, string> = {};
							if (desc) annotations["nogoo9/template-description"] = desc;
							if (tag) annotations["nogoo9/template-tag"] = tag;
							if (advData.context) annotations["nogoo9/required-context"] = advData.context;
							if (advData.port) annotations["nogoo9/workspace-port"] = advData.port;
							if (advData.previewPath) annotations["nogoo9/workspace-preview-path"] = advData.previewPath;
							if (advData.previewType) annotations["nogoo9/workspace-preview-type"] = advData.previewType;
							if (advData.gracePeriod) annotations["nogoo9/workspace-grace-period-seconds"] = advData.gracePeriod;
							
							// Init container annotations
							if (advData.initImage) annotations["nogoo9/init-image"] = advData.initImage;
							if (advData.initCmd) annotations["nogoo9/init-command"] = advData.initCmd;

							// Pre-stop hooks annotations
							if (advData.prestopCmd) annotations["nogoo9/pre-stop-command"] = advData.prestopCmd;
							if (advData.prestopSidecar) annotations["nogoo9/pre-stop-sidecar-image"] = advData.prestopSidecar;

							const res = await app.callServerTool({
								name: "create_template",
								arguments: {
									name,
									namespace,
									description: desc,
									tag,
									podSpec,
									annotations,
								},
							});

							if (res && !res.isError) {
								triggerToast(`Template ${name} registered successfully.`, "success");
								refreshData();
							} else {
								throw new Error(String(res?.error || "Error registering template"));
							}
						} catch (err) {
							triggerToast(err instanceof Error ? err.message : String(err), "error");
						}
					}}
					onClose={() => setIsCreatingTemplate(false)}
				/>
			)}

			{/* Template Specification View JSON Modal */}
			{activeTmplSpec && (
				<TemplateSpecModal
					template={activeTmplSpec}
					namespace={namespace}
					onClose={() => setActiveTmplSpec(null)}
				/>
			)}

			{/* Logs container Modal */}
			{activeLogsWs && (
				<LogsViewModal
					workspace={activeLogsWs}
					logs={logsContent}
					onRefresh={() => void loadLogs(activeLogsWs)}
					onClose={() => setActiveLogsWs(null)}
				/>
			)}

			{/* Namespace events Modal */}
			{activeEventsWs && (
				<EventsViewModal
					workspace={activeEventsWs}
					events={eventsContent}
					onRefresh={() => void loadEvents(activeEventsWs)}
					onClose={() => setActiveEventsWs(null)}
				/>
			)}

			{/* Workspace Inline Iframe Preview Modal */}
			{activePreviewWs && (
				<WorkspacePreviewModal
					workspace={activePreviewWs.ws}
					path={activePreviewWs.path}
					type={activePreviewWs.type}
					basePath={basePath}
					activeToken={activeToken}
					onClose={() => setActivePreviewWs(null)}
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

			{/* persistent tweaks widgets panel */}
			<TweaksWidgetPanel
				theme={theme}
				density={density}
				accent={accentColor}
				open={showTweaks}
				onThemeChange={(t) => {
					setTheme(t);
					localStorage.setItem("nocr_theme", t);
					applyThemeStyles(t, density, accentColor);
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
				onClose={() => setShowTweaks(false)}
			/>

			{/* Toast system notification elements */}
			<div id="toast-container" className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
				{toasts.map((t) => (
					<div key={t.id} className={`toast-item toast-${t.type} p-4 rounded-xl border flex items-start gap-3 shadow-lg bg-[var(--card)] border-[var(--line)]`}>
						<span className={t.type === "success" ? "p-1 rounded-md bg-emerald-500/10 text-emerald-500" : "p-1 rounded-md bg-red-500/10 text-red-500"}>
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
							<p className="text-xs font-bold text-[var(--ink)]">{t.type === "success" ? "Success" : "Error"}</p>
							<p className="text-[11px] text-[var(--ink-2)] mt-0.5 leading-normal">{t.message}</p>
						</div>
					</div>
				))}
			</div>

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
							<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
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
							<path d="M0 256h153.6V102.4H204.8V256H256V0H0v256zm25.6-128h51.2v76.8H102.4V128h25.6v76.8h25.6V128H25.6z"/>
						</svg>
					</a>
				</div>
				<div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-mono text-[var(--ink-3)]">
					<span>Powered by <a href="https://github.com/nogoo9/no-crd" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--accent)] hover:underline">nogoo9</a></span>
					<span className="hidden sm:inline text-[var(--line-2)]">|</span>
					<span className="px-2 py-0.5 rounded-full bg-[var(--sunken)] border border-[var(--line)] text-[10px]">
						no-crd v{capabilities.version || "0.8.1"}
					</span>
				</div>
			</footer>
		</div>
	);
}

// Sandbox card display subcomponent
interface WorkspaceCardProps {
	ws: Workspace;
	layoutMode: "grid" | "list";
	basePath: string;
	activeToken: string;
	density: string;
	onStop: () => void;
	onUpgrade: () => void;
	onShowLogs: () => void;
	onShowEvents: () => void;
	onOpenDetails: () => void;
	onShowPreview: (path: string, type: string) => void;
}

function formatRelativeTime(epoch: number): string {
	const now = Math.floor(Date.now() / 1000);
	const t = epoch > 9999999999 ? Math.floor(epoch / 1000) : epoch;
	const diff = now - t;
	if (diff < 5) return "Just now";
	if (diff < 60) return `${diff}s ago`;
	const mins = Math.floor(diff / 60);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	return new Date(t * 1000).toLocaleDateString();
}

function WorkspaceCard({
	ws,
	layoutMode,
	basePath,
	activeToken,
	density,
	onStop,
	onUpgrade,
	onShowLogs,
	onShowEvents,
	onOpenDetails,
	onShowPreview,
}: WorkspaceCardProps) {
	const tokenQuery = activeToken ? `?token=${encodeURIComponent(activeToken)}` : "";
	const pathPart = ws.workspacePath || ws.previewPath || "/";
	const cleanPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
	const openUrl = `${basePath}/route/${ws.id}${cleanPath}${tokenQuery}`;

	const [stats, setStats] = useState<Record<string, any> | null>(null);
	const [lastActivity, setLastActivity] = useState<number | null>(null);

	useEffect(() => {
		if (ws.status !== "Running") {
			setStats(null);
			setLastActivity(null);
			return;
		}

		const statsApi = ws.apis?.find(a => a.name === "stats");
		const activityApi = ws.apis?.find(a => a.name === "last_activity" || a.name === "last-activity");

		let statsIntervalId: any = null;
		let activityIntervalId: any = null;

		const fetchStats = async () => {
			if (!statsApi) return;
			try {
				const q = activeToken ? `?token=${encodeURIComponent(activeToken)}` : "";
				const res = await fetch(`${basePath}/route/${ws.id}${statsApi.path}${q}`);
				if (res.ok) {
					const data = await res.json();
					if (data && data.stats) {
						setStats(data.stats);
					}
				}
			} catch (_) {}
		};

		const fetchActivity = async () => {
			if (!activityApi) return;
			try {
				const q = activeToken ? `?token=${encodeURIComponent(activeToken)}` : "";
				const res = await fetch(`${basePath}/route/${ws.id}${activityApi.path}${q}`);
				if (res.ok) {
					const data = await res.json();
					if (data && data.last_activity) {
						setLastActivity(Number(data.last_activity));
					}
				}
			} catch (_) {}
		};

		// Independent refresh intervals from annotations
		const statsRefreshStr = ws.annotations?.["nogoo9/api.stats.refresh"] || "30s";
		const activityRefreshStr = ws.annotations?.["nogoo9/api.last_activity.refresh"] || "30s";

		if (statsApi) {
			void fetchStats();
			if (statsRefreshStr !== "init") {
				let ms = 30000;
				if (statsRefreshStr.endsWith("s")) ms = parseInt(statsRefreshStr) * 1000;
				else if (statsRefreshStr.endsWith("m")) ms = parseInt(statsRefreshStr) * 60 * 1000;
				if (!isNaN(ms) && ms > 0) {
					statsIntervalId = setInterval(() => { void fetchStats(); }, ms);
				}
			}
		}

		if (activityApi) {
			void fetchActivity();
			if (activityRefreshStr !== "init") {
				let ms = 30000;
				if (activityRefreshStr.endsWith("s")) ms = parseInt(activityRefreshStr) * 1000;
				else if (activityRefreshStr.endsWith("m")) ms = parseInt(activityRefreshStr) * 60 * 1000;
				if (!isNaN(ms) && ms > 0) {
					activityIntervalId = setInterval(() => { void fetchActivity(); }, ms);
				}
			}
		}

		return () => {
			if (statsIntervalId) clearInterval(statsIntervalId);
			if (activityIntervalId) clearInterval(activityIntervalId);
		};
	}, [ws.status, ws.id, ws.apis, ws.annotations, basePath, activeToken]);

	const getStatusColorClass = () => {
		if (ws.status === "Running") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
		if (ws.status === "Pending") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
		return "bg-red-500/10 text-red-500 border-red-500/20";
	};

	const isCompact = density === "compact";

	const cardContent = (
		<div className={`flex flex-col justify-between h-full ${isCompact ? "gap-2" : "gap-4"}`}>
			<div>
				{/* Top title and status indicator */}
				<div className="flex items-center justify-between mb-1.5 min-w-0 gap-2">
					<div className="flex items-center gap-1.5 min-w-0">
						{ws.status === "Running" && (
							<span className="relative flex h-1.5 w-1.5 shrink-0">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
							</span>
						)}
						<h3 className="text-sm font-extrabold font-mono text-[var(--ink)] truncate" title={ws.id}>{ws.id}</h3>
					</div>

					<div className="flex items-center gap-1 shrink-0">
						{ws.isOutdated && (
							<span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/15 text-amber-500 border border-amber-500/25 font-bold tracking-wider uppercase">Outdated</span>
						)}
						<span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider border ${getStatusColorClass()}`}>
							{ws.status}
						</span>
					</div>
				</div>

				{/* Description text */}
				{(ws.description || ws.name) && (
					<p className="text-xs text-[var(--ink-2)] font-semibold mb-2 line-clamp-2" title={ws.description || ws.name}>
						{ws.description || ws.name}
					</p>
				)}

				{/* Metadata badges */}
				<div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-[var(--ink-3)] mb-3 mt-1.5 font-mono">
					{ws.templateRef && <span>Tmpl: <strong className="text-[var(--ink-2)]">{ws.templateRef}</strong></span>}
					{(ws.owner || ws.userSub) && <span>Owner: <strong className="text-[var(--ink-2)]">{ws.owner || ws.userSub}</strong></span>}
					{ws.creationTime && <span>Created: <strong className="text-[var(--ink-2)]">{new Date(ws.creationTime).toLocaleString()}</strong></span>}
					{ws.podIP && <span>IP: <strong className="text-[var(--ink-2)]">{ws.podIP}</strong></span>}
				</div>

				{/* Stats & Last Activity Mini View */}
				{ws.status === "Running" && (stats || lastActivity) && (
					<div className="mt-2 mb-3 bg-[var(--sunken)] p-3 rounded-xl border border-[var(--line)] text-[11px] space-y-1.5">
						<div className="flex justify-between items-center text-[9px] uppercase font-bold text-[var(--ink-3)] tracking-wider">
							<span className="flex items-center gap-1">Metrics</span>
							{lastActivity && <span className="font-mono text-[var(--ink-3)]">Active: {formatRelativeTime(lastActivity)}</span>}
						</div>
						{stats && Object.keys(stats).length > 0 && (
							<div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[var(--ink-2)] pt-1 border-t border-[var(--line)] border-dashed">
								{Object.entries(stats).map(([k, v]) => (
									<div key={k} className="flex justify-between min-w-0">
										<span className="text-[var(--ink-3)] truncate mr-1">{k}:</span>
										<span className="font-bold truncate">{String(v)}</span>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Endpoint apis badges list */}
				{ws.apis && ws.apis.length > 0 && (
					<div className="flex flex-wrap gap-1 mt-1 border-t border-[var(--line)] pt-2.5">
						{ws.apis.slice(0, 4).map((api) => {
							const methodText = api.method ? api.method.split(",")[0].toUpperCase() : "GET";
							let methodStyle = "bg-neutral-500/15 text-neutral-500";
							if (methodText === "GET") methodStyle = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
							else if (methodText === "POST") methodStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
							else if (methodText === "WS" || methodText === "WEBSOCKET") methodStyle = "bg-purple-500/10 text-purple-600 dark:text-purple-400";
							return (
								<span key={api.name} className={`px-1 py-0.5 text-[8px] font-bold rounded-md uppercase font-mono tracking-wide ${methodStyle}`} title={`${methodText}: ${api.path}`}>
									{api.name}
								</span>
							);
						})}
						{ws.apis.length > 4 && <span className="text-[8px] text-[var(--ink-3)] font-mono self-center">+{ws.apis.length - 4}</span>}
					</div>
				)}
			</div>

			{/* Action Area */}
			<div className="border-t border-[var(--line)] pt-3.5 mt-3 space-y-3">
				{/* Primary Prominent Action */}
				{ws.status === "Running" ? (
					<a 
						href={openUrl} 
						target="_blank" 
						rel="noopener noreferrer" 
						className="w-full btn bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer border-0"
					>
						<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
						Open Workspace Tab
					</a>
				) : ws.status === "Pending" ? (
					<button 
						disabled
						className="w-full btn bg-amber-500/10 border border-amber-500/20 text-amber-500 font-extrabold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 opacity-80"
					>
						<I.refresh className="w-3.5 h-3.5 animate-spin" />
						Starting Workspace...
					</button>
				) : (
					<div className="w-full py-2 bg-[var(--sunken)] rounded-xl border border-[var(--line)] text-center text-xs text-[var(--ink-3)] font-semibold font-mono uppercase tracking-wide">
						Status: {ws.status}
					</div>
				)}

				{/* Secondary Actions Row */}
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex gap-1.5">
						<button 
							className="btn btn-ghost px-2.5 py-1 text-[11px] font-bold text-[var(--ink-2)] hover:text-[var(--ink)] flex items-center gap-1" 
							onClick={onOpenDetails}
							title="Console details, specs, events, logs, and APIs"
						>
							<I.terminal className="w-3.5 h-3.5" />
							Details
						</button>

						{ws.status === "Running" && (ws.previewPath || ws.workspacePath) && (
							<button 
								className="btn btn-ghost px-2.5 py-1 text-[11px] font-bold text-[var(--ink-2)] hover:text-[var(--ink)] flex items-center gap-1" 
								onClick={() => onShowPreview(ws.previewPath || ws.workspacePath || "/", ws.previewType || ws.workspaceType || "html")}
							>
								<I.eye className="w-3.5 h-3.5" />
								Preview
							</button>
						)}

						{ws.isOutdated && (
							<button 
								className="btn btn-ghost text-amber-600 hover:bg-amber-500/10 px-2 py-1 text-[10px] font-bold flex items-center gap-1" 
								onClick={onUpgrade}
							>
								<I.refresh className="w-3 h-3" />
								Upgrade
							</button>
						)}
					</div>

					<div className="flex">
						{ws.status === "Running" && (
							<button 
								className="btn btn-ghost text-red-500 hover:bg-red-500/10 px-2.5 py-1 text-[11px] font-bold flex items-center gap-1" 
								onClick={onStop}
							>
								<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
								</svg>
								Stop
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);

	if (layoutMode === "list") {
		return (
			<div className="card card-ws-hover p-4 select-text">
				{cardContent}
			</div>
		);
	}

	return (
		<div className="card card-ws-hover p-5 flex flex-col justify-between select-text h-full min-h-[220px]">
			{cardContent}
		</div>
	);
}

// Workspace console detailed split pane component
interface WorkspaceConsoleViewProps {
	workspaceId: string;
	namespace: string;
	activeToken: string;
	onBack: () => void;
	refreshAll: () => void;
}

function WorkspaceConsoleView({
	workspaceId,
	namespace,
	activeToken,
	onBack,
	refreshAll,
}: WorkspaceConsoleViewProps) {
	const [ws, setWs] = useState<Workspace | null>(null);
	const [activeLogs, setActiveLogs] = useState("");
	const [activeEvents, setActiveEvents] = useState("");
	const [activeTab, setActiveTab] = useState<"terminal" | "preview" | "logs" | "yaml" | "apis">("terminal");
	const [logsInterval, setLogsInterval] = useState<any>(null);

	const tokenQuery = activeToken ? `?token=${encodeURIComponent(activeToken)}` : "";

	const loadDetails = async () => {
		try {
			const res = await app.callServerTool({
				name: "get_workspace",
				arguments: { id: workspaceId, namespace, jwtPayload: activeToken ? decodeJwt(activeToken) : undefined },
			});
			if (res && !res.isError && res.structuredContent) {
				setWs(res.structuredContent as any);
			}
		} catch (_) {}
	};

	const fetchLogsAndEvents = async () => {
		if (!ws) return;
		try {
			// Fetch events
			const evRes = await app.callServerTool({
				name: "get_workspace_events",
				arguments: { id: ws.id, namespace, jwtPayload: activeToken ? decodeJwt(activeToken) : undefined },
			});
			if (evRes && !evRes.isError && evRes.structuredContent) {
				const events = (evRes.structuredContent as any).events || [];
				setActiveEvents(
					events
						.map((ev: any) => `[${ev.lastTimestamp || ev.firstTimestamp}] ${ev.type} - ${ev.reason}: ${ev.message}`)
						.join("\n"),
				);
			}

			// Fetch logs
			if (ws.podName) {
				const logRes = await app.callServerTool({
					name: "get_pod_logs",
					arguments: { name: ws.podName, namespace, jwtPayload: activeToken ? decodeJwt(activeToken) : undefined },
				});
				if (logRes && !logRes.isError && logRes.structuredContent) {
					setActiveLogs((logRes.structuredContent as any).logs || "");
				}
			}
		} catch (_) {}
	};

	useEffect(() => {
		void loadDetails();
	}, [workspaceId]);

	useEffect(() => {
		if (ws) {
			void fetchLogsAndEvents();
			const interval = setInterval(() => {
				void fetchLogsAndEvents();
			}, 5000);
			setLogsInterval(interval);
			return () => clearInterval(interval);
		}
	}, [ws]);

	if (!ws) {
		return <div className="py-12 text-center text-[var(--ink-3)] font-mono">Loading details console...</div>;
	}

	const pathPart = ws.workspacePath || ws.previewPath || "/";
	const cleanPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
	
	// Routed URL targets
	const workspaceUrl = `${basePath}/route/${ws.id}${cleanPath}${tokenQuery}`;
	// Terminal routed path (if terminal template runs ttyd on preview/workspace port or api endpoints)
	const terminalUrl = `${basePath}/route/${ws.id}/terminal/${tokenQuery}`;

	return (
		<div className="mt-6 flex flex-col gap-6 animate-fadeUp select-text">
			{/* Sub-header navigation row */}
			<div className="flex items-center justify-between">
				<button className="btn btn-ghost py-1 text-xs" onClick={onBack}>
					<I.back className="w-3.5 h-3.5 mr-1" /> Back to Sandboxes
				</button>
				<h2 className="text-sm font-bold font-mono text-[var(--ink-2)] truncate">Console: {ws.id}</h2>
			</div>

			{/* Left info specs + events / Right interactive split panel */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
				
				{/* Left Config Details & Events */}
				<div className="lg:col-span-4 flex flex-col gap-6">
					
					{/* Specs Card */}
					<div className="card p-5 space-y-4">
						<div className="border-b border-[var(--line)] pb-3">
							<h3 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">Sandbox Specifications</h3>
							{ws.name && <p className="text-sm font-extrabold text-[var(--ink)] mt-1">{ws.name}</p>}
						</div>
						
						<div className="space-y-3.5 text-xs text-[var(--ink-2)] font-medium">
							<div className="flex justify-between gap-2">
								<span className="text-[var(--ink-3)] font-bold">Status:</span>
								<span className="font-mono text-emerald-500">{ws.status}</span>
							</div>
							{ws.templateRef && (
								<div className="flex justify-between gap-2">
									<span className="text-[var(--ink-3)] font-bold">Template:</span>
									<span className="font-mono">{ws.templateRef}</span>
								</div>
							)}
							{ws.podIP && (
								<div className="flex justify-between gap-2">
									<span className="text-[var(--ink-3)] font-bold">Pod IP:</span>
									<span className="font-mono">{ws.podIP}</span>
								</div>
							)}
							{ws.port && (
								<div className="flex justify-between gap-2">
									<span className="text-[var(--ink-3)] font-bold">Target Port:</span>
									<span className="font-mono">{ws.port}</span>
								</div>
							)}
							{ws.userSub && (
								<div className="flex justify-between gap-2">
									<span className="text-[var(--ink-3)] font-bold">Owner:</span>
									<span className="font-mono">{ws.userSub}</span>
								</div>
							)}
						</div>
					</div>

					{/* Events Panel */}
					<div className="card p-5 flex-1 flex flex-col min-h-[300px]">
						<h3 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider mb-2.5 pb-2 border-b border-[var(--line)]">System K8s Events</h3>
						<pre className="flex-1 text-[10px] font-mono text-[var(--ink-2)] bg-[var(--sunken)] p-3 rounded-lg overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
							{activeEvents || "No events recorded."}
						</pre>
					</div>

				</div>

				{/* Right terminal / preview frame container */}
				<div className="lg:col-span-8 card overflow-hidden flex flex-col min-h-[550px] bg-[var(--sunken)]">
					{/* Tab switcher row */}
					<div className="bg-[var(--surface)] border-b border-[var(--line)] px-4 py-2 flex items-center justify-between">
						<div className="flex gap-2">
							<button
								onClick={() => setActiveTab("terminal")}
								className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "terminal" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
							>
								Interactive Terminal
							</button>
							<button
								onClick={() => setActiveTab("preview")}
								className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "preview" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
							>
								Web Preview
							</button>
							<button
								onClick={() => setActiveTab("logs")}
								className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "logs" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
							>
								Console stdout
							</button>
							<button
								onClick={() => setActiveTab("yaml")}
								className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "yaml" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
							>
								Pod YAML
							</button>
							<button
								onClick={() => setActiveTab("apis")}
								className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${activeTab === "apis" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
							>
								APIs
							</button>
						</div>
						
						{["terminal", "preview"].includes(activeTab) && (
							<a href={activeTab === "terminal" ? terminalUrl : workspaceUrl} target="_blank" className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1" rel="noreferrer">
								Launch Independent Tab <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
							</a>
						)}
					</div>

					{/* Tab frame display */}
					<div className="flex-1 bg-[var(--sunken)] relative min-h-[480px]">
						{activeTab === "terminal" && (
							<iframe
								src={terminalUrl}
								className="w-full h-full border-none absolute inset-0 bg-[#1e1e1e]"
								sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
								title="Interactive container terminal shell"
							/>
						)}

						{activeTab === "preview" && (
							<iframe
								src={workspaceUrl}
								className="w-full h-full border-none absolute inset-0 bg-white"
								sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
								title="Workspace active environment preview"
							/>
						)}

						{activeTab === "logs" && (
							<pre className="absolute inset-0 p-5 font-mono text-xs text-neutral-300 bg-neutral-900 overflow-y-auto select-text leading-relaxed">
								{activeLogs || "No logs generated by container output."}
							</pre>
						)}

						{activeTab === "yaml" && (
							<div className="absolute inset-0 p-5 overflow-y-auto bg-neutral-950 font-mono text-[11px] text-neutral-300 select-text leading-relaxed">
								<div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-800">
									<span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Kubernetes Pod YAML Manifest</span>
									<button 
										onClick={() => {
											navigator.clipboard.writeText(jsonToYaml(ws.pod || ws).trim());
										}}
										className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
									>
										Copy YAML
									</button>
								</div>
								<pre className="whitespace-pre overflow-x-auto leading-relaxed">{jsonToYaml(ws.pod || ws).trim()}</pre>
							</div>
						)}

						{activeTab === "apis" && (
							<div className="absolute inset-0 p-6 overflow-y-auto bg-[var(--sunken)] select-text">
								<div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--line)]">
									<h4 className="text-xs font-bold text-[var(--ink-2)] uppercase tracking-wider">Exposed Workspace APIs</h4>
									<span className="text-[10px] font-mono text-[var(--ink-3)] font-medium">Parsed from nogoo9/api annotations</span>
								</div>
								
								{ws.apis && ws.apis.length > 0 ? (
									<div className="overflow-x-auto">
										<table className="w-full text-left border-collapse text-xs">
											<thead>
												<tr className="border-b border-[var(--line)] text-[10px] uppercase tracking-wider text-[var(--ink-3)] font-bold">
													<th className="py-2 px-3 font-semibold">Name</th>
													<th className="py-2 px-3 font-semibold">Method</th>
													<th className="py-2 px-3 font-semibold">Path</th>
													<th className="py-2 px-3 font-semibold">Description</th>
													<th className="py-2 px-3 font-semibold text-right">Actions</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[var(--line)] text-[var(--ink-2)] font-medium">
												{ws.apis.map((api) => {
													const isGet = !api.method || api.method.split(",").map(m => m.trim().toUpperCase()).includes("GET");
													const apiLink = `${basePath}/route/${ws.id}${api.path}${tokenQuery}`;
													
													const methodText = api.method ? api.method.toUpperCase() : "GET";
													let methodStyle = "bg-neutral-500/10 text-neutral-500 border-neutral-500/20";
													if (methodText.includes("GET")) methodStyle = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
													else if (methodText.includes("POST")) methodStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
													else if (methodText.includes("WS") || methodText.includes("WEBSOCKET")) methodStyle = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";

													return (
														<tr key={api.name} className="hover:bg-[var(--surface)] transition-colors">
															<td className="py-3 px-3 font-bold font-mono text-[var(--ink)]">{api.name}</td>
															<td className="py-3 px-3">
																<span className={`px-2 py-0.5 rounded border text-[9px] font-bold font-mono tracking-wider ${methodStyle}`}>
																	{methodText}
																</span>
															</td>
															<td className="py-3 px-3 font-mono text-[var(--ink-2)]">{api.path}</td>
															<td className="py-3 px-3 text-[var(--ink-2)] font-medium max-w-[200px] truncate" title={api.desc}>{api.desc || "-"}</td>
															<td className="py-3 px-3 text-right">
																{isGet ? (
																	<a 
																		href={apiLink} 
																		target="_blank" 
																		rel="noopener noreferrer"
																		className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md transition-colors shadow-sm"
																	>
																		Call GET <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
																	</a>
																) : (
																	<span className="text-[10px] text-[var(--ink-3)] italic font-medium">Non-GET Endpoint</span>
																)}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								) : (
									<div className="py-8 text-center text-[var(--ink-3)] font-mono italic">
										No dynamic API endpoints exposed by this workspace.
									</div>
								)}
							</div>
						)}
					</div>
				</div>

			</div>
		</div>
	);
}

// Token settings modal form subcomponent
interface TokenSettingsModalProps {
	activeToken: string;
	onSave: (token: string) => void;
	onClear: () => void;
	onClose: () => void;
}

function TokenSettingsModal({ activeToken, onSave, onClear, onClose }: TokenSettingsModalProps) {
	const [tokenInput, setTokenInput] = useState(activeToken);

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">Authentication Token Settings</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">Configure your manual JWT token overrides.</p>
					</div>
					<button className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]" onClick={onClose}>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onSave(tokenInput.trim());
					}}
					className="p-6 space-y-4"
				>
					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">JWT Token Value</label>
						<textarea
							value={tokenInput}
							onChange={(e) => setTokenInput(e.target.value)}
							rows={5}
							required
							className="theme-text-input w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none resize-none"
							placeholder="Paste your base64 OIDC JWT token payload..."
						/>
					</div>
					<div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3">
						<button type="button" className="btn btn-ghost text-xs" onClick={onClear}>Clear Token</button>
						<button type="submit" className="btn btn-primary text-xs">Save Settings</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// Spawn Modal with parameter configuration fields
interface SpawnWorkspaceModalProps {
	template: Template;
	isAdmin: boolean;
	existingWorkspaces: Workspace[];
	onSpawn: (id: string, name: string, userSub: string, contextVars: Record<string, string>) => void;
	onClose: () => void;
}

function SpawnWorkspaceModal({ template, isAdmin, existingWorkspaces, onSpawn, onClose }: SpawnWorkspaceModalProps) {
	const [workspaceId, setWorkspaceId] = useState("");
	const [workspaceName, setWorkspaceName] = useState("");
	const [targetUser, setTargetUser] = useState("");
	const [contextVars, setContextVars] = useState<Record<string, string>>({});

	useEffect(() => {
		const prefix = template.name.toLowerCase().replace(/[^a-z0-9-]/g, "");
		let uniqueId = "";
		let isUnique = false;
		let attempts = 0;
		while (!isUnique && attempts < 100) {
			const randomSuffix = generateRandomString(6).toLowerCase();
			uniqueId = `${prefix}-${randomSuffix}`;
			isUnique = !existingWorkspaces.some((ws) => ws.id === uniqueId);
			attempts++;
		}
		setWorkspaceId(uniqueId);
		setWorkspaceName(`${template.name.charAt(0).toUpperCase() + template.name.slice(1)} Workspace`);

		if (template.requiredContext && template.requiredContext.length > 0) {
			const initialVars: Record<string, string> = {};
			for (const key of template.requiredContext) {
				initialVars[key] = "";
			}
			setContextVars(initialVars);
		} else {
			setContextVars({});
		}
	}, [template, existingWorkspaces]);

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">Spawn Workspace Sandbox</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">Template environment: <span className="font-mono text-[var(--accent)]">{template.name}</span></p>
					</div>
					<button className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]" onClick={onClose}>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onSpawn(workspaceId.trim(), workspaceName.trim(), targetUser.trim(), contextVars);
					}}
					className="p-6 space-y-4"
				>
					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">Workspace ID (Unique identifier for routed path)</label>
						<input
							type="text"
							value={workspaceId}
							onChange={(e) => setWorkspaceId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
							required
							className="theme-text-input w-full px-4 py-2.5 text-sm font-mono"
							placeholder="e.g. dev-sandbox-1"
						/>
					</div>

					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">Workspace Display Name (Optional)</label>
						<input
							type="text"
							value={workspaceName}
							onChange={(e) => setWorkspaceName(e.target.value)}
							className="theme-text-input w-full px-4 py-2.5 text-sm"
							placeholder="e.g. Main Node project"
						/>
					</div>

					{isAdmin && (
						<div>
							<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">Target Owner User ID (Admin Only)</label>
							<input
								type="text"
								value={targetUser}
								onChange={(e) => setTargetUser(e.target.value)}
								className="theme-text-input w-full px-4 py-2.5 text-sm font-mono"
								placeholder="e.g. readuser (defaults to self)"
							/>
						</div>
					)}

					{template.requiredContext && template.requiredContext.length > 0 && (
						<div className="space-y-3 mt-4 pt-3 border-t border-[var(--line)]">
							<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Required Context Variables</label>
							{template.requiredContext.map((key) => (
								<div key={key}>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">{key}</label>
									<input
										type="text"
										value={contextVars[key] || ""}
										onChange={(e) => setContextVars((prev) => ({ ...prev, [key]: e.target.value }))}
										required
										className="theme-text-input w-full px-3 py-2 text-xs font-mono"
										placeholder={`Enter value for ${key}`}
									/>
								</div>
							))}
						</div>
					)}

					<div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3">
						<button type="button" className="btn btn-ghost text-xs" onClick={onClose}>Cancel</button>
						<button type="submit" className="btn btn-primary text-xs">Spawn Sandbox</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// Create Template Modal Spec registration component
interface CreateTemplateModalProps {
	onSave: (name: string, desc: string, tag: string, specString: string, advData: any) => void;
	onClose: () => void;
}

function CreateTemplateModal({ onSave, onClose }: CreateTemplateModalProps) {
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");
	const [tag, setTag] = useState("");
	const [specString, setSpecString] = useState(
		JSON.stringify(
			{
				containers: [
					{
						name: "workspace",
						image: "oven/bun:1-alpine",
						command: ["sleep", "infinity"],
					},
				],
			},
			null,
			2,
		),
	);

	// Advanced annotations states
	const [context, setContext] = useState("");
	const [port, setPort] = useState("");
	const [previewPath, setPreviewPath] = useState("/");
	const [previewType, setPreviewType] = useState("html");
	const [gracePeriod, setGracePeriod] = useState("");
	const [initImage, setInitImage] = useState("");
	const [initCmd, setInitCmd] = useState("");
	const [prestopCmd, setPrestopCmd] = useState("");
	const [prestopSidecar, setPrestopSidecar] = useState("");

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">Register Pod Template Spec</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">Create a new reusable sandbox pod ConfigMap template.</p>
					</div>
					<button className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]" onClick={onClose}>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onSave(name.trim(), desc.trim(), tag.trim(), specString, {
							context,
							port,
							previewPath,
							previewType,
							gracePeriod,
							initImage,
							initCmd,
							prestopCmd,
							prestopSidecar,
						});
					}}
					className="p-6 space-y-4 overflow-y-auto flex-1 max-h-[70vh] select-text"
				>
					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">Template Name</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
							required
							className="theme-text-input w-full px-4 py-2 text-xs font-mono"
							placeholder="e.g. custom-bun-environment"
						/>
					</div>

					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">Description</label>
						<input
							type="text"
							value={desc}
							onChange={(e) => setDesc(e.target.value)}
							className="theme-text-input w-full px-4 py-2 text-xs"
							placeholder="Brief description of the development workspace"
						/>
					</div>

					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">Tag</label>
						<input
							type="text"
							value={tag}
							onChange={(e) => setTag(e.target.value)}
							className="theme-text-input w-full px-4 py-2 text-xs"
							placeholder="e.g. testing, dev (default)"
						/>
					</div>

					<div>
						<label className="block text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">Pod Spec (JSON)</label>
						<textarea
							value={specString}
							onChange={(e) => setSpecString(e.target.value)}
							rows={6}
							required
							className="theme-text-input w-full rounded-xl px-4 py-2 text-xs font-mono outline-none resize-y"
							placeholder="Paste JSON Pod spec..."
						/>
					</div>

					{/* Advanced annotations collapsible details view */}
					<details className="border border-[var(--line)] rounded-xl overflow-hidden">
						<summary className="list-none flex items-center justify-between p-4 cursor-pointer select-none font-bold text-[11px] text-[var(--ink)] uppercase tracking-wider bg-[var(--surface)]">
							<span>Advanced Annotations & Hooks</span>
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
							</svg>
						</summary>
						<div className="p-4 border-t border-[var(--line)] space-y-4 bg-[var(--sunken)] text-left">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">Required Context</label>
									<input type="text" value={context} onChange={(e) => setContext(e.target.value)} className="theme-text-input w-full px-3 py-2 text-xs" placeholder="e.g. S3_BUCKET,AWS_ACCESS_KEY" />
								</div>
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">Workspace Port</label>
									<input type="number" value={port} onChange={(e) => setPort(e.target.value)} className="theme-text-input w-full px-3 py-2 text-xs" placeholder="e.g. 3000" />
								</div>
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">Preview Path</label>
									<input type="text" value={previewPath} onChange={(e) => setPreviewPath(e.target.value)} className="theme-text-input w-full px-3 py-2 text-xs" placeholder="e.g. /" />
								</div>
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">Preview Type</label>
									<select value={previewType} onChange={(e) => setPreviewType(e.target.value)} className="theme-text-input w-full px-3 py-2 text-xs bg-transparent">
										<option value="html">HTML</option>
										<option value="markdown">Markdown</option>
									</select>
								</div>
								<div>
									<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">Grace Period (Seconds)</label>
									<input type="number" value={gracePeriod} onChange={(e) => setGracePeriod(e.target.value)} className="theme-text-input w-full px-3 py-2 text-xs" placeholder="e.g. 30" />
								</div>
							</div>

							<div className="border-t border-[var(--line)] pt-3">
								<h5 className="text-[11px] font-bold text-[var(--ink)] uppercase tracking-wider mb-2">Init Container Sync Hook</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">Init Container Image</label>
										<input type="text" value={initImage} onChange={(e) => setInitImage(e.target.value)} className="theme-text-input w-full px-3 py-2 text-xs" placeholder="e.g. alpine:latest" />
									</div>
									<div>
										<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">Init Container Sync Command</label>
										<input type="text" value={initCmd} onChange={(e) => setInitCmd(e.target.value)} className="theme-text-input w-full px-3 py-2 text-xs font-mono" placeholder="e.g. aws s3 sync" />
									</div>
								</div>
							</div>

							<div className="border-t border-[var(--line)] pt-3">
								<h5 className="text-[11px] font-bold text-[var(--ink)] uppercase tracking-wider mb-2">Pre-Stop Lifecycle Sync Hook</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">Pre-Stop Command</label>
										<input type="text" value={prestopCmd} onChange={(e) => setPrestopCmd(e.target.value)} className="theme-text-input w-full px-3 py-2 text-xs font-mono" placeholder="e.g. run sync back script" />
									</div>
									<div>
										<label className="block text-[10px] font-bold text-[var(--ink-2)] mb-1">Pre-Stop Sidecar Image</label>
										<input type="text" value={prestopSidecar} onChange={(e) => setPrestopSidecar(e.target.value)} className="theme-text-input w-full px-3 py-2 text-xs" placeholder="e.g. aws-cli image" />
									</div>
								</div>
							</div>
						</div>
					</details>

					<div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3 shrink-0">
						<button type="button" className="btn btn-ghost text-xs" onClick={onClose}>Cancel</button>
						<button type="submit" className="btn btn-primary text-xs">Register Template</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// Reconstruct JSON objects into clean YAML string representation without heavy external libraries.
function jsonToYaml(val: any, indent = 0): string {
	const spaces = " ".repeat(indent);
	if (val === null || val === undefined) return "null\n";
	if (typeof val !== "object") {
		if (typeof val === "string") {
			if (val.includes("\n")) {
				const lines = val.split("\n");
				if (lines.length > 1 && lines[lines.length - 1] === "") {
					lines.pop();
				}
				const linesStr = lines.map(l => " ".repeat(indent + 2) + l).join("\n");
				return `|\n${linesStr}\n`;
			}
			if (/^[0-9]+$/.test(val) || /^(true|false|null)$/i.test(val) || /[:#{}[\]&*?|<>=!%@`]/.test(val)) {
				return `"${val.replace(/"/g, '\\"')}"\n`;
			}
			return `${val}\n`;
		}
		return `${val}\n`;
	}
	if (Array.isArray(val)) {
		if (val.length === 0) return "[]\n";
		let res = "\n";
		for (const item of val) {
			const itemStr = jsonToYaml(item, indent + 2).trimStart();
			res += `${spaces}- ${itemStr}`;
		}
		return res;
	}
	const keys = Object.keys(val);
	if (keys.length === 0) return "{}\n";
	let res = "";
	for (const key of keys) {
		const v = val[key];
		if (v === undefined) continue;
		const valStr = jsonToYaml(v, indent + 2);
		if (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length > 0) {
			res += `${spaces}${key}:\n${valStr}`;
		} else if (Array.isArray(v) && v.length > 0) {
			res += `${spaces}${key}:${valStr}`;
		} else {
			res += `${spaces}${key}: ${valStr.trimStart()}`;
		}
	}
	return res;
}

// Template spec details view modal
interface TemplateSpecModalProps {
	template: Template;
	namespace: string;
	onClose: () => void;
}

function TemplateSpecModal({ template, namespace, onClose }: TemplateSpecModalProps) {
	const [specJson, setSpecJson] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"details" | "yaml" | "spec">("details");

	useEffect(() => {
		const loadSpec = async () => {
			try {
				setLoading(true);
				const res = await app.callServerTool({
					name: "get_template",
					arguments: { name: template.name, namespace },
				});
				if (res && !res.isError && res.structuredContent) {
					setSpecJson(res.structuredContent);
				}
			} catch (_) {} finally {
				setLoading(false);
			}
		};
		void loadSpec();
	}, [template]);

	let nogooAnnotations: Record<string, string> = {};
	let otherAnnotations: Record<string, string> = {};
	let nogooLabels: Record<string, string> = {};
	let otherLabels: Record<string, string> = {};

	if (specJson) {
		const annotations = specJson.annotations || {};
		for (const [k, v] of Object.entries(annotations)) {
			if (k.startsWith("nogoo9/") || k.includes("nogoo9")) {
				nogooAnnotations[k] = String(v);
			} else {
				otherAnnotations[k] = String(v);
			}
		}

		const labels = specJson.labels || {};
		for (const [k, v] of Object.entries(labels)) {
			if (k.startsWith("nogoo9/") || k.includes("nogoo9")) {
				nogooLabels[k] = String(v);
			} else {
				otherLabels[k] = String(v);
			}
		}
	}

	let yamlContent = "";
	if (specJson) {
		const configMapObject = {
			apiVersion: "v1",
			kind: "ConfigMap",
			metadata: {
				name: specJson.name || template.name,
				namespace: specJson.namespace || namespace,
				labels: specJson.labels || {},
				annotations: specJson.annotations || {},
			},
			data: {
				spec: JSON.stringify(specJson.spec || {}, null, 2),
			},
		};
		yamlContent = jsonToYaml(configMapObject).trim();
	}

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-base font-extrabold text-[var(--ink)]">Template Specification</h3>
							{specJson?.version && (
								<span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] rounded-full border border-[var(--line)]">
									v{specJson.version}
								</span>
							)}
						</div>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">ConfigMap reference: <span className="font-mono text-[var(--accent)]">{template.name}</span></p>
					</div>
					<button className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]" onClick={onClose}>
						<I.cross className="w-5 h-5" />
					</button>
				</div>

				{!loading && specJson && (
					<div className="px-6 py-2.5 bg-[var(--sunken)] border-b border-[var(--line)] flex items-center shrink-0">
						<div className="flex gap-1 bg-[var(--card)] p-1 rounded-xl border border-[var(--line)]">
							<button
								onClick={() => setActiveTab("details")}
								className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "details" ? "bg-[var(--sunken)] text-[var(--ink)] shadow-sm border border-[var(--line)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] border border-transparent"}`}
							>
								Structured Details
							</button>
							<button
								onClick={() => setActiveTab("yaml")}
								className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "yaml" ? "bg-[var(--sunken)] text-[var(--ink)] shadow-sm border border-[var(--line)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] border border-transparent"}`}
							>
								ConfigMap YAML
							</button>
							<button
								onClick={() => setActiveTab("spec")}
								className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "spec" ? "bg-[var(--sunken)] text-[var(--ink)] shadow-sm border border-[var(--line)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] border border-transparent"}`}
							>
								Pod Spec JSON
							</button>
						</div>
					</div>
				)}

				<div className="p-6 overflow-y-auto flex-1 select-text text-left space-y-6">
					{loading ? (
						<div className="text-xs text-[var(--ink-3)] font-mono flex items-center gap-2">
							<I.refresh className="w-4 h-4 animate-spin text-[var(--accent)]" />
							Loading template specification...
						</div>
					) : specJson ? (
						<>
							{activeTab === "details" && (
								<>
									{/* Description */}
									{specJson.description && (
										<div className="space-y-1 bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)]">
											<h4 className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Description</h4>
											<p className="text-xs text-[var(--ink-2)] font-medium leading-relaxed">{specJson.description}</p>
										</div>
									)}

									{/* nogoo9 Labels */}
									<div className="space-y-2.5">
										<h4 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
											<I.settings className="w-3.5 h-3.5" /> nogoo9 Labels
										</h4>
										{Object.keys(nogooLabels).length > 0 ? (
											<div className="bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)] text-xs font-mono space-y-2 max-h-[160px] overflow-y-auto">
												{Object.entries(nogooLabels).map(([k, v]) => (
													<div key={k} className="flex flex-col gap-0.5 pb-1.5 border-b border-[var(--line)] last:border-0 last:pb-0">
														<span className="text-[9px] text-[var(--ink-3)] break-all">{k}</span>
														<span className="text-[var(--ink-2)] font-semibold break-all">{String(v)}</span>
													</div>
												))}
											</div>
										) : (
											<div className="text-xs text-[var(--ink-3)] italic">No nogoo9 labels defined</div>
										)}
									</div>

									{/* nogoo9 Annotations */}
									<div className="space-y-2.5">
										<h4 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
											<I.settings className="w-3.5 h-3.5" /> nogoo9 Annotations
										</h4>
										{Object.keys(nogooAnnotations).length > 0 ? (
											<div className="bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)] text-xs font-mono space-y-2 max-h-[160px] overflow-y-auto">
												{Object.entries(nogooAnnotations).map(([k, v]) => (
													<div key={k} className="flex flex-col gap-0.5 pb-1.5 border-b border-[var(--line)] last:border-0 last:pb-0">
														<span className="text-[9px] text-[var(--ink-3)] break-all">{k}</span>
														<span className="text-[var(--ink-2)] font-semibold break-all">{String(v)}</span>
													</div>
												))}
											</div>
										) : (
											<div className="text-xs text-[var(--ink-3)] italic">No nogoo9 annotations defined</div>
										)}
									</div>

									{/* Kubernetes System Labels */}
									<div className="space-y-2.5">
										<h4 className="text-xs font-extrabold text-[var(--ink-3)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
											<I.info className="w-3.5 h-3.5" /> Kubernetes System Labels
										</h4>
										{Object.keys(otherLabels).length > 0 ? (
											<div className="bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)] text-xs font-mono space-y-2 max-h-[160px] overflow-y-auto">
												{Object.entries(otherLabels).map(([k, v]) => (
													<div key={k} className="flex flex-col gap-0.5 pb-1.5 border-b border-[var(--line)] last:border-0 last:pb-0">
														<span className="text-[9px] text-[var(--ink-3)] break-all">{k}</span>
														<span className="text-[var(--ink-2)] font-semibold break-all">{String(v)}</span>
													</div>
												))}
											</div>
										) : (
											<div className="text-xs text-[var(--ink-3)] italic">No system labels defined</div>
										)}
									</div>

									{/* Kubernetes System Annotations */}
									<div className="space-y-2.5">
										<h4 className="text-xs font-extrabold text-[var(--ink-3)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
											<I.info className="w-3.5 h-3.5" /> Kubernetes System Annotations
										</h4>
										{Object.keys(otherAnnotations).length > 0 ? (
											<div className="bg-[var(--sunken)] p-4 rounded-xl border border-[var(--line)] text-xs font-mono space-y-2 max-h-[160px] overflow-y-auto">
												{Object.entries(otherAnnotations).map(([k, v]) => (
													<div key={k} className="flex flex-col gap-0.5 pb-1.5 border-b border-[var(--line)] last:border-0 last:pb-0">
														<span className="text-[9px] text-[var(--ink-3)] break-all">{k}</span>
														<span className="text-[var(--ink-2)] font-semibold break-all">{String(v)}</span>
													</div>
												))}
											</div>
										) : (
											<div className="text-xs text-[var(--ink-3)] italic">No system annotations defined</div>
										)}
									</div>
								</>
							)}

							{activeTab === "yaml" && (
								<div className="space-y-2.5">
									<h4 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5 flex items-center gap-1.5">
										<I.settings className="w-3.5 h-3.5" /> ConfigMap YAML Manifest
									</h4>
									<pre className="p-4 bg-[var(--sunken)] rounded-xl font-mono text-[11px] overflow-x-auto text-[var(--ink)] border border-[var(--line)] select-text leading-relaxed max-h-[420px]">
										{yamlContent}
									</pre>
								</div>
							)}

							{activeTab === "spec" && (specJson.spec || specJson.podSpec) && (
								<div className="space-y-2.5">
									<h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider border-b border-[var(--line)] pb-1.5">
										Pod Specification Spec (JSON)
									</h4>
									<pre className="p-4 bg-[var(--sunken)] rounded-xl font-mono text-[11px] overflow-x-auto text-[var(--ink)] border border-[var(--line)] select-text leading-relaxed max-h-[420px]">
										{JSON.stringify(specJson.spec || specJson.podSpec, null, 2)}
									</pre>
								</div>
							)}
						</>
					) : (
						<div className="text-xs text-red-500 font-mono">Failed to fetch template spec details.</div>
					)}
				</div>
				<div className="px-6 py-4 border-t border-[var(--line)] flex justify-end shrink-0">
					<button className="btn btn-ghost text-xs" onClick={onClose}>Close</button>
				</div>
			</div>
		</div>
	);
}

// Logs view Modal
interface LogsViewModalProps {
	workspace: Workspace;
	logs: string;
	onRefresh: () => void;
	onClose: () => void;
}

function LogsViewModal({ workspace, logs, onRefresh, onClose }: LogsViewModalProps) {
	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">Container Log Output</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">Pod reference: <span className="font-mono text-[var(--accent)]">{workspace.podName || workspace.id}</span></p>
					</div>
					<button className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]" onClick={onClose}>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<div className="p-6 overflow-y-auto flex-1 select-text text-left">
					<pre className="p-5 font-mono text-xs text-neutral-300 bg-neutral-900 rounded-xl min-h-[350px] overflow-x-auto select-text leading-relaxed">
						{logs}
					</pre>
				</div>
				<div className="px-6 py-4 border-t border-[var(--line)] flex justify-end gap-3 shrink-0">
					<button className="btn btn-ghost text-xs" onClick={onRefresh}>Refresh Logs</button>
					<button className="btn btn-ghost text-xs" onClick={onClose}>Close</button>
				</div>
			</div>
		</div>
	);
}

// Events view Modal
interface EventsViewModalProps {
	workspace: Workspace;
	events: string;
	onRefresh: () => void;
	onClose: () => void;
}

function EventsViewModal({ workspace, events, onRefresh, onClose }: EventsViewModalProps) {
	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">K8s Namespace Lifecycle Events</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">Workspace selector: <span className="font-mono text-[var(--accent)]">{workspace.id}</span></p>
					</div>
					<button className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]" onClick={onClose}>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<div className="p-6 overflow-y-auto flex-1 select-text text-left">
					<pre className="p-5 font-mono text-xs text-[var(--ink-2)] bg-[var(--sunken)] border border-[var(--line)] rounded-xl min-h-[350px] overflow-x-auto select-text leading-relaxed">
						{events}
					</pre>
				</div>
				<div className="px-6 py-4 border-t border-[var(--line)] flex justify-end gap-3 shrink-0">
					<button className="btn btn-ghost text-xs" onClick={onRefresh}>Refresh Events</button>
					<button className="btn btn-ghost text-xs" onClick={onClose}>Close</button>
				</div>
			</div>
		</div>
	);
}

// System Information & Capabilities Metadata Modal
interface SystemInfoModalProps {
	capabilities: {
		enabledTools: string[];
		managedOnly: boolean;
		authEnabled: boolean;
		isAdmin: boolean;
		version?: string;
	};
	namespace: string;
	activeToken: string;
	basePath: string;
	onClose: () => void;
}

function SystemInfoModal({ capabilities, namespace, activeToken, basePath, onClose }: SystemInfoModalProps) {
	const decoded = activeToken ? decodeJwt(activeToken) : null;
	const clientName = "nogoo9-pod-manager";
	const clientVersion = "0.8.1";

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">Model Context Protocol System Metadata</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">Server capabilities and active sandbox configurations.</p>
					</div>
					<button className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]" onClick={onClose}>
						<I.cross className="w-5 h-5" />
					</button>
				</div>
				<div className="p-6 overflow-y-auto flex-1 space-y-6 text-left select-text">
					{/* Core client metadata */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
							<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">UI Client</span>
							<span className="text-sm font-semibold text-[var(--ink)] block">{clientName}</span>
							<span className="text-xs font-mono text-[var(--ink-3)] block mt-0.5">Version: {clientVersion}</span>
						</div>
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
							<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">no-crd Backend</span>
							<span className="text-sm font-semibold text-[var(--ink)] block">@nogoo9/no-crd</span>
							<span className="text-xs font-mono text-[var(--ink-3)] block mt-0.5">Version: {capabilities.version || "0.8.1"}</span>
						</div>
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
							<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">Host base path</span>
							<span className="text-sm font-mono font-semibold text-[var(--ink)] block">{basePath || "/"}</span>
							<span className="text-xs text-[var(--ink-3)] block mt-0.5">Custom subpath routing prefix</span>
						</div>
					</div>

					{/* Capabilities matrix */}
					<div className="space-y-2.5">
						<h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">Features & Access Flags</h4>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							<div className="p-3.5 rounded-lg border border-[var(--line)] text-center">
								<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">Access Mode</span>
								<span className={`px-2 py-0.5 text-[10px] rounded-full font-bold inline-block ${capabilities.isAdmin ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>
									{capabilities.isAdmin ? "ADMIN" : "STANDARD"}
								</span>
							</div>
							<div className="p-3.5 rounded-lg border border-[var(--line)] text-center">
								<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">Auth Gate</span>
								<span className={`px-2 py-0.5 text-[10px] rounded-full font-bold inline-block ${capabilities.authEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-[var(--ink-3)]/10 text-[var(--ink-3)]"}`}>
									{capabilities.authEnabled ? "ACTIVE" : "INACTIVE"}
								</span>
							</div>
							<div className="p-3.5 rounded-lg border border-[var(--line)] text-center">
								<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">Scope Guard</span>
								<span className="px-2 py-0.5 text-[10px] rounded-full font-bold inline-block bg-emerald-500/10 text-emerald-500">
									ENABLED
								</span>
							</div>
							<div className="p-3.5 rounded-lg border border-[var(--line)] text-center">
								<span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-1">Pod Visibility</span>
								<span className="px-2 py-0.5 text-[10px] text-[var(--ink)] bg-[var(--sunken)] border border-[var(--line)] rounded-full font-bold inline-block">
									{capabilities.managedOnly ? "MANAGED ONLY" : "ALL CLUSTER"}
								</span>
							</div>
						</div>
					</div>

					{/* Enabled Tools */}
					<div className="space-y-2.5">
						<h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">Registered MCP Tools ({capabilities.enabledTools.length})</h4>
						<div className="flex flex-wrap gap-2">
							{capabilities.enabledTools.length > 0 ? (
								capabilities.enabledTools.map((tool) => (
									<span key={tool} className="px-2.5 py-1 text-xs font-mono rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)]">
										{tool}
									</span>
								))
							) : (
								<span className="text-xs text-[var(--ink-3)] font-mono">No tools enabled.</span>
							)}
						</div>
					</div>

					{/* Token Decoded claims */}
					<div className="space-y-2.5">
						<h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">User SSO Identity (JWT Claims)</h4>
						{decoded ? (
							<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--sunken)] space-y-3 font-mono text-xs text-[var(--ink-2)]">
								<div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] pb-2">
									<span className="font-bold text-[var(--ink-3)]">Subject (ID):</span>
									<span className="col-span-2 text-[var(--ink)] break-all">{decoded.sub || decoded.custom_user_id || "N/A"}</span>
								</div>
								<div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] pb-2">
									<span className="font-bold text-[var(--ink-3)]">Username:</span>
									<span className="col-span-2 text-[var(--ink)]">{decoded.preferred_username || decoded.name || "N/A"}</span>
								</div>
								<div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] pb-2">
									<span className="font-bold text-[var(--ink-3)]">Roles / Scopes:</span>
									<span className="col-span-2 text-[var(--ink)] whitespace-pre-wrap break-all">
										{JSON.stringify(decoded.custom_roles || decoded.roles || decoded.scope || "N/A")}
									</span>
								</div>
								<div className="grid grid-cols-3 gap-2 pb-1">
									<span className="font-bold text-[var(--ink-3)]">Expiration:</span>
									<span className="col-span-2 text-[var(--ink)]">
										{decoded.exp ? new Date(decoded.exp * 1000).toLocaleString() : "Never"}
									</span>
								</div>
							</div>
						) : (
							<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-center">
								<p className="text-xs text-[var(--ink-3)] font-mono">No active JWT authentication token. Runs in no-auth/unrestricted mode.</p>
							</div>
						)}
					</div>
				</div>
				<div className="px-6 py-4 border-t border-[var(--line)] flex justify-end shrink-0">
					<button className="btn btn-ghost text-xs" onClick={onClose}>Close</button>
				</div>
			</div>
		</div>
	);
}

// Workspace Preview iframe Modal
interface WorkspacePreviewModalProps {
	workspace: Workspace;
	path: string;
	type: string;
	basePath: string;
	activeToken: string;
	onClose: () => void;
}

function WorkspacePreviewModal({ workspace, path, type, basePath, activeToken, onClose }: WorkspacePreviewModalProps) {
	const tokenQuery = activeToken ? `?token=${encodeURIComponent(activeToken)}` : "";
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	const targetUrl = `${basePath}/route/${workspace.id}${cleanPath}${tokenQuery}`;

	return (
		<div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
			<div className="theme-modal bg-[var(--card)] border border-[var(--line)] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-pop">
				<div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h3 className="text-base font-extrabold text-[var(--ink)]">Inline App Preview</h3>
						<p className="text-xs text-[var(--ink-3)] mt-0.5 font-medium">Workspace Sandbox: <span className="font-mono text-[var(--accent)]">{workspace.id}</span></p>
					</div>
					<div className="flex gap-2">
						<a href={targetUrl} target="_blank" className="btn btn-ghost px-2.5 py-1 text-[11px]">
							Open Tab
						</a>
						<button className="btn btn-quiet p-1 rounded-lg text-[var(--ink-3)]" onClick={onClose}>
							<I.cross className="w-5 h-5" />
						</button>
					</div>
				</div>
				<div className="flex-1 bg-[var(--sunken)] relative min-h-[300px]">
					<iframe
						src={targetUrl}
						className="w-full h-full border-none absolute inset-0 bg-white"
						sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
						title={`Preview frame of ${workspace.id}`}
					/>
				</div>
				<div className="px-6 py-4 border-t border-[var(--line)] flex justify-end shrink-0">
					<button className="btn btn-ghost text-xs" onClick={onClose}>Close</button>
				</div>
			</div>
		</div>
	);
}

// persistent tweaks widget panel component
interface TweaksWidgetPanelProps {
	theme: string;
	density: string;
	accent: string;
	open: boolean;
	onThemeChange: (t: string) => void;
	onDensityChange: (d: string) => void;
	onAccentChange: (a: string) => void;
	onClose: () => void;
}

function TweaksWidgetPanel({
	theme,
	density,
	accent,
	open,
	onThemeChange,
	onDensityChange,
	onAccentChange,
	onClose,
}: TweaksWidgetPanelProps) {
	if (!open) return null;

	const accentsList = [
		{ hex: "#c96442", name: "Terracotta" },
		{ hex: "#2a6fdb", name: "Sapphire" },
		{ hex: "#1f8a5b", name: "Emerald" },
		{ hex: "#7a5ae0", name: "Amethyst" },
	];

	return (
		<div className="fixed right-6 bottom-6 z-50 w-72 bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col p-5 space-y-4 animate-pop select-none">
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
				<h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">Visual Customizer</h4>
				<button className="btn btn-quiet p-1 rounded hover:bg-[var(--surface)] text-[var(--ink-3)]" onClick={onClose}>
					<I.cross className="w-4 h-4" />
				</button>
			</div>

			{/* Theme selection toggler */}
			<div className="space-y-1 text-left">
				<label className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Color Theme</label>
				<div className="flex gap-2 bg-[var(--surface)] p-1 rounded-lg">
					<button
						onClick={() => onThemeChange("light")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-md cursor-pointer text-center transition-colors ${theme === "light" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-2)]"}`}
					>
						Light Warm
					</button>
					<button
						onClick={() => onThemeChange("dark")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-md cursor-pointer text-center transition-colors ${theme === "dark" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-2)]"}`}
					>
						Dark Slate
					</button>
				</div>
			</div>

			{/* Density toggler */}
			<div className="space-y-1 text-left">
				<label className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Layout Density</label>
				<div className="flex gap-2 bg-[var(--surface)] p-1 rounded-lg">
					<button
						onClick={() => onDensityChange("comfortable")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-md cursor-pointer text-center transition-colors ${density === "comfortable" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-2)]"}`}
					>
						Comfortable
					</button>
					<button
						onClick={() => onDensityChange("compact")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-md cursor-pointer text-center transition-colors ${density === "compact" ? "bg-[var(--card)] text-[var(--ink)]" : "text-[var(--ink-2)]"}`}
					>
						Compact
					</button>
				</div>
			</div>

			{/* Accent pickers list */}
			<div className="space-y-1.5 text-left">
				<label className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Primary Color Accent</label>
				<div className="flex gap-2.5">
					{accentsList.map((a) => (
						<button
							key={a.hex}
							onClick={() => onAccentChange(a.hex)}
							className={`w-9 h-9 rounded-xl border shadow-xs transition-transform cursor-pointer hover:scale-105 flex items-center justify-center`}
							style={{ backgroundColor: a.hex, borderColor: accent === a.hex ? "var(--ink)" : "rgba(0,0,0,0.1)" }}
							title={a.name}
						>
							{accent === a.hex && (
								<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
								</svg>
							)}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

// Render root mount
const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<Dashboard />);
}
