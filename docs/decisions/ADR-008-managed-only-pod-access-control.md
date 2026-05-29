# ADR-008: Managed-Only Pod Access Control

## Status
Accepted

## Date
2026-05-29

## Context
The MCP server exposes Kubernetes pod management tools (`list_pods`, `get_pod`, `delete_pod`, `patch_pod`, `get_pod_logs`) that operate on **all pods** in a namespace. This creates two security and usability concerns:

1. **Unintended access**: Users can see, modify, and delete pods they did not create — including infrastructure pods (databases, ingress controllers, observability agents) that are critical to the cluster. A single misguided `delete_pod` call could take down shared infrastructure.

2. **Noisy listings**: `list_pods` returns every pod in the namespace, making it hard for users (and agents) to find their own workspaces among dozens of system pods.

The existing auth-based filtering (`nogoo9/user-sub` label) only scopes to the logged-in user's pods when `AUTH_ENABLED=true`, but it does not distinguish between pods managed by the MCP spawner and pods that happen to exist in the same namespace.

### Requirements
- By default, MCP tools should only operate on pods that were created/managed by the MCP server itself.
- The filter must be **absolute** — not even admin users should bypass it when enabled. This prevents accidental infrastructure damage.
- Operators who need full namespace visibility can opt out by setting `MANAGED_ONLY=false`.
- `list_pods` should report how many unmanaged pods exist (count only, no details) for operational awareness.
- `create_pod` must auto-apply the managed-by label so new pods are immediately visible.

## Decision
Introduce a `MANAGED_ONLY` configuration parameter (default: `true`) that gates all pod tools behind a `nogoo9/managed-by` label filter.

### Filtering behavior

| `MANAGED_ONLY` | User role | Pods visible |
|---|---|---|
| `true` | Any (including admin) | Only pods with `nogoo9/managed-by=nogoo9-spawner` |
| `false` | Admin | All pods in namespace |
| `false` | Non-admin (auth on) | Own pods only (`nogoo9/user-sub` filter) |
| `false` | Any (auth off) | All pods in namespace |

### Tool-level changes

- **`list_pods`**: Appends `nogoo9/managed-by=nogoo9-spawner` to the label selector. Returns `unmanagedCount` in structured output (total pods minus managed pods).
- **`get_pod`, `delete_pod`, `patch_pod`, `get_pod_logs`**: After fetching the pod, verify it carries the managed-by label. Deny access with "Pod not found or access denied" if missing.
- **`create_pod`**: Auto-applies `nogoo9/managed-by=nogoo9-spawner` to labels. This ensures pods created via MCP tools are always visible under managed-only mode.
- **Spawner tools** (`spawn_workspace`, `stop_workspace`, `list_workspaces`, `get_workspace`): Already filter by `nogoo9/type=workspace` and apply `nogoo9/managed-by`. No changes needed.

### UI impact
A new `get_capabilities` tool exposes `{ enabledTools, managedOnly, authEnabled, isAdmin }` to the embedded dashboard. The UI disables buttons for tools that are not in `enabledTools` (e.g., hides Delete button if `delete_pod` is not permitted by RBAC).

## Alternatives Considered

### Admin Bypass When Managed-Only Is Enabled
- **Pros**: Admins can debug any pod via the MCP dashboard.
- **Cons**: Defeats the purpose of the safety net. An admin accidentally deleting a database pod via the MCP UI would be catastrophic. Admins who need full access should use `kubectl` directly.
- **Rejected**: The managed-only gate is a safety mechanism, not a permissions mechanism. It should be absolute.

### Namespace Isolation Instead of Label Filtering
- **Pros**: Kubernetes-native approach; pods in separate namespaces can't interfere.
- **Cons**: Many deployments share a namespace (e.g., `default` or a team namespace). Requiring a dedicated namespace is an infrastructure burden.
- **Rejected**: Label-based filtering is more flexible and works within existing namespace layouts.

### Deny Create for Unmanaged Pods
- **Pros**: Prevents any pod without the managed-by label from being created.
- **Cons**: Overly restrictive — the MCP `create_pod` tool is a general-purpose pod creation tool. Silently labeling is friendlier than rejecting.
- **Rejected**: Auto-labeling achieves the same effect without breaking the `create_pod` API contract.

## Consequences
- **Safer defaults**: Out of the box, MCP tools cannot damage infrastructure pods.
- **Operational awareness**: `unmanagedCount` in `list_pods` tells operators there are other pods in the namespace without exposing details.
- **No breaking change**: Existing spawner workflows already apply the managed-by label. Only raw `create_pod` gains the auto-label behavior.
- **Opt-out path**: Operators who need full visibility set `MANAGED_ONLY=false` and accept the risk.
- **UI adapts**: The dashboard hides or disables actions that the server won't allow, preventing confusing error states.
