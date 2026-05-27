---
description: Run a security scan on GitHub Actions workflows using zizmor.
---

# Zizmor Scan Workflow

Runs the zizmor security scanner locally to detect security misconfigurations in GitHub Actions workflow files.

## Step 1 — Run zizmor scan

Execute `zizmor` on the workspace directory using either `uv` (recommended) or `pipx`.

```bash
# Recommended (fastest)
uvx zizmor .

# Fallback (if uv is not available)
pipx run zizmor .
```

## Step 2 — Triage findings

Review any warnings or errors reported by the scan.

- **High/Medium findings**: Must be addressed by fixing the vulnerability or applying a justified inline comment suppression (e.g., `# zizmor: ignore[rule-id]`).
- **Low/Informational findings**: Review and address if appropriate.

## Summary

Report:
- Scanned workflow files.
- Number of findings by severity (High / Medium / Low / Informational).
- Any ignored or suppressed findings.
- Final scan status: ✅ clean or ❌ blocked.
