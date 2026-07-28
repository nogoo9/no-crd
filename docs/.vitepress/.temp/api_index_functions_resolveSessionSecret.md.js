import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Function: resolveSessionSecret()","description":"","frontmatter":{},"headers":[],"relativePath":"api/index/functions/resolveSessionSecret.md","filePath":"api/index/functions/resolveSessionSecret.md"}');
const _sfc_main = { name: "api/index/functions/resolveSessionSecret.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><a href="./../../">@nogoo9/no-crd</a> / <a href="./../">index</a> / resolveSessionSecret</p><h1 id="function-resolvesessionsecret" tabindex="-1">Function: resolveSessionSecret() <a class="header-anchor" href="#function-resolvesessionsecret" aria-label="Permalink to &quot;Function: resolveSessionSecret()&quot;">​</a></h1><blockquote><p><strong>resolveSessionSecret</strong>(<code>coreApi</code>, <code>namespace</code>, <code>port?</code>): <code>Promise</code>&lt;<code>string</code>&gt;</p></blockquote><p>Defined in: <a href="https://github.com/nogoo9/no-crd/blob/ad51c682542022f16d2eb3949a8d936932ab9651/src/k8s/session.ts#L46" target="_blank" rel="noreferrer">src/k8s/session.ts:46</a></p><p>Resolves the session signing key via a 5-step priority cascade:</p><ol><li><code>PROXY_SESSION_SECRET</code> env var</li><li><code>JWT_SECRET</code> env var</li><li>Best-effort k8s Secret (read/create with 409 retry)</li><li>Peer discovery (query sibling pods&#39; internal endpoint)</li><li>In-memory random key</li></ol><p>The result is cached in-memory for the process lifetime.</p><h2 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h2><h3 id="coreapi" tabindex="-1">coreApi <a class="header-anchor" href="#coreapi" aria-label="Permalink to &quot;coreApi&quot;">​</a></h3><p><code>ObjectCoreV1Api</code> | <code>null</code></p><p>Kubernetes CoreV1Api client.</p><h3 id="namespace" tabindex="-1">namespace <a class="header-anchor" href="#namespace" aria-label="Permalink to &quot;namespace&quot;">​</a></h3><p><code>string</code></p><p>Deployment namespace.</p><h3 id="port" tabindex="-1">port? <a class="header-anchor" href="#port" aria-label="Permalink to &quot;port?&quot;">​</a></h3><p><code>number</code> = <code>3000</code></p><p>Server port (for peer discovery).</p><h2 id="returns" tabindex="-1">Returns <a class="header-anchor" href="#returns" aria-label="Permalink to &quot;Returns&quot;">​</a></h2><p><code>Promise</code>&lt;<code>string</code>&gt;</p><p>The resolved signing key.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api/index/functions/resolveSessionSecret.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const resolveSessionSecret = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  resolveSessionSecret as default
};
