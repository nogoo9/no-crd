# Dashboard UI Guide

This document describes the design, implementation, and features of the enhanced dashboard UI introduced in `v0.3.0`.

## 1. Dark/Light Theme System

The dashboard UI dynamically adapts to the user's theme preferences using a custom toggle system:

- **Automatic Detection**: Defaults to the system theme (`prefers-color-scheme`) on initial load.
- **Theme Toggle Cycle**: A header button allows cycling through **System** ➔ **Light** ➔ **Dark**.
- **State Persistence**: The preferred theme is saved in `localStorage.getItem("nocr_theme")`.
- **Implementation**: Toggling themes updates custom CSS property variables on the `<html>` or `document.documentElement` element.

The styling is fully theme-agnostic and relies on semantic classes mapping to these variables:

```css
/* Custom variables for theme consistency based on DESIGN.md */
:root {
  --bg-color: #faf9f5; /* Canvas (warm cream) */
  --text-color: #3d3d3a; /* Body */
  --text-title: #141413; /* Ink */
  --text-muted: #6c6a64; /* Muted */
  --panel-bg: #efe9de; /* Surface card */
  --panel-border: #e6dfd8; /* Hairline */
  --item-border: #e6dfd8; /* Hairline */
  --modal-bg: #faf9f5; /* Canvas */
  --input-bg: #faf9f5; /* Canvas */
  --input-border: #e6dfd8; /* Hairline */
  --input-text: #141413; /* Ink */
  --badge-bg: #efe9de; /* Surface card */
  --badge-text: #3d3d3a; /* Body */
  --accent-color: #cc785c; /* Primary Coral */
  --accent-active: #a9583e; /* Primary active */
  --success-color: #5db872;
  --error-color: #c64545;
  --warning-color: #d4a017;
  --panel-hover-bg: #f5f0e8; /* surface-soft */
  --accent-amber: #e8a55a;
}

:root.dark {
  --bg-color: #181715; /* Surface dark */
  --text-color: #a09d96; /* On dark soft */
  --text-title: #faf9f5; /* On dark */
  --text-muted: #a09d96; /* On dark soft */
  --panel-bg: #1f1e1b; /* Surface dark soft */
  --panel-border: #252320; /* Surface dark elevated */
  --item-border: #252320; /* Surface dark elevated */
  --modal-bg: #1f1e1b; /* Surface dark soft */
  --input-bg: #181715; /* Surface dark */
  --input-border: #252320; /* Surface dark elevated */
  --input-text: #faf9f5; /* On dark */
  --badge-bg: #252320; /* Surface dark elevated */
  --badge-text: #a09d96; /* On dark soft */
  --accent-color: #cc785c; /* Primary Coral */
  --accent-active: #a9583e; /* Primary active */
  --success-color: #5db872;
  --error-color: #c64545;
  --warning-color: #d4a017;
  --panel-hover-bg: #252320; /* surface-dark-elevated */
  --accent-amber: #e8a55a;
}
```

## 2. OIDC PKCE Login Flow

To support authentication on the frontend, the UI contains a complete Authorization Code Flow with PKCE (RFC 7636):

- **Configuration Injection**: When `AUTH_ENABLED=true`, the MCP server injects the OAuth metadata via `window.__NOCR_OAUTH_CONFIG__` into the template on server-side load.
- **Authentication States**:
  - **Unauthenticated**: If no token is stored or the token has expired, the user sees a premium splash login overlay.
  - **Redirect Flow**: Clicking "Login" triggers a standard OAuth PKCE redirect. A random `code_verifier` is created, hashed into a `code_challenge`, and stored in `localStorage` alongside a `state` parameter. The user is redirected to Keycloak's `/auth` endpoint.
  - **Callback Processing**: On return, the `code` is exchanged via a direct `POST` to the Token endpoint, and the token is saved in `localStorage.setItem("nocr_token", token)`.

## 3. Workspace Entrypoint & API Rendering

Running workspace pods can configure a main entrypoint and additional API routing endpoints onto the dashboard using metadata annotations:

- **Main Entrypoint**:
  - `nogoo9/workspace-port`: The target container port (defaults to `3000`).
  - `nogoo9/workspace-path`: The subpath inside the container (e.g., `/report.html` or `/README.md`, defaults to `/`).
  - `nogoo9/workspace-type`: The format of preview rendering, either `html` or `markdown`.
