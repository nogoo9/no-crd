# ADR-015: Workspace View Consolidation, Safe Template Upgrades, and STDIO Auth Bypass

## Status
Accepted

## Date
2026-06-08

## Context
As the `@nogoo9/no-crd` project matured, several development and operational gaps emerged:
1. **UX Redundancy**: The frontend UI maintained a separate "Pods" list and "Workspaces" card deck. Because every workspace map 1-to-1 to a pod, this created visual duplication and confusing navigation hierarchy.
2. **Template Evolution**: When template images or environment defaults changed, there was no safe mechanism to upgrade existing, running workspaces to use the latest template definition.
3. **Data Loss Risks during Upgrades**: Deleting a pod to update its spec could result in the loss of PersistentVolumeClaim (PVC) attachments and custom environment variables configured during the initial spawn.
4. **Kubernetes Locking Conflicts**: Spawning the upgraded pod before the old one is completely removed causes PVC multi-attach locks and naming collisions.
5. **Local Development and STDIO Auth Barriers**: When `AUTH_ENABLED` is active in the environment, local developers trying to connect via STDIO transports (such as the MCP Inspector or Claude Desktop) faced authorization barriers because STDIO has no protocol-level HTTP headers to forward JWT payloads.
6. **Cross-Origin Discovery (CORS)**: MCP clients querying the protected resource metadata endpoint from a different origin (like the MCP Inspector UI running on port 6274) encountered CORS blockages on `/.well-known/oauth-protected-resource` when the server is routed with a base path prefix.

## Decision
1. **Consolidated UI & Tooling**:
   - Removed the separate Pods table from the UI.
   - Merged logs streaming, pod events retrieval, and upgrade triggers directly inside the Workspace card view.
   - Registered a new `get_workspace_events` MCP tool to pull pod lifecycle events into the UI.
2. **Template Versioning and Detection**:
   - Introduced a `nogoo9/template-version` annotation (defaulting to `"1.0.0"` if unspecified) on pod templates and spawned workspace pods.
   - Modified `list_workspaces` and `get_workspace` tools to compare a pod's current version against the registry's latest template version (`current !== latest`).
   - Outdated workspaces are returned with `isOutdated: true` and warning badges in the UI.
3. **Safe Workspace Upgrade Flow (`upgrade_workspace` & `upgrade_all_workspaces`)**:
   - **PVC Preservation**: Resolved and preserved the exact volume mounts and PersistentVolumeClaims associated with the workspace pod.
   - **Environment Variable Merging**: Preserved all custom environment variables supplied during spawn, while appending any new template-level defaults.
   - **Safe Pod Lifecycle Handling**: Initiated pod deletion and polled `readNamespacedPod` until it threw a `404 Not Found` before spawning the new pod. This guarantees volume attachments are unlocked.
   - **Failure Handling**: If recreating fails, the workspace transitions to `Failed` status and displays the error log.
4. **Automatic STDIO Transport Auth Bypass**:
   - Configured `config.auth.enabled` to return `false` dynamically if `TRANSPORT` is `"stdio"`. This allows local developer tools (like the MCP Inspector) to run commands natively without authentication payloads, while preserving security since STDIO is strictly isolated to the host process.
5. **Root-Level OAuth Metadata & CORS Resolution**:
   - Intercepted requests to `/.well-known/oauth-protected-resource` and its subpaths (like `/mcp`) globally in the `onRequest` Fastify hook.
   - Resolved correct resource parameters, set `Access-Control-Allow-Origin: *`, and returned the JSON metadata directly to avoid prefix routing or 404 CORS failures.

## Alternatives Considered

### Direct Re-creation without Pod Deletion Awaiting
* **Why rejected**: Kubernetes handles PV/PVC mounts via nodes. If a new pod is created with the same PVC before the old pod's termination lifecycle is completely finalized, Kubernetes throws a `Multi-Attach error for volume` and blocks the new pod indefinitely.

### Global JWT Auth Disabling for Dev Command
* **Why rejected**: Developers need to run and test Keycloak token authorization in the local `k3d` cluster (with `AUTH_ENABLED=true`). Disabling it globally would mask authentication bugs. Restricting the bypass specifically to `TRANSPORT: stdio` isolates the bypass to secure local processes.

## Consequences
* **Improved UX**: The frontend interface is cleaner, presenting all workspace lifecycle info (logs, events, updates) in one unified place.
* **Safe Upgrades**: Outdated templates can be upgraded in one click with zero loss of user data (PVC files) or customized environments.
* **Frictionless Integration**: The MCP server works seamlessly with the standard MCP Inspector and Claude Desktop locally, while retaining robust JWT token checks in staging/production deployments.
