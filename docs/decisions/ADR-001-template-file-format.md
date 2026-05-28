# ADR-001: Support YAML and JSON for Pod Template Files

## Status
Accepted

## Date
2026-05-28

## Context
Pod templates define the container spec used to spawn workspaces. Until v0.3.x, templates were stored exclusively as Kubernetes ConfigMaps with `data.spec` containing a JSON string. In v0.4.0, we are adding local filesystem template support (`TEMPLATES_DIR`) so templates can be baked into the Docker image or mounted from a host path.

We need to choose the file format for these local template files and decide whether to also accept YAML in the existing ConfigMap `data.spec` field.

Key requirements:
- Familiar to Kubernetes users (our primary audience)
- Able to carry both metadata (name, annotations) and the pod spec in one file
- Support comments for documentation
- Backward-compatible with existing JSON-based ConfigMap templates

## Decision
Support **both YAML (default) and JSON** for local template files, with auto-detection for ConfigMap `data.spec`.

- **Local files**: File extension determines the parser — `.yaml`/`.yml` → YAML, `.json` → JSON.
- **ConfigMap `data.spec`**: Auto-detect — if the string starts with `{`, parse as JSON; otherwise parse as YAML. This is backward-compatible since all existing templates use JSON.
- **Default/recommended format**: YAML, since it's the k8s-native format.

### Wrapped file format
Each file contains both metadata and spec in a structure mirroring k8s manifests:

```yaml
metadata:
  name: workspace-terminal
  annotations:
    nogoo9/description: "Interactive web terminal"
    nogoo9/tag: terminal
spec:
  containers:
    - name: agent
      image: tsl0922/ttyd:latest
```

## Alternatives Considered

### JSON only
- Pros: Simpler parser, no additional dependency
- Cons: Not the k8s standard; no comments; more verbose
- Rejected: Users expect YAML when working with k8s

### YAML only (no JSON)
- Pros: Single parser, consistent format
- Cons: Breaks backward compatibility with existing ConfigMap `data.spec` (all stored as JSON)
- Rejected: Must remain backward-compatible with existing templates

### Separate metadata sidecar files
- Pros: Spec file is a plain pod spec
- Cons: Two files per template; easy to orphan metadata files
- Rejected: Single-file format is simpler to manage and deploy

## Consequences
- `js-yaml` becomes an explicit dependency (already a transitive dep from `@kubernetes/client-node`)
- Existing JSON-based ConfigMap templates continue to work unchanged
- New templates can be written in YAML for a more natural k8s experience
- A shared `parseSpecString()` utility handles auto-detection for both local and ConfigMap sources
