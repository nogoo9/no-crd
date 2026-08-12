# ADR-030: UI Profile Submenu Actions and Manual Sync Controls

## Status
Accepted

## Date
2026-08-12

## Context
The `@nogoo9/no-crd` single-page web UI (`src/ui/`) provides user authentication status monitoring, workspace pod management, and real-time MCP session tracking.

Users reported two usability and clarity issues in the UI dashboard:
1. **Auto-Relogin Placement**: The "Auto-Relogin" toggle was located in the main navbar controls, creating visual clutter and confusing users who expected profile-related security controls to reside within the user profile menu.
2. **MCP State Manual Refresh & Status Visibility**: Users wanted the ability to manually refresh MCP workspace state or disable automatic background polling entirely. In addition, the SSO session expiration warning banner ("Your SSO session is expiring soon. Click Refresh to maintain active workspace connections.") was displaying unconditionally or without clear connection to the manual refresh state.

## Decision
We updated the user interface layout and state management in `src/ui/app.tsx`:

1. **Profile Submenu Consolidation**: Moved the "Auto-Relogin" setting into a dedicated submenu inside the User Profile dropdown menu (`profile-menu`). When clicked, it toggles auto-relogin configuration without cluttering the primary navigation header.
2. **Dedicated Manual Sync Control**: Introduced a prominent `[ 🔄 Sync ]` button featuring a clear sync icon definition (`I.sync`), placed in the top navigation bar and section headers.
3. **Disabled Non-Interactive States**: When an active sync/refresh operation is in progress, the manual refresh button switches to a non-interactive disabled state with a spinning indicator to prevent duplicate concurrent request firing.
4. **Conditional Expiry Banner Rendering**: Configured the SSO session expiration notice banner to render dynamically based on `!isAutoRefresh`, alerting users when manual session renewal is required to maintain active workspace proxy connections.

## Alternatives Considered

### Keeping Auto-Relogin in Main Navigation
- **Pros**: Easy to find at a glance.
- **Cons**: Takes up valuable navbar real estate alongside workspace template selectors and theme pickers.
- **Rejected**: User feedback explicitly requested moving session management toggles into the profile submenu.

### Silent Background Polling Only
- **Pros**: Zero UI complexity.
- **Cons**: Provides no user control when working over low-bandwidth or metered network connections.
- **Rejected**: Explicit manual refresh option provides better control and transparency.

## Consequences
- Clean, uncluttered top navigation layout with intuitive user profile submenu organization.
- Instant manual workspace state refresh capability with clear visual loading feedback.
- Accurate SSO session expiration alerts when auto-relogin is disabled.
