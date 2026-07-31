const oauthConfig =
	(typeof window !== "undefined" && (window as any).__NOCR_OAUTH_CONFIG__) ||
	{};

export function generateRandomString(length: number): string {
	const charset =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	const values = new Uint8Array(length);
	crypto.getRandomValues(values);
	for (let i = 0; i < length; i++) {
		result += charset[values[i] % charset.length];
	}
	return result;
}

export async function sha256(plain: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return crypto.subtle.digest("SHA-256", data);
}

export function base64urlEncode(a: ArrayBuffer): string {
	const str = String.fromCharCode(...new Uint8Array(a));
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function generateChallenge(verifier: string): Promise<string> {
	const hashed = await sha256(verifier);
	return base64urlEncode(hashed);
}

export function decodeJwt(t: string): any {
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

export function getValueByJsonPath(obj: any, path: string): any {
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

export function isSafeRedirectUri(uri: string | null): boolean {
	if (!uri) return false;
	if (uri.startsWith("/") && !uri.startsWith("//")) return true;
	try {
		const url = new URL(uri, window.location.origin);
		return url.origin === window.location.origin;
	} catch (_) {
		return false;
	}
}

export function checkTemplateAccess(
	tmpl: any,
	activeToken: string,
	isAdmin: boolean,
): { isAllowed: boolean; reason?: string } {
	if (isAdmin) return { isAllowed: true };
	const allowedRoles: string[] = tmpl.allowedRoles || [];
	const allowedScopes: string[] = tmpl.allowedScopes || [];
	if (allowedRoles.length === 0 && allowedScopes.length === 0) {
		return { isAllowed: true };
	}

	const payload = activeToken ? decodeJwt(activeToken) : null;

	let userRoles: string[] = [];
	if (payload) {
		const rolesConfigPath = oauthConfig.rolesJsonPath;
		if (rolesConfigPath) {
			const val = getValueByJsonPath(payload, rolesConfigPath);
			if (Array.isArray(val)) userRoles = val.map(String);
			else if (typeof val === "string") userRoles = [val];
		} else {
			if (Array.isArray(payload.roles)) userRoles = payload.roles.map(String);
			else if (
				payload.realm_access?.roles &&
				Array.isArray(payload.realm_access.roles)
			) {
				userRoles = payload.realm_access.roles.map(String);
			}
		}
	}

	let userScopes: string[] = [];
	if (payload) {
		const scopeConfigPath = oauthConfig.scopeJsonPath;
		if (scopeConfigPath) {
			const val = getValueByJsonPath(payload, scopeConfigPath);
			if (Array.isArray(val)) userScopes = val.map(String);
			else if (typeof val === "string") userScopes = val.split(/\s+/);
		} else {
			if (typeof payload.scope === "string")
				userScopes = payload.scope.split(/\s+/);
			else if (Array.isArray(payload.scp)) userScopes = payload.scp.map(String);
			else if (typeof payload.scp === "string") userScopes = [payload.scp];
		}
	}

	if (allowedRoles.length > 0) {
		const hasRole = allowedRoles.some((r) => userRoles.includes(r));
		if (!hasRole) {
			return {
				isAllowed: false,
				reason: `Requires role: ${allowedRoles.join(" or ")}`,
			};
		}
	}

	if (allowedScopes.length > 0) {
		const hasScope = allowedScopes.some((s) => userScopes.includes(s));
		if (!hasScope) {
			return {
				isAllowed: false,
				reason: `Requires scope: ${allowedScopes.join(" or ")}`,
			};
		}
	}

	return { isAllowed: true };
}

export function formatRelativeTime(epoch: number): string {
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

export function jsonToYaml(val: any, indent = 0): string {
	const spaces = " ".repeat(indent);
	if (val === null || val === undefined) return "null\n";
	if (typeof val !== "object") {
		if (typeof val === "string") {
			if (val.includes("\n")) {
				const lines = val.split("\n");
				if (lines.length > 1 && lines[lines.length - 1] === "") {
					lines.pop();
				}
				const linesStr = lines
					.map((l) => " ".repeat(indent + 2) + l)
					.join("\n");
				return `|\n${linesStr}\n`;
			}
			if (
				/^[0-9]+$/.test(val) ||
				/^(true|false|null)$/i.test(val) ||
				/[:#{}[\]&*?|<>=!%@`"\\]/.test(val)
			) {
				return `"${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"\n`;
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
		if (
			typeof v === "object" &&
			v !== null &&
			!Array.isArray(v) &&
			Object.keys(v).length > 0
		) {
			res += `${spaces}${key}:\n${valStr}`;
		} else if (Array.isArray(v) && v.length > 0) {
			res += `${spaces}${key}:${valStr}`;
		} else {
			res += `${spaces}${key}: ${valStr.trimStart()}`;
		}
	}
	return res;
}

export function applyThemeStyles(
	theme: string,
	density: string,
	accent: string,
) {
	const root = document.documentElement;
	root.setAttribute("data-theme", theme);
	root.setAttribute("data-density", density);
	root.style.setProperty("--accent", accent);

	const isDark =
		theme === "dark" ||
		(theme === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);
	if (isDark) {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}

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
