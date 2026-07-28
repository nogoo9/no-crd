import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: _resetSessionKeyForTesting()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/resetSessionKeyForTesting.md","filePath":"api/index/functions/resetSessionKeyForTesting.md"}');
const _sfc_main = { name: "api/index/functions/resetSessionKeyForTesting.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / _resetSessionKeyForTesting</p><h1 id="function-resetsessionkeyfortesting" tabindex="-1">Function: _resetSessionKeyForTesting() <a class="header-anchor" href="#function-resetsessionkeyfortesting" aria-label="Permalink to &quot;Function: \\_resetSessionKeyForTesting()&quot;">​</a></h1><blockquote><p><strong>_resetSessionKeyForTesting</strong>(): <code>void</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L381" target="_blank" rel="noreferrer">src/k8s/session.ts:381</a></p><p><strong><code>Internal</code></strong></p><p>Resets the cached session key. Used for testing only.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>void</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/resetSessionKeyForTesting.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const resetSessionKeyForTesting = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  resetSessionKeyForTesting as default
};
