import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: createFastifyApp()","description":"","frontmatter":{},"headers":[],"relativePath":"api/server/functions/createFastifyApp.md","filePath":"api/server/functions/createFastifyApp.md"}');
const _sfc_main = { name: "api/server/functions/createFastifyApp.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">server</a> / createFastifyApp</p><h1 id="function-createfastifyapp" tabindex="-1">Function: createFastifyApp() <a class="header-anchor" href="#function-createfastifyapp" aria-label="Permalink to &quot;Function: createFastifyApp()&quot;">​</a></h1><blockquote><p><strong>createFastifyApp</strong>(<code>options?</code>): <code>Promise</code>&lt;<code>any</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/server/index.ts#L161" target="_blank" rel="noreferrer">src/server/index.ts:161</a></p><p>Creates and configures a Fastify application instance.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="options" tabindex="-1">options? <a class="header-anchor" href="#options" aria-label="Permalink to &quot;options?&quot;">​</a></h3><h4 id="ca" tabindex="-1">ca? <a class="header-anchor" href="#ca" aria-label="Permalink to &quot;ca?&quot;">​</a></h4><p><code>string</code></p><h4 id="cert" tabindex="-1">cert? <a class="header-anchor" href="#cert" aria-label="Permalink to &quot;cert?&quot;">​</a></h4><p><code>string</code></p><h4 id="key" tabindex="-1">key? <a class="header-anchor" href="#key" aria-label="Permalink to &quot;key?&quot;">​</a></h4><p><code>string</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>any</code>&gt;</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/server/functions/createFastifyApp.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const createFastifyApp = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  createFastifyApp as default
};
