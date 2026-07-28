import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderSuspense, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Routing Proxy & Dynamic Tunneling","description":"","frontmatter":{},"headers":[],"relativePath":"wiki/routing-proxy-and-tunneling.md","filePath":"wiki/routing-proxy-and-tunneling.md"}');
const _sfc_main = { name: "wiki/routing-proxy-and-tunneling.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Mermaid = resolveComponent("Mermaid");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="routing-proxy-dynamic-tunneling" tabindex="-1">Routing Proxy &amp; Dynamic Tunneling <a class="header-anchor" href="#routing-proxy-dynamic-tunneling" aria-label="Permalink to &quot;Routing Proxy &amp; Dynamic Tunneling&quot;">​</a></h1><p>The <code>nogoo9</code> routing proxy ([<code>src/server/routes/proxy.ts</code>](file:///home/eterna2/github/nogoo9-no-crd/src/server/routes/proxy.ts)) provides dynamic, zero-config HTTP and WebSocket reverse-proxying directly to pod IP addresses.</p><hr><h2 id="🔀-reverse-proxy-websocket-architecture" tabindex="-1">🔀 Reverse Proxy &amp; WebSocket Architecture <a class="header-anchor" href="#🔀-reverse-proxy-websocket-architecture" aria-label="Permalink to &quot;🔀 Reverse Proxy &amp; WebSocket Architecture&quot;">​</a></h2>`);
  ssrRenderSuspense(_push, {
    default: () => {
      _push(ssrRenderComponent(_component_Mermaid, {
        id: "mermaid-10",
        class: "mermaid",
        graph: "sequenceDiagram%0A%20%20%20%20autonumber%0A%20%20%20%20actor%20Client%20as%20Browser%20%2F%20Client%20Application%0A%20%20%20%20participant%20Proxy%20as%20Fastify%20Reverse%20Proxy%20(src%2Fserver%2Froutes%2Fproxy.ts)%0A%20%20%20%20participant%20Auth%20as%20Auth%20%26%20Header%20Rewriter%20(src%2Fserver%2Fproxy-common.ts)%0A%20%20%20%20participant%20Pod%20as%20Workspace%20Pod%20Container%20(Pod%20IP%3A%2010.42.0.15)%0A%0A%20%20%20%20Client-%3E%3EProxy%3A%20GET%20%2Froute%2Fws-user-1%2Fapp%2Findex.html%0A%20%20%20%20Proxy-%3E%3EAuth%3A%20Verify%20Owner%20%26%20Auth%20Mode%20Annotations%0A%20%20%20%20Auth--%3E%3EProxy%3A%20Auth%20Passed%20(Inject%20X-User-Sub%3A%20user-123)%0A%20%20%20%20Proxy-%3E%3EPod%3A%20HTTP%20Proxy%20Request%20-%3E%20http%3A%2F%2F10.42.0.15%3A3000%2Fapp%2Findex.html%0A%20%20%20%20Pod--%3E%3EProxy%3A%20HTTP%20200%20OK%20%2B%20Body%0A%20%20%20%20Proxy--%3E%3EClient%3A%20Streamed%20Response%0A"
      }, null, _parent));
    },
    fallback: () => {
      _push(` Loading... `);
    },
    _: 1
  });
  _push(`<hr><h2 id="🏷️-workspace-auth-mode-annotations" tabindex="-1">🏷️ Workspace Auth Mode Annotations <a class="header-anchor" href="#🏷️-workspace-auth-mode-annotations" aria-label="Permalink to &quot;🏷️ Workspace Auth Mode Annotations&quot;">​</a></h2><p>Workspaces support fine-grained routing behavior configured via template annotations:</p><table tabindex="0"><thead><tr><th>Mode Annotation</th><th>Parameter Value</th><th>Behavior Description</th></tr></thead><tbody><tr><td><code>inject-headers</code></td><td><code>true</code> / <code>false</code></td><td>Injects <code>X-User-Sub</code>, <code>X-User-Roles</code>, and <code>X-Workspace-JWT</code> headers into upstream pod requests.</td></tr><tr><td><code>redirect</code></td><td><code>true</code> / <code>false</code></td><td>Unauthenticated browser requests are redirected to Keycloak OIDC login.</td></tr><tr><td><code>token-api</code></td><td><code>true</code> / <code>false</code></td><td>Enables path-scoped token endpoints (<code>/_auth/token</code>, <code>/_auth/authorize</code>, <code>/_auth/refresh</code>).</td></tr><tr><td><code>no-auth</code></td><td><code>true</code> / <code>false</code></td><td>Bypasses identity verification (open public preview mode).</td></tr></tbody></table><hr><h2 id="🔌-websocket-upgrade-piping" tabindex="-1">🔌 WebSocket Upgrade Piping <a class="header-anchor" href="#🔌-websocket-upgrade-piping" aria-label="Permalink to &quot;🔌 WebSocket Upgrade Piping&quot;">​</a></h2><p>WebSocket traffic is intercepted at the HTTP server level in [<code>src/server/ws-proxy.ts</code>](file:///home/eterna2/github/nogoo9-no-crd/src/server/ws-proxy.ts) and piped directly to the target pod IP, preserving sub-protocols and session headers.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("wiki/routing-proxy-and-tunneling.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const routingProxyAndTunneling = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  routingProxyAndTunneling as default
};
