import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: parseTemplateContent()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/parseTemplateContent.md","filePath":"api/index/functions/parseTemplateContent.md"}');
const _sfc_main = { name: "api/index/functions/parseTemplateContent.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / parseTemplateContent</p><h1 id="function-parsetemplatecontent" tabindex="-1">Function: parseTemplateContent() <a class="header-anchor" href="#function-parsetemplatecontent" aria-label="Permalink to &quot;Function: parseTemplateContent()&quot;">​</a></h1><blockquote><p><strong>parseTemplateContent</strong>(<code>content</code>, <code>filename</code>): <a href="./../interfaces/LocalTemplate.html"><code>LocalTemplate</code></a></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/local-templates.ts#L54" target="_blank" rel="noreferrer">src/k8s/local-templates.ts:54</a></p><p>Parses a template file&#39;s content (YAML or JSON) into a <a href="./../interfaces/LocalTemplate.html">LocalTemplate</a>. The file must contain a wrapped format with <code>metadata</code> and <code>spec</code> keys.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="content" tabindex="-1">content <a class="header-anchor" href="#content" aria-label="Permalink to &quot;content&quot;">​</a></h3><p><code>string</code></p><p>Raw file content.</p><h3 id="filename" tabindex="-1">filename <a class="header-anchor" href="#filename" aria-label="Permalink to &quot;filename&quot;">​</a></h3><p><code>string</code></p><p>Filename used for extension-based format detection and fallback name.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><a href="./../interfaces/LocalTemplate.html"><code>LocalTemplate</code></a></p><p>Parsed local template.</p><h2 id="throws" tabindex="-1">Throws <a class="header-anchor" href="#throws" aria-label="Permalink to &quot;Throws&quot;">​</a></h2><p>If content is malformed or missing required fields.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/parseTemplateContent.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const parseTemplateContent = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  parseTemplateContent as default
};
