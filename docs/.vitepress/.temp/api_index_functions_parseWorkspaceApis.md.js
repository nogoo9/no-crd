import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: parseWorkspaceApis()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/parseWorkspaceApis.md","filePath":"api/index/functions/parseWorkspaceApis.md"}');
const _sfc_main = { name: "api/index/functions/parseWorkspaceApis.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / parseWorkspaceApis</p><h1 id="function-parseworkspaceapis" tabindex="-1">Function: parseWorkspaceApis() <a class="header-anchor" href="#function-parseworkspaceapis" aria-label="Permalink to &quot;Function: parseWorkspaceApis()&quot;">​</a></h1><blockquote><p><strong>parseWorkspaceApis</strong>(<code>annotations</code>): <a href="./../interfaces/WorkspaceApi.html"><code>WorkspaceApi</code></a>[]</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/pods.ts#L207" target="_blank" rel="noreferrer">src/k8s/pods.ts:207</a></p><p>Parses additional workspace APIs exposed via kubernetes metadata annotations. Pattern: <code>nogoo9/api.&lt;api-name&gt;.(port|path|desc|method|refresh|visibility)</code></p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="annotations" tabindex="-1">annotations <a class="header-anchor" href="#annotations" aria-label="Permalink to &quot;annotations&quot;">​</a></h3><p><code>Record</code>&lt;<code>string</code>, <code>string</code>&gt; | <code>undefined</code></p><p>Pod metadata annotations.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><a href="./../interfaces/WorkspaceApi.html"><code>WorkspaceApi</code></a>[]</p><p>Parsed list of WorkspaceApi instances.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/parseWorkspaceApis.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const parseWorkspaceApis = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  parseWorkspaceApis as default
};
