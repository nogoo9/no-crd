import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: mergeContainersByName()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/mergeContainersByName.md","filePath":"api/index/functions/mergeContainersByName.md"}');
const _sfc_main = { name: "api/index/functions/mergeContainersByName.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / mergeContainersByName</p><h1 id="function-mergecontainersbyname" tabindex="-1">Function: mergeContainersByName() <a class="header-anchor" href="#function-mergecontainersbyname" aria-label="Permalink to &quot;Function: mergeContainersByName()&quot;">​</a></h1><blockquote><p><strong>mergeContainersByName</strong>(<code>base</code>, <code>overrides</code>): <a href="./../type-aliases/ContainerType.html"><code>ContainerType</code></a>[]</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/merge.ts#L31" target="_blank" rel="noreferrer">src/k8s/merge.ts:31</a></p><p>Merges container configuration overrides into a list of base containers by name. Overwrites simple fields directly and deep-merges environment variables by their key name.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="base" tabindex="-1">base <a class="header-anchor" href="#base" aria-label="Permalink to &quot;base&quot;">​</a></h3><p><a href="./../type-aliases/ContainerType.html"><code>ContainerType</code></a>[]</p><p>Array of original base container configurations.</p><h3 id="overrides" tabindex="-1">overrides <a class="header-anchor" href="#overrides" aria-label="Permalink to &quot;overrides&quot;">​</a></h3><p><a href="./../type-aliases/ContainerOverrideType.html"><code>ContainerOverrideType</code></a>[]</p><p>Array of container configuration overrides to apply.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><a href="./../type-aliases/ContainerType.html"><code>ContainerType</code></a>[]</p><p>A new array of merged container configurations.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/mergeContainersByName.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const mergeContainersByName = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  mergeContainersByName as default
};
