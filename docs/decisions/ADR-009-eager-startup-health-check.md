# ADR-009: Eager MCP Server Initialization with K8s Health Check

## Status
Accepted

## Date
2026-05-29

## Context

When deploying to a new Kubernetes cluster, the MCP server would start up, bind to the HTTP port, and report "listening" — but the first request would fail silently because the Kubernetes API was unreachable (wrong service account, missing RBAC, network policy, etc.).

The root cause was the **lazy initialization** pattern in `startHttpServer()`:

1. `initK8sContext()` only loads the kubeconfig (no network call).
2. The Fastify server binds to the port immediately.
3. `createMcpServer()` is deferred to the first HTTP request inside `getMcpServerAndTransport()`.
4. `evaluatePermissions()` — which actually calls the K8s API — only runs inside `createMcpServer()`.

This created two failure modes:
- **Silent startup**: The server reports healthy but every request fails.
- **CrashLoopBackOff loops**: Kubernetes restarts the pod because health probes fail on first request, so operators see the init logs repeating without reaching the "listening" log.

## Decision

Move to **eager initialization** at startup:

1. **K8s API health check**: Before creating the MCP server, probe the Kubernetes API with a single `listNamespacedPod(limit: 1)` call. If it fails, throw immediately with an actionable error message.
2. **Eager MCP server creation**: In non-stateless mode, `createMcpServer()` is called during `startHttpServer()`, before binding the port. This validates RBAC permissions upfront.
3. **Actionable error diagnostics**: The `main().catch()` handler in `server-entry.ts` now logs structured error messages with HINT diagnostics for common failure modes (ECONNREFUSED, Unauthorized).

The startup sequence is now:

```
startHttpServer()
  → Validate K8s API connectivity (listPods probe)
  → Create MCP server (evaluatePermissions)
  → Register UI app
  → Bind Fastify to port
  → Log "listening"
```

If any step fails, the process exits with a clear error before binding the port.

### Stateless mode exception

In `STATELESS=true` mode, a new MCP server is created per-request by design, so eager creation is skipped. The K8s health check still runs.

## Alternatives Considered

### Keep lazy initialization with a separate readiness probe
- Pros: No startup delay; K8s readiness probe handles the problem.
- Cons: Requires a custom `/healthz` endpoint; the actual failure reason is hidden from logs; operators still have to correlate probe failures with K8s API issues.
- **Rejected**: Adds complexity without solving the observability problem.

### Retry loop with backoff at startup
- Pros: Handles transient API server unavailability (e.g., during cluster bootstrap).
- Cons: Masks permanent failures; delays pod startup; K8s already handles restarts via CrashLoopBackOff.
- **Rejected**: Fail-fast is better for declarative infrastructure. K8s restartPolicy provides the retry mechanism.

## Consequences

- The server **will not start** if the K8s API is unreachable. This is intentional — it's better to fail visibly than to start and silently break on every request.
- Startup time increases slightly (one API call + permission evaluation). This is negligible (~100ms on healthy clusters).
- `getMcpServerAndTransport()` still creates new servers in stateless mode and for test DI — the fallback path is preserved.
- Error messages now include actionable hints ("Check KUBERNETES_SERVICE_HOST, service account mount, and network policies").
