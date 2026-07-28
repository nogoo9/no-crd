import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: listLocalTemplates()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/listLocalTemplates.md","filePath":"api/index/functions/listLocalTemplates.md"}');
const _sfc_main = { name: "api/index/functions/listLocalTemplates.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / listLocalTemplates</p><h1 id="function-listlocaltemplates" tabindex="-1">Function: listLocalTemplates() <a class="header-anchor" href="#function-listlocaltemplates" aria-label="Permalink to &quot;Function: listLocalTemplates()&quot;">​</a></h1><blockquote><p><strong>listLocalTemplates</strong>(<code>dir</code>): <a href="./../interfaces/LocalTemplate.html"><code>LocalTemplate</code></a>[]</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/local-templates.ts#L100" target="_blank" rel="noreferrer">src/k8s/local-templates.ts:100</a></p><p>Lists all template files in a directory. Reads <code>*.yaml</code>, <code>*.yml</code>, and <code>*.json</code> files and parses each as a local template. Files that fail to parse are logged as warnings and skipped.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="dir" tabindex="-1">dir <a class="header-anchor" href="#dir" aria-label="Permalink to &quot;dir&quot;">​</a></h3><p><code>string</code></p><p>Absolute path to the templates directory.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><a href="./../interfaces/LocalTemplate.html"><code>LocalTemplate</code></a>[]</p><p>Array of parsed local templates.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/listLocalTemplates.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const listLocalTemplates = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  listLocalTemplates as default
};
