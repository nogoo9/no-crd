import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import http from "node:http";
// @ts-expect-error
import { WebSocket, WebSocketServer } from "ws";
import { ANNOTATION_KEYS } from "~/config/index.js";
import { createFastifyApp, resetMcpServer } from "./index.js";

const isBun = typeof process !== "undefined" && Boolean(process.versions?.bun);

describe("BFF WebSocket End-to-End Tests with Real WebSocket Client & Server", () => {
	let upstreamServer: http.Server;
	let wssUpstream: WebSocketServer;
	let upstreamPort: number;
	let lastUpstreamHeaders: http.IncomingHttpHeaders = {};
	let bffApp: any;
	let bffPort: number;

	beforeEach(async () => {
		// Reset server & environment
		delete process.env.BASE_URL;
		process.env.AUTH_ENABLED = "false";

		// 1. Create a real upstream WebSocket server simulating a ttyd sandbox container pod
		upstreamServer = http.createServer();
		wssUpstream = new WebSocketServer({
			server: upstreamServer,
			perMessageDeflate: false,
			handleProtocols: (protocols: Set<string> | string[]) => {
				const protoSet = Array.isArray(protocols)
					? new Set(protocols)
					: protocols;
				if (protoSet.has("tty")) return "tty";
				if (protoSet.has("vnc")) return "vnc";
				return Array.from(protoSet)[0] || false;
			},
		});

		wssUpstream.on("connection", (ws: any, req: http.IncomingMessage) => {
			lastUpstreamHeaders = req.headers;
			ws.on("message", (msg: any, isBinary: boolean) => {
				const str = msg.toString();
				if (str === "ping-ttyd") {
					ws.send("pong-ttyd");
				} else if (isBinary) {
					// Echo binary frame back
					ws.send(msg, { binary: true });
				} else {
					ws.send(`echo:${str}`);
				}
			});
		});

		await new Promise<void>((resolve) =>
			upstreamServer.listen(0, "127.0.0.1", () => resolve()),
		);
		upstreamPort = (upstreamServer.address() as any).port;

		// Mock Kubernetes pod lookup to route to upstreamPort
		const mockK8sContext = {
			coreApi: {
				listNamespacedPod: async () => ({
					items: [
						{
							metadata: {
								name: "ws-pod-1",
								labels: {
									"nogoo9/type": "workspace",
									"nogoo9/workspace-id": "e2e-ws-sandbox",
									"nogoo9/user-sub": "test-user-123",
								},
								annotations: {
									[ANNOTATION_KEYS.WORKSPACE_PORT]: String(upstreamPort),
									[ANNOTATION_KEYS.WORKSPACE_AUTH_MODE]:
										"no-auth,inject-headers",
								},
							},
							status: {
								phase: "Running",
								podIP: "127.0.0.1",
							},
						},
					],
				}),
			},
		};

		// 2. Initialize real BFF Fastify app
		await resetMcpServer(undefined, false, mockK8sContext as any);
		bffApp = await createFastifyApp();
		await bffApp.listen({ port: 0, host: "127.0.0.1" });
		bffPort = (bffApp.server.address() as any).port;
	});

	afterEach(async () => {
		if (bffApp) {
			await bffApp.close();
		}
		if (wssUpstream) {
			wssUpstream.close();
		}
		if (upstreamServer) {
			await new Promise<void>((resolve) =>
				upstreamServer.close(() => resolve()),
			);
		}
		delete process.env.BASE_URL;
	});

	test.skipIf(isBun)(
		"Real WebSocket client connects through BFF proxy with tty subprotocol",
		async () => {
			const wsUrl = `ws://127.0.0.1:${bffPort}/route/e2e-ws-sandbox/ws`;
			const client = new WebSocket(wsUrl, ["tty"]);

			const receivedMessages: string[] = [];

			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error("WebSocket test timed out")),
					5000,
				);

				client.on("open", () => {
					console.log("[CLIENT OPEN] Connected!");
					client.send("ping-ttyd");
				});

				client.on("message", (data: any) => {
					receivedMessages.push(data.toString());
					if (data.toString() === "pong-ttyd") {
						clearTimeout(timeout);
						client.close();
						resolve();
					}
				});

				client.on("error", (err: any) => {
					clearTimeout(timeout);
					reject(err);
				});

				client.on("close", (code: number, reason: any) => {
					if (code !== 1000 && code !== 1005) {
						clearTimeout(timeout);
						reject(
							new Error(
								`WebSocket closed unexpectedly with code ${code}: ${reason}`,
							),
						);
					}
				});
			});

			expect(client.protocol).toBe("tty");
			expect(receivedMessages).toContain("pong-ttyd");
			expect(lastUpstreamHeaders["x-user-sub"]).toBe("test-user-123");
		},
	);

	test.skipIf(isBun)(
		"Real WebSocket client handles binary frame transmission through BFF proxy without corruption",
		async () => {
			const wsUrl = `ws://127.0.0.1:${bffPort}/route/e2e-ws-sandbox/ws`;
			const client = new WebSocket(wsUrl, ["tty"]);

			const binaryBuffer = Buffer.from([
				0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff, 0xfe,
			]);
			let echoedBinary: Buffer | null = null;

			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error("Binary WebSocket test timed out")),
					5000,
				);

				client.on("open", () => {
					client.send(binaryBuffer);
				});

				client.on("message", (data: any) => {
					echoedBinary = Buffer.from(data);
					clearTimeout(timeout);
					client.close();
					resolve();
				});

				client.on("error", (err: any) => {
					clearTimeout(timeout);
					reject(err);
				});
			});

			expect(echoedBinary).not.toBeNull();
			expect(Buffer.compare(echoedBinary!, binaryBuffer)).toBe(0);
		},
	);

	test.skipIf(isBun)(
		"Real WebSocket client connects through BFF proxy when BASE_URL prefix is set",
		async () => {
			// Re-initialize BFF with BASE_URL=/nocr
			process.env.BASE_URL = "/nocr";
			if (bffApp) await bffApp.close();

			const mockK8sContext = {
				coreApi: {
					listNamespacedPod: async () => ({
						items: [
							{
								metadata: {
									name: "ws-pod-1",
									labels: {
										"nogoo9/type": "workspace",
										"nogoo9/workspace-id": "e2e-ws-sandbox",
										"nogoo9/user-sub": "test-user-123",
									},
									annotations: {
										[ANNOTATION_KEYS.WORKSPACE_PORT]: String(upstreamPort),
										[ANNOTATION_KEYS.WORKSPACE_AUTH_MODE]: "no-auth",
									},
								},
								status: {
									phase: "Running",
									podIP: "127.0.0.1",
								},
							},
						],
					}),
				},
			};

			await resetMcpServer(undefined, false, mockK8sContext as any);
			bffApp = await createFastifyApp();
			await bffApp.listen({ port: 0, host: "127.0.0.1" });
			bffPort = (bffApp.server.address() as any).port;

			const wsUrl = `ws://127.0.0.1:${bffPort}/nocr/route/e2e-ws-sandbox/ws`;
			const client = new WebSocket(wsUrl, ["tty"]);

			let received = "";
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error("BASE_URL WebSocket test timed out")),
					5000,
				);

				client.on("open", () => {
					client.send("hello-nocr");
				});

				client.on("message", (data: any) => {
					received = data.toString();
					clearTimeout(timeout);
					client.close();
					resolve();
				});

				client.on("error", (err: any) => {
					clearTimeout(timeout);
					reject(err);
				});
			});

			expect(received).toBe("echo:hello-nocr");
		},
	);
});
