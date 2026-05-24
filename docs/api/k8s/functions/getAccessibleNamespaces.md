[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / getAccessibleNamespaces

# Function: getAccessibleNamespaces()

> **getAccessibleNamespaces**(`api`, `mode`, `defaultNs`): `Promise`\<`string`[]\>

Defined in: src/k8s/config.ts:60

Discovers namespaces accessible by checking pod listing authorization.
If cluster-level namespace listing is forbidden, falls back to the default namespace.

## Parameters

### api

`ObjectCoreV1Api`

CoreV1Api client dependency.

### mode

`string`

Current operation mode (cluster or namespaced).

### defaultNs

`string`

Default namespace fallback.

## Returns

`Promise`\<`string`[]\>

Array of namespaces that are verified accessible.
