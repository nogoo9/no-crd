import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: extractAdminRole()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/extractAdminRole.md","filePath":"api/index/functions/extractAdminRole.md"}');
const _sfc_main = { name: "api/index/functions/extractAdminRole.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / extractAdminRole</p><h1 id="function-extractadminrole" tabindex="-1">Function: extractAdminRole() <a class="header-anchor" href="#function-extractadminrole" aria-label="Permalink to &quot;Function: extractAdminRole()&quot;">​</a></h1><blockquote><p><strong>extractAdminRole</strong>(<code>jwtPayload</code>, <code>jsonPathExpr?</code>, <code>adminRole?</code>): <code>boolean</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/auth.ts#L355" target="_blank" rel="noreferrer">src/k8s/auth.ts:355</a></p><p>Extracts the user&#39;s roles from a decrypted JWT payload using JSONPath. Checks if the configured admin role is present in those roles.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="jwtpayload" tabindex="-1">jwtPayload <a class="header-anchor" href="#jwtpayload" aria-label="Permalink to &quot;jwtPayload&quot;">​</a></h3><p><code>unknown</code></p><p>Decrypted JWT payload dictionary.</p><h3 id="jsonpathexpr" tabindex="-1">jsonPathExpr? <a class="header-anchor" href="#jsonpathexpr" aria-label="Permalink to &quot;jsonPathExpr?&quot;">​</a></h3><p><code>string</code> = <code>&quot;$.realm_access.roles&quot;</code></p><p>JSONPath expression specifying where the roles array resides. Defaults to <code>&quot;$.realm_access.roles&quot;</code>.</p><h3 id="adminrole" tabindex="-1">adminRole? <a class="header-anchor" href="#adminrole" aria-label="Permalink to &quot;adminRole?&quot;">​</a></h3><p><code>string</code> = <code>&quot;nogoo9-admin&quot;</code></p><p>Name of the admin role to check for. Defaults to <code>&quot;nogoo9-admin&quot;</code>.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>boolean</code></p><p>true if the user has the admin role, false otherwise.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/extractAdminRole.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const extractAdminRole = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  extractAdminRole as default
};
