import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: verifyToken()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/verifyToken.md","filePath":"api/index/functions/verifyToken.md"}');
const _sfc_main = { name: "api/index/functions/verifyToken.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / verifyToken</p><h1 id="function-verifytoken" tabindex="-1">Function: verifyToken() <a class="header-anchor" href="#function-verifytoken" aria-label="Permalink to &quot;Function: verifyToken()&quot;">​</a></h1><blockquote><p><strong>verifyToken</strong>(<code>token</code>, <code>expectedAudience?</code>): <code>Promise</code>&lt;<code>any</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/auth.ts#L149" target="_blank" rel="noreferrer">src/k8s/auth.ts:149</a></p><p>Verifies a token&#39;s signature and expiration, returning its payload. Supports symmetric HMAC (HS256), asymmetric public key PEM (RS256/ES256), dynamic JWKS URL keys, and OAuth Token Introspection (RFC 7662).</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="token" tabindex="-1">token <a class="header-anchor" href="#token" aria-label="Permalink to &quot;token&quot;">​</a></h3><p><code>string</code></p><h3 id="expectedaudience" tabindex="-1">expectedAudience? <a class="header-anchor" href="#expectedaudience" aria-label="Permalink to &quot;expectedAudience?&quot;">​</a></h3><p><code>string</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>any</code>&gt;</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/verifyToken.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const verifyToken = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  verifyToken as default
};
