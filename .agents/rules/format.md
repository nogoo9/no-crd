---
trigger: always_on
description: After any code change, run format, import linting, and typecheck before stopping.
---

After making any code changes, run the `/format` workflow:

1. `bun run format` — Biome lint + auto-fix (runs project-wide)
2. `bun run lint` — Import boundary & path alias check (`scripts/check-imports.ts`)
3. `bun run typecheck` — TypeScript build check

All checks are also run automatically on `git commit` via the Husky `pre-commit` hook. Do not consider a coding task complete until all three pass with zero errors.
