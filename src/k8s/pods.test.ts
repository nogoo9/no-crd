import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { errorResult } from "./errors.js";
import {
	createPodFromArgs,
	podToSummary,
	provisionServiceAccount,
} from "./pods.js";
import type { PodCreateArgs } from "./schemas.js";

const coreApi = {
	createNamespacedServiceAccount: async () => ({}) as any,
	createNamespacedPod: async () => ({}) as any,
} as any;

const kc = {
	getCurrentCluster: () => null as any,
} as any;

describe("podToSummary", () => {
	test("correctly maps a full V1Pod structure", () => {
		const mockPod = {
			metadata: {
				name: "my-pod",
				namespace: "my-ns",
				labels: { app: "test" },
				annotations: { desc: "hello" },
			},
			spec: {
				containers: [{ name: "c1" }, { name: "c2" }],
				nodeName: "node-1",
			},
			status: {
				phase: "Running",
				podIP: "10.0.0.1",
				containerStatuses: [
					{ name: "c1", ready: true, restartCount: 1 },
					{ name: "c2", ready: false, restartCount: 2 },
				],
			},
		};

		const summary = podToSummary(mockPod as any);
		expect(summary).toEqual({
			name: "my-pod",
			namespace: "my-ns",
			phase: "Running",
			ready: 1,
			total: 2,
			restarts: 3,
			podIP: "10.0.0.1",
			node: "node-1",
			labels: { app: "test" },
			annotations: { desc: "hello" },
		});
	});

	test("handles missing statuses and lists gracefully", () => {
		const mockPod = {};
		const summary = podToSummary(mockPod as any);
		expect(summary).toEqual({
			name: "",
			namespace: "",
			phase: "",
			ready: 0,
			total: 0,
			restarts: 0,
			podIP: "",
			node: "",
			labels: {},
			annotations: {},
		});
	});
});

describe("provisionServiceAccount", () => {
	afterEach(() => {
		spyOn(coreApi, "createNamespacedServiceAccount").mockRestore();
	});

	test("creates service account successfully", async () => {
		const mockCreate = spyOn(
			coreApi,
			"createNamespacedServiceAccount",
		).mockResolvedValue({} as any);

		const result = await provisionServiceAccount(
			coreApi,
			"default",
			"user-123",
			"arn:aws:iam::111122223333:role/my-role",
		);

		expect(result).toBe("ws-sa-user-123");
		expect(mockCreate).toHaveBeenCalledTimes(1);
		expect(mockCreate.mock.calls[0][0]).toEqual({
			namespace: "default",
			body: {
				apiVersion: "v1",
				kind: "ServiceAccount",
				metadata: {
					name: "ws-sa-user-123",
					namespace: "default",
					annotations: {
						"eks.amazonaws.com/role-arn":
							"arn:aws:iam::111122223333:role/my-role",
					},
					labels: {
						"nogoo9/workspace-id": "user-123",
						"nogoo9/managed-by": "nogoo9-spawner",
					},
				},
			},
		});
	});

	test("ignores 409 Conflict error", async () => {
		const mockCreate = spyOn(
			coreApi,
			"createNamespacedServiceAccount",
		).mockRejectedValue({
			response: { statusCode: 409 },
		});

		const result = await provisionServiceAccount(
			coreApi,
			"default",
			"user-123",
			"arn:aws:iam::111122223333:role/my-role",
		);

		expect(result).toBe("ws-sa-user-123");
		expect(mockCreate).toHaveBeenCalledTimes(1);
	});

	test("throws non-409 errors", async () => {
		const error = {
			response: { statusCode: 500 },
			message: "Internal Server Error",
		};
		const mockCreate = spyOn(
			coreApi,
			"createNamespacedServiceAccount",
		).mockRejectedValue(error);

		await expect(
			provisionServiceAccount(
				coreApi,
				"default",
				"user-123",
				"arn:aws:iam::111122223333:role/my-role",
			),
		).rejects.toEqual(error);
		expect(mockCreate).toHaveBeenCalledTimes(1);
	});
});

describe("errorResult", () => {
	afterEach(() => {
		spyOn(kc, "getCurrentCluster").mockRestore();
	});

	test("formats standard Error", () => {
		const err = new Error("something went wrong");
		expect(errorResult(kc, err)).toEqual({
			content: [{ type: "text", text: "Error: something went wrong" }],
			isError: true,
			code: 500,
			message: "something went wrong",
		});
	});

	test("formats Kubernetes HTTP error", () => {
		const err = {
			response: { statusCode: 404, body: { message: "Not Found" } },
		};
		expect(errorResult(kc, err)).toEqual({
			content: [
				{ type: "text", text: 'Error: HTTP 404: {"message":"Not Found"}' },
			],
			isError: true,
			code: 404,
			message: 'HTTP 404: {"message":"Not Found"}',
		});
	});

	test("formats connection/timeout error with cluster server info", () => {
		spyOn(kc, "getCurrentCluster").mockReturnValue({
			server: "https://my-k8s-cluster:6443",
			name: "my-cluster",
		} as any);

		const err = new Error("connect ECONNREFUSED 127.0.0.1:6443");
		expect(errorResult(kc, err)).toEqual({
			content: [
				{
					type: "text",
					text: "Error: Cannot reach Kubernetes API server at https://my-k8s-cluster:6443. Is your cluster running? Run: kubectl cluster-info",
				},
			],
			isError: true,
			code: 503,
			message:
				"Cannot reach Kubernetes API server at https://my-k8s-cluster:6443. Is your cluster running? Run: kubectl cluster-info",
		});
	});

	test("formats string/unknown error types", () => {
		expect(errorResult(kc, "unknown fatal error")).toEqual({
			content: [{ type: "text", text: "Error: unknown fatal error" }],
			isError: true,
			code: 500,
			message: "unknown fatal error",
		});
	});
});

describe("createPodFromArgs", () => {
	afterEach(() => {
		spyOn(coreApi, "createNamespacedPod").mockRestore();
	});

	test("submits constructed Pod and returns success summary", async () => {
		const mockCreate = spyOn(coreApi, "createNamespacedPod").mockResolvedValue({
			metadata: {
				name: "submitted-pod-name",
				namespace: "submitted-pod-ns",
			},
		} as any);

		const args: PodCreateArgs = {
			containers: [{ name: "app", image: "nginx:1.25" }],
			labels: { "session-id": "sess-1" },
			restartPolicy: "OnFailure",
		};

		const result = await createPodFromArgs(
			coreApi,
			"target-ns",
			"test-pod",
			args,
		);

		expect(result).toEqual({
			text: "Created pod submitted-pod-name in namespace submitted-pod-ns",
			name: "submitted-pod-name",
			namespace: "submitted-pod-ns",
		});

		expect(mockCreate).toHaveBeenCalledTimes(1);
		expect(mockCreate.mock.calls[0][0]).toEqual({
			namespace: "target-ns",
			body: {
				apiVersion: "v1",
				kind: "Pod",
				metadata: {
					name: "test-pod",
					namespace: "target-ns",
					labels: { "session-id": "sess-1" },
				},
				spec: {
					containers: [{ name: "app", image: "nginx:1.25" }],
					restartPolicy: "OnFailure",
				},
			},
		});
	});
});
