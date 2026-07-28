import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"@nogoo9/no-crd","description":"","frontmatter":{},"headers":[],"relativePath":"api/index.md","filePath":"api/index.md"}');
const _sfc_main = { name: "api/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="nogoo9-no-crd" tabindex="-1">@nogoo9/no-crd <a class="header-anchor" href="#nogoo9-no-crd" aria-label="Permalink to &quot;@nogoo9/no-crd&quot;">​</a></h1><h2 id="modules" tabindex="-1">Modules <a class="header-anchor" href="#modules" aria-label="Permalink to &quot;Modules&quot;">​</a></h2><ul><li><a href="./cli/">cli</a></li><li><a href="./index/">index</a></li><li><a href="./k8s/">k8s</a></li><li><a href="./mcp/server/">mcp/server</a></li><li><a href="./server/">server</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
