import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: extractTokenFromCookie()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/extractTokenFromCookie.md","filePath":"api/index/functions/extractTokenFromCookie.md"}');
const _sfc_main = { name: "api/index/functions/extractTokenFromCookie.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / extractTokenFromCookie</p><h1 id="function-extracttokenfromcookie" tabindex="-1">Function: extractTokenFromCookie() <a class="header-anchor" href="#function-extracttokenfromcookie" aria-label="Permalink to &quot;Function: extractTokenFromCookie()&quot;">​</a></h1><blockquote><p><strong>extractTokenFromCookie</strong>(<code>cookieHeader</code>, <code>cookieName?</code>): <code>string</code> | <code>undefined</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/auth.ts#L401" target="_blank" rel="noreferrer">src/k8s/auth.ts:401</a></p><p>Utility to extract a cookie value from a <code>Cookie</code> header.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="cookieheader" tabindex="-1">cookieHeader <a class="header-anchor" href="#cookieheader" aria-label="Permalink to &quot;cookieHeader&quot;">​</a></h3><p><code>string</code> | <code>null</code> | <code>undefined</code></p><p>The raw <code>Cookie</code> header value.</p><h3 id="cookiename" tabindex="-1">cookieName? <a class="header-anchor" href="#cookiename" aria-label="Permalink to &quot;cookieName?&quot;">​</a></h3><p><code>string</code> = <code>&quot;nocr_token&quot;</code></p><p>The name of the cookie to extract. Defaults to <code>&quot;nocr_token&quot;</code>.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code> | <code>undefined</code></p><p>The cookie value, or undefined if not found.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/extractTokenFromCookie.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const extractTokenFromCookie = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  extractTokenFromCookie as default
};
