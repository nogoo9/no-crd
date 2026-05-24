[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / MODE

# Variable: MODE

> `const` **MODE**: `"cluster"` \| `"namespaced"`

Defined in: [src/k8s/config.ts:12](https://github.com/nogoo9/no-crd/blob/27a667fb9b3640e40f7ff22643ce29f64bc426b8/src/k8s/config.ts#L12)

Access mode for the orchestration manager.
- `"cluster"`: Allows operating across all namespaces if permissions permit.
- `"namespaced"`: Locks the server operation to a single namespace.
