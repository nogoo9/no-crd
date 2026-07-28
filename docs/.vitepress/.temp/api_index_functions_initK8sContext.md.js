import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: initK8sContext()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/initK8sContext.md","filePath":"api/index/functions/initK8sContext.md"}');
const _sfc_main = { name: "api/index/functions/initK8sContext.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / initK8sContext</p><h1 id="function-initk8scontext" tabindex="-1">Function: initK8sContext() <a class="header-anchor" href="#function-initk8scontext" aria-label="Permalink to &quot;Function: initK8sContext()&quot;">​</a></h1><blockquote><p><strong>initK8sContext</strong>(<code>customKc?</code>): <a href="./../interfaces/K8sContext.html"><code>K8sContext</code></a></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/client.ts#L178" target="_blank" rel="noreferrer">src/k8s/client.ts:178</a></p><p>Initializes and packages the active Kubernetes context (KubeConfig and default API client). Performs setup tasks like reading local kubeconfig or configuring Node TLS bypass.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="customkc" tabindex="-1">customKc? <a class="header-anchor" href="#customkc" aria-label="Permalink to &quot;customKc?&quot;">​</a></h3><p><code>KubeConfig</code></p><p>Optional pre-configured KubeConfig context (highly useful for test isolation/stubs).</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><a href="./../interfaces/K8sContext.html"><code>K8sContext</code></a></p><p>The packaged K8sContext object containing the config and client instance.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/initK8sContext.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const initK8sContext = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  initK8sContext as default
};
