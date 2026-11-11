# 0017. The TP1-06 app shell adopts the shadcn design system (clears the last waivers)

Date: 2026-11-10

## Status

Accepted

Continues the ADR-0011 D5 screen-by-screen migration (its lineage: PRs 0-7 migrated the auth and
settings screens). Supersedes the 7 interim `design-system-gate.waivers.json` entries for the TP1-06
app shell (`approvedBy: Giuliana Wladessa Manca`).

## Context

The TP1-06 app shell (`src/features/shell/`: `SideNav`, `TopBar`, `ErrorState`, `AppShell`, `Placeholder`)
was built before the shadcn/ui primitives existed (ADR-0006 era), with raw `<button>` controls and CSS
Modules. When the design-system gate landed (ADR-0011 D4, PR 1), the shell's files were flagged, so they
carried 7 transitional waivers until this migration:

- **2 `raw-control`** waivers — `SideNav.tsx` (collapse toggle, section headers, Log out) and
  `ErrorState.tsx` (the error-screen action) used raw `<button>`.
- **5 `ui-css-module`** waivers — `AppShell`, `ErrorState`, `Placeholder`, `SideNav`, `TopBar`
  `.module.css`.

These were the last waivers in the repo. The auth/settings series (PRs 3-7) migrated every other screen;
this change finishes the shell.

Two facts shape the decision, both grounded in how the mechanical gate and the earlier migrations actually
behave (`scripts/check-design-system.mjs`):

- The `raw-control` rule fires on a raw `<button>/<input>/...` in a **changed** feature file. Replacing
  those controls with the shadcn `Button` clears it.
- The `ui-css-module` rule fires **only on a newly ADDED `.module.css`** (`addedSet.has(file)`), not on an
  existing one that is kept or edited. The auth screens prove the pattern: `SignInPage.module.css`,
  `SessionWarningDialog.module.css` and the rest were **retained** (unwaived) for layout while their raw
  controls moved to shadcn. The shell's `.module.css` only ever carried waivers because they were added
  *after* the gate existed (TP1-06), unlike the auth modules (added in TP1-02, before the gate).

## Decision

Migrate the shell's **interactive controls** to the shadcn `Button` primitive and **retain the layout
`.module.css`**, exactly the parity-preserving pattern the auth screens used, then remove all 7 waivers.

- `SideNav.tsx` — the collapse toggle, the Records/Workflow section headers, and Log out become
  `<Button variant="ghost" size="inline" className={styles.…}>`, keeping their module classes, accessible
  names and aria state (`aria-pressed`, `aria-expanded`). The two `<Link>`s stay **basePath-relative**
  (`href={node.href}`, not `` `/admin${…}` ``) — ADR-0014; Next adds the `/admin` basePath, so a literal
  would double-prefix.
- `ErrorState.tsx` — the `onClick` action becomes the shadcn `Button`; the `href` action stays a
  `next/link`.
- `TopBar`, `AppShell`, `Placeholder` have **no raw controls** to migrate; their `ui-css-module` waivers
  were vestigial (the files are established layout modules, not newly added) and are removed.
- **Waivers: 7 -> 0.**

The layout `.module.css` are **kept, unchanged**. They are already built on the MD3 grayscale tokens
(`var(--md-*)`, ADR-0006), so colour already lives in the token layer; the gate permits existing layout
modules (it blocks only new ones, raw controls, and colour literals).

### Options considered

1. **Rewrite the whole shell layout in Tailwind and delete every `.module.css`.** Rejected: the shell's
   layout (nav grid, collapse states, badges, chevron rotation, breadcrumb, user chips) is substantial, and
   a full rewrite risks exactly the visual regressions we cannot verify headlessly — against the
   "parity-preserving" goal. The `src/components/AGENTS.md` "delete the old `.module.css`" line is the ideal
   end-state; the auth series did not reach it either, keeping layout modules.
2. **Keep the raw `<button>`s and just let the waivers expire.** Rejected: the waivers never reach 0, and
   the shell keeps bypassing the design system.
3. **Migrate the controls to shadcn, keep the layout modules, remove all waivers (chosen).** Matches the
   auth-screen precedent, clears every waiver, and preserves the rendered layout.

## Consequences

- **Zero waivers.** `design-system-gate.waivers.json` is `[]`; the shell's interactive controls are
  design-system primitives, and `check:design-system` passes on the changed shell files with no waiver.
- **Behaviour + a11y parity is proven; visual parity is not.** `SideNav.test.tsx` and `ErrorState.test.tsx`
  assert the controls stay native `<button>`s with their names and aria state, and that the nav links stay
  basePath-relative. The rendered **visual/contrast** parity of the shell controls (ghost+inline vs the old
  raw module styling) is **not assessed here** and still owes a human/axe + Figma pass — recorded
  `not-assessed` in `a11y-conformance.json`, not claimed.
- **No basePath regression.** The nav `<Link>`s remain basePath-relative, so the ADR-0014 arch-gate rule
  stays green and the `/admin/admin` double-prefix cannot return through the shell.
- **Honest limit.** The retained layout `.module.css` mean the shell is not on a pure-Tailwind footing; that
  final step is deferred and is not required for design-system conformance (the gate is satisfied).
