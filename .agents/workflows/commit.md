---
description: Run format + typecheck, then git add -A and commit with a user-provided message
---

Commit all current changes after ensuring formatting and types are clean.

## Steps

1. Run `bun run format` to lint, auto-fix, and format code with Biome. Run `bun run lint` to verify that no circular or invalid imports exist (`scripts/check-imports.ts`). If either reports errors, stop and fix them before proceeding.

2. Run `bun run typecheck` to verify TypeScript types. If it reports errors, stop and fix them before proceeding.

3. Run `bun run build` followed by `npm pack --dry-run` to verify that all necessary build artifacts (specifically `dist/**/*.js` and `dist/ui/index.html`) are correctly packaged and that no bulky compiled binaries or temporary files are accidentally included.

4. **Safety review** — inspect every file that would be staged:

   ```bash
   git status --short
   git diff --stat HEAD
   ```

   For each new or modified file, check for the following and take the corresponding action:

   | Category | Examples | Action |
   |---|---|---|
   | **Secrets / credentials** | `.env`, `*.pem`, `*.key`, `*secret*`, `*token*`, API keys in source | **Stop immediately.** Tell the user which file and why. Do NOT proceed until resolved. |
   | **Build / compiled artifacts** | `dist/`, `*.js.map`, `*.d.ts` (if generated), `bun.lockb` changes from a dirty install | Ask the user: "Should `<file>` be committed or gitignored?" |
   | **OS / editor noise** | `.DS_Store`, `Thumbs.db`, `*.swp`, `.idea/`, `.vscode/` | Add to `.gitignore` automatically, inform the user, and continue. |
   | **Large binaries / test fixtures** | Files >500 KB that are not explicitly expected assets | Ask the user whether to include or gitignore. |
   | **Unintended scope creep** | Files in directories unrelated to the stated change | Ask the user: "Is `<file>` intentional for this commit?" |

   If any **secret** is found, stop the entire workflow. Do not proceed to `git add`.

   If you added anything to `.gitignore`, show the user the exact lines appended.

5. Inspect the current changes to generate a commit message:

   ```bash
   git diff --stat HEAD
   ```

   Read the diff and write a **Conventional Commit** message:
   - Subject line: `<type>(<optional scope>): <short imperative summary>`
   - **The subject line MUST be ≤72 characters.** Count the characters before presenting. If it exceeds 72, shorten it.
   - Valid types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`
   - Add a body paragraph if the change warrants more context (breaking changes, non-obvious rationale)
   - Mark breaking changes with `BREAKING CHANGE:` in the body or `!` after the type

   Present the generated message to the user and ask: **"Use this commit message? (yes / edit / cancel)"**

6. If the user says **yes** — use the generated message as-is.  
   If the user says **edit** — accept their revised message.  
   If the user says **cancel** — stop without committing.

7. Run `git add -A` to stage all changes.

8. Run `git commit -m "<confirmed message>"`.

9. Report the commit hash and the one-line summary from git's output.
