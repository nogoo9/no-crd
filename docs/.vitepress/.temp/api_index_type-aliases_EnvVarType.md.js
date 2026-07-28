import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Type Alias: EnvVarType","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/type-aliases/EnvVarType.md","filePath":"api/index/type-aliases/EnvVarType.md"}');
const _sfc_main = { name: "api/index/type-aliases/EnvVarType.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / EnvVarType</p><h1 id="type-alias-envvartype" tabindex="-1">Type Alias: EnvVarType <a class="header-anchor" href="#type-alias-envvartype" aria-label="Permalink to &quot;Type Alias: EnvVarType&quot;">​</a></h1><blockquote><p><strong>EnvVarType</strong> = <code>object</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L5" target="_blank" rel="noreferrer">src/k8s/merge.ts:5</a></p><h2 id="properties" tabindex="-1">Properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;Properties&quot;">​</a></h2><h3 id="name" tabindex="-1">name <a class="header-anchor" href="#name" aria-label="Permalink to &quot;name&quot;">​</a></h3><blockquote><p><strong>name</strong>: <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L5" target="_blank" rel="noreferrer">src/k8s/merge.ts:5</a></p><hr><h3 id="value" tabindex="-1">value? <a class="header-anchor" href="#value" aria-label="Permalink to &quot;value?&quot;">​</a></h3><blockquote><p><code>optional</code> <strong>value?</strong>: <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L5" target="_blank" rel="noreferrer">src/k8s/merge.ts:5</a></p><hr><h3 id="valuefrom" tabindex="-1">valueFrom? <a class="header-anchor" href="#valuefrom" aria-label="Permalink to &quot;valueFrom?&quot;">​</a></h3><blockquote><p><code>optional</code> <strong>valueFrom?</strong>: <code>unknown</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L5" target="_blank" rel="noreferrer">src/k8s/merge.ts:5</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/type-aliases/EnvVarType.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const EnvVarType = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  EnvVarType as default
};
