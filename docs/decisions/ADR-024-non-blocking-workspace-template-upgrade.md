# ADR-024: Non-blocking Workspace Template Upgrade & Multi-User Authorization

## Status
Accepted

## Date
2026-07-06 (Updated 2026-07-28)

## Context
Upgrading workspace templates in Kubernetes was previously restricted by synchronous execution limits. Spawning a new pod, mounting volumes, pulling images, and verifying readiness can take anywhere from several seconds to minutes. This frequently exceeds standard HTTP request and Model Context Protocol (MCP) tool invocation timeouts (typically 30 seconds).

Furthermore, in multi-tenant environments with OIDC authentication and RBAC permissions enabled, upgrading workspaces introduces critical authorization, state preservation, and execution challenges:
1. **ReadWriteOnce (RWO) PVC Constraints**: A PersistentVolumeClaim with `ReadWriteOnce` access mode cannot be mounted by multiple pods concurrently. Doing a side-by-side upgrade (spawn new, wait for ready, delete old) would deadlock on volume locks because the new pod cannot start until the old pod releases the volume.
2. **Traffic Transition Routing**: Terminal WebSocket connections must remain connected to the old pod until it is deleted, but new incoming HTTP requests must immediately route to the new pod once ready.
3. **Self-Healing/Orphan Cleanup**: If the gateway restarts or the network fails during a transition, duplicate or orphaned pods must not linger in the cluster.
4. **Access Control & RBAC Boundaries**:
   - `upgrade_all_workspaces` touches all outdated workspaces cluster-wide across multiple users. Allowing arbitrary users to run bulk upgrades would allow low-privileged accounts to mutate other users' pods.
   - `upgrade_workspace` must enforce user isolation: normal users can only upgrade their own workspaces 1-by-1, while only administrators can upgrade workspaces owned by other users.
5. **Owner Identity & URL Stability**: When an administrator upgrades another user's workspace (or when `upgrade_all_workspaces` is executed by an admin), the newly spawned pod must retain the **original owner's sub/identity** (`nogoo9/user-sub`) and routing URLs (`workspace-path`, `preview-path`, `workspace-port`). It must NOT mutate ownership to the administrator's identity.

## Decision
Implement a non-blocking, background-driven template upgrade sequence with dynamic routing, automatic PVC fallback, strict RBAC authorization, owner identity preservation, and AsyncLocalStorage context propagation.

### 1. Non-blocking Tool Execution
- The `upgrade_workspace` and `upgrade_all_workspaces` MCP tools initiate the upgrade asynchronously in a background Promise.
- The tools return immediately with a status of `"upgrading"` and the newly generated tracking `podName`.

### 2. DNS-1123 Compliant Unique Naming
- Upgraded pods are spawned under a unique name by appending a random suffix (e.g., `-up-abcde`).
- Pod name prefix preserves the original owner's sub (`ws-{oldPodOwner}-{wsId}-up-XXXXX`).
- The name is sliced dynamically to stay strictly under the 63-character limit enforced by Kubernetes.

### 3. Access Control & Authorization Scoping
- **`upgrade_all_workspaces`**: Strictly restricted to administrators (`capabilities.isAdmin` / `authCtx.isAdmin`). Rejects non-admin invocations with `Forbidden: Only admin users can upgrade all workspaces`.
- **`upgrade_workspace`**: Normal users can only upgrade their own workspaces (`nogoo9/user-sub` label match). Non-admin cross-user upgrades are rejected with `Access Denied`.
- **UI Header Action Button**: The "Upgrade All Outdated" button in the React UI header is conditionally rendered only for administrator accounts (`capabilities.isAdmin && workspaces.some(...)`).

### 4. Owner Identity & Routing Preservation
- During single or bulk workspace upgrades, `upgradeWorkspaceInner` extracts the existing workspace owner identity (`oldPodOwner`) from `oldPod.metadata.labels['nogoo9/user-sub']` or annotations.
- Newly spawned pods inherit `oldPodOwner` for labels (`nogoo9/user-sub`), annotations, template variable interpolation (`${{user}}`), and pod naming.
- Workspace routing properties (`workspacePath`, `previewPath`, `workspacePort`, `workspaceName`) are preserved across the upgrade transition.

### 5. AsyncLocalStorage Context Propagation
- Wrap MCP transport execution (`transport.handleRequest`) with `requestContextStore.run({ jwtPayload: (request as any).jwtPayload }, ...)` in the Fastify MCP route handler (`/mcp`).
- Ensures caller identity (`jwtPayload`) and administrative roles (`isAdmin`) remain accessible to tool handlers across asynchronous execution boundaries.

### 6. RWO PVC Detection and Upgrade Fallback
- Check the old pod's volume specifications for PersistentVolumeClaims.
- **PVC present**: Fall back to a recreate-style upgrade (immediately delete the old pod to release volume locks, then spawn the new pod in the background).
- **No PVC present**: Run a zero-downtime side-by-side upgrade (spawn the new pod first with `-up-XXXXX` suffix, wait for readiness in the background, and delete the old pod once the new one is ready).

### 7. Dynamic Active Pod Routing
- Update the HTTP proxy (`proxyPreHandler`) and WebSocket proxy (`handleUpgradeRequest`) to query all pods matching a workspace ID.
- Sort matching pods by creation timestamp descending (newest first).
- Route traffic to the first running/ready pod (having a phase of `Running` and a valid `podIP`), defaulting to the newest pod if none are ready.

### 8. Dynamic Check and List Reconciliation
- Group listed pods by workspace ID.
- If the newest pod is ready, trigger background deletion of any older duplicate pods.
- If the newest pod is still transitioning (and not timed out), override the workspace status in the list to `"Upgrading"`.
- If the newest pod has been pending/failing for over 10 minutes (600s):
  1. Extract failure details from container statuses (e.g. `ImagePullBackOff`).
  2. Annotate the original pod with the error (`nogoo9/last-upgrade-error`).
  3. Clean up and delete the failed new pod.

### 9. Eager Startup Reconciliation
- Run a cluster-wide reconciliation scan (`reconcileUpgradingWorkspaces`) eagerly during HTTP/MCP server startup to sweep and resolve any orphaned/duplicate upgrade pods left behind by previous gateway restarts.

## Alternatives Considered

### 1. Increase Request Timeouts
- **Rejected**: Increasing tool timeouts blocks caller threads, violates MCP quick response specifications, and yields a poor client user experience.

### 2. Mandatory Recreate-Style Upgrades for All Workspaces
- **Rejected**: Zero-downtime side-by-side upgrades provide a significantly better user experience for sandbox/stateless workspaces (which do not require persistent volumes).

### 3. Reassign Upgraded Pod Ownership to Calling Admin
- **Rejected**: Mutating workspace ownership to an admin user during maintenance upgrades breaks resource isolation, tenant visibility, and user workspace ownership.

## Consequences
- Workspace template upgrades are completely non-blocking, timeout-safe, and RBAC-enforced.
- Only administrators can perform bulk upgrades or cross-user upgrades.
- Original workspace ownership (`nogoo9/user-sub`) and routing URLs (`workspacePath`/`previewPath`) are preserved across all upgrades.
- Zero-downtime transitions are preserved where volume locks permit, with automatic fallback for RWO PVC volumes.
- Gateway crashes during upgrade transitions are reconciled automatically upon server boot.
- The multi-user E2E upgrade script (`scripts/test-e2e-upgrade.ts`) validates all aspects of the non-blocking upgrade lifecycle, access controls, PVC fallback, and state preservation.
