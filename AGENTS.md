# Engineering rules

Every change passes the architecture gate before it is "done." "Done" means you claim the work is
complete, you open/update a pull request, or you hand back for review.

## The architecture gate - mandatory, no exceptions
Every change that **adds, moves, deletes, or restructures code or schema** must pass both halves:

1. **Mechanical gate.** `npm run check:blocking` (and the surface gate for anything you touched)
   exits `0` - locally before you say done, and in CI before merge.
2. **Judge review.** The `judge-arch` review returns PASS (no unresolved violations), or every
   remaining finding is explicitly waived, and is recorded in `docs/arch-reviews/log.jsonl`.

The **only** bypass is an explicit human waiver ("waive the arch gate for X because Y"), recorded in
`arch-gate.waivers.json` with a reason and an expiry. **Never self-waive by deciding a change is
"trivial."** Trivial changes pass the gate in seconds; that is not the same as being exempt.

## Read every change through four questions
1. **Boundary placement** - business rules (calculations, checks, workflows) do not live in route
   handlers or UI components. If another part of the app needed this tomorrow, could it find it?
2. **Data ownership** - every fact has one owner. Writes go through the owner; everyone else reads.
   No second copy "kept in sync"; no writing into another module's tables.
3. **Dependency direction** - domain code must not know about `request`, `response`, `session`,
   `cookie`, HTTP, or rendering. The request stops at the boundary and becomes plain data.
4. **Error handling** - every `catch` / failure check does exactly one of **recover**, **retry**, or
   **report**. A catch that does none is hiding a failure.

## Fight the four drifts
- **Search before you write.** Grep for an existing implementation first; reuse or extend it.
- **Match the surrounding code.** Follow the nearest existing example of this kind of thing.
- **Prefer editing and deleting over adding.** Leave no dead code. If the honest fix is a refactor, refactor.
- **Don't build for a future you don't have.** No interface/factory/manager for a single use.

## When you write a rule, write it as a negative code example
A concrete counter-example beats a stated principle. Use the `arch-encode` skill to add a rule in
`decisions.md` and `arch-gate.config.json`, and prove it holds.

<!-- ─────────────────────────────────────────────────────────────────────────────
     TrackPoli specifics
     ───────────────────────────────────────────────────────────────────────────── -->

## TrackPoli stack and shape
Next.js (App Router) on Vercel, Supabase (relational facts, workflow state, auth), Sanity
(editorial prose), Cloudflare (security/CDN). Intended shape:
`UI (src/app, src/components) -> data hooks -> services/domain (src/services) -> lib/integrations (src/lib)`.

- **Supabase owns facts; Sanity owns prose.** One owner per fact; a Sanity doc references a Supabase
  id, never duplicates a factual field. See `decisions.md`.
- **Public reads a published projection**, never the live draft/workflow tables.
- **One client per backend** in `src/lib/supabase` and `src/lib/sanity`; never a second `createClient`.
- **Edge functions compose** `supabase/functions/_shared` (auth, CORS, admin client).

The standing rules with ❌/✅ examples are in `decisions.md`. The PR workflow (judge-arch review,
skill receipt, routing) is in `CONTRIBUTING.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
