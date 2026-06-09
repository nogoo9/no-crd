import { getLogger } from "@logtape/logtape";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ANNOTATION_KEYS, config } from "~/config/index.js";
import {
	createSessionCookie,
	DEFAULT_NAMESPACE,
	decryptRefreshToken,
	encryptRefreshToken,
	extractTokenFromCookie,
	extractUserIdentity,
	getSessionKey,
	hasRequiredRole,
	hasRequiredScope,
	MODE,
	parseWorkspaceApis,
	reconstructSessionPayload,
	requestContextStore,
	resolveNamespace,
	verifySessionCookie,
	verifyToken,
} from "~/k8s/index.js";
import {
	getBasePrefix,
	getRequestHostAndProto,
	setCorsHeaders,
} from "./helpers.js";

const logger = getLogger(["nogoo9", "auth"]);

let cachedTokenEndpoint: string | null = null;
let lastDiscoveryFetch = 0;
const DISCOVERY_CACHE_TTL = 300000; // 5 minutes

async function getTokenEndpoint(): Promise<string> {
	const discoveryUrl = config.ui.oauth.discoveryUrl;
	if (!discoveryUrl) {
		const tokenUrl = config.auth.tokenUrl;
		if (tokenUrl) {
			return tokenUrl;
		}
		throw new Error(
			"Neither OAUTH_DISCOVERY_URL nor OAUTH_TOKEN_URL is configured on the server",
		);
	}

	if (
		cachedTokenEndpoint &&
		Date.now() - lastDiscoveryFetch < DISCOVERY_CACHE_TTL
	) {
		return cachedTokenEndpoint;
	}

	try {
		const res = await fetch(discoveryUrl, {
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) {
			throw new Error(`OIDC Discovery returned HTTP ${res.status}`);
		}
		const data = (await res.json()) as { token_endpoint?: string };
		if (!data.token_endpoint) {
			throw new Error("OIDC Discovery response is missing token_endpoint");
		}
		cachedTokenEndpoint = data.token_endpoint;
		lastDiscoveryFetch = Date.now();
		return cachedTokenEndpoint;
	} catch (err) {
		logger.error("Failed to fetch OIDC discovery document: {error}", {
			error: err instanceof Error ? err.message : String(err),
		});
		if (cachedTokenEndpoint) {
			return cachedTokenEndpoint;
		}
		throw err;
	}
}

/**
 * Performs a refresh token exchange against the OIDC provider.
 */
export async function performTokenRefresh(
	request: FastifyRequest,
	decryptedRefresh: string,
	_sessKey: string,
	basePrefix: string,
): Promise<{ jwtPayload: any; token: string; rotatedRefreshToken: string }> {
	const tokenEndpoint = await getTokenEndpoint();
	const clientId = config.auth.clientId || "";
	const clientSecret = config.auth.clientSecret || "";

	const params = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: decryptedRefresh,
	});
	if (clientId) params.set("client_id", clientId);
	if (clientSecret) params.set("client_secret", clientSecret);

	const refreshRes = await fetch(tokenEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params.toString(),
		signal: AbortSignal.timeout(5000),
	});

	if (!refreshRes.ok) {
		const errText = await refreshRes.text().catch(() => "");
		throw new Error(
			`OIDC refresh endpoint returned HTTP ${refreshRes.status}: ${errText}`,
		);
	}

	const tokenData = (await refreshRes.json()) as {
		access_token?: string;
		refresh_token?: string;
	};
	if (!tokenData.access_token) {
		throw new Error("OIDC refresh response did not contain access_token");
	}

	let expectedAudience: string | undefined;
	try {
		const { host, proto } = getRequestHostAndProto(request);
		expectedAudience = `${proto}://${host}${basePrefix}`;
	} catch (_) {}

	const jwtPayload = await verifyToken(
		tokenData.access_token,
		expectedAudience,
	);
	const rotatedRefreshToken = tokenData.refresh_token || decryptedRefresh;

	return {
		jwtPayload,
		token: tokenData.access_token,
		rotatedRefreshToken,
	};
}

