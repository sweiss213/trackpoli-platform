# 0018. Harden the "no literal /admin" gate rule to the object-literal `href:` form

Date: 2026-11-11

## Status

Accepted

Extends [0014](0014-basepath-relative-navigation-no-literal-admin-in-next-aware-apis.md) (basePath-relative
navigation). This ADR does not change the navigation decision; it hardens the **mechanical gate rule** that
enforces it.

## Context

ADR-0014 established that a literal `/admin` must never appear in a Next-aware navigation API, because Next
adds the `basePath: "/admin"` automatically and a hardcoded `/admin` double-prefixes to `/admin/admin/...`
(a 404 that once took the deployed app down). It is enforced by the `arch-gate` rule *"No literal /admin in
Next-aware navigation"* in `arch-gate.config.json`.

During the TP1-07 merge (admin workspace shell), the fresh-context `judge-arch` review caught a real
instance the gate had **missed** (finding F1). The bug was written in a form the rule's patterns did not
match. The rule matched `/admin` only when it was written **inline on a tag or call**:

```tsx
// caught by the original rule
<Link href="/admin/settings">…</Link>
router.replace("/admin/sign-in")
```

But the same `/admin` carried in a **nav-data object literal**, then handed to a `<Link>` later, slipped
straight through:

```tsx
// NOT caught by the original rule — but just as broken at runtime
const crumbs = [{ label: "Admins", href: "/admin/admins" }];   // → /admin/admin/admins (404)
...
<Link href={crumb.href}>{crumb.label}</Link>
```

This is exactly the decay `arch-encode` exists to stop: a greppable mistake that a human had to notice,
instead of one the gate catches on every PR. A second latent instance of the same bug was then found in the
component gallery's breadcrumb demo (`src/app/gallery/page.tsx`), confirming the gap was real and recurring.

## Decision

Widen the `arch-gate` rule *"No literal /admin in Next-aware navigation"* on two axes, and prove it detects.

1. **Add a pattern for the object-literal / nav-data form.** Forbid `href:\s*["'`]/admin…` (a `href`
   **property**, as in a breadcrumb crumb or a nav item), not only `href=` **on a tag**. This catches the
   F1 form.

2. **Add a `(?!\w)` word-boundary to every pattern.** `/admin` is a violation only as a whole path segment
   (`/admin`, `/admin/…`, `/admin${…}`), never as the start of a longer, legitimate route. This keeps the
   real app-relative route `href: "/admins"` (which Next correctly serves at `/admin/admins`) from being
   false-flagged. The boundary is proven live: `src/features/shell/navItems.ts` ships `href: "/admins"` and
   `npm run check:architecture` is green.

3. **Fix the one instance the widened rule now catches:** the gallery breadcrumb demo is changed to a
   basePath-relative `{ label: "Dashboard", href: "/" }`.

4. **Prove detection (verifiable-quality-gates).** The planted-violation harness
   (`check:discriminate`) gains a fixture `nav/crumbs.tsx` carrying `href: "/admin/admins"`; the gate must
   flag it, and removing the new pattern makes `check:discriminate` fail (mutation-proven). The wired-config
   test (`test/arch-gate-wired.test.mjs`) additionally asserts all four forbids stay present, that the
   object-literal and template-literal forms are caught, and that `/admins` is **not** flagged.

### Options considered

1. **Leave the rule as-is; rely on `judge-arch` review to catch the object-literal form.** Rejected: that
   is exactly the "a human must notice it" state `arch-encode` turns into a mechanical check. F1 only
   happened to be caught; the next one might merge.
2. **Forbid any `/admin` substring in nav data (no boundary).** Rejected: it would false-flag `/admins`,
   `/administrators` and every legitimate route that begins with those letters, training people to add
   waivers — which erodes the gate.
3. **Widen the `href:` pattern with a `(?!\w)` segment boundary, fix the one caught instance, and add a
   planted-violation proof (chosen).** Catches the real form, leaves legitimate routes alone, and is
   proven to detect rather than assumed.

## Consequences

- **The object-literal `/admin` bug cannot merge again.** `check:architecture` (a required CI check) now
  fails on `href: "/admin/…"` in nav data, in `<Link>`, and in `push/replace/redirect`.
- **Legitimate routes are unaffected.** The `(?!\w)` boundary means `/admins` and similar paths pass; this
  is proven by the live gate being green on `navItems.ts`, not just asserted.
- **Detection is proven, not hoped for.** `check:discriminate` flags the planted `nav/crumbs.tsx` and goes
  red if the pattern is removed; the wired test guards every forbid against silent deletion.
- **Honest limit.** Pattern-matching is not exhaustive: a third way to smuggle a literal `/admin` into a
  Next-aware API (e.g. via a computed string the regex cannot see) could still escape, and would then be a
  `judge-arch` catch and the next `arch-encode` ratchet. The rule shrinks the judgment surface; it does not
  seal it.
