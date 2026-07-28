import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: encryptRefreshToken()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/encryptRefreshToken.md","filePath":"api/index/functions/encryptRefreshToken.md"}');
const _sfc_main = { name: "api/index/functions/encryptRefreshToken.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / encryptRefreshToken</p><h1 id="function-encryptrefreshtoken" tabindex="-1">Function: encryptRefreshToken() <a class="header-anchor" href="#function-encryptrefreshtoken" aria-label="Permalink to &quot;Function: encryptRefreshToken()&quot;">​</a></h1><blockquote><p><strong>encryptRefreshToken</strong>(<code>refreshToken</code>, <code>secret</code>): <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L458" target="_blank" rel="noreferrer">src/k8s/session.ts:458</a></p><p>AES-256-GCM encrypts a refresh token using a key derived from the session secret. Returns a dot-separated string: <code>base64url(iv).base64url(ciphertext).base64url(authTag)</code>.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="refreshtoken" tabindex="-1">refreshToken <a class="header-anchor" href="#refreshtoken" aria-label="Permalink to &quot;refreshToken&quot;">​</a></h3><p><code>string</code></p><h3 id="secret" tabindex="-1">secret <a class="header-anchor" href="#secret" aria-label="Permalink to &quot;secret&quot;">​</a></h3><p><code>string</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/encryptRefreshToken.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const encryptRefreshToken = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  encryptRefreshToken as default
};
