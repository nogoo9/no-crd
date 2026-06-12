# Contributing & TDD Workflow

Thank you for contributing! This guide outlines the local development setup, coding conventions, testing workflow, and commit rules.

---

## 🛠️ Prerequisites & Setup

Verify that you have the required toolchain installed:
```bash
bun --version      # ≥ 1.3.11
node --version     # ≥ 22.14.0
moon --version     # ≥ 2.1.3
deno --version     # ≥ 2.3.3
docker --version   # 20+
kubectl version --client
k3d --version
```

Clone the repository and run setup:
```bash
git clone git@github.com:nogoo9/no-crd.git
cd no-crd

# Install pinned toolchain versions via Proto
proto use

# Install dependencies (automatically sets up Husky hooks)
bun install

# Verify the setup
bun run typecheck
bun run test
```

---

## 🔄 Test-Driven Development (TDD)

All logic modifications must be accompanied by tests. We co-locate test files directly alongside their implementation modules (e.g. `src/mcp/spawner.test.ts` resides next to `src/mcp/spawner.ts`).

### Running Tests
```bash
# Run all unit tests
bun run test

# Run a specific test suite
bun test src/mcp/spawner.test.ts

# Run tests via Moon (toolchain checks)
moon run mcp:test
```

---

## 🧼 Code Style & Formatting

We use **Biome** for code linting and formatting. Do not use Prettier or ESLint.

```bash
# Biome formatting and auto-fix
bun run format

# Strict TypeScript typechecking
bun run typecheck
```

Both commands must pass with zero errors. These are enforced on `git commit` via Husky hooks.

---

## 📝 Commit Conventions

We follow **Conventional Commits**:
```
feat(mcp): add pod template list tool
fix(router): handle missing namespace gracefully
docs: update README quick start section
```

Commit messages are validated on commit. If you are using an AI agent to commit changes, recommend using the `/commit` slash command which automates checks and formats the message.

---

## 🛡️ Pre-Push Checks

Before pushing code to `main`, all local gates must pass. These are run automatically on `git push` via a Husky hook:

1. `bun run format` (Biome checks)
2. `bun run typecheck` (TypeScript build)
3. `moon run mcp:test` (All unit tests)
4. `/security` (Semgrep SAST scans)
