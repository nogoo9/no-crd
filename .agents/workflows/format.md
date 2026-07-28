---
description: Format the code, check imports, and run type checking across all packages.
---

# Code Formatting & Quality Gate Workflow

1. Run `bun run format` to lint, auto-fix, and format code with Biome across all packages.
2. Run `bun run lint` to execute import integrity checks via `scripts/check-imports.ts`.
3. Run `bun run typecheck` to verify TypeScript types with zero errors (project-references build).
