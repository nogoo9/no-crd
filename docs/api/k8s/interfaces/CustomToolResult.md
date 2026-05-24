[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / CustomToolResult

# Interface: CustomToolResult\<T\>

Defined in: [src/k8s/errors.ts:7](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L7)

## Extends

- `CallToolResult`

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### \_meta?

> `optional` **\_meta?**: `object`

Defined in: node\_modules/@modelcontextprotocol/sdk/dist/esm/types.d.ts:2502

#### Index Signature

\[`key`: `string`\]: `unknown`

##### io.modelcontextprotocol/related-task?

> `optional` **io.modelcontextprotocol/related-task?**: `object`

If specified, this request is related to the provided task.

##### io.modelcontextprotocol/related-task.taskId

> **taskId**: `string`

#### progressToken?

> `optional` **progressToken?**: `string` \| `number`

If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.

#### Inherited from

`CallToolResult._meta`

***

### code

> **code**: `number`

Defined in: [src/k8s/errors.ts:12](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L12)

***

### content

> **content**: `object`[]

Defined in: [src/k8s/errors.ts:10](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L10)

#### text

> **text**: `string`

#### type

> **type**: `"text"`

#### Overrides

`CallToolResult.content`

***

### isError

> **isError**: `true`

Defined in: [src/k8s/errors.ts:11](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L11)

#### Overrides

`CallToolResult.isError`

***

### message

> **message**: `string`

Defined in: [src/k8s/errors.ts:13](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L13)

***

### structuredContent?

> `optional` **structuredContent?**: `T`

Defined in: [src/k8s/errors.ts:14](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L14)

#### Overrides

`CallToolResult.structuredContent`