function sendErrorResponse(
	request: FastifyRequest,
	reply: FastifyReply,
	status: number,
	error: string,
	message: string,
	basePrefix: string,
) {
	const acceptHeader = request.headers.accept || "";
	if (request.method === "GET" && acceptHeader.includes("text/html")) {
		const redirectUrl = `${basePrefix || ""}/error.html?error=${encodeURIComponent(
			error,
		)}&message=${encodeURIComponent(message)}`;
		return reply.redirect(redirectUrl);
	}

	reply.status(status);
	setCorsHeaders(reply);
	return reply.send({
		error,
		message,
	});
}

export function registerAuthHooks(
	api: FastifyInstance,
	deps: {
		getK8sContext: () => any;
	},
) {
	const basePrefix = getBasePrefix();

	// Global hooks for token parsing
	api.addHook("preHandler", async (request, reply) => {
		if (!config.auth.enabled) {
			return;
		}

		let token: string | null = null;
		const authHeader = request.headers.authorization;
		if (authHeader?.toLowerCase().startsWith("bearer ")) {
			token = authHeader.substring(7);
		} else {
			try {
				const urlObj = new URL(
					request.url,
					`http://${request.headers.host || "localhost"}`,
				);
				token = urlObj.searchParams.get("token");
			} catch (_) {}
			if (!token) {
				token =
					extractTokenFromCookie(request.headers.cookie, "nocr_token") || null;
			}
		}

		let jwtPayload: any;
		let authError: Error | null = null;

		// Check nocr_sess session cookie before JWT verification
		const sessKey = getSessionKey();
		if (!token && sessKey) {
			const sessCookie = extractTokenFromCookie(
				request.headers.cookie,
				"nocr_sess",
			);
			if (sessCookie) {
				const sessPayload = verifySessionCookie(sessCookie, sessKey);
				if (sessPayload) {
					jwtPayload = reconstructSessionPayload(
						sessPayload.sub,
						sessPayload.roles,
					);
					(request as any).sessionAuthenticated = true;
					logger.debug("Authenticated via session cookie for user {sub}", {
						sub: sessPayload.sub,
					});
				}
			}
		}

		if (!jwtPayload && token) {
			try {
				let expectedAudience: string | undefined;
				try {
					const { host, proto } = getRequestHostAndProto(request);
					expectedAudience = `${proto}://${host}${basePrefix}`;
				} catch (_) {}
				jwtPayload = await verifyToken(token, expectedAudience);

				// Mint root-scoped nocr_sess on successful JWT verification
				if (jwtPayload && sessKey) {
					const sessCookie = createSessionCookie(
						jwtPayload,
						sessKey,
						config.auth.sessionTtlSeconds,
						config.auth.subJsonPath,
						config.auth.rolesJsonPath,
					);
					reply.header(
						"Set-Cookie",
						`nocr_sess=${sessCookie}; Path=/; SameSite=Lax; HttpOnly; Max-Age=${config.auth.sessionTtlSeconds}`,
					);
				}
			} catch (err) {
				authError = err instanceof Error ? err : new Error(String(err));
				logger.warn("Token verification failed: {error}", {
					error: authError.message,
				});
			}
		}

		// Try transparent token refresh using nocr_refresh cookie if not authenticated
		if (!jwtPayload && config.auth.enabled && sessKey) {
			const refreshCookie = extractTokenFromCookie(
				request.headers.cookie,
				"nocr_refresh",
			);
			if (refreshCookie) {
				try {
					const decryptedRefresh = decryptRefreshToken(refreshCookie, sessKey);
					if (decryptedRefresh) {
						logger.debug(
							"Attempting transparent token refresh using refresh cookie",
						);
						const result = await performTokenRefresh(
							request,
							decryptedRefresh,
							sessKey,
							basePrefix,
						);

						jwtPayload = result.jwtPayload;
						token = result.token;
						authError = null;

						logger.info("Transparent token refresh successful for user {sub}", {
							sub: jwtPayload.sub,
						});

						// Mint new session cookie
						const newSessCookie = createSessionCookie(
							jwtPayload,
							sessKey,
							config.auth.sessionTtlSeconds,
							config.auth.subJsonPath,
							config.auth.rolesJsonPath,
						);
						reply.header(
							"Set-Cookie",
							`nocr_sess=${newSessCookie}; Path=/; SameSite=Lax; HttpOnly; Max-Age=${config.auth.sessionTtlSeconds}`,
						);

						// Rotate refresh token
						const encryptedNewRefresh = encryptRefreshToken(
							result.rotatedRefreshToken,
							sessKey,
						);
						reply.header(
							"Set-Cookie",
							`nocr_refresh=${encryptedNewRefresh}; Path=/; SameSite=Lax; HttpOnly; Max-Age=604800`,
						);
						reply.header("x-refreshed-token", token);
					}
				} catch (err) {
					logger.warn("Failed transparent token refresh: {error}", {
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}
		}

		(request as any).jwtPayload = jwtPayload;
		(request as any).token = token;
		(request as any).authError = authError;
	});

	// Global hook for AsyncLocalStorage context run
	api.addHook("preHandler", (request, _reply, done) => {
		requestContextStore.run({ jwtPayload: (request as any).jwtPayload }, () => {
			done();
		});
	});

	// Authentication guards
	const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
		if (!config.auth.enabled) {
			return;
		}

		const jwtPayload = (request as any).jwtPayload;
		const authError = (request as any).authError;

		if (!jwtPayload) {
			const acceptHeader = request.headers.accept || "";
			if (request.method === "GET" && acceptHeader.includes("text/html")) {
				const currentUrl = request.url;
				const loginUrl = `${basePrefix || ""}/?redirect_uri=${encodeURIComponent(currentUrl)}`;
				return reply.redirect(loginUrl);
			}

			const { host, proto } = getRequestHostAndProto(request);
			const metadataUrl = `${proto}://${host}${basePrefix}/.well-known/oauth-protected-resource`;

			reply.header(
				"WWW-Authenticate",
				`Bearer resource_metadata="${metadataUrl}"`,
			);
			reply.header("Link", `<${metadataUrl}>; rel="oauth-protected-resource"`);

			const message = authError
				? `Unauthorized: ${authError.message}. Access token is missing, expired, or invalid.`
				: "Unauthorized: Valid JWT token required. Please check your credentials/cookies.";
			return sendErrorResponse(
				request,
				reply,
				401,
				"Unauthorized",
				message,
				basePrefix,
			);
		}
	};

	const requireMcpAuth = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		await requireAuth(request, reply);
		if (reply.sent) return;

		if (config.auth.enabled) {
			const jwtPayload = (request as any).jwtPayload;
			const requiredScope = config.auth.requiredReadScope;
			if (
				requiredScope &&
				!hasRequiredScope(jwtPayload, requiredScope, config.auth.scopeJsonPath)
			) {
				const presentScopes = jwtPayload.scope || jwtPayload.scp || "";
				return sendErrorResponse(
					request,
					reply,
					403,
					"Forbidden",
					`Missing required scope: "${requiredScope}". The scopes present in your token are: "${presentScopes || "none"}". Scope check JSONPath configuration is "${config.auth.scopeJsonPath}".`,
					basePrefix,
				);
			}

			const requiredRole = config.auth.requiredReadRole;
			if (
				requiredRole &&
				!hasRequiredRole(jwtPayload, requiredRole, config.auth.rolesJsonPath)
			) {
				const userRoles =
					jwtPayload.realm_access?.roles || jwtPayload.roles || [];
				return sendErrorResponse(
					request,
					reply,
					403,
					"Forbidden",
					`Missing required role: "${requiredRole}". The roles present in your token are: ${JSON.stringify(userRoles)}. Role check JSONPath configuration is "${config.auth.rolesJsonPath}".`,
					basePrefix,
				);
			}
		}
	};

	const requireRouteAuth = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		await requireAuth(request, reply);
		if (reply.sent) return;

		if (config.auth.enabled) {
			const jwtPayload = (request as any).jwtPayload;
			const isRead =
				request.method === "GET" ||
				request.method === "HEAD" ||
				request.method === "OPTIONS";
			const requiredScope = isRead
				? config.auth.requiredReadScope
				: config.auth.requiredWriteScope;

			if (
				requiredScope &&
				!hasRequiredScope(jwtPayload, requiredScope, config.auth.scopeJsonPath)
			) {
				const presentScopes = jwtPayload.scope || jwtPayload.scp || "";
				return sendErrorResponse(
					request,
					reply,
					403,
					"Forbidden",
					`Missing required scope: "${requiredScope}". The scopes present in your token are: "${presentScopes || "none"}". Scope check JSONPath configuration is "${config.auth.scopeJsonPath}".`,
					basePrefix,
				);
			}

			const requiredRole = isRead
				? config.auth.requiredReadRole
				: config.auth.requiredWriteRole;

			if (
				requiredRole &&
				!hasRequiredRole(jwtPayload, requiredRole, config.auth.rolesJsonPath)
			) {
				const userRoles =
					jwtPayload.realm_access?.roles || jwtPayload.roles || [];
				return sendErrorResponse(
					request,
					reply,
					403,
					"Forbidden",
					`Missing required role: "${requiredRole}". The roles present in your token are: ${JSON.stringify(userRoles)}. Role check JSONPath configuration is "${config.auth.rolesJsonPath}".`,
					basePrefix,
				);
			}
		}
	};

	const proxyPreHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const { workspaceId } = request.params as { workspaceId: string };
		if (!workspaceId) {
			return sendErrorResponse(
				request,
				reply,
				400,
				"Bad Request",
				"Workspace ID is required",
				basePrefix,
			);
		}

		const ns = resolveNamespace(undefined, MODE, DEFAULT_NAMESPACE);
		const k8sCtx = deps.getK8sContext();
		let pod: any;
		try {
			const res = await k8sCtx.coreApi.listNamespacedPod({
				namespace: ns,
				labelSelector: `${ANNOTATION_KEYS.TYPE}=workspace,${ANNOTATION_KEYS.WORKSPACE_ID}=${workspaceId}`,
			});

			if (res.items.length === 0) {
				await requireRouteAuth(request, reply);
				if (reply.sent) return;

				return sendErrorResponse(
					request,
					reply,
					404,
					"Not Found",
					`Workspace "${workspaceId}" not found in Kubernetes namespace "${ns}".`,
					basePrefix,
				);
			}
			pod = res.items[0];
		} catch (err) {
			logger.error("Failed to list pods in proxyPreHandler: {error}", {
				error: err,
			});
			return sendErrorResponse(
				request,
				reply,
				500,
				"Internal Server Error",
				"Failed to retrieve workspace status from cluster.",
				basePrefix,
			);
		}

		const annotations = pod.metadata?.annotations || {};
		const authMode = annotations[ANNOTATION_KEYS.WORKSPACE_AUTH_MODE] || "";
		const modes = authMode
			.split(",")
			.map((m: string) => m.trim().toLowerCase());
		const isNoAuth = modes.includes("no-auth");

		// Expose workspace annotations early for downstream access (e.g. headers injection)
		(request as any).workspaceAnnotations = annotations;

		if (!isNoAuth) {
			await requireRouteAuth(request, reply);
			if (reply.sent) return;

			let userSub = "anonymous";
			if (config.auth.enabled) {
				try {
					userSub = extractUserIdentity(
						(request as any).jwtPayload,
						config.auth.subJsonPath,
					);
				} catch (err) {
					return sendErrorResponse(
						request,
						reply,
						401,
						"Unauthorized",
						`Failed to extract user identity from JWT: ${err instanceof Error ? err.message : String(err)}. Check AUTH_SUB_JSONPATH setting (currently: ${config.auth.subJsonPath}).`,
						basePrefix,
					);
				}
			}

			const podSub = pod.metadata?.labels?.["nogoo9/user-sub"];

			if (config.auth.enabled && podSub !== userSub) {
				return sendErrorResponse(
					request,
					reply,
					403,
					"Forbidden",
					`You do not own this workspace. Workspace owner identity is "${podSub || "none"}", but your authenticated identity is "${userSub}".`,
					basePrefix,
				);
			}
		}

		try {
			if (pod.status?.phase !== "Running") {
				return sendErrorResponse(
					request,
					reply,
					503,
					"Service Unavailable",
					`Workspace is not running. Current pod phase is "${pod.status?.phase || "Unknown"}". Waiting for pod to start.`,
					basePrefix,
				);
			}

			const podIP = pod.status?.podIP;
			if (!podIP) {
				return sendErrorResponse(
					request,
					reply,
					503,
					"Service Unavailable",
					"Workspace IP address not assigned yet by Kubernetes cluster scheduler.",
					basePrefix,
				);
			}

			const targetPortAnnotation =
				pod.metadata?.annotations?.["nogoo9/workspace-port"];
			let port =
				targetPortAnnotation || config.k8s.defaultWorkspacePort || "3000";

			// Dynamic API routing and path prefix stripping rewrite
			const apis = parseWorkspaceApis(pod.metadata?.annotations);
			const routePathIndex = request.url.indexOf(`/route/${workspaceId}`);
			if (routePathIndex !== -1) {
				const routePrefix = request.url.substring(
					0,
					routePathIndex + `/route/${workspaceId}`.length,
				);
				const subpath = request.url.substring(routePrefix.length) || "/";
				const qIndex = subpath.indexOf("?");
				const pathOnly = qIndex !== -1 ? subpath.substring(0, qIndex) : subpath;
				const queryOnly = qIndex !== -1 ? subpath.substring(qIndex) : "";

				// Sort by path length descending (most specific match wins)
				const sortedApis = [...apis].sort(
					(a, b) => b.path.length - a.path.length,
				);
				for (const api of sortedApis) {
					const apiPathNoTrailingSlash = api.path.replace(/\/$/, "");
					if (apiPathNoTrailingSlash !== "") {
						const pathMatches =
							pathOnly === apiPathNoTrailingSlash ||
							pathOnly.startsWith(`${apiPathNoTrailingSlash}/`);

						// Check method matches
						const allowedMethods = api.method
							? api.method.split(",").map((m) => m.trim().toUpperCase())
							: [];
						const methodMatches =
							allowedMethods.length === 0 ||
							allowedMethods.includes("*") ||
							allowedMethods.includes(request.method);

						if (pathMatches && methodMatches) {
							port = api.port;
							// Only rewrite URL to strip the API path prefix if the API target port
							// is different from the main workspace port. If it is the same port,
							// we assume it is a sub-route on the same application web server.
							const workspacePort = String(
								targetPortAnnotation ||
									config.k8s.defaultWorkspacePort ||
									"3000",
							);
							if (String(port) !== workspacePort) {
								const cleanRest =
									pathOnly.substring(apiPathNoTrailingSlash.length) || "/";
								const newUrl = routePrefix + cleanRest + queryOnly;
								if (request.raw) {
									request.raw.url = newUrl;
								}
								logger.debug(
									"Matched API {apiName} (port {apiPort}) for workspace {workspaceId}. Rewrote request URL to {newUrl}",
									{ apiName: api.name, apiPort: port, workspaceId, newUrl },
								);
							} else {
								logger.debug(
									"Matched API {apiName} (port {apiPort}) for workspace {workspaceId}. Port matches workspace port; preserving path prefix: {url}",
									{
										apiName: api.name,
										apiPort: port,
										workspaceId,
										url: request.url,
									},
								);
							}
							break;
						}
					}
				}
			}

			// Check if pod uses SUBFOLDER prefix (e.g. for KasmVNC / Obsidian GUI workspaces).
			const envs = pod.spec?.containers?.[0]?.env || [];
			const hasSubfolder = envs.some(
				(e: any) => e.name === "SUBFOLDER" && e.value,
			);
			if (hasSubfolder && request.raw) {
				request.raw.url = `/route/${workspaceId}${request.raw.url}`;
			}

			const upstreamUrl = `http://${podIP}:${port}`;
			(request as any).tmpUpstream = upstreamUrl;
			(request as any).workspaceId = workspaceId;
			(request as any).workspaceAnnotations = pod.metadata?.annotations || {};

			logger.info(
				"Resolved workspace {workspaceId} upstream to {upstreamUrl}",
				{ workspaceId, upstreamUrl },
			);
		} catch (err) {
			logger.error("Failed to resolve workspace {workspaceId}: {error}", {
				workspaceId,
				error: err,
			});
			return sendErrorResponse(
				request,
				reply,
				500,
				"Internal Server Error",
				`Failed to query or route to workspace: ${err instanceof Error ? err.message : String(err)}`,
				basePrefix,
			);
		}
	};

	return {
		requireAuth,
		requireMcpAuth,
		requireRouteAuth,
		proxyPreHandler,
	};
}
