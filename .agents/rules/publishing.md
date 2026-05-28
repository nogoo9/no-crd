# NPM Packaging and Publishing Rule

Ensure that package build steps and publication artifacts are verified before releasing or staging package changes. This guarantees the package works correctly upon installation while avoiding bloated registry uploads.

## Verification Checklist

Before pushing commits or triggers that lead to publishing (e.g., version bumps, tags):

1. **Verify Full Build Output**:
   - Run `bun run build` (or `moon run mcp:build`) to ensure all compilation targets succeed.
   - Confirm the presence of the following files:
     - `dist/index.js` (Library entry point)
     - `dist/cli.js` (CLI tool entry point)
     - `dist/server-entry.js` (Server entry point)
     - `dist/ui/index.html` (Compiled webapp frontend bundle)

2. **Verify Package Contents & Size**:
   - Run `npm pack --dry-run` to inspect the generated tarball contents.
   - Verify that:
     - All critical `dist` assets are listed (specifically `dist/**/*.js` and `dist/ui/index.html`).
     - Large host-compiled standalone binaries (like the compiled `dist/server-entry` executable) are **excluded** from the files list.
     - The packed package size is lightweight (typically < 3MB).

3. **Verify Executables & Entrypoints**:
   - Ensure the `package.json` `"bin"` configuration points to `dist/cli.js` and that the file remains executable.
   - Ensure the `"exports"` property correctly maps Node, Bun, and Deno environments to their respective entry points.

4. **Verify MCP Server Metadata**:
   - Ensure that the version fields in `server.json` (both top-level `"version"` and package `"version"`) exactly match the version defined in `package.json`.
