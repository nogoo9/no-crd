[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / K8sErrorDetails

# Interface: K8sErrorDetails

Defined in: src/k8s/errors.ts:24

Represents structured details extracted from a Kubernetes API error.

## Properties

### body?

> `optional` **body?**: `unknown`

Defined in: src/k8s/errors.ts:28

Response body from the API server (usually contains error message string or object).

***

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: src/k8s/errors.ts:26

HTTP status code returned by the API server (e.g. 404, 409).
