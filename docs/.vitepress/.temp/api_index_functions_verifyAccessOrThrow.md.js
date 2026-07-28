import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: verifyAccessOrThrow()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/verifyAccessOrThrow.md","filePath":"api/index/functions/verifyAccessOrThrow.md"}');
const _sfc_main = { name: "api/index/functions/verifyAccessOrThrow.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / verifyAccessOrThrow</p><h1 id="function-verifyaccessorthrow" tabindex="-1">Function: verifyAccessOrThrow() <a class="header-anchor" href="#function-verifyaccessorthrow" aria-label="Permalink to &quot;Function: verifyAccessOrThrow()&quot;">​</a></h1><blockquote><p><strong>verifyAccessOrThrow</strong>(<code>jwtPayload</code>, <code>action</code>): <code>void</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/auth.ts#L620" target="_blank" rel="noreferrer">src/k8s/auth.ts:620</a></p><p>Verifies both scope and role constraints against the JWT payload for a given action.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="jwtpayload" tabindex="-1">jwtPayload <a class="header-anchor" href="#jwtpayload" aria-label="Permalink to &quot;jwtPayload&quot;">​</a></h3><p><code>unknown</code></p><h3 id="action" tabindex="-1">action <a class="header-anchor" href="#action" aria-label="Permalink to &quot;action&quot;">​</a></h3><p><code>&quot;admin&quot;</code> | <code>&quot;read&quot;</code> | <code>&quot;write&quot;</code> | <code>&quot;workspace:write&quot;</code> | <code>&quot;template:create&quot;</code> | <code>&quot;template:write&quot;</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>void</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/verifyAccessOrThrow.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const verifyAccessOrThrow = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  verifyAccessOrThrow as default
};
