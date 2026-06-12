# Programmatic TypeScript SDK

In addition to running as a standalone MCP server, `@nogoo9/no-crd` exports a complete programmatic SDK. You can import it into any Bun, Deno, or Node.js application to orchestrate Kubernetes workspace sandboxes directly without needing the JSON-RPC interface.

---

## 📦 Core SDK API

The programmatic SDK provides functions that match the actions of the MCP tools.

### Example: Spawning and Listing Workspaces

```typescript
import { KubeConfig } from "@kubernetes/client-node";
import { 
  initK8sContext, 
  spawnWorkspace, 
  stopWorkspace, 
  listWorkspaces 
} from "@nogoo9/no-crd";

// 1. Initialize Kubernetes API Context
// This automatically loads credentials from default ~/.kube/config or service accounts
const kc = new KubeConfig();
kc.loadFromDefault();
const ctx = initK8sContext(kc);

// 2. Spawn a workspace sandbox from a template
const spawnResult = await spawnWorkspace(ctx, {
  id: "agent-session-42",
  templateRef: "nogoo9/default-agent-workspace",
  context: {
    "S3_BUCKET": "my-bucket",
    "S3_FOLDER": "session-42"
  }
});
console.log(`Spawned pod: ${spawnResult.podName}`);

// 3. List active workspaces running in the namespace
const list = await listWorkspaces(ctx, {
  namespace: "nogoo9"
});
console.log(`Active workspaces count: ${list.workspaces.length}`);

// 4. Terminate the workspace sandbox gracefully
await stopWorkspace(ctx, {
  id: "agent-session-42"
});
```

---

## 🗂️ JSON Schema Validation (Zod)

The SDK exposes standard Zod schemas that validate request payloads and output structures. You can consume these to validate input arguments in custom orchestrator frameworks:

```typescript
import { 
  SpawnWorkspaceInputSchema, 
  SpawnWorkspaceOutputSchema 
} from "@nogoo9/no-crd/schemas";

// Example input validation
const inputResult = SpawnWorkspaceInputSchema.safeParse({
  id: "session-abc",
  templateRef: "node-template",
  context: { "REPO_URL": "https://github.com" }
});

if (!inputResult.success) {
  console.error("Invalid arguments:", inputResult.error.format());
}
```
