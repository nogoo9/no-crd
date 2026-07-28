---
description: Audit codebase subsystems, ADRs, and schemas to generate or update the comprehensive Deep Wiki documentation under docs/wiki/.
---

# Generate Deep Wiki Workflow

Use this workflow to audit the project's codebase, architecture decisions, and protocol schemas, and generate or update the **Deep Wiki Knowledge Base** (`docs/wiki/`) for VitePress.

---

## Step 1 — Codebase & Architectural Audit Strategy

1. **Subsystem Discovery**: Scan all core source directories:
   - `src/server/` — Gateway HTTP/SSE server, OAuth token endpoints, singleflight deduplication, reverse proxying.
   - `src/k8s/` — Kubernetes client, zero-CRD pod spawner, annotation expansion, PVC storage lifecycle.
   - `src/mcp/` — MCP protocol server, spawner/pod/template tool handlers, JSON-RPC schemas.
   - `src/auth/` — OIDC token validation, JWT claim extraction, role & scope mapping.
   - `src/ui/` — React dashboard, Keycloak OIDC PKCE hooks (`useOidcAuth`), MCP client bridge (`useMcpClient`).
   - `infra/` — K3d local cluster, Keycloak IdP, MinIO/RustFS storage, helm/k8s manifests.
   - `docs/decisions/` — Architectural Decision Records (ADR-001 through ADR-025).

2. **Domain Categorization**: Ensure the wiki covers all essential domain areas:
   - **System Architecture**: End-to-end component topology, system boundaries, and interaction sequences.
   - **Pod Lifecycle & State Machine**: Pod spec generation, init container injection, preStop hooks, and recreate-style zero-downtime upgrades.
   - **Auth & Security Model**: RFC 9728 OIDC protected resource metadata, `nocr_sess` / `nocr_refresh` / `nocr_token` AES-256-GCM cookie crypto, singleflight refresh request deduplication, and tenant isolation.
   - **Routing Proxy & Tunneling**: Dynamic pod IP reverse proxying, header rewriting (`X-User-Sub`, `X-Workspace-JWT`), WebSocket upgrade piping, and workspace auth-mode behaviors (`inject-headers`, `redirect`, `token-api`, `no-auth`).
   - **Leaderless Peer Discovery & HA**: Multi-replica gateway boot, secret-backed key exchange, and peer pod negotiation.
   - **MCP Tool Engine**: Protocol transport adapters (HTTP/SSE & Stdio), tool registry, and execution handlers.
   - **UI & Client Integration**: React web dashboard architecture, handshake sequencing, and OIDC PKCE state management.

---

## Step 2 — Content Quality Rules

Every article under `docs/wiki/` MUST adhere to the following standards:

1. **Mermaid Diagrams**: Include at least one detailed Mermaid sequence, flowchart, or class diagram visualizing subsystem architecture and request lifecycles.
2. **Code Traceability**: Provide explicit links to authoritative implementation files (e.g. `src/server/index.ts`, `src/k8s/spawner.ts`).
3. **Failure Modes & Edge Cases**: Document failure recovery, timeout policies, rate limiting, and security boundaries.
4. **Zero-CRD Philosophy**: Explicitly explain how Kubernetes core primitives (Pods, ConfigMaps, Secrets) are leveraged without cluster-level operators or custom CRDs.

---

## Step 3 — Generate & Update Articles (`docs/wiki/`)

Audit existing `docs/wiki/*.md` files and generate or update them:
- `docs/wiki/index.md` — Master Knowledge Map & Navigation Index
- `docs/wiki/architecture-overview.md` — System Architecture & Component Interaction
- `docs/wiki/zero-crd-pod-lifecycle.md` — Pod Lifecycle & Recreate Upgrade State Machine
- `docs/wiki/auth-and-security-model.md` — OIDC Auth, Session Cookie Crypto & Singleflight Deduplication
- `docs/wiki/routing-proxy-and-tunneling.md` — Dynamic Proxy Routing, Header Rewriting & Auth Modes
- `docs/wiki/peer-discovery-and-ha.md` — Multi-Replica Session Key Negotiation & Leaderless HA
- `docs/wiki/mcp-tool-engine-and-schemas.md` — MCP Server, Tool Handlers & Schema Contracts
- `docs/wiki/ui-and-mcp-client-integration.md` — Dashboard Architecture & MCP Handshake Sequence

Add any additional subsystem articles dynamically if new major features or components are introduced.

---

## Step 4 — Sync VitePress Navigation & ADR Index (`docs/.vitepress/config.ts`)

Verify `docs/.vitepress/config.ts` includes:
- Top navbar link `{ text: "Wiki", link: "/wiki/" }`
- Sidebar group `"Deep Wiki Knowledge Base"` containing all generated wiki pages under `docs/wiki/`.
- Sidebar group `"Architecture Decisions"` containing links to all active ADRs (`docs/decisions/ADR-*.md`). Ensure any newly created ADRs (e.g. ADR-024, ADR-025) are registered in `docs/.vitepress/config.ts` and `docs/decisions/index.md`.

---

## Step 5 — Verify Documentation Compilation

Run the full documentation build pipeline:
```bash
bun run update:permissions
bun run build:docs
bun run docs:build
```
Ensure zero markdown compilation errors, zero broken links, and clean VitePress output.
