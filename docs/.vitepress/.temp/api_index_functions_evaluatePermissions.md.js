import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: evaluatePermissions()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/evaluatePermissions.md","filePath":"api/index/functions/evaluatePermissions.md"}');
const _sfc_main = { name: "api/index/functions/evaluatePermissions.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / evaluatePermissions</p><h1 id="function-evaluatepermissions" tabindex="-1">Function: evaluatePermissions() <a class="header-anchor" href="#function-evaluatepermissions" aria-label="Permalink to &quot;Function: evaluatePermissions()&quot;">​</a></h1><blockquote><p><strong>evaluatePermissions</strong>(<code>k8sContext</code>, <code>namespace</code>, <code>mode</code>, <code>forceRefresh?</code>): <code>Promise</code>&lt;<a href="./../interfaces/PermissionReport.html"><code>PermissionReport</code></a>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/permissions.ts#L138" target="_blank" rel="noreferrer">src/k8s/permissions.ts:138</a></p><p>Evaluates the required permissions for all registered MCP tools and constructs a PermissionReport. Under <code>&quot;namespaced&quot;</code> mode, some checks (such as namespace listing) are adjusted/bypassed. Uses caching to optimize startup and requests unless <code>forceRefresh</code> is enabled.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="k8scontext" tabindex="-1">k8sContext <a class="header-anchor" href="#k8scontext" aria-label="Permalink to &quot;k8sContext&quot;">​</a></h3><p><a href="./../interfaces/K8sContext.html"><code>K8sContext</code></a></p><p>Active K8sContext containing API clients.</p><h3 id="namespace" tabindex="-1">namespace <a class="header-anchor" href="#namespace" aria-label="Permalink to &quot;namespace&quot;">​</a></h3><p><code>string</code></p><p>The default namespace parameter.</p><h3 id="mode" tabindex="-1">mode <a class="header-anchor" href="#mode" aria-label="Permalink to &quot;mode&quot;">​</a></h3><p><code>string</code></p><p>The active mode (cluster or namespaced).</p><h3 id="forcerefresh" tabindex="-1">forceRefresh? <a class="header-anchor" href="#forcerefresh" aria-label="Permalink to &quot;forceRefresh?&quot;">​</a></h3><p><code>boolean</code> = <code>false</code></p><p>Force reloading permissions even if cached report exists.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<a href="./../interfaces/PermissionReport.html"><code>PermissionReport</code></a>&gt;</p><p>Structured PermissionReport containing permitted verbs and enabled/disabled lists.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/evaluatePermissions.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const evaluatePermissions = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  evaluatePermissions as default
};
