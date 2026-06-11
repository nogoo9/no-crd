# ADR-020: Fine-Grained Role Permissions, Template Creator Tracking, and Workspace API Visibility

## Status
Proposed

## Date
2026-06-11

## Context
As the `@nogoo9/no-crd` platform moves towards multi-tenant hardening, we need to address specific authorization and privacy boundaries:

1. **Admin Access Boundaries**:
   - Administrators (role: `admin`) require full operational view and control over the cluster (listing/getting pods, workspaces, events, logs, templates; stopping and starting workspaces; creating and editing templates).
   - However, for user privacy and separation of concerns, administrators must **not** be able to proxy traffic into a running workspace application or its general APIs (via the `/route/:workspaceId/*` proxy), **except** for endpoints explicitly designated for administrative check.

2. **Reader Promotion**:
   - Standard Readers (role: `viewer`) currently cannot perform any write operations. To support self-service sandboxing, Readers should be allowed to **start (spawn) and stop (terminate) their own workspaces**, but they must remain blocked from creating, editing, or deleting templates.

3. **Writer Template Ownership**:
   - Writers (role: `user`) can start and terminate their own workspaces, and create templates.
   - However, to prevent writers from conflicting with or deleting each other's templates, templates must track ownership. A writer should only be allowed to update or delete templates **created by them**.

4. **Local Template Immutability**:
   - Pod templates loaded from the local filesystem directory (`TEMPLATES_DIR`) must be read-only and immutable. No role should be allowed to delete or overwrite them.

5. **Proxy API Visibility Controls**:
   - Workspace applications often expose custom helper APIs. To support fine-grained route security controls dynamically, we delegate path-level proxy access controls to annotations, as detailed in [ADR-021](./ADR-021-workspace-api-annotations-and-visibility-controls.md).

## Decision

1. **Permissions Action Taxonomy Expansion**:
   Refactor the permission validation engine (`verifyAccessOrThrow` in `src/k8s/auth.ts`) to use a more granular set of actions:
   - `read`: Standard monitoring/list operations.
   - `workspace:write`: Provisioning (spawning), terminating (stopping), and patching/upgrading workspaces/pods.
   - `template:create`: Creating new templates.
   - `template:write`: Updating or deleting templates.
   - `admin`: Administrative overrides and workspace creation on behalf of other users.

   The role mapping will evaluate as:
   - **Reader (`viewer`)**: Permitted for `read` and `workspace:write`. Can start/stop/upgrade workspaces they own.
   - **Writer (`user`)**: Permitted for `read`, `workspace:write` (own workspaces only), `template:create`, and `template:write` (own templates only).
   - **Admin (`admin`)**: Permitted for all actions.

### Granular Roles Matrix

| MCP Tool / API Route | Action Type | Reader (`viewer`) | Writer (`user`) | Admin (`admin`) | Owner Isolation Rules |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `list_namespaces` | Read | **Allowed** | **Allowed** | **Allowed** | Bypassed (global cluster state). |
| `list_registry_images` | Read | **Allowed** | **Allowed** | **Allowed** | Bypassed (global registry state). |
| `list_templates` | Read | **Allowed** | **Allowed** | **Allowed** | Bypassed (global templates list). |
| `get_template` | Read | **Allowed** | **Allowed** | **Allowed** | Bypassed (global templates spec). |
| `list_pods` / `list_workspaces` | Read | **Isolated** | **Isolated** | **Allowed** | Non-admins see own sandboxes; admin sees all. |
| `get_pod` / `get_workspace` | Read | **Isolated** | **Isolated** | **Allowed** | Non-admins get own; admin gets any. |
| `get_pod_logs` / `get_workspace_events` | Read | **Isolated** | **Isolated** | **Allowed** | Non-admins get own; admin gets any. |
| `create_pod` / `spawn_workspace` | workspace:write | **Isolated** | **Isolated** | **Allowed** | **Readers & Writers** can spawn own; **Admins** can spawn for any `userSub`. |
| `delete_pod` / `stop_workspace` | workspace:write | **Isolated** | **Isolated** | **Allowed** | **Readers & Writers** can stop own; **Admins** can stop any. |
| `create_template` | template:create | Blocked | **Allowed** | **Allowed** | **Writers** can create templates (stamps `nogoo9/user-sub`). |
| `update_template` / `delete_template` | template:write | Blocked | **Isolated** | **Allowed** | **Writers** can only edit/delete templates matching their `user-sub`. **Admins** bypass. |
| `/permissions` | Read | **Allowed** | **Allowed** | **Allowed** | Diagnostics verification. |
| `/route/:id/*` (Proxy - main UI) | Read/Write | **Isolated** | **Isolated** | Blocked | **Admins blocked** from accessing workspace UI. |

---

