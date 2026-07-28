import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: extractUserIdentity()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/extractUserIdentity.md","filePath":"api/index/functions/extractUserIdentity.md"}');
const _sfc_main = { name: "api/index/functions/extractUserIdentity.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / extractUserIdentity</p><h1 id="function-extractuseridentity" tabindex="-1">Function: extractUserIdentity() <a class="header-anchor" href="#function-extractuseridentity" aria-label="Permalink to &quot;Function: extractUserIdentity()&quot;">​</a></h1><blockquote><p><strong>extractUserIdentity</strong>(<code>jwtPayload</code>, <code>jsonPathExpr?</code>): <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/auth/jwt-parser.ts#L15" target="_blank" rel="noreferrer">src/auth/jwt-parser.ts:15</a></p><p>Extracts the user sub/identity identifier from a decrypted JWT payload object. Evaluates the specified JsonPath expression (e.g. <code>&quot;$.sub&quot;</code> or <code>&quot;$.identity&quot;</code>) against the payload.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="jwtpayload" tabindex="-1">jwtPayload <a class="header-anchor" href="#jwtpayload" aria-label="Permalink to &quot;jwtPayload&quot;">​</a></h3><p><code>unknown</code></p><p>Decrypted JWT payload dictionary.</p><h3 id="jsonpathexpr" tabindex="-1">jsonPathExpr? <a class="header-anchor" href="#jsonpathexpr" aria-label="Permalink to &quot;jsonPathExpr?&quot;">​</a></h3><p><code>string</code> = <code>&quot;$.sub&quot;</code></p><p>JSONPath expression specifying where the identity claim resides. Defaults to <code>&quot;$.sub&quot;</code>.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code></p><p>The resolved identity string.</p><h2 id="throws" tabindex="-1">Throws <a class="header-anchor" href="#throws" aria-label="Permalink to &quot;Throws&quot;">​</a></h2><p>An Error if the identity claim is missing or invalid.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/extractUserIdentity.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const extractUserIdentity = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  extractUserIdentity as default
};
