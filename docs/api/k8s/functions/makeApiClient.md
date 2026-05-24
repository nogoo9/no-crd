[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / makeApiClient

# Function: makeApiClient()

> **makeApiClient**\<`T`\>(`kc`, `apiClientType`): `T`

Defined in: [src/k8s/client.ts:139](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/k8s/client.ts#L139)

Creates an instance of a Kubernetes API client for a given configuration.
Automatically delegates to custom `makeApiClient` setups if a mock/stub KubeConfig is passed.
Otherwise, configures the client with the BunDenoHttpLibrary wrapper to ensure global fetch support.

## Type Parameters

### T

`T`

## Parameters

### kc

`KubeConfig`

The active KubeConfig configuration context.

### apiClientType

(`config`) => `T`

The class constructor of the target API client (e.g. CoreV1Api, AuthorizationV1Api).

## Returns

`T`

An instantiated API client of type T.
