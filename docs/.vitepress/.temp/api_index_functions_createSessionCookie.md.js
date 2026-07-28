import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: createSessionCookie()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/createSessionCookie.md","filePath":"api/index/functions/createSessionCookie.md"}');
const _sfc_main = { name: "api/index/functions/createSessionCookie.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / createSessionCookie</p><h1 id="function-createsessioncookie" tabindex="-1">Function: createSessionCookie() <a class="header-anchor" href="#function-createsessioncookie" aria-label="Permalink to &quot;Function: createSessionCookie()&quot;">​</a></h1><blockquote><p><strong>createSessionCookie</strong>(<code>jwtPayload</code>, <code>secret</code>, <code>ttlSeconds</code>, <code>subJsonPath?</code>, <code>rolesJsonPath?</code>): <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L283" target="_blank" rel="noreferrer">src/k8s/session.ts:283</a></p><p>Creates an HMAC-SHA256 signed session cookie value from JWT claims.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="jwtpayload" tabindex="-1">jwtPayload <a class="header-anchor" href="#jwtpayload" aria-label="Permalink to &quot;jwtPayload&quot;">​</a></h3><p><code>Record</code>&lt;<code>string</code>, <code>unknown</code>&gt;</p><p>Original JWT payload.</p><h3 id="secret" tabindex="-1">secret <a class="header-anchor" href="#secret" aria-label="Permalink to &quot;secret&quot;">​</a></h3><p><code>string</code></p><p>HMAC signing key.</p><h3 id="ttlseconds" tabindex="-1">ttlSeconds <a class="header-anchor" href="#ttlseconds" aria-label="Permalink to &quot;ttlSeconds&quot;">​</a></h3><p><code>number</code></p><p>Cookie TTL in seconds.</p><h3 id="subjsonpath" tabindex="-1">subJsonPath? <a class="header-anchor" href="#subjsonpath" aria-label="Permalink to &quot;subJsonPath?&quot;">​</a></h3><p><code>string</code> = <code>&quot;$.sub&quot;</code></p><p>JSONPath to extract <code>sub</code> from the JWT payload.</p><h3 id="rolesjsonpath" tabindex="-1">rolesJsonPath? <a class="header-anchor" href="#rolesjsonpath" aria-label="Permalink to &quot;rolesJsonPath?&quot;">​</a></h3><p><code>string</code> = <code>&quot;$.realm_access.roles&quot;</code></p><p>JSONPath to extract <code>roles</code> from the JWT payload.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>string</code></p><p>Cookie value string: <code>base64url(json_payload).signature</code>.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/createSessionCookie.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const createSessionCookie = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  createSessionCookie as default
};
