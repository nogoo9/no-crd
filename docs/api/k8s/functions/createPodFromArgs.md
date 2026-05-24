[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / createPodFromArgs

# Function: createPodFromArgs()

> **createPodFromArgs**(`coreApi`, `ns`, `name`, `args`): `Promise`\<\{ `name`: `string`; `namespace`: `string`; `text`: `string`; \}\>

Defined in: src/k8s/pods.ts:106

Constructs a Pod manifest from specific creation arguments, posts it to the
Kubernetes API, and returns a confirmation summary.

## Parameters

### coreApi

`ObjectCoreV1Api`

CoreV1Api client dependency.

### ns

`string`

Target namespace.

### name

`string`

Desired pod name.

### args

Spec, label, and lifecycle arguments to configure the Pod.

#### activeDeadlineSeconds?

`number` = `...`

#### affinity?

\{\[`key`: `string`\]: `unknown`; `nodeAffinity?`: \{ `preferredDuringSchedulingIgnoredDuringExecution?`: `object`[]; `requiredDuringSchedulingIgnoredDuringExecution?`: \{ `nodeSelectorTerms`: `object`[]; \}; \}; `podAffinity?`: \{ `preferredDuringSchedulingIgnoredDuringExecution?`: `object`[]; `requiredDuringSchedulingIgnoredDuringExecution?`: `object`[]; \}; `podAntiAffinity?`: \{ `preferredDuringSchedulingIgnoredDuringExecution?`: `object`[]; `requiredDuringSchedulingIgnoredDuringExecution?`: `object`[]; \}; \} = `...`

#### affinity.nodeAffinity?

\{ `preferredDuringSchedulingIgnoredDuringExecution?`: `object`[]; `requiredDuringSchedulingIgnoredDuringExecution?`: \{ `nodeSelectorTerms`: `object`[]; \}; \} = `...`

#### affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution?

`object`[] = `...`

#### affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution?

\{ `nodeSelectorTerms`: `object`[]; \} = `...`

#### affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms

`object`[] = `...`

#### affinity.podAffinity?

\{ `preferredDuringSchedulingIgnoredDuringExecution?`: `object`[]; `requiredDuringSchedulingIgnoredDuringExecution?`: `object`[]; \} = `...`

#### affinity.podAffinity.preferredDuringSchedulingIgnoredDuringExecution?

`object`[] = `...`

#### affinity.podAffinity.requiredDuringSchedulingIgnoredDuringExecution?

`object`[] = `...`

#### affinity.podAntiAffinity?

\{ `preferredDuringSchedulingIgnoredDuringExecution?`: `object`[]; `requiredDuringSchedulingIgnoredDuringExecution?`: `object`[]; \} = `...`

#### affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution?

`object`[] = `...`

#### affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution?

`object`[] = `...`

#### annotations?

`Record`\<`string`, `string`\> = `...`

#### automountServiceAccountToken?

`boolean` = `...`

#### containers

`object`[] = `...`

#### dnsPolicy?

`"None"` \| `"ClusterFirst"` \| `"ClusterFirstWithHostNet"` \| `"Default"` = `...`

#### hostIPC?

`boolean` = `...`

#### hostNetwork?

`boolean` = `...`

#### hostPID?

`boolean` = `...`

#### imagePullSecrets?

`object`[] = `...`

#### initContainers?

`object`[] = `...`

#### labels?

`Record`\<`string`, `string`\> = `...`

#### nodeName?

`string` = `...`

#### nodeSelector?

`Record`\<`string`, `string`\> = `...`

#### priority?

`number` = `...`

#### priorityClassName?

`string` = `...`

#### restartPolicy?

`"Always"` \| `"Never"` \| `"OnFailure"` = `...`

#### runtimeClassName?

`string` = `...`

#### securityContext?

\{\[`key`: `string`\]: `unknown`; `fsGroup?`: `number`; `fsGroupChangePolicy?`: `"Always"` \| `"OnRootMismatch"`; `runAsGroup?`: `number`; `runAsNonRoot?`: `boolean`; `runAsUser?`: `number`; `seccompProfile?`: \{ `localhostProfile?`: `string`; `type`: `"Unconfined"` \| `"RuntimeDefault"` \| `"Localhost"`; \}; `seLinuxOptions?`: \{ `level?`: `string`; `role?`: `string`; `type?`: `string`; `user?`: `string`; \}; `supplementalGroups?`: `number`[]; `sysctls?`: `object`[]; \} = `...`

#### securityContext.fsGroup?

`number` = `...`

#### securityContext.fsGroupChangePolicy?

`"Always"` \| `"OnRootMismatch"` = `...`

#### securityContext.runAsGroup?

`number` = `...`

#### securityContext.runAsNonRoot?

`boolean` = `...`

#### securityContext.runAsUser?

`number` = `...`

#### securityContext.seccompProfile?

\{ `localhostProfile?`: `string`; `type`: `"Unconfined"` \| `"RuntimeDefault"` \| `"Localhost"`; \} = `...`

#### securityContext.seccompProfile.localhostProfile?

`string` = `...`

#### securityContext.seccompProfile.type

`"Unconfined"` \| `"RuntimeDefault"` \| `"Localhost"` = `...`

#### securityContext.seLinuxOptions?

\{ `level?`: `string`; `role?`: `string`; `type?`: `string`; `user?`: `string`; \} = `...`

#### securityContext.seLinuxOptions.level?

`string` = `...`

#### securityContext.seLinuxOptions.role?

`string` = `...`

#### securityContext.seLinuxOptions.type?

`string` = `...`

#### securityContext.seLinuxOptions.user?

`string` = `...`

#### securityContext.supplementalGroups?

`number`[] = `...`

#### securityContext.sysctls?

`object`[] = `...`

#### serviceAccountName?

`string` = `...`

#### terminationGracePeriodSeconds?

`number` = `...`

#### tolerations?

`object`[] = `...`

#### topologySpreadConstraints?

`object`[] = `...`

#### volumes?

`object`[] = `...`

## Returns

`Promise`\<\{ `name`: `string`; `namespace`: `string`; `text`: `string`; \}\>

Description text, actual name, and namespace of the created Pod.
