import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: getK8sError()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/getK8sError.md","filePath":"api/index/functions/getK8sError.md"}');
const _sfc_main = { name: "api/index/functions/getK8sError.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / getK8sError</p><h1 id="function-getk8serror" tabindex="-1">Function: getK8sError() <a class="header-anchor" href="#function-getk8serror" aria-label="Permalink to &quot;Function: getK8sError()&quot;">​</a></h1><blockquote><p><strong>getK8sError</strong>(<code>err</code>): <a href="./../interfaces/K8sErrorDetails.html"><code>K8sErrorDetails</code></a></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/errors.ts#L37" target="_blank" rel="noreferrer">src/k8s/errors.ts:37</a></p><p>Normalizes a thrown error and attempts to extract Kubernetes API-specific HTTP details.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="err" tabindex="-1">err <a class="header-anchor" href="#err" aria-label="Permalink to &quot;err&quot;">​</a></h3><p><code>unknown</code></p><p>The thrown error object.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><a href="./../interfaces/K8sErrorDetails.html"><code>K8sErrorDetails</code></a></p><p>Structured error details with statusCode and body if found.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/getK8sError.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const getK8sError = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  getK8sError as default
};
