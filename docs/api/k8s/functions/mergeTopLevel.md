[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / mergeTopLevel

# Function: mergeTopLevel()

> **mergeTopLevel**(`base`, `overrides`): `TopLevelArgsType`

Defined in: src/k8s/merge.ts:86

Merges top-level pod creation metadata and parameters.
Automatically deep-merges labels and annotations objects.

## Parameters

### base

`TopLevelArgsType`

Base/default top-level options.

### overrides

`TopLevelArgsType`

Target overrides (e.g. from template or CLI arguments).

## Returns

`TopLevelArgsType`

Packaged merged metadata dictionary.
