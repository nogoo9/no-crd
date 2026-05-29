# ADR-007: Schema-Driven Configuration & Unified Annotation Keys

## Status
Accepted

## Date
2026-05-29

## Context
As the project evolved, configuration parameters and Kubernetes metadata keys (labels/annotations) were scattered, duplicated, and hardcoded in multiple places:
- **CLI Options**: Hardcoded string arrays in the CLI wrapper (`src/cli.ts`) for argument parsing, validation, and print help.
- **Documentation**: Manual markdown tables in `README.md`, `getting-started.md`, and other guides, leading to a high risk of code-doc drift.
- **Annotation/Label Keys**: Magic strings (e.g. `"nogoo9/workspace-id"`, `"nogoo9/user-sub"`) duplicated across multiple files (`src/k8s/annotations.ts`, `src/k8s/pods.ts`, `src/mcp/spawner.ts`, `src/server/auth.ts`, `src/server/ws-proxy.ts`, `src/server/routes/mcp.ts`).

This duplication increased maintenance overhead, made adding new settings error-prone, and made verification difficult.

## Decision
Consolidate configuration parameters and Kubernetes keys into a single schema-driven architecture:

1. **Modular Configuration Schemas**: Restructure settings under `src/config/` (categorized into `server`, `tls`, `cors`, `k8s`, `auth`, `ui`) as type-safe schema objects containing CLI flags, environment variables, default values, validations, and descriptions.
2. **Single Source of Truth**:
   - **CLI Parsing**: Refactor `src/cli.ts` to dynamically resolve flags, validate inputs, enforce types, and print help guides directly from the schemas.
   - **Documentation Generation**: Build a workspace script (`scripts/update-docs.ts`) that extracts metadata directly from `src/config/index.ts` and injects updated tables into markdown documents automatically via placeholder tags.
3. **Consolidated Annotation Constants**: Move all Kubernetes label and annotation keys into `ANNOTATION_KEYS` in `src/config/annotations.ts`. Re-export this map through the main config module and refactor the codebase to reference these constants instead of magic strings.

## Alternatives Considered

### Keep Hardcoded Logic
- **Pros**: Zero initial refactoring.
- **Cons**: High likelihood of forgetting to update the CLI help text, documentation files, or one of the many magic strings when adding features.
- **Rejected**: Does not scale and violates the codebase quality standards.

### Use Third-Party Config Libraries (e.g., Convict, Zod Config)
- **Pros**: Ready-made schema validation.
- **Cons**: Adds external dependencies, increases bundle size, and introduces potential runtime compatibility issues across Deno, Bun, and Node.js.
- **Rejected**: A lightweight, native TypeScript schema implementation is simpler, cross-runtime safe, and easier to integrate with our custom markdown docs generator.

## Consequences
- **Zero Drift**: Documentation and CLI instructions are guaranteed to be in sync with the codebase.
- **Robust CLI**: CLI arguments are validated (such as ensuring ports are numbers, or options are within allowed sets) and coerced automatically.
- **Clean Codebase**: Removed magic strings for Kubernetes metadata, eliminating typo risks and simplifying renaming or auditing keys.
- **Cross-Runtime Safety**: All schema parsing is built on standard JS/TS features, keeping compatibility green across Bun, Node, and Deno.
- **Encapsulated Config**: Deleted wrapper `src/config.ts` and pointed all imports to `src/config/index.js`, sealing configuration logic inside the `src/config/` folder.
