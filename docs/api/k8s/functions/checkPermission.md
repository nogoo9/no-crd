[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / checkPermission

# Function: checkPermission()

> **checkPermission**(`authApi`, `verb`, `resource`, `namespace`): `Promise`\<`boolean`\>

Defined in: [src/k8s/permissions.ts:56](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/k8s/permissions.ts#L56)

Checks a specific Kubernetes RBAC permission using the SelfSubjectAccessReview API.
Always returns true if `DISABLE_PERMISSION_CHECKS` environment variable is active.

## Parameters

### authApi

`ObjectAuthorizationV1Api`

AuthorizationV1Api client dependency.

### verb

`string`

The API verb to check (e.g. "list", "create").

### resource

`string`

The Kubernetes resource name (e.g. "pods", "configmaps").

### namespace

`string`

The target namespace.

## Returns

`Promise`\<`boolean`\>

Promise resolving to true if authorization is granted.
