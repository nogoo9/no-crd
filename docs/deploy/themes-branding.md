# Dashboard Themes & Branding

`@nogoo9/no-crd` exposes a built-in React UI dashboard served directly at root `/` (e.g. `http://localhost:3000/`) when running in HTTP/SSE transport mode. This guide outlines how to customize the visual theme and white-label branding variables.

---

## 🎨 Three-Source Theme Merge Engine

The UI dynamically resolves and merges CSS themes from **three sources** (highest to lowest priority):

1. **Kubernetes ConfigMap**: Loaded from a ConfigMap designated via the `THEMES_CONFIGMAP` environment variable.
2. **Local Directory**: Scanned from the folder designated by the `THEMES_DIR` environment variable (defaults to `themes/` inside the workspace).
3. **Built-in Catalog**: Hardcoded themes pre-baked into the server (including Vercel, Dracula, Apple, Nord, Stripe, Slack, Notion, and Antigravity).

If a theme ID collision occurs, the higher-priority source takes precedence (ConfigMap > Local Directory > Built-In).

---

## 📁 1. Local Theme File Setup
To add a theme via the local file system:
1. Create a directory named `themes/` in your execution path (or configure `THEMES_DIR` to point to a custom path).
2. Save your theme files with a `.css` extension. The file name will be used as the theme ID (e.g. `midnight-cyber.css`).
3. The server automatically reads the files on startup.

---

## ☸️ 2. Kubernetes ConfigMap Theme Setup
For production deployments, storing themes in a ConfigMap allows you to update styling dynamically without redeploying the pods.

Create a ConfigMap labeled `nogoo9/theme: "true"` or reference its name directly in `THEMES_CONFIGMAP`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: platform-themes
  namespace: nogoo9
data:
  # The key defines the theme ID
  enterprise-slate: |
    :root {
      --canvas: #0f172a;
      --surface-card: #1e293b;
      --primary: #10b981;
      --primary-active: #059669;
      --ink: #f8fafc;
      --body: #cbd5e1;
      --muted: #64748b;
      --hairline: #334155;
    }
```

Then configure the environment variable:
```bash
THEMES_CONFIGMAP="platform-themes"
```

---

## 🏷️ White-Label Branding Variables

You can customize the text display in the dashboard header at runtime. The UI queries these variables via the `/healthz` endpoint on initial mount:

| Environment Variable | Default Value | Description |
|---|---|---|
| `UI_TITLE` | `nogoo9 Pod Manager` | The title text displayed in the header banner. |
| `UI_SUBTITLE` | `On-demand Kubernetes pod orchestration...` | The description text displayed below the title. |

No rebuild of the React code or Docker image is required to apply branding changes.

---

## 💅 CSS Variable Specifications

When writing custom CSS themes, your file must define variables inside both the light-mode `:root` selector and the dark-mode `:root.dark` selector. Below is the reference of all supported variables:

| CSS Variable Key | Target Element / Purpose |
|---|---|
| `--paper` | Core dashboard body background floor. |
| `--surface` | Row highlight backgrounds, list elements, active selections. |
| `--sunken` | Sunken backgrounds like input fields, secondary elements. |
| `--card` | Main container card backgrounds. |
| `--ink` | Header titles and critical emphasis text. |
| `--ink-2` | Default paragraph reading body text. |
| `--ink-3` | Muted secondary description elements and metadata. |
| `--line` | Core division boundaries separating dashboard grids. |
| `--line-2` | Outline borders and inner visual boundaries. |
| `--accent` | Primary action buttons, links, and selections. |
| `--accent-press` | Click and active state for action buttons. |
| `--accent-soft` | Tinted background color for active markers and pills. |

---

## 🎨 Theme Styling Templates

Below are complete copy-pasteable CSS specifications for popular color styles:

::: code-group

```css [Nord Style]
/* Name: Nord */
:root {
  --paper: #eceff4;
  --surface: #e5e9f0;
  --sunken: #eceff4;
  --card: #ffffff;
  --ink: #2e3440;
  --ink-2: #4c566a;
  --ink-3: #d8dee9;
  --line: #e5e9f0;
  --line-2: #e5e9f0;
  --accent: #5e81ac;
  --accent-press: #4c566a;
  --accent-soft: rgba(94, 129, 172, 0.12);
}

:root.dark {
  --paper: #2e3440;
  --surface: #434c5e;
  --sunken: #2e3440;
  --card: #3b4252;
  --ink: #eceff4;
  --ink-2: #d8dee9;
  --ink-3: #4c566a;
  --line: #434c5e;
  --line-2: #434c5e;
  --accent: #88c0d0;
  --accent-press: #81a1c1;
  --accent-soft: rgba(136, 192, 208, 0.2);
}
```

```css [Dracula Style]
/* Name: Dracula */
:root {
  --paper: #f8f8f2;
  --surface: #f1f2f4;
  --sunken: #f1f2f4;
  --card: #ffffff;
  --ink: #282a36;
  --ink-2: #44475a;
  --ink-3: #6272a4;
  --line: #e2e4e9;
  --line-2: #e2e4e9;
  --accent: #bd93f9;
  --accent-press: #ff79c6;
  --accent-soft: rgba(189, 147, 249, 0.12);
}

:root.dark {
  --paper: #282a36;
  --surface: #44475a;
  --sunken: #44475a;
  --card: #1e1f29;
  --ink: #ff79c6;
  --ink-2: #f8f8f2;
  --ink-3: #6272a4;
  --line: #44475a;
  --line-2: #44475a;
  --accent: #bd93f9;
  --accent-press: #ff79c6;
  --accent-soft: rgba(189, 147, 249, 0.2);
}
```

```css [Apple Style]
/* Name: Apple */
:root {
  --paper: #f5f5f7;
  --surface: #e8e8ed;
  --sunken: #f5f5f7;
  --card: #ffffff;
  --ink: #1d1d1f;
  --ink-2: #515154;
  --ink-3: #86868b;
  --line: #d2d2d7;
  --line-2: #d2d2d7;
  --accent: #0071e3;
  --accent-press: #005ab5;
  --accent-soft: rgba(0, 113, 227, 0.12);
}

:root.dark {
  --paper: #161617;
  --surface: #323236;
  --sunken: #161617;
  --card: #1d1d1f;
  --ink: #f5f5f7;
  --ink-2: #a1a1a6;
  --ink-3: #6e6e73;
  --line: #323236;
  --line-2: #323236;
  --accent: #0071e3;
  --accent-press: #005ab5;
  --accent-soft: rgba(0, 113, 227, 0.2);
}
```

:::

---

## 💾 Deploying & Volume Mounting Themes

To deploy these custom themes onto your platform service pod:

1. **Volume Mount Local Files**:
   Mount a Kubernetes volume pointing to your ConfigMap directly into the MCP container's `/app/themes` path (which maps to the default `THEMES_DIR` environment lookup):
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
         name: platform-themes
   ```
2. **Environment Pathing Override**:
   If mounted elsewhere, set the directory target explicitly:
   ```bash
   THEMES_DIR="/mnt/custom-themes"
   ```

