import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: checkPermission()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/checkPermission.md","filePath":"api/index/functions/checkPermission.md"}');
const _sfc_main = { name: "api/index/functions/checkPermission.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / checkPermission</p><h1 id="function-checkpermission" tabindex="-1">Function: checkPermission() <a class="header-anchor" href="#function-checkpermission" aria-label="Permalink to &quot;Function: checkPermission()&quot;">​</a></h1><blockquote><p><strong>checkPermission</strong>(<code>authApi</code>, <code>verb</code>, <code>resource</code>, <code>namespace</code>): <code>Promise</code>&lt;<code>boolean</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/permissions.ts#L75" target="_blank" rel="noreferrer">src/k8s/permissions.ts:75</a></p><p>Checks a specific Kubernetes RBAC permission using the SelfSubjectAccessReview API. Always returns true if <code>DISABLE_PERMISSION_CHECKS</code> environment variable is active.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="authapi" tabindex="-1">authApi <a class="header-anchor" href="#authapi" aria-label="Permalink to &quot;authApi&quot;">​</a></h3><p><code>ObjectAuthorizationV1Api</code></p><p>AuthorizationV1Api client dependency.</p><h3 id="verb" tabindex="-1">verb <a class="header-anchor" href="#verb" aria-label="Permalink to &quot;verb&quot;">​</a></h3><p><code>string</code></p><p>The API verb to check (e.g. &quot;list&quot;, &quot;create&quot;).</p><h3 id="resource" tabindex="-1">resource <a class="header-anchor" href="#resource" aria-label="Permalink to &quot;resource&quot;">​</a></h3><p><code>string</code></p><p>The Kubernetes resource name (e.g. &quot;pods&quot;, &quot;configmaps&quot;).</p><h3 id="namespace" tabindex="-1">namespace <a class="header-anchor" href="#namespace" aria-label="Permalink to &quot;namespace&quot;">​</a></h3><p><code>string</code></p><p>The target namespace.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>boolean</code>&gt;</p><p>Promise resolving to true if authorization is granted.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/checkPermission.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const checkPermission = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  checkPermission as default
};
