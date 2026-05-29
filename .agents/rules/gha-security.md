---
trigger: model_decision
description: When modifying files under .github/workflows/, enforce SHA-pinned actions and run zizmor.
---

When any file under `.github/workflows/` is created or modified, run the `/gha-security` workflow before considering the task complete.

This ensures:

1. All `uses:` references are pinned to full commit SHAs (not mutable tags like `@v4`)
2. Every SHA is verified against the GitHub API (`gh api repos/{owner}/{repo}/git/ref/tags/{tag}`)
3. `zizmor` reports zero high/medium findings
