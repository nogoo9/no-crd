# GitHub Actions Security Scanning

This document outlines the security architecture and configuration for securing our GitHub Actions workflows in `nogoo9/no-crd`.

## Rationale & Tool Selection

Securing GitHub Actions is critical to prevent supply-chain attacks, credential exfiltration, and unauthorized code execution. We evaluated several tools:

1. **[actionlint](https://github.com/rhysd/actionlint)**: Analyzes workflow structure, YAML correctness, triggers, and syntax. It is the best tool for checking syntax errors, mistyped expressions, missing actions, and shell script injection within workflows.
2. **[zizmor](https://github.com/woodruffw/zizmor)**: A security-focused static analyzer for GitHub Actions. It detects security misconfigurations such as template injection, over-permissioned tokens, unpinned actions, and risky triggers.
3. **poutine** & **octoscan**: Excluded because poutine is designed for multi-repo org-level scans, and octoscan's injection checks are a subset of what zizmor covers.

By pairing `actionlint` with `zizmor`, we achieve comprehensive syntax verification and security hardening with minimum tooling overhead.

## Security Practices

We enforce the following rules in our workflows:
- **Job-Level Permissions**: Do not define global `permissions` blocks. Grant explicit, minimal permissions to individual jobs (e.g., `permissions: contents: read`).
- **Action Pinning**: All third-party actions must be pinned to full SHA commits rather than mutable tags (e.g., `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` instead of `@v4`).
- **Input Sanitization**: Avoid directly interpolating untrusted context values (like <code v-pre>${{ github.event.issue.title }}</code>) into bash scripts to prevent command injection.

## CI/CD Integration

The workflow is located in [.github/workflows/gha-security.yml](file:///home/eterna2/github/nogoo9-no-crd/.github/workflows/gha-security.yml). It is configured to run on:
- Pushes to the `main` branch affecting `.github/workflows/**`.
- Pull requests targeting `main` affecting `.github/workflows/**`.

### Running Locally

To run these checks locally:

```bash
# Run actionlint (requires actionlint binary installed)
actionlint

# Run zizmor (requires python/pipx)
pipx run zizmor .
```
