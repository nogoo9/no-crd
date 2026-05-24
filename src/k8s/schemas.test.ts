import { describe, expect, test } from "bun:test";
import {
	Container,
	EnvFromSource,
	EnvVar,
	PodSpecSchema,
	ResourceQuantity,
	Volume,
} from "./schemas.js";

describe("EnvVar Schema", () => {
	test("validates literal env var", () => {
		const result = EnvVar.safeParse({ name: "MY_VAR", value: "some-value" });
		expect(result.success).toBe(true);
	});

	test("validates configMapKeyRef env var", () => {
		const result = EnvVar.safeParse({
			name: "MY_VAR",
			valueFrom: {
				configMapKeyRef: {
					name: "my-configmap",
					key: "my-key",
					optional: true,
				},
			},
		});
		expect(result.success).toBe(true);
	});

	test("rejects env var without name", () => {
		const result = EnvVar.safeParse({ value: "val" });
		expect(result.success).toBe(false);
	});
});

describe("EnvFromSource Schema", () => {
	test("validates configMapRef", () => {
		const result = EnvFromSource.safeParse({
			prefix: "PRE_",
			configMapRef: { name: "my-cm", optional: false },
		});
		expect(result.success).toBe(true);
	});

	test("rejects invalid keys", () => {
		const result = EnvFromSource.safeParse({
			configMapRef: { name: 123 }, // name must be string
		});
		expect(result.success).toBe(false);
	});
});

describe("ResourceQuantity Schema", () => {
	test("validates correct records", () => {
		const result = ResourceQuantity.safeParse({
			cpu: "500m",
			memory: "256Mi",
		});
		expect(result.success).toBe(true);
	});

	test("rejects invalid structures", () => {
		const result = ResourceQuantity.safeParse({
			cpu: 100, // value must be string
		});
		expect(result.success).toBe(false);
	});
});

describe("Container Schema", () => {
	test("validates simple valid container", () => {
		const result = Container.safeParse({
			name: "app",
			image: "nginx:alpine",
			imagePullPolicy: "IfNotPresent",
			ports: [{ containerPort: 80, protocol: "TCP" }],
		});
		expect(result.success).toBe(true);
	});

	test("rejects container without name or image", () => {
		const result = Container.safeParse({ name: "app" });
		expect(result.success).toBe(false);
	});
});

describe("Volume Schema", () => {
	test("validates emptyDir volume", () => {
		const result = Volume.safeParse({
			name: "cache-vol",
			emptyDir: { medium: "Memory" },
		});
		expect(result.success).toBe(true);
	});

	test("validates configMap volume", () => {
		const result = Volume.safeParse({
			name: "config-vol",
			configMap: { name: "app-config", optional: true },
		});
		expect(result.success).toBe(true);
	});
});

describe("PodSpecSchema Schema", () => {
	test("validates minimum valid PodSpec", () => {
		const result = PodSpecSchema.safeParse({
			containers: [{ name: "app", image: "nginx" }],
		});
		expect(result.success).toBe(true);
	});

	test("validates complex PodSpec with scheduling, volume and security settings", () => {
		const result = PodSpecSchema.safeParse({
			labels: { app: "my-web" },
			containers: [
				{
					name: "app",
					image: "nginx",
					resources: { requests: { cpu: "100m" } },
				},
			],
			volumes: [{ name: "v", emptyDir: {} }],
			restartPolicy: "OnFailure",
			terminationGracePeriodSeconds: 30,
			activeDeadlineSeconds: 120,
		});
		expect(result.success).toBe(true);
	});

	test("rejects empty containers array", () => {
		const result = PodSpecSchema.safeParse({
			containers: [],
		});
		expect(result.success).toBe(false);
	});

	test("rejects invalid restartPolicy enum", () => {
		const result = PodSpecSchema.safeParse({
			containers: [{ name: "app", image: "nginx" }],
			restartPolicy: "AlwaysAndForever",
		});
		expect(result.success).toBe(false);
	});

	test("rejects negative termination grace period", () => {
		const result = PodSpecSchema.safeParse({
			containers: [{ name: "app", image: "nginx" }],
			terminationGracePeriodSeconds: -5,
		});
		expect(result.success).toBe(false);
	});

	test("rejects non-positive active deadline seconds", () => {
		const result = PodSpecSchema.safeParse({
			containers: [{ name: "app", image: "nginx" }],
			activeDeadlineSeconds: 0,
		});
		expect(result.success).toBe(false);
	});
});
