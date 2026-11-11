# TrackPoli Admin — Browser & Device Support Matrix

Committed support target for the admin app, per `universal-browser-device-support`
(`references/support-matrix-and-targeting.md`). Decision Q-1-19: "All devices. Universally
responsive app." This file is the single source of truth for what "supported" means; test and
design against it, and treat anything outside it as progressive enhancement, never load-bearing.

## Browser engines (Baseline)

Support the current and previous stable release of each engine ("last 2 versions"):

| Engine | Browsers | Tier |
| --- | --- | --- |
| Blink | Chrome, Edge (desktop + Android) | Baseline — fully supported |
| Gecko | Firefox (desktop + Android) | Baseline — fully supported |
| WebKit | Safari (macOS + iOS/iPadOS) | Baseline — fully supported |

- **Baseline** = every feature works and is tested.
- Engines or versions outside Baseline get a usable, if plainer, experience through progressive
  enhancement; the app must never *require* a non-Baseline capability.
- We detect **features, never user agents** (enforced by `npm run check:no-ua`). No UA sniffing.

## Viewports

| Class | Width | Notes |
| --- | --- | --- |
| Small phone | **320px** (minimum supported) | Layout must work with no horizontal scroll; the side nav is a drawer. |
| Phone / large phone | 360–599px | Drawer nav; single-column content. |
| Tablet (portrait) | 600–1023px | Drawer nav; content may use 1–2 columns. |
| Desktop / tablet landscape | **≥1024px** | Persistent side nav rail; multi-column content. |

- **Mobile-first, fluid layout.** Breakpoints are content-driven; the one hard breakpoint for the
  shell is **1024px**, where the navigation changes between a persistent rail and a drawer (ticket).
- The shell is verified explicitly at **320px** and at a desktop width (E2E-13/E2E-14 run at both).

## Input modalities

Support touch, mouse, keyboard and stylus together — never assume one:

- **Keyboard:** every interactive element reachable and operable by keyboard, visible focus, logical
  order, focus trapped in and returned after dialogs (E2E-13; `universal-accessibility-wcag`).
- **Touch:** touch targets are at least **24×24 CSS px** (WCAG 2.2 AA 2.5.8 Minimum), and we design
  toward ~44×44 (AAA / Apple HIG) for primary controls. Hit areas never overlap below 24px.
- **Pointer/mouse & stylus:** hover is an enhancement, never the only way to reveal an action.

## Testing

- Automated axe scan of the shell with no serious/critical violations (E2E-14).
- Keyboard-only E2E pass through the shell (E2E-13), at 320px and desktop.
- Cross-engine checks run per `universal-browser-device-support/references/cross-browser-device-testing.md`.
