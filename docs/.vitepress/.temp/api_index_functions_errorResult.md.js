import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: errorResult()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/errorResult.md","filePath":"api/index/functions/errorResult.md"}');
const _sfc_main = { name: "api/index/functions/errorResult.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / errorResult</p><h1 id="function-errorresult" tabindex="-1">Function: errorResult() <a class="header-anchor" href="#function-errorresult" aria-label="Permalink to &quot;Function: errorResult()&quot;">​</a></h1><blockquote><p><strong>errorResult</strong>&lt;<code>T</code>&gt;(<code>kc</code>, <code>err</code>, <code>structuredContent?</code>): <a href="./../interfaces/CustomToolResult.html"><code>CustomToolResult</code></a>&lt;<code>T</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/errors.ts#L62" target="_blank" rel="noreferrer">src/k8s/errors.ts:62</a></p><p>Formats a thrown error into a standard MCP tool execution error response. Detects network timeout or unreachable API servers, mapping them to clear troubleshooting messages.</p><h2 id="type-parameters" tabindex="-1">Type Parameters <a class="header-anchor" href="#type-parameters" aria-label="Permalink to &quot;Type Parameters&quot;">​</a></h2><h3 id="t" tabindex="-1">T <a class="header-anchor" href="#t" aria-label="Permalink to &quot;T&quot;">​</a></h3><p><code>T</code> <em>extends</em> <code>Record</code>&lt;<code>string</code>, <code>unknown</code>&gt; = <code>Record</code>&lt;<code>string</code>, <code>unknown</code>&gt;</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="kc" tabindex="-1">kc <a class="header-anchor" href="#kc" aria-label="Permalink to &quot;kc&quot;">​</a></h3><p><code>KubeConfig</code></p><p>The active KubeConfig configuration context.</p><h3 id="err" tabindex="-1">err <a class="header-anchor" href="#err" aria-label="Permalink to &quot;err&quot;">​</a></h3><p><code>unknown</code></p><p>The thrown error object.</p><h3 id="structuredcontent" tabindex="-1">structuredContent? <a class="header-anchor" href="#structuredcontent" aria-label="Permalink to &quot;structuredContent?&quot;">​</a></h3><p><code>T</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><a href="./../interfaces/CustomToolResult.html"><code>CustomToolResult</code></a>&lt;<code>T</code>&gt;</p><p>MCP formatted error content and flag.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/errorResult.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const errorResult = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  errorResult as default
};
