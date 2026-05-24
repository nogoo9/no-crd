[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / evaluatePermissions

# Function: evaluatePermissions()

> **evaluatePermissions**(`k8sContext`, `namespace`, `mode`, `forceRefresh?`): `Promise`\<[`PermissionReport`](../interfaces/PermissionReport.md)\>

Defined in: [src/k8s/permissions.ts:119](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/k8s/permissions.ts#L119)

Evaluates the required permissions for all registered MCP tools and constructs a PermissionReport.
Under `"namespaced"` mode, some checks (such as namespace listing) are adjusted/bypassed.
Uses caching to optimize startup and requests unless `forceRefresh` is enabled.

## Parameters

### k8sContext

[`K8sContext`](../interfaces/K8sContext.md)

Active K8sContext containing API clients.

### namespace

`string`

The default namespace parameter.

### mode

`string`

The active mode (cluster or namespaced).

### forceRefresh?

`boolean` = `false`

Force reloading permissions even if cached report exists.

## Returns

`Promise`\<[`PermissionReport`](../interfaces/PermissionReport.md)\>

Structured PermissionReport containing permitted verbs and enabled/disabled lists.
