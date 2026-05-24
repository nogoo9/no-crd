[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / mergeContainersByName

# Function: mergeContainersByName()

> **mergeContainersByName**(`base`, `overrides`): `ContainerType`[]

Defined in: [src/k8s/merge.ts:31](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/merge.ts#L31)

Merges container configuration overrides into a list of base containers by name.
Overwrites simple fields directly and deep-merges environment variables by their key name.

## Parameters

### base

`ContainerType`[]

Array of original base container configurations.

### overrides

`ContainerOverrideType`[]

Array of container configuration overrides to apply.

## Returns

`ContainerType`[]

A new array of merged container configurations.
