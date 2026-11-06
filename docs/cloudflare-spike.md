# Cloudflare edge spike (TP1-02)

**Status: proposed — not yet confirmed.** The Cloudflare account and the domain do not exist yet
(domain-blocked, Q-1-21). This note records the intended edge configuration and *why*, so the ½-day spike
in TP1-02 is a confirmation exercise (apply each setting, verify the behaviour, then tick it here) rather
than a design exercise. The app already trusts `CF-Connecting-IP` in code (`supabase/functions/_shared/auth.ts`
and the sign-in route), so the edge must be configured to make that trust safe.

The chain is **Cloudflare (proxied) → Vercel**. Until the real domain lands, a temporary Vercel URL is used
and these rules are applied to the staging hostname.

## Intended settings

| # | Setting | Value | Why |
|---|---|---|---|
| 1 | SSL/TLS mode | **Full (strict)** | Encrypt Cloudflare→Vercel and verify Vercel's certificate, so the hop cannot be downgraded or MITM'd. |
| 2 | Managed WAF rules | **On** (Cloudflare Managed Ruleset) | Baseline protection against common web attacks at the edge, before traffic reaches the app. |
| 3 | Cache rule for `/admin/*` | **Bypass cache / never cache** | The admin app is authenticated and dynamic; a cached authenticated page could leak one admin's view to another. |
| 4 | Rate-limit rule: sign-in | Limit `POST /admin/api/sign-in` **per IP** (e.g. ~10/min) | Edge backstop to the per-account lockout and Turnstile — slows credential stuffing before it reaches the app. |
| 5 | Rate-limit rule: password reset | Limit the reset endpoint **per IP** | Same backstop for the reset flow (the reset endpoint lands in a later ticket). |
| 6 | `CF-Connecting-IP` trust | Rely on Cloudflare's `CF-Connecting-IP` for the real client address | The app uses the client IP for per-IP rate limits and the audit `ip`; it must be the true visitor, not a spoofable header. |
| 7 | Origin bypass-header | A **secret header** Cloudflare adds that Vercel requires | Stops an attacker from hitting the Vercel origin directly and bypassing items 1–6; only traffic through Cloudflare is served. |
| 8 | `X-Robots-Tag: noindex` on `/admin/*` | Response-header transform rule | The admin console must never be indexed by search engines. |
| 9 | DNS | Domain → **Cloudflare (proxied)** → Vercel | Puts all of the above in the request path. Temporary staging host until Q-1-21. |

## To confirm during the spike (tick when verified on the live edge)

- [ ] SSL/TLS shows **Full (strict)** and the site loads over HTTPS with no mixed-content or cert warnings.
- [ ] Managed ruleset is enabled and a known malicious request pattern is blocked at the edge.
- [ ] A request to an `/admin/*` page returns `cf-cache-status: BYPASS` (never `HIT`).
- [ ] Repeated `POST /admin/api/sign-in` from one IP is rate-limited (429) by Cloudflare before the app.
- [ ] The app receives the real client IP via `CF-Connecting-IP` (checked against the audit event `ip`).
- [ ] A direct request to the Vercel origin (bypassing Cloudflare) is refused for lack of the bypass-header.
- [ ] `/admin/*` responses carry `X-Robots-Tag: noindex`.

## Related

- `CF-Connecting-IP` consumer: `supabase/functions/_shared/auth.ts` (`clientIp`) and
  `src/app/api/sign-in/route.ts` (`callerIp`).
- Open question Q-1-21 (production domain) gates items 8–9 and the Google OAuth redirect.
- App security headers (HSTS, CSP) are added in the app itself in the hardening task (P1-16), not here.
