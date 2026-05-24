[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / listTemplateMaps

# Function: listTemplateMaps()

> **listTemplateMaps**(`coreApi`, `ns`): `Promise`\<`V1ConfigMap`[]\>

Defined in: [src/k8s/templates.ts:23](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/templates.ts#L23)

Lists all template ConfigMap resources located in the target namespace.
Filters resources matching `TEMPLATE_LABEL` (`nogoo9/pod-template=true`).

## Parameters

### coreApi

`ObjectCoreV1Api`

CoreV1Api client dependency.

### ns

`string`

Target namespace.

## Returns

`Promise`\<`V1ConfigMap`[]\>

Array of ConfigMap resources representing templates.
