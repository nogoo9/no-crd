# Architecture Overview & System Boundaries

`nogoo9` is an agent-driven platform for on-demand pod orchestration in Kubernetes (k8s/k3s) **without Custom Resource Definitions (CRDs)** or cluster-level operators. It enables AI agents, CLI tools, and web dashboards to dynamically spawn, route traffic to, and manage ephemeral workspace pods.

---

## 🏛️ Architectural Principles

1. **Zero-CRD Philosophy**: Uses native Kubernetes primitives (`Pod`, `ConfigMap`, `Secret`, `PersistentVolumeClaim`) without registering custom resource definitions or requiring cluster-admin CRD permissions.
2. **Isomorphic Runtime Compatibility**: Cross-runtime support for **Bun**, **Deno**, and **Node.js** execution targets pinned via `.prototools` and `.moon/toolchain.yml`.
3. **Stateless / Leaderless Gateway**: Multiple gateway replicas run in parallel without stateful databases (Postgres/Redis), negotiating encryption secrets via Kubernetes Secrets.
4. **Strict Security Boundaries**: Identity-aware access control enforcing per-user isolation, RFC 9728 OIDC resource discovery, and RBAC scope validation.

---

## 🔄 End-to-End Request Flow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Agent as AI Agent / User
    participant Gateway as Fastify Server (src/server/)
    participant Auth as OIDC Validator (src/server/auth.ts)
    participant IdP as Keycloak IdP
    participant MCP as MCP Engine (src/mcp/)
    participant K8s as Kubernetes API

    Agent->>Gateway: POST /mcp (Call Tool: spawn_workspace)
    Gateway->>Auth: Verify Authorization Header / Cookie
    Auth->>IdP: Validate JWT / Introspect Claims
    IdP-->>Auth: Claims: sub="user-123", roles=["mcp-writer"]
    Auth-->>Gateway: Authenticated UserContext
    Gateway->>MCP: Execute spawn_workspace(templateId)
    MCP->>K8s: Create Pod (Labels: nogoo9/user-sub="user-123")
    K8s-->>MCP: Pod Created (Status: Pending -> Running)
    MCP-->>Gateway: Workspace Details (Pod IP, Route Path)
    Gateway-->>Agent: JSON-RPC Response (Workspace Ready)
```

---

## 📂 Source Code Map

| Subsystem | Primary Location | Key Responsibilities |
|---|---|---|
| **Server Gateway** | [`src/server/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/server/index.ts) | HTTP/WebSocket bootstrap, rate limiting, CORS, SSE session cleanup |
| **Auth & Crypto** | [`src/server/auth.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/server/auth.ts) | OIDC discovery, AES-256-GCM session cookies, singleflight refresh deduplication |
| **Routing Proxy** | [`src/server/routes/proxy.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/server/routes/proxy.ts) | Direct pod IP tunneling, header injection (`X-User-Sub`), WebSocket upgrade piping |
| **MCP Engine** | [`src/mcp/server.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/server.ts) | Protocol initialization, tool registration, capabilities reporting |
| **Spawner Handlers**| [`src/mcp/spawner/handlers/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/spawner/handlers/index.ts) | Workspace spawn, stop, upgrade, and event streaming tool logic |
| **Kubernetes Client**| [`src/k8s/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/k8s/index.ts) | Pod spec construction, annotation expansion, PVC binding,RBAC security |
| **Peer Discovery** | [`src/server/peer-discovery.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/server/peer-discovery.ts) | Multi-replica secret negotiation via K8s secrets |
| **Frontend UI** | [`src/ui/`](file:///home/eterna2/github/nogoo9-no-crd/src/ui/) | React web dashboard, OIDC PKCE hooks, themes, MCP client integration |
