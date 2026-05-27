# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
