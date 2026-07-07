# What's New

Welcome to the release notes and update history for `@nogoo9/no-crd`. Here you'll find details of new features, enhancements, and bug fixes introduced in each version.

## What's New in v0.13.0

- **Template Version & Outdated Display in UI**: The React dashboard now displays the active template version of each workspace pod (e.g. `v1.0.0`) alongside the target template version (e.g. `v1.0.0 → v1.1.0`) when a template update is available, making version management visually clear.
- **Upgrade Failure Display in UI**: If a background upgrade fails or times out (exceeding the 10-minute threshold), the React dashboard renders an inline alert block detailing the upgrade error (e.g., `ImagePullBackOff` logs) on the workspace card and the specifications details panel, helping users troubleshoot issues immediately.
- **Dynamic Get Workspace Status Alignment**: Fixed an inconsistency where the `get_workspace` tool bypassed the upgrade transition reconciliation loop. It now correctly returns `"Upgrading"` status during active migrations and dynamically cleans up duplicate/stale upgrade pods.
- **Upgrade Demo Tasks with Delay**: Added `trigger-upgrade-demo` and `revert-upgrade-demo` Moon tasks which apply ConfigMap manifests with a `30s` `initContainer` delay, allowing developers to test and witness the upgrading transition state on the UI easily.

## What's New in v0.12.0

- **Non-Blocking Workspace Template Upgrades** ([ADR-024](/decisions/ADR-024-non-blocking-workspace-template-upgrade.md)): Workspace template upgrades are now executed asynchronously in the background. Calling `upgrade_workspace` immediately returns an `"upgrading"` status with a tracking ID, preventing client/network timeouts when pulling large container images.
- **RWO Volume Recreate Fallback**: If a workspace utilizes Persistent Volume Claims (PVCs) with `ReadWriteOnce` (RWO) mode, the Spawner automatically falls back to a recreate-style upgrade flow. It deletes the old pod immediately to release the volume lock, ensuring the new pod can mount the volume without conflicts.
- **Side-by-Side Upgrade Readiness**: For standard (non-RWO) workspaces, upgrading pods spawn side-by-side. The routing proxy and WebSocket proxy dynamically select and route traffic to the newest running and ready pod, ensuring a zero-downtime cutover.
- **Upgrade Failure Logs**: Detailed diagnostic error logs are now captured and annotated onto the old pod under `nogoo9/last-upgrade-error` if a background upgrade fails or times out (10-minute limit), preserving the existing workspace replica instead of causing a total outage.
- **Upgrades Documentation**: Added a comprehensive guide explaining template versioning rules, upgrade workflows, cutover behavior, and failure reconciliation.

## What's New in v0.11.1

- **Cookie TTL Alignment**: Session cookies now dynamically match their token's actual lifetime instead of using static defaults. The `nocr_token` cookie derives its `Max-Age` from the JWT `exp` claim, and `nocr_refresh` from the IdP's `refresh_expires_in` field. This prevents stale cookies from outliving expired tokens and causing repeated failed refresh attempts. Configurable fallbacks are available via `PROXY_TOKEN_COOKIE_TTL` (default 24h) and `PROXY_REFRESH_COOKIE_TTL` (default 7d).
- **Stale Refresh Cookie Cleanup**: When the Identity Provider rejects a refresh token (e.g. `invalid_grant`), the gateway immediately clears the `nocr_refresh` cookie rather than retrying on every subsequent request.
- **Refresh Token Rotation Safety**: The gateway now safely supports strict refresh token rotation (where the IdP invalidates the old token on each refresh) via a singleflight deduplication pattern. Concurrent browser requests that all need a refresh are coalesced into a single IdP round-trip, preventing race conditions where a second request would find its token already revoked.

## What's New in v0.11.0

- **Health Check Dependent on Session Key Resolution** ([ADR-022](/decisions/ADR-022-session-key-health-readiness.md)): Implemented dependency checks for `/healthz` and `/mcp/healthz` health check endpoints. The gateway will now fail with `503 Service Unavailable` if the session signing key is not yet resolved. This prevents traffic from being routed to uninitialized replicas during multi-replica deployments.
- **Proxy Keep-Alive Configuration**: Added a runtime config option `PROXY_KEEP_ALIVE` (defaults to `true`) and attached a keep-alive `http.Agent` to the routing proxy when active, reducing TCP handshake overhead for downstream workspace resources.
- **Startup Sequence Flowchart**: Documented the service startup sequence with a detailed Mermaid flowchart showing the handshake, leader election, and readiness verification flow.
- **E2E Peer Discovery Script**: Added an automated peer discovery verification script (`scripts/e2e-peer-discovery.sh`) to test multi-replica leader/follower negotiation under concurrent boot.

