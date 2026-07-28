import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: base64urlDecode()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/base64urlDecode.md","filePath":"api/index/functions/base64urlDecode.md"}');
const _sfc_main = { name: "api/index/functions/base64urlDecode.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / base64urlDecode</p><h1 id="function-base64urldecode" tabindex="-1">Function: base64urlDecode() <a class="header-anchor" href="#function-base64urldecode" aria-label="Permalink to &quot;Function: base64urlDecode()&quot;">​</a></h1><blockquote><p><strong>base64urlDecode</strong>(<code>str</code>): <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/auth.ts#L17" target="_blank" rel="noreferrer">src/k8s/auth.ts:17</a></p><p>Base64url decode a string.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="str" tabindex="-1">str <a class="header-anchor" href="#str" aria-label="Permalink to &quot;str&quot;">​</a></h3><p><code>string</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/base64urlDecode.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const base64urlDecode = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  base64urlDecode as default
};
