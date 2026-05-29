# What's New

Welcome to the release notes and update history for `@nogoo9/no-crd`. Here you'll find details of new features, enhancements, and bug fixes introduced in each version.


## What's New in v0.5.1

- **Graceful ConfigMap Template Fallback** ([ADR-010](/decisions/ADR-010-graceful-configmap-template-fallback)): Template tools now degrade gracefully when the service account lacks `configmaps` RBAC permissions. `list_templates` catches ConfigMap errors and continues to return local/built-in templates with a warning. `spawn_workspace` falls back to local templates when ConfigMap reads fail.
- **Template Read Tools Always Available**: `list_templates` and `get_template` are no longer gated behind ConfigMap permissions — they are unconditionally registered, ensuring agents always have access to the local and built-in template catalog even in minimal RBAC deployments.

## What's New in v0.4.2

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
