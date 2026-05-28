# ADR-004: Three-Source Theme Merge with Built-In Fallback

## Status
Accepted

## Date
2026-05-28

## Context
The embedded UI serves themes via `/api/themes` (list) and `/api/themes/:themeId` (retrieve CSS). Until v0.3.x, themes were loaded from either a Kubernetes ConfigMap (`THEMES_CONFIGMAP`) or a local directory (`THEMES_DIR`), but never both, and there was no built-in default beyond the hardcoded "Claude" theme.

In v0.4.0, we ship 10 pre-built CSS themes with the npm package (in `themes/`). We need a merge strategy that:
- Gives operators full control (ConfigMap and custom dir override built-in themes)
- Ensures every deployment has a good default set of themes even without configuration
- Allows operators to **replace** a built-in theme with their own version (same id)

## Decision
Merge themes from **three sources** in priority order, deduplicated by theme id:

1. **ConfigMap** (highest priority) — via `THEMES_CONFIGMAP` env var
2. **Custom directory** — via `THEMES_DIR` env var
3. **Built-in directory** (lowest priority) — resolved at startup from the package's `themes/` directory

When listing, each source is scanned in order. If a theme id has already been seen from a higher-priority source, the lower-priority version is skipped. When retrieving a single theme, sources are checked in the same order; the first match wins.

### Priority rationale
- ConfigMap is highest because it's the standard k8s-native configuration mechanism and can be updated without redeploying the pod
- Custom directory is second because it represents operator customization baked into the image or mounted at runtime
- Built-in is last because it's the package default that should be overridable

## Alternatives Considered

### Single source only (existing behavior)
- Pros: Simplest
- Cons: No built-in themes; every deployment needs explicit theme configuration
- Rejected: Poor out-of-the-box experience

### Merge with no deduplication
- Pros: Shows all themes from all sources
- Cons: Confusing when multiple themes share the same id but have different CSS
- Rejected: Users would see duplicates in the theme picker

### Explicit "override" flag on themes
- Pros: More control over which themes to replace
- Cons: Over-engineered; id-based deduplication with source priority achieves the same result naturally
- Rejected: Unnecessary complexity

## Consequences
- Every deployment ships with 10 themes out of the box (no configuration needed)
- Operators can override any built-in theme by placing a `.css` file with the same id in `THEMES_DIR` or ConfigMap
- The `config.ui.builtinThemesDir` is resolved at startup via `resolveBuiltinDir()`, which walks up from `__dirname` to find the package's `themes/` directory
- Built-in themes are included in the npm package's `files` field
