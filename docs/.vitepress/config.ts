import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import typedocSidebar from "../api/typedoc-sidebar.json";

const getBaseUrl = () => {
	let base = process.env.BASE_URL || "/no-crd/";
	if (!base.startsWith("/")) {
		base = "/" + base;
	}
	if (!base.endsWith("/")) {
		base = base + "/";
	}
	return base;
};

export default withMermaid(
	defineConfig({
		title: "nogoo9",
		base: getBaseUrl(),
		description:
			"Agent-driven, on-demand pod orchestration in Kubernetes without CRDs",
		themeConfig: {
			logo: "/logo.png",
			nav: [
				{ text: "Home", link: "/" },
				{ text: "Guide", link: "/getting-started" },
				{ text: "What's New", link: "/whats-new" },
				{ text: "Decisions", link: "/decisions/" },
				{ text: "API Reference", link: "/api/" },
			],
			sidebar: [
				{
					text: "Introduction",
					items: [
						{ text: "Getting Started", link: "/getting-started" },
						{ text: "What's New", link: "/whats-new" },
					],
				},
				{
					text: "Core Features & Usage",
					items: [
						{ text: "Workspace Spawner", link: "/spawner-guide" },
						{ text: "Pod Templates", link: "/pod-templates" },
						{ text: "MCP Tools Reference", link: "/mcp-tools" },
						{ text: "Programmatic SDK", link: "/sdk-guide" },
					],
				},
				{
					text: "Security, Auth & Identity",
					items: [
						{ text: "Authentication Overview", link: "/mcp-auth" },
						{ text: "SSO Provider Integration", link: "/sso-integration" },
						{ text: "Advanced Auth: RBAC & ABAC", link: "/advanced-auth" },
						{ text: "Cryptographic Hardening", link: "/auth-hardening" },
					],
				},
				{
					text: "Local Development & Testing",
					items: [
						{ text: "k3d Local Sandbox", link: "/k3d-sandbox" },
						{ text: "Keycloak Integration", link: "/keycloak-integration" },
						{ text: "Dashboard UI Guide", link: "/ui-guide" },
						{ text: "CI/CD & Security Scanning", link: "/gha-security" },
					],
				},
				{
					text: "Reference Documentation",
					items: [
						{ text: "Kubernetes RBAC Mapping", link: "/permissions" },
						{
							text: "Bun WebSocket Proxy Design",
							link: "/bun-websocket-proxy",
						},
						{ text: "API Reference (TypeDoc)", link: "/api/" },
					],
				},
				{
					text: "Architecture Decisions",
					items: [
						{ text: "Overview", link: "/decisions/" },
						{
							text: "ADR-001: Template File Format",
							link: "/decisions/ADR-001-template-file-format",
						},
						{
							text: "ADR-002: Session Cookies",
							link: "/decisions/ADR-002-stateless-session-cookies",
						},
						{
							text: "ADR-003: Peer Discovery",
							link: "/decisions/ADR-003-peer-discovery-session-key",
						},
						{
							text: "ADR-004: Theme Merge",
							link: "/decisions/ADR-004-three-source-theme-merge",
						},
						{
							text: "ADR-005: Endpoint Coverage",
							link: "/decisions/ADR-005-ui-proactive-oidc-refresh",
						},
						{
							text: "ADR-006: Asset Resolution",
							link: "/decisions/ADR-006-packaged-ui-asset-resolution",
						},
					],
				},
			],
			socialLinks: [
				{ icon: "github", link: "https://github.com/nogoo9/no-crd" },
				{ icon: "npm", link: "https://www.npmjs.com/package/@nogoo9/no-crd" }
			],
		},
	}),
);
