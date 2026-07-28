import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: reconstructSessionPayload()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/reconstructSessionPayload.md","filePath":"api/index/functions/reconstructSessionPayload.md"}');
const _sfc_main = { name: "api/index/functions/reconstructSessionPayload.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / reconstructSessionPayload</p><h1 id="function-reconstructsessionpayload" tabindex="-1">Function: reconstructSessionPayload() <a class="header-anchor" href="#function-reconstructsessionpayload" aria-label="Permalink to &quot;Function: reconstructSessionPayload()&quot;">​</a></h1><blockquote><p><strong>reconstructSessionPayload</strong>(<code>sub</code>, <code>roles</code>): <code>any</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L436" target="_blank" rel="noreferrer">src/k8s/session.ts:436</a></p><p>Reconstructs a dummy JWT payload from session cookie fields, populating both standard paths and custom configured JSONPaths.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="sub" tabindex="-1">sub <a class="header-anchor" href="#sub" aria-label="Permalink to &quot;sub&quot;">​</a></h3><p><code>string</code></p><h3 id="roles" tabindex="-1">roles <a class="header-anchor" href="#roles" aria-label="Permalink to &quot;roles&quot;">​</a></h3><p><code>string</code>[]</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>any</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/reconstructSessionPayload.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const reconstructSessionPayload = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  reconstructSessionPayload as default
};
