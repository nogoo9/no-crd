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

export let _fallbackMode = false;
export let httpSessionId: string | null = null;
export let mcpEndpointUrl = `${basePath}/mcp`;
export const mcpVersion = "2024-11-05";
export let lastHttpFallbackError = "";

export async function initHttpFallback(
	activeToken: string,
	onClearToken: () => void,
): Promise<boolean> {
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
			console.warn(
				"Unauthorized initialization call. Clearing expired token...",
			);
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

export async function callServerToolFallback(
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
	if (resultData?.error) {
		return {
			isError: true,
			error: resultData.error.message || String(resultData.error),
		};
	}
	return {
		isError: false,
		...resultData.result,
	};
}
