# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.4] — 2026-05-30

### Fixed

- **"Already Connected" on Second Session** ([ADR-012](/decisions/ADR-012-per-session-mcp-server-factory)): The MCP server no longer throws `"already connected transport, call close()"` when a second client session connects. Each session now gets its own `McpServer` instance, following the official MCP SDK factory pattern. The shared `globalMcpServer` singleton has been removed.

## [0.5.3] — 2026-05-29

### Fixed

- **Remove Hardcoded `localhost:3000` Fallback**: The UI HTTP fallback transport no longer tries `http://localhost:3000/mcp` — it only uses the same-origin path derived from `BASE_URL`. This eliminates connection errors and startup delays in production and k3d ingress deployments.
- **Logout Endpoint Missing `basePath`**: The UI logout fetch call now correctly includes the `BASE_URL` prefix, fixing 404 errors when the server is deployed behind a subpath reverse proxy.
- **Infinite Refresh Loop on 401**: The UI no longer calls `window.location.reload()` when the MCP endpoint returns `401 Unauthorized`. Previously, the reload raced with the OIDC `triggerRedirect()`, causing the page to loop endlessly without ever reaching the IdP. The login overlay is now shown instead, allowing the OIDC flow to redirect normally.

## [0.5.2] — 2026-05-29

### Fixed

- **Graceful Error Handling in MCP Tools**: `current_namespace` and `get_capabilities` no longer throw unhandled errors when authentication fails or the K8s API is unreachable — they now return structured `errorResult` responses.
- **Server Startup Resilience**: `createMcpServer` wraps RBAC permission evaluation in a try/catch, allowing the server to boot with diagnostic tools only when the K8s Auth API is temporarily unavailable.

### Added

- **Permission Denial Test Matrix**: 6-scenario test suite covering all RBAC denial combinations (all granted, pods denied, configmaps denied, namespaces denied, all denied, K8s API unreachable) verifying the server always boots and tools are correctly gated.

## [0.5.1] — 2026-05-29


### Fixed

- **Graceful ConfigMap Template Fallback**: `list_templates` and `spawn_workspace` no longer crash when the service account lacks `configmaps` RBAC permissions. They now fall back to local/built-in templates with a warning, instead of returning an error. ([ADR-010](docs/decisions/ADR-010-graceful-configmap-template-fallback.md))
- **Template Read Tools Always Available**: `list_templates` and `get_template` are now unconditionally registered regardless of ConfigMap permissions, ensuring local/built-in templates are always accessible.

## [0.5.0] — 2026-05-29

### Added

- **Managed-Only Pod Access Control**: Pod tools (`list_pods`, `get_pod`, `delete_pod`, `patch_pod`, `get_pod_logs`) now only operate on pods labeled `nogoo9/managed-by=nogoo9-spawner` when `MANAGED_ONLY=true` (default). No one bypasses this — not even admins. ([ADR-008](docs/decisions/ADR-008-managed-only-pod-access-control.md))
- **Unmanaged Pod Count**: `list_pods` reports `unmanagedCount` — the number of pods in the namespace not managed by this server — without leaking details.
- **Auto-Label on Create**: `create_pod` automatically applies the `nogoo9/managed-by=nogoo9-spawner` label to all new pods.
- **Server Capabilities Endpoint**: New `get_capabilities` MCP tool returns `{ enabledTools, managedOnly, authEnabled, isAdmin }` so UI clients can adapt their rendering.
- **Capabilities-Aware UI**: Dashboard buttons (Delete, Stop, Spawn, Logs) are disabled when the corresponding MCP tool is not in the user's `enabledTools` list.
- **Eager MCP Server Initialization**: The HTTP transport now creates the MCP server and evaluates RBAC permissions at startup rather than lazily on the first request. ([ADR-009](docs/decisions/ADR-009-eager-startup-health-check.md))
- **Startup Health Check**: A K8s API connectivity probe (`listPods limit=1`) runs before the MCP server is created, with actionable HINT diagnostics for common deployment failures.

### Fixed

- **Missing `get_capabilities` in enabledTools**: The `get_capabilities` tool was not listed in the always-enabled tools set returned by `evaluatePermissions`.

### Security

- **Managed-only access gate**: Prevents information leakage from unmanaged pods in shared namespaces.

## [0.4.1] — 2026-05-29

### Changed

