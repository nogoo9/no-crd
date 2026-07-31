# ADR-027: Template Role and Scope Authorization Annotations

## Status
Accepted

## Date
2026-07-31

## Context
In multi-team Kubernetes clusters, different pod templates offer varying levels of access and hardware resources (e.g. GPU acceleration, administrative tools, or lead-developer privileges). Previously, any user with standard `mcp:write` permissions could spawn a workspace from any template available in the namespace.

## Decision
1. **Template Access Control Annotations**:
   - Introduced `nogoo9/allowed-roles` (`ALLOWED_ROLES`) and `nogoo9/allowed-scopes` (`ALLOWED_SCOPES`) template annotations.
   - Annotations accept comma-separated lists of allowed OIDC roles or scopes.
2. **Evaluation Strategy (AND Logic)**:
   - In `verifyTemplateAccessOrThrow()`, when a template specifies both `nogoo9/allowed-roles` and `nogoo9/allowed-scopes`, non-admin callers must possess **at least one** allowed role **AND** **at least one** allowed scope.
   - If a caller fails either requirement, workspace spawning is rejected with a `403 Forbidden` error specifying the missing capability.
3. **Administrator Bypass**:
   - Administrators bypass template restriction annotations.
4. **Metadata Reporting**:
   - `list_templates` and `get_template` tool outputs expose `allowedRoles` and `allowedScopes` parsed metadata arrays so UI clients can render role badges or disable spawn controls for unauthorized users.

## Alternatives Considered

### 1. OR Matching Strategy (Roles OR Scopes)
- **Pros**: More permissive access model.
- **Cons**: Weaker security when an administrator explicitly sets both role and scope constraints on high-privilege templates.
- **Rejected**: AND logic ensures strict compliance with both role and scope requirements.

### 2. Filtering Unauthorized Templates from `list_templates`
- **Pros**: Completely hides unauthorized templates.
- **Cons**: Reduces discoverability and prevents UI clients from showing why a user cannot launch a specific workspace.
- **Rejected**: Returning metadata allows frontend UIs to render clear accessibility indicators (e.g. locked badges).

## Consequences
- **Security Hardening**: Prevents non-privileged users from launching restricted pod templates.
- **UI Visibility**: Enables frontend clients to inspect `allowedRoles` and `allowedScopes` arrays to render accessibility status.
