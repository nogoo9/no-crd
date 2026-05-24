[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / readTemplateMap

# Function: readTemplateMap()

> **readTemplateMap**(`coreApi`, `ns`, `name`): `Promise`\<`V1ConfigMap`\>

Defined in: src/k8s/templates.ts:48

Reads a single template ConfigMap by name in the target namespace.

## Parameters

### coreApi

`ObjectCoreV1Api`

CoreV1Api client dependency.

### ns

`string`

Target namespace.

### name

`string`

Name of the template ConfigMap.

## Returns

`Promise`\<`V1ConfigMap`\>

The matching raw ConfigMap resource.
