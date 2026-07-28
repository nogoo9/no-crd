import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: createMcpServer()","description":"","frontmatter":{},"headers":[],"relativePath":"api/mcp/server/functions/createMcpServer.md","filePath":"api/mcp/server/functions/createMcpServer.md"}');
const _sfc_main = { name: "api/mcp/server/functions/createMcpServer.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../../">@nogoo9/no-crd</a> / <a href="./../">mcp/server</a> / createMcpServer</p><h1 id="function-createmcpserver" tabindex="-1">Function: createMcpServer() <a class="header-anchor" href="#function-createmcpserver" aria-label="Permalink to &quot;Function: createMcpServer()&quot;">​</a></h1><blockquote><p><strong>createMcpServer</strong>(<code>k8sContext</code>): <code>Promise</code>&lt;<code>McpServer</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/mcp/server.ts#L25" target="_blank" rel="noreferrer">src/mcp/server.ts:25</a></p><p>Creates and configures a fresh instance of the Model Context Protocol (MCP) server. Instantiates the SDK server, runs RBAC diagnostics on Kubernetes, and conditionally registers pod tools, template resources, namespace tools, and workspace spawner tools.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="k8scontext" tabindex="-1">k8sContext <a class="header-anchor" href="#k8scontext" aria-label="Permalink to &quot;k8sContext&quot;">​</a></h3><p><a href="./../../../index/interfaces/K8sContext.html"><code>K8sContext</code></a></p><p>Active K8sContext containing API clients.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>McpServer</code>&gt;</p><p>Instantiated and registered McpServer instance.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/mcp/server/functions/createMcpServer.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const createMcpServer = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  createMcpServer as default
};
