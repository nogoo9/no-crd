# Contributing to nogoo9/no-crd

Thank you for your interest in contributing! This document outlines the development setup, conventions, and practices that keep the codebase healthy.

## Prerequisites

Run the environment setup workflow to verify all required tools:

```bash
# If using an AI agent
/setup-env

# Manual check
bun --version      # ≥ 1.3.11
node --version     # ≥ 22.14.0
moon --version     # ≥ 2.1.3
deno --version     # ≥ 2.3.3
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
bun run test
```

## Project Structure

```
src/              → MCP server source (cross-runtime: Bun, Deno, Node.js)
  config/         → Schema-driven configuration system
  k8s/            → Kubernetes client, RBAC, pods, templates
  mcp/            → MCP tool implementations (pods, spawner, templates)
  server/         → HTTP/HTTPS server, routing, auth, themes
  ui/             → Embedded dashboard UI (MCP App)
templates/        → Built-in pod template YAML files
themes/           → Built-in CSS themes
scripts/          → Build and documentation generation scripts
docs/             → VitePress documentation site
  decisions/      → Architecture Decision Records (ADRs)
infra/k3d/        → Local k3d cluster config and bootstrap
kubernetes/       → Kubernetes deployment manifests
.agents/          → AI agent rules and workflows
.github/          → CI/CD workflows
```

## Development Workflow

### 1. Create a branch

```bash
git checkout -b feat/your-feature
# or: fix/..., refactor/..., docs/..., ci/...
```

### 2. Write tests first (TDD)

All logic changes must start with a failing test. Tests are co-located as `*.test.ts` alongside their source files in `src/`.

```bash
bun run test                            # Run all tests
bun test src/mcp/spawner.test.ts        # Run a specific test file
```

### 3. Implement

- Follow existing code patterns and style.
- Keep changes focused — one concern per PR.
- Use the schema-driven configuration system in `src/config/` when adding new environment variables or CLI flags.
- Use `ANNOTATION_KEYS` from `src/config/annotations.ts` for all Kubernetes labels and annotations — never hardcode annotation strings.

### 4. Format and type-check

```bash
bun run format     # Biome lint + auto-fix
bun run typecheck  # TypeScript strict-mode check
```

Both must pass with zero errors before any commit. **Do not use ESLint or Prettier.**

