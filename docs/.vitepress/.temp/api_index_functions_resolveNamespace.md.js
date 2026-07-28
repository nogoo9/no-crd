import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: resolveNamespace()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/resolveNamespace.md","filePath":"api/index/functions/resolveNamespace.md"}');
const _sfc_main = { name: "api/index/functions/resolveNamespace.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / resolveNamespace</p><h1 id="function-resolvenamespace" tabindex="-1">Function: resolveNamespace() <a class="header-anchor" href="#function-resolvenamespace" aria-label="Permalink to &quot;Function: resolveNamespace()&quot;">​</a></h1><blockquote><p><strong>resolveNamespace</strong>(<code>requested</code>, <code>mode</code>, <code>defaultNs</code>): <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/config.ts#L35" target="_blank" rel="noreferrer">src/k8s/config.ts:35</a></p><p>Resolves the target namespace based on the current mode and requested namespace. Under <code>&quot;namespaced&quot;</code> mode, always returns the locked default namespace.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="requested" tabindex="-1">requested <a class="header-anchor" href="#requested" aria-label="Permalink to &quot;requested&quot;">​</a></h3><p><code>string</code> | <code>undefined</code></p><p>The requested namespace parameter.</p><h3 id="mode" tabindex="-1">mode <a class="header-anchor" href="#mode" aria-label="Permalink to &quot;mode&quot;">​</a></h3><p><code>string</code></p><p>The current active MODE.</p><h3 id="defaultns" tabindex="-1">defaultNs <a class="header-anchor" href="#defaultns" aria-label="Permalink to &quot;defaultNs&quot;">​</a></h3><p><code>string</code></p><p>The default namespace fallback.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code></p><p>The resolved namespace to execute workloads in.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/resolveNamespace.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const resolveNamespace = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  resolveNamespace as default
};
