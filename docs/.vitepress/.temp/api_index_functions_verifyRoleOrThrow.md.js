import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: verifyRoleOrThrow()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/verifyRoleOrThrow.md","filePath":"api/index/functions/verifyRoleOrThrow.md"}');
const _sfc_main = { name: "api/index/functions/verifyRoleOrThrow.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / verifyRoleOrThrow</p><h1 id="function-verifyroleorthrow" tabindex="-1">Function: verifyRoleOrThrow() <a class="header-anchor" href="#function-verifyroleorthrow" aria-label="Permalink to &quot;Function: verifyRoleOrThrow()&quot;">​</a></h1><blockquote><p><strong>verifyRoleOrThrow</strong>(<code>jwtPayload</code>, <code>requiredRole?</code>, <code>jsonPathExpr?</code>): <code>void</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/auth.ts#L604" target="_blank" rel="noreferrer">src/k8s/auth.ts:604</a></p><p>Validates role against JWT payload, throwing a clear error if mismatch.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="jwtpayload" tabindex="-1">jwtPayload <a class="header-anchor" href="#jwtpayload" aria-label="Permalink to &quot;jwtPayload&quot;">​</a></h3><p><code>unknown</code></p><h3 id="requiredrole" tabindex="-1">requiredRole? <a class="header-anchor" href="#requiredrole" aria-label="Permalink to &quot;requiredRole?&quot;">​</a></h3><p><code>string</code></p><h3 id="jsonpathexpr" tabindex="-1">jsonPathExpr? <a class="header-anchor" href="#jsonpathexpr" aria-label="Permalink to &quot;jsonPathExpr?&quot;">​</a></h3><p><code>string</code> = <code>&quot;$.realm_access.roles&quot;</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>void</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/verifyRoleOrThrow.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const verifyRoleOrThrow = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  verifyRoleOrThrow as default
};
