import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Type Alias: PodPhase","description":"","frontmatter":{},"headers":[],"relativePath":"api/k8s/type-aliases/PodPhase.md","filePath":"api/k8s/type-aliases/PodPhase.md"}');
const _sfc_main = { name: "api/k8s/type-aliases/PodPhase.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">k8s</a> / PodPhase</p><h1 id="type-alias-podphase" tabindex="-1">Type Alias: PodPhase <a class="header-anchor" href="#type-alias-podphase" aria-label="Permalink to &quot;Type Alias: PodPhase&quot;">​</a></h1><blockquote><p><strong>PodPhase</strong> = <code>&quot;Pending&quot;</code> | <code>&quot;Running&quot;</code> | <code>&quot;Succeeded&quot;</code> | <code>&quot;Failed&quot;</code> | <code>&quot;Unknown&quot;</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/index.ts#L101" target="_blank" rel="noreferrer">src/k8s/index.ts:101</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/k8s/type-aliases/PodPhase.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const PodPhase = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  PodPhase as default
};
