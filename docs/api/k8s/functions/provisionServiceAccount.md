[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / provisionServiceAccount

# Function: provisionServiceAccount()

> **provisionServiceAccount**(`coreApi`, `ns`, `workspaceId`, `roleArn`): `Promise`\<`string`\>

Defined in: src/k8s/pods.ts:43

Provisions a Kubernetes ServiceAccount in the target namespace and annotates it
with an AWS IAM Role ARN for EKS service account role mapping.

## Parameters

### coreApi

`ObjectCoreV1Api`

CoreV1Api client dependency.

### ns

`string`

Target namespace.

### workspaceId

`string`

Unique Workspace ID mapping.

### roleArn

`string`

The AWS IAM Role ARN.

## Returns

`Promise`\<`string`\>

The generated ServiceAccount name string.
