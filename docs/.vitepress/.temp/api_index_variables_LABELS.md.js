import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: LABELS","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/LABELS.md","filePath":"api/index/variables/LABELS.md"}');
const _sfc_main = { name: "api/index/variables/LABELS.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / LABELS</p><h1 id="variable-labels" tabindex="-1">Variable: LABELS <a class="header-anchor" href="#variable-labels" aria-label="Permalink to &quot;Variable: LABELS&quot;">​</a></h1><blockquote><p><code>const</code> <strong>LABELS</strong>: <code>object</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/config.ts#L19" target="_blank" rel="noreferrer">src/k8s/config.ts:19</a></p><p>Standard annotation/label keys used to tag managed pod workloads.</p><h2 id="type-declaration" tabindex="-1">Type Declaration <a class="header-anchor" href="#type-declaration" aria-label="Permalink to &quot;Type Declaration&quot;">​</a></h2><h3 id="managed-by" tabindex="-1">MANAGED_BY <a class="header-anchor" href="#managed-by" aria-label="Permalink to &quot;MANAGED\\_BY&quot;">​</a></h3><blockquote><p><code>readonly</code> <strong>MANAGED_BY</strong>: <code>&quot;app.kubernetes.io/managed-by&quot;</code> = <code>&quot;app.kubernetes.io/managed-by&quot;</code></p></blockquote><h3 id="owner" tabindex="-1">OWNER <a class="header-anchor" href="#owner" aria-label="Permalink to &quot;OWNER&quot;">​</a></h3><blockquote><p><code>readonly</code> <strong>OWNER</strong>: <code>&quot;nogoo9.dev/owner&quot;</code> = <code>&quot;nogoo9.dev/owner&quot;</code></p></blockquote><h3 id="session" tabindex="-1">SESSION <a class="header-anchor" href="#session" aria-label="Permalink to &quot;SESSION&quot;">​</a></h3><blockquote><p><code>readonly</code> <strong>SESSION</strong>: <code>&quot;nogoo9.dev/session&quot;</code> = <code>&quot;nogoo9.dev/session&quot;</code></p></blockquote><h3 id="template" tabindex="-1">TEMPLATE <a class="header-anchor" href="#template" aria-label="Permalink to &quot;TEMPLATE&quot;">​</a></h3><blockquote><p><code>readonly</code> <strong>TEMPLATE</strong>: <code>&quot;nogoo9.dev/template&quot;</code> = <code>&quot;nogoo9.dev/template&quot;</code></p></blockquote></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/LABELS.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const LABELS = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  LABELS as default
};
