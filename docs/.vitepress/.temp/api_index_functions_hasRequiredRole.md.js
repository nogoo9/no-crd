import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: hasRequiredRole()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/hasRequiredRole.md","filePath":"api/index/functions/hasRequiredRole.md"}');
const _sfc_main = { name: "api/index/functions/hasRequiredRole.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / hasRequiredRole</p><h1 id="function-hasrequiredrole" tabindex="-1">Function: hasRequiredRole() <a class="header-anchor" href="#function-hasrequiredrole" aria-label="Permalink to &quot;Function: hasRequiredRole()&quot;">​</a></h1><blockquote><p><strong>hasRequiredRole</strong>(<code>jwtPayload</code>, <code>requiredRole?</code>, <code>jsonPathExpr?</code>): <code>boolean</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/auth.ts#L528" target="_blank" rel="noreferrer">src/k8s/auth.ts:528</a></p><p>Checks if the JWT payload contains the required role. Supports checking standard roles arrays or strings, and always allows admins.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="jwtpayload" tabindex="-1">jwtPayload <a class="header-anchor" href="#jwtpayload" aria-label="Permalink to &quot;jwtPayload&quot;">​</a></h3><p><code>unknown</code></p><p>Decrypted JWT payload dictionary.</p><h3 id="requiredrole" tabindex="-1">requiredRole? <a class="header-anchor" href="#requiredrole" aria-label="Permalink to &quot;requiredRole?&quot;">​</a></h3><p><code>string</code></p><p>The required role string (e.g., &quot;mcp-reader&quot;). If undefined, returns true.</p><h3 id="jsonpathexpr" tabindex="-1">jsonPathExpr? <a class="header-anchor" href="#jsonpathexpr" aria-label="Permalink to &quot;jsonPathExpr?&quot;">​</a></h3><p><code>string</code> = <code>&quot;$.realm_access.roles&quot;</code></p><p>JSONPath expression specifying where the roles claim resides. Defaults to &quot;$.realm_access.roles&quot;.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>boolean</code></p><p>true if role is present/valid, false otherwise.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/hasRequiredRole.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const hasRequiredRole = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  hasRequiredRole as default
};
