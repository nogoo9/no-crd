# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
