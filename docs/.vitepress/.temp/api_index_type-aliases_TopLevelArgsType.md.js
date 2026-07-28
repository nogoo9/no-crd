import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Type Alias: TopLevelArgsType","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/type-aliases/TopLevelArgsType.md","filePath":"api/index/type-aliases/TopLevelArgsType.md"}');
const _sfc_main = { name: "api/index/type-aliases/TopLevelArgsType.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / TopLevelArgsType</p><h1 id="type-alias-toplevelargstype" tabindex="-1">Type Alias: TopLevelArgsType <a class="header-anchor" href="#type-alias-toplevelargstype" aria-label="Permalink to &quot;Type Alias: TopLevelArgsType&quot;">​</a></h1><blockquote><p><strong>TopLevelArgsType</strong> = <code>object</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L17" target="_blank" rel="noreferrer">src/k8s/merge.ts:17</a></p><h2 id="indexable" tabindex="-1">Indexable <a class="header-anchor" href="#indexable" aria-label="Permalink to &quot;Indexable&quot;">​</a></h2><blockquote><p>[<code>key</code>: <code>string</code>]: <code>unknown</code></p></blockquote><h2 id="properties" tabindex="-1">Properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;Properties&quot;">​</a></h2><h3 id="annotations" tabindex="-1">annotations? <a class="header-anchor" href="#annotations" aria-label="Permalink to &quot;annotations?&quot;">​</a></h3><blockquote><p><code>optional</code> <strong>annotations?</strong>: <code>Record</code>&lt;<code>string</code>, <code>string</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L19" target="_blank" rel="noreferrer">src/k8s/merge.ts:19</a></p><hr><h3 id="labels" tabindex="-1">labels? <a class="header-anchor" href="#labels" aria-label="Permalink to &quot;labels?&quot;">​</a></h3><blockquote><p><code>optional</code> <strong>labels?</strong>: <code>Record</code>&lt;<code>string</code>, <code>string</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L18" target="_blank" rel="noreferrer">src/k8s/merge.ts:18</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/type-aliases/TopLevelArgsType.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const TopLevelArgsType = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  TopLevelArgsType as default
};
