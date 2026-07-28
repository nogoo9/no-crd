# Leaderless Peer Discovery & High Availability

`nogoo9` achieves High Availability (HA) and multi-replica scalability without stateful databases (Postgres, Redis, or Etcd) by employing a Kubernetes Secret-backed peer discovery mechanism ([`src/server/peer-discovery.ts`](file:///home/eterna2/github/nogoo9-no-crd/src/server/peer-discovery.ts)).

---

## 🤝 Peer Key Negotiation Protocol

```mermaid
sequenceDiagram
    autonumber
    participant PodA as Replica Pod A
    participant K8sSecret as K8s Secret: nogoo9-session-key
    participant PodB as Replica Pod B

    PodA->>K8sSecret: Read Secret on Boot
    alt Secret Exists
        K8sSecret-->>PodA: Shared 256-bit Key
    else Secret Missing
        PodA->>K8sSecret: Atomically Create Secret with Random Key
        K8sSecret-->>PodA: Key Created & Confirmed
    end

    PodB->>K8sSecret: Read Secret on Boot
    K8sSecret-->>PodB: Return Shared 256-bit Key negotiated by Pod A
    Note over PodA,PodB: Both replicas now share identical session cookie keys!
```

---

## 🛡️ Guarantees

1. **Zero Database Dependency**: Eliminates external database infrastructure for session state management.
2. **Atomic Conflict Resolution**: Simultaneous replica boots resolve races cleanly through Kubernetes API atomic secret creation semantics (`409 Conflict` fallback to read).
3. **Seamless Stateless Scaling**: Any replica can decrypt session cookies (`nocr_sess`) and refresh tokens (`nocr_refresh`) issued by any other replica.
