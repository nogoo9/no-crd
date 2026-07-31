# ADR-026: Non-Admin Workspace Concurrency Limits

## Status
Accepted

## Date
2026-07-31

## Context
In a multi-tenant agent orchestration environment, users or automated AI clients dynamically spawn ephemeral pod workspaces on demand. Without concurrency caps, a single non-admin user or runaway automated workflow could launch an arbitrary number of workspace pods, consuming excessive Kubernetes cluster CPU, memory, and IP allocation.

## Decision
1. **Configurable User Workspace Quota**:
   - Introduced `maxWorkspacesPerUser` in `authSchema` (`MAX_WORKSPACES_PER_USER` environment variable, CLI flag `--max-workspaces-per-user`). Defaults to `0` (unlimited).
2. **Quota Enforcement in Spawner**:
   - During `spawn_workspace`, if `MAX_WORKSPACES_PER_USER > 0` and the caller is not an administrator, active non-terminal pods (`Pending`, `Running`, `Upgrading`, `Terminating`) belonging to the caller are counted.
   - If the caller's unique workspace count meets or exceeds `MAX_WORKSPACES_PER_USER`, the spawner rejects the request with a `403 Forbidden` error.
3. **Scope Alignment**:
   - Workspace counts align with `k8s.mode`: per-namespace in `namespaced` mode, and across accessible namespaces in `cluster` mode.
4. **Administrator Quota Bypass**:
   - Administrators (identified via admin roles, admin scopes, or `AUTH_ADMIN_USERS`) bypass non-admin workspace quotas to ensure operational emergency access.

## Alternatives Considered

### 1. Kubernetes Native ResourceQuotas
- **Pros**: Handled directly by the Kubernetes API server.
- **Cons**: Requires creating Kubernetes `ResourceQuota` resources per namespace and does not operate natively on custom per-user subject (`nogoo9/user-sub`) labels.
- **Rejected**: Conflicts with our zero-CRD and zero-cluster-operator architecture.

### 2. Counting Only 'Running' Pods
- **Pros**: Simpler status check.
- **Cons**: Users could bypass quotas by rapidly spawning multiple pods before the initial pod transitions from `Pending` to `Running`.
- **Rejected**: Counting all non-terminal phases (`Pending`, `Running`, `Upgrading`, `Terminating`) prevents quota evasion.

## Consequences
- **Prevent Cluster Overload**: Prevents individual non-admin users from exhausting cluster compute resources.
- **Backward Compatibility**: Default `MAX_WORKSPACES_PER_USER=0` maintains backward compatibility for existing unconstrained environments.
