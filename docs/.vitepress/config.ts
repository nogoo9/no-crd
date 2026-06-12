import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const getBaseUrl = () => {
	let base = process.env.BASE_URL || "/no-crd/";
	if (!base.startsWith("/")) {
		base = `/${base}`;
	}
	if (!base.endsWith("/")) {
		base = `${base}/`;
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
						{ text: "Setup Cheatsheet", link: "/setup-cheatsheet" },
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
						{
							text: "Authentication & Authorization Overview",
							link: "/auth-overview",
						},
						{ text: "Auth Setup Cheatsheet", link: "/auth-cheatsheet" },
						{
							text: "Workspace App Integration & Sessions",
							link: "/workspace-app-integration",
						},
						{ text: "SSO Provider Integration", link: "/sso-integration" },
						{ text: "Advanced Auth: RBAC & ABAC", link: "/advanced-auth" },
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
						{
							text: "ADR-007: Schema Config",
							link: "/decisions/ADR-007-schema-driven-configuration",
						},
						{
							text: "ADR-008: Managed-Only Access",
							link: "/decisions/ADR-008-managed-only-pod-access-control",
						},
						{
							text: "ADR-009: Eager Startup",
							link: "/decisions/ADR-009-eager-startup-health-check",
						},
						{
							text: "ADR-010: ConfigMap Fallback",
							link: "/decisions/ADR-010-graceful-configmap-template-fallback",
						},
						{
							text: "ADR-011: BASE_URL & Cookies",
							link: "/decisions/ADR-011-ui-base-url-and-cookie-path-consistency",
						},
						{
							text: "ADR-012: Per-Session Factory",
							link: "/decisions/ADR-012-per-session-mcp-server-factory",
						},
						{
							text: "ADR-013: Workspace App Auth",
							link: "/decisions/ADR-013-workspace-app-authorization",
						},
						{
							text: "ADR-014: Admin Hardening",
							link: "/decisions/ADR-014-admin-access-hardening-and-role-mapping",
						},
						{
							text: "ADR-015: Workspace Consolidation",
							link: "/decisions/ADR-015-workspace-view-consolidation-and-template-upgrades",
						},
						{
							text: "ADR-016: Custom JSONPaths",
							link: "/decisions/ADR-016-session-cookie-custom-jsonpath-compatibility",
						},
						{
							text: "ADR-017: Redirection Recovery",
							link: "/decisions/ADR-017-unauthenticated-workspace-redirection-recovery",
						},
						{
							text: "ADR-018: Workspace Ownership",
							link: "/decisions/ADR-018-workspace-ownership-and-version-metadata",
						},
						{
							text: "ADR-019: Split-Network OIDC Issuer",
							link: "/decisions/ADR-019-split-network-oidc-issuer-and-cookie-path-alignment",
						},
						{
							text: "ADR-020: Fine-Grained Roles",
							link: "/decisions/ADR-020-fine-grained-roles-template-ownership-and-api-visibility",
						},
						{
							text: "ADR-021: API Annotations",
							link: "/decisions/ADR-021-workspace-api-annotations-and-visibility-controls",
						},
						{
							text: "ADR-022: Session Key Dependent Health",
							link: "/decisions/ADR-022-session-key-health-readiness",
						},
					],
				},
			],
			socialLinks: [
				{ icon: "github", link: "https://github.com/nogoo9/no-crd" },
				{ icon: "npm", link: "https://www.npmjs.com/package/@nogoo9/no-crd" },
			],
		},
	}),
);
