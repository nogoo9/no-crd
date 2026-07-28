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
				{ text: "Wiki", link: "/wiki/" },
				{ text: "What's New", link: "/whats-new" },
				{ text: "Decisions", link: "/decisions/" },
				{ text: "API Reference", link: "/api/" },
			],
			sidebar: [
				{
					text: "Getting Started",
					items: [
						{ text: "What is no-crd?", link: "/getting-started" },
						{ text: "Setup Cheatsheet", link: "/setup-cheatsheet" },
						{ text: "What's New", link: "/whats-new" },
					],
				},
				{
					text: "Deep Wiki Knowledge Base",
					collapsed: false,
					items: [
						{ text: "Wiki Overview", link: "/wiki/" },
						{
							text: "Architecture Overview",
							link: "/wiki/architecture-overview",
						},
						{
							text: "Zero-CRD Pod Lifecycle",
							link: "/wiki/zero-crd-pod-lifecycle",
						},
						{
							text: "Auth & Security Model",
							link: "/wiki/auth-and-security-model",
						},
						{
							text: "Routing Proxy & Tunneling",
							link: "/wiki/routing-proxy-and-tunneling",
						},
						{
							text: "Peer Discovery & HA",
							link: "/wiki/peer-discovery-and-ha",
						},
						{
							text: "MCP Tool Engine & Schemas",
							link: "/wiki/mcp-tool-engine-and-schemas",
						},
						{
							text: "UI & Client Integration",
							link: "/wiki/ui-and-mcp-client-integration",
						},
					],
				},
				{
					text: "Track A: AI Agent & MCP Users",
					collapsed: false,
					items: [
						{ text: "MCP Client Setup", link: "/mcp/guide" },
						{ text: "MCP Tools Reference", link: "/mcp/tools" },
						{
							text: "System Prompts & Agent Rules",
							link: "/mcp/agent-instructions",
						},
					],
				},
				{
					text: "Track B: Platform & Service Deployers",
					collapsed: false,
					items: [
						{
							text: "Architecture & System Design",
							link: "/deploy/architecture",
						},
						{
							text: "Cluster RBAC & Permissions",
							link: "/deploy/rbac-permissions",
						},
						{
							text: "Configuration & Env Variables",
							link: "/deploy/configuration",
						},
						{ text: "SSO & OIDC Integration", link: "/deploy/sso-identity" },
						{
							text: "Templates & Workspace Customization",
							link: "/deploy/workspace-customization",
						},
						{
							text: "Upgrades & Template Versioning",
							link: "/deploy/workspace-upgrades",
						},
						{
							text: "Dashboard Themes & Branding",
							link: "/deploy/themes-branding",
						},
						{ text: "CI/CD & Security Scanning", link: "/gha-security" },
					],
				},
				{
					text: "Track C: SDK & Code Contributors",
					collapsed: false,
					items: [
						{
							text: "Programmatic TypeScript SDK",
							link: "/developer/programmatic-sdk",
						},
						{
							text: "Local Sandbox (k3d & Keycloak)",
							link: "/developer/local-sandbox",
						},
						{
							text: "Isomorphic Cross-Runtime Design",
							link: "/developer/cross-runtime-design",
						},
						{
							text: "Contributing & TDD Workflow",
							link: "/developer/contributing",
						},
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
						{
							text: "ADR-023: Refresh Token Lifecycle & Rotation Safety",
							link: "/decisions/ADR-023-refresh-token-lifecycle-and-rotation-safety",
						},
						{
							text: "ADR-024: Non-blocking Template Upgrade",
							link: "/decisions/ADR-024-non-blocking-workspace-template-upgrade",
						},
						{
							text: "ADR-025: Request Context via AsyncLocalStorage",
							link: "/decisions/ADR-025-async-local-storage-mcp-request-context",
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
