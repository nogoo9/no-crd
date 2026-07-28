import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: handleWebRequest()","description":"","frontmatter":{},"headers":[],"relativePath":"api/server/functions/handleWebRequest.md","filePath":"api/server/functions/handleWebRequest.md"}');
const _sfc_main = { name: "api/server/functions/handleWebRequest.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">server</a> / handleWebRequest</p><h1 id="function-handlewebrequest" tabindex="-1">Function: handleWebRequest() <a class="header-anchor" href="#function-handlewebrequest" aria-label="Permalink to &quot;Function: handleWebRequest()&quot;">​</a></h1><blockquote><p><strong>handleWebRequest</strong>(<code>req</code>, <code>_serverInstance?</code>): <code>Promise</code>&lt;<code>Response</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/server/index.ts#L312" target="_blank" rel="noreferrer">src/server/index.ts:312</a></p><p>Core runtime-agnostic web request handler.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="req" tabindex="-1">req <a class="header-anchor" href="#req" aria-label="Permalink to &quot;req&quot;">​</a></h3><p><code>Request</code></p><h3 id="serverinstance" tabindex="-1">_serverInstance? <a class="header-anchor" href="#serverinstance" aria-label="Permalink to &quot;\\_serverInstance?&quot;">​</a></h3><p><code>any</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>Response</code>&gt;</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/server/functions/handleWebRequest.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const handleWebRequest = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  handleWebRequest as default
};
