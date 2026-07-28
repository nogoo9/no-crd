import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: getSessionKey()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/getSessionKey.md","filePath":"api/index/functions/getSessionKey.md"}');
const _sfc_main = { name: "api/index/functions/getSessionKey.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / getSessionKey</p><h1 id="function-getsessionkey" tabindex="-1">Function: getSessionKey() <a class="header-anchor" href="#function-getsessionkey" aria-label="Permalink to &quot;Function: getSessionKey()&quot;">​</a></h1><blockquote><p><strong>getSessionKey</strong>(): <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L373" target="_blank" rel="noreferrer">src/k8s/session.ts:373</a></p><p>Returns the current cached session key (for the internal endpoint). Returns empty string if no key has been resolved yet.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/getSessionKey.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const getSessionKey = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  getSessionKey as default
};
