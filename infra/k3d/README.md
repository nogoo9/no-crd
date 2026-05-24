# Minimal k3d Local Kubernetes Environment

This directory contains the configurations and scripts to bootstrap a minimal local Kubernetes development environment using `k3d` to run, test, and debug the `@nogoo9/kube-mcp` service.

## Prerequisites

Ensure you have the following installed on your machine:
- **Docker**
- **k3d** (`curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | TAG=v5.6.0 bash`)
- **kubectl**
- **Bun** (for package management and scripts)
- **Moon** (task runner)

---

## 1. Setup (Bootstrap Cluster)

To spin up the cluster, build the `@nogoo9/kube-mcp` image, push it to the local registry, and deploy all services:

```bash
# Using Moon
moon run k3d:bootstrap

# Or run the script directly
./bootstrap.sh
```

This script will automatically:
1. Initialize the single-node `k3d` cluster (`nogoo-dev`) if it doesn't exist, or start it if it exists but is stopped.
2. Add `nogoo9-registry.localhost` to your `/etc/hosts` if not present.
3. Pre-load testing images (like `aws-cli` and `rustfs`) to the registry.
4. Build the `@nogoo9/kube-mcp` docker image using the local Dockerfile and push it.
5. Apply the Kubernetes manifests (namespace, Rbac roles, MCP server, mock S3, and the in-cluster MCP Inspector).

### Starting a stopped cluster
If you have stopped the cluster and want to start it without running the full bootstrap process:
```bash
moon run k3d:start
```

---

## 2. Accessing the Services

Once the bootstrap task completes, you can access the exposed services on the host machine:

- **MCP Server HTTP SSE Endpoint**: `http://localhost:8080/mcp`

---

## 3. Using the MCP Inspector

The MCP Inspector can be run locally on the host to connect and debug the MCP server:

1. Run `moon run mcp:inspect` or `bun run inspect`.
2. Open `http://localhost:6277` in your browser.
3. In the connection panel, select **SSE** (Server-Sent Events) as the transport method.
4. Set the SSE URL to: `http://localhost:8080/mcp`.
5. Click **Connect** to browse, inspect, and trigger the tools.

---

## 4. Development Rebuilds

If you make modifications to the MCP server code, you can quickly rebuild the container, push it to the registry, and trigger a rolling update of the Kubernetes pod:

```bash
# Standard local setup
moon run mcp:deploy

# If running on WSL 2
moon run mcp:deploy-wsl
```

---

## 5. Running Validation & Tests

To run local formatting and type checking:
```bash
# From root
bun run format && bun run typecheck
```

To run all unit tests:
```bash
moon run mcp:test
```

To validate the full workspace spawner lifecycle (spawns pod, writes to mock S3, tears down, validates artifact sync):
```bash
# From root
bun run test:lifecycle
```

---

## 6. Teardown

To stop and delete the k3d cluster completely:

```bash
# Using Moon
moon run k3d:teardown

# Or run the script directly
./teardown.sh
```
