# Architecture Decision Records

Architecture Decision Records (ADRs) capture the reasoning behind significant technical decisions. They document the context, constraints, alternatives considered, and trade-offs that led to each choice.

> [!TIP]
> ADRs are the highest-value documentation in a project. They prevent re-debating the same decisions and help new contributors (human or AI) understand *why* the codebase is shaped the way it is.

## Active Decisions

| ADR | Decision | Status |
|-----|----------|--------|
| [ADR-001](./ADR-001-template-file-format.md) | Support YAML and JSON for Pod Template Files | Accepted |
| [ADR-002](./ADR-002-stateless-session-cookies.md) | Stateless Signed Session Cookies for Proxy Auth | Accepted |
| [ADR-003](./ADR-003-peer-discovery-session-key.md) | Peer Discovery for Session Key Sharing | Accepted |
| [ADR-004](./ADR-004-three-source-theme-merge.md) | Three-Source Theme Merge with Built-In Fallback | Accepted |
| [ADR-005](./ADR-005-ui-proactive-oidc-refresh.md) | Session Cookie Coverage for All Endpoints | Accepted |
| [ADR-006](./ADR-006-packaged-ui-asset-resolution.md) | Packaged UI Asset and Built-in Resource Resolution | Accepted |
| [ADR-007](./ADR-007-schema-driven-configuration.md) | Schema-Driven Configuration & Unified Annotation Keys | Accepted |
| [ADR-008](./ADR-008-managed-only-pod-access-control.md) | Managed-Only Pod Access Control | Accepted |
| [ADR-009](./ADR-009-eager-startup-health-check.md) | Eager MCP Server Initialization with K8s Health Check | Accepted |

## How to Read ADRs

Each ADR follows a standard structure:

- **Status** — `Accepted`, `Deprecated`, or `Superseded by ADR-XXX`
- **Context** — The problem, constraints, and requirements
- **Decision** — What was decided and how it works
- **Alternatives Considered** — What other options were evaluated and why they were rejected
- **Consequences** — What follows from the decision (both positive and negative)

## Relationship Map

```mermaid
graph LR
    ADR002["ADR-002: Session Cookies"] --> ADR003["ADR-003: Peer Discovery"]
    ADR002 --> ADR005["ADR-005: Full Endpoint Coverage"]
    ADR001["ADR-001: Template Format"] -.-> ADR004["ADR-004: Theme Merge"]
    ADR004 -.-> ADR006["ADR-006: Asset Resolution"]
    ADR001 -.-> ADR007["ADR-007: Schema Config"]
    ADR007 -.-> ADR008["ADR-008: Managed-Only Access"]
    ADR008 -.-> ADR009["ADR-009: Eager Startup"]
    style ADR002 fill:#4a9eff,color:#fff
    style ADR003 fill:#4a9eff,color:#fff
    style ADR005 fill:#4a9eff,color:#fff
    style ADR001 fill:#22c55e,color:#fff
    style ADR004 fill:#22c55e,color:#fff
    style ADR006 fill:#22c55e,color:#fff
    style ADR007 fill:#22c55e,color:#fff
    style ADR008 fill:#f59e0b,color:#fff
    style ADR009 fill:#f59e0b,color:#fff
```

- **Blue**: Authentication & session management chain
- **Green**: Template & theme system
- **Amber**: Access control & security
