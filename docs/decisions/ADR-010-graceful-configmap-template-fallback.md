# ADR-010: Graceful ConfigMap Template Fallback

## Status
Accepted

## Date
2026-05-29

## Context

The MCP server's template system has three sources for pod templates, in priority order:

1. **ConfigMap templates** — Stored in-cluster as ConfigMaps with label `nogoo9/pod-template=true`. Requires `list`/`get` RBAC permissions on `configmaps`.
2. **Local templates** — JSON/YAML files in a configured `TEMPLATES_DIR` on disk.
3. **Built-in templates** — Bundled with the server in the built-in templates directory.

When the service account lacks `configmaps` RBAC permissions (a valid minimal deployment scenario — the operator only wants pod management without template ConfigMaps), several tools fail hard:

- **`list_templates`**: The `listTemplateMaps()` call throws a 403, and the outer catch returns an `errorResult` — discarding the local/built-in templates that would have been appended afterward.
- **`spawn_workspace`** with `templateRef`: The `readTemplateMap()` call throws a 403, and the handler returns an error — even if the template exists locally.
- **`create_pod_from_template`**: Already handles this correctly — uses `.catch(() => null)` on the ConfigMap read and falls through to `findLocalTemplate()`.

The permission system at startup correctly disables tools that require unavailable verbs (e.g., `create_template` won't be registered without `create configmaps`). However, `list_templates` and `get_template` are also disabled when `list`/`get configmaps` permissions are missing — preventing access to local/built-in templates entirely.

## Decision

Make the template system **always return local/built-in templates**, regardless of ConfigMap access:

### 1. `list_templates` — Graceful ConfigMap failure

Wrap the `listTemplateMaps()` call in a try/catch. On failure (403 or any error):
- Set `maps = []` and continue to the local/built-in template merge path.
- Log a warning: `"ConfigMap template listing failed (likely missing RBAC permissions). Local/built-in templates still available."`
- Include a warning prefix in the response text so the caller (agent or UI) is aware ConfigMap templates are unavailable.

Local/built-in templates are always appended in the merge step, with ConfigMap templates taking priority on name collisions when available.

### 2. `spawn_workspace` — Local template fallback

When `readTemplateMap()` fails for a `templateRef`, attempt `findLocalTemplate()` before returning an error. This mirrors the existing pattern in `create_pod_from_template`.

### 3. `findLocalTemplate` extraction

Move `findLocalTemplate()` from a private function in `templates.ts` to an exported function in `~/k8s/local-templates.ts`, re-exported via `~/k8s/index.ts`. This enables reuse in the spawner module.

### 4. Permission-gated registration adjustment

The `list_templates` and `get_template` tools should remain registerable even when `configmaps` permissions are missing, since they can serve local/built-in templates. This requires either:
- Removing the configmap permission requirement from these tools in `REQUIRED_PERMISSIONS`, or
- Unconditionally registering these two tools (they handle the missing permission gracefully at runtime).

**Chosen approach**: Remove the configmap permission gate for `list_templates` and `get_template` (since they work without it), keeping configmap permissions only for write tools and `create_pod_from_template`.

## Alternatives Considered

### Require configmaps permissions for all template operations
- Pros: Simple — if you want templates, you need ConfigMap access.
- Cons: Prevents using local/built-in templates in minimal deployments; the permission system completely disables template tools even though they could partially work.
- **Rejected**: Too restrictive. Local templates are a first-class feature and should not be gated behind ConfigMap RBAC.

### Separate tool registration for local vs. ConfigMap templates
- Pros: Clean separation of concerns.
- Cons: Doubles the tool surface area (e.g., `list_local_templates` + `list_configmap_templates`); agents would need to know which to call; breaks existing UI expectations.
- **Rejected**: Adds complexity for agents and users. A unified view with graceful degradation is simpler.

### Always disable template tools when configmap permissions are missing (current behavior)
- Pros: No partial-state scenarios; tools either fully work or don't exist.
- Cons: Loses access to local/built-in templates; forces operators to grant ConfigMap access even if they only use local templates.
- **Rejected**: This is the bug we're fixing. Local templates should always be accessible.

## Consequences

- **`list_templates` and `get_template` are always available**, even without ConfigMap RBAC. They return local/built-in templates in all cases, plus ConfigMap templates when permissions allow.
- **`spawn_workspace`** can use any template ref — ConfigMap, local, or built-in — with automatic fallback.
- **Write tools** (`create_template`, `update_template`, `delete_template`) remain correctly disabled when ConfigMap write permissions are unavailable.
- **Operators** deploying with minimal RBAC (pods-only) will see template tools working with local/built-in templates and clear warnings about missing ConfigMap access.
- **Warning messages** in tool responses give agents and the UI visibility into the degraded state without failing the operation.
