---
trigger: always_on
description: Before any git push, all local checks must pass.
---

Before pushing to a remote (`git push`), run the `/test-local` workflow in order:

1. `bun run format` — Biome lint + auto-fix. **Stop if errors.**
2. `bun run typecheck` — TypeScript compiler. **Stop if any type errors.**
3. `moon run mcp:test` — all unit tests. **Stop if any failures.**
4. Run the `/security` workflow — Semgrep SAST scan on changed files. **Stop if any ERROR-severity findings remain unfixed.**

Only push if all four pass. If any fail, fix the issues first. Never force-push to `main`.
