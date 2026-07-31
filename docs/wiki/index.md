# Deep Wiki Knowledge Base

Welcome to the **nogoo9 Deep Wiki Knowledge Base**. This section provides deep architectural documentation, component interaction sequence diagrams, state machine specifications, security threat models, and subsystem designs for the `nogoo9` platform.

---

## 🗺️ System Architecture & Subsystems

```mermaid
graph TD
    subgraph Client Layer
        Agent["AI Agent (MCP Client)"]
        UI["Modular React Web Dashboard UI (src/ui/)"]
    end

    subgraph Gateway & Proxy Layer
        Fastify["Fastify Gateway (src/server/)"]
        AuthModule["OIDC, Quotas & Singleflight Auth (src/server/auth*.ts)"]
        SSEMgr["SSE Session Manager (src/server/sse.ts)"]
        Proxy["Reverse Proxy & Header Injection (src/server/routes/proxy*.ts)"]
    end

    subgraph Orchestration Layer
        MCP["MCP Server Engine (src/mcp/)"]
        Spawner["Zero-CRD Spawner & Auth Hooks (src/k8s/)"]
        PeerDisc["Leaderless Peer Discovery (src/server/peer-discovery.ts)"]
    end

    subgraph Kubernetes & External Services
        K8sAPI["Kubernetes API Server"]
        Keycloak["Keycloak OIDC IdP"]
        Storage["MinIO / RustFS S3 Storage"]
    end

    Agent -->|HTTP/SSE or Stdio| Fastify
    UI -->|OIDC PKCE & Session Cookie| Fastify
    Fastify --> AuthModule
    AuthModule --> Keycloak
    Fastify --> SSEMgr
    Fastify --> MCP
    MCP --> Spawner
    Spawner -->|Quota & Role Checks| K8sAPI
    Fastify --> Proxy
    Proxy -->|Pod IP Direct Tunnel| Pod["Ephemeral Pod Container"]
    PeerDisc --> K8sAPI
    Pod -->|PreStop Log Sync| Storage
```

---

## 📚 Deep Wiki Directory

| Section | Description | Key Topics |
|---|---|---|
| [**Architecture Overview**](./architecture-overview.md) | End-to-end component topology and system boundaries | Gateway design, zero-operator philosophy, request pathways, modular UI |
| [**Zero-CRD Pod Lifecycle**](./zero-crd-pod-lifecycle.md) | Pod orchestration & upgrade state machines | Pod spec generation, annotations, PVC locking, concurrency limits (ADR-026), 1-by-1 vs bulk upgrades |
| [**Auth & Security Model**](./auth-and-security-model.md) | OIDC authentication & cookie crypto | RFC 9728 metadata, AES-256-GCM cookies, singleflight refresh deduplication, template role/scope authorization (ADR-027) |
| [**Routing Proxy & Tunneling**](./routing-proxy-and-tunneling.md) | Dynamic reverse proxying & auth modes | Header rewriting (`X-User-Sub`), WS piping, `token-api` / `inject-headers`, HTTP fallback transport |
| [**Peer Discovery & HA**](./peer-discovery-and-ha.md) | Multi-replica secret negotiation | Leaderless startup, shared session keys, zero-database HA |
| [**MCP Tool Engine & Schemas**](./mcp-tool-engine-and-schemas.md) | MCP protocol implementation | Transport adapters, tool registration, spawner & pod handler contracts, metadata extensions |
| [**UI & MCP Client Integration**](./ui-and-mcp-client-integration.md) | Frontend web dashboard & client bridge | Modular React architecture (`src/ui/components/`), OIDC PKCE flow, handshake rules |
