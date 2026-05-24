[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / getK8sError

# Function: getK8sError()

> **getK8sError**(`err`): [`K8sErrorDetails`](../interfaces/K8sErrorDetails.md)

Defined in: src/k8s/errors.ts:37

Normalizes a thrown error and attempts to extract Kubernetes API-specific HTTP details.

## Parameters

### err

`unknown`

The thrown error object.

## Returns

[`K8sErrorDetails`](../interfaces/K8sErrorDetails.md)

Structured error details with statusCode and body if found.
