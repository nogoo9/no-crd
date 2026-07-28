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

# Lint import boundaries & path aliases (scripts/check-imports.ts)
bun run lint

# Format / auto-fix with Biome
bun run format

# Run dev server on specific runtimes (from source)
bun run dev:bun
bun run dev:deno
bun run dev:node

# Run MCP server on specific runtimes (from built bundle)
bun run run:bun
bun run run:deno
bun run run:node

# Run all unit tests
bun run test
moon run mcp:test

# Build package via Moon (Node target)
moon run mcp:build

# Deploy MCP to local k3d cluster
moon run mcp:deploy
moon run mcp:deploy-wsl
```

## Toolchain & Coding Conventions

- Proto pins Bun (`1.3.11`), Node (`22.14.0`), Deno (`2.3.3`), and Moon (`2.1.3`) via `.prototools`. Run `proto use` to install pinned versions.
- Linting/formatting uses Biome (`biome.json`), not ESLint/Prettier.
- **Path Alias Invariant**: Never use relative parent paths (`../`) in `src/` modules. Always use the project path alias (`~/`) (e.g. `import { foo } from "~/server/helpers.js"`).

## Architecture

### Project layout

```
src/            — MCP server exposing pod lifecycle tools (cross-runtime)
src/server/     — Fastify HTTP server, SSE manager, OIDC singleflight & proxies
src/mcp/        — MCP tool implementations & schema definitions
src/polyfill.ts — Polyfill file for global environment compatibility
deno.json       — Deno import mappings for Node modules
infra/k3d/      — Local k3d cluster setup + k8s manifests
scripts/        — Documentation sync and lifecycle test scripts
```

### Server Subsystem (`src/server/`)

`src/index.ts` is the entry point — selects transport (HTTP or STDIO) and boots the server. `src/server/index.ts` sets up the Fastify HTTP transport with CORS, runtime detection (Bun/Deno/Node), route registration, and SSE stream management.

- `src/server/sse.ts` — `McpSessionManager` class for stateful SSE connection tracking and keep-alive pings
- `src/server/auth-singleflight.ts` — OIDC token refresh deduplication wrapper preventing refresh token rotation race conditions
- `src/server/routes/` — Route handlers for proxy, proxy authentication, and documentation serving

### MCP Server Engine (`src/mcp/`)

- `src/mcp/server.ts` — MCP server factory, registers all diagnostic, pod, template, and spawner tools
- `src/mcp/spawner/handlers/index.ts` — Workspace spawner tool handlers (`spawn_workspace`, `stop_workspace`, `upgrade_workspace`, etc.)
- `src/mcp/pods/` — Pod lifecycle tools (`list_pods`, `create_pod`, `get_pod_logs`)
- `src/mcp/templates/` — Pod template definitions and resolvers

## Testing

TDD: write unit tests before implementation.

```bash
# Run all unit tests
bun run test

# Run tests via Moon
moon run mcp:test

# Run a specific test suite
bun test src/mcp/spawner/index.test.ts
```

Tests live alongside source files as `*.test.ts`.

## Agent Workflows & Rules

Slash-command workflows and always-on rules are defined in `.agents/`. Use these consistently — never bypass them.

### Workflows

| Slash command | File | When to use |
|---|---|---|
| `/format` | `.agents/workflows/format.md` | After **any** code change — `bun run format` + `bun run lint` + `bun run typecheck` |
| `/commit` | `.agents/workflows/commit.md` | When committing — format → lint → typecheck → build check → safety review → generated commit message |
| `/bump` | `.agents/workflows/bump.md` | Version bump — reads commits since last tag, picks semver level, updates `package.json`, CHANGELOG, docs |
| `/test-local` | `.agents/workflows/test-local.md` | Full local gate (no infra) — format, lint, typecheck, all package unit tests |
| `/security` | `.agents/workflows/security.md` | SAST scan via Semgrep on changed files — mandatory before every push |
| `/zizmor` | `.agents/workflows/zizmor.md` | Security scan of GitHub Actions workflows — check for security misconfigurations |
| `/gha-security` | `.agents/workflows/gha-security.md` | Verify SHA-pinned actions and run zizmor on GitHub Actions workflows |
| `/generate-deep-wiki` | `.agents/workflows/generate-deep-wiki.md` | Audit codebase boundaries, schemas, and ADRs to generate or update Deep Wiki documentation |
| `/audit-docs-accuracy` | `.agents/workflows/audit-docs-accuracy.md` | Audit documentation pages against source code, configuration schemas, and test suites |
| `/update-docs` | `.agents/workflows/update-docs.md` | Full docs pipeline: permissions sync → Deep Wiki → accuracy audit → TypeDoc API → VitePress build |
| `/setup-skills` | `.agents/workflows/setup-skills.md` | Install required AI agent skills after cloning (skills are gitignored) |
| `/setup-env` | `.agents/workflows/setup-env.md` | Full environment check — verifies Bun, Node, Moon, Deno, Docker, kubectl, k3d, Git, installs deps |

### Rules (always active)

| Rule file | Trigger | Effect |
|---|---|---|
| `.agents/rules/format.md` | `always_on` | Run `/format` after every code change. Task is not done until `bun run format`, `bun run lint`, and `bun run typecheck` pass. |
| `.agents/rules/pre-push.md` | `always_on` | Before `git push`: run `/test-local` (format → lint → typecheck → tests → `/security`). All must pass. |
| `.agents/rules/code-design.md` | `always_on` | Think before coding, simplicity first, surgical changes, path alias `~/` invariant, goal-driven execution. |
| `.agents/rules/commit.md` | `model_decision` | When user asks to commit/stage, run `/commit` workflow. Subject line $\le 72$ chars. Never use `git commit --no-verify`. |
| `.agents/rules/publishing.md` | `model_decision` | When modifying package configuration, build scripts, or preparing a release/publishing step. |
| `.agents/rules/gha-security.md` | `model_decision` | When modifying `.github/workflows/` files, run `/gha-security` to verify SHA pins and zizmor. |
| `.agents/rules/security.md` | `always_on` | Security scan and bypass regulations. Bypasses require human review. |
| `.agents/rules/mcp-client.md` | `always_on` | Enforce handshake and auth sequencing in UI and MCP clients. |
