import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: registerNamespaceTools()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/registerNamespaceTools.md","filePath":"api/index/functions/registerNamespaceTools.md"}');
const _sfc_main = { name: "api/index/functions/registerNamespaceTools.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / registerNamespaceTools</p><h1 id="function-registernamespacetools" tabindex="-1">Function: registerNamespaceTools() <a class="header-anchor" href="#function-registernamespacetools" aria-label="Permalink to &quot;Function: registerNamespaceTools()&quot;">​</a></h1><blockquote><p><strong>registerNamespaceTools</strong>(<code>server</code>, <code>k8sContext</code>, <code>defaultNamespace</code>, <code>mode</code>): <code>void</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/mcp/namespace.ts#L74" target="_blank" rel="noreferrer">src/mcp/namespace.ts:74</a></p><p>Registers namespace diagnostics and metadata tools into the MCP server. Registered tools: <code>current_namespace</code>, <code>check_permissions</code>, <code>get_capabilities</code>.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="server" tabindex="-1">server <a class="header-anchor" href="#server" aria-label="Permalink to &quot;server&quot;">​</a></h3><p><code>McpServer</code></p><p>The McpServer instance.</p><h3 id="k8scontext" tabindex="-1">k8sContext <a class="header-anchor" href="#k8scontext" aria-label="Permalink to &quot;k8sContext&quot;">​</a></h3><p><a href="./../interfaces/K8sContext.html"><code>K8sContext</code></a></p><p>Active K8sContext containing API clients.</p><h3 id="defaultnamespace" tabindex="-1">defaultNamespace <a class="header-anchor" href="#defaultnamespace" aria-label="Permalink to &quot;defaultNamespace&quot;">​</a></h3><p><code>string</code></p><p>The default namespace.</p><h3 id="mode" tabindex="-1">mode <a class="header-anchor" href="#mode" aria-label="Permalink to &quot;mode&quot;">​</a></h3><p><code>string</code></p><p>The access mode (cluster or namespaced).</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>void</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/registerNamespaceTools.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const registerNamespaceTools = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  registerNamespaceTools as default
};
