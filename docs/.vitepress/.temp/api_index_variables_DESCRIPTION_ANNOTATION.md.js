import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: DESCRIPTION_ANNOTATION","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/DESCRIPTION_ANNOTATION.md","filePath":"api/index/variables/DESCRIPTION_ANNOTATION.md"}');
const _sfc_main = { name: "api/index/variables/DESCRIPTION_ANNOTATION.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / DESCRIPTION_ANNOTATION</p><h1 id="variable-description-annotation" tabindex="-1">Variable: DESCRIPTION_ANNOTATION <a class="header-anchor" href="#variable-description-annotation" aria-label="Permalink to &quot;Variable: DESCRIPTION\\_ANNOTATION&quot;">​</a></h1><blockquote><p><code>const</code> <strong>DESCRIPTION_ANNOTATION</strong>: <code>&quot;nogoo9/description&quot;</code> = <code>ANNOTATION_KEYS.DESCRIPTION</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/templates.ts#L12" target="_blank" rel="noreferrer">src/k8s/templates.ts:12</a></p><p>ConfigMap annotation key holding the description text of the template.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/DESCRIPTION_ANNOTATION.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const DESCRIPTION_ANNOTATION = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  DESCRIPTION_ANNOTATION as default
};
