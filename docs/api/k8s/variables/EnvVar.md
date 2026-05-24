[@nogoo9/no-crd](../../index.md) / [k8s](../index.md) / EnvVar

# Variable: EnvVar

> `const` **EnvVar**: `ZodObject`\<\{ `name`: `ZodString`; `value`: `ZodOptional`\<`ZodString`\>; `valueFrom`: `ZodOptional`\<`ZodObject`\<\{ `configMapKeyRef`: `ZodOptional`\<`ZodObject`\<\{ `key`: `ZodString`; `name`: `ZodString`; `optional`: `ZodOptional`\<`ZodBoolean`\>; \}, `$strip`\>\>; `fieldRef`: `ZodOptional`\<`ZodObject`\<\{ `apiVersion`: `ZodOptional`\<`ZodString`\>; `fieldPath`: `ZodString`; \}, `$strip`\>\>; `resourceFieldRef`: `ZodOptional`\<`ZodObject`\<\{ `containerName`: `ZodOptional`\<`ZodString`\>; `divisor`: `ZodOptional`\<`ZodString`\>; `resource`: `ZodString`; \}, `$strip`\>\>; `secretKeyRef`: `ZodOptional`\<`ZodObject`\<\{ `key`: `ZodString`; `name`: `ZodString`; `optional`: `ZodOptional`\<`ZodBoolean`\>; \}, `$strip`\>\>; \}, `$strip`\>\>; \}, `$loose`\>

Defined in: [src/k8s/schemas.ts:5](https://github.com/nogoo9/no-crd/blob/1dbe20e20afc27f23800f31d83e85e04215781e1/src/k8s/schemas.ts#L5)
