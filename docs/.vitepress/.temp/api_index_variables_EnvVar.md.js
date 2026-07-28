import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Variable: EnvVar","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/variables/EnvVar.md","filePath":"api/index/variables/EnvVar.md"}');
const _sfc_main = { name: "api/index/variables/EnvVar.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / EnvVar</p><h1 id="variable-envvar" tabindex="-1">Variable: EnvVar <a class="header-anchor" href="#variable-envvar" aria-label="Permalink to &quot;Variable: EnvVar&quot;">​</a></h1><blockquote><p><code>const</code> <strong>EnvVar</strong>: <code>ZodObject</code>&lt;{ <code>name</code>: <code>ZodString</code>; <code>value</code>: <code>ZodOptional</code>&lt;<code>ZodString</code>&gt;; <code>valueFrom</code>: <code>ZodOptional</code>&lt;<code>ZodObject</code>&lt;{ <code>configMapKeyRef</code>: <code>ZodOptional</code>&lt;<code>ZodObject</code>&lt;{ <code>key</code>: <code>ZodString</code>; <code>name</code>: <code>ZodString</code>; <code>optional</code>: <code>ZodOptional</code>&lt;<code>ZodBoolean</code>&gt;; }, <code>$strip</code>&gt;&gt;; <code>fieldRef</code>: <code>ZodOptional</code>&lt;<code>ZodObject</code>&lt;{ <code>apiVersion</code>: <code>ZodOptional</code>&lt;<code>ZodString</code>&gt;; <code>fieldPath</code>: <code>ZodString</code>; }, <code>$strip</code>&gt;&gt;; <code>resourceFieldRef</code>: <code>ZodOptional</code>&lt;<code>ZodObject</code>&lt;{ <code>containerName</code>: <code>ZodOptional</code>&lt;<code>ZodString</code>&gt;; <code>divisor</code>: <code>ZodOptional</code>&lt;<code>ZodString</code>&gt;; <code>resource</code>: <code>ZodString</code>; }, <code>$strip</code>&gt;&gt;; <code>secretKeyRef</code>: <code>ZodOptional</code>&lt;<code>ZodObject</code>&lt;{ <code>key</code>: <code>ZodString</code>; <code>name</code>: <code>ZodString</code>; <code>optional</code>: <code>ZodOptional</code>&lt;<code>ZodBoolean</code>&gt;; }, <code>$strip</code>&gt;&gt;; }, <code>$strip</code>&gt;&gt;; }, <code>$loose</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/schemas.ts#L5" target="_blank" rel="noreferrer">src/k8s/schemas.ts:5</a></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/variables/EnvVar.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const EnvVar = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  EnvVar as default
};
