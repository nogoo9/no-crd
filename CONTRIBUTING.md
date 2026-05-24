# Contributing to nogoo9

Thank you for your interest in contributing! This document outlines the development setup and conventions.

## Prerequisites

Run the environment setup workflow to verify all required tools:

```bash
# If using an AI agent
/setup-env

# Manual check
bun --version      # 1.3.11
node --version     # 22.14.0
moon --version     # 2.1.3
docker --version   # 20+
kubectl version --client
k3d --version
```

## Getting Started

```bash
# Clone the repository
git clone git@github.com:nogoo9/no-crd.git
cd no-crd

# Install pinned tool versions
proto use

# Install dependencies
bun install

# Verify everything works
bun run typecheck
moon run :test
```

## Development Workflow

### 1. Create a branch

```bash
git checkout -b feat/your-feature
```

### 2. Make changes

- Write tests before implementation (TDD)
- Follow existing code patterns and style
- Keep changes focused — one concern per PR

### 3. Format and check

```bash
bun run format     # Biome lint + auto-fix
bun run typecheck  # TypeScript check
```

### 4. Run tests

```bash
moon run :test     # All package tests
```

### 5. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(mcp): add pod template list tool
fix(router): handle missing namespace gracefully
docs: update README quick start section
chore: bump dependencies
```

### 6. Push and PR

```bash
git push origin feat/your-feature
```

Open a Pull Request against `main`.

## Code Style

- **Formatter**: Biome (tab indentation, double quotes)
- **Linter**: Biome (recommended rules)
- **No ESLint or Prettier** — use `bun run format` exclusively
- **TypeScript strict mode** — all packages use strict settings

## Monorepo Commands

| Command | Description |
|---|---|
| `bun install` | Install all dependencies |
| `bun run typecheck` | Type check all packages |
| `bun run lint` | Lint all packages |
| `bun run format` | Format + auto-fix all packages |
| `moon run :test` | Test all packages |
| `moon run :build` | Build all packages |
| `moon run <project>:<task>` | Run a specific task in a specific project |

## Testing

- **Unit tests**: Co-located as `*.test.ts` alongside source files
- **Run all**: `moon run :test`
- **Run specific**: `bun test apps/mcp/src/mcp/pods.test.ts`

## Project Structure

```
apps/         → Deployable applications (router, mcp, etc.)
packages/     → Shared libraries consumed by apps
infra/        → Infrastructure configs (k3d, manifests)
.agents/      → AI agent rules and workflows
.moon/        → Moon workspace configuration
.github/      → CI/CD workflows
```

## Questions?

Open an issue on [GitHub](https://github.com/nogoo9/no-crd/issues).
