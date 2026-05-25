# What's New

Welcome to the release notes and update history for `@nogoo9/no-crd`. Here you'll find details of new features, enhancements, and bug fixes introduced in each version.


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
