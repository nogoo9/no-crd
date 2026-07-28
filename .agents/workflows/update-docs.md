---
description: Run permissions sync, Deep Wiki generation, documentation accuracy audit, TypeDoc API generation, and VitePress site build.
---

# Update Docs Workflow

1. Inspect changes since the last version (using `git diff` or checking recent git commit history) to identify new features, capabilities, configuration changes, or platform compatibility warnings.
2. Verify that `docs/whats-new.md` is updated with release notes describing these changes.
3. Ensure any new configuration variables, tools, or compatibility caveats (such as the Bun WebSocket regression) are documented in the respective user guides (e.g., `README.md`, `getting-started.md`, `docs/deploy/configuration.md`).
4. Run `bun run update:permissions` to dynamically generate the RBAC permissions table, configuration tables, annotation keys, and auto-sync ADRs into `docs/.vitepress/config.ts` via `scripts/update-docs.ts`.
5. Run the `/generate-deep-wiki` workflow (`.agents/workflows/generate-deep-wiki.md`) to audit codebase changes, update Deep Wiki articles in `docs/wiki/`, and sync VitePress navigation.
6. Run the `/audit-docs-accuracy` workflow (`.agents/workflows/audit-docs-accuracy.md`) to verify that all tool descriptions, parameter schemas, and state machine flowcharts match ground truth code.
7. Run `bun run build:docs` to rebuild the API Reference markdown pages via TypeDoc.
8. Run `bun run docs:build` to compile VitePress docs into static HTML assets, verifying that the entire site builds cleanly with zero compilation or broken link errors.
