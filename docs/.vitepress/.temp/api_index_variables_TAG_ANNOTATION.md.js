import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: TAG_ANNOTATION","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/TAG_ANNOTATION.md","filePath":"api/index/variables/TAG_ANNOTATION.md"}');
const _sfc_main = { name: "api/index/variables/TAG_ANNOTATION.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / TAG_ANNOTATION</p><h1 id="variable-tag-annotation" tabindex="-1">Variable: TAG_ANNOTATION <a class="header-anchor" href="#variable-tag-annotation" aria-label="Permalink to &quot;Variable: TAG\\_ANNOTATION&quot;">​</a></h1><blockquote><p><code>const</code> <strong>TAG_ANNOTATION</strong>: <code>&quot;nogoo9/tag&quot;</code> = <code>ANNOTATION_KEYS.TAG</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/templates.ts#L14" target="_blank" rel="noreferrer">src/k8s/templates.ts:14</a></p><p>ConfigMap annotation key holding the tag/version info of the template.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/TAG_ANNOTATION.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const TAG_ANNOTATION = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  TAG_ANNOTATION as default
};
