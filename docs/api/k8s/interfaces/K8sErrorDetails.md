[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / K8sErrorDetails

# Interface: K8sErrorDetails

Defined in: [src/k8s/errors.ts:24](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L24)

Represents structured details extracted from a Kubernetes API error.

## Properties

### body?

> `optional` **body?**: `unknown`

Defined in: [src/k8s/errors.ts:28](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L28)

Response body from the API server (usually contains error message string or object).

***

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [src/k8s/errors.ts:26](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/errors.ts#L26)

HTTP status code returned by the API server (e.g. 404, 409).
