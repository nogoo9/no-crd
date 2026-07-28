import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: parseSpecString()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/parseSpecString.md","filePath":"api/index/functions/parseSpecString.md"}');
const _sfc_main = { name: "api/index/functions/parseSpecString.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / parseSpecString</p><h1 id="function-parsespecstring" tabindex="-1">Function: parseSpecString() <a class="header-anchor" href="#function-parsespecstring" aria-label="Permalink to &quot;Function: parseSpecString()&quot;">​</a></h1><blockquote><p><strong>parseSpecString</strong>(<code>specStr</code>): <code>Record</code>&lt;<code>string</code>, <code>unknown</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/local-templates.ts#L37" target="_blank" rel="noreferrer">src/k8s/local-templates.ts:37</a></p><p>Parses a spec string that may be JSON or YAML. Auto-detects: if the trimmed string starts with <code>{</code>, parses as JSON; otherwise parses as YAML. This is backward-compatible with existing JSON-only ConfigMap <code>data.spec</code> fields.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="specstr" tabindex="-1">specStr <a class="header-anchor" href="#specstr" aria-label="Permalink to &quot;specStr&quot;">​</a></h3><p><code>string</code></p><p>Raw spec string from a ConfigMap or file.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Record</code>&lt;<code>string</code>, <code>unknown</code>&gt;</p><p>Parsed object.</p><h2 id="throws" tabindex="-1">Throws <a class="header-anchor" href="#throws" aria-label="Permalink to &quot;Throws&quot;">​</a></h2><p>If the string cannot be parsed as either JSON or YAML.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/parseSpecString.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const parseSpecString = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  parseSpecString as default
};
