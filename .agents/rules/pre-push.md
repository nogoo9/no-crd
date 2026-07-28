---
trigger: always_on
description: Before any git push, all local checks must pass.
---

Before pushing to a remote (`git push`), run the `/test-local` workflow in order:

1. `bun run format` — Biome lint + auto-fix. **Stop if errors.**
2. `bun run lint` — Import boundary & path alias check (`scripts/check-imports.ts`). **Stop if errors.**
3. `bun run typecheck` — TypeScript compiler. **Stop if any type errors.**
4. `bun run test` / `moon run mcp:test` — all unit tests. **Stop if any failures.**
5. Run the `/security` workflow — Semgrep SAST scan on changed files. **Stop if any ERROR-severity findings remain unfixed.**

These checks are automatically enforced on `git push` via the Husky `pre-push` hook. Only push if all checks pass. Never bypass the Git hooks (e.g. do not use `git push --no-verify`). Never force-push to `main`.