- **Schema-Driven CLI Wrapper**: Refactored the command-line utility entrypoint to dynamically load parameter types, defaults, and validations directly from active configuration schemas, completely removing hardcoded flags logic.
- **Centralized Keys Map**: Replaced all hardcoded magic strings for Kubernetes labels and annotations with a single, unified reference map `ANNOTATION_KEYS` in `src/config/annotations.ts`.
- **Encapsulated Config Directory**: Moved and consolidated all configuration logic directly inside the `src/config/` directory, removing the redundant `src/config.ts` wrapper file.

### Fixed

- **Registry Validation**: Added missing `mcpName` to `package.json` to satisfy registry schema validation constraints.


## [0.4.0] — 2026-05-29

### Added

- **Local Filesystem Templates**: Pod templates can now be loaded from YAML/JSON files in a local directory (`TEMPLATES_DIR`), in addition to Kubernetes ConfigMaps. Templates support both YAML (default, k8s-native) and JSON with auto-detection. ([ADR-001](docs/decisions/ADR-001-template-file-format.md))
- **Built-In Templates**: 2 default pod templates (`default-agent-workspace`, `workspace-terminal`) are shipped with the npm package and available out of the box. Disable with `BUILTIN_TEMPLATES=false`.
- **Built-In Themes (3-Source Merge)**: 10 CSS themes are bundled with the package. The `/api/themes` endpoint now merges themes from ConfigMap → custom directory → built-in, deduplicated by id. ([ADR-004](docs/decisions/ADR-004-three-source-theme-merge.md))
- **Stateless Session Cookies**: HMAC-SHA256 signed `nocr_sess` cookies with configurable TTL (default 30 min, sliding window) to keep workspace sessions alive independently of JWT lifetime. ([ADR-002](docs/decisions/ADR-002-stateless-session-cookies.md))
- **Peer Discovery for Session Key**: Multi-replica deployments automatically share the session signing key via pod-to-pod discovery using existing RBAC permissions. ([ADR-003](docs/decisions/ADR-003-peer-discovery-session-key.md))
- **Session Cookie Coverage for All Endpoints**: The `nocr_sess` session cookie is now scoped to `Path=/` covering MCP API calls, not just proxy routes. No `refresh_token` is stored client-side. ([ADR-005](docs/decisions/ADR-005-ui-proactive-oidc-refresh.md))
- **Open WebUI Workspace Template**: Replaced browser-based WebContainers guide with a containerized `open-webui` template supporting persistent SQLite data mappings and local k3d registry bootstrap.
- **Workspace ID Auto-Generation in UI**: The spawn modal now automatically generates valid Kubernetes resource IDs, prefixed with a sanitized user OIDC identity from the JWT payload and safely truncated to prevent DNS length issues.
- **Dynamic Context Warnings in Spawn Modal**: Added dynamic validation for required context variables, including a visible warning note to caution users that plain-text secrets will be visible in the pod spec.
- **MCP Server Metadata Description (`server.json`)**: Added a standard `server.json` file to describe server capabilities, parameters, and environment variables for automated registry publishing and CI/CD.

### Changed

- **Proxy Auth Flow**: The routing proxy now checks `nocr_sess` session cookies before falling back to JWT validation, reducing OIDC provider load and improving latency for authenticated requests.
- **Logout Endpoint**: Now clears both `nocr_token` and `nocr_sess` cookies for all active workspace paths.
- **WebSocket Upgrades**: WebSocket upgrade handler now supports session cookie authentication alongside JWT tokens.
- **Server Modularization**: Refactored the monolithic 1,600+ line server file into clean, modular sub-modules (`mcp.ts`, `proxy.ts`, `static.ts`, `themes.ts`, `auth.ts`, `helpers.ts`, `ws-proxy.ts`) to improve codebase readability, test isolation, and maintainability.
- **Packaged UI Asset Resolution**: Corrected compiled JS path resolution for `DIST_DIR` to use `__dirname` instead of `join(__dirname, "..")` and hardened `resolveBuiltinDir` in `src/config.ts` to locate assets under flat directory layouts (like Docker containers).
- **NPM Publish Safety Guard**: Integrated `"prepublishOnly": "bun run build"` in `package.json` to ensure visual frontend assets are always built fresh on release packaging.
- **Directory Layout Restructuring**: Renamed the `deploy/` directory to `kubernetes/manifest/` to align with future Helm charts and package organization.
- **YAML Pod Spec Parser**: Fixed the `spawn_workspace` spec parser to run `parseSpecString` instead of raw `JSON.parse`, enabling YAML templates to load successfully without crashing on non-JSON start characters.

