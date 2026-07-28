import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: registerPodTools()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/registerPodTools.md","filePath":"api/index/functions/registerPodTools.md"}');
const _sfc_main = { name: "api/index/functions/registerPodTools.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / registerPodTools</p><h1 id="function-registerpodtools" tabindex="-1">Function: registerPodTools() <a class="header-anchor" href="#function-registerpodtools" aria-label="Permalink to &quot;Function: registerPodTools()&quot;">​</a></h1><blockquote><p><strong>registerPodTools</strong>(<code>server</code>, <code>k8sContext</code>, <code>enabledTools</code>): <code>void</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/mcp/pods/index.ts#L119" target="_blank" rel="noreferrer">src/mcp/pods/index.ts:119</a></p><p>Registers core Kubernetes pod management tools with the MCP server. Registered tools:</p><ul><li><code>list_pods</code>: Lists pods with optional label/field selectors.</li><li><code>get_pod</code>: Retrieves full JSON configuration details for a specific pod.</li><li><code>create_pod</code>: Provisions and launches a pod from raw parameters.</li><li><code>delete_pod</code>: Terminates a pod with optional grace period.</li><li><code>patch_pod</code>: Applies a strategic merge patch to a pod.</li><li><code>get_pod_logs</code>: Retrieves container logs.</li><li><code>list_namespaces</code>: Lists accessible namespaces.</li><li><code>list_registry_images</code>: Lists images in the configured local registry.</li></ul><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="server" tabindex="-1">server <a class="header-anchor" href="#server" aria-label="Permalink to &quot;server&quot;">​</a></h3><p><code>McpServer</code></p><p>The MCP Server instance to register the tools on.</p><h3 id="k8scontext" tabindex="-1">k8sContext <a class="header-anchor" href="#k8scontext" aria-label="Permalink to &quot;k8sContext&quot;">​</a></h3><p><a href="./../interfaces/K8sContext.html"><code>K8sContext</code></a></p><p>Active Kubernetes API client context.</p><h3 id="enabledtools" tabindex="-1">enabledTools <a class="header-anchor" href="#enabledtools" aria-label="Permalink to &quot;enabledTools&quot;">​</a></h3><p><code>string</code>[]</p><p>List of tool names that are allowed/enabled to be registered.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>void</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/registerPodTools.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const registerPodTools = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  registerPodTools as default
};