2. **Scope Constraints**:
   - Scopes enforce client-app capabilities. Standard workspace mutation operations (`workspace:write`) require the OIDC token to contain the `"nogoo9:write"` scope.
   - Standard read/view operations require `"nogoo9:read"`.
   - Admin operations require `"nogoo9:admin"`.
   - **Scope Hierarchy**: `"nogoo9:admin"` implies `"nogoo9:write"` and `"nogoo9:read"`. `"nogoo9:write"` implies `"nogoo9:read"`.
   - **Scope Bypass**: If the token completely lacks a scope claim, scope validation is bypassed (delegating to roles check).

### Granular Scopes Matrix

| Requested Action | Required Scope | Satisfied By |
| :--- | :--- | :--- |
| `read` | `"nogoo9:read"` | `"nogoo9:read"`, `"nogoo9:write"`, `"nogoo9:admin"` |
| `workspace:write` | `"nogoo9:write"` | `"nogoo9:write"`, `"nogoo9:admin"` |
| `template:create` | `"nogoo9:write"` | `"nogoo9:write"`, `"nogoo9:admin"` |
| `template:write` | `"nogoo9:write"` | `"nogoo9:write"`, `"nogoo9:admin"` |
| `admin` | `"nogoo9:admin"` | `"nogoo9:admin"` |

---

3. **Combined Access Evaluation (Role + Scope Combinations)**:

The final decision is derived from both the **Scope** (client authorization) and the **Role** (user authorization):

| Token Scope | Token Role | Action Category | Access Decision | Rationale |
| :--- | :--- | :--- | :---: | :--- |
| *Missing* | `["viewer"]` | `workspace:write` | **Allowed (Isolated)** | Scope bypass; role `viewer` has workspace write access (own workspaces only). |
| `"nogoo9:read"` | `["viewer"]` | `workspace:write` | **Blocked** | Token lacks required scope `"nogoo9:write"` for mutation. |
| `"nogoo9:write"` | `["viewer"]` | `workspace:write` | **Allowed (Isolated)** | Scope and role match (allowed for own workspaces). |
| `"nogoo9:write"` | `["viewer"]` | `template:create` | **Blocked** | Role `viewer` is blocked from creating templates. |
| `"nogoo9:write"` | `["user"]` | `template:create` | **Allowed** | Scope matches and role `user` can create templates. |
| `"nogoo9:write"` | `["user"]` | `template:write` | **Allowed (Isolated)** | Owner check: can only edit/delete templates created by them. |
| `"nogoo9:admin"` | `["admin"]` | `workspace:write` | **Allowed (Admin)** | Admin scope and role grant full bypass of ownership checks. |
| `"nogoo9:admin"` | `["user"]` | `admin` | **Blocked** | Role `user` is blocked from admin actions (such as target user workspace spawning). |
| `"nogoo9:write"` | `["admin"]` | `admin` | **Blocked** | Token lacks required `"nogoo9:admin"` scope. |

---

4. **Workspace Proxy Path-level Authorization**:
   To support granular and dynamic route-level visibility controls, we delegate proxy route matching and access verification to annotations as defined in [ADR-021](./ADR-021-workspace-api-annotations-and-visibility-controls.md).

5. **Template Creator Tagging, Visibility, & Local Protection**:
   - Update `create_template` (in `src/mcp/templates.ts`) to stamp the ConfigMap with the creator's subject ID using label/annotation `nogoo9/user-sub`.
   - In `update_template` and `delete_template` tools:
     - Check if the template name corresponds to a local filesystem template. If yes, reject the request with `403 Forbidden` (Local templates are immutable).
     - For ConfigMap templates, verify that the caller is the creator (`userSub === creatorSub`) or has the `admin` role.
   - *Visibility*: Templates created by Writers are globally visible/spawnable by any authenticated user, but only the creator or an Admin can edit or delete them.

6. **UI Capabilities Adaptation**:
   - Enable the "Stop Workspace" and "Upgrade" button in the active workspace list for Admin users on shared/non-owned sandboxes, while keeping the "Open Workspace" link hidden/disabled for non-owned workspaces.
   - Display a Trash icon (Delete Template) on the dashboard template cards only if the template is not local and the active user is either its creator or an Admin.
   - Display the creator's subject (e.g., `Owner: user-123` or `Creator: user-123`) as metadata on the template card.

## Alternatives Considered
- **Strict Role Hierarchies**: Having Admin inherit proxy access. This was rejected because workspace applications can contain highly sensitive user data and credentials, and separating monitoring from direct application access is critical for privacy compliance.
- **Dynamic Kubernetes RBAC Impersonation**: Using dynamic Kubernetes impersonation for token owners. This was rejected because the platform is designed to run *without cluster-wide CRDs* and avoids placing complex cluster-level ServiceAccount credentials on OIDC users.

## Consequences
- **Hardened Security & Privacy**: Admins can operate and monitor the cluster without compromising tenant data.
- **Self-Service Sandboxes**: Readers can start and stop workspaces on their own.
- **Template Multi-Tenancy**: Template naming conflicts and accidental deletions by standard users are resolved.
- **Safe Local Defaults**: Local templates are guaranteed to remain unchanged.
- **Granular API Sharing**: Owners can selectively share APIs with custom user list permissions.
