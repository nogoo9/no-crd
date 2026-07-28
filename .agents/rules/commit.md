---
trigger: model_decision
description: When the user asks to commit, stage, or save changes to git.
---

When the user asks to commit, save, or stage changes, run the `/commit` workflow instead of calling `git add` / `git commit` directly. The workflow ensures:

1. Format, import linting (`bun run lint`), and typecheck pass before staging
2. `bun run build` and `npm pack --dry-run` verify package payload integrity
3. Files are reviewed for accidental secrets, artifacts, and scope creep
4. A Conventional Commit message is generated and confirmed by the user
5. **The subject line MUST be ≤72 characters.** Count before presenting. If it exceeds 72, shorten it.
6. Changes are staged and committed atomically

Commit messages are validated automatically via the Husky `commit-msg` hook. Never skip the safety review step. Never commit with `--no-verify`.
