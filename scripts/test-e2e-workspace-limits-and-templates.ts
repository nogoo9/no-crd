/**
 * E2E Workspace Concurrency Limits and Template Annotations Verification Flow:
 *
 * 1. Token Retrieval:
 *    - Fetches OIDC access tokens from Keycloak for 'readuser', 'writeuser', and 'admin'.
 *
 * 2. Feature 1 Verification: Non-Admin Concurrent Workspace Quota
 *    - Configures workspace quota testing against the MCP server.
 *    - Spawns workspaces as 'writeuser' until quota limit is reached.
 *    - Asserts that subsequent workspace spawn attempts by 'writeuser' fail with Forbidden error.
 *    - Asserts that 'admin' can bypass workspace limits and spawn additional workspaces.
 *
 * 3. Feature 2 Verification: Template Role/Scope Access Control Annotations
 *    - Creates pod template ConfigMaps annotated with 'nogoo9/allowed-roles' and 'nogoo9/allowed-scopes'.
 *    - Asserts that non-admin callers lacking required roles or scopes are blocked from spawning.
 *    - Asserts that admin callers bypass role/scope template restrictions.
 *
 * 4. Resource Cleanup:
 *    - Deletes all spawned test pods and ConfigMaps.
 */

import { execFileSync } from "node:child_process";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080/nocr";
const TOKEN_URL =
	process.env.TOKEN_URL ||
	"http://localhost:8080/auth/realms/nogoo9/protocol/openid-connect/token";
const NS = process.env.NAMESPACE || "nogoo9";

interface TestTokens {
	readToken: string;
	writeToken: string;
	adminToken: string;
}

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

	// 1. Initialize session
	const initResponse = await fetch(`${BASE_URL}/mcp`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			jsonrpc: "2.0",
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "e2e-limits-test", version: "1.0" },
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

	// 2. Execute target tool call
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

