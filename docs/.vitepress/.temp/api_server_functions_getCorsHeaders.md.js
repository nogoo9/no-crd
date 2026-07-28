import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: getCorsHeaders()","description":"","frontmatter":{},"headers":[],"relativePath":"api/server/functions/getCorsHeaders.md","filePath":"api/server/functions/getCorsHeaders.md"}');
const _sfc_main = { name: "api/server/functions/getCorsHeaders.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">server</a> / getCorsHeaders</p><h1 id="function-getcorsheaders" tabindex="-1">Function: getCorsHeaders() <a class="header-anchor" href="#function-getcorsheaders" aria-label="Permalink to &quot;Function: getCorsHeaders()&quot;">​</a></h1><blockquote><p><strong>getCorsHeaders</strong>(): <code>Record</code>&lt;<code>string</code>, <code>string</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/server/helpers.ts#L25" target="_blank" rel="noreferrer">src/server/helpers.ts:25</a></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Record</code>&lt;<code>string</code>, <code>string</code>&gt;</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/server/functions/getCorsHeaders.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const getCorsHeaders = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  getCorsHeaders as default
};
