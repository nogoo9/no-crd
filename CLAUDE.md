# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

`nogoo9` is a platform providing agent-driven, on-demand pod orchestration for Kubernetes (k8s/k3s) **without Custom Resource Definitions**. It enables AI agents and APIs to dynamically spin up, route to, and manage ephemeral workloads — similar to JupyterHub or cloud IDE services, but agnostic to actual use cases.

The platform is delivered as:
- **MCP Server** — exposes pod lifecycle tools to AI agents via the Model Context Protocol.

## Commands

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Lint (Biome)
bun run lint

# Format / auto-fix (Biome)
bun run format

# Run dev server on specific runtimes (from source)
bun run dev:bun
bun run dev:deno
bun run dev:node

# Run MCP server on specific runtimes (from built bundle)
bun run run:bun
bun run run:deno
bun run run:node

# Run tests via Moon
moon run mcp:test

# Run tests directly via Bun
bun test

# Build package via Moon (Node target)
moon run mcp:build

# Start MCP server (HTTP)
moon run mcp:dev

# Start MCP server (STDIO)
moon run mcp:dev-stdio

# Build Docker image
moon run mcp:docker-build

# Deploy MCP to local k3d cluster
moon run mcp:deploy
moon run mcp:deploy-wsl
```

## Toolchain

Proto pins Bun (`1.3.11`), Node (`22.14.0`), Deno (`2.1.4`), and Moon (`2.1.3`) via `.prototools`. Run `proto use` to install pinned versions. Linting/formatting uses Biome (`biome.json`), not ESLint/Prettier.

## Architecture

### Project layout

```
src/            — MCP server exposing pod lifecycle tools
src/polyfill.ts — Polyfill file for global environment compatibility
deno.json       — Deno import mappings for Node modules
infra/k3d/      — Local k3d cluster setup + k8s manifests
scripts/        — Lifecycle test scripts
```

### MCP Server (`src/`)

`src/index.ts` is the entry point — selects transport (HTTP or STDIO) and boots the server. `src/server.ts` sets up the HTTP transport with CORS, runtime detection (Bun/Deno/Node), and SSE keep-alive streaming. `src/mcp/` contains:

- `server.ts` — MCP server factory, registers all tools
- `pods.ts` — Pod lifecycle tools (spawn, stop, list, describe, logs, exec)
- `spawner.ts` — Pod creation logic with template rendering
- `templates.ts` — Pod template definitions and management
- `config.ts` — Runtime configuration
- `auth.ts` — Authentication utilities
- `namespace.ts` — Namespace management
- `merge.ts` — Deep merge utility for template overrides

## Testing

TDD: write unit tests before implementation.

```bash
# Run tests via Moon
moon run mcp:test

# Run tests directly via Bun
bun test src/**/*.test.ts

# Run a single test file
bun test src/mcp/pods.test.ts
```

Tests live alongside source files as `*.test.ts`.

## Agent Workflows & Rules

Slash-command workflows and always-on rules are defined in `.agents/`. Use these consistently — never bypass them.

### Workflows

| Slash command | File | When to use |
|---|---|---|
| `/format` | `.agents/workflows/format.md` | After **any** code change — runs `bun run format` then `bun run typecheck` |
| `/commit` | `.agents/workflows/commit.md` | When committing changes — runs format → typecheck → safety review → generates commit message → `git add -A && git commit` |
| `/bump` | `.agents/workflows/bump.md` | Version bump — inspects commits since last tag, picks semver level, updates `package.json`/CHANGELOG |
| `/test-local` | `.agents/workflows/test-local.md` | Full local gate (no infra) — format, typecheck, all tests |
| `/security` | `.agents/workflows/security.md` | SAST scan via Semgrep on changed files — required before every push |
| `/setup-skills` | `.agents/workflows/setup-skills.md` | Install required AI agent skills after cloning (skills are gitignored) |
| `/setup-env` | `.agents/workflows/setup-env.md` | Full environment check — verifies Bun, Node, Moon, Deno, Docker, kubectl, k3d, Git, installs deps, runs smoke tests |

### Rules (always active)

| Rule file | Trigger | Effect |
|---|---|---|
| `.agents/rules/format.md` | `always_on` | Run `/format` after every code change. Task is not complete until both `bun run format` and `bun run typecheck` pass. |
| `.agents/rules/pre-push.md` | `always_on` | Before `git push`: format → typecheck → tests → `/security`. All must pass. Never force-push `main`. |
| `.agents/rules/code-design.md` | `always_on` | Think before coding, simplicity first, surgical changes, goal-driven execution. |
| `.agents/rules/commit.md` | `model_decision` | Route all commit/stage requests through `/commit` workflow. Never use `git commit --no-verify`. |
