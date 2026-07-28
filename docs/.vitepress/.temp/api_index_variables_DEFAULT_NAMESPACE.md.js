import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: DEFAULT_NAMESPACE","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/DEFAULT_NAMESPACE.md","filePath":"api/index/variables/DEFAULT_NAMESPACE.md"}');
const _sfc_main = { name: "api/index/variables/DEFAULT_NAMESPACE.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / DEFAULT_NAMESPACE</p><h1 id="variable-default-namespace" tabindex="-1">Variable: DEFAULT_NAMESPACE <a class="header-anchor" href="#variable-default-namespace" aria-label="Permalink to &quot;Variable: DEFAULT\\_NAMESPACE&quot;">​</a></h1><blockquote><p><code>const</code> <strong>DEFAULT_NAMESPACE</strong>: <code>string</code> = <code>config.k8s.namespace</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/config.ts#L16" target="_blank" rel="noreferrer">src/k8s/config.ts:16</a></p><p>Default Kubernetes namespace to fallback onto.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/DEFAULT_NAMESPACE.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const DEFAULT_NAMESPACE = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  DEFAULT_NAMESPACE as default
};
