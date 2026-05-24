[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / extractUserIdentity

# Function: extractUserIdentity()

> **extractUserIdentity**(`jwtPayload`, `jsonPathExpr?`): `string`

Defined in: [src/k8s/auth.ts:15](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/auth.ts#L15)

Extracts the user sub/identity identifier from a decrypted JWT payload object.
Evaluates the specified JsonPath expression (e.g. `"$.sub"` or `"$.identity"`) against the payload.

## Parameters

### jwtPayload

`unknown`

Decrypted JWT payload dictionary.

### jsonPathExpr?

`string` = `"$.sub"`

JSONPath expression specifying where the identity claim resides. Defaults to `"$.sub"`.

## Returns

`string`

The resolved identity string.

## Throws

An Error if the identity claim is missing or invalid.
