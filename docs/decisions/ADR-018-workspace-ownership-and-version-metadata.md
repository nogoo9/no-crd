# ADR-018: Workspace Owner Association and Server Metadata Reporting

## Status
Accepted

## Date
2026-06-09

## Context
In the `nogoo9/no-crd` platform, users can dynamically spawn, route to, and manage ephemeral workspaces. With authentication enabled, it is critical that:
1. **Workspace Owner Association**: A workspace has a defined owner (the authenticated user's `sub`) at the exact moment of creation. Without this association, workspaces would be orphaned, violating access control.
2. **Dashboard Isolation vs. Admin View**: Standard users must only see workspaces they own on the dashboard. Admins require capability to see all active workspaces, partitioned cleanly to prevent layout clutter and duplication.
3. **Capability & Version Reporting**: Frontend clients need a runtime-agnostic way to inspect the server version of `@nogoo9/no-crd` and key repository links (NPM, GitHub) for diagnostics.

## Decision
1. **Schema and Parameter Alignment**: Corrected the parameter passed during `spawn_workspace` from `targetUserSub` to `userSub` in the frontend `app.tsx` to match the backend validation schema. This ensures the backend spawner correctly assigns user subjects during workspace initialization.
2. **Schema Capability Version**: Extended the `get_capabilities` tool response and the `GetCapabilitiesOutputSchema` in `src/mcp/namespace.ts` to return the server version (`APP_VERSION` from `src/version.ts`).
3. **List Workspace schema mapping**: Enabled the `list_workspaces` tool to populate the `userSub`, `owner`, `creationTime`, and `description` fields. This ensures that even starting/pending workspaces (which have no running container details yet) are correctly mapped to their owners on list loads.
4. **Layout Partitioning**: Filtered `activeUserWorkspaces` in the UI to match `ws.userSub === displayUser`. For administrators, other tenants' sandboxes are rendered in a separate `"Shared/Other Sandboxes (Admin Mode)"` section, preventing duplicate items in the primary view.
5. **Interactive Version/Links UI**: Integrated NPM and GitHub SVG icon links with micro-animations on hover, along with a `no-crd vX.Y.Z` version badge in the footer and a **no-crd Backend** card inside the `SystemInfoModal`.

## Alternatives Considered
- **Stateless UI versioning**: Hardcoding the version string in the frontend build. This was rejected because it causes discrepancies if the frontend bundle is cached or if the UI is run out-of-sync with the MCP host.
- **Backend-only filtering**: Allowing the backend to restrict listing entirely. We opted for a hybrid approach: the backend restricts list scope for non-admins, while the frontend handles layout categorization (My vs. Shared) for admins.

## Consequences
- **Secure tenant isolation**: Zero leakage of active/pending workspaces to other non-admin tenants.
- **Improved visibility**: Clear differentiation between owned and shared workspaces for administrators.
- **Runtime diagnostic transparency**: Instant correlation of frontend client with backend server version via the footer and System Info modal.