## What's New in v0.10.0


- **Fine-Grained Permissions & Scope Checks** ([ADR-020](/decisions/ADR-020-fine-grained-roles-template-ownership-and-api-visibility.md)): Refactored the authorization engine to support granular permissions checking. Promoted standard Readers (`viewer` role) to allow starting and stopping their own sandboxes, while Writers (`user` role) can additionally create and edit templates. Bypassed scope validation for credentials that completely lack a scope claim.
- **Template Creator Tracking & Immutability** ([ADR-020](/decisions/ADR-020-fine-grained-roles-template-ownership-and-api-visibility.md)): Stamped all dynamic ConfigMap templates with the creator's user subject (`nogoo9/user-sub`). Standard users can only update or delete templates created by them, while local filesystem-loaded templates are made fully immutable and protected against updates or deletions.
- **Workspace API Routing & Visibility Annotations** ([ADR-021](/decisions/ADR-021-workspace-api-annotations-and-visibility-controls.md)): Created a dedicated specification for dynamic workspace sub-API annotations. Added support for `scope:<scope_name>` and `role:<role_name>` visibility checks, allowing developers to restrict access to subpaths to callers possessing specific OIDC scopes or roles.
- **UI Workspace & Template Permissions Adaptation** ([ADR-020](/decisions/ADR-020-fine-grained-roles-template-ownership-and-api-visibility.md)): Enhanced the React dashboard to display creator metadata, conditionally enable template deletion (trash icon) and workspace stop/upgrade actions according to the authenticated user's permissions and roles.
- **Admin Visibility Check Fix**: Fixed a bug where the `allowed` status was not assigned in the proxy authentication handler (`auth.ts`) and WebSocket upgrade proxy (`ws-proxy.ts`) when API visibility was set to `"admin"`, resolving access issues for administrator accounts on restricted endpoints (such as `stats` or `last_activity`).

## What's New in v0.9.0

- **Interactive Popup SSO Renewal & Session Expiry Warnings**: Added a top-level session expiration warning banner prompting users to renew their access session when expiring and OIDC refresh tokens are unavailable/disabled on the Identity Provider. Renewals run inside an auto-closing popup window triggered via voluntary user interaction to satisfy browser security bounds.
- **Auto/Manual Refresh Dashboard Control**: Added a premium segmented dashboard toggle enabling users to choose between automated data polling (every 5 seconds) and manually triggered data refresh, persisting preferences in `localStorage`.
- **Maximize & Reload Control for Inline Workspaces**: Enhanced workspace preview modals with layout toggle options to maximize/restore view width and a toolbar reload option to quickly reload application frames.
- **Keycloak Hostname and Path Synchronization**: Integrated the `KC_HOSTNAME` environment variable mapping set to `http://localhost:8080/auth` to enforce unified issuer URLs (`http://localhost:8080/auth/realms/nogoo9`) for both external login pathways and backchannel cluster-to-cluster token refresh queries, resolving OIDC path stripping and `invalid_grant` errors.
- **Dynamic Path-Scoped Cookie Routing**: Extended cookie prefix path resolution to incorporate dynamic base-url subpaths (`Path=/nocr/`), preventing cookie visibility leakage or browser session collision across Dynamic Workspace views.
- **Cat-Themed Favicon Packaging**: Embedded a lightweight, custom vector cat-themed SVG favicon (using an inline base64 Data URL) inside the HTML templates, ensuring it is automatically packaged inside the NPM distribution package and the Docker container image without requiring external asset serving handlers.
- **Official Fastify Rate Limiting Plugin Integration**: Replaced the custom in-memory rate limiting implementation with the official `@fastify/rate-limit` plugin. This hardens sensitive authentication endpoints (token retrieval, OIDC authorize redirect, and OIDC refresh) using a parameterizable rate-limiter configuration (`RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` environment variables) with proxy-aware client IP extraction to correctly identify clients behind reverse proxies.

