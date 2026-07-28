import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: registerTemplateResources()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/registerTemplateResources.md","filePath":"api/index/functions/registerTemplateResources.md"}');
const _sfc_main = { name: "api/index/functions/registerTemplateResources.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / registerTemplateResources</p><h1 id="function-registertemplateresources" tabindex="-1">Function: registerTemplateResources() <a class="header-anchor" href="#function-registertemplateresources" aria-label="Permalink to &quot;Function: registerTemplateResources()&quot;">​</a></h1><blockquote><p><strong>registerTemplateResources</strong>(<code>server</code>, <code>k8sContext</code>, <code>enabledTools</code>): <code>void</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/mcp/templates/index.ts#L205" target="_blank" rel="noreferrer">src/mcp/templates/index.ts:205</a></p><p>Registers MCP template resources and tools with the MCP Server. Registered resources:</p><ul><li><code>pod-template://{namespace}/{name}</code>: Provides the JSON config of a template.</li></ul><p>Registered tools:</p><ul><li><code>list_templates</code>: Lists template ConfigMaps in a namespace.</li><li><code>get_template</code>: Gets a template&#39;s raw configuration spec.</li><li><code>create_template</code>: Creates a template ConfigMap.</li><li><code>update_template</code>: Modifies an existing template ConfigMap.</li><li><code>delete_template</code>: Deletes a template ConfigMap.</li><li><code>create_pod_from_template</code>: Creates a new Kubernetes Pod from a template with optional overrides.</li></ul><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="server" tabindex="-1">server <a class="header-anchor" href="#server" aria-label="Permalink to &quot;server&quot;">​</a></h3><p><code>McpServer</code></p><p>The MCP Server instance.</p><h3 id="k8scontext" tabindex="-1">k8sContext <a class="header-anchor" href="#k8scontext" aria-label="Permalink to &quot;k8sContext&quot;">​</a></h3><p><a href="./../interfaces/K8sContext.html"><code>K8sContext</code></a></p><p>Active Kubernetes API client context.</p><h3 id="enabledtools" tabindex="-1">enabledTools <a class="header-anchor" href="#enabledtools" aria-label="Permalink to &quot;enabledTools&quot;">​</a></h3><p><code>string</code>[]</p><p>List of tool names that are allowed/enabled to be registered.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>void</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/registerTemplateResources.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const registerTemplateResources = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  registerTemplateResources as default
};
