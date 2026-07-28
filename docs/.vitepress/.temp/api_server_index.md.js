import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"server","description":"","frontmatter":{},"headers":[],"relativePath":"api/server/index.md","filePath":"api/server/index.md"}');
const _sfc_main = { name: "api/server/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../">@nogoo9/no-crd</a> / server</p><h1 id="server" tabindex="-1">server <a class="header-anchor" href="#server" aria-label="Permalink to &quot;server&quot;">​</a></h1><h2 id="variables" tabindex="-1">Variables <a class="header-anchor" href="#variables" aria-label="Permalink to &quot;Variables&quot;">​</a></h2><ul><li><a href="./variables/CORS_HEADERS.html">CORS_HEADERS</a></li><li><a href="./variables/globalApp.html">globalApp</a></li></ul><h2 id="functions" tabindex="-1">Functions <a class="header-anchor" href="#functions" aria-label="Permalink to &quot;Functions&quot;">​</a></h2><ul><li><a href="./functions/createFastifyApp.html">createFastifyApp</a></li><li><a href="./functions/getBasePrefix.html">getBasePrefix</a></li><li><a href="./functions/getCorsHeaders.html">getCorsHeaders</a></li><li><a href="./functions/handleWebRequest.html">handleWebRequest</a></li><li><a href="./functions/resetMcpServer.html">resetMcpServer</a></li><li><a href="./functions/startHttpServer.html">startHttpServer</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/server/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
