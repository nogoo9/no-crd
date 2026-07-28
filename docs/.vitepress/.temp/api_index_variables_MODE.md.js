import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: MODE","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/MODE.md","filePath":"api/index/variables/MODE.md"}');
const _sfc_main = { name: "api/index/variables/MODE.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / MODE</p><h1 id="variable-mode" tabindex="-1">Variable: MODE <a class="header-anchor" href="#variable-mode" aria-label="Permalink to &quot;Variable: MODE&quot;">​</a></h1><blockquote><p><code>const</code> <strong>MODE</strong>: <code>&quot;cluster&quot;</code> | <code>&quot;namespaced&quot;</code> = <code>config.k8s.mode</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/config.ts#L13" target="_blank" rel="noreferrer">src/k8s/config.ts:13</a></p><p>Access mode for the orchestration manager.</p><ul><li><code>&quot;cluster&quot;</code>: Allows operating across all namespaces if permissions permit.</li><li><code>&quot;namespaced&quot;</code>: Locks the server operation to a single namespace.</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/MODE.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const MODE = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  MODE as default
};
