process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { z } from "zod";
import type { CustomToolResult } from "../src/k8s/index.js";
import { GetPodLogsOutputSchema, GetPodOutputSchema } from "../src/mcp/pods.js";
import {
	SpawnWorkspaceOutputSchema,
	StopWorkspaceOutputSchema,
} from "../src/mcp/spawner.js";

const NAMESPACE = process.env.NAMESPACE || "nogoo9";
const WORKSPACE_ID = "antigravity-test-agent";
const LOG_FILE_PATH = path.join(
	process.cwd(),
	"scratch",
	"antigravity-run.log",
);

// Ensure the local scratch directory exists
const scratchDir = path.dirname(LOG_FILE_PATH);
if (!fs.existsSync(scratchDir)) {
	fs.mkdirSync(scratchDir, { recursive: true });
}

// Write stream to local log file
const fileStream = fs.createWriteStream(LOG_FILE_PATH, { flags: "w" });

// Custom writable stream that writes to both process.stdout and the local log file
const doubleStream = new Writable({
	write(chunk, _encoding, callback) {
		process.stdout.write(chunk);
		fileStream.write(chunk);
		callback();
	},
});

async function main() {
	const taskToExecute = process.argv.slice(2).join(" ") || "run diagnostics";
	console.log(`==> Task to execute: "${taskToExecute}"`);

	console.log(`==> Connecting to MCP Server in K3d cluster...`);
	const mcpServerUrl = "http://localhost:8080/mcp";
	const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl));
	const client = new Client(
		{ name: "antigravity-test-client", version: "1.0.0" },
		{ capabilities: {} },
	);

	await client.connect(transport);
	console.log(`==> Connected to MCP Server successfully.`);

	// 1. Clean up any existing pod from a previous test run using stop_workspace
	try {
		console.log(
			`==> Cleaning up any existing workspace ID "${WORKSPACE_ID}"...`,
		);
		const stopResult = (await client.callTool({
			name: "stop_workspace",
			arguments: {
				id: WORKSPACE_ID,
				namespace: NAMESPACE,
			},
		})) as CustomToolResult<z.infer<typeof StopWorkspaceOutputSchema>>;
		if (!stopResult.isError && stopResult.structuredContent) {
			const parsed = StopWorkspaceOutputSchema.safeParse(
				stopResult.structuredContent,
			);
			if (!parsed.success) {
				console.warn(
					"Structured content validation failed for stop_workspace:",
					parsed.error.format(),
				);
			}
		}
		console.log(`==> Workspace stopped. Waiting to ensure Pod is deleted...`);
		// Wait for pod to be deleted using get_pod MCP tool
		const expectedPodName = `ws-anonymous-${WORKSPACE_ID}`;
		while (true) {
			const res = (await client.callTool({
				name: "get_pod",
				arguments: { name: expectedPodName, namespace: NAMESPACE },
			})) as CustomToolResult<z.infer<typeof GetPodOutputSchema>>;
			if (res.isError && res.code === 404) {
				break;
			}
			await new Promise((r) => setTimeout(r, 1000));
		}
		console.log(`==> Existing Pod deleted successfully.`);
	} catch (_) {
		// Stop tool returns error if not found, we ignore that
	}

	// 2. Define the Pod spec and annotations to pass to spawn_workspace
	const spec = {
		restartPolicy: "Never",
		containers: [
			{
				name: "workspace-main",
				image: "nogoo9/antigravity-agent:latest",
				imagePullPolicy: "IfNotPresent", // Crucial to prevent ErrImagePull
				command: [
					"/bin/sh",
					"-c",
					`set -e
					
					# Output previous run artifacts if present
					if [ -f /workspace/diagnostic_report.txt ]; then
						echo "[Local Testing] Found previous run artifact: $(cat /workspace/diagnostic_report.txt)"
					else
						echo "[Local Testing] No previous run artifacts detected in /workspace."
					fi
					
					# Execute CLI task
					antigravity run --task "${taskToExecute}"
					STATUS=$?
					
					# Keep container active so stop_workspace can trigger the preStop hook
					echo "[Local Testing] Task complete. Standing by for stop_workspace..."
					sleep 60
					exit $STATUS`,
				],
				volumeMounts: [
					{
						name: "workspace-volume",
						mountPath: "/workspace",
					},
					{
						name: "backup-volume",
						mountPath: "/backup",
					},
				],
			},
		],
		volumes: [
			{
				name: "workspace-volume",
				emptyDir: {},
			},
			{
				name: "backup-volume",
				hostPath: {
					path: "/tmp/antigravity-backup",
					type: "DirectoryOrCreate",
				},
			},
		],
	};

	const annotations = {
		"nogoo9/init-image": "alpine:latest",
		"nogoo9/init-command":
			"echo '[Post-Hook] Loading workspace artifacts...'; mkdir -p /workspace && if [ -f /backup/workspace.tar.gz ]; then tar -xzf /backup/workspace.tar.gz -C /workspace; echo '[Post-Hook] Loaded workspace.tar.gz successfully.'; else echo '[Post-Hook] No previous workspace archive found.'; fi",
		"nogoo9/pre-stop-command":
			"echo '[Pre-Hook-preStop] Saving workspace artifacts on Pod termination...'; tar -czf /backup/workspace.tar.gz -C /workspace .",
		"nogoo9/default-grace-period": "60",
	};

	// 3. Call spawn_workspace tool on the MCP Server
	console.log(`==> Calling spawn_workspace MCP tool...`);
	const spawnResult = (await client.callTool({
		name: "spawn_workspace",
		arguments: {
			id: WORKSPACE_ID,
			namespace: NAMESPACE,
			spec,
			annotations,
		},
	})) as CustomToolResult<z.infer<typeof SpawnWorkspaceOutputSchema>>;

	if (!spawnResult.isError && spawnResult.structuredContent) {
		const parsed = SpawnWorkspaceOutputSchema.safeParse(
			spawnResult.structuredContent,
		);
		if (!parsed.success) {
			console.warn(
				"Structured content validation failed for spawn_workspace:",
				parsed.error.format(),
			);
		}
	}

	const textContent = spawnResult.content[0];
	if (textContent?.type !== "text") {
		throw new Error("Invalid response from spawn_workspace tool");
	}
	console.log(`==> Server Response: ${textContent.text}`);

	const match = textContent.text.match(/\(Pod: ([^\s)]+)\)/);
	const podName = match ? match[1] : `ws-anonymous-${WORKSPACE_ID}`;
	console.log(`==> Tracking Pod: ${podName}`);

	// 4. Wait for pod to start running or terminate, and stream logs
	let logStreamStarted = false;
	let lastLogText = "";

	while (true) {
		const getPodResult = (await client.callTool({
			name: "get_pod",
			arguments: { name: podName, namespace: NAMESPACE },
		})) as CustomToolResult<z.infer<typeof GetPodOutputSchema>>;
		if (!getPodResult.isError && getPodResult.structuredContent) {
			const parsed = GetPodOutputSchema.safeParse(
				getPodResult.structuredContent,
			);
			if (!parsed.success) {
				console.warn(
					"Structured content validation failed for get_pod:",
					parsed.error.format(),
				);
			}
		}
		console.log(getPodResult);
		if (getPodResult.isError) {
			await new Promise((r) => setTimeout(r, 1000));
			continue;
		}

		const podData = JSON.parse(getPodResult.content[0].text);
		const phase = podData.status?.phase;

		if (phase === "Running" || phase === "Succeeded" || phase === "Failed") {
			if (!logStreamStarted) {
				console.log(
					`==> Pod is active. Streaming stdout & writing to ${LOG_FILE_PATH}:`,
				);
				console.log(
					`----------------------------------------------------------------------`,
				);
				logStreamStarted = true;
			}

			try {
				const logResult = (await client.callTool({
					name: "get_pod_logs",
					arguments: {
						name: podName,
						namespace: NAMESPACE,
						container: "workspace-main",
					},
				})) as CustomToolResult<z.infer<typeof GetPodLogsOutputSchema>>;
				if (!logResult.isError && logResult.structuredContent) {
					const parsed = GetPodLogsOutputSchema.safeParse(
						logResult.structuredContent,
					);
					if (!parsed.success) {
						console.warn(
							"Structured content validation failed for get_pod_logs:",
							parsed.error.format(),
						);
					}
				}
				const currentLogs = logResult.content[0]?.text || "";
				if (currentLogs && currentLogs !== lastLogText && !logResult.isError) {
					const newText = currentLogs.substring(lastLogText.length);
					doubleStream.write(newText);
					lastLogText = currentLogs;
				}
			} catch (_) {
				// Ignore errors if container is still starting
			}
		}

		// Detect task completion from logs to trigger cleanup
		if (
			lastLogText.includes(
				"[Local Testing] Task complete. Standing by for stop_workspace...",
			)
		) {
			console.log(
				`----------------------------------------------------------------------`,
			);
			console.log("==> Detected task completion in logs.");
			break;
		}

		if (phase === "Succeeded" || phase === "Failed") {
			console.log(
				`----------------------------------------------------------------------`,
			);
			console.log(`==> Pod terminated with phase: ${phase}`);
			break;
		}

		await new Promise((r) => setTimeout(r, 1000));
	}

	// Final check to flush any remaining logs
	try {
		const logResult = (await client.callTool({
			name: "get_pod_logs",
			arguments: {
				name: podName,
				namespace: NAMESPACE,
				container: "workspace-main",
			},
		})) as CustomToolResult<z.infer<typeof GetPodLogsOutputSchema>>;
		if (!logResult.isError && logResult.structuredContent) {
			const parsed = GetPodLogsOutputSchema.safeParse(
				logResult.structuredContent,
			);
			if (!parsed.success) {
				console.warn(
					"Structured content validation failed for get_pod_logs:",
					parsed.error.format(),
				);
			}
		}
		const currentLogs = logResult.content[0]?.text || "";
		if (currentLogs && currentLogs !== lastLogText && !logResult.isError) {
			const newText = currentLogs.substring(lastLogText.length);
			doubleStream.write(newText);
		}
	} catch (_) {}

	fileStream.end();
	console.log(`==> Local logs written to: ${LOG_FILE_PATH}`);

	// 5. Clean up workspace pod using stop_workspace MCP tool (this triggers the preStop hook)
	try {
		console.log(`==> Cleaning up workspace using stop_workspace MCP tool...`);
		const stopResult = (await client.callTool({
			name: "stop_workspace",
			arguments: {
				id: WORKSPACE_ID,
				namespace: NAMESPACE,
			},
		})) as CustomToolResult<z.infer<typeof StopWorkspaceOutputSchema>>;
		if (!stopResult.isError && stopResult.structuredContent) {
			const parsed = StopWorkspaceOutputSchema.safeParse(
				stopResult.structuredContent,
			);
			if (!parsed.success) {
				console.warn(
					"Structured content validation failed for stop_workspace:",
					parsed.error.format(),
				);
			}
		}
		console.log(`==> Workspace stop called successfully.`);

		// Wait for pod to be deleted to ensure preStop hook finishes execution
		const expectedPodName = `ws-anonymous-${WORKSPACE_ID}`;
		while (true) {
			const res = (await client.callTool({
				name: "get_pod",
				arguments: { name: expectedPodName, namespace: NAMESPACE },
			})) as CustomToolResult<z.infer<typeof GetPodOutputSchema>>;
			if (res.isError && res.code === 404) {
				break;
			}
			await new Promise((r) => setTimeout(r, 1000));
		}
		console.log(`==> Pod deleted and state archived.`);
	} catch (err) {
		console.error("Cleanup failed:", err);
	}

	showWorkspaceAfterRun();

	// Close transport connection
	try {
		await transport.close();
	} catch (_) {}
}

