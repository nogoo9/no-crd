import { execFileSync } from "node:child_process";

const BASE_URL = "http://localhost:8080/nocr";
const TOKEN_URL =
	"http://localhost:8080/auth/realms/nogoo9/protocol/openid-connect/token";

function runKubectl(args: string[]): string {
	try {
		return execFileSync("kubectl", args, {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch (err: any) {
		throw new Error(
			`kubectl command failed: kubectl ${args.join(" ")}\nError: ${err.stderr || err.message}`,
		);
	}
}

function runKubectlJson(args: string[]): any {
	const output = runKubectl([...args, "-o", "json"]);
	return JSON.parse(output);
}

async function fetchToken(username: string): Promise<string> {
	const body = new URLSearchParams({
		client_id: "nogoo9-mcp",
		username,
		password: "password",
		grant_type: "password",
		scope: "openid mcp:read mcp:write nogoo9:admin",
	});

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to fetch token for ${username}: ${text}`);
	}

	const data = (await response.json()) as any;
	return data.access_token;
}

async function makeMcpCall(token: string, method: string, params: any) {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json, text/event-stream",
		Authorization: `Bearer ${token}`,
	};

	// 1. Initialize
	const initResponse = await fetch(`${BASE_URL}/mcp`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			jsonrpc: "2.0",
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "e2e-upgrade-test", version: "1.0" },
			},
			id: 1,
		}),
	});

	if (!initResponse.ok) {
		return {
			status: initResponse.status,
			headers: initResponse.headers,
			error: await initResponse.text(),
		};
	}

	// 2. Call tool
	const callResponse = await fetch(`${BASE_URL}/mcp`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			jsonrpc: "2.0",
			method,
			params,
			id: 2,
		}),
	});

	const text = await callResponse.text();
	let json: any = null;
	try {
		json = JSON.parse(text);
	} catch {}

	return {
		status: callResponse.status,
		headers: callResponse.headers,
		data: json || text,
	};
}

async function main() {
	console.log("=== Starting E2E Workspace Upgrade Validation ===");

	const ns = "nogoo9";
	const workspaceId = "upgrade-e2e-ws";

	// 1. Fetch Admin Token
	const token = await fetchToken("admin");
	console.log("✅ Obtained admin token from Keycloak.");

	// 2. Clean up any existing test resources
	console.log("Cleaning up potential leftover resources...");
	try {
		runKubectl([
			"delete",
			"pod",
			"-l",
			`nogoo9/workspace-id=${workspaceId}`,
			"-n",
			ns,
			"--ignore-not-found",
		]);
	} catch (_) {}
	try {
		runKubectl([
			"delete",
			"configmap",
			"workspace-terminal-default",
			"-n",
			ns,
			"--ignore-not-found",
		]);
	} catch (_) {}

	// 3. Spawn Workspace (v1)
	console.log("Spawning initial workspace sandbox (v1)...");
	const spawnRes = await makeMcpCall(token, "tools/call", {
		name: "spawn_workspace",
		arguments: {
			id: workspaceId,
			templateRef: `${ns}/workspace-terminal-default`,
		},
	});

	if (spawnRes.status !== 200 || spawnRes.data?.result?.isError) {
		console.error("DEBUG spawnRes:", JSON.stringify(spawnRes, null, 2));
		throw new Error(
			`Failed to spawn workspace: ${JSON.stringify(spawnRes.data)}`,
		);
	}

	const initialPodName = spawnRes.data.result.structuredContent.podName;
	console.log(`✅ Spawned initial pod: ${initialPodName}`);

	// 4. Wait for pod to be running
	console.log("Waiting for initial pod to reach Running phase...");
	let podRunning = false;
	for (let i = 0; i < 60; i++) {
		try {
			const pod = runKubectlJson(["get", "pod", initialPodName, "-n", ns]);
			const phase = pod.status?.phase;
			const podIP = pod.status?.podIP;
			if (phase === "Running" && podIP) {
				podRunning = true;
				break;
			}
		} catch (_) {}
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
	if (!podRunning) {
		throw new Error("Initial pod failed to reach Running state.");
	}
	console.log("✅ Initial pod is running.");

	// 5. Setup ConfigMap Template version 2.0.0
	console.log("Registering template version 2.0.0 in ConfigMap...");
	const templateCM = {
		apiVersion: "v1",
		kind: "ConfigMap",
		metadata: {
			name: "workspace-terminal-default",
			namespace: ns,
			annotations: {
				"nogoo9/template-version": "2.0.0",
			},
			labels: {
				"nogoo9/pod-template": "true",
			},
		},
		data: {
			spec: JSON.stringify({
				containers: [
					{
						name: "agent",
						image: "tsl0922/ttyd:latest",
						command: ["ttyd", "-W", "-p", "7681", "/bin/sh"],
						env: [{ name: "UPGRADED_MARKER", value: "true" }],
						volumeMounts: [{ name: "workspace", mountPath: "/workspace" }],
					},
				],
				volumes: [{ name: "workspace", emptyDir: {} }],
			}),
		},
	};

	const cmYaml = JSON.stringify(templateCM);
	try {
		execFileSync("kubectl", ["apply", "-f", "-"], {
			input: cmYaml,
			stdio: ["pipe", "ignore", "pipe"],
		});
	} catch (err: any) {
		throw new Error(
			`Failed to create ConfigMap template: ${err.stderr || err.message}`,
		);
	}
	console.log("✅ Template ConfigMap created successfully.");

	// 6. Verify Workspace is listed as Outdated
	console.log("Checking list_workspaces for outdated status...");
	const listRes = await makeMcpCall(token, "tools/call", {
		name: "list_workspaces",
		arguments: {},
	});
	const workspaces = listRes.data.result.structuredContent.workspaces;
	const myWs = workspaces.find((w: any) => w.id === workspaceId);
	if (!myWs?.isOutdated) {
		throw new Error(
			`Workspace should be outdated. Got: ${JSON.stringify(myWs)}`,
		);
	}
	console.log("✅ Workspace recognized as outdated (v1.0.0 vs v2.0.0).");

	// 7. Trigger Upgrade (non-blocking)
	console.log("Triggering workspace upgrade...");
	const upgradeRes = await makeMcpCall(token, "tools/call", {
		name: "upgrade_workspace",
		arguments: {
			id: workspaceId,
		},
	});

	if (upgradeRes.status !== 200 || upgradeRes.data?.result?.isError) {
		throw new Error(
			`Failed to trigger upgrade: ${JSON.stringify(upgradeRes.data)}`,
		);
	}

	const upgradeStatus = upgradeRes.data.result.structuredContent.status;
	const upgradedPodName = upgradeRes.data.result.structuredContent.podName;
	console.log(
		`✅ Upgrade triggered. Status: ${upgradeStatus}, New Pod: ${upgradedPodName}`,
	);

	if (upgradeStatus !== "upgrading") {
		throw new Error(`Expected status to be "upgrading", got: ${upgradeStatus}`);
	}
	if (upgradedPodName === initialPodName) {
		throw new Error("Expected a unique pod name for side-by-side upgrade.");
	}

	// 8. Verify transition status
	console.log("Verifying workspace list status during upgrade...");
	const listDuringRes = await makeMcpCall(token, "tools/call", {
		name: "list_workspaces",
		arguments: {},
	});
	const transitioningWs =
		listDuringRes.data.result.structuredContent.workspaces.find(
			(w: any) => w.id === workspaceId,
		);
	console.log(`  Workspace status: ${transitioningWs?.status}`);
	if (transitioningWs?.status !== "Upgrading") {
		throw new Error(
			`Expected status to be "Upgrading" during transition, got: ${transitioningWs?.status}`,
		);
	}

	// 9. Wait for new pod to be running
	console.log("Waiting for new pod to reach Running phase...");
	let upgradedPodRunning = false;
	for (let i = 0; i < 60; i++) {
		try {
			const pod = runKubectlJson(["get", "pod", upgradedPodName, "-n", ns]);
			const phase = pod.status?.phase;
			const podIP = pod.status?.podIP;
			if (phase === "Running" && podIP) {
				upgradedPodRunning = true;
				break;
			}
		} catch (_) {}
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
	if (!upgradedPodRunning) {
		throw new Error("Upgraded pod failed to reach Running state.");
	}
	console.log("✅ Upgraded pod is running.");

	// 10. Wait for dynamic cleanup of old pod
	console.log(
		"Waiting for old pod to be deleted and status to restore to Running...",
	);
	let upgradeComplete = false;
	for (let i = 0; i < 30; i++) {
		const listFinalRes = await makeMcpCall(token, "tools/call", {
			name: "list_workspaces",
			arguments: {},
		});
		const finalWs = listFinalRes.data.result.structuredContent.workspaces.find(
			(w: any) => w.id === workspaceId,
		);
		console.log(`  Current status: ${finalWs?.status}`);
		if (finalWs?.status === "Running") {
			upgradeComplete = true;
			break;
		}
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
	if (!upgradeComplete) {
		throw new Error("Upgrade cleanup did not complete within timeout.");
	}

	// 11. Verify old pod is deleted in Kubernetes
	console.log("Verifying old pod is deleted from Kubernetes...");
	let oldPodDeleted = false;
	for (let i = 0; i < 30; i++) {
		try {
			runKubectlJson(["get", "pod", initialPodName, "-n", ns]);
		} catch (e: any) {
			if (e.message.includes("NotFound") || e.message.includes("not found")) {
				oldPodDeleted = true;
				break;
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	if (!oldPodDeleted) {
		throw new Error("Old pod was not deleted from Kubernetes within 30s!");
	}
	console.log("✅ Old pod successfully deleted from Kubernetes.");

	// 12. Verify new pod is active and contains upgraded configuration (env UPGRADED_MARKER)
	const activePod = runKubectlJson(["get", "pod", upgradedPodName, "-n", ns]);
	const hasMarker = activePod.spec?.containers?.[0]?.env?.some(
		(e: any) => e.name === "UPGRADED_MARKER" && e.value === "true",
	);
	if (!hasMarker) {
		throw new Error(
			"Upgraded pod is missing the new template environment variables.",
		);
	}
	console.log("✅ Upgraded pod configuration verified successfully.");

	// 13. Cleanup E2E test resources
	console.log("Cleaning up E2E test resources...");
	try {
		runKubectl(["delete", "pod", upgradedPodName, "-n", ns]);
	} catch (_) {}
	try {
		runKubectl(["delete", "configmap", "workspace-terminal-default", "-n", ns]);
	} catch (_) {}

	console.log("🎉 E2E Upgrade Validation Passed Successfully!");
}

main().catch((err) => {
	console.error("❌ E2E Upgrade Validation Failed:", err);
	process.exit(1);
});
