import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: provisionServiceAccount()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/provisionServiceAccount.md","filePath":"api/index/functions/provisionServiceAccount.md"}');
const _sfc_main = { name: "api/index/functions/provisionServiceAccount.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / provisionServiceAccount</p><h1 id="function-provisionserviceaccount" tabindex="-1">Function: provisionServiceAccount() <a class="header-anchor" href="#function-provisionserviceaccount" aria-label="Permalink to &quot;Function: provisionServiceAccount()&quot;">​</a></h1><blockquote><p><strong>provisionServiceAccount</strong>(<code>coreApi</code>, <code>ns</code>, <code>workspaceId</code>, <code>roleArn</code>, <code>userSub?</code>): <code>Promise</code>&lt;<code>string</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/pods.ts#L44" target="_blank" rel="noreferrer">src/k8s/pods.ts:44</a></p><p>Provisions a Kubernetes ServiceAccount in the target namespace and annotates it with an AWS IAM Role ARN for EKS service account role mapping.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="coreapi" tabindex="-1">coreApi <a class="header-anchor" href="#coreapi" aria-label="Permalink to &quot;coreApi&quot;">​</a></h3><p><code>ObjectCoreV1Api</code></p><p>CoreV1Api client dependency.</p><h3 id="ns" tabindex="-1">ns <a class="header-anchor" href="#ns" aria-label="Permalink to &quot;ns&quot;">​</a></h3><p><code>string</code></p><p>Target namespace.</p><h3 id="workspaceid" tabindex="-1">workspaceId <a class="header-anchor" href="#workspaceid" aria-label="Permalink to &quot;workspaceId&quot;">​</a></h3><p><code>string</code></p><p>Unique Workspace ID mapping.</p><h3 id="rolearn" tabindex="-1">roleArn <a class="header-anchor" href="#rolearn" aria-label="Permalink to &quot;roleArn&quot;">​</a></h3><p><code>string</code></p><p>The AWS IAM Role ARN.</p><h3 id="usersub" tabindex="-1">userSub? <a class="header-anchor" href="#usersub" aria-label="Permalink to &quot;userSub?&quot;">​</a></h3><p><code>string</code></p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>string</code>&gt;</p><p>The generated ServiceAccount name string.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/provisionServiceAccount.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const provisionServiceAccount = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  provisionServiceAccount as default
};