## [0.3.0] — 2026-05-28

### Added

- **`get_workspace` MCP Tool**: Retrieves a workspace's status, IP, ports, active annotations, and file preview metadata.
- **K3d Keycloak Integration**: Added containerized Keycloak realm deployment configuration for local OIDC E2E testing.
- **SSO PKCE UI Client**: Integrated client-side PKCE authorization redirect flow supporting silent login refresh via iframes.
- **Dashboard UI Themes**: Added light/dark/system theme toggles.
- **Obsidian GUI Workspace**: Replaced Razzia with standard Linuxserver Obsidian template with persistent S3 mapping and shared memory limits.
- **Dynamic Template Interpolation**: Added dynamic placeholder substitution (such as `${{workspace_id}}` and `${{workspace}}`) in pod template specs.
- **VitePress Docs Expansion**: Added detailed design documentation for authentication hardening, Keycloak setup, SSO integration, UI guide, and GHA security.

### Changed

- **Authentication Hardening**: Enforced strict per-user tenant isolation on all raw pod tools using label selector filters, alongside administrator role escalation.
- **Proxy Cookie-based Sessions**: Enabled automatic path-scoped session extraction (`nocr_token`) inside the proxy to securely load sub-resources on new tabs.
- **WebSocket Upgrade Runner**: Switched Docker runner base image to Node.js to bypass Bun's async socket upgrade regression, ensuring stable VNC/terminal proxying.
- **GHA Workflows Hardening**: Restructured GitHub Action files to enforce job-level least-privilege permissions, added actionlint, and integrated zizmor SAST scanning.

## [0.2.0] — 2026-05-25

### Added

- **Composable Programmatic SDK**: Refactored entry points to expose clean modular APIs (`spawnWorkspace`, `stopWorkspace`, `listWorkspaces`) that bypass HTTP transport.
- **Experimental JWT Authentication**: Built-in OAuth token validation engine supporting HS256, RS256, ES256, JWKS endpoints, and OAuth 2.0 Token Introspection (RFC 7662).
- **Experimental Workspace Routing Proxy**: Reverse proxy service to route standard HTTP requests to internal pod IPs inside the cluster with owner-label claim verification.
- **RFC 9728 Compliance**: Dynamic discovery metadata endpoint hosted at `/.well-known/oauth-protected-resource`.
- **Advanced Spawner Annotations**: Support for init-containers context validation, EKS IAM role mappings, and pre-stop lifecycle backup hooks.
- **Embedded Dashboard UI**: A bundle of the React Pod Manager app served directly as an MCP application resource.
- **Project Branding**: Added a sleek cat-themed logo icon to the docs and README.

### Changed

- **Security Hardening**: Pinned all GitHub Actions workflows to full-length commit SHAs.

## [0.1.1] — 2026-05-25

### Changed

- Updated `package.json` with standard publishing metadata fields (`homepage`, `repository`, `bugs`, `publishConfig`, `keywords`, `files`).
- Updated `README.md` to point to the published GitHub Pages documentation site.

## [0.1.0] — 2026-05-19

### Added

- **Router** (`apps/router`): HTTP reverse proxy with path-based routing to in-cluster services.
- **MCP Server** (`apps/mcp`): Model Context Protocol server exposing pod lifecycle tools — spawn, stop, list, templates, logs, exec.
- **Shared** (`packages/shared`): Common types (`HealthResponse`, `PodPhase`), label constants, and namespace defaults.
- **Infrastructure** (`infra/k3d`): Local k3d cluster configuration with bootstrap script and Kubernetes manifests.
- **Monorepo tooling**: Moon workspace, Biome linting/formatting, TypeScript project references.
- **AI agent DX**: `.agents/` rules and workflows for format, commit, test, security, bump, and environment setup.
- **CI**: GitHub Actions workflow for lint, typecheck, tests, and build.
- **Kubernetes RBAC Permission Mapping**: Dynamic `SelfSubjectAccessReview` verification checks that enable or disable MCP tools depending on active RBAC capabilities (e.g. `pods`, `configmaps`, `namespaces` verbs). See the full mapping in the [Permissions Documentation](docs/permissions.md) and [What's New](docs/whats-new.md) notes.
