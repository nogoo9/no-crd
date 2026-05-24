# @nogoo9/no-crd

> **Agent-Driven, On-Demand Pod Orchestration in Kubernetes — Without Custom Resource Definitions.**

[![npm version](https://img.shields.io/npm/v/@nogoo9/no-crd.svg?style=flat-square)](https://www.npmjs.com/package/@nogoo9/no-crd)
[![npm downloads](https://img.shields.io/npm/dm/@nogoo9/no-crd.svg?style=flat-square)](https://www.npmjs.com/package/@nogoo9/no-crd)
[![License](https://img.shields.io/npm/l/@nogoo9/no-crd.svg?style=flat-square)](LICENSE)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Server-orange.svg?style=flat-square)](https://modelcontextprotocol.io)
[![Bun](https://img.shields.io/badge/Bun-%3E%3D1.3.11-black?logo=bun&style=flat-square)](https://bun.sh)
[![Deno](https://img.shields.io/badge/Deno-compatible-blue?logo=deno&style=flat-square)](https://deno.land)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.14.0-green?logo=node.js&style=flat-square)](https://nodejs.org)

`@nogoo9/no-crd` is a lightweight, cross-runtime Model Context Protocol (MCP) server that empowers AI agents and APIs to dynamically spawn, route to, and manage ephemeral containerized sandboxes on standard Kubernetes (k8s/k3s) clusters — **without requiring Custom Resource Definitions (CRDs)**, cluster-level operators, or elevated RBAC permissions. 

It provides JupyterHub-like dynamic pod lifecycle management but is completely agnostic to actual workloads and supports multi-runtime execution under **Bun**, **Deno**, and **Node.js**.

---

## 🚀 Key Features

- **No CRDs Required:** Runs directly against core Kubernetes resources (Pods, ConfigMaps, ServiceAccounts). Highly portable, secure, and compatible with restricted/managed environments (EKS, GKE, K3s).
- **Agent Sandbox Spawner:** Specialized spawner tools that automate workspace provisioning with context validation, init containers, IAM roles, pre-stop hooks, and lifecycle sync.
- **ConfigMap-Based Templates:** Store, version, and load reusable pod templates stored as standard Kubernetes ConfigMaps.
- **Multi-Transport & Multi-Runtime:** Supports SSE/HTTP and Stdio communication modes. Runs seamlessly on Node.js, Bun, or Deno.
- **Embedded Web UI App:** Exposes an interactive React/web-based Pod Manager interface via the Model Context Protocol application extensions.

---

## 📦 Installation & Usage

You can run `@nogoo9/no-crd` directly via `npx`, install it globally, or run it with different JavaScript runtimes.

### Run Directly via NPX (No Installation)
```bash
# Start SSE (HTTP) server on port 3000
npx @nogoo9/no-crd

# Run over standard input/output (stdio)
npx @nogoo9/no-crd --transport stdio
```

### Install Globally
```bash
# Install package
npm install -g @nogoo9/no-crd

# Use the nocrd9 command-line binary
nocrd9 --transport stdio --mode cluster
```

### Run with Bun, Deno, or Node
The CLI dynamically supports routing execution through Deno, Bun, or Node.js runtimes:
```bash
# Run using Deno
nocrd9 --runtime deno --transport http --port 3050

# Run using Node
nocrd9 --runtime node --transport stdio

# Run with HTTPS / custom TLS certificates
nocrd9 --transport http --port 3443 --tls-cert /path/to/cert.pem --tls-key /path/to/key.pem
```

### 🦕 Bun & Deno Kubernetes Certificate Compatibility
By default, the `@kubernetes/client-node` package uses Node.js's `https.Agent` to attach client certificates and verify server CAs. Because Bun and Deno use native web-standard HTTP engines, they ignore these Node-specific agents, which typically leads to connection failures (`UnknownIssuer`) or authentication errors (`401 Unauthorized`).

`@nogoo9/no-crd` solves this automatically by intercepting outbound requests with a custom isomorphic transport that:
* **Dynamically Extracts Credentials**: Intercepts the request agent constructed by `@kubernetes/client-node` and extracts the fully-resolved cert, key, and CA certificate data.
* **Propagates to Bun**: Feeds certificate options directly into the native Bun `fetch` `tls` configurations.
* **Propagates to Deno**: Instantiates a temporary `Deno.HttpClient` with `caCerts` to securely perform requests (meaning you do not need the `--unsafely-ignore-certificate-errors` flag for Kubernetes connections).

---

## ⚙️ Configuration & Environment Variables

The server and command-line utility are configurable using CLI options or environment variables.

| CLI Option | Environment Variable | Defaults | Allowed Values | Description |
|---|---|---|---|---|
| `-t, --transport` | `TRANSPORT` | `http` | `http`, `stdio`, `both` | Server transport mode. `both` fires up both transports simultaneously. |
| `-m, --mode` | `MODE` | `cluster` | `cluster`, `namespaced` | Kubernetes access scope. `namespaced` locks operations to a single namespace. |
| `-n, --namespace` | `NAMESPACE` | `nogoo9` | String | Default Kubernetes namespace for operations. |
| `-p, --port` | `PORT` | `3000` | Number | HTTP server port for SSE transport. |
| `-l, --log-level` | `LOG_LEVEL` | `info` | `debug`, `info`, `warning`, `error`, `fatal` | Logging verbosity filter. |
| `--tls-cert` | `TLS_CERT` | - | Path string | Path to TLS certificate file to enable HTTPS. |
| `--tls-key` | `TLS_KEY` | - | Path string | Path to TLS private key file to enable HTTPS. |
| `--disable-permission-checks` | `DISABLE_PERMISSION_CHECKS` | `false` | `true`, `false` | Disable Kubernetes RBAC permission checks and assume all tools are enabled. |
| `--cors-origin` | `CORS_ALLOWED_ORIGIN`, `CORS_ORIGIN` | `*` | String | CORS Allowed Origin header. |
| `--cors-methods` | `CORS_ALLOWED_METHODS`, `CORS_METHODS` | `GET, POST, OPTIONS` | String | CORS Allowed Methods header. |
| `--cors-headers` | `CORS_ALLOWED_HEADERS`, `CORS_HEADERS` | `Content-Type, Authorization, mcp-protocol-version` | String | CORS Allowed Headers header. |
| - | `UI_ENABLED` | `true` | `true`, `false` | Enables the embedded HTML Pod Manager UI resource. |
| - | `AUTH_ENABLED` | `false` | `true`, `false` | When true, restricts workspace operations to JWT validated identities. |
| - | `AUTH_SUB_JSONPATH`| `$.sub` | JSONPath | Payload path to extract unique user identity from JWT payload. |
| - | `REGISTRY_URL` | - | URL string | Target container registry URL to query for images (e.g. `http://localhost:5001`). |

---

## ☸️ Kubernetes Setup & RBAC Permissions

For the `@nogoo9/no-crd` MCP server to interact with Kubernetes, it must run with appropriate RBAC permissions. Depending on your configuration, you can deploy it with **Cluster-Wide (ClusterRole)** access or **Namespace-Scoped (Role)** access.

### Tool-to-Permission Mapping
Below is the mapping showing which Kubernetes API resources and verbs each MCP tool requires. The server dynamically checks these permissions at startup (via `SelfSubjectAccessReview`) and only registers tools that the active identity is authorized to use.

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

### 1. Cluster-Wide Mode (`MODE=cluster`)
Use this mode if you want the MCP server to manage sandboxes across any namespace in the cluster.

Create a `ClusterRole` and `ClusterRoleBinding`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nogoo-mcp
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch", "create", "delete", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: nogoo-mcp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: nogoo-mcp
subjects:
  - kind: ServiceAccount
    name: nogoo-mcp
    namespace: nogoo9 # Change to the namespace where your MCP server runs
```

### 2. Namespace-Scoped Mode (`MODE=namespaced`)
Use this mode if the MCP server should be restricted to a single namespace (e.g. `nogoo9`). In this mode, no cluster-level or administrative permissions are needed.

Create a `Role` and `RoleBinding` in the target namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: nogoo-mcp
  namespace: nogoo9
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch", "create", "delete", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: nogoo-mcp
  namespace: nogoo9
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: nogoo-mcp
subjects:
  - kind: ServiceAccount
    name: nogoo-mcp
    namespace: nogoo9
```
*(Note: In namespace-scoped mode, the `list_namespaces` tool will only return the target namespace, and namespace parameter inputs to all tools will default to the target namespace.)*

---

## 🛠️ MCP Integration Configs

To let AI coding assistants (like Claude Desktop, Cursor, Cline, or Roo Code) orchestrate Kubernetes workspaces, add `@nogoo9/no-crd` to your MCP configuration. Choose the configuration block below that matches your deployment mode (**Cluster-Wide** vs. **Namespace-Scoped**).

### 1. Claude CLI / Claude Desktop
Add to your server configurations (usually `~/.config/Claude/config.json` or `~/Library/Application Support/Claude/config.json`):

#### Cluster-Wide Mode
```json
{
  "mcpServers": {
    "no-crd": {
      "command": "npx",
      "args": [
        "-y",
        "@nogoo9/no-crd",
        "--transport",
        "stdio",
        "--mode",
        "cluster",
        "--namespace",
        "nogoo9"
      ]
    }
  }
}
```

#### Namespace-Scoped Mode
```json
{
  "mcpServers": {
    "no-crd": {
      "command": "npx",
      "args": [
        "-y",
        "@nogoo9/no-crd",
        "--transport",
        "stdio",
        "--mode",
        "namespaced",
        "--namespace",
        "nogoo9"
      ]
    }
  }
}
```

### 2. Cursor
In Cursor Settings:
1. Go to **Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in details based on your variant:
   - **Name**: `no-crd`
   - **Type**: `stdio`
   - **Command**:
     - *Cluster-Wide*: `npx -y @nogoo9/no-crd --transport stdio --mode cluster --namespace nogoo9`
     - *Namespace-Scoped*: `npx -y @nogoo9/no-crd --transport stdio --mode namespaced --namespace nogoo9`

### 3. Cline / Roo Code
Add to `mcp_settings.json` (inside VS Code global storage paths):

#### Cluster-Wide Mode
```json
{
  "mcpServers": {
    "no-crd": {
      "command": "npx",
      "args": [
        "-y",
        "@nogoo9/no-crd",
        "--transport",
        "stdio",
        "--mode",
        "cluster",
        "--namespace",
        "nogoo9"
      ]
    }
  }
}
```

#### Namespace-Scoped Mode
```json
{
  "mcpServers": {
    "no-crd": {
      "command": "npx",
      "args": [
        "-y",
        "@nogoo9/no-crd",
        "--transport",
        "stdio",
        "--mode",
        "namespaced",
        "--namespace",
        "nogoo9"
      ]
    }
  }
}
```

### 4. Local Development / Cross-Runtime Configurations
If you are developing locally or running the server directly from the source repository, you can register the local server with your MCP client using one of the following configurations:

#### Bun (Source execution)
Recommended for development on Bun:
```json
    "nogoo9-no-crd-local-bun": {
      "command": "bun",
      "args": ["run", "src/index.ts"],
      "env": {
        "TRANSPORT": "stdio",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
```

#### Deno (Source execution)
Runs the server directly from source using Deno. The flags ensure sloppier Node compatibility imports and ignore self-signed certificate issues with local Kubernetes APIs:
```json
    "nogoo9-no-crd-local-deno": {
      "command": "deno",
      "args": [
        "run",
        "--allow-all",
        "--unstable-sloppy-imports",
        "--unsafely-ignore-certificate-errors",
        "src/index.ts"
      ],
      "env": {
        "TRANSPORT": "stdio",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
```

#### Node.js (Pre-compiled execution)
Runs the compiled bundle using Node.js:
```json
    "nogoo9-no-crd-local-node": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "TRANSPORT": "stdio",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
```
*(Make sure to run `bun run build` first to compile the code into the `dist/` directory).*

---

## 📑 Workspace Templates & Spawner Annotations

Templates in `@nogoo9/no-crd` are stored as standard Kubernetes `ConfigMaps` in your target namespace. This allows you to define, version, and share reusable sandbox environments without writing custom operators or CRDs.

### 1. How to Define a Template

To register a template with the spawner, create a `ConfigMap` meeting the following requirements:
1. **Discovery Label**: Must be labeled with `nogoo9/pod-template: "true"`.
2. **Spec Key**: The `data` block must contain a key named `spec` whose value is a JSON string conforming to the `PodSpecSchema` (e.g. `containers`, `volumes`, `restartPolicy`).
3. **Behavior Customization**: Set `annotations` on the `ConfigMap` metadata to configure advanced spawner integrations (like IAM role binding, init containers, and pre-stop lifecycle hooks).

#### Example Template Definition:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-workspace-template
  namespace: nogoo9
  labels:
    nogoo9/pod-template: "true"
  annotations:
    nogoo9/description: "A standard Node.js development sandbox with S3 storage sync"
    nogoo9/tag: "node-20"
    nogoo9/required-context: "PROJECT_NAME,REPO_URL"
    nogoo9/iam-role-arn: "arn:aws:iam::123456789012:role/workspace-s3-access"
    nogoo9/init-image: "alpine/git"
    nogoo9/init-command: "git clone $REPO_URL /workspace/$PROJECT_NAME"
    nogoo9/pre-stop-command: "aws s3 sync /workspace s3://my-workspace-backups/$PROJECT_NAME"
    nogoo9/default-grace-period: "120"
data:
  spec: |
    {
      "containers": [
        {
          "name": "workspace",
          "image": "node:20-alpine",
          "command": ["sleep", "infinity"],
          "volumeMounts": [
            {
              "name": "workspace-storage",
              "mountPath": "/workspace"
            }
          ]
        }
      ],
      "volumes": [
        {
          "name": "workspace-storage",
          "emptyDir": {}
        }
      ]
    }
```

### 2. Supported Spawner Annotations

The spawner inspects `ConfigMap` metadata annotations (and custom inline annotations passed during `spawn_workspace`) to customize the workspace lifecycle:

| Annotation | Type | Description |
|---|---|---|
| `nogoo9/description` | String | A short explanation of what the template is configured to do. |
| `nogoo9/tag` | String | A tag/version associated with the template environment. |
| `nogoo9/required-context` | Comma-separated list | List of variable keys that **must** be supplied in the `context` parameter when spawning the workspace. |
| `nogoo9/iam-role-arn` | AWS IAM Role ARN | Automatically provisions a target-namespace Kubernetes `ServiceAccount` annotated with `eks.amazonaws.com/role-arn` and binds it to the Pod. |
| `nogoo9/init-image` | Container Image | The image to run in the dynamic `spawner-init` initContainer (requires `nogoo9/init-command`). |
| `nogoo9/init-command` | Shell Command | The command to run inside the initContainer. The container shares volume mounts and receives all `context` vars as environment variables. |
| `nogoo9/pre-stop-command` | Shell Command | A command run in a Kubernetes `preStop` lifecycle exec hook when the workspace is stopped. |
| `nogoo9/pre-stop-sidecar-image` | Container Image | Optional. If specified alongside `pre-stop-command`, the pre-stop hook executes in a dedicated sidecar running this image instead of the main container. |
| `nogoo9/default-grace-period` | Number (seconds) | Overrides the Pod's `terminationGracePeriodSeconds` (defaults to `60` if pre-stop is defined) to ensure cleanup commands have sufficient time to finish. |

---

## 🔌 API Reference (MCP Tools & Resources)

### Pod Tools
- **`list_pods`**: Retrieve a summary of pods in the namespace. Filters by `labelSelector`, `fieldSelector`, and `limit`.
- **`get_pod`**: Fetch full Kubernetes API JSON payload for a target pod name.
- **`create_pod`**: Create a custom pod with direct container/volume specifications.
- **`patch_pod`**: Apply a Strategic Merge Patch to modify labels, annotations, or container resource limits dynamically.
- **`delete_pod`**: Terminate a pod with optional `gracePeriodSeconds`.
- **`get_pod_logs`**: Fetch logs for a container with options like `tailLines`, `sinceSeconds`, `timestamps`, `limitBytes`, and `previous`.
- **`list_namespaces`**: List all namespaces accessible with current credentials.
- **`list_registry_images`**: List catalog images from the configured `REGISTRY_URL`.

### Pod Template Tools
Manage preconfigured pod specifications stored as standard Kubernetes ConfigMaps (labeled `nogoo9/pod-template=true`).
- **`list_templates`**: Show available templates.
- **`get_template`**: Get the raw pod template spec.
- **`create_template`**: Store a new pod template spec.
- **`update_template`**: Update labels, annotations, or specs on an existing template.
- **`delete_template`**: Delete a template.
- **`create_pod_from_template`**: Spawn a pod using a template, applying container overrides (environment variables, commands, resources) and top-level overrides.

### Agent Workspace (Spawner) Tools
Specially designed for AI agents to safely spawn and clean up their own workspace sandboxes.
- **`list_workspaces`**: List active agent workspaces (with JWT/owner mapping support).
- **`spawn_workspace`**: Spawn a workspace sandbox pod. Features:
  - **Context Validation (`nogoo9/required-context`)**: Requires the caller to supply critical env variables (e.g. API keys) before spawning.
  - **Init Containers (`nogoo9/init-image` / `nogoo9/init-command`)**: Initialize workspace directories/files before main containers start.
  - **Pre-Stop Hooks (`nogoo9/pre-stop-command`)**: Run custom cleanup commands (e.g., commit/sync code to git or S3) upon termination.
  - **IAM Role Mapping (`nogoo9/iam-role-arn`)**: Dynamically provisions AWS EKS IAM Role service accounts.
- **`stop_workspace`**: Clean up and terminate the workspace pod.

### Utilities
- **`current_namespace`**: Returns active namespace and access mode.

### MCP Resources
- **`pod-template://{namespace}/{name}`**: Exposes stored pod templates directly as read-only MCP resources.
- **`ui://nogoo9/app`**: Exposes the embedded React/web UI app (if `UI_ENABLED=true` and built). When the server runs in HTTP/SSE transport mode, the UI is also served directly at `/` or `/ui` (e.g. `http://localhost:3000/`) and automatically falls back to standard HTTP JSON-RPC calls when loaded outside a postMessage-compatible MCP host (such as in a standard browser tab or the MCP Inspector).

---

## 🏗️ Architecture

```
  ┌───────────────────────┐
  │   AI Agent / Client   │
  └───────────┬───────────┘
              │ (Stdio or SSE Transport)
              ▼
  ┌───────────────────────┐
  │      MCP Server       │ <── (Queries ConfigMaps for specs)
  └───────────┬───────────┘
              │ (Kubernetes API - CoreV1)
              ▼
  ┌──────────────────────────────────────────┐
  │            Kubernetes Cluster            │
  │  ┌────────────────────────────────────┐  │
  │  │         Target Namespace           │  │
  │  │  ┌──────────┐ ┌──────────┐ ┌────┐  │  │
  │  │  │ Agent    │ │ Custom   │ │    │  │  │
  │  │  │ Sandbox  │ │ Workload │ │... │  │  │
  │  │  │ Pod      │ │ Pod      │ │    │  │  │
  │  │  └──────────┘ └──────────┘ └────┘  │  │
  │  └────────────────────────────────────┘  │
  └──────────────────────────────────────────┘
```

The server interacts directly with the Kubernetes API using `@kubernetes/client-node`. By using standard `Pod` and `ConfigMap` resources, the setup is highly scalable, requires no cluster operator installs, and easily adheres to strict enterprise namespace-level security policies.

---

## 🛠️ Development

We use [Moon](https://moonrepo.dev/moon) for toolchain management and task running, and [Biome](https://biomejs.dev) for formatting and linting.

### Prerequisites
- Bun `1.3.11`+
- Node.js `22.14.0`+
- Moon `2.1.3`+
- k3d (for local Kubernetes cluster)

### Setup Environment
```bash
# Install dependencies
bun install

# Auto-fix code formatting and linting via Biome
bun run format

# Run TypeScript compilation checks
bun run typecheck
```

### Running Tests
```bash
# Run unit tests
moon run mcp:test

# Run full spawner workspace lifecycle tests (requires local k3d)
bun run test:lifecycle
```

### Local Cluster Testing (k3d)
Bootstrap a local `k3d` Kubernetes cluster complete with a local registry, built-in mock S3, and Traefik:
```bash
# Spin up development cluster
moon run k3d:bootstrap

# Rebuild, push, and deploy MCP server to the cluster
moon run mcp:deploy

# Tear down the cluster
moon run k3d:teardown
```

---

## 📄 License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

