# ADR-011: UI BASE_URL Contract and Cookie Path Consistency

## Status

Accepted

## Date

2026-05-29

## Context

The server supports a `BASE_URL` environment variable (e.g., `/gateway/no-crd`) that prefixes all HTTP routes when deployed behind a reverse proxy or API gateway. Fastify registers all routes under `{ prefix: basePrefix }`, so a route defined as `/mcp` is served at `/gateway/no-crd/mcp`.

The UI dashboard runs in the browser and needs to make API calls to the server. It also constructs workspace links and handles OIDC redirect flows. All of these must resolve correctly regardless of whether `BASE_URL` is set or not.

Two issues were identified during an audit of the UI's HTTP calls:

1. **Hardcoded `localhost:3000` fallback**: The UI's HTTP transport initialization tried `http://localhost:3000/mcp` as a fallback endpoint. This is unreachable in production or k3d ingress deployments (port 3000 is only accessible inside the cluster), causing `ERR_CONNECTION_REFUSED` errors and unnecessary startup delays.

2. **`/logout` missing `basePath`**: The logout button fetched `/logout` without the `basePath` prefix, resulting in a 404 when `BASE_URL` is configured.

A third concern was raised about cookie `Path` values: the proxy sets `nocr_token` cookies with `Path=/route/{id}/` (without `basePrefix`), and the logout handler clears them with the same raw path. The question was whether this mismatch with the actual URL path (which includes `basePrefix`) would cause cookies to persist after logout.

## Decision

### 1. UI `basePath` Contract

The server injects `window.__NOCR_BASE_URL__` into the HTML page via `loadUiHtml()`. The UI reads this as `basePath`:

```typescript
const basePath = (window as any).__NOCR_BASE_URL__ || "";
```

**All UI fetch calls to server endpoints MUST prefix their paths with `basePath`.** This includes:

| Endpoint | Path Pattern |
|----------|-------------|
| MCP transport | `${basePath}/mcp` |
| Routing proxy links | `${basePath}/route/${id}/${path}` |
| Theme list | `${basePath}/api/themes` |
| Theme CSS file | `${basePath}/api/themes/${id}.css` |
| Logout | `${basePath}/logout` |

OIDC redirect URIs use `window.location.origin + window.location.pathname`, which implicitly includes the base path since the page itself is served under it.

### 2. No Hardcoded `localhost` URLs

The `http://localhost:3000/mcp` fallback was removed. The relative same-origin path `${basePath}/mcp` works in all deployment scenarios:

- **Local dev** (`bun run dev:bun`): origin is `http://localhost:3000`, `basePath` is `""`, resolves to `/mcp` ✓
- **k3d ingress** (`localhost:8080`): origin is `http://localhost:8080`, `basePath` is `""`, resolves to `/mcp` via ingress ✓
- **Subpath proxy** (`example.com/gateway/no-crd`): `basePath` is `/gateway/no-crd`, resolves to `/gateway/no-crd/mcp` ✓

### 3. Cookie Path Consistency (No Bug)

Analysis confirmed that cookie paths are **consistent** between set and clear operations:

| Operation | Location | Cookie Path |
|-----------|----------|-------------|
| **Set** `nocr_token` | `proxy.ts` onResponse | `Path=/route/${id}/` |
| **Clear** `nocr_token` | `mcp.ts` logoutHandler | `Path=/route/${id}/` |
| **Set** `nocr_sess` | `auth.ts` preHandler | `Path=/` |
| **Clear** `nocr_sess` | `mcp.ts` logoutHandler | `Path=/` |

Both set and clear use the same raw paths (without `basePrefix`). This works because:

- Fastify's `{ prefix: basePrefix }` affects URL routing, not the `Set-Cookie` header value.
- The `Path` attribute in `Set-Cookie` is a literal string sent to the browser.
- The browser matches cookies based on the `Path` value, not the URL the response came from.
- Since both operations write the same `Path` value, clearing always matches what was set.

**Important caveat**: If the reverse proxy rewrites cookie paths (some do), this could break. The current design assumes the proxy is transparent to `Set-Cookie` headers, which is the standard behavior for k8s Ingress controllers and most API gateways.

## Alternatives Considered

### Prefix cookie paths with `basePrefix`

- Pros: Cookies would match the actual URL path visible in the browser
- Cons: Unnecessary — Fastify doesn't rewrite cookie paths, and both set/clear already use matching raw paths. Adding the prefix would actually *break* consistency if only one side was updated.
- Rejected: The current approach is simpler and already consistent.

### Keep the `localhost:3000` fallback behind a dev-mode flag

- Pros: Would still work for the niche case of opening the UI from a different dev server
- Cons: No real use case — in local dev the page is served from `localhost:3000` so the relative path works. The flag adds complexity for zero practical benefit.
- Rejected: YAGNI. The relative path covers all real scenarios.

## Consequences

- All UI API calls are now audited and consistently use `basePath`
- No hardcoded localhost URLs remain in production code
- Cookie path behavior is documented with inline comments referencing this ADR
- Future developers modifying cookie-setting code should maintain the path consistency documented here
