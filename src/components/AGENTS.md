<!-- Copy to src/components/AGENTS.md (and/or src/pages/AGENTS.md). Loads only when the agent works here. -->
# Rules for components & pages

- **No data access here.** Never import the Supabase client or call `supabase.from/rpc/storage/functions`. Call a hook (`useX`) that goes through a service.
- **No business math.** Money/date/eligibility calculations belong in a service or `lib/`, not fused into JSX.
- **No raw `fetch()` to edge functions.** Use the app's edge/invoke wrapper so auth headers, retries, and error reporting are centralized.
- Render and format. That's it.

## Use the shadcn/ui design system, never raw controls or ad-hoc CSS (ADR-0011)

Feature code (`src/app/**`, `src/features/**`, and components outside `src/components/ui/`) composes the
design-system primitives. Raw interactive elements, new CSS Modules, and colour literals belong only in
`src/components/ui/` (which defines the primitives) and `src/styles/tokens.css` (the one home for colour).
The `check:design-system` gate enforces this on **changed files** (see `scripts/check-design-system.mjs`).

```tsx
// ❌ never — a raw control in feature code
export function SignIn() {
  return <button type="submit" className={styles.primary}>Sign in</button>  // raw <button> + CSS Module
}
// ❌ never — a colour literal outside the token file
const danger = { color: '#b3261e' }                                          // hex belongs in tokens.css

// ✅ always — compose the design-system primitive; colour comes from a semantic token utility
import { Button } from '@/components/ui/button'
export function SignIn() {
  return <Button type="submit" variant="destructive">Sign in</Button>
}
```

Raw `<button>/<input>/<select>/<textarea>`, a new `*.module.css`, or a `#hex`/`rgb()` literal is allowed
**only** inside `src/components/ui/`. Migrating an existing screen? Replace its raw controls with the
primitive and delete the old `.module.css` (the expand/contract migration, ADR-0011 D5).
