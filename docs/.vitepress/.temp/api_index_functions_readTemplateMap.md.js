import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: readTemplateMap()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/readTemplateMap.md","filePath":"api/index/functions/readTemplateMap.md"}');
const _sfc_main = { name: "api/index/functions/readTemplateMap.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / readTemplateMap</p><h1 id="function-readtemplatemap" tabindex="-1">Function: readTemplateMap() <a class="header-anchor" href="#function-readtemplatemap" aria-label="Permalink to &quot;Function: readTemplateMap()&quot;">​</a></h1><blockquote><p><strong>readTemplateMap</strong>(<code>coreApi</code>, <code>ns</code>, <code>name</code>): <code>Promise</code>&lt;<code>V1ConfigMap</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/templates.ts#L49" target="_blank" rel="noreferrer">src/k8s/templates.ts:49</a></p><p>Reads a single template ConfigMap by name in the target namespace.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="coreapi" tabindex="-1">coreApi <a class="header-anchor" href="#coreapi" aria-label="Permalink to &quot;coreApi&quot;">​</a></h3><p><code>ObjectCoreV1Api</code></p><p>CoreV1Api client dependency.</p><h3 id="ns" tabindex="-1">ns <a class="header-anchor" href="#ns" aria-label="Permalink to &quot;ns&quot;">​</a></h3><p><code>string</code></p><p>Target namespace.</p><h3 id="name" tabindex="-1">name <a class="header-anchor" href="#name" aria-label="Permalink to &quot;name&quot;">​</a></h3><p><code>string</code></p><p>Name of the template ConfigMap.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>V1ConfigMap</code>&gt;</p><p>The matching raw ConfigMap resource.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/readTemplateMap.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const readTemplateMap = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  readTemplateMap as default
};
