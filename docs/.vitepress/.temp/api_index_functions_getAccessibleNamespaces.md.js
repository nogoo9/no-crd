import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: getAccessibleNamespaces()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/getAccessibleNamespaces.md","filePath":"api/index/functions/getAccessibleNamespaces.md"}');
const _sfc_main = { name: "api/index/functions/getAccessibleNamespaces.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / getAccessibleNamespaces</p><h1 id="function-getaccessiblenamespaces" tabindex="-1">Function: getAccessibleNamespaces() <a class="header-anchor" href="#function-getaccessiblenamespaces" aria-label="Permalink to &quot;Function: getAccessibleNamespaces()&quot;">​</a></h1><blockquote><p><strong>getAccessibleNamespaces</strong>(<code>api</code>, <code>mode</code>, <code>defaultNs</code>): <code>Promise</code>&lt;<code>string</code>[]&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/config.ts#L61" target="_blank" rel="noreferrer">src/k8s/config.ts:61</a></p><p>Discovers namespaces accessible by checking pod listing authorization. If cluster-level namespace listing is forbidden, falls back to the default namespace.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="api" tabindex="-1">api <a class="header-anchor" href="#api" aria-label="Permalink to &quot;api&quot;">​</a></h3><p><code>ObjectCoreV1Api</code></p><p>CoreV1Api client dependency.</p><h3 id="mode" tabindex="-1">mode <a class="header-anchor" href="#mode" aria-label="Permalink to &quot;mode&quot;">​</a></h3><p><code>string</code></p><p>Current operation mode (cluster or namespaced).</p><h3 id="defaultns" tabindex="-1">defaultNs <a class="header-anchor" href="#defaultns" aria-label="Permalink to &quot;defaultNs&quot;">​</a></h3><p><code>string</code></p><p>Default namespace fallback.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>string</code>[]&gt;</p><p>Array of namespaces that are verified accessible.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/getAccessibleNamespaces.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const getAccessibleNamespaces = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  getAccessibleNamespaces as default
};
