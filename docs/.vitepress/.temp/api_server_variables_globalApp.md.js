import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: globalApp","description":"","frontmatter":{},"headers":[],"relativePath":"api/server/variables/globalApp.md","filePath":"api/server/variables/globalApp.md"}');
const _sfc_main = { name: "api/server/variables/globalApp.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">server</a> / globalApp</p><h1 id="variable-globalapp" tabindex="-1">Variable: globalApp <a class="header-anchor" href="#variable-globalapp" aria-label="Permalink to &quot;Variable: globalApp&quot;">​</a></h1><blockquote><p><strong>globalApp</strong>: <code>FastifyInstance</code> | <code>null</code> = <code>null</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/server/index.ts#L45" target="_blank" rel="noreferrer">src/server/index.ts:45</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/server/variables/globalApp.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const globalApp = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  globalApp as default
};
