import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: ResourceQuantity","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/ResourceQuantity.md","filePath":"api/index/variables/ResourceQuantity.md"}');
const _sfc_main = { name: "api/index/variables/ResourceQuantity.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / ResourceQuantity</p><h1 id="variable-resourcequantity" tabindex="-1">Variable: ResourceQuantity <a class="header-anchor" href="#variable-resourcequantity" aria-label="Permalink to &quot;Variable: ResourceQuantity&quot;">​</a></h1><blockquote><p><code>const</code> <strong>ResourceQuantity</strong>: <code>ZodRecord</code>&lt;<code>ZodString</code>, <code>ZodString</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/schemas.ts#L55" target="_blank" rel="noreferrer">src/k8s/schemas.ts:55</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/ResourceQuantity.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const ResourceQuantity = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  ResourceQuantity as default
};
