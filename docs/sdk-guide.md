# Programmatic SDK Guide
*(Available from v0.2.0)*

`@nogoo9/no-crd` provides a composable, type-safe SDK for developers to manage containerized workspaces programmatically in Bun, Deno, or Node.js. 

Unlike the MCP server entry point, importing the SDK does not trigger automatic server runs or side effects, making it perfect for custom microservices, pipeline agents, or orchestration control loops.

---

## ⚙️ Initializing the Context

Every SDK function requires a `K8sContext` instance, which encapsulates the Kubernetes client configuration and API endpoints.

```typescript
import { KubeConfig } from "@kubernetes/client-node";
import { initK8sContext } from "@nogoo9/no-crd";

// Load default local/cluster configuration
const kc = new KubeConfig();
kc.loadFromDefault();

// Initialize the API context
const k8sCtx = initK8sContext(kc);
```

You can pass a custom `KubeConfig` (for instance, to dynamically authenticate EKS or GKE cluster endpoints based on request headers) or instantiate a pre-configured context using your own Kubernetes configuration details.

---

## 🛠️ Spawning Workspaces

The SDK exports the `spawnWorkspace` function, which replicates the spawner tool lifecycle: resolving ConfigMap templates, validating context requirements, and submitting the workspace pod.

```typescript
import { spawnWorkspace } from "@nogoo9/no-crd";

const result = await spawnWorkspace(k8sCtx, {
  id: "agent-session-42",
  templateRef: "nogoo9/default-agent-workspace", // Format: namespace/name or name
  namespace: "nogoo9",
  context: {
    "S3_BUCKET": "my-agent-bucket",
    "S3_FOLDER": "session-42"
  }
});

console.log(`Successfully spawned pod: ${result.podName}`);
```

---

## ⏹️ Stopping Workspaces

To delete and clean up a running workspace, use `stopWorkspace`:

```typescript
import { stopWorkspace } from "@nogoo9/no-crd";

const result = await stopWorkspace(k8sCtx, {
  id: "agent-session-42",
  namespace: "nogoo9"
});

console.log(`Teardown status: ${result.status}`); // Returns 'terminating'
```

---

## 📋 Listing Workspaces

To query all active agent workspaces running within a target namespace:

```typescript
import { listWorkspaces } from "@nogoo9/no-crd";

const result = await listWorkspaces(k8sCtx, {
  namespace: "nogoo9"
});

for (const ws of result.workspaces) {
  console.log(`- ID: ${ws.id}, Pod: ${ws.name}, Status: ${ws.status}`);
}
```

---

## 🌐 Building a Custom HTTP Spawner API (Hono Example)

Below is a complete, production-ready example of how to wrap the Programmatic SDK inside a [Hono](https://hono.dev/) microservice running on Bun or Node.js:

```typescript
import { Hono } from "hono";
import { KubeConfig } from "@kubernetes/client-node";
import { 
  initK8sContext, 
  spawnWorkspace, 
  stopWorkspace, 
  listWorkspaces 
} from "@nogoo9/no-crd";

const app = new Hono();

// Load client configurations
const kc = new KubeConfig();
kc.loadFromDefault();
const k8sCtx = initK8sContext(kc);

// GET /api/workspaces - List active workspaces
app.get("/api/workspaces", async (c) => {
  try {
    const list = await listWorkspaces(k8sCtx, {
      namespace: "nogoo9"
    });
    return c.json(list);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/workspaces/spawn - Spawn a new agent workspace
app.post("/api/workspaces/spawn", async (c) => {
  const body = await c.req.json();
  const { workspaceId, templateName, s3Folder } = body;

  if (!workspaceId || !templateName) {
    return c.json({ error: "Missing workspaceId or templateName" }, 400);
  }

  try {
    const result = await spawnWorkspace(k8sCtx, {
      id: workspaceId,
      templateRef: templateName,
      namespace: "nogoo9",
      context: {
        "S3_FOLDER": s3Folder || `session-${workspaceId}`,
        "S3_BUCKET": "my-agent-workspaces"
      }
    });
    return c.json({
      success: true,
      message: `Workspace spawned successfully`,
      podName: result.podName
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/workspaces/stop - Stop and delete a workspace sandbox
app.post("/api/workspaces/stop", async (c) => {
  const { workspaceId } = await c.req.json();

  if (!workspaceId) {
    return c.json({ error: "Missing workspaceId" }, 400);
  }

  try {
    const result = await stopWorkspace(k8sCtx, {
      id: workspaceId,
      namespace: "nogoo9"
    });
    return c.json({
      success: true,
      message: `Workspace stopped successfully`,
      status: result.status
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default {
  port: 8080,
  fetch: app.fetch
};
```

---

## 💡 Advanced SDK Recipes

Here are code snippets for common operational control loops when building custom orchestrators.

### Recipe 1: Wait for Workspace to Be Ready (Health Checks)
Before routing HTTP traffic to a newly spawned workspace, you should wait for the pod phase to transition to `Running` and retrieve its cluster IP:

```typescript
import { listWorkspaces } from "@nogoo9/no-crd";

async function waitForWorkspaceReady(
  k8sCtx: any,
  namespace: string,
  workspaceId: string,
  timeoutMs = 60000
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const list = await listWorkspaces(k8sCtx, { namespace });
    const ws = list.workspaces.find((w) => w.id === workspaceId);
    
    if (ws && ws.status === "Running") {
      // Fetch the Pod spec directly using coreApi to resolve its IP
      const podInfo = await k8sCtx.coreApi.readNamespacedPod(ws.name, namespace);
      const ip = podInfo.body.status?.podIP;
      if (ip) return ip;
    }
    
    // Wait 1 second before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timeout waiting for workspace ${workspaceId} to be ready`);
}
```

### Recipe 2: Injecting Custom Volumes and Spec Overrides
You can customize resources, mount secrets, or configure cluster properties dynamically on spawn:

```typescript
import { spawnWorkspace } from "@nogoo9/no-crd";

const result = await spawnWorkspace(k8sCtx, {
  id: "user-session-99",
  templateRef: "default-agent-workspace",
  namespace: "nogoo9",
  context: {},
  // Inject limits or shared emptyDir storage dynamically
  overrides: {
    spec: {
      containers: [
        {
          name: "main",
          resources: {
            limits: { cpu: "1", memory: "1Gi" },
            requests: { cpu: "100m", memory: "128Mi" }
          },
          volumeMounts: [
            {
              name: "shared-data",
              mountPath: "/data"
            }
          ]
        }
      ],
      volumes: [
        {
          name: "shared-data",
          emptyDir: {}
        }
      ]
    }
  }
});
```

