import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: registerUiApp()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/registerUiApp.md","filePath":"api/index/functions/registerUiApp.md"}');
const _sfc_main = { name: "api/index/functions/registerUiApp.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / registerUiApp</p><h1 id="function-registeruiapp" tabindex="-1">Function: registerUiApp() <a class="header-anchor" href="#function-registeruiapp" aria-label="Permalink to &quot;Function: registerUiApp()&quot;">​</a></h1><blockquote><p><strong>registerUiApp</strong>(<code>server</code>, <code>distDir</code>): <code>void</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/ui/index.ts#L95" target="_blank" rel="noreferrer">src/ui/index.ts:95</a></p><p>Registers the Model Context Protocol application resource containing the HTML UI. This makes the Pod Manager user interface available under <code>ui://nogoo9/app</code>.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="server" tabindex="-1">server <a class="header-anchor" href="#server" aria-label="Permalink to &quot;server&quot;">​</a></h3><p><code>McpServer</code></p><p>Active McpServer instance.</p><h3 id="distdir" tabindex="-1">distDir <a class="header-anchor" href="#distdir" aria-label="Permalink to &quot;distDir&quot;">​</a></h3><p><code>string</code></p><p>Directory path containing the compiled frontend index.html.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>void</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/registerUiApp.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const registerUiApp = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  registerUiApp as default
};
