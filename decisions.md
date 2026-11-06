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

---

## Decision log (ADRs)
Bigger or reversible decisions (which ingestion pipeline is canonical, who owns a mirrored field,
Supabase vs Sanity for a new entity) go in `docs/adr/` as sequenced records - use the
`architectural-decision-records` skill. This file holds the *standing rules*; the ADRs hold the
*dated why*.
