---
description: Perform a systematic audit of VitePress documentation pages against source code, configuration definitions, and test suites.
---

# Audit Documentation Accuracy Workflow

Use this workflow to verify that all documentation pages under `docs/` and `README.md` accurately reflect current source code in `src/`, configuration definitions in `src/config/`, tool handlers in `src/mcp/`, and test suites in `scripts/` and `src/**/*.test.ts`.

---

## Step 1 — Audit MCP Tool Catalog & Parameter Schemas

1. Read `src/mcp/server.ts` to retrieve the complete list of registered tools across all categories:
   - Diagnostic tools (`current_namespace`, `check_permissions`, `get_capabilities`, `list_registry_images`)
   - Pod tools (`list_pods`, `get_pod`, `create_pod`, `patch_pod`, `delete_pod`, `get_pod_logs`, `list_namespaces`)
   - Template tools (`list_templates`, `get_template`, `create_template`, `update_template`, `delete_template`, `create_pod_from_template`)
   - Spawner tools (`list_workspaces`, `get_workspace`, `spawn_workspace`, `stop_workspace`, `get_workspace_events`, `run_agent_in_workspace`, `upgrade_workspace`, `upgrade_all_workspaces`)
2. Inspect `docs/mcp/tools.md` and verify that every registered tool is documented with:
   - Full description
   - Required RBAC scopes / roles
   - Parameter inputs table matching Zod schemas in `src/mcp/schemas.ts`
   - Example JSON input and structured output payloads

---

## Step 2 — Audit Configuration Variables & Template Annotations

1. Verify that `CONFIG_METADATA` in `src/config/index.ts` matches the tables in `docs/deploy/configuration.md` and `README.md`.
2. Verify that `ANNOTATION_KEYS` and `ANNOTATION_METADATA` in `src/config/index.ts` match `docs/deploy/workspace-customization.md`.
3. Run `bun run update:permissions` to automatically regenerate permission, config, and annotation tables across documentation files.

---

## Step 3 — Audit Upgrade State Machines & Storage Locking

1. Inspect `src/mcp/spawner/handlers/index.ts` and `ADR-024` for workspace template upgrade behavior.
2. Verify that `docs/deploy/workspace-upgrades.md` and `docs/wiki/zero-crd-pod-lifecycle.md` accurately distinguish between:
   - **Side-by-Side Upgrades (Default)**: `Spawn New Pod -> Poll Ready -> Delete Old Pod`
   - **ReadWriteOnce (RWO) PVC Fallback**: `Delete Old Pod First (Release Volume Lock) -> Spawn New Pod`

---

## Step 4 — Audit Code & Test Paths in Developer Guides

1. Scan `docs/developer/contributing.md`, `docs/developer/local-sandbox.md`, and `docs/developer/programmatic-sdk.md`.
2. Verify that all referenced file paths (e.g. `src/mcp/spawner/index.test.ts`, `src/server/index.ts`) match actual filesystem locations.

---

## Step 5 — Build & Quality Gate Verification

Execute the full build pipeline:
```bash
bun run format
bun run typecheck
bun run update:permissions
bun run build:docs
bun run docs:build
```
Ensure zero compilation errors, zero broken links, and 100% documentation accuracy.
