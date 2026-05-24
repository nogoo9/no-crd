import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { $ } from "bun";

async function main() {
	console.log("Cleaning up any existing test resources...");
	try {
		await $`kubectl delete pods -l 'nogoo9/type=workspace' -n nogoo9 --ignore-not-found`;
		await $`kubectl delete configmaps -l 'nogoo9/test-lifecycle=true' -n nogoo9 --ignore-not-found`;
	} catch (err) {
		console.warn("Failed to perform initial cleanup:", err);
	}

	console.log("Building MCP Server for Node target...");
	await $`bun build src/index.ts --outfile dist/index.js --target node --minify`;

	console.log("Starting MCP Server via stdio...");
	const transport = new StdioClientTransport({
		command: "node",
		args: ["dist/index.js"],
		env: {
			...process.env,
			TRANSPORT: "stdio",
			NODE_TLS_REJECT_UNAUTHORIZED: "0",
		},
	});

	const client = new Client(
		{ name: "test-client", version: "1.0.0" },
		{ capabilities: {} },
	);

	await client.connect(transport);
	console.log("Connected to MCP Server.");

	const workspaceId = `test-${Date.now()}`;
	const templateName = `test-template-${Date.now()}`;
	const inlineWorkspaceId = `test-inline-${Date.now()}`;
	console.log(
		`\n==> Testing Workspace Lifecycle: ${workspaceId} using template: ${templateName}`,
	);

	try {
		console.log(`\n[1/6] Publishing test template ${templateName}...`);
		const createTemplateResult = await client.callTool({
			name: "create_template",
			arguments: {
				name: templateName,
				namespace: "nogoo9",
				description: "Test agent workspace template with S3 folder sync",
				tag: "test",
				labels: {
					"nogoo9/test-lifecycle": "true",
				},
				annotations: {
					"nogoo9/required-context":
						"AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_ENDPOINT_URL,S3_BUCKET,S3_FOLDER",
					"nogoo9/init-image":
						"nogoo9-registry.localhost:5001/amazon/aws-cli:latest",
					"nogoo9/init-command":
						"aws s3 mb s3://$S3_BUCKET --endpoint-url $AWS_ENDPOINT_URL 2>/dev/null || true && aws s3 sync s3://$S3_BUCKET/$S3_FOLDER /workspace --endpoint-url $AWS_ENDPOINT_URL",
					"nogoo9/pre-stop-command":
						"aws s3 sync /workspace s3://$S3_BUCKET/$S3_FOLDER --endpoint-url $AWS_ENDPOINT_URL",
					"nogoo9/pre-stop-sidecar-image":
						"nogoo9-registry.localhost:5001/amazon/aws-cli:latest",
					"nogoo9/default-grace-period": "10",
				},
				spec: {
					containers: [
						{
							name: "agent",
							image: "nogoo9-registry.localhost:5001/bun:latest",
							command: [
								"/bin/sh",
								"-c",
								"bun -e \"Bun.serve({ port: 5678, fetch(req) { const text = process.env.ECHO_TEXT || 'hello'; console.log(new Date().toISOString() + ' Request received'); return new Response(text); } }); console.log('Listening on :5678');\" > /workspace/echo.log 2>&1",
							],
							volumeMounts: [{ name: "workspace", mountPath: "/workspace" }],
						},
					],
					volumes: [{ name: "workspace", emptyDir: {} }],
				},
			},
		});
		console.log(
			"Create template result:",
			(createTemplateResult.content as any)?.[0],
		);

		console.log(`\n[2/6] Spawning workspace ${workspaceId}...`);
		const artifactText = `hello-from-http-echo-server-${workspaceId}`;
		const spawnResult = await client.callTool({
			name: "spawn_workspace",
			arguments: {
				id: workspaceId,
				templateRef: `nogoo9/${templateName}`,
				namespace: "nogoo9",
				context: {
					AWS_ACCESS_KEY_ID: "test-access-key",
					AWS_SECRET_ACCESS_KEY: "test-secret-key",
					AWS_ENDPOINT_URL: "http://rustfs.nogoo9.svc.cluster.local:80",
					S3_BUCKET: "nogoo9-test-bucket",
					S3_FOLDER: workspaceId,
					ECHO_TEXT: artifactText,
				},
			},
		});
		console.log("Spawn result:", (spawnResult.content as any)?.[0]);

		console.log(`\n[3/6] Waiting for pod to become ready...`);
		await new Promise((r) => setTimeout(r, 2000));
		await $`kubectl wait --for=condition=ready pod -l nogoo9/workspace-id=${workspaceId} -n nogoo9 --timeout=120s`;

		const getPodOut =
			await $`kubectl get pod -l nogoo9/workspace-id=${workspaceId} -n nogoo9 -o jsonpath='{.items[0].metadata.name}'`.text();
		const podName = getPodOut.trim();
		console.log(`Pod is ready: ${podName}`);

		console.log(`\n[4/6] Querying HTTP Echo Server...`);
		const response =
			await $`kubectl exec -n nogoo9 ${podName} -c agent -- wget -qO- http://127.0.0.1:5678`.text();
		const trimmedResponse = response.trim();
		console.log(`HTTP Response received: "${trimmedResponse}"`);
		if (trimmedResponse !== artifactText) {
			console.error(`❌ FAILURE: HTTP Echo server returned incorrect text!`);
			console.error(`   Expected: "${artifactText}"`);
			console.error(`   Found:    "${trimmedResponse}"`);
			process.exit(1);
		}
		console.log("✅ HTTP Echo server response verified.");

		console.log(`\n[5/6] Stopping workspace ${workspaceId}...`);
		const stopResult = await client.callTool({
			name: "stop_workspace",
			arguments: {
				id: workspaceId,
				namespace: "nogoo9",
			},
		});
		console.log("Stop result:", (stopResult.content as any)?.[0]);

		console.log(
			"Waiting for pod to terminate completely (allows preStop to finish syncing)...",
		);
		await $`kubectl wait --for=delete pod/${podName} -n nogoo9 --timeout=120s`;

		console.log(`\n[6/6] Checking RustFS for the synced echo log...`);
		const s3Url = `s3://nogoo9-test-bucket/${workspaceId}/echo.log`;
		const logContent =
			await $`kubectl run aws-cli-check-${workspaceId} --rm -i --image=nogoo9-registry.localhost:5001/amazon/aws-cli:latest -n nogoo9 --restart=Never --env AWS_ACCESS_KEY_ID=test-access-key --env AWS_SECRET_ACCESS_KEY=test-secret-key --env AWS_ENDPOINT_URL=http://rustfs.nogoo9.svc.cluster.local:80 -- s3 cp ${s3Url} -`.text();

		const trimmedLog = logContent.trim();
		console.log(`Downloaded Log Content:\n${trimmedLog}`);

		if (
			trimmedLog.includes("Listening on :5678") &&
			trimmedLog.includes("Request received")
		) {
			console.log(
				`\n✅ SUCCESS: Echo server logs were successfully synced to S3 on shutdown!`,
			);
		} else {
			console.error(`\n❌ FAILURE: Missing expected log lines in S3 log file`);
			process.exit(1);
		}

		// ────────────────────────────────────────────────────────────────────────
		// Sequence 2: Spawn Workspace with inline Spec (no Template Ref)
		// ────────────────────────────────────────────────────────────────────────
		console.log(
			`\n==> Testing Inline Workspace Lifecycle (No Template Ref): ${inlineWorkspaceId}`,
		);

		console.log(`\n[1/5] Spawning inline workspace ${inlineWorkspaceId}...`);
		const inlineArtifactText = `hello-from-inline-echo-server-${inlineWorkspaceId}`;
		const inlineSpawnResult = await client.callTool({
			name: "spawn_workspace",
			arguments: {
				id: inlineWorkspaceId,
				namespace: "nogoo9",
				annotations: {
					"nogoo9/required-context":
						"AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_ENDPOINT_URL,S3_BUCKET,S3_FOLDER",
					"nogoo9/init-image":
						"nogoo9-registry.localhost:5001/amazon/aws-cli:latest",
					"nogoo9/init-command":
						"aws s3 mb s3://$S3_BUCKET --endpoint-url $AWS_ENDPOINT_URL 2>/dev/null || true && aws s3 sync s3://$S3_BUCKET/$S3_FOLDER /workspace --endpoint-url $AWS_ENDPOINT_URL",
					"nogoo9/pre-stop-command":
						"aws s3 sync /workspace s3://$S3_BUCKET/$S3_FOLDER --endpoint-url $AWS_ENDPOINT_URL",
					"nogoo9/pre-stop-sidecar-image":
						"nogoo9-registry.localhost:5001/amazon/aws-cli:latest",
					"nogoo9/default-grace-period": "10",
				},
				spec: {
					containers: [
						{
							name: "agent",
							image: "nogoo9-registry.localhost:5001/bun:latest",
							command: [
								"/bin/sh",
								"-c",
								"bun -e \"Bun.serve({ port: 5678, fetch(req) { const text = process.env.ECHO_TEXT || 'hello'; console.log(new Date().toISOString() + ' Request received'); return new Response(text); } }); console.log('Listening on :5678');\" > /workspace/echo.log 2>&1",
							],
							volumeMounts: [{ name: "workspace", mountPath: "/workspace" }],
						},
					],
					volumes: [{ name: "workspace", emptyDir: {} }],
				},
				context: {
					AWS_ACCESS_KEY_ID: "test-access-key",
					AWS_SECRET_ACCESS_KEY: "test-secret-key",
					AWS_ENDPOINT_URL: "http://rustfs.nogoo9.svc.cluster.local:80",
					S3_BUCKET: "nogoo9-test-bucket",
					S3_FOLDER: inlineWorkspaceId,
					ECHO_TEXT: inlineArtifactText,
				},
			},
		});
		console.log(
			"Inline spawn result:",
			(inlineSpawnResult.content as any)?.[0],
		);

		console.log(`\n[2/5] Waiting for inline pod to become ready...`);
		await new Promise((r) => setTimeout(r, 2000));
		await $`kubectl wait --for=condition=ready pod -l nogoo9/workspace-id=${inlineWorkspaceId} -n nogoo9 --timeout=120s`;

		const getInlinePodOut =
			await $`kubectl get pod -l nogoo9/workspace-id=${inlineWorkspaceId} -n nogoo9 -o jsonpath='{.items[0].metadata.name}'`.text();
		const inlinePodName = getInlinePodOut.trim();
		console.log(`Inline pod is ready: ${inlinePodName}`);

		console.log(`\n[3/5] Querying Inline HTTP Echo Server...`);
		const inlineResponse =
			await $`kubectl exec -n nogoo9 ${inlinePodName} -c agent -- wget -qO- http://127.0.0.1:5678`.text();
		const trimmedInlineResponse = inlineResponse.trim();
		console.log(`Inline HTTP Response received: "${trimmedInlineResponse}"`);
		if (trimmedInlineResponse !== inlineArtifactText) {
			console.error(
				`❌ FAILURE: Inline HTTP Echo server returned incorrect text!`,
			);
			console.error(`   Expected: "${inlineArtifactText}"`);
			console.error(`   Found:    "${trimmedInlineResponse}"`);
			process.exit(1);
		}
		console.log("✅ Inline HTTP Echo server response verified.");

		console.log(`\n[4/5] Stopping inline workspace ${inlineWorkspaceId}...`);
		const inlineStopResult = await client.callTool({
			name: "stop_workspace",
			arguments: {
				id: inlineWorkspaceId,
				namespace: "nogoo9",
			},
		});
		console.log("Inline stop result:", (inlineStopResult.content as any)?.[0]);

		console.log(
			"Waiting for inline pod to terminate completely (allows preStop to finish syncing)...",
		);
		await $`kubectl wait --for=delete pod/${inlinePodName} -n nogoo9 --timeout=120s`;

		console.log(`\n[5/5] Checking RustFS for the synced inline echo log...`);
		const inlineS3Url = `s3://nogoo9-test-bucket/${inlineWorkspaceId}/echo.log`;
		const inlineLogContent =
			await $`kubectl run aws-cli-check-${inlineWorkspaceId} --rm -i --image=nogoo9-registry.localhost:5001/amazon/aws-cli:latest -n nogoo9 --restart=Never --env AWS_ACCESS_KEY_ID=test-access-key --env AWS_SECRET_ACCESS_KEY=test-secret-key --env AWS_ENDPOINT_URL=http://rustfs.nogoo9.svc.cluster.local:80 -- s3 cp ${inlineS3Url} -`.text();

		const trimmedInlineLog = inlineLogContent.trim();
		console.log(`Downloaded Inline Log Content:\n${trimmedInlineLog}`);

		if (
			trimmedInlineLog.includes("Listening on :5678") &&
			trimmedInlineLog.includes("Request received")
		) {
			console.log(
				`\n✅ SUCCESS: Inline echo server logs were successfully synced to S3 on shutdown!`,
			);
		} else {
			console.error(
				`\n❌ FAILURE: Missing expected log lines in Inline S3 log file`,
			);
			process.exit(1);
		}
	} catch (err) {
		console.error("\n❌ ERROR:", err);
		process.exit(1);
	} finally {
		console.log("\nCleaning up...");
		try {
			await client.callTool({
				name: "stop_workspace",
				arguments: { id: workspaceId, namespace: "nogoo9" },
			});
		} catch {}
		try {
			await client.callTool({
				name: "stop_workspace",
				arguments: { id: inlineWorkspaceId, namespace: "nogoo9" },
			});
		} catch {}
		try {
			await client.callTool({
				name: "delete_template",
				arguments: { name: templateName, namespace: "nogoo9" },
			});
		} catch {}
		await transport.close();
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
