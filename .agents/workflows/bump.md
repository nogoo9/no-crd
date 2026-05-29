---
description: Determine the appropriate semver bump from commits since the last tag, update version files and CHANGELOG, then commit the bump.
---

# Version Bump Workflow

## Step 1 — Find the last version tag

```bash
git describe --tags --abbrev=0
```

Record the tag (e.g. `v0.1.0`).

## Step 2 — Review commits since the last tag

```bash
git log --oneline <last-tag>..HEAD
```

Read every commit subject and classify each one using Conventional Commits semantics:

| Indicator | Bump |
|---|---|
| `feat:` / new capability added | **minor** |
| `fix:` / `perf:` / `refactor:` / `docs:` / `chore:` | **patch** |
| `BREAKING CHANGE` in body, or `!` after type (e.g. `feat!:`) | **major** |

Apply the highest-severity bump found across all commits.

## Step 3 — Compute the new version

Calculate `<new_version>` by incrementing the appropriate semver component of the current version (from root `package.json`). Reset lower components to 0 (e.g. minor bump: `0.1.0` → `0.2.0`).

## Step 4 — Update version in root package.json, server.json, and src/version.ts

The version string appears in the root `package.json`, in `server.json` (both the top-level `"version"` field and the package-level `"version"` field), and in `src/version.ts` (`APP_VERSION` constant) — update all of them to `<new_version>`:

```bash
grep '"version"' package.json server.json
grep 'APP_VERSION' src/version.ts
```

## Step 5 — Update CHANGELOG.md and Release Notes

1. Add a new `## [<new_version>] — <YYYY-MM-DD>` section at the top of `CHANGELOG.md` (below the header) with:
   - `### Added` — new features (`feat:` commits)
   - `### Fixed` — bug fixes (`fix:` commits)
   - `### Security` — security fixes
   - `### Changed` — other notable changes (`refactor:`, `perf:`)
   Summarise each commit as a bullet. Omit purely mechanical commits unless user-visible.

2. Create or update a section in the "What's New" documentation page at `docs/whats-new.md` describing key highlights, features, and user-facing benefits of the new release version.

## Step 6 — Sync Permissions and Build Documentation

1. Execute the automated permissions table synchroniser:
   ```bash
   bun run update:permissions
   ```
2. Rebuild the TypeDoc API references:
   ```bash
   bun run build:docs
   ```

## Step 7 — Update version references

Search the README and documentation files for hardcoded version strings and update them:

```bash
grep -rn '<old_version>' README.md docs/
```

## Step 8 — Run format, typecheck, and build verification

Run the full local gate to verify formatting, type-safety, and documentation site compilation:

```bash
bun run format
bun run typecheck
bun run docs:build
```

Stop and fix any errors or warnings before continuing.

## Step 9 — Commit the bump

```bash
git add -A
git commit -m "chore: bump version to <new_version>"
```

Report the new version, the bump type applied, and the commit hash.
