import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: TEMPLATE_LABEL_KEY","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/TEMPLATE_LABEL_KEY.md","filePath":"api/index/variables/TEMPLATE_LABEL_KEY.md"}');
const _sfc_main = { name: "api/index/variables/TEMPLATE_LABEL_KEY.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / TEMPLATE_LABEL_KEY</p><h1 id="variable-template-label-key" tabindex="-1">Variable: TEMPLATE_LABEL_KEY <a class="header-anchor" href="#variable-template-label-key" aria-label="Permalink to &quot;Variable: TEMPLATE\\_LABEL\\_KEY&quot;">​</a></h1><blockquote><p><code>const</code> <strong>TEMPLATE_LABEL_KEY</strong>: <code>&quot;nogoo9/pod-template&quot;</code> = <code>ANNOTATION_KEYS.POD_TEMPLATE</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/templates.ts#L10" target="_blank" rel="noreferrer">src/k8s/templates.ts:10</a></p><p>Kubernetes label key indicating a ConfigMap is a pod template.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/TEMPLATE_LABEL_KEY.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const TEMPLATE_LABEL_KEY = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  TEMPLATE_LABEL_KEY as default
};
