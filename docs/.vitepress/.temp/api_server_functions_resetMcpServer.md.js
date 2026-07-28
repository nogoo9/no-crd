import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: resetMcpServer()","description":"","frontmatter":{},"headers":[],"relativePath":"api/server/functions/resetMcpServer.md","filePath":"api/server/functions/resetMcpServer.md"}');
const _sfc_main = { name: "api/server/functions/resetMcpServer.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">server</a> / resetMcpServer</p><h1 id="function-resetmcpserver" tabindex="-1">Function: resetMcpServer() <a class="header-anchor" href="#function-resetmcpserver" aria-label="Permalink to &quot;Function: resetMcpServer()&quot;">​</a></h1><blockquote><p><strong>resetMcpServer</strong>(<code>customTransport?</code>, <code>isStateless?</code>, <code>customK8sContext?</code>): <code>Promise</code>&lt;<code>void</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/server/index.ts#L135" target="_blank" rel="noreferrer">src/server/index.ts:135</a></p><p>Resets the global MCP server cache and Fastify server, allowing dependency injection.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="customtransport" tabindex="-1">customTransport? <a class="header-anchor" href="#customtransport" aria-label="Permalink to &quot;customTransport?&quot;">​</a></h3><p><code>WebStandardStreamableHTTPServerTransport</code></p><h3 id="isstateless" tabindex="-1">isStateless? <a class="header-anchor" href="#isstateless" aria-label="Permalink to &quot;isStateless?&quot;">​</a></h3><p><code>boolean</code> = <code>false</code></p><h3 id="customk8scontext" tabindex="-1">customK8sContext? <a class="header-anchor" href="#customk8scontext" aria-label="Permalink to &quot;customK8sContext?&quot;">​</a></h3><p><a href="./../../index/interfaces/K8sContext.html"><code>K8sContext</code></a></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>void</code>&gt;</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/server/functions/resetMcpServer.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const resetMcpServer = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  resetMcpServer as default
};
