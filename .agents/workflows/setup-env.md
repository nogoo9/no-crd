---
description: Full environment check — verifies required tools, installs deps, runs smoke tests, then sets up skills.
---

# Environment Setup Workflow

Run this after cloning to confirm your local environment is ready for development.

## Step 1 — Check required tools

Run each check. Fix any ❌ before continuing.

### Bun (runtime, package manager, test runner)

```bash
bun --version
```

Must match the pinned version in `.prototools` (`1.3.11`). Install or update via [Proto](https://moonrepo.dev/proto):

```bash
proto use
```

Or install Bun directly: https://bun.sh

---

### Node.js

```bash
node --version
```

Must match `.prototools` (`22.14.0`). Managed via Proto.

---

### Moon (task runner)

```bash
moon --version
```

Must match `.prototools` (`2.1.3`). Install via Proto:

```bash
proto install moon
```

---

### Docker + Docker Compose (k3d cluster, container builds)

```bash
docker --version          # need Engine 20+
docker compose version    # need Compose v2 (not docker-compose v1)
docker info               # confirms the daemon is running
```

Docker is required for building container images and running the local k3d cluster.

---

### kubectl (Kubernetes CLI)

```bash
kubectl version --client
```

Required for interacting with the k3d cluster.

---

### k3d (local k8s cluster)

```bash
k3d --version
```

Required for local development and testing. Install from https://k3d.io

---

### Semgrep CLI (SAST — required by `/security` workflow)

```bash
semgrep --version
```

Required before every `git push`. Install:

```bash
python3 -m pip install semgrep
```

---

### Git

```bash
git --version
```

Required. Any recent version (2.x+) is fine.

---

## Step 2 — Install dependencies

```bash
bun install
```

---

## Step 3 — Smoke tests

Verify the build is healthy with no infra required:

```bash
bun run typecheck   # zero TypeScript errors
moon run mcp:test   # all tests pass
```

---

## Step 4 — Set up AI agent skills

Skills are installed from [semgrep/skills](https://github.com/semgrep/skills) and are gitignored:

```bash
bun x skills add semgrep/skills
```

Installs `semgrep`, `code-security`, and `llm-security` into `.agents/skills/`. Required by the `/security` workflow.

---

## Summary

Report the result as a table:

| Check | Result |
|---|---|
| Bun `1.3.11` | ✅ / ❌ |
| Node `22.14.0` | ✅ / ❌ |
| Moon `2.1.3` | ✅ / ❌ |
| Docker Engine 20+ | ✅ / ❌ |
| Docker Compose v2 | ✅ / ❌ |
| Docker daemon running | ✅ / ❌ |
| kubectl | ✅ / ❌ |
| k3d | ✅ / ❌ |
| Semgrep CLI | ✅ / ❌ |
| Git | ✅ / ❌ |
| `bun install` | ✅ / ❌ |
| `bun run typecheck` | ✅ / ❌ |
| `moon run mcp:test` | ✅ / ❌ |
| Agent skills | ✅ / ❌ |

All items must be ✅ before starting development.
