# Kubernetes RBAC Permissions Mapping
*(Updated for v0.2.0)*

This page documents the mapping between the Model Context Protocol (MCP) tools exposed by `@nogoo9/no-crd` and the corresponding Kubernetes RBAC permissions they require.

The server dynamically checks these permissions at startup (unless disabled via `DISABLE_PERMISSION_CHECKS=true`) and only enables tools for which the active service account has sufficient RBAC access.

<!-- PERMISSIONS_TABLE_START -->

### Resource: `configmaps`

| Required Verb | Associated MCP Tools | Description / Purpose |
|---|---|---|
| `create` | `create_template` | Save a new pod template definition as a ConfigMap. |
| `delete` | `delete_template` | Delete a stored pod template ConfigMap. |
| `get` | `create_pod_from_template`, `get_template` | Read template pod specifications stored in ConfigMaps. |
| `list` | `list_templates` | Find ConfigMaps registered as reusable pod templates. |
| `update` | `update_template` | Modify metadata, annotations, or specifications of an existing template. |

### Resource: `namespaces`

| Required Verb | Associated MCP Tools | Description / Purpose |
|---|---|---|
| `list` | `list_namespaces` | Discover namespaces in the cluster (only required in cluster access mode). |

### Resource: `pods`

| Required Verb | Associated MCP Tools | Description / Purpose |
|---|---|---|
| `create` | `create_pod`, `create_pod_from_template`, `spawn_workspace` | Provision and deploy new pods or workspace sandboxes. |
| `delete` | `delete_pod`, `stop_workspace` | Terminate and clean up pods or workspace sandboxes. |
| `get` | `get_pod`, `get_workspace` | Retrieve detailed JSON spec for a specific pod. |
| `list` | `list_pods`, `list_workspaces` | Retrieve lists of pods or agent workspace pods. |
| `patch` | `patch_pod` | Strategic merge patch labels, annotations, or resource requests/limits. |

### Resource: `pods/log`

| Required Verb | Associated MCP Tools | Description / Purpose |
|---|---|---|
| `get` | `get_pod_logs` | Retrieve standard output/error logs from pod containers. |


<!-- PERMISSIONS_TABLE_END -->

## RBAC YAML Examples

Here are the complete Kubernetes manifests required to run the MCP server in either **Cluster Mode** (cluster-wide access) or **Namespaced Mode** (single namespace access).

### 1. Cluster Mode RBAC
Use this configuration when the MCP server needs to orchestrate workspaces and retrieve templates across multiple namespaces. 

#### ClusterRole Configuration (`mcp-cluster-role.yaml`)
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nogoo-mcp-cluster-role
rules:
  # Pod orchestration & workspace management
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch", "create", "delete", "patch", "update"]
  # Pod log streams
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  # Namespace auto-discovery
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]
  # ConfigMap-based pod templates
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
  # IAM-role service account provisioning
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
```

#### ServiceAccount & Binding
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nogoo-mcp-sa
  namespace: nogoo9
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: nogoo-mcp-cluster-binding
subjects:
  - kind: ServiceAccount
    name: nogoo-mcp-sa
    namespace: nogoo9
roleRef:
  kind: ClusterRole
  name: nogoo-mcp-cluster-role
  apiGroup: rbac.authorization.k8s.io
```

---

### 2. Namespaced Mode RBAC
Use this configuration if the MCP server's operations are locked down to a single target namespace. The server will restrict pod lifecycle, templates, and permissions queries strictly to that namespace, and namespace listing operations (`list_namespaces`) will be bypassed.

#### Role Configuration (`mcp-namespaced-role.yaml`)
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: nogoo-mcp-namespaced-role
  namespace: nogoo9
rules:
  # Pod orchestration & workspace management
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch", "create", "delete", "patch", "update"]
  # Pod log streams
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  # ConfigMap-based pod templates
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
  # IAM-role service account provisioning
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
```

#### ServiceAccount & Binding
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nogoo-mcp-sa
  namespace: nogoo9
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: nogoo-mcp-namespaced-binding
  namespace: nogoo9
subjects:
  - kind: ServiceAccount
    name: nogoo-mcp-sa
    namespace: nogoo9
roleRef:
  kind: Role
  name: nogoo-mcp-namespaced-role
  apiGroup: rbac.authorization.k8s.io
```

