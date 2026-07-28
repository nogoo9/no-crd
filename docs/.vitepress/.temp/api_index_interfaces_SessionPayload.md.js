import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Interface: SessionPayload","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/interfaces/SessionPayload.md","filePath":"api/index/interfaces/SessionPayload.md"}');
const _sfc_main = { name: "api/index/interfaces/SessionPayload.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / SessionPayload</p><h1 id="interface-sessionpayload" tabindex="-1">Interface: SessionPayload <a class="header-anchor" href="#interface-sessionpayload" aria-label="Permalink to &quot;Interface: SessionPayload&quot;">​</a></h1><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L24" target="_blank" rel="noreferrer">src/k8s/session.ts:24</a></p><p>Minimal claims extracted from the original JWT, carried in the session cookie.</p><h2 id="properties" tabindex="-1">Properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;Properties&quot;">​</a></h2><h3 id="exp" tabindex="-1">exp <a class="header-anchor" href="#exp" aria-label="Permalink to &quot;exp&quot;">​</a></h3><blockquote><p><strong>exp</strong>: <code>number</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L28" target="_blank" rel="noreferrer">src/k8s/session.ts:28</a></p><hr><h3 id="iat" tabindex="-1">iat <a class="header-anchor" href="#iat" aria-label="Permalink to &quot;iat&quot;">​</a></h3><blockquote><p><strong>iat</strong>: <code>number</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L27" target="_blank" rel="noreferrer">src/k8s/session.ts:27</a></p><hr><h3 id="roles" tabindex="-1">roles <a class="header-anchor" href="#roles" aria-label="Permalink to &quot;roles&quot;">​</a></h3><blockquote><p><strong>roles</strong>: <code>string</code>[]</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L26" target="_blank" rel="noreferrer">src/k8s/session.ts:26</a></p><hr><h3 id="sub" tabindex="-1">sub <a class="header-anchor" href="#sub" aria-label="Permalink to &quot;sub&quot;">​</a></h3><blockquote><p><strong>sub</strong>: <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L25" target="_blank" rel="noreferrer">src/k8s/session.ts:25</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/interfaces/SessionPayload.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const SessionPayload = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  SessionPayload as default
};