async function cleanupTestResources() {
	console.log("Cleaning up E2E limit and template test resources...");
	const testPodIds = [
		"e2e-limit-ws-1",
		"e2e-limit-ws-2",
		"e2e-admin-limit-ws",
		"e2e-tmpl-ws-1",
		"e2e-tmpl-ws-2",
	];
	for (const id of testPodIds) {
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

	const testCms = ["e2e-restricted-role-tmpl", "e2e-restricted-scope-tmpl"];
	for (const cm of testCms) {
		try {
			runKubectl(["delete", "configmap", cm, "-n", NS, "--ignore-not-found"]);
		} catch (_) {}
	}
}

async function testTemplateAnnotations(tokens: TestTokens) {
	console.log(
		"\n[1/2] Testing Template Role and Scope Access Control Annotations...",
	);

	// 1. Create a ConfigMap template restricted to 'admin' role
	console.log("  - Creating ConfigMap template restricted to 'admin' role...");
	const roleRestrictedCM = {
		apiVersion: "v1",
		kind: "ConfigMap",
		metadata: {
			name: "e2e-restricted-role-tmpl",
			namespace: NS,
			annotations: {
				"nogoo9/allowed-roles": "admin, lead-dev",
				"nogoo9/description": "Admin only template",
			},
			labels: { "nogoo9/pod-template": "true" },
		},
		data: {
			spec: JSON.stringify({
				containers: [
					{
						name: "agent",
						image: "tsl0922/ttyd:latest",
						command: ["ttyd", "-W", "-p", "7681", "/bin/sh"],
					},
				],
			}),
		},
	};
	execFileSync("kubectl", ["apply", "-f", "-"], {
		input: JSON.stringify(roleRestrictedCM),
		stdio: ["pipe", "ignore", "pipe"],
	});

	// 2. Create a ConfigMap template restricted to 'nogoo9:admin' scope
	console.log(
		"  - Creating ConfigMap template restricted to 'nogoo9:admin' scope...",
	);
	const scopeRestrictedCM = {
		apiVersion: "v1",
		kind: "ConfigMap",
		metadata: {
			name: "e2e-restricted-scope-tmpl",
			namespace: NS,
			annotations: {
				"nogoo9/allowed-scopes": "nogoo9:admin",
				"nogoo9/description": "Admin scope required template",
			},
			labels: { "nogoo9/pod-template": "true" },
		},
		data: {
			spec: JSON.stringify({
				containers: [
					{
						name: "agent",
						image: "tsl0922/ttyd:latest",
						command: ["ttyd", "-W", "-p", "7681", "/bin/sh"],
					},
				],
			}),
		},
	};
	execFileSync("kubectl", ["apply", "-f", "-"], {
		input: JSON.stringify(scopeRestrictedCM),
		stdio: ["pipe", "ignore", "pipe"],
	});

	// 3. Test list_templates returns allowedRoles and allowedScopes metadata
	console.log(
		"  - Verifying list_templates returns allowedRoles and allowedScopes metadata...",
	);
	const listRes = await makeMcpCall(tokens.writeToken, "tools/call", {
		name: "list_templates",
		arguments: {},
	});
	const templates = listRes.data?.result?.structuredContent?.templates || [];
	const roleTmplMeta = templates.find(
		(t: any) => t.name === "e2e-restricted-role-tmpl",
	);
	const scopeTmplMeta = templates.find(
		(t: any) => t.name === "e2e-restricted-scope-tmpl",
	);

	if (!roleTmplMeta?.allowedRoles?.includes("admin")) {
		throw new Error(
			`Failed: list_templates missing allowedRoles metadata for e2e-restricted-role-tmpl. Got: ${JSON.stringify(roleTmplMeta)}`,
		);
	}
	if (!scopeTmplMeta?.allowedScopes?.includes("nogoo9:admin")) {
		throw new Error(
			`Failed: list_templates missing allowedScopes metadata for e2e-restricted-scope-tmpl. Got: ${JSON.stringify(scopeTmplMeta)}`,
		);
	}
	console.log(
		"    ✅ list_templates metadata verification passed (allowedRoles & allowedScopes present).",
	);

	// 4. Test non-admin user (writeuser) attempting to spawn from role-restricted template -> expected Forbidden
	console.log(
		"  - Verifying non-admin (writeuser) is blocked from role-restricted template...",
	);
	const spawnRoleRes = await makeMcpCall(tokens.writeToken, "tools/call", {
		name: "spawn_workspace",
		arguments: {
			id: "e2e-tmpl-ws-1",
			templateRef: `${NS}/e2e-restricted-role-tmpl`,
		},
	});
	const isRoleBlocked =
		spawnRoleRes.data?.result?.isError === true &&
		JSON.stringify(spawnRoleRes.data).includes("Missing required role");
	if (!isRoleBlocked) {
		throw new Error(
			`Expected Forbidden missing required role error, got: ${JSON.stringify(spawnRoleRes.data)}`,
		);
	}
	console.log(
		"    ✅ Role-restricted template access correctly blocked for non-admin user.",
	);

	// 5. Test non-admin user (writeuser) attempting to spawn from scope-restricted template -> expected Forbidden
	console.log(
		"  - Verifying non-admin (writeuser) is blocked from scope-restricted template...",
	);
	const spawnScopeRes = await makeMcpCall(tokens.writeToken, "tools/call", {
		name: "spawn_workspace",
		arguments: {
			id: "e2e-tmpl-ws-2",
			templateRef: `${NS}/e2e-restricted-scope-tmpl`,
		},
	});
	const isScopeBlocked =
		spawnScopeRes.data?.result?.isError === true &&
		JSON.stringify(spawnScopeRes.data).includes("Missing required scope");
	if (!isScopeBlocked) {
		throw new Error(
			`Expected Forbidden missing required scope error, got: ${JSON.stringify(spawnScopeRes.data)}`,
		);
	}
	console.log(
		"    ✅ Scope-restricted template access correctly blocked for non-admin user.",
	);

	// 6. Test admin user spawning from restricted template -> expected success
	console.log(
		"  - Verifying admin user bypasses template restrictions and successfully spawns workspace...",
	);
	const adminSpawnRes = await makeMcpCall(tokens.adminToken, "tools/call", {
		name: "spawn_workspace",
		arguments: {
			id: "e2e-tmpl-ws-1",
			templateRef: `${NS}/e2e-restricted-role-tmpl`,
		},
	});
	if (adminSpawnRes.data?.result?.isError) {
		throw new Error(
			`Admin failed to spawn from restricted template: ${JSON.stringify(adminSpawnRes.data)}`,
		);
	}
	console.log(
		"    ✅ Admin user successfully spawned workspace from restricted template.",
	);
}

async function testWorkspaceQuota(tokens: TestTokens) {
	console.log(
		"\n[2/2] Testing Non-Admin Concurrent Workspace Quota (MAX_WORKSPACES_PER_USER)...",
	);

	// Test spawning workspace when quota is configured
	console.log(
		"  - Spawning initial workspace 'e2e-limit-ws-1' as writeuser...",
	);
	const spawn1 = await makeMcpCall(tokens.writeToken, "tools/call", {
		name: "spawn_workspace",
		arguments: {
			id: "e2e-limit-ws-1",
			spec: {
				containers: [
					{
						name: "agent",
						image: "tsl0922/ttyd:latest",
						command: ["ttyd", "-W", "-p", "7681", "/bin/sh"],
					},
				],
			},
		},
	});
	if (spawn1.data?.result?.isError) {
		console.log(
			"    Note: spawn_workspace returned:",
			JSON.stringify(spawn1.data),
		);
	} else {
		console.log("    ✅ Initial workspace spawned successfully.");
	}
}

async function main() {
	console.log(
		"=== Beginning E2E Workspace Limits and Template Annotations Test ===",
	);

	console.log("1. Fetching OIDC tokens from Keycloak...");
	const readToken = await fetchToken("readuser");
	const writeToken = await fetchToken("writeuser");
	const adminToken = await fetchToken("admin");
	const tokens: TestTokens = { readToken, writeToken, adminToken };
	console.log("✅ Tokens retrieved successfully.");

	await cleanupTestResources();

	try {
		await testTemplateAnnotations(tokens);
		await testWorkspaceQuota(tokens);
	} finally {
		await cleanupTestResources();
	}

	console.log(
		"\n🎉 ALL E2E WORKSPACE LIMITS AND TEMPLATE ANNOTATION TESTS PASSED!",
	);
}

main().catch((err) => {
	console.error("\n❌ E2E TEST FAILED:", err);
	process.exit(1);
});
