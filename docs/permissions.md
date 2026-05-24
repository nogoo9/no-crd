# Kubernetes RBAC Permissions Mapping

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
| `get` | `get_pod` | Retrieve detailed JSON spec for a specific pod. |
| `list` | `list_pods`, `list_workspaces` | Retrieve lists of pods or agent workspace pods. |
| `patch` | `patch_pod` | Strategic merge patch labels, annotations, or resource requests/limits. |

### Resource: `pods/log`

| Required Verb | Associated MCP Tools | Description / Purpose |
|---|---|---|
| `get` | `get_pod_logs` | Retrieve standard output/error logs from pod containers. |


<!-- PERMISSIONS_TABLE_END -->
