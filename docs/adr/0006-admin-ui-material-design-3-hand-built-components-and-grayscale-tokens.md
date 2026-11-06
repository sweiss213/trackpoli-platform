# 0006. Admin UI: Material Design 3 via hand-built components and grayscale design tokens

Date: 2026-11-05

## Status

Accepted

## Context

TP1-02 brings the first real screens (the sign-in screen and its error state). The designs (Figma "Track
Poli Phase 3 — Design") are **Material Design 3**, delivered deliberately in **grayscale** — the brand
colour theme is added later. We had to decide how to implement MD3 in a Next.js 16 / React 19 / strict-TS
app whose `tokens.css` and `globals.css` were still placeholders (the token system was planned for P1-12).
The sign-in screen needs only a small set of components: an outlined text field (with label, error state,
and a trailing visibility toggle), two buttons (a filled action and an outlined Google button), and an
inline error banner.

## Decision

- **Implement MD3 as CSS custom-property design tokens** in `src/styles/tokens.css` — the M3 colour roles
  and type scale — with **grayscale values now**, taken verbatim from the Figma MD3 tokens. Adding the
  brand colour later is a **token-value swap with no component changes**. No colour literal lives outside
  this file.
- **Build the few needed components by hand** (`src/components/ui`: `Button`, `TextField`, `Banner`, plus
  small icon wrappers) as React + **CSS Modules** that reference the tokens. The components are pure and
  presentational (components `AGENTS.md`): render and format, no data access.
- **Roboto** (the MD3 default type) is loaded through `next/font/google` and exposed as the
  `--md-font-roboto` variable the token layer consumes.
- The P1-12 app-shell task extends this same token layer and component set; it is not re-invented there.

Rejected alternatives:
- **A Material component library (MUI `@mui/material`)** — a large dependency with a CSS-in-JS runtime that
  inflates the bundle (we gate bundle size) and whose theming indirection works against the simple
  "swap token values for colour later" requirement.
- **Material Web components (`@material/web`)** — web-component / SSR friction with React 19 and the App
  Router for little gain at this size.
- **Tailwind** — the design-to-code guidance and this project explicitly do not add Tailwind.

## Consequences

The bundle stays small, we keep full control of accessibility (labels, focus, `aria-invalid`, the
visibility-toggle button, an `aria-live` error region), and the implementation matches the Figma MD3 tokens
exactly. The grayscale→colour path is a one-file change. Costs and honest limits: we maintain the component
layer ourselves — acceptable at this small surface and the explicit plan for P1-12 to grow it. The filled
"Sign in" button currently uses the `secondary-container` role (grey) exactly as the design specifies; when
the colour theme lands, that mapping is revisited in the token layer, not in the component. The grayscale
tokens are not a finished visual design — colour, and any dark theme, are applied later by redefining the
token values (and, for dark mode, under a `prefers-color-scheme` / `data-theme` block).
