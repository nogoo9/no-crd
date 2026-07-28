import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Type Alias: ContainerOverrideType","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/type-aliases/ContainerOverrideType.md","filePath":"api/index/type-aliases/ContainerOverrideType.md"}');
const _sfc_main = { name: "api/index/type-aliases/ContainerOverrideType.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / ContainerOverrideType</p><h1 id="type-alias-containeroverridetype" tabindex="-1">Type Alias: ContainerOverrideType <a class="header-anchor" href="#type-alias-containeroverridetype" aria-label="Permalink to &quot;Type Alias: ContainerOverrideType&quot;">​</a></h1><blockquote><p><strong>ContainerOverrideType</strong> = <code>object</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L12" target="_blank" rel="noreferrer">src/k8s/merge.ts:12</a></p><h2 id="indexable" tabindex="-1">Indexable <a class="header-anchor" href="#indexable" aria-label="Permalink to &quot;Indexable&quot;">​</a></h2><blockquote><p>[<code>key</code>: <code>string</code>]: <code>unknown</code></p></blockquote><h2 id="properties" tabindex="-1">Properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;Properties&quot;">​</a></h2><h3 id="env" tabindex="-1">env? <a class="header-anchor" href="#env" aria-label="Permalink to &quot;env?&quot;">​</a></h3><blockquote><p><code>optional</code> <strong>env?</strong>: <a href="./EnvVarType.html"><code>EnvVarType</code></a>[]</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L14" target="_blank" rel="noreferrer">src/k8s/merge.ts:14</a></p><hr><h3 id="name" tabindex="-1">name <a class="header-anchor" href="#name" aria-label="Permalink to &quot;name&quot;">​</a></h3><blockquote><p><strong>name</strong>: <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L13" target="_blank" rel="noreferrer">src/k8s/merge.ts:13</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/type-aliases/ContainerOverrideType.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const ContainerOverrideType = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  ContainerOverrideType as default
};
