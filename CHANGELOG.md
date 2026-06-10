# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] — 2026-06-11

### Added

- **Interactive Popup SSO Renewal & Session Expiry Warnings** ([ADR-019](docs/decisions/ADR-019-split-network-oidc-issuer-and-cookie-path-alignment.md)): Added a session expiration banner warning standard users when their token is about to expire, launching a user-initiated SSO renewal flow in a popup window.
- **Auto/Manual Refresh Dashboard Control**: Added a segmented control in the dashboard toolbar to switch between automated 5-second data polling and manual refresh, persisting the setting in `localStorage`.
- **Maximize & Reload Control for Inline Workspaces**: Added toolbar controls to maximize/restore the size of the inline preview workspace modal and reload the iframe target.
- **Cat-Themed Favicon Packaging**: Embedded a custom vector cat SVG favicon via base64 inline URL into HTML templates, ensuring zero external asset dependencies and packaging it directly inside the NPM package and Docker image assets.

### Fixed

- **Keycloak Hostname and Path Mismatch** ([ADR-019](docs/decisions/ADR-019-split-network-oidc-issuer-and-cookie-path-alignment.md)): Configured `KC_HOSTNAME` to `http://localhost:8080/auth` in `keycloak.yaml` to ensure Keycloak generates and validates the same token issuer URL (`http://localhost:8080/auth/realms/nogoo9`) for both external frontend login flows and internal backend-to-backend token refresh requests.
- **Dynamic Path-Scoped Cookie Routing** ([ADR-019](docs/decisions/ADR-019-split-network-oidc-issuer-and-cookie-path-alignment.md)): Scoped OIDC session and authorization cookies to dynamic base URLs (`Path=/nocr/`) under dynamic subpath routers, preventing token resolution and refresh routing conflicts.


## [0.8.1] — 2026-06-10

### Added

- **NPM and GitHub Links & Dynamic Version Reporting** ([ADR-018](docs/decisions/ADR-018-workspace-ownership-and-version-metadata.md)): Replaced the basic dashboard footer with a premium-designed responsive footer featuring hover-animated SVG links to the npm package and GitHub repository. Added a version badge (`no-crd v0.8.1`) that displays the server capabilities version dynamically.
- **SystemInfoModal Backend Metadata** ([ADR-018](docs/decisions/ADR-018-workspace-ownership-and-version-metadata.md)): Included the `@nogoo9/no-crd` backend version card inside the System Metadata info modal, dynamically fetched from the new `version` capability field.
- **Unauthenticated Workspace Redirection Recovery** ([ADR-017](docs/decisions/ADR-017-unauthenticated-workspace-redirection-recovery.md)): Preserved the post-login destination URL securely in `sessionStorage` to recover deep link navigation states when returning from OIDC PKCE redirect challenges.
- **`nogoo9/api.<api-name>.refresh` Annotation**: Registered and documented the API refresh frequency annotation pattern in `src/config/annotations.ts` to support configurable stats and activity refresh rates, automatically synchronizing documentation tables.

### Fixed

- **Workspace Owner Association & Spawn Schema Mismatch** ([ADR-018](docs/decisions/ADR-018-workspace-ownership-and-version-metadata.md)): Aligned the spawner frontend parameter mapping from `targetUserSub` to `userSub` to resolve spawner validation errors and guarantee that spawned pods are labeled with the correct user subject on creation.
- **Admin Layout Duplication** ([ADR-018](docs/decisions/ADR-018-workspace-ownership-and-version-metadata.md)): Partitioned workspace lists for administrator sessions so that admin-owned sandboxes appear in "My Workspace Sandboxes" while other users' sandboxes appear in "Shared/Other Sandboxes", preventing duplication on the dashboard page.
- **Session Cookie Custom JSONPaths** ([ADR-016](docs/decisions/ADR-016-session-cookie-custom-jsonpath-compatibility.md)): Fixed custom OIDC role mapping issues by properly reconstituting session cookies when using custom `subJsonPath` and `rolesJsonPath` claims.


## [0.8.0] — 2026-06-09

### Added

- **Consolidated Workspace Views & Template Upgrades** ([ADR-015](docs/decisions/ADR-015-workspace-view-consolidation-and-template-upgrades.md)): Grouped active workspaces on the dashboard by their respective pod templates and added a dynamic, dashed "Spawn Template" card button to launch new sandboxes. Supports templates without active workspaces, collapsing/expanding groups, and persisting collapsed state in `localStorage`. Relocated the template registration trigger to the main header toolbar.
- **Workspace Upgrade Operations**: Added tool support for upgrading workspaces to the latest version of their respective template. Upgrades delete the current pod and start a new one, preserving the state in persistent volumes (PVs). Added an "Upgrade All Outdated" button that processes all outdated workspaces in parallel.
- **Workspace Auth Modes**: Added `WORKSPACE_AUTH_MODE` configuration mapping supporting four modes: `inject-headers` (inject OIDC headers to downstream proxy), `same-origin` (redirect workspace to `/oauth/token` same-origin endpoint), `token-api` (expose token endpoint at `/_auth/token`), and `no-auth` (bypass authorization checks for routing proxy entirely).
- **Default Auth Mode and Bypasses**: When `AUTH_ENABLED` is true, the `inject-headers` auth mode is enabled by default for all workspaces regardless of whether the annotation is provided. Added detailed annotations mapping documentation.

