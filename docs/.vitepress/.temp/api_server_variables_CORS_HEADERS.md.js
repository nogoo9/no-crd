import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: CORS_HEADERS","description":"","frontmatter":{},"headers":[],"relativePath":"api/server/variables/CORS_HEADERS.md","filePath":"api/server/variables/CORS_HEADERS.md"}');
const _sfc_main = { name: "api/server/variables/CORS_HEADERS.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">server</a> / CORS_HEADERS</p><h1 id="variable-cors-headers" tabindex="-1">Variable: CORS_HEADERS <a class="header-anchor" href="#variable-cors-headers" aria-label="Permalink to &quot;Variable: CORS\\_HEADERS&quot;">​</a></h1><blockquote><p><code>const</code> <strong>CORS_HEADERS</strong>: <code>Record</code>&lt;<code>string</code>, <code>string</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/server/helpers.ts#L43" target="_blank" rel="noreferrer">src/server/helpers.ts:43</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/server/variables/CORS_HEADERS.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const CORS_HEADERS = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  CORS_HEADERS as default
};
