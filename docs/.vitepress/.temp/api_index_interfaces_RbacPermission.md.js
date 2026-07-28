import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Interface: RbacPermission","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/interfaces/RbacPermission.md","filePath":"api/index/interfaces/RbacPermission.md"}');
const _sfc_main = { name: "api/index/interfaces/RbacPermission.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / RbacPermission</p><h1 id="interface-rbacpermission" tabindex="-1">Interface: RbacPermission <a class="header-anchor" href="#interface-rbacpermission" aria-label="Permalink to &quot;Interface: RbacPermission&quot;">​</a></h1><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/permissions.ts#L8" target="_blank" rel="noreferrer">src/k8s/permissions.ts:8</a></p><h2 id="properties" tabindex="-1">Properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;Properties&quot;">​</a></h2><h3 id="resource" tabindex="-1">resource <a class="header-anchor" href="#resource" aria-label="Permalink to &quot;resource&quot;">​</a></h3><blockquote><p><strong>resource</strong>: <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/permissions.ts#L10" target="_blank" rel="noreferrer">src/k8s/permissions.ts:10</a></p><hr><h3 id="verb" tabindex="-1">verb <a class="header-anchor" href="#verb" aria-label="Permalink to &quot;verb&quot;">​</a></h3><blockquote><p><strong>verb</strong>: <code>string</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/permissions.ts#L9" target="_blank" rel="noreferrer">src/k8s/permissions.ts:9</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/interfaces/RbacPermission.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RbacPermission = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RbacPermission as default
};
