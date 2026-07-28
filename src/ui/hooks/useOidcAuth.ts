import { useEffect, useState } from "react";

export function useOidcAuth(oauthConfig: any) {
	const [token, setToken] = useState<string>(() => {
		return localStorage.getItem("nocr_access_token") || "";
	});

	useEffect(() => {
		if (token) {
			localStorage.setItem("nocr_access_token", token);
		} else {
			localStorage.removeItem("nocr_access_token");
		}
	}, [token]);

	const login = () => {
		if (!oauthConfig.authorizeUrl) return;
		const redirectUri = window.location.origin + window.location.pathname;
		const state = Math.random().toString(36).substring(7);
		localStorage.setItem("nocr_oauth_state", state);

		const url = new URL(oauthConfig.authorizeUrl);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("client_id", oauthConfig.clientId || "nogoo9-mcp");
		url.searchParams.set("redirect_uri", redirectUri);
		url.searchParams.set("scope", oauthConfig.scope || "openid profile email");
		url.searchParams.set("state", state);

		window.location.href = url.toString();
	};

	const logout = () => {
		setToken("");
		localStorage.removeItem("nocr_access_token");
		localStorage.removeItem("nocr_oauth_state");
	};

	return { token, setToken, login, logout };
}
