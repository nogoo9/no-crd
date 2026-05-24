---
description: Run the script to update the permissions mapping tables in the README and docs, then rebuild the static documentation site.
---

# Update Docs Workflow

1. Run `bun run update:permissions` to dynamically generate the RBAC permissions table based on `src/k8s/permissions.ts` and write it to `README.md` and `docs/permissions.md`.
2. Run `bun run build:docs` to rebuild the API Reference markdown pages via TypeDoc.
3. Run `bun run docs:build` to compile VitePress docs into static html assets, verifying that the entire documentation site builds successfully with zero compilation or rendering errors.
