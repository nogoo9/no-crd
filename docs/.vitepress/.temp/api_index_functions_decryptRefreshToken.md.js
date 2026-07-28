import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: decryptRefreshToken()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/decryptRefreshToken.md","filePath":"api/index/functions/decryptRefreshToken.md"}');
const _sfc_main = { name: "api/index/functions/decryptRefreshToken.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / decryptRefreshToken</p><h1 id="function-decryptrefreshtoken" tabindex="-1">Function: decryptRefreshToken() <a class="header-anchor" href="#function-decryptrefreshtoken" aria-label="Permalink to &quot;Function: decryptRefreshToken()&quot;">​</a></h1><blockquote><p><strong>decryptRefreshToken</strong>(<code>encrypted</code>, <code>secret</code>): <code>string</code> | <code>null</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L478" target="_blank" rel="noreferrer">src/k8s/session.ts:478</a></p><p>AES-256-GCM decrypts an encrypted refresh token using the session secret. Returns the decrypted string, or <code>null</code> if verification/decryption fails.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="encrypted" tabindex="-1">encrypted <a class="header-anchor" href="#encrypted" aria-label="Permalink to &quot;encrypted&quot;">​</a></h3><p><code>string</code></p><h3 id="secret" tabindex="-1">secret <a class="header-anchor" href="#secret" aria-label="Permalink to &quot;secret&quot;">​</a></h3><p><code>string</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code> | <code>null</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/decryptRefreshToken.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const decryptRefreshToken = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  decryptRefreshToken as default
};
