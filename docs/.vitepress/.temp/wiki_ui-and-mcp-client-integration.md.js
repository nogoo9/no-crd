import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderSuspense, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"UI & MCP Client Integration","description":"","frontmatter":{},"headers":[],"relativePath":"wiki/ui-and-mcp-client-integration.md","filePath":"wiki/ui-and-mcp-client-integration.md"}');
const _sfc_main = { name: "wiki/ui-and-mcp-client-integration.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Mermaid = resolveComponent("Mermaid");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="ui-mcp-client-integration" tabindex="-1">UI &amp; MCP Client Integration <a class="header-anchor" href="#ui-mcp-client-integration" aria-label="Permalink to &quot;UI &amp; MCP Client Integration&quot;">​</a></h1><p>The <code>nogoo9</code> web dashboard ([<code>src/ui/</code>](file:///home/eterna2/github/nogoo9-no-crd/src/ui/)) provides an interactive SPA for workspace management, template browsing, live log streaming, and theme customization.</p><hr><h2 id="🤝-client-authentication-handshake-rules" tabindex="-1">🤝 Client Authentication &amp; Handshake Rules <a class="header-anchor" href="#🤝-client-authentication-handshake-rules" aria-label="Permalink to &quot;🤝 Client Authentication &amp; Handshake Rules&quot;">​</a></h2><p>Per [MCP Client Rules](file:///home/eterna2/github/nogoo9-no-crd/.agents/rules/mcp-client.md), clients strictly enforce OIDC authentication before completing the MCP handshake:</p>`);
  ssrRenderSuspense(_push, {
    default: () => {
      _push(ssrRenderComponent(_component_Mermaid, {
        id: "mermaid-13",
        class: "mermaid",
        graph: "sequenceDiagram%0A%20%20%20%20autonumber%0A%20%20%20%20actor%20User%20as%20User%20%2F%20Browser%0A%20%20%20%20participant%20UI%20as%20React%20UI%20(src%2Fui%2F)%0A%20%20%20%20participant%20Hook%20as%20useOidcAuth%20Hook%20(src%2Fui%2Fhooks%2FuseOidcAuth.ts)%0A%20%20%20%20participant%20MCPBridge%20as%20useMcpClient%20Hook%20(src%2Fui%2Fhooks%2FuseMcpClient.ts)%0A%20%20%20%20participant%20Gateway%20as%20Server%20Gateway%0A%0A%20%20%20%20User-%3E%3EUI%3A%20Open%20Dashboard%20URL%0A%20%20%20%20UI-%3E%3EHook%3A%20Check%20OIDC%20Token%20State%0A%20%20%20%20alt%20Token%20Missing%20%2F%20Expired%0A%20%20%20%20%20%20%20%20Hook-%3E%3EUser%3A%20Redirect%20to%20Keycloak%20PKCE%20Login%0A%20%20%20%20%20%20%20%20User--%3E%3EHook%3A%20Return%20with%20Authorization%20Code%20(%3Fcode%3D...)%0A%20%20%20%20%20%20%20%20Hook-%3E%3EGateway%3A%20Exchange%20Code%20for%20Access%20Token%0A%20%20%20%20%20%20%20%20Gateway--%3E%3EHook%3A%20Access%20Token%20%26%20Session%20Cookie%20Saved%0A%20%20%20%20end%0A%20%20%20%20Hook--%3E%3EUI%3A%20isInitialized%20%3D%20true%0A%20%20%20%20UI-%3E%3EMCPBridge%3A%20Connect%20MCP%20Client%20(app.connect())%0A%20%20%20%20MCPBridge-%3E%3EGateway%3A%20Initial%20Handshake%0A%20%20%20%20Gateway--%3E%3EMCPBridge%3A%20Handshake%20Complete%0A%20%20%20%20MCPBridge-%3E%3EGateway%3A%20Call%20Tools%20(list_workspaces%2C%20list_templates)%0A"
      }, null, _parent));
    },
    fallback: () => {
      _push(` Loading... `);
    },
    _: 1
  });
  _push(`<hr><h2 id="🧩-modular-react-hooks" tabindex="-1">🧩 Modular React Hooks <a class="header-anchor" href="#🧩-modular-react-hooks" aria-label="Permalink to &quot;🧩 Modular React Hooks&quot;">​</a></h2><ul><li>[<code>src/ui/hooks/useOidcAuth.ts</code>](file:///home/eterna2/github/nogoo9-no-crd/src/ui/hooks/useOidcAuth.ts): Manages Keycloak OIDC PKCE login flow, token storage, token auto-refresh, and identity state.</li><li>[<code>src/ui/hooks/useMcpClient.ts</code>](file:///home/eterna2/github/nogoo9-no-crd/src/ui/hooks/useMcpClient.ts): Manages the web standard HTTP transport connection to <code>/mcp</code>, exposing ready state and tool invocation wrappers.</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("wiki/ui-and-mcp-client-integration.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const uiAndMcpClientIntegration = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  uiAndMcpClientIntegration as default
};
