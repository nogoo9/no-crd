import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: parseTemplateRef()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/parseTemplateRef.md","filePath":"api/index/functions/parseTemplateRef.md"}');
const _sfc_main = { name: "api/index/functions/parseTemplateRef.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / parseTemplateRef</p><h1 id="function-parsetemplateref" tabindex="-1">Function: parseTemplateRef() <a class="header-anchor" href="#function-parsetemplateref" aria-label="Permalink to &quot;Function: parseTemplateRef()&quot;">​</a></h1><blockquote><p><strong>parseTemplateRef</strong>(<code>ref</code>, <code>defaultNs</code>): <code>object</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/templates.ts#L72" target="_blank" rel="noreferrer">src/k8s/templates.ts:72</a></p><p>Parses an MCP resource template URI or string into namespace and name components. Format support: <code>pod-template://{namespace}/{name}</code> or bare <code>{name}</code>.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="ref" tabindex="-1">ref <a class="header-anchor" href="#ref" aria-label="Permalink to &quot;ref&quot;">​</a></h3><p><code>string</code></p><p>Raw template reference URI/string.</p><h3 id="defaultns" tabindex="-1">defaultNs <a class="header-anchor" href="#defaultns" aria-label="Permalink to &quot;defaultNs&quot;">​</a></h3><p><code>string</code></p><p>Default namespace fallback if no namespace is in the ref.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>object</code></p><p>Object holding the parsed namespace and name.</p><h3 id="name" tabindex="-1">name <a class="header-anchor" href="#name" aria-label="Permalink to &quot;name&quot;">​</a></h3><blockquote><p><strong>name</strong>: <code>string</code></p></blockquote><h3 id="ns" tabindex="-1">ns <a class="header-anchor" href="#ns" aria-label="Permalink to &quot;ns&quot;">​</a></h3><blockquote><p><strong>ns</strong>: <code>string</code></p></blockquote></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/parseTemplateRef.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const parseTemplateRef = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  parseTemplateRef as default
};
