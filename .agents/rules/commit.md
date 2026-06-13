---
trigger: model_decision
description: When the user asks to commit, stage, or save changes to git.
---

When the user asks to commit, save, or stage changes, run the `/commit` workflow instead of calling `git add` / `git commit` directly. The workflow ensures:

1. Format + typecheck pass before staging
2. Files are reviewed for accidental secrets, artifacts, and scope creep
3. A Conventional Commit message is generated and confirmed by the user
4. **The subject line MUST be ≤72 characters.** Count before presenting. If it exceeds 72, shorten it.
5. Changes are staged and committed atomically

Commit messages are validated automatically via the Husky `commit-msg` hook. Never skip the safety review step. Never commit with `--no-verify`.
