export {};

const BASE_URL = "http://localhost:8080";
const TOKEN_URL = `${BASE_URL}/auth/realms/nogoo9/protocol/openid-connect/token`;

async function fetchToken(username: string): Promise<string> {
	const body = new URLSearchParams({
		client_id: "nogoo9-mcp",
		username,
		password: "password",
		grant_type: "password",
		scope: "openid mcp:read mcp:write",
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

async function makeMcpCall(token: string | null, method: string, params: any) {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json, text/event-stream",
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

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
				clientInfo: { name: "e2e-test", version: "1.0" },
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
	console.log("==> Beginning E2E Authentication & Resource Isolation Tests...");

	// 1. Test Unauthorized challenge (RFC 9728)
	console.log("\n[1/7] Testing Unauthorized access challenges...");
	const challengeRes = await makeMcpCall(null, "tools/list", {});
	if (challengeRes.status !== 401) {
		throw new Error(`Expected 401 Unauthorized, got: ${challengeRes.status}`);
	}
	const wwwAuth = challengeRes.headers.get("WWW-Authenticate");
	const link = challengeRes.headers.get("Link");
	console.log("    Challenge headers retrieved:");
	console.log(`      WWW-Authenticate: ${wwwAuth}`);
	console.log(`      Link:             ${link}`);
	if (
		!wwwAuth?.includes("/.well-known/oauth-protected-resource") ||
		!link?.includes('rel="oauth-protected-resource"')
	) {
		throw new Error("Missing correct RFC 9728 challenge headers");
	}
	console.log("    ✅ RFC 9728 Compliance challenge verified.");

	// 2. Obtain tokens
	console.log("\n[2/7] Fetching access tokens from Keycloak...");
	const readToken = await fetchToken("readuser");
	const writeToken = await fetchToken("writeuser");
	const adminToken = await fetchToken("adminuser");
	console.log(
		"    ✅ Successfully retrieved readuser, writeuser, and adminuser tokens.",
	);

	function decodeJwt(token: string): any {
		try {
			const parts = token.split(".");
			if (parts.length !== 3) return null;
			const base64Url = parts[1];
			const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
			return JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
		} catch (_e) {
			return null;
		}
	}
	console.log(
		"    DEBUG readuser token payload:",
		JSON.stringify(decodeJwt(readToken), null, 2),
	);

	// 3. Test Authorized metadata read
	console.log(
		"\n[3/7] Verifying permissions and tool retrieval with tokens...",
	);
	const permissionsRes = await fetch(`${BASE_URL}/permissions`, {
		headers: { Authorization: `Bearer ${readToken}` },
	});
	if (!permissionsRes.ok) {
		throw new Error(
			`Failed to call /permissions with readToken: ${await permissionsRes.text()}`,
		);
	}
	const permReport = (await permissionsRes.json()) as any;
	console.log(
		"    Active tools enabled for readuser:",
		permReport.enabledTools.join(", "),
	);

	// 4. Create pods for user isolation test
	console.log("\n[4/7] Provisioning user-scoped test pods...");

	// Test that readuser cannot create a pod
	console.log("    Verifying that readuser is blocked from creating a pod...");
	const blockedCreate = await makeMcpCall(readToken, "tools/call", {
		name: "create_pod",
		arguments: {
			name: "readuser-e2e-pod",
			containers: [
				{
					name: "main",
					image: "nogoo9-registry.localhost:5001/bun:latest",
				},
			],
		},
	});
	const isBlocked =
		blockedCreate.status === 403 ||
		(blockedCreate.status === 200 &&
			blockedCreate.data?.result?.isError &&
			JSON.stringify(blockedCreate.data.result).includes("Forbidden"));
	if (!isBlocked) {
		throw new Error(
			`Expected Forbidden for readuser calling create_pod, got: ${blockedCreate.status} (${JSON.stringify(blockedCreate.data || blockedCreate)})`,
		);
	}
	console.log("    ✅ readuser successfully blocked.");

	const writeuserPodSpec = {
		labels: {
			"nogoo9/type": "workspace",
			"nogoo9/workspace-id": "writeuser-e2e-pod",
		},
		containers: [
			{
				name: "main",
				image: "nogoo9-registry.localhost:5001/bun:latest",
				command: [
					"bun",
					"-e",
					"Bun.serve({ port: 3000, fetch(req) { return new Response('hello from workspace'); } }); console.log('Listening on 3000');",
				],
			},
		],
	};
	const adminuserPodSpec = {
		labels: {
			"nogoo9/type": "workspace",
			"nogoo9/workspace-id": "adminuser-e2e-pod",
		},
		containers: [
			{
				name: "main",
				image: "nogoo9-registry.localhost:5001/bun:latest",
				command: [
					"bun",
					"-e",
					"Bun.serve({ port: 3000, fetch(req) { return new Response('hello from workspace'); } }); console.log('Listening on 3000');",
				],
			},
		],
	};

	console.log("    Creating pod 'writeuser-e2e-pod' owned by writeuser...");
	const createWriteuserPod = await makeMcpCall(writeToken, "tools/call", {
		name: "create_pod",
		arguments: { name: "writeuser-e2e-pod", ...writeuserPodSpec },
	});
	if (
		createWriteuserPod.status !== 200 ||
		createWriteuserPod.data?.result?.isError
	) {
		console.error("DEBUG: createWriteuserPod result:", createWriteuserPod);
		throw new Error(
			`Failed to create writeuser pod: ${JSON.stringify(createWriteuserPod.data || createWriteuserPod)}`,
		);
	}

	console.log("    Creating pod 'adminuser-e2e-pod' owned by adminuser...");
	const createAdminuserPod = await makeMcpCall(adminToken, "tools/call", {
		name: "create_pod",
		arguments: { name: "adminuser-e2e-pod", ...adminuserPodSpec },
	});
	if (
		createAdminuserPod.status !== 200 ||
		createAdminuserPod.data?.result?.isError
	) {
		console.error("DEBUG: createAdminuserPod result:", createAdminuserPod);
		throw new Error(
			`Failed to create adminuser pod: ${JSON.stringify(createAdminuserPod.data || createAdminuserPod)}`,
		);
	}
	console.log("    ✅ Both test pods provisioned successfully.");

	try {
		// 5. Test raw pod tools isolation (per-user filtering)
		console.log(
			"\n[5/7] Testing raw pod tool user isolation (per-user filtering)...",
		);

		console.log("    Listing pods as 'readuser'...");
		const listAsRead = await makeMcpCall(readToken, "tools/call", {
			name: "list_pods",
			arguments: {},
		});
		const readPods = (listAsRead.data.result.content[0].text as string).split(
			"\n",
		);
		console.log(
			"      Pods seen by readuser:\n",
			listAsRead.data.result.content[0].text,
		);
		const readHasAdminPod = readPods.some((p) =>
			p.includes("adminuser-e2e-pod"),
		);
		const readHasWritePod = readPods.some((p) =>
			p.includes("writeuser-e2e-pod"),
		);
		if (readHasAdminPod || readHasWritePod) {
			throw new Error(
				"Isolation failure: readuser can list other user's pods!",
			);
		}
		console.log("      -> readuser sees only owned pods (none). Correct.");

		console.log("    Listing pods as 'writeuser'...");
		const listAsWrite = await makeMcpCall(writeToken, "tools/call", {
			name: "list_pods",
			arguments: {},
		});
		const writePods = (listAsWrite.data.result.content[0].text as string).split(
			"\n",
		);
		console.log(
			"      Pods seen by writeuser:\n",
			listAsWrite.data.result.content[0].text,
		);
		const writeHasAdminPod = writePods.some((p) =>
			p.includes("adminuser-e2e-pod"),
		);
		const writeHasWritePod = writePods.some((p) =>
			p.includes("writeuser-e2e-pod"),
		);
		if (writeHasAdminPod) {
			throw new Error("Isolation failure: writeuser can list adminuser's pod!");
		}
		if (!writeHasWritePod) {
			throw new Error("Expected writeuser to see 'writeuser-e2e-pod'");
		}
		console.log("      -> writeuser sees only owned pods. Correct.");

		console.log("    Listing pods as 'adminuser' (admin role enabled)...");
		const listAsAdmin = await makeMcpCall(adminToken, "tools/call", {
			name: "list_pods",
			arguments: {},
		});
		const adminPods = (listAsAdmin.data.result.content[0].text as string).split(
			"\n",
		);
		console.log(
			"      Pods seen by adminuser:\n",
			listAsAdmin.data.result.content[0].text,
		);
		const adminHasAdminPod = adminPods.some((p) =>
			p.includes("adminuser-e2e-pod"),
		);
		const adminHasWritePod = adminPods.some((p) =>
			p.includes("writeuser-e2e-pod"),
		);
		if (!adminHasAdminPod || !adminHasWritePod) {
			throw new Error("Admin escalation failure: admin cannot see all pods!");
		}
		console.log("      -> adminuser can see all pods. Correct.");

		// 6. Test specific resource access block
		console.log(
			"\n[6/7] Testing direct resource access checks & admin escalation...",
		);

		console.log("    Querying admin pod as 'writeuser'...");
		const getAdminPodAsWrite = await makeMcpCall(writeToken, "tools/call", {
			name: "get_pod",
			arguments: { name: "adminuser-e2e-pod" },
		});
		if (getAdminPodAsWrite.data.result?.isError !== true) {
			throw new Error(
				"Isolation failure: writeuser allowed to read admin's pod!",
			);
		}
		console.log("      -> Access successfully denied to writeuser.");

		console.log("    Querying write pod as 'adminuser' (admin escalation)...");
		const getTestPodAsAdmin = await makeMcpCall(adminToken, "tools/call", {
			name: "get_pod",
			arguments: { name: "writeuser-e2e-pod" },
		});
		if (getTestPodAsAdmin.data.result?.isError === true) {
			throw new Error(
				"Admin escalation failure: admin blocked from reading user's pod!",
			);
		}
		console.log("      -> Admin successfully allowed to read user's pod.");
		console.log("    ✅ Identity-based authorization rules verified.");

		// Wait for writeuser-e2e-pod to be Running
		console.log(
			"    Waiting for 'writeuser-e2e-pod' to be in Running phase...",
		);
		let isRunning = false;
		for (let i = 0; i < 45; i++) {
			const getPodRes = await makeMcpCall(writeToken, "tools/call", {
				name: "get_pod",
				arguments: { name: "writeuser-e2e-pod" },
			});
			const podData = getPodRes.data.result?.structuredContent?.pod;
			const phase = podData?.status?.phase;
			console.log(`      Current phase: ${phase || "Unknown"}`);
			if (phase === "Running") {
				isRunning = true;
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		if (!isRunning) {
			throw new Error(
				"Pod 'writeuser-e2e-pod' did not reach Running status within timeout",
			);
		}

		// 7. Test Routing Proxy cookie authentication
		console.log("\n[7/7] Testing routing proxy cookie-based authentication...");
		const proxyUrl = `${BASE_URL}/route/writeuser-e2e-pod/`;

		console.log("    Connecting to routing proxy with Bearer token...");
		const proxyResToken = await fetch(proxyUrl, {
			headers: { Authorization: `Bearer ${writeToken}` },
		});

		const setCookie = proxyResToken.headers.get("Set-Cookie");
		console.log(`      Set-Cookie header returned: ${setCookie}`);
		if (
			!setCookie?.includes("nocr_token=") ||
			!setCookie.includes("Path=/route/writeuser-e2e-pod/")
		) {
			throw new Error(
				"Missing path-scoped nocr_token session cookie in response",
			);
		}

		// Extract the cookie value
		const cookieVal = setCookie.split(";")[0];

		console.log(
			"    Connecting to routing proxy sub-resource with cookie header...",
		);
		const proxyResCookie = await fetch(`${proxyUrl}index.html`, {
			headers: { Cookie: cookieVal },
		});
		console.log(`      Proxy sub-resource status: ${proxyResCookie.status}`);
		if (proxyResCookie.status === 401 || proxyResCookie.status === 403) {
			throw new Error(
				`Proxy cookie auth failed with status: ${proxyResCookie.status}`,
			);
		}
		console.log("    ✅ Cookie-based session authentication verified.");
	} finally {
		console.log("\nCleaning up test resources...");
		await makeMcpCall(adminToken, "tools/call", {
			name: "delete_pod",
			arguments: { name: "writeuser-e2e-pod", gracePeriodSeconds: 0 },
		});
		await makeMcpCall(adminToken, "tools/call", {
			name: "delete_pod",
			arguments: { name: "adminuser-e2e-pod", gracePeriodSeconds: 0 },
		});
	}

	console.log(
		"\n🎉 ALL E2E AUTHENTICATION AND AUTHORIZATION TESTS PASSED SUCCESSFULLY!",
	);
}

main().catch((err) => {
	console.error("\n❌ E2E AUTH TEST FAILED:", err);
	process.exit(1);
});
