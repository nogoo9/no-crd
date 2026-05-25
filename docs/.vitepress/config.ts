import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import typedocSidebar from "../api/typedoc-sidebar.json";

export default withMermaid(
	defineConfig({
		title: "nogoo9",
		base: "/no-crd/",
		description:
			"Agent-driven, on-demand pod orchestration in Kubernetes without CRDs",
		themeConfig: {
			logo: "/logo.png",
			nav: [
				{ text: "Home", link: "/" },
				{ text: "Guide", link: "/getting-started" },
				{ text: "What's New", link: "/whats-new" },
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
					text: "Workspace Lifecycle",
					items: [
						{ text: "Workspace Spawner", link: "/spawner-guide" },
						{ text: "RBAC Permissions", link: "/permissions" },
					],
				},
				{
					text: "MCP Integration",
					items: [
						{ text: "MCP Client Integration", link: "/mcp-guide" },
						{ text: "MCP Authentication", link: "/mcp-auth" },
						{ text: "MCP Tools Reference", link: "/mcp-tools" },
					],
				},
				{
					text: "Programmatic SDK",
					items: [
						{ text: "Programmatic SDK Guide", link: "/sdk-guide" },
					],
				},
				{
					text: "API Reference",
					items: typedocSidebar,
				},
			],
			socialLinks: [{ icon: "github", link: "https://github.com/nogoo9/no-crd" }],
		},
	}),
);
