import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: loadUiHtml()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/loadUiHtml.md","filePath":"api/index/functions/loadUiHtml.md"}');
const _sfc_main = { name: "api/index/functions/loadUiHtml.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / loadUiHtml</p><h1 id="function-loaduihtml" tabindex="-1">Function: loadUiHtml() <a class="header-anchor" href="#function-loaduihtml" aria-label="Permalink to &quot;Function: loadUiHtml()&quot;">​</a></h1><blockquote><p><strong>loadUiHtml</strong>(<code>distDir</code>, <code>basePrefix?</code>): <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/ui/index.ts#L24" target="_blank" rel="noreferrer">src/ui/index.ts:24</a></p><p>Reads the HTML interface bundle from the build target directory. If the asset is missing or not yet built, returns a fallback error UI.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="distdir" tabindex="-1">distDir <a class="header-anchor" href="#distdir" aria-label="Permalink to &quot;distDir&quot;">​</a></h3><p><code>string</code></p><p>Path to the directory where static build assets are located.</p><h3 id="baseprefix" tabindex="-1">basePrefix? <a class="header-anchor" href="#baseprefix" aria-label="Permalink to &quot;basePrefix?&quot;">​</a></h3><p><code>string</code> = <code>&quot;&quot;</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code></p><p>Serialized HTML application payload.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/loadUiHtml.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const loadUiHtml = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  loadUiHtml as default
};
