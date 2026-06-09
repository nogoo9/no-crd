---
trigger: always_on
description: Guidelines for handshake and authentication sequencing in UI and MCP clients.
---

# UI and MCP Client Handshake & Authentication Sequence

When building, modifying, or refactoring the UI or any Model Context Protocol (MCP) client implementation, strictly adhere to the following sequence to prevent connection errors and redirect loops:

## 1. Handshake Sequencing
* **Wait for Handshake**: Never invoke any server tools (e.g., `list_workspaces`, `list_templates`) immediately on mount/load. 
* **Connection Check**: Ensure the asynchronous MCP connection handshake (`app.connect()`) has successfully completed and set a readiness state (e.g., `isInitialized = true`) before making any tool calls.

## 2. Authentication Flow Dependency
* **Auth Before Handshake**: The client must establish its identity first. Do not attempt to initialize the MCP connection (`app.connect()`) or call HTTP fallbacks until the user has successfully logged in via the Identity Provider (IdP) and a valid token is retrieved and available in state/storage.
* **Redirection Loop Prevention**: During OIDC/OAuth authorization callback processing (e.g., when the URL contains `?code=...`), ensure the auto-redirection watcher does not trigger a redirect while the token exchange request is in progress. The authorization `code` must NOT be treated as the actual access token or written directly to the token state before exchange.