- **Additional APIs**:
  - `nogoo9/api.<api-name>.port`: Exposes a custom service port.
  - `nogoo9/api.<api-name>.path`: The routing path prefix (e.g. `/terminal`).
  - `nogoo9/api.<api-name>.desc`: Short description.
  - `nogoo9/api.<api-name>.method`: Supported HTTP methods (e.g. `GET`, `POST`, or `*`).
- **Preview Modal**:
  - **HTML Preview**: Rendered inside a secure, sandboxed `<iframe>` to prevent script execution:
    ```html
    <iframe sandbox="allow-scripts" src="/route/<workspace-id>/<workspacePath>"></iframe>
    ```
  - **Markdown Preview**: Fetches the raw file and compiles it client-side into sanitized HTML.
- **Dynamic API Links**:
  - Clicking any of the API badges under the workspace row opens that service directly in a new window, proxy-routed to the correct custom container port (with subpath prefixes automatically stripped by the reverse proxy).

## 4. UI Layout & Widgets

The dashboard includes:
- **Workspace Cards**: Display status (Running/Pending/Stopped), Pod IP, target container port, and creation timestamp.
- **Interactive Control Widgets**: Create new workspaces from templates, delete running workspaces instantly, and view live logs.

## 5. Custom Themes System

The dashboard supports custom theme stylesheets loaded dynamically at runtime. By mounting a folder of CSS files or utilizing a ConfigMap, you can customize the complete visual appearance of the dashboard.

### How to Write a Theme

Themes are written as simple CSS files overriding the custom properties under `:root` and `:root.dark`.

Provide a header comment `/* Name: Theme Name */` at the top of the file to label the theme in the dropdown selector.

