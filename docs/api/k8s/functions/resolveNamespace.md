[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / resolveNamespace

# Function: resolveNamespace()

> **resolveNamespace**(`requested`, `mode`, `defaultNs`): `string`

Defined in: [src/k8s/config.ts:34](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/config.ts#L34)

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
