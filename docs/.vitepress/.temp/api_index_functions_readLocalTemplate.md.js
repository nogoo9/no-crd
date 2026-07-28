import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: readLocalTemplate()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/readLocalTemplate.md","filePath":"api/index/functions/readLocalTemplate.md"}');
const _sfc_main = { name: "api/index/functions/readLocalTemplate.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / readLocalTemplate</p><h1 id="function-readlocaltemplate" tabindex="-1">Function: readLocalTemplate() <a class="header-anchor" href="#function-readlocaltemplate" aria-label="Permalink to &quot;Function: readLocalTemplate()&quot;">​</a></h1><blockquote><p><strong>readLocalTemplate</strong>(<code>dir</code>, <code>name</code>): <a href="./../interfaces/LocalTemplate.html"><code>LocalTemplate</code></a> | <code>null</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/local-templates.ts#L145" target="_blank" rel="noreferrer">src/k8s/local-templates.ts:145</a></p><p>Reads a single local template by name from a directory. Tries <code>name.yaml</code>, <code>name.yml</code>, <code>name.json</code> in order.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="dir" tabindex="-1">dir <a class="header-anchor" href="#dir" aria-label="Permalink to &quot;dir&quot;">​</a></h3><p><code>string</code></p><p>Absolute path to the templates directory.</p><h3 id="name" tabindex="-1">name <a class="header-anchor" href="#name" aria-label="Permalink to &quot;name&quot;">​</a></h3><p><code>string</code></p><p>Template name (without extension).</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><a href="./../interfaces/LocalTemplate.html"><code>LocalTemplate</code></a> | <code>null</code></p><p>The parsed template, or <code>null</code> if not found.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/readLocalTemplate.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const readLocalTemplate = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  readLocalTemplate as default
};
