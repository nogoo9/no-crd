[@nogoo9/no-crd](../index.md) / k8s

# k8s

## Interfaces

- [CustomToolResult](interfaces/CustomToolResult.md)
- [K8sContext](interfaces/K8sContext.md)
- [K8sErrorDetails](interfaces/K8sErrorDetails.md)
- [PermissionReport](interfaces/PermissionReport.md)

## Type Aliases

- [HealthResponse](type-aliases/HealthResponse.md)
- [PodCreateArgs](type-aliases/PodCreateArgs.md)
- [PodPhase](type-aliases/PodPhase.md)

## Variables

- [Container](variables/Container.md)
- [DEFAULT\_NAMESPACE](variables/DEFAULT_NAMESPACE.md)
- [DESCRIPTION\_ANNOTATION](variables/DESCRIPTION_ANNOTATION.md)
- [EnvFromSource](variables/EnvFromSource.md)
- [EnvVar](variables/EnvVar.md)
- [LABELS](variables/LABELS.md)
- [MODE](variables/MODE.md)
- [PodSpecSchema](variables/PodSpecSchema.md)
- [REQUIRED\_PERMISSIONS](variables/REQUIRED_PERMISSIONS.md)
- [ResourceQuantity](variables/ResourceQuantity.md)
- [TAG\_ANNOTATION](variables/TAG_ANNOTATION.md)
- [TEMPLATE\_LABEL](variables/TEMPLATE_LABEL.md)
- [TEMPLATE\_LABEL\_KEY](variables/TEMPLATE_LABEL_KEY.md)
- [Volume](variables/Volume.md)

## Functions

- [applySpawnerAnnotations](functions/applySpawnerAnnotations.md)
- [checkPermission](functions/checkPermission.md)
- [createPodFromArgs](functions/createPodFromArgs.md)
- [errorResult](functions/errorResult.md)
- [evaluatePermissions](functions/evaluatePermissions.md)
- [extractUserIdentity](functions/extractUserIdentity.md)
- [getAccessibleNamespaces](functions/getAccessibleNamespaces.md)
- [getK8sError](functions/getK8sError.md)
- [initK8sContext](functions/initK8sContext.md)
- [listTemplateMaps](functions/listTemplateMaps.md)
- [makeApiClient](functions/makeApiClient.md)
- [mergeContainersByName](functions/mergeContainersByName.md)
- [mergeTopLevel](functions/mergeTopLevel.md)
- [parseTemplateRef](functions/parseTemplateRef.md)
- [podToSummary](functions/podToSummary.md)
- [provisionServiceAccount](functions/provisionServiceAccount.md)
- [readTemplateMap](functions/readTemplateMap.md)
- [resolveNamespace](functions/resolveNamespace.md)
