[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / resolveNamespace

# Function: resolveNamespace()

> **resolveNamespace**(`requested`, `mode`, `defaultNs`): `string`

Defined in: src/k8s/config.ts:34

Resolves the target namespace based on the current mode and requested namespace.
Under `"namespaced"` mode, always returns the locked default namespace.

## Parameters

### requested

`string` \| `undefined`

The requested namespace parameter.

### mode

`string`

The current active MODE.

### defaultNs

`string`

The default namespace fallback.

## Returns

`string`

The resolved namespace to execute workloads in.
