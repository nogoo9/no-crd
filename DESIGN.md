---
version: beta
name: Antigravity-design-spec
description: An agentic workspace visual identity designed for Google Antigravity. Built around a deep-slate dark-mode canvas and a crisp slate light-mode, the theme leverages the Google Sans Flex variable typeface, vibrant Google Blue accents, glowing electric teal highlights, and premium translucent glassmorphic surfaces.
colors:
  primary: "#1a73e8"          # Google Blue
  primary-active: "#1557b0"   # Google Blue Dark/Active
  primary-disabled: "#cbd5e1" # Slate Light Disabled
  ink: "#0f172a"              # Slate-900 (Light Mode text)
  body: "#334155"             # Slate-700 (Light Mode body)
  body-strong: "#1e293b"      # Slate-800
  muted: "#64748b"            # Slate-500
  muted-soft: "#94a3b8"       # Slate-400
  hairline: "#cbd5e1"         # Slate-300 divider
  hairline-soft: "#e2e8f0"    # Slate-200 divider
  canvas: "#f8fafc"           # Slate-50 (Light canvas floor)
  surface-soft: "#f1f5f9"     # Slate-100
  surface-card: "#ffffff"     # White card surfaces
  surface-dark: "#0b0c10"     # Deep space base floor
  surface-dark-elevated: "#1e293b" # Slate-800 elevated panels
  surface-dark-soft: "#151720"     # Mid-level space panels
  on-primary: "#ffffff"       # White text on blue buttons
  on-dark: "#f8fafc"          # Slate-50 on dark surfaces
  on-dark-soft: "#94a3b8"     # Slate-400 on dark surfaces
  accent-teal: "#00f2fe"      # Electric Cyber Teal
  accent-amber: "#f59e0b"     # Glowing Amber
  success: "#10b981"          # Emerald Green
  warning: "#f59e0b"          # Amber Orange
  error: "#ef4444"            # Crimson Red

typography:
  display-xl:
    fontFamily: "Google Sans Flex, Google Sans, sans-serif"
    fontSize: 56px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -1.2px
  display-lg:
    fontFamily: "Google Sans Flex, Google Sans, sans-serif"
    fontSize: 40px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.8px
  display-md:
    fontFamily: "Google Sans Flex, Google Sans, sans-serif"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.5px
  display-sm:
    fontFamily: "Google Sans Flex, Google Sans, sans-serif"
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.3px
  title-lg:
    fontFamily: "Google Sans, Inter, sans-serif"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  title-md:
    fontFamily: "Google Sans, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "Google Sans, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "Inter, Roboto, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-sm:
    fontFamily: "Inter, Roboto, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  caption:
    fontFamily: "Google Sans, Inter, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "Google Sans, Inter, sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 1px
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0
  button:
    fontFamily: "Google Sans, Inter, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.2px
  nav-link:
    fontFamily: "Google Sans, Inter, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.1px

rounded:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 38px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 38px
  button-secondary-on-dark:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 18px
  button-text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.button}"
  button-icon-circular:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 38px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: 60px
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    padding: 80px 48px
  hero-illustration-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  feature-card:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 28px
  product-mockup-card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 28px
  code-window-card:
    backgroundColor: "{colors.surface-dark-soft}"
    textColor: "{colors.on-dark}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: 20px
  text-input:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 38px
  text-input-focused:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    borderColor: "{colors.primary}"
  badge-pill:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  badge-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-uppercase}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  footer:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark-soft}"
    typography: "{typography.body-sm}"
    padding: 48px
---

## Overview

The Google Antigravity visual brand represents a **high-tech, agent-first visual system** designed for developer focus, clarity, and precision. In contrast to Claude's warm-literary editorial styling, Antigravity anchors on a **sleek, developer-centric environment** leveraging:

1. **Google Sans Flex Variable Typeface**: Large-scale variable titles with precise optical weight adjustments, paired with **Inter** body text and **JetBrains Mono** code syntax.
2. **Space-Derived Contrast System**: Swapping between clean light-mode cards (`{colors.canvas}`) and a futuristic dark-mode deep canvas (`{colors.surface-dark}` — #0b0c10) accented with Google Blue (`{colors.primary}` — #1a73e8) and neon Electric Teal (`{colors.accent-teal}` — #00f2fe).
3. **Glassmorphism & Depth**: Surfaces utilize translucent layers, subtle backdrop blur filters (`backdrop-filter: blur(12px)`), and narrow border rules that keep the application layout visual weight lightweight and aligned.

This design is implemented in the platform's user interfaces and developer documentation.

## Colors

### Primary Accents & Signals
- **Google Blue** (`{colors.primary}` — #1a73e8): The signature interactive accent. Used on primary buttons, active selectors, primary links, and highlighted states.
- **Electric Teal** (`{colors.accent-teal}` — #00f2fe): A glowing highlight representing agentic activity and connection paths.
- **Amber Orange** (`{colors.accent-amber}` — #f59e0b): Warning alerts, active state annotations, and glowing indicators.

### Slate Surfaces
- **Canvas** (`{colors.canvas}` — #f8fafc): Light mode default floor. Clear, readable, and highly professional.
- **Surface Dark** (`{colors.surface-dark}` — #0b0c10): Deep space background floor for dark mode.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #1e293b): Elevated components (such as command bars, model settings panels, and context widgets) inside dark views.
- **Surface Dark Soft** (`{colors.surface-dark-soft}` — #151720): Intermediate backdrop for code viewer elements and tool displays.

## Typography

The system utilizes **Google Sans Flex** for headings, **Inter** for default paragraphs and UI labels, and **JetBrains Mono** for code and terminal content.

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 56px | 500 | 1.1 | -1.2px | Landing Page display headers |
| `{typography.display-lg}` | 40px | 500 | 1.15 | -0.8px | Main section titles |
| `{typography.display-md}` | 32px | 500 | 1.2 | -0.5px | Panel and dashboard subtitles |
| `{typography.display-sm}` | 24px | 500 | 1.25 | -0.3px | Card titles, callout headers |
| `{typography.body-md}` | 15px | 400 | 1.6 | 0 | Default text reading block |
| `{typography.code}` | 13px | 400 | 1.65 | 0 | Code listings and terminals |
| `{typography.button}` | 13px | 500 | 1.0 | 0.2px | Action buttons and interactive triggers |

## Component Tokens

- **Border Radius**: Defined hierarchically to structure clean lines: `{rounded.md}` (12px) for input elements and buttons; `{rounded.lg}` (16px) for standard panels and interactive cards; `{rounded.xl}` (24px) for hero elements and dialog frames.
- **Hairlines**: Consistent thin border borders (`1px solid {colors.hairline}`) isolate content zones without introducing visual noise.