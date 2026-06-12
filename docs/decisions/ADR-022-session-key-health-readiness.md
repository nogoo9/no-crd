# ADR-022: Session Key Dependent Health Check Readiness

## Status
Accepted

## Date
2026-06-12

## Context

During multi-replica deployments or rolling updates, pods coordinate using a leader election strategy to negotiate and share the exact same session secret key. Follower pods retrieve this key by polling the leader's `/internal/session-key` endpoint.

Previously, the readiness check (`/healthz` and `/mcp/healthz`) would report `status: "ok"` (200) as soon as the Fastify server port was successfully bound, regardless of whether the session key resolution process was complete. 

If a follower pod started receiving client traffic before it completed peer discovery to resolve the session key, incoming client requests containing signed OIDC session cookies could not be validated or decrypted. This caused spurious 401/403 errors and redirection loops during replica scaling.

## Decision

Modify the health check endpoints (`/healthz` and `/mcp/healthz`) in [mcp.ts](file:///home/eterna2/github/nogoo9-no-crd/src/server/routes/mcp.ts) to verify the status of the session key:

1. Retrieve the session key using `getSessionKey()`.
2. If the key is empty (`""`), return a status of `503 Service Unavailable` with a structured error payload:
   ```json
   {
     "status": "error",
     "message": "Session key not resolved yet"
   }
   ```
3. Once the key is resolved (via env, k8s Secret, or peer discovery), return the standard `200 OK` health status.

This ensures that Kubernetes does not route public traffic to a booting replica until it has aligned on the session key with its peers.

## Alternatives Considered

### Rely solely on TCP port liveness/readiness
- **Rejected**: Binds to the port immediately, exposing a race window where incoming requests fail decrypting cookies due to a missing session key.

### Block Fastify `.listen()` until the key is resolved
- **Rejected**: If follower pods cannot bind their port, they cannot serve the internal key endpoint, causing a deadlock where no pod can establish/share the key. Binding the port but returning 503 on health checks solves this.

## Consequences

- Ingress controllers and Kubernetes readiness probes will block traffic to a booting replica until it has adopted the session key.
- The window of session decryption errors during rolling updates is eliminated.
- Internal communication between peer pods is enabled before the pod is marked ready.
