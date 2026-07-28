---
description: Run all local lint and tests (no infra required)
---

Run all lint and test checks that do **not** require infrastructure (Docker, k3d, etc.). These should always pass before any commit or PR.

## Step 1 — Lint & format

```bash
bun run format
bun run lint
```

Biome auto-fixes style issues, while `bun run lint` validates import boundaries (`scripts/check-imports.ts`). If either reports **errors**, stop and fix them before continuing.

## Step 2 — Type checking

```bash
bun run typecheck
```

TypeScript compiler in project-references mode. Any type error is a hard failure — stop and fix before continuing.

## Step 3 — Unit tests

```bash
bun run test
moon run mcp:test
```

Runs all unit tests. All tests must pass cleanly with 0 failures before proceeding.

## Summary

All three steps must pass for the run to be considered clean. Report:
- ✅ Pass or ❌ Fail for each step
- Number of tests passed / failed / skipped
- Any warnings worth noting even if not blocking
