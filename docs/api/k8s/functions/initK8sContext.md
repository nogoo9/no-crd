[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / initK8sContext

# Function: initK8sContext()

> **initK8sContext**(`customKc?`): [`K8sContext`](../interfaces/K8sContext.md)

Defined in: [src/k8s/client.ts:176](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/k8s/client.ts#L176)

Initializes and packages the active Kubernetes context (KubeConfig and default API client).
Performs setup tasks like reading local kubeconfig or configuring Node TLS bypass.

## Parameters

### customKc?

`KubeConfig`

Optional pre-configured KubeConfig context (highly useful for test isolation/stubs).

## Returns

[`K8sContext`](../interfaces/K8sContext.md)

The packaged K8sContext object containing the config and client instance.
