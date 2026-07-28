import { ssrRenderAttrs, ssrRenderStyle, ssrRenderAttr } from "vue/server-renderer";
import { _ as _imports_0 } from "./dashboard_screenshot.BQtxAiW_.js";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"nogoo9","text":"No-CRD Pod Orchestration","tagline":"Agent-driven, on-demand ephemeral Kubernetes pods without custom resource operators.","actions":[{"theme":"brand","text":"Get Started","link":"/getting-started"},{"theme":"alt","text":"API Reference","link":"/api/"}],"image":{"src":"/logo.png","alt":"logo"}},"features":[{"title":"Zero CRD","details":"Instantly run workloads inside regular pods and namespaces without cluster-level operators or custom resources."},{"title":"Agent-Native","details":"Provides first-class Model Context Protocol (MCP) server endpoints optimized for AI coding agents."},{"title":"Cross-Runtime","details":"Runs seamlessly across Bun, Deno, and Node.js with built-in runtime detection and polyfills."},{"title":"Secure Routing Proxy","details":"Proxy HTTP traffic natively to container IPs with secure token isolation, CORS policies, and customizable rate limiting."},{"title":"Lifecycle & Hooks","details":"Automate workspace init (e.g., git cloning) and graceful termination (e.g., S3 syncing) using native pod spawner rules."},{"title":"Embedded Dashboard","details":"A built-in interactive React UI to view active sandboxes, templates, logs, and manage token details."}]},"headers":[],"relativePath":"index.md","filePath":"index.md"}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p align="center" style="${ssrRenderStyle({ "margin-top": "3rem", "margin-bottom": "3rem" })}"><img${ssrRenderAttr("src", _imports_0)} alt="no-crd Dashboard Screenshot" style="${ssrRenderStyle({ "border-radius": "12px", "box-shadow": "0 8px 32px rgba(0,0,0,0.35)", "border": "1px solid rgba(255,255,255,0.08)" })}" width="850"></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
