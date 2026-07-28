import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Type Alias: HealthResponse","description":"","frontmatter":{},"headers":[],"relativePath":"api/k8s/type-aliases/HealthResponse.md","filePath":"api/k8s/type-aliases/HealthResponse.md"}');
const _sfc_main = { name: "api/k8s/type-aliases/HealthResponse.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">k8s</a> / HealthResponse</p><h1 id="type-alias-healthresponse" tabindex="-1">Type Alias: HealthResponse <a class="header-anchor" href="#type-alias-healthresponse" aria-label="Permalink to &quot;Type Alias: HealthResponse&quot;">​</a></h1><blockquote><p><strong>HealthResponse</strong> = <code>object</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/index.ts#L96" target="_blank" rel="noreferrer">src/k8s/index.ts:96</a></p><h2 id="properties" tabindex="-1">Properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;Properties&quot;">​</a></h2><h3 id="status" tabindex="-1">status <a class="header-anchor" href="#status" aria-label="Permalink to &quot;status&quot;">​</a></h3><blockquote><p><strong>status</strong>: <code>&quot;ok&quot;</code> | <code>&quot;degraded&quot;</code> | <code>&quot;error&quot;</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/index.ts#L97" target="_blank" rel="noreferrer">src/k8s/index.ts:97</a></p><hr><h3 id="timestamp" tabindex="-1">timestamp? <a class="header-anchor" href="#timestamp" aria-label="Permalink to &quot;timestamp?&quot;">​</a></h3><blockquote><p><code>optional</code> <strong>timestamp?</strong>: <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/index.ts#L98" target="_blank" rel="noreferrer">src/k8s/index.ts:98</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/k8s/type-aliases/HealthResponse.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const HealthResponse = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  HealthResponse as default
};
