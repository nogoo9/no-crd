import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: loadErrorHtml()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/loadErrorHtml.md","filePath":"api/index/functions/loadErrorHtml.md"}');
const _sfc_main = { name: "api/index/functions/loadErrorHtml.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / loadErrorHtml</p><h1 id="function-loaderrorhtml" tabindex="-1">Function: loadErrorHtml() <a class="header-anchor" href="#function-loaderrorhtml" aria-label="Permalink to &quot;Function: loadErrorHtml()&quot;">​</a></h1><blockquote><p><strong>loadErrorHtml</strong>(<code>distDir</code>, <code>basePrefix?</code>): <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/ui/index.ts#L72" target="_blank" rel="noreferrer">src/ui/index.ts:72</a></p><p>Reads the Error HTML template, injects base URL configurations, and returns it.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="distdir" tabindex="-1">distDir <a class="header-anchor" href="#distdir" aria-label="Permalink to &quot;distDir&quot;">​</a></h3><p><code>string</code></p><h3 id="baseprefix" tabindex="-1">basePrefix? <a class="header-anchor" href="#baseprefix" aria-label="Permalink to &quot;basePrefix?&quot;">​</a></h3><p><code>string</code> = <code>&quot;&quot;</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/loadErrorHtml.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const loadErrorHtml = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  loadErrorHtml as default
};
