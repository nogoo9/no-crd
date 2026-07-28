import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderSuspense, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Zero-CRD Pod Lifecycle & Recreate Upgrade State Machine","description":"","frontmatter":{},"headers":[],"relativePath":"wiki/zero-crd-pod-lifecycle.md","filePath":"wiki/zero-crd-pod-lifecycle.md"}');
const _sfc_main = { name: "wiki/zero-crd-pod-lifecycle.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Mermaid = resolveComponent("Mermaid");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="zero-crd-pod-lifecycle-recreate-upgrade-state-machine" tabindex="-1">Zero-CRD Pod Lifecycle &amp; Recreate Upgrade State Machine <a class="header-anchor" href="#zero-crd-pod-lifecycle-recreate-upgrade-state-machine" aria-label="Permalink to &quot;Zero-CRD Pod Lifecycle &amp; Recreate Upgrade State Machine&quot;">​</a></h1><p>This article documents how <code>nogoo9</code> manages pod creation, container overrides, storage binding, annotation processing, shutdown hooks, and recreate-style zero-downtime workspace upgrades without requiring Kubernetes CRDs.</p><hr><h2 id="🔁-workspace-lifecycle-state-machine" tabindex="-1">🔁 Workspace Lifecycle State Machine <a class="header-anchor" href="#🔁-workspace-lifecycle-state-machine" aria-label="Permalink to &quot;🔁 Workspace Lifecycle State Machine&quot;">​</a></h2>`);
  ssrRenderSuspense(_push, {
    default: () => {
      _push(ssrRenderComponent(_component_Mermaid, {
        id: "mermaid-10",
        class: "mermaid",
        graph: "stateDiagram-v2%0A%20%20%20%20%5B*%5D%20--%3E%20Idle%3A%20Template%20%2F%20Inline%20Definition%0A%20%20%20%20Idle%20--%3E%20Spawning%3A%20spawn_workspace()%0A%20%20%20%20Spawning%20--%3E%20InitContainer%3A%20Inject%20Sync%20Init%20Container%0A%20%20%20%20InitContainer%20--%3E%20Running%3A%20Main%20Container%20Starts%0A%20%20%20%20Running%20--%3E%20Executing%3A%20run_agent_in_workspace()%20%2F%20Proxy%20Traffic%0A%20%20%20%20Executing%20--%3E%20Running%3A%20Request%20Completed%0A%20%20%20%20Running%20--%3E%20PreStopSync%3A%20stop_workspace()%20%2F%20Termination%0A%20%20%20%20PreStopSync%20--%3E%20Terminated%3A%20Sync%20Logs%20to%20S3%20%2F%20PVC%20Unmount%0A%20%20%20%20Terminated%20--%3E%20%5B*%5D%0A%0A%20%20%20%20state%20UpgradeProcess%20%7B%0A%20%20%20%20%20%20%20%20Running%20--%3E%20UpgradeTriggered%3A%20upgrade_workspace()%20%2F%20upgrade_all_workspaces()%0A%20%20%20%20%20%20%20%20UpgradeTriggered%20--%3E%20CheckPVC%3A%20Check%20Storage%20Type%0A%20%20%20%20%20%20%20%20CheckPVC%20--%3E%20NormalUpgrade%3A%20Shared%20PVC%20(ReadWriteMany%20%2F%20Ephemeral)%0A%20%20%20%20%20%20%20%20CheckPVC%20--%3E%20RecreateFallback%3A%20RWO%20PVC%20(ReadWriteOnce)%0A%20%20%20%20%20%20%20%20RecreateFallback%20--%3E%20DeleteOldPod%3A%20Delete%20Old%20Pod%20%26%20Release%20Storage%20Lock%0A%20%20%20%20%20%20%20%20DeleteOldPod%20--%3E%20SpawnNewPod%3A%20Create%20Upgraded%20Pod%20Version%0A%20%20%20%20%20%20%20%20NormalUpgrade%20--%3E%20SpawnNewPod%3A%20Parallel%20Upgraded%20Pod%20Creation%0A%20%20%20%20%7D%0A"
      }, null, _parent));
    },
    fallback: () => {
      _push(` Loading... `);
    },
    _: 1
  });
  _push(`<hr><h2 id="🛠️-pod-spec-annotation-expansion" tabindex="-1">🛠️ Pod Spec &amp; Annotation Expansion <a class="header-anchor" href="#🛠️-pod-spec-annotation-expansion" aria-label="Permalink to &quot;🛠️ Pod Spec &amp; Annotation Expansion&quot;">​</a></h2><p>When <code>spawn_workspace</code> is invoked, <code>nogoo9</code> constructs a standard Kubernetes <code>Pod</code> object via [<code>src/k8s/spawner.ts</code>](file:///home/eterna2/github/nogoo9-no-crd/src/k8s/spawner.ts) and [<code>src/k8s/annotations.ts</code>](file:///home/eterna2/github/nogoo9-no-crd/src/k8s/annotations.ts):</p><ol><li><p><strong>Labels &amp; Identity</strong>:</p><ul><li><code>nogoo9/type</code>: <code>workspace</code></li><li><code>nogoo9/workspace-id</code>: <code>&lt;workspaceId&gt;</code></li><li><code>nogoo9/user-sub</code>: <code>&lt;ownerSubjectId&gt;</code></li><li><code>nogoo9/template-version</code>: <code>&lt;version&gt;</code></li></ul></li><li><p><strong>Annotation Expansion Helpers</strong>:</p><ul><li><code>validateRequiredContext</code>: Ensures required runtime context keys are provided.</li><li><code>injectInitContainer</code>: Pre-populates files/scripts from S3 or ConfigMaps into workspace volumes before container startup.</li><li><code>injectPreStopHook</code>: Attaches lifecycle preStop termination hooks to execute log/state synchronization scripts before pod deletion.</li></ul></li></ol><hr><h2 id="🚀-recreate-style-workspace-upgrades" tabindex="-1">🚀 Recreate-Style Workspace Upgrades <a class="header-anchor" href="#🚀-recreate-style-workspace-upgrades" aria-label="Permalink to &quot;🚀 Recreate-Style Workspace Upgrades&quot;">​</a></h2><p>Workspace upgrades support both 1-by-1 user upgrades and bulk admin upgrades (<code>upgrade_all_workspaces</code>):</p><ol><li><strong>Owner Preservation</strong>: The original <code>nogoo9/user-sub</code> label is strictly preserved across template version upgrades.</li><li><strong>RWO PVC Storage Safety</strong>: For pods with ReadWriteOnce (RWO) persistent volume claims, <code>nogoo9</code> safely deletes the old pod first to release volume locks before spawning the upgraded pod instance.</li><li><strong>Event Streaming</strong>: Upgrade progress is broadcast live via <code>get_workspace_events</code>.</li></ol></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("wiki/zero-crd-pod-lifecycle.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const zeroCrdPodLifecycle = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  zeroCrdPodLifecycle as default
};
