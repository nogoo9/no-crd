---
description: Run all local lint and tests (no infra required)
---

Run all lint and test checks that do **not** require infrastructure (Docker, k3d, etc.). These should always pass before any commit or PR.

## Step 1 — Lint & format

```bash
bun run format
```

Biome auto-fixes style issues. If it reports **errors** (not warnings), stop and fix them before continuing.

## Step 2 — Type checking

```bash
bun run typecheck
```

TypeScript compiler in project-references mode. Any type error is a hard failure — stop and fix before continuing.

## Step 3 — Unit tests

```bash
moon run mcp:test
```

Runs unit tests via Moon. All tests should pass. If any fail, note the test file and failing assertion and fix before continuing.

## Summary

All three steps must pass for the run to be considered clean. Report:
- ✅ Pass or ❌ Fail for each step
- Number of tests passed / failed / skipped
- Any warnings worth noting even if not blocking
