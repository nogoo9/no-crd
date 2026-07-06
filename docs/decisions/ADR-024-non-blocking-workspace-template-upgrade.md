# ADR-024: Non-blocking Workspace Template Upgrade

## Status
Accepted

## Date
2026-07-06

## Context
Upgrading workspace templates in Kubernetes was previously restricted by synchronous execution limits. Spawning a new pod, mounting volumes, pulling images, and verifying readiness can take anywhere from several seconds to minutes. This frequently exceeds standard HTTP request and Model Context Protocol (MCP) tool invocation timeouts (typically 30 seconds).

Furthermore, we must address three key architectural challenges:
1.  **ReadWriteOnce (RWO) PVC Constraints**: A PersistentVolumeClaim with `ReadWriteOnce` access mode cannot be mounted by multiple pods concurrently. Doing a side-by-side upgrade (spawn new, wait for ready, delete old) would deadlock on volume locks because the new pod cannot start until the old pod releases the volume.
2.  **Traffic Transition Routing**: We must keep terminal WebSocket connections alive on the old pod until it is deleted, but immediately route new incoming client requests to the new pod the instant it becomes ready.
3.  **Self-Healing/Orphan Cleanup**: If the gateway restarts or the network fails during a transition, we must avoid leaving duplicate or orphaned pods in the cluster.

## Decision
Implement a non-blocking, background-driven template upgrade sequence with dynamic routing and dynamic reconciliation cleanup.

### 1. Non-blocking Tool Execution
- The `upgrade_workspace` and `upgrade_all_workspaces` MCP tools initiate the upgrade asynchronously in a background Promise.
- The tools return immediately with a status of `"upgrading"` and the newly generated tracking `podName`.

### 2. DNS-1123 Compliant Unique Naming
- Upgraded pods are spawned under a unique name by appending a random suffix (e.g., `-up-abcde`).
- The name is sliced dynamically to stay strictly under the 63-character limit enforced by Kubernetes.

### 3. RWO PVC Detection and Upgrade Fallback
- Check the old pod's volume specifications for PersistentVolumeClaims.
- **PVC present**: Fall back to a recreate-style upgrade (immediately delete the old pod to release volume locks, then spawn the new pod in the background).
- **No PVC present**: Run a zero-downtime side-by-side upgrade (spawn the new pod first, wait for readiness in the background, and delete the old pod once the new one is ready).

### 4. Dynamic Active Pod Routing
- Update the HTTP proxy (`proxyPreHandler`) and WebSocket proxy (`handleUpgradeRequest`) to query all pods matching a workspace ID.
- Sort the matching pods by creation timestamp descending (newest first).
- Route traffic to the first running/ready pod (having a phase of `Running` and a valid `podIP`), defaulting to the newest pod if none are ready.

### 5. Dynamic Check and List Reconciliation
- Group listed pods by workspace ID.
- If the newest pod is ready, trigger background deletion of any older duplicate pods.
- If the newest pod is still transitioning (and not timed out), override the workspace status in the list to `"Upgrading"`.
- If the newest pod has been pending/failing for over 10 minutes (600s):
  1.  Extract the failure details from container statuses (e.g. `ImagePullBackOff`).
  2.  Annotate the original pod with the error (`nogoo9/last-upgrade-error`).
  3.  Clean up and delete the failed new pod.

### 6. Eager Startup Reconciliation
- Add a cluster-wide reconciliation scan (`reconcileUpgradingWorkspaces`) that runs eagerly during the HTTP/MCP server startup to sweep and resolve any orphaned/duplicate upgrade pods left behind by previous gateway restarts.

## Alternatives Considered

### 1. Increase Request Timeouts
- **Rejected**: Increasing tool timeouts blocks caller threads, violates MCP quick response specifications, and yields a poor client user experience.

### 2. Mandatory Recreate-Style Upgrades for All Workspaces
- **Rejected**: Zero-downtime side-by-side upgrades provide a significantly better user experience for sandbox/stateless workspaces (which do not require persistent volumes).

## Consequences
- Workspace template upgrades are completely non-blocking and timeout-safe.
- Zero-downtime transitions are preserved where volume locks permit.
- Upgrade failures are self-healing, automatically cleaning up failed new pods and annotating the original pod with descriptive logs.
- Gateway crashes during upgrade transitions are reconciled automatically upon server boot.
