# MCP Tools Reference

This reference details the Model Context Protocol (MCP) tools exposed by `@nogoo9/no-crd`. AI agents and API clients use these tools to manage pods, templates, isolated agent sandboxes, and query session credentials or permissions.

---

## 🗂️ Table of Contents
1. [Diagnostics & Utility Tools](#diagnostics-utility-tools)
   - [`current_namespace`](#current_namespace)
   - [`check_permissions`](#check_permissions)
2. [Pod Management Tools](#pod-management-tools)
   - [`list_pods`](#list_pods)
   - [`get_pod`](#get_pod)
   - [`create_pod`](#create_pod)
   - [`patch_pod`](#patch_pod)
   - [`delete_pod`](#delete_pod)
   - [`get_pod_logs`](#get_pod_logs)
   - [`list_namespaces`](#list_namespaces)
   - [`list_registry_images`](#list_registry_images)
3. [Pod Template Tools](#pod-template-tools)
   - [`list_templates`](#list_templates)
   - [`get_template`](#get_template)
   - [`create_template`](#create_template)
   - [`update_template`](#update_template)
   - [`delete_template`](#delete_template)
   - [`create_pod_from_template`](#create_pod_from_template)
4. [Agent Workspace (Spawner) Tools](#agent-workspace-spawner-tools)
   - [`list_workspaces`](#list_workspaces)
   - [`spawn_workspace`](#spawn_workspace)
   - [`stop_workspace`](#stop_workspace)

---

## Diagnostics & Utility Tools

### `current_namespace`
Returns the default namespace and scope (mode) currently bound to the MCP server.

* **Inputs:** None
* **Example Call:**
```json
{}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Namespace: default\nMode: cluster"
    }
  ],
  "structuredContent": {
    "namespace": "default",
    "mode": "cluster"
  }
}
```

### `check_permissions`
Interrogates the Kubernetes API using `SelfSubjectAccessReview` to check active RBAC permissions and outputs a report showing which MCP tools are enabled or disabled.

* **Inputs:** None
* **Example Call:**
```json
{}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "--- RBAC PERMISSIONS ---\nRESOURCE\tVERB\tALLOWED\npods\tcreate\t✔ YES\n..."
    }
  ],
  "structuredContent": {
    "mode": "cluster",
    "namespace": "default",
    "enabledTools": ["list_pods", "get_pod", "spawn_workspace"],
    "disabledTools": ["list_namespaces"],
    "permissions": {
      "pods": { "create": true, "list": true, "delete": true },
      "namespaces": { "list": false }
    }
  }
}
```

---

## Pod Management Tools

### `list_pods`
Lists pods matching optional selectors.

* **Inputs:**
  * `namespace` (optional string): Target namespace.
  * `labelSelector` (optional string): Comma-separated query (e.g. `app=dev,tier=frontend`).
  * `fieldSelector` (optional string): Comma-separated query (e.g. `status.phase=Running`).
  * `limit` (optional number): Maximum results to return.
* **Example Call:**
```json
{
  "namespace": "nogoo9",
  "labelSelector": "nogoo9/type=workspace"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "NAME\tPHASE\tREADY\tRESTARTS\tPOD-IP\tNODE\nws-anonymous-session1\tRunning\t1/1\t0\t10.42.0.45\tk3d-node-0"
    }
  ],
  "structuredContent": {
    "pods": [
      {
        "name": "ws-anonymous-session1",
        "namespace": "nogoo9",
        "phase": "Running",
        "ready": 1,
        "total": 1,
        "restarts": 0,
        "podIP": "10.42.0.45",
        "node": "k3d-node-0",
        "labels": { "nogoo9/type": "workspace" },
        "annotations": {}
      }
    ]
  }
}
```

### `get_pod`
Fetch the complete Kubernetes API JSON payload of a specific pod.

* **Inputs:**
  * `name` (string): Name of the pod.
  * `namespace` (optional string): Target namespace.
* **Example Call:**
```json
{
  "name": "ws-anonymous-session1",
  "namespace": "nogoo9"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{ \"apiVersion\": \"v1\", \"kind\": \"Pod\", ... }"
    }
  ],
  "structuredContent": {
    "pod": {
      "metadata": { "name": "ws-anonymous-session1", "namespace": "nogoo9" },
      "spec": { "containers": [...] },
      "status": { "phase": "Running" }
    }
  }
}
```

### `create_pod`
Create a brand new pod with direct container/volume specifications.

* **Inputs:**
  * `name` (string): Name of the pod.
  * `namespace` (optional string): Target namespace.
  * `containers` (array of Container specs): Core container definitions (image, command, volume mounts).
  * `volumes` (optional array of Volume specs): Backing volume storage definitions.
  * `restartPolicy` (optional string): e.g., `Always`, `OnFailure`, `Never`.
* **Example Call:**
```json
{
  "name": "temp-alpine-worker",
  "namespace": "nogoo9",
  "containers": [
    {
      "name": "worker",
      "image": "alpine:latest",
      "command": ["sleep", "3600"]
    }
  ],
  "restartPolicy": "Never"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Created pod temp-alpine-worker in namespace nogoo9"
    }
  ],
  "structuredContent": {
    "name": "temp-alpine-worker",
    "namespace": "nogoo9"
  }
}
```

### `patch_pod`
Applies a Strategic Merge Patch to modify metadata, labels, annotations, or container limits of a pod.

* **Inputs:**
  * `name` (string): Name of the pod.
  * `namespace` (optional string): Target namespace.
  * `patch` (object): Strategic Merge JSON payload.
* **Example Call:**
```json
{
  "name": "temp-alpine-worker",
  "namespace": "nogoo9",
  "patch": {
    "metadata": {
      "labels": {
        "mcp-patched": "true"
      }
    }
  }
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Patched pod temp-alpine-worker (resourceVersion: 832941)"
    }
  ],
  "structuredContent": {
    "name": "temp-alpine-worker",
    "namespace": "nogoo9",
    "resourceVersion": "832941"
  }
}
```

### `delete_pod`
Terminates a running pod.

* **Inputs:**
  * `name` (string): Name of the pod.
  * `namespace` (optional string): Target namespace.
  * `gracePeriodSeconds` (optional number): Termination wait time (0 for immediate deletion).
* **Example Call:**
```json
{
  "name": "temp-alpine-worker",
  "namespace": "nogoo9",
  "gracePeriodSeconds": 0
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Deleted pod temp-alpine-worker from namespace nogoo9"
    }
  ],
  "structuredContent": {
    "name": "temp-alpine-worker",
    "namespace": "nogoo9"
  }
}
```

### `get_pod_logs`
Retrieve stdout/stderr logs from a specific container.

* **Inputs:**
  * `name` (string): Name of the pod.
  * `namespace` (optional string): Target namespace.
  * `container` (optional string): Container name (required if the pod has multiple containers).
  * `tailLines` (optional number): Retrieve only the last N log lines.
  * `sinceSeconds` (optional number): Logs from the last N seconds.
  * `timestamps` (optional boolean): Include RFC3339 timestamps.
  * `previous` (optional boolean): Retrieve logs of the previous crashed instance.
* **Example Call:**
```json
{
  "name": "ws-anonymous-session1",
  "namespace": "nogoo9",
  "container": "workspace",
  "tailLines": 5
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Starting server...\nListening on port 8080\nDatabase connection active\n"
    }
  ],
  "structuredContent": {
    "logs": "Starting server...\nListening on port 8080\nDatabase connection active\n"
  }
}
```

### `list_namespaces`
Lists namespaces where the active credentials have access to list pods.

* **Inputs:** None
* **Example Call:**
```json
{}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "NAME\ndefault\nogoo9\nkube-system"
    }
  ],
  "structuredContent": {
    "namespaces": ["default", "nogoo9", "kube-system"]
  }
}
```

### `list_registry_images`
Queries the configured local/private registry (`REGISTRY_URL`) for available container images.

* **Inputs:**
  * `repository` (optional string): Prefix filter.
* **Example Call:**
```json
{
  "repository": "nogoo9"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "localhost:5001/nogoo9/mcp-server:latest\nlocalhost:5001/nogoo9/workspace-node:latest"
    }
  ],
  "structuredContent": {
    "images": [
      "localhost:5001/nogoo9/mcp-server:latest",
      "localhost:5001/nogoo9/workspace-node:latest"
    ],
    "registry": "localhost:5001"
  }
}
```

---

## Pod Template Tools

### `list_templates`
Discovers and lists reusable templates registered as Kubernetes ConfigMaps labeled with `nogoo9/pod-template=true`.

* **Inputs:**
  * `namespace` (optional string): Target namespace.
* **Example Call:**
```json
{
  "namespace": "nogoo9"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "dev-node-template\tNode.js 22 sandbox with git integrations\ndev-python-template\tPython 3.11 datascience template"
    }
  ],
  "structuredContent": {
    "templates": [
      {
        "name": "dev-node-template",
        "namespace": "nogoo9",
        "description": "Node.js 22 sandbox with git integrations",
        "tag": "v1.0"
      }
    ]
  }
}
```

### `get_template`
Retrieve raw specification details stored in a template.

* **Inputs:**
  * `name` (string): Template name.
  * `namespace` (optional string): Target namespace.
* **Example Call:**
```json
{
  "name": "dev-node-template",
  "namespace": "nogoo9"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{ \"containers\": [ { \"name\": \"workspace\", ... } ] }"
    }
  ],
  "structuredContent": {
    "name": "dev-node-template",
    "namespace": "nogoo9",
    "description": "Node.js 22 sandbox with git integrations",
    "tag": "v1.0",
    "spec": {
      "containers": [
        {
          "name": "workspace",
          "image": "node:22-alpine",
          "command": ["sleep", "infinity"]
        }
      ]
    }
  }
}
```

### `create_template`
Create a new template stored as a Kubernetes ConfigMap.

* **Inputs:**
  * `name` (string): Template name.
  * `namespace` (optional string): Target namespace.
  * `description` (optional string): Short description.
  * `tag` (optional string): Tag classification.
  * `spec` (PodSpec object): Spec string/JSON definition.
* **Example Call:**
```json
{
  "name": "lightweight-alpine",
  "namespace": "nogoo9",
  "description": "Simple Alpine shell template",
  "tag": "infra",
  "spec": {
    "containers": [
      {
        "name": "main",
        "image": "alpine:latest",
        "command": ["sleep", "infinity"]
      }
    ]
  }
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Created template lightweight-alpine"
    }
  ],
  "structuredContent": {
    "name": "lightweight-alpine",
    "namespace": "nogoo9"
  }
}
```

### `update_template`
Modifies labels, annotations, or the Pod spec of an existing template ConfigMap.

* **Inputs:**
  * `name` (string): Template name.
  * `namespace` (optional string): Target namespace.
  * `description` (optional string): Update description.
  * `tag` (optional string): Update tag.
  * `spec` (optional PodSpec object): Replaces spec if provided.
* **Example Call:**
```json
{
  "name": "lightweight-alpine",
  "namespace": "nogoo9",
  "tag": "v1.1"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Updated template lightweight-alpine"
    }
  ],
  "structuredContent": {
    "name": "lightweight-alpine",
    "namespace": "nogoo9"
  }
}
```

### `delete_template`
Deletes a template ConfigMap.

* **Inputs:**
  * `name` (string): Template name.
  * `namespace` (optional string): Target namespace.
* **Example Call:**
```json
{
  "name": "lightweight-alpine",
  "namespace": "nogoo9"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Deleted template lightweight-alpine"
    }
  ],
  "structuredContent": {
    "name": "lightweight-alpine",
    "namespace": "nogoo9"
  }
}
```

### `create_pod_from_template`
Spawn a regular pod by copying a template ConfigMap and applying overrides.

* **Inputs:**
  * `templateRef` (string): Reference in formats `pod-template://ns/name`, `ns/name`, or `name`.
  * `name` (string): Target pod name.
  * `namespace` (optional string): Target namespace.
  * `containerOverrides` (optional array of container overrides): Override images, environment variables, commands, or resources.
  * `topLevelOverrides` (optional object): Pod-level parameter overrides.
* **Example Call:**
```json
{
  "templateRef": "dev-node-template",
  "name": "my-custom-node-pod",
  "namespace": "nogoo9",
  "containerOverrides": [
    {
      "name": "workspace",
      "env": [
        {
          "name": "PROJECT_PATH",
          "value": "/workspace/custom"
        }
      ]
    }
  ]
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Created pod my-custom-node-pod in namespace nogoo9"
    }
  ],
  "structuredContent": {
    "name": "my-custom-node-pod",
    "namespace": "nogoo9"
  }
}
```

---

## Agent Workspace (Spawner) Tools

### `list_workspaces`
Lists active agent workspace pods (pods matching label `nogoo9/type=workspace`). Supports filtering by active JWT owner if `AUTH_ENABLED=true`.
*(Changed in v0.2.0: Added JWT owner verification/filtering)*

* **Inputs:**
  * `namespace` (optional string): Target namespace.
  * `jwtPayload` (optional object): Payload dictionary to filter workspaces by JWT `sub` claims. *(Available from v0.2.0; automatically resolved from authentication context if bearer token is provided)*
* **Example Call:**
```json
{
  "namespace": "nogoo9"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "ID\tNAME\tSTATUS\nsession45\tws-anonymous-session45\tRunning"
    }
  ],
  "structuredContent": {
    "workspaces": [
      {
        "id": "session45",
        "name": "ws-anonymous-session45",
        "status": "Running"
      }
    ]
  }
}
```

### `spawn_workspace`
Spawns an isolated workspace pod from a template or inline declaration, evaluates spawner annotations, constructs init containers, configures pre-stop hook cleanups, and binds service accounts.
*(Changed in v0.2.0: Supports lifecycle hooks context verification and automated AsyncLocalStorage JWT ownership extraction)*

* **Inputs:**
  * `id` (string): Unique agent session identifier.
  * `templateRef` (optional string): ConfigMap template reference.
  * `spec` (optional PodSpec): Inline container/volume specifications (if `templateRef` omitted).
  * `annotations` (optional object): Inline lifecycle annotations (if `templateRef` omitted).
  * `namespace` (optional string): Target namespace.
  * `context` (optional object): Key-value pairs to satisfy target template's `nogoo9/required-context` variable validations.
  * `jwtPayload` (optional object): Decoded JWT payload to assign authenticated workspace ownership. *(Available from v0.2.0; automatically resolved from authentication context if bearer token is provided)*
* **Example Call:**
```json
{
  "id": "session45",
  "templateRef": "dev-node-template",
  "namespace": "nogoo9",
  "context": {
    "GIT_REPO_URL": "https://github.com/myorg/workspace-project.git",
    "GITHUB_TOKEN": "ghp_securetoken"
  }
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Spawned workspace session45 (Pod: ws-anonymous-session45)"
    }
  ],
  "structuredContent": {
    "id": "session45",
    "podName": "ws-anonymous-session45"
  }
}
```

### `stop_workspace`
Initiates a graceful cleanup and termination of the target workspace pod, triggering any registered `preStop` hooks (e.g. syncing data to Git or S3 before pod deletion).
*(Changed in v0.2.0: Invokes pre-stop graceful shutdown logic and enforces JWT user identity validation)*

* **Inputs:**
  * `id` (string): Workspace ID to terminate.
  * `namespace` (optional string): Target namespace.
  * `jwtPayload` (optional object): Decoded JWT payload (mandated if authentication is enabled). *(Available from v0.2.0; automatically resolved from authentication context if bearer token is provided)*
* **Example Call:**
```json
{
  "id": "session45",
  "namespace": "nogoo9"
}
```
* **Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Stopped workspace session45 (Pod: ws-anonymous-session45)"
    }
  ],
  "structuredContent": {
    "id": "session45",
    "status": "terminating"
  }
}
```
