import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: listTemplateMaps()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/listTemplateMaps.md","filePath":"api/index/functions/listTemplateMaps.md"}');
const _sfc_main = { name: "api/index/functions/listTemplateMaps.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / listTemplateMaps</p><h1 id="function-listtemplatemaps" tabindex="-1">Function: listTemplateMaps() <a class="header-anchor" href="#function-listtemplatemaps" aria-label="Permalink to &quot;Function: listTemplateMaps()&quot;">​</a></h1><blockquote><p><strong>listTemplateMaps</strong>(<code>coreApi</code>, <code>ns</code>): <code>Promise</code>&lt;<code>V1ConfigMap</code>[]&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/templates.ts#L24" target="_blank" rel="noreferrer">src/k8s/templates.ts:24</a></p><p>Lists all template ConfigMap resources located in the target namespace. Filters resources matching <code>TEMPLATE_LABEL</code> (<code>nogoo9/pod-template=true</code>).</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="coreapi" tabindex="-1">coreApi <a class="header-anchor" href="#coreapi" aria-label="Permalink to &quot;coreApi&quot;">​</a></h3><p><code>ObjectCoreV1Api</code></p><p>CoreV1Api client dependency.</p><h3 id="ns" tabindex="-1">ns <a class="header-anchor" href="#ns" aria-label="Permalink to &quot;ns&quot;">​</a></h3><p><code>string</code></p><p>Target namespace.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>V1ConfigMap</code>[]&gt;</p><p>Array of ConfigMap resources representing templates.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/listTemplateMaps.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const listTemplateMaps = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  listTemplateMaps as default
};