Here are a few templates for inspiration (based on [awesome-design-md](https://github.com/voltagent/awesome-design-md)):

#### Vercel Style (Stark Minimalist Black & White)
```css
/* Name: Vercel */
:root {
  --bg-color: #ffffff;
  --text-color: #444444;
  --text-title: #000000;
  --text-muted: #888888;
  --panel-bg: #fafafa;
  --panel-border: #eaeaea;
  --item-border: #eaeaea;
  --modal-bg: #ffffff;
  --input-bg: #ffffff;
  --input-border: #eaeaea;
  --input-text: #000000;
  --badge-bg: #fafafa;
  --badge-text: #444444;
  --accent-color: #000000;
  --accent-active: #111111;
  --success-color: #0070f3;
  --error-color: #ee0000;
  --warning-color: #f5a623;
  --panel-hover-bg: #eaeaea;
  --accent-amber: #f5a623;
}

:root.dark {
  --bg-color: #000000;
  --text-color: #888888;
  --text-title: #ffffff;
  --text-muted: #666666;
  --panel-bg: #111111;
  --panel-border: #333333;
  --item-border: #333333;
  --modal-bg: #111111;
  --input-bg: #000000;
  --input-border: #333333;
  --input-text: #ffffff;
  --badge-bg: #111111;
  --badge-text: #888888;
  --accent-color: #ffffff;
  --accent-active: #eeeeee;
  --success-color: #0070f3;
  --error-color: #ff0000;
  --warning-color: #f5a623;
  --panel-hover-bg: #222222;
  --accent-amber: #f5a623;
}
```

#### Linear Style (Precise Dark Purple & Charcoal)
```css
/* Name: Linear */
:root {
  --bg-color: #f7f7f8;
  --text-color: #4b5262;
  --text-title: #111217;
  --text-muted: #747d90;
  --panel-bg: #ffffff;
  --panel-border: #e2e4e9;
  --item-border: #e2e4e9;
  --modal-bg: #ffffff;
  --input-bg: #f7f7f8;
  --input-border: #e2e4e9;
  --input-text: #111217;
  --badge-bg: #f1f2f4;
  --badge-text: #4b5262;
  --accent-color: #5e6ad2;
  --accent-active: #4d58b3;
  --success-color: #15a85f;
  --error-color: #f34747;
  --warning-color: #eab308;
  --panel-hover-bg: #f1f2f4;
  --accent-amber: #eab308;
}

:root.dark {
  --bg-color: #0f0f13;
  --text-color: #b4b9c5;
  --text-title: #f7f8f9;
  --text-muted: #707584;
  --panel-bg: #15151c;
  --panel-border: #22232b;
  --item-border: #22232b;
  --modal-bg: #15151c;
  --input-bg: #0f0f13;
  --input-border: #22232b;
  --input-text: #f7f8f9;
  --badge-bg: #22232b;
  --badge-text: #b4b9c5;
  --accent-color: #5e6ad2;
  --accent-active: #4d58b3;
  --success-color: #15a85f;
  --error-color: #f34747;
  --warning-color: #eab308;
  --panel-hover-bg: #22232b;
  --accent-amber: #eab308;
}
```

#### Stripe Style (Polished Gray & Vibrant Blurple)
```css
/* Name: Stripe */
:root {
  --bg-color: #f6f9fc;
  --text-color: #425466;
  --text-title: #0a2540;
  --text-muted: #697386;
  --panel-bg: #ffffff;
  --panel-border: #e6ebf1;
  --item-border: #e6ebf1;
  --modal-bg: #ffffff;
  --input-bg: #ffffff;
  --input-border: #dbdfeb;
  --input-text: #0a2540;
  --badge-bg: #f6f9fc;
  --badge-text: #425466;
  --accent-color: #635bff;
  --accent-active: #4d44e6;
  --success-color: #22c55e;
  --error-color: #df1b41;
  --warning-color: #e3b300;
  --panel-hover-bg: #f8fafc;
  --accent-amber: #e3b300;
}

:root.dark {
  --bg-color: #0b0c10;
  --text-color: #adbac7;
  --text-title: #f0f6fc;
  --text-muted: #768390;
  --panel-bg: #161b22;
  --panel-border: #30363d;
  --item-border: #30363d;
  --modal-bg: #161b22;
  --input-bg: #0d1117;
  --input-border: #30363d;
  --input-text: #f0f6fc;
  --badge-bg: #21262d;
  --badge-text: #adbac7;
  --accent-color: #635bff;
  --accent-active: #4d44e6;
  --success-color: #22c55e;
  --error-color: #df1b41;
  --warning-color: #e3b300;
  --panel-hover-bg: #21262d;
  --accent-amber: #e3b300;
}
```

#### Nord Style (Elegant Arctic & Pastel Blues)
```css
/* Name: Nord */
:root {
  --bg-color: #eceff4;
  --text-color: #4c566a;
  --text-title: #2e3440;
  --text-muted: #d8dee9;
  --panel-bg: #ffffff;
  --panel-border: #e5e9f0;
  --item-border: #e5e9f0;
  --modal-bg: #ffffff;
  --input-bg: #eceff4;
  --input-border: #e5e9f0;
  --input-text: #2e3440;
  --badge-bg: #e5e9f0;
  --badge-text: #4c566a;
  --accent-color: #5e81ac;
  --accent-active: #4c566a;
  --success-color: #a3be8c;
  --error-color: #bf616a;
  --warning-color: #ebcb8b;
  --panel-hover-bg: #e5e9f0;
  --accent-amber: #ebcb8b;
}

:root.dark {
  --bg-color: #2e3440;
  --text-color: #d8dee9;
  --text-title: #eceff4;
  --text-muted: #4c566a;
  --panel-bg: #3b4252;
  --panel-border: #434c5e;
  --item-border: #434c5e;
  --modal-bg: #3b4252;
  --input-bg: #2e3440;
  --input-border: #434c5e;
  --input-text: #eceff4;
  --badge-bg: #434c5e;
  --badge-text: #d8dee9;
  --accent-color: #88c0d0;
  --accent-active: #81a1c1;
  --success-color: #a3be8c;
  --error-color: #bf616a;
  --warning-color: #ebcb8b;
  --panel-hover-bg: #434c5e;
  --accent-amber: #ebcb8b;
}
```

#### Dracula Style (Vibrant Purple & Dark Charcoal)
```css
/* Name: Dracula */
:root {
  --bg-color: #f8f8f2;
  --text-color: #44475a;
  --text-title: #282a36;
  --text-muted: #6272a4;
  --panel-bg: #ffffff;
  --panel-border: #e2e4e9;
  --item-border: #e2e4e9;
  --modal-bg: #ffffff;
  --input-bg: #f8f8f2;
  --input-border: #e2e4e9;
  --input-text: #282a36;
  --badge-bg: #f1f2f4;
  --badge-text: #44475a;
  --accent-color: #bd93f9;
  --accent-active: #ff79c6;
  --success-color: #50fa7b;
  --error-color: #ff5555;
  --warning-color: #f1fa8c;
  --panel-hover-bg: #f1f2f4;
  --accent-amber: #f1fa8c;
}

:root.dark {
  --bg-color: #282a36;
  --text-color: #f8f8f2;
  --text-title: #ff79c6;
  --text-muted: #6272a4;
  --panel-bg: #1e1f29;
  --panel-border: #44475a;
  --item-border: #44475a;
  --modal-bg: #1e1f29;
  --input-bg: #282a36;
  --input-border: #44475a;
  --input-text: #f8f8f2;
  --badge-bg: #44475a;
  --badge-text: #f8f8f2;
  --accent-color: #bd93f9;
  --accent-active: #ff79c6;
  --success-color: #50fa7b;
  --error-color: #ff5555;
  --warning-color: #f1fa8c;
  --panel-hover-bg: #44475a;
  --accent-amber: #f1fa8c;
}
```

#### Apple Style (Clean Minimal Gray & Premium Blue)
```css
/* Name: Apple */
:root {
  --bg-color: #f5f5f7;
  --text-color: #515154;
  --text-title: #1d1d1f;
  --text-muted: #86868b;
  --panel-bg: #ffffff;
  --panel-border: #d2d2d7;
  --item-border: #d2d2d7;
  --modal-bg: #ffffff;
  --input-bg: #f5f5f7;
  --input-border: #d2d2d7;
  --input-text: #1d1d1f;
  --badge-bg: #e8e8ed;
  --badge-text: #515154;
  --accent-color: #0071e3;
  --accent-active: #005ab5;
  --success-color: #34c759;
  --error-color: #ff3b30;
  --warning-color: #ff9500;
  --panel-hover-bg: #e8e8ed;
  --accent-amber: #ff9500;
}

:root.dark {
  --bg-color: #161617;
  --text-color: #a1a1a6;
  --text-title: #f5f5f7;
  --text-muted: #6e6e73;
  --panel-bg: #1d1d1f;
  --panel-border: #323236;
  --item-border: #323236;
  --modal-bg: #1d1d1f;
  --input-bg: #161617;
  --input-border: #323236;
  --input-text: #f5f5f7;
  --badge-bg: #323236;
  --badge-text: #a1a1a6;
  --accent-color: #0071e3;
  --accent-active: #005ab5;
  --success-color: #30d158;
  --error-color: #ff453a;
  --warning-color: #ff9f0a;
  --panel-hover-bg: #323236;
  --accent-amber: #ff9f0a;
}
```

#### Superhuman Style (Futuristic Minimal Blue Accent)
```css
/* Name: Superhuman */
:root {
  --bg-color: #f5f6f7;
  --text-color: #4b5563;
  --text-title: #111827;
  --text-muted: #9ca3af;
  --panel-bg: #ffffff;
  --panel-border: #e5e7eb;
  --item-border: #e5e7eb;
  --modal-bg: #ffffff;
  --input-bg: #f5f6f7;
  --input-border: #e5e7eb;
  --input-text: #111827;
  --badge-bg: #f3f4f6;
  --badge-text: #4b5563;
  --accent-color: #3b82f6;
  --accent-active: #2563eb;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  --panel-hover-bg: #f3f4f6;
  --accent-amber: #f59e0b;
}

:root.dark {
  --bg-color: #0a0b0d;
  --text-color: #b3b7bd;
  --text-title: #f3f4f6;
  --text-muted: #4b5563;
  --panel-bg: #121317;
  --panel-border: #1f2937;
  --item-border: #1f2937;
  --modal-bg: #121317;
  --input-bg: #0a0b0d;
  --input-border: #1f2937;
  --input-text: #f3f4f6;
  --badge-bg: #1f2937;
  --badge-text: #b3b7bd;
  --accent-color: #3b82f6;
  --accent-active: #2563eb;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  --panel-hover-bg: #1f2937;
  --accent-amber: #f59e0b;
}
```

#### Slack Style (Polished Eggplant Accent)
```css
/* Name: Slack */
:root {
  --bg-color: #f8f8f8;
  --text-color: #1d1c1d;
  --text-title: #4a154b;
  --text-muted: #616061;
  --panel-bg: #ffffff;
  --panel-border: #dddddd;
  --item-border: #dddddd;
  --modal-bg: #ffffff;
  --input-bg: #f8f8f8;
  --input-border: #dddddd;
  --input-text: #1d1c1d;
  --badge-bg: #f3f3f3;
  --badge-text: #1d1c1d;
  --accent-color: #4a154b;
  --accent-active: #3f0e40;
  --success-color: #2eb67d;
  --error-color: #e01e5a;
  --warning-color: #ecb22e;
  --panel-hover-bg: #f3f3f3;
  --accent-amber: #ecb22e;
}

:root.dark {
  --bg-color: #1a1d21;
  --text-color: #d1d2d3;
  --text-title: #f8f8f8;
  --text-muted: #ababad;
  --panel-bg: #222529;
  --panel-border: #35373b;
  --item-border: #35373b;
  --modal-bg: #222529;
  --input-bg: #1a1d21;
  --input-border: #35373b;
  --input-text: #d1d2d3;
  --badge-bg: #35373b;
  --badge-text: #d1d2d3;
  --accent-color: #3f0e40;
  --accent-active: #4a154b;
  --success-color: #2eb67d;
  --error-color: #e01e5a;
  --warning-color: #ecb22e;
  --panel-hover-bg: #35373b;
  --accent-amber: #ecb22e;
}
```

#### Notion Style (Considered Warm Minimalist Gray)
```css
/* Name: Notion */
:root {
  --bg-color: #fbfbfa;
  --text-color: #37352f;
  --text-title: #37352f;
  --text-muted: #787774;
  --panel-bg: #ffffff;
  --panel-border: #edece9;
  --item-border: #edece9;
  --modal-bg: #ffffff;
  --input-bg: #f7f6f3;
  --input-border: #edece9;
  --input-text: #37352f;
  --badge-bg: #edece9;
  --badge-text: #37352f;
  --accent-color: #2383e2;
  --accent-active: #1c6bb5;
  --success-color: #0f7b4b;
  --error-color: #d44037;
  --warning-color: #df9b08;
  --panel-hover-bg: #edece9;
  --accent-amber: #df9b08;
}

:root.dark {
  --bg-color: #191919;
  --text-color: #9b9b9b;
  --text-title: #ffffff;
  --text-muted: #666666;
  --panel-bg: #202020;
  --panel-border: #333333;
  --item-border: #333333;
  --modal-bg: #202020;
  --input-bg: #191919;
  --input-border: #333333;
  --input-text: #ffffff;
  --badge-bg: #333333;
  --badge-text: #ffffff;
  --accent-color: #2eaadc;
  --accent-active: #2383b0;
  --success-color: #0f7b4b;
  --error-color: #d44037;
  --warning-color: #df9b08;
  --panel-hover-bg: #333333;
  --accent-amber: #df9b08;
}
```

#### Antigravity Style (Futuristic Cyber Slate & Google Blue)
```css
/* Name: Antigravity */
:root {
  --bg-color: #f8fafc;
  --text-color: #334155;
  --text-title: #0f172a;
  --text-muted: #64748b;
  --panel-bg: #ffffff;
  --panel-border: #cbd5e1;
  --item-border: #cbd5e1;
  --modal-bg: #ffffff;
  --input-bg: #f1f5f9;
  --input-border: #cbd5e1;
  --input-text: #0f172a;
  --badge-bg: #f1f5f9;
  --badge-text: #64748b;
  --accent-color: #1a73e8;
  --accent-active: #1557b0;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  --panel-hover-bg: #f1f5f9;
  --accent-amber: #f59e0b;
}

:root.dark {
  --bg-color: #0b0c10;
  --text-color: #cbd5e1;
  --text-title: #f8fafc;
  --text-muted: #94a3b8;
  --panel-bg: #151720;
  --panel-border: #1e293b;
  --item-border: #1e293b;
  --modal-bg: #151720;
  --input-bg: #0b0c10;
  --input-border: #1e293b;
  --input-text: #f8fafc;
  --badge-bg: #1e293b;
  --badge-text: #94a3b8;
  --accent-color: #1a73e8;
  --accent-active: #1557b0;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  --panel-hover-bg: #1e293b;
  --accent-amber: #f59e0b;
}
```


### How to Publish Themes

1. **Local Filesystem**: Create a directory named `themes/` in your server's root working directory, and save your theme `.css` files inside it.
2. **Kubernetes ConfigMap**: Mount a Kubernetes ConfigMap containing your theme files into the container. For example:
   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: custom-dashboard-themes
     namespace: nogoo9
   data:
     dark-cyber.css: |
       /* Name: Dark Cyber */
       :root { ... }
   ```
   Mount it in the MCP server deployment spec under `/app/themes`:
   ```yaml
   spec:
     containers:
     - name: nogoo-mcp
       volumeMounts:
       - name: themes-vol
         mountPath: /app/themes
     volumes:
     - name: themes-vol
       configMap:
         name: custom-dashboard-themes
   ```
3. **Environment Configuration**: If you mount the theme files in a different directory, configure the `THEMES_DIR` environment variable to point to your mounted folder (e.g. `THEMES_DIR=/mnt/custom-themes`). The server will automatically scan this directory on start/request, register all valid themes, and display them in the dashboard dropdown. By default, it will scan `themes/` in the working directory (which is `/app/themes` inside the container).
