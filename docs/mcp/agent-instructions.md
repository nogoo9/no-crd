# System Prompts & Agent Rules

When your AI coding assistant (e.g. Cursor, Cline, Roo Code, Claude Desktop) is connected to the `@nogoo9/no-crd` MCP server, it gains direct command over your Kubernetes cluster. To ensure it acts safely, efficiently, and does not corrupt cluster states, add the following rules to your agent's system instructions.

---

## 🛠️ Copy-Pasteable `.cursorrules` / Cline Custom Rules

Save this snippet in a file named `.cursorrules` in your project's workspace directory, or append it to your Cline/Roo Code custom system instructions:

```markdown
# Kubernetes MCP Tool Usage Rules

You are connected to the `no-crd` MCP server, which enables you to orchestrate Kubernetes resources directly. Follow these rules strictly:

### 1. Minimal Resource Footprint
- Never provision resource-heavy containers unless explicitly specified.
- Prefer lightweight images (e.g. `alpine`, `node:alpine`, `python:slim`) to optimize pod download and startup times.
- Always use the `create_pod_from_template` or `spawn_workspace` tools instead of generating standard container specs from scratch whenever a template exists.

### 2. Isolation & managed-by Mode
- All pods you create MUST be labeled for ownership tracking. The spawner does this automatically. If you create a raw pod using `create_pod`, you must include:
  ```json
  "labels": {
    "nogoo9/managed-by": "nogoo9-spawner",
    "nogoo9/type": "workspace"
  }
  ```
- Do not attempt to query or edit unmanaged pods unless explicitly instructed.

### 3. Graceful Cleanup
- Always shut down workspaces you are done testing using `stop_workspace` to save cluster resources.
- If you configure a workspace with state requirements, verify that the template contains a `pre-stop-command` annotation (e.g., git commit/push, S3 upload) and allocate sufficient `default-grace-period` (minimum 60-120 seconds).
```

---

## 🚦 Tooling Usage Hierarchy

Instruct your agent to evaluate operations in the following order:

1. **Templates First**: Run `list_templates` to see if a pre-configured ConfigMap template exists for the task.
2. **Spawner Second**: Use `spawn_workspace` (which resolves dependencies, maps IAM roles, and sets up init-containers) rather than using raw `create_pod`.
3. **Diagnostics Third**: When debugging, use `get_pod_logs` and `get_workspace_events` instead of spawning separate shell diagnostic tools.