function getK3dServerContainer(): string {
	try {
		const output = execSync(
			'docker ps --filter "name=k3d-nogoo-dev-server" --format "{{.Names}}"',
			{ encoding: "utf8" },
		);
		const names = output.trim().split("\n");
		const serverNode = names.find(
			(name) => name.endsWith("-0") || name.includes("server-0"),
		);
		return serverNode || "k3d-nogoo-dev-server-0";
	} catch (_err) {
		console.warn(
			"Failed to dynamically detect k3d server node container name, falling back to k3d-nogoo-dev-server-0.",
		);
		return "k3d-nogoo-dev-server-0";
	}
}

function showWorkspaceAfterRun() {
	console.log(`\n==> Inspecting workspace state after run...`);
	const containerName = getK3dServerContainer();
	const localTarPath = path.join(
		process.cwd(),
		"scratch",
		"workspace-out.tar.gz",
	);
	const localExtPath = path.join(
		process.cwd(),
		"scratch",
		"workspace-extracted",
	);

	// Clean up previous extracted workspace directory
	if (fs.existsSync(localExtPath)) {
		fs.rmSync(localExtPath, { recursive: true, force: true });
	}
	fs.mkdirSync(localExtPath, { recursive: true });

	try {
		console.log(`==> Copying workspace archive from ${containerName}...`);
		execSync(
			`docker cp ${containerName}:/tmp/antigravity-backup/workspace.tar.gz ${localTarPath}`,
			{ stdio: "ignore" },
		);

		console.log(`==> Extracting workspace archive locally...`);
		execSync(`tar -xzf ${localTarPath} -C ${localExtPath}`, {
			stdio: "ignore",
		});

		// Read and list files recursively
		console.log(
			`----------------------------------------------------------------------`,
		);
		console.log("Workspace contents:");
		listDirRecursive(localExtPath, localExtPath);
		console.log(
			`----------------------------------------------------------------------`,
		);
	} catch (err) {
		console.error(
			"Failed to copy or extract workspace archive. Make sure docker is running and pod completed successfully:",
			err,
		);
	}
}

function listDirRecursive(dir: string, baseDir: string) {
	const items = fs.readdirSync(dir);
	for (const item of items) {
		const fullPath = path.join(dir, item);
		const relativePath = path.relative(baseDir, fullPath);
		const stat = fs.statSync(fullPath);
		if (stat.isDirectory()) {
			console.log(`[DIR]  /${relativePath}`);
			listDirRecursive(fullPath, baseDir);
		} else {
			console.log(`[FILE] /${relativePath} (${stat.size} bytes)`);
			// Print contents of text files
			if (
				item.endsWith(".txt") ||
				item.endsWith(".json") ||
				item.endsWith(".sh") ||
				item.endsWith("antigravity")
			) {
				try {
					const content = fs.readFileSync(fullPath, "utf8");
					console.log(`  --- Content of /${relativePath} ---`);
					const lines = content.trim().split("\n");
					for (const line of lines) {
						console.log(`  | ${line}`);
					}
					console.log("  -----------------------------------");
				} catch (e) {
					console.log(`  | <failed to read file content: ${e}>`);
				}
			}
		}
	}
}

main().catch((err) => {
	console.error("Execution failed:", err);
	process.exit(1);
});
