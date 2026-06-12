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
Implement a **peer discovery** mechanism as step 3 in the key resolution cascade (after k8s Secret attempt, before in-memory fallback).

### How it works
1. The server exposes `GET /internal/session-key` on the existing Fastify server
2. When a new pod starts and needs a key, it uses the existing `listNamespacedPod` RBAC to find sibling pods. The label selector is derived dynamically from the pod's own `app` label (falling back to `app=nogoo9-mcp` if introspection fails), so it works with custom deployment names.
3. Pods are sorted by `creationTimestamp` (then name for deterministic tiebreak). The **oldest active pod** is the leader.
4. If this pod _is_ the oldest (or the only one), it generates a random key and serves it to future peers
5. If this pod is _not_ the oldest, it queries each older peer's pod IP for the key via `GET http://<podIP>:<port>/internal/session-key`
6. If any older peer responds, it adopts that key
7. If no older peer responds, it retries with a configurable delay (`PEER_DISCOVERY_DELAY_MS`, default 500ms) up to a configurable number of attempts (`PEER_DISCOVERY_RETRIES`, default 30)

### Security
- The internal endpoint is **cluster-internal only** — not exposed via Ingress (Ingress rules only match `/mcp`, `/route`, etc.)
- Requires `X-Nogoo9-Internal` header with a value derived from the pod's namespace (lightweight guard against accidental external access)
- Excluded from standard auth middleware (pod-to-pod communication)

### Convergence
- **Single pod restart**: Queries older peers → adopts existing key → no disruption
- **Full rollout**: All pods restart simultaneously → oldest pod becomes leader → generates new key → others adopt → sessions invalidate (expected on deploy)
- **Scale up**: New pod queries existing older pods → adopts key immediately
- **Leader failure**: If the oldest pod dies, the next-oldest becomes the new leader and generates a key; surviving younger pods adopt it

## Alternatives Considered

### Kubernetes Secret only
- Pros: Standard k8s pattern; persistent across restarts
- Cons: Requires `secrets` RBAC which the service account may not have
- Rejected as sole mechanism: Can't require additional RBAC. Kept as step 2 (best-effort).

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
- Rejected as sole mechanism: Kept as final fallback (step 4), but peer discovery provides a better default for multi-replica.

## Consequences
- No new RBAC permissions required — uses existing pod-listing permission
- Multi-replica deployments get automatic key sharing without explicit configuration
- The internal endpoint adds one route to the Fastify server (minimal surface area)
- If the leader pod dies and is replaced, the replacement queries surviving peers — seamless recovery
- The 4-step cascade (env → k8s Secret → peer → in-memory) provides progressive fallback
- Dynamic label selector derivation means the feature works with custom deployment names without configuration

## Amendments

| Date | Change |
|------|--------|
| 2026-06-13 | Updated to document the actual deterministic leader-follower election protocol (oldest-pod-wins with creationTimestamp + name tiebreak). Added dynamic label selector derivation from pod's own `app` label. Added configurable retry parameters (`PEER_DISCOVERY_DELAY_MS`, `PEER_DISCOVERY_RETRIES`). Added leader failure convergence scenario. Fixed step numbering to align with ADR-002's corrected 4-step cascade. |
