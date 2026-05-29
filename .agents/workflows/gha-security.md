---
description: Verify GitHub Actions workflow security — enforce SHA-pinned actions and run zizmor.
---

# GitHub Actions Security Workflow

Run this workflow after creating or modifying any file under `.github/workflows/`.

## Step 1 — Verify SHA-pinned actions

For every `uses:` reference in the changed workflow files:

1. Confirm the reference uses a full 40-character commit SHA (not a mutable tag like `@v4` or `@main`).
2. Extract the owner, repo, tag comment, and SHA from each `uses:` line.
3. Verify each SHA against the GitHub API:

   ```bash
   # Get the tag object SHA
   TAG_SHA=$(gh api repos/{owner}/{repo}/git/ref/tags/{tag} --jq '.object.sha')

   # If the tag is annotated, resolve to the underlying commit
   COMMIT_SHA=$(gh api repos/{owner}/{repo}/git/tags/$TAG_SHA --jq '.object.sha' 2>/dev/null || echo "$TAG_SHA")

   # COMMIT_SHA must match the SHA in the workflow file
   ```

4. If any SHA does not match, **stop and fix it** before proceeding.

## Step 2 — Run zizmor scan

Execute `zizmor` on all workflow files:

```bash
# Recommended (fastest)
uvx zizmor .

# Fallback (if uv is not available)
pipx run zizmor .
```

## Step 3 — Triage findings

Review any warnings or errors reported by the scan.

- **High/Medium findings**: Must be addressed by fixing the vulnerability or applying a justified inline suppression (e.g., `# zizmor: ignore[rule-id]`).
- **Low/Informational findings**: Review and address if appropriate.

## Common rules

- All `uses:` must be pinned to a commit SHA with a `# vX.Y.Z` comment.
- All `actions/checkout` steps must set `persist-credentials: false`.
- Top-level `permissions` should use `read-all` or explicit least-privilege grants.

## Summary

Report:
- Number of `uses:` references verified.
- Any SHA mismatches found and fixed.
- Scanned workflow files.
- Number of zizmor findings by severity.
- Final scan status: ✅ clean or ❌ blocked.
