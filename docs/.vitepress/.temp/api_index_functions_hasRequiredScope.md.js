import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: hasRequiredScope()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/hasRequiredScope.md","filePath":"api/index/functions/hasRequiredScope.md"}');
const _sfc_main = { name: "api/index/functions/hasRequiredScope.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / hasRequiredScope</p><h1 id="function-hasrequiredscope" tabindex="-1">Function: hasRequiredScope() <a class="header-anchor" href="#function-hasrequiredscope" aria-label="Permalink to &quot;Function: hasRequiredScope()&quot;">​</a></h1><blockquote><p><strong>hasRequiredScope</strong>(<code>jwtPayload</code>, <code>requiredScope?</code>, <code>jsonPathExpr?</code>, <code>strict?</code>): <code>boolean</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/auth.ts#L426" target="_blank" rel="noreferrer">src/k8s/auth.ts:426</a></p><p>Checks if the JWT payload contains the required scope. Supports both space-separated scope strings and array of scopes.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="jwtpayload" tabindex="-1">jwtPayload <a class="header-anchor" href="#jwtpayload" aria-label="Permalink to &quot;jwtPayload&quot;">​</a></h3><p><code>unknown</code></p><p>Decrypted JWT payload dictionary.</p><h3 id="requiredscope" tabindex="-1">requiredScope? <a class="header-anchor" href="#requiredscope" aria-label="Permalink to &quot;requiredScope?&quot;">​</a></h3><p><code>string</code></p><p>The required scope string (e.g., &quot;mcp:read&quot;). If undefined, returns true.</p><h3 id="jsonpathexpr" tabindex="-1">jsonPathExpr? <a class="header-anchor" href="#jsonpathexpr" aria-label="Permalink to &quot;jsonPathExpr?&quot;">​</a></h3><p><code>string</code> = <code>&quot;$.scope&quot;</code></p><p>JSONPath expression specifying where the scope claim resides. Defaults to &quot;$.scope&quot;.</p><h3 id="strict" tabindex="-1">strict? <a class="header-anchor" href="#strict" aria-label="Permalink to &quot;strict?&quot;">​</a></h3><p><code>boolean</code> = <code>false</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>boolean</code></p><p>true if scope is present/valid, false otherwise.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/hasRequiredScope.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const hasRequiredScope = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  hasRequiredScope as default
};
