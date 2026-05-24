[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / applySpawnerAnnotations

# Function: applySpawnerAnnotations()

> **applySpawnerAnnotations**(`spec`, `annotations`, `context?`): `object`

Defined in: [src/k8s/annotations.ts:12](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/annotations.ts#L12)

Evaluates spawner-specific annotations and applies the corresponding mutations
to the Pod spec (such as injecting initContainers, lifecycle hooks, and env vars).

## Parameters

### spec

Base Pod creation spec.

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

### annotations

`Record`\<`string`, `string`\>

Map of annotation keys and values.

### context?

`Record`\<`string`, `string`\> = `{}`

Dynamic context environment variables.

## Returns

`object`

Mutated Pod spec with annotations applied.

### activeDeadlineSeconds?

> `optional` **activeDeadlineSeconds?**: `number`

### affinity?

> `optional` **affinity?**: `object`

#### Index Signature

\[`key`: `string`\]: `unknown`

#### affinity.nodeAffinity?

> `optional` **nodeAffinity?**: `object`

#### affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution?

> `optional` **preferredDuringSchedulingIgnoredDuringExecution?**: `object`[]

#### affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution?

> `optional` **requiredDuringSchedulingIgnoredDuringExecution?**: `object`

#### affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms

> **nodeSelectorTerms**: `object`[]

#### affinity.podAffinity?

> `optional` **podAffinity?**: `object`

#### affinity.podAffinity.preferredDuringSchedulingIgnoredDuringExecution?

> `optional` **preferredDuringSchedulingIgnoredDuringExecution?**: `object`[]

#### affinity.podAffinity.requiredDuringSchedulingIgnoredDuringExecution?

> `optional` **requiredDuringSchedulingIgnoredDuringExecution?**: `object`[]

##### Index Signature

\[`key`: `string`\]: `unknown`

#### affinity.podAntiAffinity?

> `optional` **podAntiAffinity?**: `object`

#### affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution?

> `optional` **preferredDuringSchedulingIgnoredDuringExecution?**: `object`[]

#### affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution?

> `optional` **requiredDuringSchedulingIgnoredDuringExecution?**: `object`[]

##### Index Signature

\[`key`: `string`\]: `unknown`

### annotations?

> `optional` **annotations?**: `Record`\<`string`, `string`\>

### automountServiceAccountToken?

> `optional` **automountServiceAccountToken?**: `boolean`

### containers

> **containers**: `object`[]

#### Index Signature

\[`key`: `string`\]: `unknown`

### dnsPolicy?

> `optional` **dnsPolicy?**: `"None"` \| `"ClusterFirst"` \| `"ClusterFirstWithHostNet"` \| `"Default"`

### hostIPC?

> `optional` **hostIPC?**: `boolean`

### hostNetwork?

> `optional` **hostNetwork?**: `boolean`

### hostPID?

> `optional` **hostPID?**: `boolean`

### imagePullSecrets?

> `optional` **imagePullSecrets?**: `object`[]

### initContainers?

> `optional` **initContainers?**: `object`[]

#### Index Signature

\[`key`: `string`\]: `unknown`

### labels?

> `optional` **labels?**: `Record`\<`string`, `string`\>

### nodeName?

> `optional` **nodeName?**: `string`

### nodeSelector?

> `optional` **nodeSelector?**: `Record`\<`string`, `string`\>

### priority?

> `optional` **priority?**: `number`

### priorityClassName?

> `optional` **priorityClassName?**: `string`

### restartPolicy?

> `optional` **restartPolicy?**: `"Always"` \| `"Never"` \| `"OnFailure"`

### runtimeClassName?

> `optional` **runtimeClassName?**: `string`

### securityContext?

> `optional` **securityContext?**: `object`

#### Index Signature

\[`key`: `string`\]: `unknown`

#### securityContext.fsGroup?

> `optional` **fsGroup?**: `number`

#### securityContext.fsGroupChangePolicy?

> `optional` **fsGroupChangePolicy?**: `"Always"` \| `"OnRootMismatch"`

#### securityContext.runAsGroup?

> `optional` **runAsGroup?**: `number`

#### securityContext.runAsNonRoot?

> `optional` **runAsNonRoot?**: `boolean`

#### securityContext.runAsUser?

> `optional` **runAsUser?**: `number`

#### securityContext.seccompProfile?

> `optional` **seccompProfile?**: `object`

#### securityContext.seccompProfile.localhostProfile?

> `optional` **localhostProfile?**: `string`

#### securityContext.seccompProfile.type

> **type**: `"Unconfined"` \| `"RuntimeDefault"` \| `"Localhost"`

#### securityContext.seLinuxOptions?

> `optional` **seLinuxOptions?**: `object`

#### securityContext.seLinuxOptions.level?

> `optional` **level?**: `string`

#### securityContext.seLinuxOptions.role?

> `optional` **role?**: `string`

#### securityContext.seLinuxOptions.type?

> `optional` **type?**: `string`

#### securityContext.seLinuxOptions.user?

> `optional` **user?**: `string`

#### securityContext.supplementalGroups?

> `optional` **supplementalGroups?**: `number`[]

#### securityContext.sysctls?

> `optional` **sysctls?**: `object`[]

### serviceAccountName?

> `optional` **serviceAccountName?**: `string`

### terminationGracePeriodSeconds?

> `optional` **terminationGracePeriodSeconds?**: `number`

### tolerations?

> `optional` **tolerations?**: `object`[]

#### Index Signature

\[`key`: `string`\]: `unknown`

### topologySpreadConstraints?

> `optional` **topologySpreadConstraints?**: `object`[]

### volumes?

> `optional` **volumes?**: `object`[]

#### Index Signature

\[`key`: `string`\]: `unknown`
