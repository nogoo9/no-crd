import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: verifySessionCookie()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/verifySessionCookie.md","filePath":"api/index/functions/verifySessionCookie.md"}');
const _sfc_main = { name: "api/index/functions/verifySessionCookie.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / verifySessionCookie</p><h1 id="function-verifysessioncookie" tabindex="-1">Function: verifySessionCookie() <a class="header-anchor" href="#function-verifysessioncookie" aria-label="Permalink to &quot;Function: verifySessionCookie()&quot;">​</a></h1><blockquote><p><strong>verifySessionCookie</strong>(<code>cookie</code>, <code>secret</code>): <a href="./../interfaces/SessionPayload.html"><code>SessionPayload</code></a> | <code>null</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L321" target="_blank" rel="noreferrer">src/k8s/session.ts:321</a></p><p>Verifies an HMAC-signed session cookie and returns the payload if valid.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="cookie" tabindex="-1">cookie <a class="header-anchor" href="#cookie" aria-label="Permalink to &quot;cookie&quot;">​</a></h3><p><code>string</code></p><p>Raw cookie value (<code>payload.signature</code>).</p><h3 id="secret" tabindex="-1">secret <a class="header-anchor" href="#secret" aria-label="Permalink to &quot;secret&quot;">​</a></h3><p><code>string</code></p><p>HMAC signing key.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><a href="./../interfaces/SessionPayload.html"><code>SessionPayload</code></a> | <code>null</code></p><p>Decoded session payload, or <code>null</code> if invalid/expired/tampered.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/verifySessionCookie.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const verifySessionCookie = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  verifySessionCookie as default
};
