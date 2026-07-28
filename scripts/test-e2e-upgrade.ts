import { execFileSync } from "node:child_process";

const BASE_URL = "http://localhost:8080/nocr";
const TOKEN_URL =
	"http://localhost:8080/auth/realms/nogoo9/protocol/openid-connect/token";
const NS = "nogoo9";

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
		scope:
			username === "admin"
				? "openid mcp:read mcp:write nogoo9:admin"
				: "openid mcp:read mcp:write",
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

async function waitForPodRunning(
	podName: string,
	timeoutSec = 60,
): Promise<boolean> {
	for (let i = 0; i < timeoutSec; i++) {
		try {
			const pod = runKubectlJson(["get", "pod", podName, "-n", NS]);
			const phase = pod.status?.phase;
			const podIP = pod.status?.podIP;
			if (phase === "Running" && podIP) {
				return true;
			}
		} catch (_) {}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	return false;
}

async function waitForPodDeleted(
	podName: string,
	timeoutSec = 30,
): Promise<boolean> {
	for (let i = 0; i < timeoutSec; i++) {
		try {
			runKubectlJson(["get", "pod", podName, "-n", NS]);
		} catch (err: any) {
			if (
				err.message.includes("NotFound") ||
				err.message.includes("not found")
			) {
				return true;
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	return false;
}

async function waitForWorkspaceRunning(
	token: string,
	wsId: string,
	timeoutSec = 60,
): Promise<any> {
	for (let i = 0; i < timeoutSec; i++) {
		const listRes = await makeMcpCall(token, "tools/call", {
			name: "list_workspaces",
			arguments: {},
		});
		const workspaces =
			listRes.data?.result?.structuredContent?.workspaces || [];
		const ws = workspaces.find((w: any) => w.id === wsId);
		if (ws && ws.status === "Running") {
			return ws;
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	throw new Error(
		`Workspace ${wsId} did not reach Running state within ${timeoutSec}s`,
	);
}

function verifyPodHasUpgradedMarker(podName: string): void {
	const pod = runKubectlJson(["get", "pod", podName, "-n", NS]);
	const envVars = pod.spec?.containers?.[0]?.env || [];
	const hasMarker = envVars.some(
		(e: any) => e.name === "UPGRADED_MARKER" && e.value === "true",
	);
	if (!hasMarker) {
		throw new Error(
			`Pod ${podName} is missing upgraded template environment variable (UPGRADED_MARKER=true)`,
		);
	}
}

async function main() {
	console.log("=== Starting Multi-User E2E Workspace Upgrade Validation ===");

	const wsUserA1 = "ws-user-a-1";
	const wsUserA2 = "ws-user-a-2";
	const wsUserB1 = "ws-user-b-1";
	const wsAdmin1 = "ws-admin-1";

	// 1. Fetch Tokens for different users
	console.log(
		"1. Fetching Keycloak tokens for writeuser, readuser, and admin...",
	);
	const adminToken = await fetchToken("admin");
	const writeToken = await fetchToken("writeuser");
	const readToken = await fetchToken("readuser");
	console.log("✅ Obtained tokens for all test users.");

	// 2. Cleanup leftover test resources
	console.log("2. Cleaning up any leftover test pods and ConfigMaps...");
	const testWsIds = [wsUserA1, wsUserA2, wsUserB1, wsAdmin1];
	for (const id of testWsIds) {
		try {
			runKubectl([
				"delete",
				"pod",
				"-l",
				`nogoo9/workspace-id=${id}`,
				"-n",
				NS,
				"--ignore-not-found",
			]);
		} catch (_) {}
	}
	try {
		runKubectl([
			"delete",
			"configmap",
			"workspace-terminal-default",
			"-n",
			NS,
			"--ignore-not-found",
		]);
	} catch (_) {}

	// 3. Spawn Workspaces for multi-user topology
	console.log("3. Spawning multi-user workspaces...");

	// User A (writeuser) spawns ws-user-a-1 and ws-user-a-2
	console.log("   - Spawning ws-user-a-1 (owner: writeuser)...");
	const spawnA1 = await makeMcpCall(writeToken, "tools/call", {
		name: "spawn_workspace",
		arguments: {
			id: wsUserA1,
			templateRef: `${NS}/workspace-terminal-default`,
		},
	});
	if (spawnA1.data?.result?.isError) {
		throw new Error(
			`Failed to spawn ${wsUserA1}: ${JSON.stringify(spawnA1.data)}`,
		);
	}
	const podA1Name = spawnA1.data.result.structuredContent.podName;

	console.log("   - Spawning ws-user-a-2 (owner: writeuser)...");
	const spawnA2 = await makeMcpCall(writeToken, "tools/call", {
		name: "spawn_workspace",
		arguments: {
			id: wsUserA2,
			templateRef: `${NS}/workspace-terminal-default`,
		},
	});
	if (spawnA2.data?.result?.isError) {
		throw new Error(
			`Failed to spawn ${wsUserA2}: ${JSON.stringify(spawnA2.data)}`,
		);
	}
	const podA2Name = spawnA2.data.result.structuredContent.podName;

	// User B (readuser) spawns ws-user-b-1
	console.log("   - Spawning ws-user-b-1 (owner: readuser)...");
	const spawnB1 = await makeMcpCall(readToken, "tools/call", {
		name: "spawn_workspace",
		arguments: {
			id: wsUserB1,
			templateRef: `${NS}/workspace-terminal-default`,
		},
	});
	if (spawnB1.data?.result?.isError) {
		throw new Error(
			`Failed to spawn ${wsUserB1}: ${JSON.stringify(spawnB1.data)}`,
		);
	}
	const podB1Name = spawnB1.data.result.structuredContent.podName;

	// Admin spawns ws-admin-1
	console.log("   - Spawning ws-admin-1 (owner: admin)...");
	const spawnAdmin1 = await makeMcpCall(adminToken, "tools/call", {
		name: "spawn_workspace",
		arguments: {
			id: wsAdmin1,
			templateRef: `${NS}/workspace-terminal-default`,
		},
	});
	if (spawnAdmin1.data?.result?.isError) {
		throw new Error(
			`Failed to spawn ${wsAdmin1}: ${JSON.stringify(spawnAdmin1.data)}`,
		);
	}
	const podAdmin1Name = spawnAdmin1.data.result.structuredContent.podName;

	// Wait for all pods to be Running
	console.log("   - Waiting for all initial pods to reach Running state...");
	const initialPods = [podA1Name, podA2Name, podB1Name, podAdmin1Name];
	for (const p of initialPods) {
		const ok = await waitForPodRunning(p, 60);
		if (!ok) throw new Error(`Pod ${p} failed to reach Running state.`);
	}
	console.log("✅ All initial multi-user pods are running.");

	// 4. Register Template ConfigMap version 2.0.0
	console.log("4. Registering template version 2.0.0 in ConfigMap...");
	const templateCM = {
		apiVersion: "v1",
		kind: "ConfigMap",
		metadata: {
			name: "workspace-terminal-default",
			namespace: NS,
			annotations: { "nogoo9/template-version": "2.0.0" },
			labels: { "nogoo9/pod-template": "true" },
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
	execFileSync("kubectl", ["apply", "-f", "-"], {
		input: JSON.stringify(templateCM),
		stdio: ["pipe", "ignore", "pipe"],
	});
	console.log("✅ Template ConfigMap updated to version 2.0.0.");

	// 5. TEST ASSERTION 1: Normal user (writeuser) attempting upgrade_all_workspaces is REJECTED
	console.log(
		"5. Testing upgrade_all_workspaces restriction for normal user (writeuser)...",
	);
	const upgradeAllNonAdminRes = await makeMcpCall(writeToken, "tools/call", {
		name: "upgrade_all_workspaces",
		arguments: {},
	});
	const isErr1 = upgradeAllNonAdminRes.data?.result?.isError;
	const errMsg1 = upgradeAllNonAdminRes.data?.result?.message || "";
	if (!isErr1 || !errMsg1.includes("Forbidden")) {
		throw new Error(
			`Expected upgrade_all_workspaces by non-admin to be Forbidden. Got: ${JSON.stringify(upgradeAllNonAdminRes.data)}`,
		);
	}
	console.log(
		"✅ Non-admin upgrade_all_workspaces correctly rejected with Forbidden error.",
	);

	// 6. TEST ASSERTION 2: Normal user (writeuser) attempting to upgrade another user's workspace (ws-user-b-1) is REJECTED
	console.log(
		"6. Testing cross-user upgrade restriction for normal user (writeuser on ws-user-b-1)...",
	);
	const crossUserUpgradeRes = await makeMcpCall(writeToken, "tools/call", {
		name: "upgrade_workspace",
		arguments: { id: wsUserB1 },
	});
	const isErr2 = crossUserUpgradeRes.data?.result?.isError;
	const errMsg2 = crossUserUpgradeRes.data?.result?.message || "";
	if (!isErr2 || !errMsg2.includes("access denied")) {
		throw new Error(
			`Expected cross-user upgrade by non-admin to fail with access denied. Got: ${JSON.stringify(crossUserUpgradeRes.data)}`,
		);
	}
	console.log(
		"✅ Cross-user upgrade by non-admin correctly rejected with Access Denied error.",
	);

	// 7. TEST ASSERTION 3: Normal user (writeuser) upgrading own workspace (ws-user-a-1) 1-by-1 SUCCEEDS & COMPLETES
	console.log(
		"7. Testing normal user upgrading own workspace (ws-user-a-1) 1-by-1 to completion...",
	);
	const upgradeA1Res = await makeMcpCall(writeToken, "tools/call", {
		name: "upgrade_workspace",
		arguments: { id: wsUserA1 },
	});
	if (upgradeA1Res.data?.result?.isError) {
		throw new Error(
			`Failed to upgrade ${wsUserA1}: ${JSON.stringify(upgradeA1Res.data)}`,
		);
	}
	const podA1UpgradedName = upgradeA1Res.data.result.structuredContent.podName;
	console.log(`   - Upgraded pod created: ${podA1UpgradedName}`);

	// Wait for upgraded pod to reach Running state
	const okA1Pod = await waitForPodRunning(podA1UpgradedName, 60);
	if (!okA1Pod)
		throw new Error(
			`Upgraded pod ${podA1UpgradedName} failed to reach Running state.`,
		);

	// Wait for old pod to be cleaned up / deleted from k8s
	console.log(`   - Waiting for old pod ${podA1Name} to be deleted...`);
	const deletedA1Old = await waitForPodDeleted(podA1Name, 30);
	if (!deletedA1Old)
		throw new Error(`Old pod ${podA1Name} was not deleted after upgrade!`);

	// Wait for workspace status to restore to Running
	const finalA1Ws = await waitForWorkspaceRunning(writeToken, wsUserA1, 60);

	// Verify UPGRADED_MARKER in pod spec
	verifyPodHasUpgradedMarker(podA1UpgradedName);

	// Verify Owner and URL stability
	const ownerA1 = finalA1Ws.owner || finalA1Ws.userSub;
	const pathA1 = finalA1Ws.workspacePath || finalA1Ws.previewPath;
	console.log(
		`   - Verified ws-user-a-1 completion: owner=${ownerA1}, path=${pathA1}`,
	);
	if (!ownerA1.includes("writeuser")) {
		throw new Error(
			`Expected owner of ws-user-a-1 to remain writeuser, got: ${ownerA1}`,
		);
	}
	if (pathA1 !== "/") {
		throw new Error(
			`Expected path of ws-user-a-1 to remain '/', got: ${pathA1}`,
		);
	}
	console.log(
		"✅ Normal user 1-by-1 workspace upgrade completed fully; old pod deleted, template upgraded, owner and path preserved.",
	);

	// 8. TEST ASSERTION 4: Admin upgrading another user's workspace (ws-user-b-1) SUCCEEDS & PRESERVES OWNER
	console.log(
		"8. Testing admin upgrading another user's workspace (ws-user-b-1 owned by readuser) to completion...",
	);
	const adminUpgradeB1Res = await makeMcpCall(adminToken, "tools/call", {
		name: "upgrade_workspace",
		arguments: { id: wsUserB1 },
	});
	if (adminUpgradeB1Res.data?.result?.isError) {
		throw new Error(
			`Failed admin upgrade of ${wsUserB1}: ${JSON.stringify(adminUpgradeB1Res.data)}`,
		);
	}
	const podB1UpgradedName =
		adminUpgradeB1Res.data.result.structuredContent.podName;
	console.log(`   - Upgraded pod created by admin: ${podB1UpgradedName}`);

	// Wait for upgraded pod to reach Running state
	const okB1Pod = await waitForPodRunning(podB1UpgradedName, 60);
	if (!okB1Pod)
		throw new Error(
			`Upgraded pod ${podB1UpgradedName} failed to reach Running state.`,
		);

	// Wait for old pod to be cleaned up / deleted from k8s
	console.log(`   - Waiting for old pod ${podB1Name} to be deleted...`);
	const deletedB1Old = await waitForPodDeleted(podB1Name, 30);
	if (!deletedB1Old)
		throw new Error(`Old pod ${podB1Name} was not deleted after upgrade!`);

	// Wait for workspace status to restore to Running
	const finalB1Ws = await waitForWorkspaceRunning(adminToken, wsUserB1, 60);

	// Verify UPGRADED_MARKER in pod spec
	verifyPodHasUpgradedMarker(podB1UpgradedName);

	// CRITICAL ASSERTION: Owner must remain readuser, NOT admin!
	const ownerB1 = finalB1Ws.owner || finalB1Ws.userSub;
	const pathB1 = finalB1Ws.workspacePath || finalB1Ws.previewPath;
	console.log(
		`   - Verified ws-user-b-1 completion: owner=${ownerB1}, path=${pathB1}`,
	);
	if (!ownerB1.includes("readuser")) {
		throw new Error(
			`CRITICAL: Expected owner of ws-user-b-1 to remain readuser after admin upgrade, got: ${ownerB1}`,
		);
	}
	if (ownerB1.includes("admin")) {
		throw new Error(
			`CRITICAL: Owner of ws-user-b-1 mutated to admin after upgrade!`,
		);
	}
	console.log(
		"✅ Admin cross-user workspace upgrade completed fully; old pod deleted, template upgraded, original owner (readuser) PRESERVED.",
	);

	// 9. TEST ASSERTION 5: Admin upgrade_all_workspaces SUCCEEDS & PRESERVES ALL OWNERS
	console.log(
		"9. Testing admin upgrade_all_workspaces for remaining outdated workspaces to completion...",
	);
	const upgradeAllAdminRes = await makeMcpCall(adminToken, "tools/call", {
		name: "upgrade_all_workspaces",
		arguments: {},
	});
	if (upgradeAllAdminRes.data?.result?.isError) {
		throw new Error(
			`Failed upgrade_all_workspaces by admin: ${JSON.stringify(upgradeAllAdminRes.data)}`,
		);
	}
	const upgradedPods =
		upgradeAllAdminRes.data.result.structuredContent.upgradedPods || [];
	console.log(`   - Upgrades triggered for pods:`, upgradedPods);

	const initialOldPodsMap: Record<string, string> = {
		[wsUserA2]: podA2Name,
		[wsAdmin1]: podAdmin1Name,
	};

	for (const item of upgradedPods) {
		const okPod = await waitForPodRunning(item.podName, 60);
		if (!okPod)
			throw new Error(
				`Upgraded pod ${item.podName} failed to reach Running state.`,
			);

		const oldName = initialOldPodsMap[item.id];
		if (oldName) {
			console.log(`   - Waiting for old pod ${oldName} to be deleted...`);
			const deletedOld = await waitForPodDeleted(oldName, 30);
			if (!deletedOld)
				throw new Error(`Old pod ${oldName} was not deleted after upgrade!`);
		}

		await waitForWorkspaceRunning(adminToken, item.id, 60);
		if (testWsIds.includes(item.id)) {
			verifyPodHasUpgradedMarker(item.podName);
		}
	}

	// Verify owners of all workspaces via admin list_workspaces
	const listAllRes = await makeMcpCall(adminToken, "tools/call", {
		name: "list_workspaces",
		arguments: {},
	});
	const allWs = listAllRes.data.result.structuredContent.workspaces;

	const wsA2Final = allWs.find((w: any) => w.id === wsUserA2);
	const wsAdmin1Final = allWs.find((w: any) => w.id === wsAdmin1);

	const wsA2Owner = wsA2Final?.owner || wsA2Final?.userSub || "";
	const wsAdmin1Owner = wsAdmin1Final?.owner || wsAdmin1Final?.userSub || "";

	console.log(`   - ws-user-a-2 final owner: ${wsA2Owner}`);
	console.log(`   - ws-admin-1 final owner: ${wsAdmin1Owner}`);

	if (!wsA2Owner.includes("writeuser")) {
		throw new Error(`Expected ws-user-a-2 owner to remain writeuser`);
	}
	if (!wsAdmin1Owner.includes("admin")) {
		throw new Error(`Expected ws-admin-1 owner to remain admin`);
	}
	console.log(
		"✅ Admin upgrade_all_workspaces completed fully; old pods deleted, templates upgraded, all workspace owners preserved.",
	);

	// 10. TEST ASSERTION 6: PVC Workspace Recreate-Style Upgrade Fallback
	console.log(
		"10. Testing RWO PVC recreate-style upgrade fallback for PVC-mounted workspace...",
	);
	const wsPvcId = "ws-user-pvc-1";
	testWsIds.push(wsPvcId);

	const spawnPvcRes = await makeMcpCall(writeToken, "tools/call", {
		name: "create_pod",
		arguments: {
			name: `ws-writeuser-${wsPvcId}`,
			containers: [
				{
					name: "agent",
					image: "tsl0922/ttyd:latest",
					command: ["ttyd", "-W", "-p", "7681", "/bin/sh"],
				},
			],
			volumes: [
				{
					name: "data",
					persistentVolumeClaim: { claimName: "mock-pvc-claim" },
				},
			],
			labels: {
				"nogoo9/type": "workspace",
				"nogoo9/workspace-id": wsPvcId,
				"nogoo9/user-sub": "writeuser",
				"nogoo9/managed-by": "nogoo9-spawner",
			},
			annotations: {
				"nogoo9/template-ref": `${NS}/workspace-terminal-default`,
				"nogoo9/template-version": "1.0.0",
				"nogoo9/user-sub": "writeuser",
				"nogoo9/workspace-path": "/",
				"nogoo9/workspace-port": "7681",
				"nogoo9/workspace-name": wsPvcId,
			},
		},
	});
	if (spawnPvcRes.data?.result?.isError) {
		throw new Error(
			`Failed to create PVC pod: ${JSON.stringify(spawnPvcRes.data)}`,
		);
	}
	const pvcPodName = spawnPvcRes.data.result.structuredContent.podName;
	await waitForPodRunning(pvcPodName, 60);

	const upgradePvcRes = await makeMcpCall(writeToken, "tools/call", {
		name: "upgrade_workspace",
		arguments: { id: wsPvcId },
	});
	if (upgradePvcRes.data?.result?.isError) {
		throw new Error(
			`Failed to upgrade PVC workspace: ${JSON.stringify(upgradePvcRes.data)}`,
		);
	}
	const upgradedPvcPodName =
		upgradePvcRes.data.result.structuredContent.podName;
	console.log(`   - PVC upgraded pod created: ${upgradedPvcPodName}`);

	const deletedPvcOld = await waitForPodDeleted(pvcPodName, 30);
	if (!deletedPvcOld) {
		throw new Error(
			`Old PVC pod ${pvcPodName} was not deleted during recreate-style upgrade!`,
		);
	}

	await waitForPodRunning(upgradedPvcPodName, 60);
	await waitForWorkspaceRunning(writeToken, wsPvcId, 60);
	verifyPodHasUpgradedMarker(upgradedPvcPodName);
	console.log(
		"✅ RWO PVC recreate-style upgrade fallback succeeded; old pod deleted to release locks, new PVC pod created & upgraded.",
	);

	// 11. Clean up test resources
	console.log("11. Cleaning up test pods and ConfigMap...");
	for (const id of testWsIds) {
		try {
			runKubectl([
				"delete",
				"pod",
				"-l",
				`nogoo9/workspace-id=${id}`,
				"-n",
				NS,
				"--ignore-not-found",
			]);
		} catch (_) {}
	}
	try {
		runKubectl([
			"delete",
			"configmap",
			"workspace-terminal-default",
			"-n",
			NS,
			"--ignore-not-found",
		]);
	} catch (_) {}

	console.log(
		"🎉 All Multi-User E2E Upgrade Validation Tests Passed Successfully!",
	);
}

main().catch((err) => {
	console.error("❌ Multi-User E2E Upgrade Validation Failed:", err);
	process.exit(1);
});
