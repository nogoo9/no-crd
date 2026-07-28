# UI & MCP Client Integration

The `nogoo9` web dashboard ([`src/ui/`](file:///home/eterna2/github/nogoo9-no-crd/src/ui/)) provides an interactive SPA for workspace management, template browsing, live log streaming, and theme customization.

---

## 🤝 Client Authentication & Handshake Rules

Per [MCP Client Rules](file:///home/eterna2/github/nogoo9-no-crd/.agents/rules/mcp-client.md), clients strictly enforce OIDC authentication before completing the MCP handshake:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant UI as React UI (src/ui/)
    participant Hook as useOidcAuth Hook (src/ui/hooks/useOidcAuth.ts)
    participant MCPBridge as useMcpClient Hook (src/ui/hooks/useMcpClient.ts)
    participant Gateway as Server Gateway

    User->>UI: Open Dashboard URL
    UI->>Hook: Check OIDC Token State
    alt Token Missing / Expired
        Hook->>User: Redirect to Keycloak PKCE Login
        User-->>Hook: Return with Authorization Code (?code=...)
        Hook->>Gateway: Exchange Code for Access Token
        Gateway-->>Hook: Access Token & Session Cookie Saved
    end
    Hook-->>UI: isInitialized = true
    UI->>MCPBridge: Connect MCP Client (app.connect())
    MCPBridge->>Gateway: Initial Handshake
    Gateway-->>MCPBridge: Handshake Complete
    MCPBridge->>Gateway: Call Tools (list_workspaces, list_templates)
```

---

## 🧩 Modular React Hooks

- [`src/ui/hooks/useOidcAuth.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/ui/hooks/useOidcAuth.ts): Manages Keycloak OIDC PKCE login flow, token storage, token auto-refresh, and identity state.
- [`src/ui/hooks/useMcpClient.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/ui/hooks/useMcpClient.ts): Manages the web standard HTTP transport connection to `/mcp`, exposing ready state and tool invocation wrappers.
