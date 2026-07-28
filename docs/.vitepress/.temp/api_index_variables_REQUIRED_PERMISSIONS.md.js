import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: REQUIRED_PERMISSIONS","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/REQUIRED_PERMISSIONS.md","filePath":"api/index/variables/REQUIRED_PERMISSIONS.md"}');
const _sfc_main = { name: "api/index/variables/REQUIRED_PERMISSIONS.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / REQUIRED_PERMISSIONS</p><h1 id="variable-required-permissions" tabindex="-1">Variable: REQUIRED_PERMISSIONS <a class="header-anchor" href="#variable-required-permissions" aria-label="Permalink to &quot;Variable: REQUIRED\\_PERMISSIONS&quot;">​</a></h1><blockquote><p><code>const</code> <strong>REQUIRED_PERMISSIONS</strong>: <code>Record</code>&lt;<code>string</code>, <a href="./../interfaces/RbacPermission.html"><code>RbacPermission</code></a>[]&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/permissions.ts#L13" target="_blank" rel="noreferrer">src/k8s/permissions.ts:13</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/REQUIRED_PERMISSIONS.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const REQUIRED_PERMISSIONS = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  REQUIRED_PERMISSIONS as default
};
