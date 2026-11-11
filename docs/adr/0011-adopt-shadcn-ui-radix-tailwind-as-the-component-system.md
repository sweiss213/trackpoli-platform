# 0011. Adopt shadcn/ui (Radix + Tailwind) as the component system

Date: 2026-11-10

## Status

Accepted

Supersedes [ADR-0006](0006-admin-ui-material-design-3-hand-built-components-and-grayscale-tokens.md).

## Context

ADR-0006 built the first admin screens (TP1-02 sign-in) with a small set of hand-built React + CSS
Module components (`Button`, `TextField`, `Banner`, `Icon`) over Material Design 3 **grayscale** design
tokens in `src/styles/tokens.css`, and it **explicitly rejected Tailwind**. That was the right call for a
few components. It does not scale: the ticket "Implement the Shad Design System" asks for a single,
reusable, CI-enforceable component system so contributors stop coding each screen's controls by hand and
inconsistently. The migration surface is now broad (about 10 route pages and a dozen feature components,
several already using raw `<button>` plus CSS Modules), which is exactly the drift a shared system exists
to stop.

shadcn/ui is the chosen system. One fact shapes everything else: **shadcn/ui is not an installed runtime
library and not a hosted service (the ticket's "Shad CDN" was a confirmed typo).** It is a CLI that
*generates component source into the repo*, built on Radix UI primitives, Tailwind CSS,
`class-variance-authority`, `clsx`, and `tailwind-merge`. We own and version that generated code like any
other source. Adopting it therefore **requires adding Tailwind**, which reverses ADR-0006's Tailwind
rejection — a real architectural decision, recorded here, not a drop-in.

The product owner signed off on decisions D1–D5 (below). This ADR covers the foundation (PR 0:
scaffolding + theming). The CI enforcement gate (PR 1), developer docs (PR 2), and the screen-by-screen
migration (PRs 3–7) are tracked in the ticket's build plan and land in their own changes.

## Decision

Adopt shadcn/ui (Radix + Tailwind) as TrackPoli's component system, superseding ADR-0006's hand-built
approach. The product-owner-approved decisions:

- **D1 — Adopt Tailwind and supersede ADR-0006.** There is no shadcn-without-Tailwind path. ADR-0006 is
  marked Superseded, not edited.
- **D2 — Tailwind v4** (current line; works with Next 16 / React 19; shadcn supports it). Wired as a
  PostCSS plugin (`@tailwindcss/postcss`), no `tailwind.config.*` file — content sources and theme live
  in `src/app/globals.css` via `@source` / `@theme`.
- **D3 — Keep the MD3 grayscale tokens and map shadcn's theme variables onto them.** shadcn's semantic
  variables (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, …) are defined in
  `src/styles/tokens.css` as `var()` references to the existing MD3 grayscale roles. The standing rule
  "no colour literal outside the token file" (`decisions.md`) stays true, and the grayscale→brand and
  dark-mode paths stay a token-value swap with no component change — exactly as ADR-0006 planned.
- **D4 — Enforcement scope (PR 1):** block raw interactive elements, new UI CSS Modules, and colour
  literals in *changed* feature code outside `src/components/ui/`, where the design-system primitives are
  defined. Pre-existing debt is retired by migration, not by this gate.
- **D5 — Migrate screen-by-screen (expand/contract):** add shadcn alongside, migrate one screen at a
  time, verify behaviour and accessibility parity, then delete the replaced hand-built component and its
  `.module.css`. No big-bang.

**PR 0 scope (this change):** Tailwind v4 + PostCSS, `components.json`, `cn()` in `src/lib/utils.ts`, the
token→theme mapping, and the Cucumber.js BDD harness. **No shadcn component is added and no screen is
migrated, so there is no visual or behaviour change.** Two deliberate consequences of the no-visual-change
guarantee:

- **Tailwind Preflight (its global element reset) is NOT imported yet.** `globals.css` imports only
  Tailwind's `theme` and `utilities` layers. Importing Preflight now would restyle the existing
  CSS-Module screens. Preflight is added by the first migration PR (PR 3), where screens adopt shadcn
  primitives and parity is verified.
- **Dark mode is class-based and opt-in (`.dark`), not `prefers-color-scheme`.** The `.dark` block in the
  token file is inert until a `.dark` ancestor exists; wiring it to the OS preference would flip colours
  for dark-OS users today. This matches ADR-0006's stated "redefine token values under a
  `data-theme`/class block" path.

### Options considered

1. **Keep hand-building components over MD3 tokens (status quo, ADR-0006).** Rejected: it does not meet
   the ticket's goal of one reusable, CI-enforceable system; every new screen re-implements controls and
   drifts, which is already visible (raw `<button>` + CSS Modules across feature code).
2. **A Material component library (MUI `@mui/material`) or Material Web (`@material/web`).** Rejected for
   the same reasons as ADR-0006: a large CSS-in-JS runtime that inflates the gated bundle, plus theming
   indirection and (for Material Web) web-component/SSR friction with React 19 + the App Router.
3. **shadcn/ui (Radix + Tailwind), source vendored into the repo (chosen).** Copy-in source we own and
   review like any code; Radix gives accessible primitives; Tailwind utilities map to our tokens; no
   CSS-in-JS runtime. Cost: it reverses ADR-0006's Tailwind rejection and adds Tailwind + Radix to the
   toolchain and bundle, which we accept and watch (below).

## Consequences

- **Token-first theming holds.** Colour stays defined in one file; shadcn variables are `var()`
  references, so a brand-colour or dark theme is still a token-value swap with no component change. The
  `decisions.md` "no colour literal outside the token file" rule is preserved and, in PR 1, mechanically
  enforced on changed feature code.
- **Accessibility is kept, then verified before deletion.** The hand-built components carry real a11y
  (label association, `aria-invalid`, `aria-live` error region, visibility toggle, focus management). The
  migration PRs must prove Radix gives equivalent behaviour *before* removing the old component — parity
  is a precondition of the contract phase, not an afterthought.
- **Bundle cost is real and watched.** Radix and Tailwind add weight, and the repo gates first-load
  client JS (`check:bundle`, 260 KB budget). PR 0 adds the dependencies but imports none of them into any
  route (no shadcn component is rendered yet), so first-load JS is unchanged here; each migration PR must
  re-check the budget as primitives start shipping.
- **We own the component source.** Generated shadcn code is reviewed and maintained like any source; new
  primitives are added with the shadcn CLI and committed in the PR (documented in PR 2).
- **Honest limits.** Tailwind v4 / shadcn compatibility is confirmed from docs and a local build, not a
  long production soak; the Preflight deferral means shadcn components rendered before PR 3 would lack the
  reset they assume, so no component is added until PR 3 turns Preflight on. The grayscale tokens are not
  a finished visual design — brand colour and dark mode are applied later by redefining token values.

## Implementation note — PR 7 (D5 contract step, 2026-11-10)

PR 7 migrates the session-timeout warning dialog (`SessionWarningDialog`) onto the shadcn Button and
removes the **last** shadcn-migration waiver (`approvedBy: mdenner`), so the D5 migration-waiver count is
now **0**. The 7 TP1-06 app-shell waivers (`approvedBy: Giuliana Wladessa Manca`) are untouched — the
shell migrates in its own future PR.

The D5 contract phase ("delete the replaced hand-built component") is executed **only where it is safe by
the zero-importer rule**, not forced:

- **Removed:** `TextField` (`src/components/ui/TextField.tsx` + `.module.css`) — repo-wide grep shows **0**
  importers; it is dead and deleted.
- **Retained (still imported — reported, not forced):**
  - `LegacyButton` — still imported by `ConfirmPage.tsx` and `SessionExpiredPage.tsx` (2 screens, not in
    this PR's scope).
  - `Banner` — still imported by `ActiveSessionsCard.tsx`.
  - `Icon` — still imported by **14** files across auth, settings and the TP1-06 shell (every migrated
    screen kept the hand-built `Icon`; it was never swapped for a primitive).

So the series' **screen migrations and waivers are complete (0 remaining)**, but the hand-built *component
layer* is not fully retired: `LegacyButton`, `Banner` and `Icon` outlive it because out-of-scope screens
(and, for `Icon`, the whole app) still depend on them. Their removal is deferred to the PRs that migrate
`ConfirmPage` / `SessionExpiredPage` (frees `LegacyButton`), `ActiveSessionsCard` (frees `Banner`), and
an `Icon`→primitive decision plus the TP1-06 shell migration (frees `Icon`). `button/` is already a flat
`button.tsx`, so there is nothing to flatten.
