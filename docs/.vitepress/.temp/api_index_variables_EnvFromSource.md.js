import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: EnvFromSource","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/EnvFromSource.md","filePath":"api/index/variables/EnvFromSource.md"}');
const _sfc_main = { name: "api/index/variables/EnvFromSource.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / EnvFromSource</p><h1 id="variable-envfromsource" tabindex="-1">Variable: EnvFromSource <a class="header-anchor" href="#variable-envfromsource" aria-label="Permalink to &quot;Variable: EnvFromSource&quot;">​</a></h1><blockquote><p><code>const</code> <strong>EnvFromSource</strong>: <code>ZodObject</code>&lt;{ <code>configMapRef</code>: <code>ZodOptional</code>&lt;<code>ZodObject</code>&lt;{ <code>name</code>: <code>ZodString</code>; <code>optional</code>: <code>ZodOptional</code>&lt;<code>ZodBoolean</code>&gt;; }, <code>$strip</code>&gt;&gt;; <code>prefix</code>: <code>ZodOptional</code>&lt;<code>ZodString</code>&gt;; <code>secretRef</code>: <code>ZodOptional</code>&lt;<code>ZodObject</code>&lt;{ <code>name</code>: <code>ZodString</code>; <code>optional</code>: <code>ZodOptional</code>&lt;<code>ZodBoolean</code>&gt;; }, <code>$strip</code>&gt;&gt;; }, <code>$loose</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/schemas.ts#L43" target="_blank" rel="noreferrer">src/k8s/schemas.ts:43</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/EnvFromSource.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const EnvFromSource = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  EnvFromSource as default
};
