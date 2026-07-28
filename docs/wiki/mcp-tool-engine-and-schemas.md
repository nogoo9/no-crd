# MCP Tool Engine & Schemas

The Model Context Protocol (MCP) server ([`src/mcp/server.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/server.ts)) exposes pod lifecycle and template management tools to AI agents and clients via standard JSON-RPC contracts over HTTP/SSE and Stdio transports.

---

## 🛠️ MCP Tool Catalog

| Tool Name | Scope Requirement | Description | Handler File |
|---|---|---|---|
| `spawn_workspace` | `mcp:write` | Spawns a new workspace pod from a template or inline definition | [`src/mcp/spawner/handlers/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/spawner/handlers/index.ts) |
| `stop_workspace` | `mcp:write` | Stops a running workspace pod and triggers preStop sync | [`src/mcp/spawner/handlers/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/spawner/handlers/index.ts) |
| `get_workspace` | `mcp:read` | Queries workspace status, pod IP, readiness, and routing URL | [`src/mcp/spawner/handlers/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/spawner/handlers/index.ts) |
| `list_workspaces` | `mcp:read` | Lists all workspaces owned by or accessible to the caller | [`src/mcp/spawner/handlers/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/spawner/handlers/index.ts) |
| `get_workspace_events` | `mcp:read` | Returns event stream history for workspace lifecycle debugging | [`src/mcp/spawner/handlers/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/spawner/handlers/index.ts) |
| `run_agent_in_workspace` | `mcp:write` | Executes command lines inside a live workspace pod container | [`src/mcp/spawner/handlers/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/spawner/handlers/index.ts) |
| `upgrade_workspace` | `mcp:write` | Performs a 1-by-1 template version upgrade on a target workspace | [`src/mcp/spawner/handlers/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/spawner/handlers/index.ts) |
| `upgrade_all_workspaces` | `admin` | Performs bulk version upgrades across all outdated tenant workspaces | [`src/mcp/spawner/handlers/index.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/mcp/spawner/handlers/index.ts) |

---

## ⚡ Transports

1. **HTTP/SSE Transport**: Exposed at `GET /mcp` (SSE stream) and `POST /mcp` (message POST). Supports stateful session IDs (`mcp-session-id`) and stateless per-request execution.
2. **Stdio Transport**: Command-line integration mode via `bun run run:bun -- --stdio`.
