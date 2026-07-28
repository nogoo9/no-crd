import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: registerSpawnerTools()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/registerSpawnerTools.md","filePath":"api/index/functions/registerSpawnerTools.md"}');
const _sfc_main = { name: "api/index/functions/registerSpawnerTools.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / registerSpawnerTools</p><h1 id="function-registerspawnertools" tabindex="-1">Function: registerSpawnerTools() <a class="header-anchor" href="#function-registerspawnertools" aria-label="Permalink to &quot;Function: registerSpawnerTools()&quot;">​</a></h1><blockquote><p><strong>registerSpawnerTools</strong>(<code>server</code>, <code>k8sContext</code>, <code>enabledTools</code>): <code>void</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/mcp/spawner/index.ts#L48" target="_blank" rel="noreferrer">src/mcp/spawner/index.ts:48</a></p><p>Registers workspace management tools (the Spawner subsystem) with the MCP Server. Registered tools:</p><ul><li><code>list_workspaces</code>: Lists active agent workspaces (pods labeled nogoo9/type=workspace).</li><li><code>stop_workspace</code>: Deletes/terminates a workspace pod.</li><li><code>spawn_workspace</code>: Configures and deploys a workspace pod using templates/spec with annotations.</li><li><code>get_workspace</code>: Fetch details of a single workspace by ID.</li><li><code>get_workspace_events</code>: Fetch event logs of a workspace by ID.</li><li><code>upgrade_workspace</code>: Upgrade a workspace to the latest version.</li><li><code>upgrade_all_workspaces</code>: Upgrade all outdated workspaces.</li></ul><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="server" tabindex="-1">server <a class="header-anchor" href="#server" aria-label="Permalink to &quot;server&quot;">​</a></h3><p><code>McpServer</code></p><p>The MCP Server instance.</p><h3 id="k8scontext" tabindex="-1">k8sContext <a class="header-anchor" href="#k8scontext" aria-label="Permalink to &quot;k8sContext&quot;">​</a></h3><p><a href="./../interfaces/K8sContext.html"><code>K8sContext</code></a></p><p>Active Kubernetes API client context.</p><h3 id="enabledtools" tabindex="-1">enabledTools <a class="header-anchor" href="#enabledtools" aria-label="Permalink to &quot;enabledTools&quot;">​</a></h3><p><code>string</code>[]</p><p>List of tool names that are allowed/enabled to be registered.</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>void</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/registerSpawnerTools.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const registerSpawnerTools = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  registerSpawnerTools as default
};
