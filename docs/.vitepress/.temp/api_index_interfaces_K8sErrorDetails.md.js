import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Interface: K8sErrorDetails","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/interfaces/K8sErrorDetails.md","filePath":"api/index/interfaces/K8sErrorDetails.md"}');
const _sfc_main = { name: "api/index/interfaces/K8sErrorDetails.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / K8sErrorDetails</p><h1 id="interface-k8serrordetails" tabindex="-1">Interface: K8sErrorDetails <a class="header-anchor" href="#interface-k8serrordetails" aria-label="Permalink to &quot;Interface: K8sErrorDetails&quot;">​</a></h1><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/errors.ts#L24" target="_blank" rel="noreferrer">src/k8s/errors.ts:24</a></p><p>Represents structured details extracted from a Kubernetes API error.</p><h2 id="properties" tabindex="-1">Properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;Properties&quot;">​</a></h2><h3 id="body" tabindex="-1">body? <a class="header-anchor" href="#body" aria-label="Permalink to &quot;body?&quot;">​</a></h3><blockquote><p><code>optional</code> <strong>body?</strong>: <code>unknown</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/errors.ts#L28" target="_blank" rel="noreferrer">src/k8s/errors.ts:28</a></p><p>Response body from the API server (usually contains error message string or object).</p><hr><h3 id="statuscode" tabindex="-1">statusCode? <a class="header-anchor" href="#statuscode" aria-label="Permalink to &quot;statusCode?&quot;">​</a></h3><blockquote><p><code>optional</code> <strong>statusCode?</strong>: <code>number</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/errors.ts#L26" target="_blank" rel="noreferrer">src/k8s/errors.ts:26</a></p><p>HTTP status code returned by the API server (e.g. 404, 409).</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/interfaces/K8sErrorDetails.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const K8sErrorDetails = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  K8sErrorDetails as default
};
