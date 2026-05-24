# MCP Client Integration Guide

This guide explains how to connect and interact with the `@nogoo9/no-crd` Model Context Protocol (MCP) server. 

The MCP server exposes powerful tools and resources directly to AI coding assistants and API clients, enabling them to dynamically orchestrate Kubernetes workspaces, manage templates, query pod logs, and view an embedded React-based Pod Manager dashboard.

---

## 🔌 Connection Architectures

The server supports two transport protocols:
1. **Stdio Transport (Standard Input/Output):** Recommended for local IDE integrations (like Cursor, Claude Desktop, and Cline) where the client spawns the server as a child process.
2. **SSE Transport (Server-Sent Events / HTTP):** Recommended for remote deployments, web clients, or programmatic orchestrators.

```mermaid
graph TD
    subgraph Stdio Integration
        Cursor[Cursor / Claude Desktop] -->|Stdio Pipes| Cli[cli.js / index.ts]
        Cli -->|Kubernetes API| K8s[Kubernetes Cluster]
    end
    
    subgraph SSE HTTP Integration
        WebClient[Web app / Custom SDK] -->|HTTP POST / SSE Stream| Server[server.ts]
        Server -->|Kubernetes API| K8s2[Kubernetes Cluster]
    end
```

---

## 🛠️ Configuring Popular AI Clients

Below are configuration patterns for standard developer environments. Choose the block corresponding to your target setup.

### 1. Claude Desktop
Add the following to your Claude Desktop configuration file:
* **macOS:** `~/Library/Application Support/Claude/config.json`
* **Windows:** `%APPDATA%\Claude\config.json`
* **Linux:** `~/.config/Claude/config.json`

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

### 2. Cursor
To configure the server in Cursor:
1. Open Cursor and navigate to **Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Configure the fields as follows:
   * **Name:** `no-crd`
   * **Type:** `stdio`
   * **Command:** `npx -y @nogoo9/no-crd --transport stdio --mode cluster --namespace nogoo9`

### 3. Cline / Roo Code (VS Code Extension)
Open or edit your global `mcp_settings.json` (usually located in VS Code's global extensions configuration folder):

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

## 🔍 Debugging Connections with MCP Inspector

You can inspect all available tools, resources, and schemas using the official MCP Inspector. Run the preconfigured command:

```bash
bun run inspect
```

Alternatively, invoke it directly via `npx`:

```bash
TRANSPORT=stdio npx @modelcontextprotocol/inspector bun run dist/index.js
```

This launches a web-based inspector UI on `http://localhost:5173` where you can view tools, schemas, and trigger tool calls manually to verify cluster access.

---

## 💻 Programmatic SDK Integration (TypeScript)

If you are building your own orchestrator or agent wrapper, you can consume `@nogoo9/no-crd` programmatically using the `@modelcontextprotocol/sdk`. 

The library exports type-safe Zod output schemas and TypeScript generics to let you call tools and validate responses reliably.

### Example: Programmatic client call
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { z } from "zod";
import type { CustomToolResult } from "@nogoo9/no-crd";
import { 
  SpawnWorkspaceOutputSchema,
  StopWorkspaceOutputSchema,
  GetPodOutputSchema 
} from "@nogoo9/no-crd/schemas";

async function run() {
  // Connect to the HTTP/SSE transport endpoint
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"));
  const client = new Client(
    { name: "custom-agent-client", version: "1.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  
  const workspaceId = "agent-sandbox-101";
  
  // 1. Call spawn_workspace with typed outputs
  console.log("Spawning workspace...");
  const spawnRes = (await client.callTool({
    name: "spawn_workspace",
    arguments: {
      id: workspaceId,
      namespace: "nogoo9",
      spec: {
        containers: [
          {
            name: "workspace",
            image: "node:22-alpine",
            command: ["sleep", "infinity"]
          }
        ]
      }
    }
  })) as CustomToolResult<z.infer<typeof SpawnWorkspaceOutputSchema>>;

  if (spawnRes.isError) {
    console.error("Failed to spawn:", spawnRes.content[0].text);
    return;
  }

  // 2. Validate structured content returned by the tool using Zod
  if (spawnRes.structuredContent) {
    const parsed = SpawnWorkspaceOutputSchema.safeParse(spawnRes.structuredContent);
    if (parsed.success) {
      console.log("Workspace Spawned Successfully. Pod Name:", parsed.data.name);
    }
  }

  // 3. Stop the workspace
  console.log("Stopping workspace...");
  const stopRes = (await client.callTool({
    name: "stop_workspace",
    arguments: { id: workspaceId, namespace: "nogoo9" }
  })) as CustomToolResult<z.infer<typeof StopWorkspaceOutputSchema>>;
}

run().catch(console.error);
```

---

## 🖥️ Using the Embedded Pod Manager UI

The MCP server embeds a rich React-based dashboard that clients can display inside their interface if they support the MCP **application extensions** capability.

### MCP Resource URI
The application dashboard is exposed as an MCP resource:
```
ui://nogoo9/app
```

### Behavior & Capabilities
* **Automatic Discovery:** The application is listed in response to a `resources/list` request when `UI_ENABLED=true`.
* **Cross-Origin Compliance:** Standard CORS parameters allow CORS headers for pre-flight operations and connection lifecycle checks.
* **Real-time Synchronization:** Shows active pods, status phases, template ConfigMaps, and allows terminating running workspaces with a single click.
* **HTTP Browser Serving:** When running the server in HTTP/SSE transport mode (`TRANSPORT=http` or `both`), the UI dashboard is served directly at the root `/`, `/ui`, and `/ui/` pathnames (e.g., `http://localhost:3000/`).
* **Robust HTTP Fallback:** If the UI is loaded outside a compatible MCP iframe (e.g. in a standard browser tab, or inside the MCP Inspector which doesn't support ext-apps postMessage handshakes), the client automatically falls back to an HTTP JSON-RPC transport session. It tries relative `/mcp` first, and then absolute `http://localhost:3000/mcp` to support cross-origin testing under the MCP Inspector seamlessly.
