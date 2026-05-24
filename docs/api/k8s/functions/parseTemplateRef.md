[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / parseTemplateRef

# Function: parseTemplateRef()

> **parseTemplateRef**(`ref`, `defaultNs`): `object`

Defined in: [src/k8s/templates.ts:71](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/templates.ts#L71)

Parses an MCP resource template URI or string into namespace and name components.
Format support: `pod-template://{namespace}/{name}` or bare `{name}`.

## Parameters

### ref

`string`

Raw template reference URI/string.

### defaultNs

`string`

Default namespace fallback if no namespace is in the ref.

## Returns

`object`

Object holding the parsed namespace and name.

### name

> **name**: `string`

### ns

> **ns**: `string`
