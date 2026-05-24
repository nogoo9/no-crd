import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

async function main() {
	process.env.MCP_NO_DAEMON = "1";
	const workspaceRoot = process.cwd();
	const configPath = join(workspaceRoot, "mcp_servers.json");

	console.log("Cleaning up any existing test resources...");
	try {
		await $`kubectl delete pods -l 'nogoo9/type=workspace' -n nogoo9 --ignore-not-found`;
		await $`kubectl delete configmaps -l 'nogoo9/test-lifecycle=true' -n nogoo9 --ignore-not-found`;
	} catch (err) {
		console.warn("Failed to perform initial cleanup:", err);
	}

	console.log("Building MCP Server for Node target...");
	await $`bun run build`;

	// Write temporary config file for mcp-cli to resolve
	const config = {
		mcpServers: {
			nogoo9: {
				command: "node",
				args: [join(workspaceRoot, "dist/index.js")],
				env: {
					...process.env,
					TRANSPORT: "stdio",
					NODE_TLS_REJECT_UNAUTHORIZED: "0",
				},
			},
		},
	};

	console.log(`Writing temporary config to ${configPath}...`);
	writeFileSync(configPath, JSON.stringify(config, null, 2));

	const templateName = `test-cli-template-${Date.now()}`;
	const workspaceId = `test-cli-ws-${Date.now()}`;

	try {
		console.log("\n[1/5] Listing tools via mcp-cli...");
		const listOut = await $`bunx github:nogoo9/mcp-cli`.text();
		console.log("Tools listed:\n", listOut);

		console.log(`\n[2/5] Creating template ${templateName} via mcp-cli...`);
		const createTemplateArgs = {
			name: templateName,
			namespace: "nogoo9",
			description: "Test template via mcp-cli",
			tag: "test",
			labels: {
				"nogoo9/test-lifecycle": "true",
			},
			annotations: {
				"nogoo9/required-context": "ECHO_TEXT",
			},
			spec: {
				containers: [
					{
						name: "agent",
						image: "nogoo9-registry.localhost:5001/bun:latest",
						command: [
							"/bin/sh",
							"-c",
							"bun -e \"Bun.serve({ port: 5678, fetch(req) { return new Response(process.env.ECHO_TEXT || 'hello'); } });\"",
						],
					},
				],
			},
		};

		const createOut =
			await $`bunx github:nogoo9/mcp-cli call nogoo9 create_template ${JSON.stringify(createTemplateArgs)}`.text();
		console.log("Create template response:\n", createOut);

		console.log(`\n[3/5] Spawning workspace ${workspaceId} via mcp-cli...`);
		const spawnArgs = {
			id: workspaceId,
			templateRef: `nogoo9/${templateName}`,
			namespace: "nogoo9",
			context: {
				ECHO_TEXT: "hello-from-mcp-cli",
			},
		};

		const spawnOut =
			await $`bunx github:nogoo9/mcp-cli call nogoo9 spawn_workspace ${JSON.stringify(spawnArgs)}`.text();
		console.log("Spawn response:\n", spawnOut);

		console.log("\n[4/5] Waiting for pod to become ready & verifying...");
		await new Promise((r) => setTimeout(r, 2000));
		await $`kubectl wait --for=condition=ready pod -l nogoo9/workspace-id=${workspaceId} -n nogoo9 --timeout=120s`;

		const getPodOut =
			await $`kubectl get pod -l nogoo9/workspace-id=${workspaceId} -n nogoo9 -o jsonpath='{.items[0].metadata.name}'`.text();
		const podName = getPodOut.trim();
		console.log(`Pod is ready: ${podName}`);

		const response =
			await $`kubectl exec -n nogoo9 ${podName} -c agent -- wget -qO- http://127.0.0.1:5678`.text();
		const trimmedResponse = response.trim();
		console.log(`Response received from pod: "${trimmedResponse}"`);
		if (trimmedResponse !== "hello-from-mcp-cli") {
			throw new Error(`Unexpected response from pod: "${trimmedResponse}"`);
		}
		console.log("✅ Pod response successfully verified.");

		console.log(`\n[5/5] Stopping workspace ${workspaceId} via mcp-cli...`);
		const stopArgs = {
			id: workspaceId,
			namespace: "nogoo9",
		};
		const stopOut =
			await $`bunx github:nogoo9/mcp-cli call nogoo9 stop_workspace ${JSON.stringify(stopArgs)}`.text();
		console.log("Stop response:\n", stopOut);

		console.log("Waiting for pod deletion...");
		await $`kubectl wait --for=delete pod/${podName} -n nogoo9 --timeout=120s`;

		console.log("\n✅ ALL TESTS PASSED!");
	} catch (err) {
		console.error("\n❌ TEST FAILED:", err);
		process.exitCode = 1;
	} finally {
		console.log("\nCleaning up...");
		try {
			const deleteTemplateArgs = {
				name: templateName,
				namespace: "nogoo9",
			};
			await $`bunx github:nogoo9/mcp-cli call nogoo9 delete_template ${JSON.stringify(deleteTemplateArgs)}`;
		} catch {}
		try {
			unlinkSync(configPath);
			console.log("Temporary config file deleted.");
		} catch {}
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