### Fixed

- **Collapsible Template Group Toggle Bubbling**: Resolved Caret toggles triggering collapse events twice due to bubbling up to the header click container.
- **Card Button Layout & Styling**: Removed all button borders and shadows within cards, replacing them with flat styling and terracotta hover indicators. Segregated developer utility actions (Logs, Events, Spec, Preview) on the left and the Stop action on the right in a responsive split footer layout.

## [0.7.0] — 2026-06-07

### Added

- **Hardened Admin Access and Role Mapping** ([ADR-014](docs/decisions/ADR-014-admin-access-hardening-and-role-mapping.md)): Implemented a secure authentication model where admin actions require both the admin role (`AUTH_ADMIN_ROLE`) and the admin scope (`AUTH_REQUIRED_ADMIN_SCOPE`, default `"nogoo9:admin"`). Introduced an admin scope hierarchy that lets the admin scope satisfy standard read/write scope requirements.
- **Scope Bypass for Scope-less Credentials**: Permitted credentials that do not contain a scope claim to bypass scope validation, maintaining backward compatibility for role-only authorization configurations.
- **Proxy Token-to-Cookie Bootstrapping**: Implemented dynamic query-parameter-based JWT verification in the reverse routing proxy, which automatically sets a path-scoped, secure session cookie (`nocr_token`) on first access to enable seamless workspace subresource loading.
- **Direct Workspace SSO Redirection**: Added automatic SSO challenge redirecting when direct workspace URLs are loaded without active authorization. Users are routed to the dashboard to login and then returned transparently to their workspace.
- **Ada Space Minimalist UI Realignment**: Revamped the UI to clean up double-borders and optimize spacing. Integrated new tools: comfort/compact layout density toggle, grid/list workspaces layout toggle, and local dashboard search filter.
- **Direct OAuth Endpoint Config**: Added server support for direct URL parameters (`OAUTH_AUTHORIZATION_URL`, `OAUTH_TOKEN_URL`, `OAUTH_END_SESSION_URL`) as alternatives to dynamic OIDC discovery lookup.
- **Husky & Nano-staged Pre-commit Hooks**: Integrated automated code-quality hooks to enforce Biome check and type verification before committing code.

### Fixed

- **Workspace Header Overlap Bug**: Resolved a bug where desktop grid containers crushed the workspace card header, causing the status badge to overlap the monitor icon on small screens. Now uses flexible wrapping layouts.
- **Keycloak Offline Role Assignments**: Updated Keycloak realm configs and E2E test scripts to support the new admin scopes and offline access rules.
- **VitePress Docs Refactoring**: Corrected Mermaid syntax errors, updated permissions mappings, and consolidated documentation guides.

## [0.6.0] — 2026-06-03

### Added

- **Proxy-Level Transparent Token Refresh**: Implemented a transparent, proxy-level OIDC token refresh flow in the BFF gateway. The gateway now automatically intercepts requests with expired JWT access tokens, exchanges the HttpOnly secure session refresh token for a new pair of access/refresh tokens, and updates the client cookies and session in-flight without interrupting the user.
- **OIDC Scopes Parameterization**: Parameterized the OIDC scopes requested by the frontend login flow via the `OAUTH_SCOPES` server environment variable (defaulting to `"openid profile email offline_access"`).

### Fixed

- **Keycloak Offline Access Role Mapping**: Explicitly added the `offline_access` role to the local dev realm configuration and assigned it to the default test users (`readuser`, `writeuser`, `adminuser`) to prevent `400 Bad Request` token exchange failures during OIDC PKCE flow.

## [0.5.6] — 2026-05-30

### Fixed

- **Built-in Local Fallback Templates**: Dynamically attach the `nogoo9/pod-template` label in the local template parser so that fallback workspaces automatically inherit the template discovery label without modifying the YAML files.

## [0.5.5] — 2026-05-30

### Fixed

- **Template Label Merging**: Fixed a bug where metadata labels defined in templates (both ConfigMap templates and local templates) were not merged into the spawned workspace pod's labels.
- **Dynamic Init volume sharing**: Added a new boolean annotation flag `nogoo9/init-share-volumes` (defaulting to `"true"` for backward compatibility). When set to `"false"`, it prevents the dynamically injected init container from inheriting the main container's volume mounts.

## [0.5.4] — 2026-05-30

### Added

- **Configurable UI Branding**: `UI_TITLE` and `UI_SUBTITLE` environment variables allow white-label customization of the dashboard header at runtime.
- **Version Badge & Links in UI**: Dashboard header shows the server version (fetched from `/healthz`) plus GitHub and npm icon links.
- **`/healthz` Version & Branding**: Health endpoint now returns `{ status, version, branding: { title, subtitle } }`.
- **Centralized `APP_VERSION`**: New `src/version.ts` replaces hardcoded version strings in the MCP server constructor and healthz handler.
- **"Powered by nogoo9" Footer**: Subtle footer with GitHub link at the bottom of the dashboard.

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
