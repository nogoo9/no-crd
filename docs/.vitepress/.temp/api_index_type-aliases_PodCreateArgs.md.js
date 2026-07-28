import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Type Alias: PodCreateArgs","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/type-aliases/PodCreateArgs.md","filePath":"api/index/type-aliases/PodCreateArgs.md"}');
const _sfc_main = { name: "api/index/type-aliases/PodCreateArgs.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / PodCreateArgs</p><h1 id="type-alias-podcreateargs" tabindex="-1">Type Alias: PodCreateArgs <a class="header-anchor" href="#type-alias-podcreateargs" aria-label="Permalink to &quot;Type Alias: PodCreateArgs&quot;">​</a></h1><blockquote><p><strong>PodCreateArgs</strong> = <code>z.infer</code>&lt;<em>typeof</em> <a href="./../variables/PodSpecSchema.html"><code>PodSpecSchema</code></a>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/schemas.ts#L503" target="_blank" rel="noreferrer">src/k8s/schemas.ts:503</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/type-aliases/PodCreateArgs.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const PodCreateArgs = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  PodCreateArgs as default
};
