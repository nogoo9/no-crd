import * as k8s from "@kubernetes/client-node";
import {
	createConfiguration,
	ServerConfiguration,
} from "@kubernetes/client-node";
import { ResponseContext } from "@kubernetes/client-node/dist/gen/http/http.js";
import { IsomorphicFetchHttpLibrary } from "@kubernetes/client-node/dist/gen/http/isomorphic-fetch.js";
import { from } from "@kubernetes/client-node/dist/gen/rxjsStub.js";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["nogoo9", "k8s-client"]);

// ─── Types & Configuration ───────────────────────────────────────────────────

/**
 * Encapsulates the Kubernetes cluster config and pre-instantiated API clients.
 * This is used for Dependency Injection across all helper functions and MCP tools.
 */
export interface K8sContext {
	/** Active KubeConfig configuration. */
	kc: k8s.KubeConfig;
	/** Standard Core V1 API client (for Pods, ConfigMaps, Namespaces, Services). */
	coreApi: k8s.CoreV1Api;
}

// ─── Bun / Deno HTTP Library ──────────────────────────────────────────────────

/**
 * Custom isomorphic HTTP library for `@kubernetes/client-node` that uses global `fetch`
 * under Bun and Deno. This is necessary because the default library relies heavily
 * on Node-specific request/agent behaviors that cause issues in Deno and Bun.
 */
export class BunDenoHttpLibrary {
	private fallback = new IsomorphicFetchHttpLibrary();
	constructor(private kc: k8s.KubeConfig) {}

	send(request: any) {
		const isBun = typeof Bun !== "undefined";
		const isDeno = typeof (globalThis as any).Deno !== "undefined";

		if (!isBun && !isDeno) {
			return this.fallback.send(request);
		}

		const url = request.getUrl();
		const method = request.getHttpMethod().toString();
		const body = request.getBody();
		const headers = request.getHeaders();
		const signal = request.getSignal();

		// Extract TLS options from the Agent configured by @kubernetes/client-node
		const agent = request.getAgent();
		const agentOpts = agent?.options || {};
		const cert = agentOpts.cert ? agentOpts.cert.toString("utf8") : undefined;
		const key = agentOpts.key ? agentOpts.key.toString("utf8") : undefined;
		const ca = agentOpts.ca ? agentOpts.ca.toString("utf8") : undefined;

		let fetchPromise: Promise<Response>;
		let denoClient: any = null;

		if (isBun) {
			const tls: any = {};
			if (cert) tls.cert = cert;
			if (key) tls.key = key;
			if (ca) tls.ca = ca;
			if (
				process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ||
				agentOpts.rejectUnauthorized === false ||
				this.kc.getCurrentCluster()?.skipTLSVerify
			) {
				tls.rejectUnauthorized = false;
			}

			fetchPromise = globalThis.fetch(url, {
				method,
				body,
				headers,
				signal,
				tls,
			} as any);
		} else {
			// Deno
			const options: any = {
				method,
				body,
				headers,
				signal,
			};
			const clientOpts: any = {};
			if (cert) clientOpts.cert = cert;
			if (key) clientOpts.key = key;
			if (ca) clientOpts.caCerts = [ca];

			// Only create a client if cert/key/ca are provided
			if (Object.keys(clientOpts).length > 0) {
				denoClient = (globalThis as any).Deno.createHttpClient(clientOpts);
				options.client = denoClient;
			}

			fetchPromise = globalThis.fetch(url, options);
		}

		const resultPromise = fetchPromise
			.then(async (resp) => {
				const respHeaders: Record<string, string> = {};
				resp.headers.forEach((value, name) => {
					respHeaders[name] = value;
				});
				const textData = await resp.text();
				const respBody = {
					text: () => Promise.resolve(textData),
					binary: () => Promise.resolve(Buffer.from(textData)),
				};
				return new ResponseContext(resp.status, respHeaders, respBody as any);
			})
			.finally(() => {
				if (denoClient) {
					try {
						denoClient.close();
					} catch (_) {}
				}
			});

		return from(resultPromise);
	}
}

// ─── API Client Factory ────────────────────────────────────────────────────────

/**
 * Creates an instance of a Kubernetes API client for a given configuration.
 * Automatically delegates to custom `makeApiClient` setups if a mock/stub KubeConfig is passed.
 * Otherwise, configures the client with the BunDenoHttpLibrary wrapper to ensure global fetch support.
 *
 * @param kc The active KubeConfig configuration context.
 * @param apiClientType The class constructor of the target API client (e.g. CoreV1Api, AuthorizationV1Api).
 * @returns An instantiated API client of type T.
 */
export function makeApiClient<T>(
	kc: k8s.KubeConfig,
	apiClientType: new (config: any) => T,
): T {
	logger.debug("Creating API client: {type}", { type: apiClientType.name });
	// If makeApiClient has been mocked/overridden on KubeConfig, delegate to it
	if (kc.makeApiClient !== k8s.KubeConfig.prototype.makeApiClient) {
		return kc.makeApiClient(apiClientType as any) as any;
	}
	const cluster = kc.getCurrentCluster();
	if (!cluster) {
		logger.error(
			"Failed to make API client: no active cluster found in KubeConfig.",
		);
		throw new Error("No active cluster!");
	}
	const authConfig = {
		default: kc,
	};
	const baseServerConfig = new ServerConfiguration(cluster.server, {});
	const config = createConfiguration({
		baseServer: baseServerConfig,
		authMethods: authConfig,
		httpApi: new BunDenoHttpLibrary(kc),
	});
	return new apiClientType(config);
}

// ─── Service Initialization ────────────────────────────────────────────────────

/**
 * Initializes and packages the active Kubernetes context (KubeConfig and default API client).
 * Performs setup tasks like reading local kubeconfig or configuring Node TLS bypass.
 *
 * @param customKc Optional pre-configured KubeConfig context (highly useful for test isolation/stubs).
 * @returns The packaged K8sContext object containing the config and client instance.
 */
export function initK8sContext(customKc?: k8s.KubeConfig): K8sContext {
	logger.info(
		"Initializing Kubernetes context (DI). Has custom config: {hasCustom}",
		{
			hasCustom: !!customKc,
		},
	);
	const kc = customKc ?? new k8s.KubeConfig();
	if (!customKc) {
		kc.loadFromDefault();
	}

	const cluster = kc.getCurrentCluster();
	if (cluster) {
		if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
			logger.warn(
				"Disabling TLS verification for cluster {cluster} due to NODE_TLS_REJECT_UNAUTHORIZED=0",
				{
					cluster: cluster.name,
				},
			);
			(cluster as any).skipTLSVerify = true;
		}
		logger.info("Kubernetes context initialized. Server: {server}", {
			server: cluster.server,
		});
	} else {
		logger.warn("No active cluster found in Kubernetes configuration context.");
	}

	const coreApi = makeApiClient(kc, k8s.CoreV1Api);

	return {
		kc,
		coreApi,
	};
}
