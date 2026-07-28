# Zero-CRD Pod Lifecycle & Recreate Upgrade State Machine

This article documents how `nogoo9` manages pod creation, container overrides, storage binding, annotation processing, shutdown hooks, and recreate-style zero-downtime workspace upgrades without requiring Kubernetes CRDs.

---

## 🔁 Workspace Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Template / Inline Definition
    Idle --> Spawning: spawn_workspace()
    Spawning --> InitContainer: Inject Sync Init Container
    InitContainer --> Running: Main Container Starts
    Running --> Executing: run_agent_in_workspace() / Proxy Traffic
    Executing --> Running: Request Completed
    Running --> PreStopSync: stop_workspace() / Termination
    PreStopSync --> Terminated: Sync Logs to S3 / PVC Unmount
    Terminated --> [*]

    state UpgradeProcess {
        Running --> UpgradeTriggered: upgrade_workspace() / upgrade_all_workspaces()
        UpgradeTriggered --> CheckPVC: Check Storage Type
        CheckPVC --> NormalUpgrade: Shared PVC (ReadWriteMany / Ephemeral)
        CheckPVC --> RecreateFallback: RWO PVC (ReadWriteOnce)
        RecreateFallback --> DeleteOldPod: Delete Old Pod & Release Storage Lock
        DeleteOldPod --> SpawnNewPod: Create Upgraded Pod Version
        NormalUpgrade --> SpawnNewPod: Parallel Upgraded Pod Creation
    }
```

---

## 🛠️ Pod Spec & Annotation Expansion

When `spawn_workspace` is invoked, `nogoo9` constructs a standard Kubernetes `Pod` object via [`src/k8s/spawner.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/k8s/spawner.ts) and [`src/k8s/annotations.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/k8s/annotations.ts):

1. **Labels & Identity**:
   - `nogoo9/type`: `workspace`
   - `nogoo9/workspace-id`: `<workspaceId>`
   - `nogoo9/user-sub`: `<ownerSubjectId>`
   - `nogoo9/template-version`: `<version>`

2. **Annotation Expansion Helpers**:
   - `validateRequiredContext`: Ensures required runtime context keys are provided.
   - `injectInitContainer`: Pre-populates files/scripts from S3 or ConfigMaps into workspace volumes before container startup.
   - `injectPreStopHook`: Attaches lifecycle preStop termination hooks to execute log/state synchronization scripts before pod deletion.

---

## 🚀 Recreate-Style Workspace Upgrades

Workspace upgrades support both 1-by-1 user upgrades and bulk admin upgrades (`upgrade_all_workspaces`):

1. **Owner Preservation**: The original `nogoo9/user-sub` label is strictly preserved across template version upgrades.
2. **RWO PVC Storage Safety**: For pods with ReadWriteOnce (RWO) persistent volume claims, `nogoo9` safely deletes the old pod first to release volume locks before spawning the upgraded pod instance.
3. **Event Streaming**: Upgrade progress is broadcast live via `get_workspace_events`.
