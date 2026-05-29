---
description: Run the script to update the permissions mapping tables in the README and docs, then rebuild the static documentation site.
---

# Update Docs Workflow

1. Inspect changes since the last version (using `git diff` or checking recent git commit history) to identify new features, capabilities, configuration changes, or platform compatibility warnings.
2. Verify that `docs/whats-new.md` is updated with release notes describing these changes.
3. Ensure any new configuration variables, tools, or compatibility caveats (such as the Bun WebSocket regression) are documented in the respective user guides (e.g., `README.md`, `getting-started.md`, `bun-websocket-proxy.md`).
4. Run `bun run update:permissions` to dynamically generate the RBAC permissions table and configuration environment variables table (based on `src/k8s/permissions.ts` and `src/config.ts`), writing them to `README.md`, `docs/permissions.md`, and `docs/getting-started.md` via `scripts/update-docs.ts`.
5. Run `bun run build:docs` to rebuild the API Reference markdown pages via TypeDoc.
6. Run `bun run docs:build` to compile VitePress docs into static html assets, verifying that the entire documentation site builds successfully with zero compilation or rendering errors.
