import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Interface: K8sContext","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/interfaces/K8sContext.md","filePath":"api/index/interfaces/K8sContext.md"}');
const _sfc_main = { name: "api/index/interfaces/K8sContext.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / K8sContext</p><h1 id="interface-k8scontext" tabindex="-1">Interface: K8sContext <a class="header-anchor" href="#interface-k8scontext" aria-label="Permalink to &quot;Interface: K8sContext&quot;">​</a></h1><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/client.ts#L21" target="_blank" rel="noreferrer">src/k8s/client.ts:21</a></p><p>Encapsulates the Kubernetes cluster config and pre-instantiated API clients. This is used for Dependency Injection across all helper functions and MCP tools.</p><h2 id="properties" tabindex="-1">Properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;Properties&quot;">​</a></h2><h3 id="coreapi" tabindex="-1">coreApi <a class="header-anchor" href="#coreapi" aria-label="Permalink to &quot;coreApi&quot;">​</a></h3><blockquote><p><strong>coreApi</strong>: <code>ObjectCoreV1Api</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/client.ts#L25" target="_blank" rel="noreferrer">src/k8s/client.ts:25</a></p><p>Standard Core V1 API client (for Pods, ConfigMaps, Namespaces, Services).</p><hr><h3 id="kc" tabindex="-1">kc <a class="header-anchor" href="#kc" aria-label="Permalink to &quot;kc&quot;">​</a></h3><blockquote><p><strong>kc</strong>: <code>KubeConfig</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/client.ts#L23" target="_blank" rel="noreferrer">src/k8s/client.ts:23</a></p><p>Active KubeConfig configuration.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/interfaces/K8sContext.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const K8sContext = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  K8sContext as default
};
