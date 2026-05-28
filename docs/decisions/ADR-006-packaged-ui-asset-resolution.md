# ADR-006: Packaged UI Asset and Built-in Resource Resolution

## Status
Accepted

## Date
2026-05-28

## Context
The project compiles TypeScript sources into a single bundled distribution folder (`dist/`), containing `dist/index.js`, `dist/server-entry.js`, `dist/cli.js`, etc. 
Additionally:
- The static frontend user interface compiles into `dist/ui/index.html`.
- The documentation compiles into `dist/docs/`.
- Built-in resources, such as themes (`themes/`) and templates (`templates/`), reside at the project root for local development and are packaged directly under the package root when published to NPM.
- In Docker images, the build structure can be flattened (e.g. copying `dist/server-entry.js` directly to `/app/server-entry.js`, and copying assets like `themes/` and `templates/` directly to `/app/themes` and `/app/templates`).

During a recent modularization refactor, `DIST_DIR` in `src/server/index.ts` was changed to resolve to `join(__dirname, "..")` when running from compiled JS (`.js` files). Because compiled files live in the flat `dist/` directory, this pointed to the parent of `dist` (e.g. the package root), causing the server to look for `[root]/ui/index.html` (which does not exist) rather than `dist/ui/index.html`. This broke the Web UI in compiled/packaged runs and in Docker, serving the fallback string `"UI not built. Run: bun run build"`.

Additionally, the helper `resolveBuiltinDir` in `src/config.ts` was unable to resolve built-in directories (like `themes/` or `templates/`) when running from flattened layouts like Docker because it only checked parent directories (`join(__dirname, "..")`).

## Decision
1. **Unify `DIST_DIR` Resolution**: Update `DIST_DIR` in `src/server/index.ts` to resolve to `__dirname` when running from `.js` files. In standard compiled runs, this resolves to `dist/` (where `ui` and `docs` reside). In Docker container runs (with `/app/server-entry.js`), it resolves to `/app/` (where `ui` and `docs` reside).
2. **Harden `resolveBuiltinDir`**: Modify `resolveBuiltinDir` in `src/config.ts` to check `join(__dirname, dirName)` first before traversing up the directory tree. This enables the correct resolution of built-in assets in flattened container structures.
3. **Automate Package Bundling**: Add the `"prepublishOnly": "bun run build"` script hook in `package.json` to guarantee the UI and backend are built together and never published in a stale or incomplete state.

## Alternatives Considered

### Retaining the `join(__dirname, "..")` logic and copying UI to package root
- **Pros**: Matches directory structure of sources where UI is adjacent to the build parent directory.
- **Cons**: pollutes package root; requires custom copying steps in local build scripts; deviates from standard bundler conventions.
- **Rejected**: Building assets into `dist/` is the standard and clean approach.

### Relying on environment variables for path configuration
- **Pros**: Gives maximum control to operators.
- **Cons**: Poor out-of-the-box user experience.
- **Rejected**: Out-of-the-box command execution should work seamlessly.

## Consequences
- The Web UI loads correctly under Bun, Deno, Node.js, standard production runs, published npm packages, and Docker.
- Built-in templates and themes load correctly in flattened Docker images.
- Publishing workflow is safeguarded against missing static builds.