### 5. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(mcp): add pod template list tool
fix(router): handle missing namespace gracefully
docs: update README quick start section
refactor(config): extract TLS schema to own module
chore: bump dependencies
ci: pin GitHub Actions to SHA
```

AI agents: use the `/commit` workflow which runs format, typecheck, safety review, and generates the commit message automatically.

### 6. Pre-push checks

Before pushing, all local gates must pass:

```bash
bun run format      # Biome lint + auto-fix
bun run typecheck   # TypeScript compiler
moon run mcp:test   # All unit tests
```

AI agents: the `/test-local` workflow runs all of the above plus a Semgrep security scan.

### 7. Push and PR

```bash
git push origin feat/your-feature
```

Open a Pull Request against `main`. Never force-push to `main`.

## Code Style

| Setting | Value |
|---|---|
| **Formatter/Linter** | Biome (tab indentation, double quotes) |
| **TypeScript** | Strict mode, path aliases (`~/`), `.js` extensions on imports |
| **Import style** | Use `~/` path aliases (e.g. `~/config/index.js`), never relative `../` |
| **Error handling** | Clear descriptive messages; MCP tools return structured error responses |

## Architecture Decision Records (ADRs)

Significant technical decisions are documented as ADRs in [`docs/decisions/`](docs/decisions/).

**When to write an ADR:**
- Adding a new subsystem or major feature.
- Choosing between multiple viable approaches.
- Making a trade-off that future contributors will question.

**How:**
1. Copy the structure from an existing ADR (Status, Context, Decision, Alternatives, Consequences).
2. Name it `ADR-NNN-short-description.md` with the next available number.
3. Add it to the table in [`docs/decisions/index.md`](docs/decisions/index.md).

Current ADRs cover template formats, session cookies, peer discovery, theme merging, asset resolution, and the schema-driven configuration system. Always read the relevant ADRs before modifying the systems they describe.

## AI Agent Skills & Workflows

This project includes a comprehensive set of agent skills and workflows in `.agents/`. They encode project-specific conventions and should be followed by both human and AI contributors.

### Key Workflows

| Command | Purpose |
|---|---|
| `/format` | Run Biome lint + auto-fix, then TypeScript type-check |
| `/commit` | Format → typecheck → safety review → conventional commit |
| `/test-local` | Full local gate: format → typecheck → tests → Semgrep |
| `/security` | Semgrep SAST scan on changed files |
| `/gha-security` | Verify SHA-pinned GitHub Actions and run zizmor |
| `/bump` | Semver version bump with CHANGELOG generation |
| `/update-docs` | Regenerate dynamic documentation tables and build API docs |
| `/setup-env` | Verify all development tools and run smoke tests |

### Key Rules

| Rule | Effect |
|---|---|
| `format` (always on) | Format + typecheck must pass after every code change |
| `pre-push` (always on) | Full test-local gate before any `git push` |
| `code-design` (always on) | Think before coding; simplicity first; surgical changes |
| `commit` | Use `/commit` workflow for all git commits |
| `gha-security` | Run `/gha-security` when modifying `.github/workflows/` |
| `publishing` | Extra checks when modifying package config or releases |

### Agent Skills

Skills in `.agents/skills/` provide specialized guidance. Key skills include:

- **test-driven-development** — TDD workflow for all logic changes.
- **documentation-and-adrs** — When and how to write ADRs.
- **code-review-and-quality** — Multi-axis review before merging.
- **security-and-hardening** — Input validation, auth, and data handling.
- **incremental-implementation** — Break large changes into reviewable steps.
- **source-driven-development** — Ground decisions in official documentation.

Skills are installed via `/setup-skills` and are gitignored.

## Schema-Driven Configuration

All environment variables, CLI flags, and their documentation are defined as typed schema objects in `src/config/`. When adding a new configuration option:

1. Add a schema entry to the appropriate category file (e.g. `src/config/server.ts`).
2. The CLI parser, documentation tables, and runtime config are derived automatically.
3. Run `bun run update:permissions` to regenerate the documentation.

See [ADR-007](docs/decisions/ADR-007-schema-driven-configuration.md) for the design rationale.

## GitHub Actions Security

All GitHub Actions workflow files must follow these rules:

- **SHA-pinned actions** — Every `uses:` reference must be a full 40-character commit SHA with a version comment (e.g. `@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`).
- **Verify SHAs** — All SHAs must be verified against the GitHub API before committing.
- **Least-privilege permissions** — Use `permissions: read-all` at the top level and grant specific writes only where needed.
- **No credential persistence** — All `actions/checkout` steps must set `persist-credentials: false`.

Run `/gha-security` (or `pipx run zizmor .`) to validate.

## Documentation

The project documentation site is built with VitePress and hosted on GitHub Pages.

```bash
bun run docs:dev    # Local dev server at localhost:5183
bun run docs:build  # Full static build (validates all links)
```

Dynamic tables (RBAC permissions, configuration variables, template annotations) are generated by `scripts/update-docs.ts`. Run `bun run update:permissions` after changing schemas or annotations.

## Useful Commands

| Command | Description |
|---|---|
| `bun install` | Install all dependencies |
| `bun run typecheck` | TypeScript strict-mode check |
| `bun run lint` | Biome linting + import checks |
| `bun run format` | Biome lint + auto-fix |
| `bun run test` | Run all unit tests |
| `bun run build` | Build production bundles |
| `bun run dev:bun` | Start MCP server from source (Bun) |
| `bun run dev:deno` | Start MCP server from source (Deno) |
| `bun run dev:node` | Start MCP server from source (Node.js) |
| `bun run update:permissions` | Regenerate dynamic documentation tables |
| `bun run docs:dev` | VitePress dev server |
| `bun run docs:build` | Build documentation site |
| `moon run mcp:test` | Run all tests via Moon |
| `moon run mcp:build` | Build MCP package |

## Questions?

Open an issue on [GitHub](https://github.com/nogoo9/no-crd/issues).
