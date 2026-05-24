---
description: Install the default AI agent skills required for development workflows in this project.
---

# Setup Agent Skills

The `.agents/skills/` directory is listed in `.gitignore`. Skills are installed from [semgrep/skills](https://github.com/semgrep/skills) using the `skills` CLI.

## Install

```bash
bun x skills add semgrep/skills
bun x skills add addyosmani/agent-skills
```

This installs the required skills into `.agents/skills/`:

### `semgrep/skills`
- `semgrep`: SAST scanning — used by the `/security` workflow
- `code-security`: Secure coding guidelines for TypeScript/Node.js
- `llm-security`: OWASP LLM Top 10 for AI-adjacent code reviews

### `addyosmani/agent-skills`
- Dynamic general agent skills for Pair Programming, Git, DevOps, doubt-driven development, etc.

## Verification

```bash
ls .agents/skills/
# Expected to list all installed skills (e.g. code-security, doubtful-development, git-workflow-and-versioning, etc.)
```

## Updating skills

To update to the latest version, re-run the installation commands:

```bash
bun x skills add semgrep/skills
bun x skills add addyosmani/agent-skills
```