## What's New in v0.8.1

- **NPM and GitHub Links & Dynamic Version Reporting**: Integrated direct navigation links to the [GitHub Repository](https://github.com/nogoo9/no-crd) and the [npm Package](https://www.npmjs.com/package/@nogoo9/no-crd) inside the gateway dashboard footer. Added a styled mono-badge displaying the dynamic server capabilities version returned by the backend (e.g. `no-crd v0.8.1`).
- **SystemMetadata Backend Info**: Added a **no-crd Backend** card inside the `SystemInfo` metadata modal showing `@nogoo9/no-crd` and its current active version, aligning with the new capabilities version payload field.
- **Workspace Owner Validation & Spawn Schema Mismatch**: Fixed a schema validation mapping error by changing the frontend parameter from `targetUserSub` to `userSub` during workspace spawning. This ensures that dynamic workspaces inherit the proper owner context instantly on creation.
- **Admin Layout Separation & Duplication Prevention**: Partitioned the workspaces grid for admin sessions so that admin-owned sandboxes appear in "My Workspace Sandboxes" and all other users' sandboxes appear in "Shared/Other Sandboxes" without visual duplication or layout overlapping.
- **Refresh Interval Annotation Registration**: Registered the `nogoo9/api.<api-name>.refresh` annotation in `src/config/annotations.ts`, which automatically updates the permissions and annotations tables in user guides and developer docs.

## What's New in v0.8.0

- **Consolidated Workspace UI & Event Logs** ([ADR-015](/decisions/ADR-015-workspace-view-consolidation-and-template-upgrades)): Streamlined the frontend dashboard by removing the separate "Pods" list and merging log streaming, pod lifecycle events, and upgrade status directly into the single Workspace card view. Added a new `get_workspace_events` MCP tool to pull real-time Kubernetes pod events into the UI.
- **Template Versioning and Outdated Detection**: Introduced the `nogoo9/template-version` annotation (defaulting to `"1.0.0"`) on pod templates. The `list_workspaces` and `get_workspace` tools now compare the pod's running template version against the latest version available in the registry, returning `isOutdated: true` for older versions so the UI can display warnings and upgrade options.
- **Safe Template Upgrades**: Implemented a state-preserving workspace upgrade flow (`upgrade_workspace` and `upgrade_all_workspaces` MCP tools) that retains PersistentVolumeClaim (PVC) attachments and custom environment variables, polling Kubernetes until the old pod is fully terminated before spawning the new pod to prevent volume attach conflicts.
- **Workspace Authentication Modes**: Added support for `WORKSPACE_AUTH_MODE` configuration mapping, allowing workspaces to run in four modes: `inject-headers` (inject OIDC identity headers to downstream proxy), `same-origin` (redirect workspaces to local token-api for same-origin authentication), `token-api` (expose OIDC token generation directly via a secure local endpoint), and `no-auth` (bypass authorization checks entirely for routing proxy and delegate auth check directly to the workspace).
- **Default Auth Mode and Bypasses**: When `AUTH_ENABLED` is true, the `inject-headers` auth mode is enabled by default for all workspaces regardless of whether the annotation is provided. Added detailed annotations mapping documentation.
- **Frictionless STDIO Developer Tools Support**: Configured the server to dynamically bypass JWT token validation when running on `TRANSPORT=stdio`, allowing local debugging tools like the MCP Inspector and Claude Desktop to function seamlessly while preserving full authentication checks on network connections.
- **Global OAuth Metadata Discovery**: Implemented a global interception hook for `/.well-known/oauth-protected-resource` and its subpaths, returning discovery metadata with `Access-Control-Allow-Origin: *` to prevent CORS blocks from local developer interfaces.
- **Collapsible Template Groups & UI Polish**: Enabled template group carets and headers to collapse/expand workspace templates, persisting their states in `localStorage`. Optimized workspace card footers into a split toolbar layout (developer utilities on the left, life cycle action on the right) with borderless flat buttons, terracotta hover overlays, and distinct icons.

## What's New in v0.7.0

- **Hardened Admin Access and Role Mapping** ([ADR-014](/decisions/ADR-014-admin-access-hardening-and-role-mapping)): Added a dedicated `AUTH_REQUIRED_ADMIN_SCOPE` (defaulting to `"nogoo9:admin"`). All administrative actions now require both the admin role (`AUTH_ADMIN_ROLE`) and the admin scope. An admin scope hierarchy makes the admin scope a superset that automatically satisfies standard read and write scope requirements. Bypassed scope validation for tokens that do not possess any scope claim (backwards compatibility).
- **SSO Redirection and Token Bootstrapping**: Implemented a token-to-cookie bootstrapping flow for workspace proxy access. Direct workspace hits redirect unauthorized HTML requests back to the SSO sign-in page, which routes users back with query-parameter tokens to establish the session.
- **Ada Space Inspired UI Realignment**: Cleaned up the dashboard by removing redundant borders, improving layouts to prevent overlaps, and adding features like grid/list view layout toggles, client-side search bar filtering, and comfortable/compact density controls.
- **Direct OAuth URL Configuration**: Supported direct token/authorization endpoints as alternatives to OIDC discovery URLs.
- **Husky & Nano-Staged Git Hooks**: Integrated git hooks to automate linting, formatting, and safety checks on commit.

## What's New in v0.6.0

- **Proxy-Level Transparent Token Refresh**: Implemented a transparent, proxy-level OIDC token refresh flow in the BFF gateway. The gateway now automatically intercepts requests with expired JWT access tokens, exchanges the HttpOnly secure session refresh token for a new pair of access/refresh tokens, and updates the client cookies and session in-flight without interrupting the user.
- **OIDC Scopes Parameterization**: Parameterized the OIDC scopes requested by the frontend login flow via the `OAUTH_SCOPES` server environment variable (defaulting to `"openid profile email offline_access"`).
- **Keycloak Offline Access Role Mapping**: Explicitly added the `offline_access` role to the local dev realm configuration and assigned it to the default test users (`readuser`, `writeuser`, `adminuser`) to prevent `400 Bad Request` token exchange failures during OIDC PKCE flow.

## What's New in v0.5.6

- **Built-in Local Fallback Templates**: Dynamically attach the `nogoo9/pod-template` label in the local template parser so that fallback workspaces automatically inherit the template discovery label without modifying the YAML files.

## What's New in v0.5.5

- **Template Label Merging**: Corrected the bug where metadata labels defined in templates (both cluster-level ConfigMaps and local templates) were not merged into the spawned workspace pod's labels.
- **Dynamic Init volume sharing**: Added a new boolean annotation flag `nogoo9/init-share-volumes` (default `true`). Setting it to `"false"` disables the auto-application of the main container's volume mounts to the dynamically injected `spawner-init` container.

## What's New in v0.5.4

- **Fix "Already Connected" on Multi-Session** ([ADR-012](/decisions/ADR-012-per-session-mcp-server-factory)): The MCP server threw `"already connected transport, call close()"` when a second client session connected. The shared `globalMcpServer` singleton has been replaced with a per-session factory pattern, following the official MCP SDK convention. Each session now gets its own `McpServer` instance, and startup validation uses a throwaway server that is discarded after RBAC checks pass.
- **Configurable UI Branding**: Set `UI_TITLE` and `UI_SUBTITLE` environment variables to customize the dashboard header for white-label deployments. The branding is served via `/healthz` and applied at runtime — no rebuild required.
- **Version Badge in UI Header**: The dashboard header now shows the current server version, fetched at runtime from `/healthz`. GitHub and npm icon links are also displayed for quick navigation.
- **`/healthz` Returns Version & Branding**: The health check endpoint now returns `{ status, version, branding: { title, subtitle } }`, making version and branding information available to clients and monitoring tools.
- **Centralized `APP_VERSION` Constant**: A single `src/version.ts` module is the runtime source of truth for the application version, used by the MCP server constructor and `/healthz`. The `/bump` workflow updates it alongside `package.json` and `server.json`.
- **"Powered by nogoo9" Footer**: A subtle footer with a link to the GitHub repository is shown at the bottom of the dashboard.

## What's New in v0.5.3

- **Production-Safe UI Transport**: Removed the hardcoded `http://localhost:3000/mcp` fallback from the dashboard's HTTP transport client. The UI now exclusively uses the same-origin relative path derived from `BASE_URL`, eliminating `ERR_CONNECTION_REFUSED` errors and startup delays when deployed behind an ingress or reverse proxy.
- **Subpath-Aware Logout**: The UI logout button now correctly prefixes the `/logout` fetch call with `BASE_URL`, fixing silent 404 failures when the server is hosted under a subpath (e.g., `/gateway/no-crd`).
- **Fix Infinite OIDC Refresh Loop**: When the MCP endpoint returned `401 Unauthorized`, the UI called `window.location.reload()` which raced with the OIDC redirect flow, causing the page to loop endlessly without ever reaching the Identity Provider. The 401 handlers now show the login overlay instead, allowing the OIDC `triggerRedirect()` to execute normally.

## What's New in v0.5.2

- **Graceful Error Handling**: MCP tool handlers (`current_namespace`, `get_capabilities`) no longer crash on authentication failures or K8s API timeouts. All error paths now return structured `errorResult` responses that the UI can render gracefully.
- **Server Startup Resilience**: The MCP server now boots even when RBAC permission evaluation fails at startup (e.g., K8s API temporarily unreachable during pod initialization). It degrades to diagnostic tools only (`check_permissions`, `get_capabilities`, `current_namespace`, `list_templates`, `get_template`, `list_registry_images`) and operators can use these tools to troubleshoot.
- **Permission Denial Test Matrix**: Comprehensive test coverage for 6 RBAC denial scenarios, ensuring every combination of permission grants/denials results in correct tool gating without server crashes.

## What's New in v0.5.1


- **Graceful ConfigMap Template Fallback** ([ADR-010](/decisions/ADR-010-graceful-configmap-template-fallback)): Template tools now degrade gracefully when the service account lacks `configmaps` RBAC permissions. `list_templates` catches ConfigMap errors and continues to return local/built-in templates with a warning. `spawn_workspace` falls back to local templates when ConfigMap reads fail.
- **Template Read Tools Always Available**: `list_templates` and `get_template` are no longer gated behind ConfigMap permissions — they are unconditionally registered, ensuring agents always have access to the local and built-in template catalog even in minimal RBAC deployments.

## What's New in v0.5.0

- **Managed-Only Pod Access Control** ([ADR-008](/decisions/ADR-008-managed-only-pod-access-control)): Pod tools (`list_pods`, `get_pod`, `delete_pod`, `patch_pod`, `get_pod_logs`) now only operate on pods labeled `nogoo9/managed-by=nogoo9-spawner` when `MANAGED_ONLY=true` (default). No one bypasses this — not even admins.
- **Unmanaged Pod Count**: `list_pods` reports `unmanagedCount` — the number of pods in the namespace not managed by this server — without leaking details.
- **Auto-Label on Create**: `create_pod` automatically applies the `nogoo9/managed-by=nogoo9-spawner` label to all new pods, ensuring they are visible under managed-only mode.
- **Server Capabilities Endpoint**: New `get_capabilities` MCP tool returns `{ enabledTools, managedOnly, authEnabled, isAdmin }` so UI clients can adapt their rendering.
- **Capabilities-Aware UI**: The dashboard now disables buttons (Delete, Stop, Spawn, Logs) when the corresponding MCP tool is not in the user's `enabledTools` list. Disabled buttons show a "Insufficient permissions" tooltip.
- **Eager MCP Server Initialization** ([ADR-009](/decisions/ADR-009-eager-startup-health-check)): The HTTP transport now creates the MCP server and evaluates RBAC permissions at startup rather than lazily on the first request. If the Kubernetes API is unreachable, the server exits immediately with an actionable error instead of silently failing on every request.
- **Startup Health Check**: A K8s API connectivity probe (`listPods limit=1`) runs before the MCP server is created. Failed deployments now produce clear log messages with hints for common issues (ECONNREFUSED, Unauthorized, missing RBAC bindings).

## What's New in v0.4.1

- **Schema-Driven CLI Wrapper**: Refactored the command-line utility entrypoint to dynamically load parameter types, defaults, and validations directly from active configuration schemas, completely removing hardcoded flags logic.
- **Centralized Keys Map**: Replaced all hardcoded magic strings for Kubernetes labels and annotations with a single, unified reference map `ANNOTATION_KEYS` in `src/config/annotations.ts`.
- **Encapsulated Config Directory**: Moved and consolidated all configuration logic directly inside the `src/config/` directory, removing the redundant `src/config.ts` wrapper file.

## What's New in v0.4.0

- **Local & Built-In Templates**: Added support for reading workspace Pod templates from a local directory (`TEMPLATES_DIR` environment variable) or using the built-in catalog in `templates/`. These are merged seamlessly with cluster-level ConfigMap templates, with ConfigMaps taking higher priority in case of name collisions.
- **Three-Source Theme Merge Engine**: Implemented a visual theme provider. Themes are dynamically scanned and merged from three layers: cluster ConfigMaps (`THEMES_CONFIGMAP`), custom directories (`THEMES_DIR`), and built-in fallback themes.
- **Robust Packaged UI Asset Resolution**: Hardened path resolution (`DIST_DIR`) and asset loading (`resolveBuiltinDir`) in both flat and nested environments. This guarantees that running from compiled bundles, published npm packages (`nocrd9`), and Docker containers will correctly resolve static UI assets, templates, and themes out of the box.
- **Server & Routes Modularization**: Refactored the core HTTP/HTTPS server in `src/server/` into sub-modules (`mcp.ts`, `proxy.ts`, `static.ts`, `themes.ts`, `auth.ts`) to improve codebase legibility, test isolation, and route organization.
- **NPM Publish Safety Hook**: Added `"prepublishOnly": "bun run build"` in `package.json` to prevent publishing packages with missing or stale frontend assets.
- **Open WebUI Workspace Sandboxing**: Replaced browser-based WebContainers guide with a containerized `open-webui` template supporting persistent SQLite data mappings and local k3d registry bootstrap.
- **Workspace ID Auto-Generation**: Spawn modal automatically generates valid DNS-1123 compliant workspace resource IDs, prefixed with a sanitized user OIDC identity from the JWT payload and safely truncated to prevent length issues.
- **Dynamic Context Warnings**: Added dynamic validation for required context variables, including a visible warning note to caution users that plain-text secrets will be visible in the pod spec.
- **MCP Server Metadata Description (`server.json`)**: Added a standard `server.json` file to describe server capabilities, parameters, and environment variables for automated registry publishing and CI/CD.
- **Directory Layout Restructuring**: Renamed the `deploy/` directory to `kubernetes/manifest/` to align with future Helm charts and package organization.
- **YAML Pod Spec Parser**: Fixed the `spawn_workspace` spec parser to run `parseSpecString` instead of raw `JSON.parse`, enabling YAML templates to load successfully without crashing on non-JSON start characters.

---

## What's New in v0.3.0

- **GitHub Actions Security Tooling**: Standardized workflows with `actionlint` and `zizmor` security scanning, enforced strict job-level least-privilege permissions, and SHA-pinned Github Actions.
- **K3d Keycloak Service for E2E OAuth**: Built a comprehensive local OIDC testing environment with a containerized Keycloak deployment (`quay.io/keycloak/keycloak:26.0`) pre-configured with a PKCE-ready public client and test users to validate authorization flows locally.
- **Authentication & Authorization Hardening**:
  - Enforced per-user isolation for all raw pod tools (`list_pods`, `get_pod`, `create_pod`, `delete_pod`, `patch_pod`, and `get_pod_logs`) using label selector filtering, alongside admin role escalation via JWT claims.
  - Added cookie-based session extraction (`nocr_token`) inside the routing proxy, allowing relative sub-resources (JS, CSS, images) inside routed workspaces to load securely on new tabs.
  - Introduced parameterizable OAuth scope checks (`AUTH_REQUIRED_READ_SCOPE`, `AUTH_REQUIRED_WRITE_SCOPE`, and `AUTH_SCOPE_JSONPATH`) to segregate read-only client permissions from mutation/execution client permissions.
- **New `get_workspace` Tool**: Implemented a tool that retrieves workspace IP, container port, status, annotations, and preview metadata for a single workspace.
- **UI Theme & PKCE Authorization**:
  - Integrated a premium dark/light/system theme toggle.
  - Implemented client-side PKCE authorization redirect login.
  - Built an in-dashboard workspace file preview rendering engine supporting sandboxed HTML iframes and custom Markdown formatting.
- **Bun WebSocket Upgrade Compatibility Warning**: Documented a critical regression in the Bun runtime compatibility layer (`oven-sh/bun#28871`) where asynchronous upgrade handshakes drop incoming frames, and proposed a native `Bun.serve` WebSocket proxy architecture to mitigate this.

---

## What's New in v0.2.0

- **Composable Programmatic SDK**: Refactored `src/index.ts` to export clean programmatic APIs for spawning, stopping, and listing workspaces/templates. Developers can pass custom `KubeConfig` or pre-configured client APIs to run custom pod lifecycles programmatically. The server startup logic is isolated in `src/server-entry.ts`.
- **Subpath Prefix Support**: Configurable `BASE_URL` allows hosting the dashboard and server behind an enterprise reverse proxy subpath (e.g. `/gateway/no-crd`) without needing path rewrite rules.
- **Dynamic Routing Proxy**: A built-in JWT-authorized workspace router `/route/:workspaceId/*` routes internal HTTP traffic natively to the target pod IP in the cluster. Ensures that the pod's owner claim matches the token's subject.
- **RFC 9728 & Extended Auth**: Fully compliant with RFC 9728 by serving `/.well-known/oauth-protected-resource` discovery metadata. Propagates JWT identity context across direct tools calls using `AsyncLocalStorage`.
- **State Setup & Backup Examples**: Provides robust examples under `examples/` demonstrating how to pull code from Git at workspace startup (`initContainers`) and how to run automated backup scripts to S3/MinIO on workspace termination (`preStop` sidecars).
- **Dashboard Upgrade**: Re-engineered UI featuring a visual user identity badge, token settings modal, YAML/JSON spec drawer viewer, dynamic template creation form, and live toast notification banners.

---

## What's New in v0.1.1

- **NPM Publishing Improvements:** Updated `package.json` with standard publishing metadata fields (`homepage`, `repository`, `bugs`, `publishConfig`, `keywords`, and `files`) to ensure clean distribution.
- **Documentation Portal Linkage:** Embedded direct links to the published GitHub Pages documentation site in the README and project badges.

---

## What's New in v0.1.0 (Initial Release)

`@nogoo9/no-crd` is designed for agent-driven, on-demand pod orchestration in Kubernetes (k8s/k3s) **without Custom Resource Definitions (CRDs)**. It provides a lightweight MCP server enabling AI agents and API clients to dynamically spin up, inspect, and teardown ephemeral sandboxes.

### Key Capabilities

#### 1. Zero Custom Resource Definitions (CRDs)
- Operates entirely against core Kubernetes APIs using native resources (`Pods`, `ConfigMaps`, and `ServiceAccounts`).
- Ensures portability across cloud platforms (EKS, GKE, K3s) and works inside locked-down environments with restricted cluster RBAC policies.

#### 2. Reusable ConfigMap-Based Templates
- Pod definitions are templated as standard Kubernetes ConfigMaps labeled with `nogoo9/pod-template=true`.
- Supports full template lifecycle management: listing, retrieval, inline overriding, creation, updating, and deletion.

#### 3. Agent Workspace Spawner
- Simplifies agent workspaces lifecycle.
- Handles user identity extraction from JWT tokens (to prevent tenant sandbox collision).
- Automatically provisions IAM Role-bound ServiceAccounts.
- Hooks up container initialization (`initContainers`) and graceful termination (`preStop` sidecars).

#### 4. Isomorphic Kubernetes Certificate Transport
- Solves Node-specific HTTPS Agent compatibility issues on native Bun and Deno `fetch` engines.
- Intercepts outbound requests and translates certificates seamlessly for Bun TLS options and Deno HTTP client configurations.

#### 5. Dynamic RBAC-Based Permission Checking
- Proactively queries the Kubernetes API using `SelfSubjectAccessReview` at startup.
- Dynamically enables or disables specific MCP tools depending on active RBAC capabilities, avoiding runtime API authorization crashes.

#### 6. Embedded React Pod Manager UI
- Bundles a responsive web application dashboard served directly as an MCP application resource.
- Allows visual browsing of active pods, template configmaps, and real-time logs.
