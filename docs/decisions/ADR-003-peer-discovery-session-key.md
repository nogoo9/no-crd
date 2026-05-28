# ADR-003: Peer Discovery for Session Key Sharing

## Status
Accepted

## Date
2026-05-28

## Context
The stateless signed session cookie (ADR-002) requires all proxy replicas to share the same HMAC signing key. In production, operators set `PROXY_SESSION_SECRET` explicitly. However, for zero-config deployments and development, we need an automatic key sharing mechanism.

Constraints:
- The service account may **not** have RBAC permissions for Kubernetes Secrets
- No external infrastructure (Redis, etcd) should be required
- Must work for single-replica, multi-replica, and rolling-restart scenarios
- Should use only permissions the pods already have

## Decision
Implement a **peer discovery** mechanism as step 4 in the key resolution cascade (after k8s Secret attempt, before in-memory fallback).

### How it works
1. The server exposes `GET /internal/session-key` on the existing Fastify server
2. When a new pod starts and needs a key, it uses the existing `listNamespacedPod` RBAC to find sibling pods (label selector: `app=nogoo9-mcp`)
3. It queries each running peer's pod IP for the key
4. If any peer responds, it adopts that key
5. If no peers respond (first pod), it generates a random key and serves it to future peers

### Security
- The internal endpoint is **cluster-internal only** — not exposed via Ingress (Ingress rules only match `/mcp`, `/route`, etc.)
- Requires `X-Nogoo9-Internal` header with a value derived from the pod's namespace (lightweight guard against accidental external access)
- Excluded from standard auth middleware (pod-to-pod communication)

### Convergence
- **Single pod restart**: Queries peers → adopts existing key → no disruption
- **Full rollout**: All pods restart simultaneously → first pod generates new key → others adopt → sessions invalidate (expected on deploy)
- **Scale up**: New pod queries existing pods → adopts key immediately

## Alternatives Considered

### Kubernetes Secret only
- Pros: Standard k8s pattern; persistent across restarts
- Cons: Requires `secrets` RBAC which the service account may not have
- Rejected as sole mechanism: Can't require additional RBAC. Kept as step 3 (best-effort).

### Leader election (Lease-based)
- Pros: Standard k8s pattern; deterministic leader
- Cons: Complex to implement correctly; requires `leases` or `endpoints` RBAC; overkill for sharing a single secret
- Rejected: Over-engineered for the problem. Peer query is simpler and sufficient.

### Redis / external store
- Pros: Battle-tested; works across clusters
- Cons: Adds infrastructure dependency; violates "no external deps" principle
- Rejected: Contradicts the project's "no CRDs, minimal dependencies" philosophy

### Gossip protocol (SWIM, etc.)
- Pros: Decentralized; handles network partitions
- Cons: Complex; requires background membership protocol; overkill
- Rejected: We're sharing a single immutable value, not maintaining cluster state

### In-memory only (no sharing)
- Pros: Simplest possible approach; zero additional code
- Cons: Multi-replica deployments get degraded behavior (sessions only valid on issuing replica)
- Rejected as sole mechanism: Kept as final fallback (step 5), but peer discovery provides a better default for multi-replica.

## Consequences
- No new RBAC permissions required — uses existing pod-listing permission
- Multi-replica deployments get automatic key sharing without explicit configuration
- The internal endpoint adds one route to the Fastify server (minimal surface area)
- If the first pod dies and is replaced, the replacement queries surviving peers — seamless recovery
- The 5-step cascade (env → JWT_SECRET → k8s Secret → peer → in-memory) provides progressive fallback
