[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / K8sContext

# Interface: K8sContext

Defined in: [src/k8s/client.ts:19](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/k8s/client.ts#L19)

Encapsulates the Kubernetes cluster config and pre-instantiated API clients.
This is used for Dependency Injection across all helper functions and MCP tools.

## Properties

### coreApi

> **coreApi**: `ObjectCoreV1Api`

Defined in: [src/k8s/client.ts:23](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/k8s/client.ts#L23)

Standard Core V1 API client (for Pods, ConfigMaps, Namespaces, Services).

***

### kc

> **kc**: `KubeConfig`

Defined in: [src/k8s/client.ts:21](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/k8s/client.ts#L21)

Active KubeConfig configuration.
