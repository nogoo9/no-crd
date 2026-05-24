import { defineConfig } from "vitepress";
import typedocSidebar from "../api/typedoc-sidebar.json";

export default defineConfig({
	title: "nogoo9",
	base: "/no-crd/",
	description:
		"Agent-driven, on-demand pod orchestration in Kubernetes without CRDs",
	themeConfig: {
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Guide", link: "/getting-started" },
			{ text: "What's New", link: "/whats-new" },
			{ text: "API Reference", link: "/api/" },
		],
		sidebar: [
			{
				text: "Guide",
				items: [
					{ text: "Getting Started", link: "/getting-started" },
					{ text: "MCP Client Integration", link: "/mcp-guide" },
					{ text: "MCP Tools Reference", link: "/mcp-tools" },
					{ text: "Workspace Spawner", link: "/spawner-guide" },
					{ text: "RBAC Permissions", link: "/permissions" },
					{ text: "What's New", link: "/whats-new" },
				],
			},
			{
				text: "API Reference",
				items: typedocSidebar,
			},
		],
		socialLinks: [{ icon: "github", link: "https://github.com/nogoo9/no-crd" }],
	},
});
