# Gemini CLI Mandate: nogoo9 / no-crd

This repository is a platform for agent-driven, on-demand pod orchestration in Kubernetes (k8s/k3s) **without Custom Resource Definitions**. It provides dynamic pod lifecycle management similar to JupyterHub or cloud IDE services, but agnostic to actual use cases.

## Project Overview

- **Purpose:** Let AI agents (and APIs) dynamically spin up, route to, and manage ephemeral pods on Kubernetes — without requiring CRDs or cluster-level operators.
- **Architecture:**
  - **MCP Server** (`src/`): Model Context Protocol server exposing pod lifecycle tools — spawn, stop, list, templates — to AI agents.
- **Technology Stack:** Bun, Deno, Node.js, TypeScript, Moon (task runner), Biome (linting/formatting), Docker, k3d (local k8s), Kubernetes client-node.

## Architecture Map

```mermaid
graph TD
    Agent["AI Agent / Client"] --> MCP["MCP Server: src/"]
    MCP --> K8s["Kubernetes API"]
    K8s --> Pod["Spawned Pod"]
```

## Repository Structure

```
nogoo9/
├── src/                 # MCP server for pod lifecycle tools (cross-runtime)
│   ├── server/          # Fastify HTTP server, SSE manager, OIDC singleflight & proxies
│   ├── mcp/             # MCP tool implementations & schema definitions
│   └── polyfill.ts      # Global environment polyfills for Deno/Node compatibility
├── infra/
│   └── k3d/             # Local k3d cluster setup + manifests
├── .agents/             # AI agent rules & workflows
├── .moon/               # Moon workspace + toolchain config
├── .github/             # CI workflows
├── deno.json            # Deno import maps for Node module compatibility
└── package.json         # Package configuration & conditional exports
```

## Development Conventions

- **Toolchain:** Supports **Bun**, **Deno**, and **Node.js** runtimes. Pinned via `.prototools` and `.moon/toolchain.yml`.
- **Path Alias Invariant:** Never use relative parent paths (`../`) in `src/` modules. Always use the project path alias (`~/`) (e.g. `import { foo } from "~/server/helpers.js"`).
- **Linting & Formatting:** Strictly adhere to **Biome** and import checks. Run `bun run format` (Biome lint + auto-fix) and `bun run lint` (`scripts/check-imports.ts`). Do NOT use ESLint or Prettier.
- **Testing (Mandatory):**
  - **TDD:** Write unit tests before implementing features or fixes.
  - **Unit Tests:** Located in `src/**/*.test.ts`.
  - **Run all tests:** `bun run test` or `moon run mcp:test`.
- **Error Handling:** Use clear descriptive messages. MCP tools must return structured error responses.

## Key Development Commands

| Command | Description |
|---|---|
| `bun install` | Install all dependencies |
| `bun run typecheck` | TypeScript project check |
| `bun run lint` | Import boundary & path alias check (`scripts/check-imports.ts`) |
| `bun run format` | Biome lint + auto-fix |
| `bun run dev:bun` | Start MCP server from source using Bun |
| `bun run dev:deno` | Start MCP server from source using Deno |
| `bun run dev:node` | Start MCP server from source using Node.js |
| `bun run run:bun` | Run built MCP server bundle using Bun |
| `bun run run:deno` | Run built MCP server bundle using Deno |
| `bun run run:node` | Run built MCP server bundle using Node.js |
| `bun run test` | Run all unit tests |
| `moon run mcp:test` | Run all unit tests via Moon |
| `moon run mcp:build` | Build MCP package (Node target) |
| `moon run mcp:deploy-wsl` | Rebuild, push, and deploy MCP to k3d cluster (localhost registry) |
| `moon run mcp:deploy` | Rebuild, push, and deploy MCP to k3d cluster |

## Key Files & Directories

- `src/index.ts`: MCP server entry point — transport selection (HTTP/STDIO) and signal handling.
- `src/server/index.ts`: HTTP server setup with CORS, Fastify routes, runtime detection, and SSE stream management.
- `src/server/sse.ts`: `McpSessionManager` class for stateful SSE connection tracking and keep-alive pings.
- `src/server/auth-singleflight.ts`: OIDC token refresh deduplication wrapper preventing refresh token rotation race conditions.
- `src/server/routes/`: Route handlers for HTTP proxy, proxy authentication, and documentation serving.
- `src/polyfill.ts`: Sets up global variables (`global`, `Buffer`) to ensure seamless execution in Deno.
- `deno.json`: Deno configuration map for Node compatibility imports.
- `src/mcp/`: MCP tool implementations (pods, spawner, templates, auth, config).
- `infra/k3d/`: Local cluster config, bootstrap script, k8s manifests.
- `.moon/workspace.yml`: Moon workspace project discovery.
- `.moon/toolchain.yml`: Pinned Bun + Node + Deno versions.

## AI Agents' Rules & Workflows

Slash-command workflows and always-on rules live in `.agents/`. **Always use them — never bypass.**

### Workflows

| Slash command | File | When to use |
|---|---|---|
| `/format` | `.agents/workflows/format.md` | After **any** code change — `bun run format` + `bun run lint` + `bun run typecheck` |
| `/commit` | `.agents/workflows/commit.md` | When committing — format → lint → typecheck → build check → safety review → confirmed commit message |
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

### Rules

| Rule | Trigger | Effect |
|---|---|---|
| `.agents/rules/format.md` | `always_on` | Run `/format` after every code change. Task is not done until `bun run format`, `bun run lint`, and `bun run typecheck` pass. |
| `.agents/rules/pre-push.md` | `always_on` | Before `git push`: run `/test-local` (format → lint → typecheck → tests → `/security`). All must pass. |
| `.agents/rules/code-design.md` | `always_on` | Think before coding, simplicity first, surgical changes, path alias `~/` invariant, goal-driven execution. |
| `.agents/rules/commit.md` | `model_decision` | When user asks to commit/stage, run `/commit` workflow. Subject line $\le 72$ chars. Never use `git commit --no-verify`. |
| `.agents/rules/publishing.md` | `model_decision` | When modifying package configuration, build scripts, or preparing a release/publishing step. |
| `.agents/rules/gha-security.md` | `model_decision` | When modifying `.github/workflows/` files, run `/gha-security` to verify SHA pins and zizmor. |
| `.agents/rules/security.md` | `always_on` | Security scan and bypass regulations. Bypasses require human review. |
| `.agents/rules/mcp-client.md` | `always_on` | Enforce handshake and auth sequencing in UI and MCP clients. |
