import type * as k8s from "@kubernetes/client-node";
import { getLogger } from "@logtape/logtape";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const logger = getLogger(["nogoo9", "k8s-errors"]);

export interface CustomToolResult<
	T extends Record<string, unknown> = Record<string, unknown>,
> extends CallToolResult {
	content: Array<{ type: "text"; text: string }>;
	isError: true;
	code: number;
	message: string;
	structuredContent?: T;
}

interface K8sResponse {
	statusCode?: number;
	status?: number;
	body?: unknown;
}

/** Represents structured details extracted from a Kubernetes API error. */
export interface K8sErrorDetails {
	/** HTTP status code returned by the API server (e.g. 404, 409). */
	statusCode?: number;
	/** Response body from the API server (usually contains error message string or object). */
	body?: unknown;
}

/**
 * Normalizes a thrown error and attempts to extract Kubernetes API-specific HTTP details.
 *
 * @param err The thrown error object.
 * @returns Structured error details with statusCode and body if found.
 */
export function getK8sError(err: unknown): K8sErrorDetails {
	if (err && typeof err === "object") {
		const e = err as Record<string, unknown>;
		if (e.response && typeof e.response === "object") {
			const resp = e.response as K8sResponse;
			const statusCode = resp.statusCode ?? resp.status;
			if (typeof statusCode === "number") {
				return {
					statusCode,
					body: resp.body,
				};
			}
		}
	}
	return {};
}

/**
 * Formats a thrown error into a standard MCP tool execution error response.
 * Detects network timeout or unreachable API servers, mapping them to clear troubleshooting messages.
 *
 * @param kc The active KubeConfig configuration context.
 * @param err The thrown error object.
 * @returns MCP formatted error content and flag.
 */
export function errorResult<
	T extends Record<string, unknown> = Record<string, unknown>,
>(
	kc: k8s.KubeConfig,
	err: unknown,
	structuredContent?: T,
): CustomToolResult<T> {
	logger.debug("Generating errorResult format for error: {error}", {
		error: err,
	});
	let message: string;
	let code: number | undefined;
	const k8sErr = getK8sError(err);
	if (k8sErr.statusCode !== undefined) {
		message = `HTTP ${k8sErr.statusCode}: ${JSON.stringify(k8sErr.body)}`;
		code = k8sErr.statusCode;
	} else if (err instanceof Error) {
		message = err.message;
		if ("code" in err) {
			const e = err as unknown as Record<string, unknown>;
			if (typeof e.code === "number") {
				code = e.code;
			}
		}
	} else {
		message = String(err);
	}

	if (
		message.includes("ECONNREFUSED") ||
		message.includes("ENOTFOUND") ||
		message.includes("ETIMEDOUT")
	) {
		const server = kc.getCurrentCluster()?.server ?? "unknown";
		logger.warn(
			"Kubernetes connection error detected for API server: {server}",
			{ server },
		);
		message = `Cannot reach Kubernetes API server at ${server}. Is your cluster running? Run: kubectl cluster-info`;
		code = 503;
	}

	return {
		content: [{ type: "text" as const, text: `Error: ${message}` }],
		isError: true as const,
		code: code ?? 500,
		message,
		...(structuredContent ? { structuredContent } : {}),
	};
}
