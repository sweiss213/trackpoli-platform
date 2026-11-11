# Architecture decisions - TrackPoli

Standing rules for TrackPoli: Next.js (App Router) + Supabase + Sanity. `judge-arch` reviews every
change against this file; `arch-gate.config.json` enforces the checkable subset. Grow this file one
caught mistake at a time (use `arch-encode`); the dated *why* of bigger decisions lives in `docs/adr/`.

**The intended shape:** `UI (app routes, components) -> data hooks -> services / domain -> lib / integrations`.
Facts flow down through their owners; UI never reaches past the hooks/services layer to a backend.

---

## The standing lens - four questions for every change
1. Boundary placement - is business logic out of components and route handlers?
2. Data ownership - does each fact have exactly one writer?
3. Dependency direction - is domain code free of React/Next/DOM/HTTP concerns?
4. Error handling - does every failure recover, retry, or report?

## Layers and boundaries
```
// never - data access + business logic in a route/component
export default async function Profile() {
  const { data } = await supabase.from('politicians').select()  // UI touching the DB
  const score = data.filter(v => v.kept).length / data.length   // business math in the view
}
// always - the component renders; a hook/service owns data + rules
export default function Profile() {
  const { politician } = usePolitician(id)   // usePolitician -> politicianService
}
```

## Data ownership - Supabase owns facts, Sanity owns prose
One owner per fact. Supabase is the system of record for factual, relational, workflow data
(politicians, parties, bills, votes, policies, sources, verification/publication state, admin auth,
job state, audit log). Sanity owns human-authored prose (plain-language explanations, "why this
matters", glossary, manifesto narrative). A Sanity document references a Supabase record id; it
never duplicates a factual field, and Supabase never stores prose.
```
// never - a factual field defined in a Sanity schema (mirrors Supabase's truth)
defineField({ name: 'office', type: 'string' })          // fact in the prose store
// never - a stored copy "kept in sync" with another system
politicians.current_party = '...'  // mirror of the party-membership table
// always - Sanity holds prose + a reference; the fact stays in its one owner
defineField({ name: 'supabasePoliticianId', type: 'string' })  // reference, not a copy
```

## Public read model - published projection, not draft tables
Public pages read only a published, denormalized projection; the admin app works on the live draft
tables. Nothing public queries draft/unverified rows.
```
// never - a public page reading the live workflow tables
const { data } = await supabase.from('politicians_draft').select()
// always - public reads the published, cache-friendly projection
const p = await getPublishedPolitician(id)   // reads the published view/table
```

## Dependency direction
```
// never - a service that imports the framework or touches web globals
// src/services/ranking.service.ts
import { cookies } from 'next/headers'
const seen = window.localStorage.getItem('seen')
// always - pure data in, plain data out; the request stops at the route boundary
export function rankPoliticians(input: RankInput): Ranked[] { /* no next, no window */ }
```
Exactly one Supabase client per context in `src/lib/supabase` (browser/server/admin) and one Sanity
client in `src/lib/sanity`. Never a second `createClient`.

## Error handling
```
// never - swallowed, or reported only to the user
try { await invokeEdge('publish-record') } catch { toast.error('failed') }  // operators see nothing
// always - recover/retry AND report through the app's reporting spine
try { await auditedInvoke('publish-record') } catch (e) { report(e); toast.error('failed') }
```
A `console.error` is not reporting if it only writes to the browser console.

## Edge functions
Compose the shared layer in `supabase/functions/_shared` - do not hand-roll auth, CORS, or the
admin client per function. See `supabase/functions/AGENTS.md`.

## Edge (Cloudflare)
The admin app sits behind Cloudflare -> Vercel. The intended edge settings (SSL Full (strict), managed
WAF rules, never-cache `/admin/*`, sign-in and password-reset rate limits, `CF-Connecting-IP` trust via an
origin bypass-header so Vercel is not reachable directly, and `X-Robots-Tag: noindex`) and the reasons for
each are recorded in `docs/cloudflare-spike.md` - to be confirmed during the TP1-02 Cloudflare spike once
the account and domain exist (Q-1-21).

## Design system - compose shadcn/ui, never raw controls or ad-hoc CSS
Feature code uses the shadcn/ui primitives in `src/components/ui/`; it does not hand-roll controls or
colour. Raw interactive elements, new CSS Modules, and colour literals live ONLY in `src/components/ui/`
(the primitive layer) and colour ONLY in `src/styles/tokens.css`. Enforced on changed files by
`check:design-system` (`scripts/check-design-system.mjs`), scoped to changed files so the pre-existing
debt in `src/features` is retired by the screen-by-screen migration, not blocked all at once (ADR-0011).
```
// never - a raw control or a colour literal in feature code (src/app, src/features, non-ui components)
<button className={styles.primary}>Save</button>   // raw <button> + CSS Module
const danger = '#b3261e'                            // hex outside src/styles/tokens.css
// always - the design-system primitive; colour via a semantic token / Tailwind colour utility
import { Button } from '@/components/ui/button'
<Button variant="destructive">Save</Button>
```
This extends the standing "no colour literal outside the token file" rule to raw controls and CSS Modules
too. The exception is `src/components/ui/`, where the primitives are defined. See `src/components/AGENTS.md`.

## Routing - basePath-relative in Next-aware nav, `/admin` only in raw APIs
The app is served under `basePath: "/admin"` (next.config.ts). Next prepends that basePath AUTOMATICALLY
to its own nav APIs, so a literal `/admin` there double-prefixes to `/admin/admin/...` (a 404 - this took
production down once). Classify by the API, not by a blanket rule (ADR-0014). Enforced by the arch-gate
rule "No literal /admin in Next-aware navigation" - hardened in ADR-0018 to ALSO catch `/admin` carried in
a nav-data object literal (`href: "/admin/..."` in a breadcrumb crumb or nav item) that is later handed to
a Next `<Link>`, which is how a double-prefixed breadcrumb slipped the gate once (TP1-07 finding F1).
```
// never - a literal /admin in a Next-aware nav API (Next adds the basePath -> /admin/admin -> 404)
<Link href="/admin/settings">…</Link>
router.replace('/admin/sign-in')
redirect('/admin/sign-in')               // next/navigation, server AND client both add basePath
const crumbs = [{ label: 'Admins', href: '/admin/admins' }]   // nav data handed to <Link> later (ADR-0018)
// always - basePath-relative; Next prepends /admin
<Link href="/settings">…</Link>
router.replace('/sign-in')
redirect('/sign-in')
const crumbs = [{ label: 'Admins', href: '/admins' }]         // a real route; /admins is NOT a violation
// keep /admin ONLY in RAW APIs (no basePath added): raw browser nav, plain <a>, fetch, request-based URLs
window.location.assign('/admin/sign-in')
<a href="/admin/sign-in">…</a>
apiFetch('/admin/api/sign-in')
NextResponse.redirect(new URL('/admin/sign-in', request.url))   // middleware / route handlers
```
The rule keys on `/admin` as a whole path segment (a `(?!\w)` boundary), so a route like `/admins` is
correctly allowed - Next serves it at `/admin/admins`. Proven live: `navItems.ts` ships `href: "/admins"`
and `npm run check:architecture` is green; `check:discriminate` plants `nav/crumbs.tsx` to prove the gate
flags the object-literal form.
Limit (honest): the gate is line-based, so a path built from a variable (`const to = '/admin/x'; router.replace(to)`)
or an `href` on a different line is NOT caught by the gate - those are caught by the unit tests, `judge-arch`,
and a preview click-through. Path NORMALISATION that strips the live pathname (`pathname.startsWith('/admin')`,
`.slice('/admin'.length)`) correctly keeps `/admin`: it reads the real runtime path, which includes basePath.

---

## Decision log (ADRs)
Bigger or reversible decisions (which ingestion pipeline is canonical, who owns a mirrored field,
Supabase vs Sanity for a new entity) go in `docs/adr/` as sequenced records - use the
`architectural-decision-records` skill. This file holds the *standing rules*; the ADRs hold the
*dated why*.
