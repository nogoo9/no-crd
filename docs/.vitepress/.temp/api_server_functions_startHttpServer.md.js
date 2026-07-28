import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: startHttpServer()","description":"","frontmatter":{},"headers":[],"relativePath":"api/server/functions/startHttpServer.md","filePath":"api/server/functions/startHttpServer.md"}');
const _sfc_main = { name: "api/server/functions/startHttpServer.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">server</a> / startHttpServer</p><h1 id="function-starthttpserver" tabindex="-1">Function: startHttpServer() <a class="header-anchor" href="#function-starthttpserver" aria-label="Permalink to &quot;Function: startHttpServer()&quot;">​</a></h1><blockquote><p><strong>startHttpServer</strong>(<code>customK8sContext?</code>): <code>Promise</code>&lt;<code>void</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/server/index.ts#L353" target="_blank" rel="noreferrer">src/server/index.ts:353</a></p><p>Boots the HTTP/HTTPS server using Fastify.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="customk8scontext" tabindex="-1">customK8sContext? <a class="header-anchor" href="#customk8scontext" aria-label="Permalink to &quot;customK8sContext?&quot;">​</a></h3><p><a href="./../../index/interfaces/K8sContext.html"><code>K8sContext</code></a></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>void</code>&gt;</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/server/functions/startHttpServer.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const startHttpServer = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  startHttpServer as default
};
