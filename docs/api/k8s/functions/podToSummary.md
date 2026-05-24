[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / podToSummary

# Function: podToSummary()

> **podToSummary**(`pod`): `object`

Defined in: src/k8s/pods.ts:14

Maps a full raw Kubernetes V1Pod structure to a simplified metadata and status summary.

## Parameters

### pod

`V1Pod`

Raw V1Pod object from Kubernetes API.

## Returns

`object`

Simple summary dictionary of the pod status and details.

### annotations

> **annotations**: `object`

#### Index Signature

\[`key`: `string`\]: `string`

### labels

> **labels**: `object`

#### Index Signature

\[`key`: `string`\]: `string`

### name

> **name**: `string`

### namespace

> **namespace**: `string`

### node

> **node**: `string`

### phase

> **phase**: `string`

### podIP

> **podIP**: `string`

### ready

> **ready**: `number`

### restarts

> **restarts**: `number`

### total

> **total**: `number`
