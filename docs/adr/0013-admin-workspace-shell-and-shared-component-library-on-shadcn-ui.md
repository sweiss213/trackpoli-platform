# 0013. The admin workspace shell and shared component library on shadcn/ui

Date: 2026-11-11

## Status

Accepted

## Context

Ticket TP1-07 ("The admin workspace shell", plan task P1-12) builds the frame every later screen sits in:
a responsive, keyboard-operable shell and the shared component library the record, workflow and settings
screens will compose. It depends on TP1-06 (the role-gated shell skeleton) and lands after the shadcn/ui
adoption (ADR-0011) and the role-based-access work (ADR-0012).

Several things were already fixed and had to be honoured, not re-decided:

- **The component system is shadcn/ui + Radix + Tailwind (ADR-0011, Q-C-04).** Q-C-04 chose "Material 3 with
  custom components on accessible headless primitives" — which is exactly shadcn/ui (Radix headless + Tailwind)
  themed from the MD3 grayscale tokens in `src/styles/tokens.css` (ADR-0006). The primitives `button`, `input`,
  `label`, `alert` already exist; this ticket adds the rest.
- **TP1-06 built a minimal shell under transitional waivers.** `AppShell`, `SideNav`, `TopBar`, `ErrorState`,
  `Placeholder` were built with raw `<button>` + CSS Modules because the primitives did not exist yet, covered
  by seven expiring `design-system-gate.waivers.json` entries. TP1-07 is the ticket that retires them.
- **All devices, 320px up (Q-1-19).** The shell must be universally responsive — a persistent rail at ≥1024px,
  an off-canvas drawer below it — not the "desktop + large tablet only" default.
- **Decisions checked against the enterprise skills.** Dates render per locale via `Intl("en-GB")` (Q-C-10,
  usability content-and-plain-language), strings are centralised with no concatenation (Q-C-11), and a
  committed support matrix governs device support (universal-browser-device-support).

## Decision

- **Build the shared component library on the shadcn/ui primitives**, in `src/components/ui/`:
  `FormField`, `PasswordField`, `OtpField` (a single accessible `one-time-code` input, matching the shipped MFA
  pattern, not segmented boxes), `ConfirmDialog` (on a new `dialog` primitive), `SnackbarProvider`/`useSnackbar`
  (a Provider+Context over Radix Toast), `StatusTag` (admin statuses; label-small token added), `EmptyState`/
  `LoadingState`/`ErrorState`, `ErrorBoundary`, plus the `dialog` and `sheet` primitives. The shell layout —
  `AppShell`, `NavItem`, `SideNav`, `TopBar`, `PageHeader`, `ErrorScreen` — lives in `src/features/shell/`.
- **Primitives never depend on feature modules.** `ui/` components carry generic English defaults (overridable
  via props); feature copy lives in `src/features/shell/strings.ts`. The dependency only ever points
  lib/ui → feature, never the reverse.
- **Migrate the TP1-06 shell onto the design system and retire the seven waivers.** Every raw `<button>` becomes
  a shadcn `Button`, every `*.module.css` is replaced by Tailwind token utilities and deleted, and the shell
  `ErrorState` is renamed `ErrorScreen` to free the generic `ErrorState` name. Colour comes only from the
  semantic token utilities; no literal lives outside `tokens.css`.
- **Responsive shell.** At ≥1024px the nav is a persistent, collapsible rail; below 1024px it is an off-canvas
  drawer rendered in a `Sheet` (Radix Dialog), which traps focus and — because it opens from a state-driven
  menu button rather than a Radix trigger — returns focus to that button via `onCloseAutoFocus`. A skip link is
  the first focusable element and moves focus to `<main tabindex="-1">`.
- **Verify headlessly.** A credential-free component gallery (`/admin/gallery`) and shell demo
  (`/admin/gallery/shell`, the real `AppShell` under a mock `AuthProvider`) let E2E-13 (keyboard: skip link,
  drawer focus trap/return, 320px reflow) and E2E-14 (axe, no serious/critical) run without the data stack, in
  the existing credential-free e2e job. Every component also ships Vitest unit + accessibility tests.

## Consequences

- **One component system.** The shell and every new screen compose the same primitives; the seven transitional
  waivers are removed (only the three unrelated auth-migration waivers remain).
- **The accessibility floor is enforced and proven.** `check:no-ua`, `check:design-system` and
  `check:a11y:checklist` gate the surface, and E2E-13/E2E-14 execute the acceptance criteria. The axe scan of
  the gallery and shell reports 0 serious/critical violations.
- **New dev dependencies.** `@axe-core/playwright` + `axe-core` back E2E-14; `radix-ui` already backs the
  primitives.
- **Patterns (pattern-selector).** Provider + Context for the snackbar (one viewport, `show()` to any
  descendant); compound components for Dialog/Sheet; headless primitives (Radix) for all interactive behaviour.
  Each removes bespoke, hard-to-test focus/aria code in exchange for a dependency already adopted in ADR-0011.

### Limitations (evidence discipline)

- The **authenticated** shell (the real `(app)` layout behind a session) is exercised only through the
  credential-free demo under a mock `AuthProvider`; a live run against the full Supabase stack is still pending
  (as for the other full-stack specs). The gallery/shell-demo axe and keyboard runs are `observed` evidence for
  the components and the shell frame, not for the data-bearing screens, which arrive in later tickets.
- Colour contrast remains **grayscale** (ADR-0006); contrast is re-verified when the brand colour lands.
- A full human keyboard + screen-reader audit is scheduled for P1-16 (NFR-A1).

## Alternatives considered

- **Keep the TP1-06 shell on CSS Modules and only add new components.** Rejected: it leaves two component
  systems and keeps the waivers; this ticket is explicitly where the migration happens.
- **Segmented OTP boxes (per the Figma hint).** Rejected: a single `one-time-code` input is more robust for
  screen readers and password/OTP autofill, and matches the shipped, tested MFA field.
- **Material Web / MUI (Q-C-04 options).** Rejected by Q-C-04 in favour of custom components on headless
  primitives (now shadcn/ui, ADR-0011).
