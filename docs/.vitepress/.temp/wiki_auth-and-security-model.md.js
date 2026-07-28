import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderSuspense, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Auth & Security Model","description":"","frontmatter":{},"headers":[],"relativePath":"wiki/auth-and-security-model.md","filePath":"wiki/auth-and-security-model.md"}');
const _sfc_main = { name: "wiki/auth-and-security-model.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Mermaid = resolveComponent("Mermaid");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="auth-security-model" tabindex="-1">Auth &amp; Security Model <a class="header-anchor" href="#auth-security-model" aria-label="Permalink to &quot;Auth &amp; Security Model&quot;">​</a></h1><p><code>nogoo9</code> implements identity-aware authorization, session cookie security, singleflight request deduplication, and fine-grained Role-Based Access Control (RBAC) to ensure complete tenant isolation across multi-user environments.</p><hr><h2 id="🔒-session-cookie-security-architecture" tabindex="-1">🔒 Session &amp; Cookie Security Architecture <a class="header-anchor" href="#🔒-session-cookie-security-architecture" aria-label="Permalink to &quot;🔒 Session &amp; Cookie Security Architecture&quot;">​</a></h2>`);
  ssrRenderSuspense(_push, {
    default: () => {
      _push(ssrRenderComponent(_component_Mermaid, {
        id: "mermaid-10",
        class: "mermaid",
        graph: "graph%20TD%0A%20%20%20%20Client%5B%22Client%20%2F%20Browser%22%5D%20--%3E%7CHTTP%20Request%7C%20Server%5B%22Fastify%20Gateway%22%5D%0A%20%20%20%20Server%20--%3E%7CParse%20Cookies%7C%20CookieEngine%5B%22Cookie%20Engine%20(src%2Fserver%2Fauth.ts)%22%5D%0A%20%20%20%20CookieEngine%20--%3E%7CValidate%20AES-256-GCM%7C%20SessCookie%5B%22nocr_sess%20(Short-lived%20Session)%22%5D%0A%20%20%20%20CookieEngine%20--%3E%7CSingleflight%20Coalesce%7C%20RefCookie%5B%22nocr_refresh%20(Encrypted%20Refresh%20Token)%22%5D%0A%20%20%20%20RefCookie%20--%3E%7COIDC%20Token%20Exchange%7C%20IdP%5B%22OIDC%20Identity%20Provider%22%5D%0A%20%20%20%20IdP%20--%3E%7CRotated%20Refresh%20%26%20Access%20Token%7C%20CookieEngine%0A%20%20%20%20CookieEngine%20--%3E%7CSet-Cookie%20Headers%7C%20Client%0A"
      }, null, _parent));
    },
    fallback: () => {
      _push(` Loading... `);
    },
    _: 1
  });
  _push(`<hr><h2 id="🔑-key-security-components" tabindex="-1">🔑 Key Security Components <a class="header-anchor" href="#🔑-key-security-components" aria-label="Permalink to &quot;🔑 Key Security Components&quot;">​</a></h2><h3 id="_1-rfc-9728-compliance" tabindex="-1">1. RFC 9728 Compliance <a class="header-anchor" href="#_1-rfc-9728-compliance" aria-label="Permalink to &quot;1. RFC 9728 Compliance&quot;">​</a></h3><ul><li>Unauthenticated requests to protected endpoints return <code>HTTP 401 Unauthorized</code> with standard RFC 9728 challenge headers:<div class="language-http vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">http</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">WWW-Authenticate</span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">:</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> Bearer resource_metadata=&quot;http://localhost:8080/nocr/.well-known/oauth-protected-resource&quot;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">Link</span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">:</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> &lt;http://localhost:8080/nocr/.well-known/oauth-protected-resource&gt;; rel=&quot;oauth-protected-resource&quot;</span></span></code></pre></div></li></ul><h3 id="_2-cookie-cryptography-nocr-sess-nocr-refresh" tabindex="-1">2. Cookie Cryptography (<code>nocr_sess</code> &amp; <code>nocr_refresh</code>) <a class="header-anchor" href="#_2-cookie-cryptography-nocr-sess-nocr-refresh" aria-label="Permalink to &quot;2. Cookie Cryptography (\`nocr_sess\` &amp; \`nocr_refresh\`)&quot;">​</a></h3><ul><li><code>nocr_sess</code>: Encrypted payload containing user subject (<code>sub</code>), roles, issue time (<code>iat</code>), and expiration (<code>exp</code>).</li><li><code>nocr_refresh</code>: AES-256-GCM encrypted refresh token tied to the cluster session secret.</li></ul><h3 id="_3-singleflight-token-refresh-deduplication-src-server-auth-singleflight-ts-file-home-eterna2-github-nogoo9-no-crd-src-server-auth-singleflight-ts" tabindex="-1">3. Singleflight Token Refresh Deduplication ([<code>src/server/auth-singleflight.ts</code>](file:///home/eterna2/github/nogoo9-no-crd/src/server/auth-singleflight.ts)) <a class="header-anchor" href="#_3-singleflight-token-refresh-deduplication-src-server-auth-singleflight-ts-file-home-eterna2-github-nogoo9-no-crd-src-server-auth-singleflight-ts" aria-label="Permalink to &quot;3. Singleflight Token Refresh Deduplication ([\`src/server/auth-singleflight.ts\`](file:///home/eterna2/github/nogoo9-no-crd/src/server/auth-singleflight.ts))&quot;">​</a></h3><ul><li>Concurrent refresh requests using the same refresh token are coalesced into a single outbound IdP round-trip via <code>deduplicateRefreshCall</code>.</li><li>Prevents race conditions and invalidation errors during OIDC Refresh Token Rotation (RTR).</li></ul><h3 id="_4-per-user-rbac-isolation" tabindex="-1">4. Per-User RBAC Isolation <a class="header-anchor" href="#_4-per-user-rbac-isolation" aria-label="Permalink to &quot;4. Per-User RBAC Isolation&quot;">​</a></h3><ul><li>Normal users can only see, query logs for, stop, or upgrade their own workspaces (<code>nogoo9/user-sub</code>).</li><li>Users with <code>nogoo9:admin</code> or cluster admin roles can manage across all tenant boundaries.</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("wiki/auth-and-security-model.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const authAndSecurityModel = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  authAndSecurityModel as default
};
