import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: makeApiClient()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/makeApiClient.md","filePath":"api/index/functions/makeApiClient.md"}');
const _sfc_main = { name: "api/index/functions/makeApiClient.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / makeApiClient</p><h1 id="function-makeapiclient" tabindex="-1">Function: makeApiClient() <a class="header-anchor" href="#function-makeapiclient" aria-label="Permalink to &quot;Function: makeApiClient()&quot;">​</a></h1><blockquote><p><strong>makeApiClient</strong>&lt;<code>T</code>&gt;(<code>kc</code>, <code>apiClientType</code>): <code>T</code></p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/client.ts#L141" target="_blank" rel="noreferrer">src/k8s/client.ts:141</a></p><p>Creates an instance of a Kubernetes API client for a given configuration. Automatically delegates to custom <code>makeApiClient</code> setups if a mock/stub KubeConfig is passed. Otherwise, configures the client with the BunDenoHttpLibrary wrapper to ensure global fetch support.</p><h2 id="type-parameters" tabindex="-1">Type Parameters <a class="header-anchor" href="#type-parameters" aria-label="Permalink to &quot;Type Parameters&quot;">​</a></h2><h3 id="t" tabindex="-1">T <a class="header-anchor" href="#t" aria-label="Permalink to &quot;T&quot;">​</a></h3><p><code>T</code></p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="kc" tabindex="-1">kc <a class="header-anchor" href="#kc" aria-label="Permalink to &quot;kc&quot;">​</a></h3><p><code>KubeConfig</code></p><p>The active KubeConfig configuration context.</p><h3 id="apiclienttype" tabindex="-1">apiClientType <a class="header-anchor" href="#apiclienttype" aria-label="Permalink to &quot;apiClientType&quot;">​</a></h3><p>(<code>config</code>) =&gt; <code>T</code></p><p>The class constructor of the target API client (e.g. CoreV1Api, AuthorizationV1Api).</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>T</code></p><p>An instantiated API client of type T.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/makeApiClient.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const makeApiClient = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  makeApiClient as default
};
