import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderSuspense, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Deep Wiki Knowledge Base","description":"","frontmatter":{},"headers":[],"relativePath":"wiki/index.md","filePath":"wiki/index.md"}');
const _sfc_main = { name: "wiki/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Mermaid = resolveComponent("Mermaid");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="deep-wiki-knowledge-base" tabindex="-1">Deep Wiki Knowledge Base <a class="header-anchor" href="#deep-wiki-knowledge-base" aria-label="Permalink to &quot;Deep Wiki Knowledge Base&quot;">​</a></h1><p>Welcome to the <strong>nogoo9 Deep Wiki Knowledge Base</strong>. This section provides deep architectural documentation, component interaction sequence diagrams, state machine specifications, security threat models, and subsystem designs for the <code>nogoo9</code> platform.</p><hr><h2 id="🗺️-system-architecture-subsystems" tabindex="-1">🗺️ System Architecture &amp; Subsystems <a class="header-anchor" href="#🗺️-system-architecture-subsystems" aria-label="Permalink to &quot;🗺️ System Architecture &amp; Subsystems&quot;">​</a></h2>`);
  ssrRenderSuspense(_push, {
    default: () => {
      _push(ssrRenderComponent(_component_Mermaid, {
        id: "mermaid-10",
        class: "mermaid",
        graph: "graph%20TD%0A%20%20%20%20subgraph%20Client%20Layer%0A%20%20%20%20%20%20%20%20Agent%5B%22AI%20Agent%20(MCP%20Client)%22%5D%0A%20%20%20%20%20%20%20%20UI%5B%22Web%20Dashboard%20UI%22%5D%0A%20%20%20%20end%0A%0A%20%20%20%20subgraph%20Gateway%20%26%20Proxy%20Layer%0A%20%20%20%20%20%20%20%20Fastify%5B%22Fastify%20Gateway%20(src%2Fserver%2F)%22%5D%0A%20%20%20%20%20%20%20%20AuthModule%5B%22OIDC%20%26%20Singleflight%20Auth%20(src%2Fserver%2Fauth*.ts)%22%5D%0A%20%20%20%20%20%20%20%20SSEMgr%5B%22SSE%20Session%20Manager%20(src%2Fserver%2Fsse.ts)%22%5D%0A%20%20%20%20%20%20%20%20Proxy%5B%22Reverse%20Proxy%20%26%20Header%20Injection%20(src%2Fserver%2Froutes%2Fproxy*.ts)%22%5D%0A%20%20%20%20end%0A%0A%20%20%20%20subgraph%20Orchestration%20Layer%0A%20%20%20%20%20%20%20%20MCP%5B%22MCP%20Server%20Engine%20(src%2Fmcp%2F)%22%5D%0A%20%20%20%20%20%20%20%20Spawner%5B%22Zero-CRD%20Spawner%20(src%2Fk8s%2F)%22%5D%0A%20%20%20%20%20%20%20%20PeerDisc%5B%22Leaderless%20Peer%20Discovery%20(src%2Fserver%2Fpeer-discovery.ts)%22%5D%0A%20%20%20%20end%0A%0A%20%20%20%20subgraph%20Kubernetes%20%26%20External%20Services%0A%20%20%20%20%20%20%20%20K8sAPI%5B%22Kubernetes%20API%20Server%22%5D%0A%20%20%20%20%20%20%20%20Keycloak%5B%22Keycloak%20OIDC%20IdP%22%5D%0A%20%20%20%20%20%20%20%20Storage%5B%22MinIO%20%2F%20RustFS%20S3%20Storage%22%5D%0A%20%20%20%20end%0A%0A%20%20%20%20Agent%20--%3E%7CHTTP%2FSSE%20or%20Stdio%7C%20Fastify%0A%20%20%20%20UI%20--%3E%7COIDC%20PKCE%20%26%20Session%20Cookie%7C%20Fastify%0A%20%20%20%20Fastify%20--%3E%20AuthModule%0A%20%20%20%20AuthModule%20--%3E%20Keycloak%0A%20%20%20%20Fastify%20--%3E%20SSEMgr%0A%20%20%20%20Fastify%20--%3E%20MCP%0A%20%20%20%20MCP%20--%3E%20Spawner%0A%20%20%20%20Spawner%20--%3E%20K8sAPI%0A%20%20%20%20Fastify%20--%3E%20Proxy%0A%20%20%20%20Proxy%20--%3E%7CPod%20IP%20Direct%20Tunnel%7C%20Pod%5B%22Ephemeral%20Pod%20Container%22%5D%0A%20%20%20%20PeerDisc%20--%3E%20K8sAPI%0A%20%20%20%20Pod%20--%3E%7CPreStop%20Log%20Sync%7C%20Storage%0A"
      }, null, _parent));
    },
    fallback: () => {
      _push(` Loading... `);
    },
    _: 1
  });
  _push(`<hr><h2 id="📚-deep-wiki-directory" tabindex="-1">📚 Deep Wiki Directory <a class="header-anchor" href="#📚-deep-wiki-directory" aria-label="Permalink to &quot;📚 Deep Wiki Directory&quot;">​</a></h2><table tabindex="0"><thead><tr><th>Section</th><th>Description</th><th>Key Topics</th></tr></thead><tbody><tr><td><a href="./architecture-overview.html"><strong>Architecture Overview</strong></a></td><td>End-to-end component topology and system boundaries</td><td>Gateway design, zero-operator philosophy, request pathways</td></tr><tr><td><a href="./zero-crd-pod-lifecycle.html"><strong>Zero-CRD Pod Lifecycle</strong></a></td><td>Pod orchestration &amp; upgrade state machines</td><td>Pod spec generation, annotations, PVC locking, 1-by-1 vs bulk upgrades</td></tr><tr><td><a href="./auth-and-security-model.html"><strong>Auth &amp; Security Model</strong></a></td><td>OIDC authentication &amp; cookie crypto</td><td>RFC 9728 metadata, AES-256-GCM cookies, singleflight refresh deduplication</td></tr><tr><td><a href="./routing-proxy-and-tunneling.html"><strong>Routing Proxy &amp; Tunneling</strong></a></td><td>Dynamic reverse proxying &amp; auth modes</td><td>Header rewriting (<code>X-User-Sub</code>), WS piping, <code>token-api</code> / <code>inject-headers</code></td></tr><tr><td><a href="./peer-discovery-and-ha.html"><strong>Peer Discovery &amp; HA</strong></a></td><td>Multi-replica secret negotiation</td><td>Leaderless startup, shared session keys, zero-database HA</td></tr><tr><td><a href="./mcp-tool-engine-and-schemas.html"><strong>MCP Tool Engine &amp; Schemas</strong></a></td><td>MCP protocol implementation</td><td>Transport adapters, tool registration, spawner &amp; pod handler contracts</td></tr><tr><td><a href="./ui-and-mcp-client-integration.html"><strong>UI &amp; MCP Client Integration</strong></a></td><td>Frontend web dashboard &amp; client bridge</td><td>React hooks (<code>useOidcAuth</code>, <code>useMcpClient</code>), OIDC PKCE flow, handshake rules</td></tr></tbody></table></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("wiki/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
