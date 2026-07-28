import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderSuspense, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Leaderless Peer Discovery & High Availability","description":"","frontmatter":{},"headers":[],"relativePath":"wiki/peer-discovery-and-ha.md","filePath":"wiki/peer-discovery-and-ha.md"}');
const _sfc_main = { name: "wiki/peer-discovery-and-ha.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Mermaid = resolveComponent("Mermaid");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="leaderless-peer-discovery-high-availability" tabindex="-1">Leaderless Peer Discovery &amp; High Availability <a class="header-anchor" href="#leaderless-peer-discovery-high-availability" aria-label="Permalink to &quot;Leaderless Peer Discovery &amp; High Availability&quot;">​</a></h1><p><code>nogoo9</code> achieves High Availability (HA) and multi-replica scalability without stateful databases (Postgres, Redis, or Etcd) by employing a Kubernetes Secret-backed peer discovery mechanism ([<code>src/server/peer-discovery.ts</code>](file:///home/eterna2/github/nogoo9-no-crd/src/server/peer-discovery.ts)).</p><hr><h2 id="🤝-peer-key-negotiation-protocol" tabindex="-1">🤝 Peer Key Negotiation Protocol <a class="header-anchor" href="#🤝-peer-key-negotiation-protocol" aria-label="Permalink to &quot;🤝 Peer Key Negotiation Protocol&quot;">​</a></h2>`);
  ssrRenderSuspense(_push, {
    default: () => {
      _push(ssrRenderComponent(_component_Mermaid, {
        id: "mermaid-10",
        class: "mermaid",
        graph: "sequenceDiagram%0A%20%20%20%20autonumber%0A%20%20%20%20participant%20PodA%20as%20Replica%20Pod%20A%0A%20%20%20%20participant%20K8sSecret%20as%20K8s%20Secret%3A%20nogoo9-session-key%0A%20%20%20%20participant%20PodB%20as%20Replica%20Pod%20B%0A%0A%20%20%20%20PodA-%3E%3EK8sSecret%3A%20Read%20Secret%20on%20Boot%0A%20%20%20%20alt%20Secret%20Exists%0A%20%20%20%20%20%20%20%20K8sSecret--%3E%3EPodA%3A%20Shared%20256-bit%20Key%0A%20%20%20%20else%20Secret%20Missing%0A%20%20%20%20%20%20%20%20PodA-%3E%3EK8sSecret%3A%20Atomically%20Create%20Secret%20with%20Random%20Key%0A%20%20%20%20%20%20%20%20K8sSecret--%3E%3EPodA%3A%20Key%20Created%20%26%20Confirmed%0A%20%20%20%20end%0A%0A%20%20%20%20PodB-%3E%3EK8sSecret%3A%20Read%20Secret%20on%20Boot%0A%20%20%20%20K8sSecret--%3E%3EPodB%3A%20Return%20Shared%20256-bit%20Key%20negotiated%20by%20Pod%20A%0A%20%20%20%20Note%20over%20PodA%2CPodB%3A%20Both%20replicas%20now%20share%20identical%20session%20cookie%20keys!%0A"
      }, null, _parent));
    },
    fallback: () => {
      _push(` Loading... `);
    },
    _: 1
  });
  _push(`<hr><h2 id="🛡️-guarantees" tabindex="-1">🛡️ Guarantees <a class="header-anchor" href="#🛡️-guarantees" aria-label="Permalink to &quot;🛡️ Guarantees&quot;">​</a></h2><ol><li><strong>Zero Database Dependency</strong>: Eliminates external database infrastructure for session state management.</li><li><strong>Atomic Conflict Resolution</strong>: Simultaneous replica boots resolve races cleanly through Kubernetes API atomic secret creation semantics (<code>409 Conflict</code> fallback to read).</li><li><strong>Seamless Stateless Scaling</strong>: Any replica can decrypt session cookies (<code>nocr_sess</code>) and refresh tokens (<code>nocr_refresh</code>) issued by any other replica.</li></ol></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("wiki/peer-discovery-and-ha.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const peerDiscoveryAndHa = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  peerDiscoveryAndHa as default
};
