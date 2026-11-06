# TP1-02 — Credentials & accounts setup checklist

Plain-English setup guide for the accounts TP1-02 needs. You create each account; you paste each
**secret value straight into that service's own settings page** (Supabase dashboard, Vercel env vars,
or GitHub Actions secrets). **Never paste a secret into chat, and never commit one to git.**

Work top to bottom. Anything marked **🟢 needed now** unblocks the build; anything marked
**🟡 defer** is tied to a real domain and can wait until Q-1-21 is settled (we build and test against a
temporary Vercel URL in the meantime).

Legend for "where it goes":
- **Supabase** = the project's dashboard (Authentication / API settings).
- **Vercel env** = Vercel → Project → Settings → Environment Variables.
- **GitHub secret** = the repo → Settings → Secrets and variables → Actions.

---

## 1. Supabase (cloud) — 🟢 needed now

You built a *local* Supabase for TP1-01. TP1-02 needs the **hosted** projects so the deployed app can
sign people in. Create **two** projects (Region: **Europe**, Free tier is fine):

- `trackpoli-staging`
- `trackpoli-production`

| What you copy | From | Where it goes | Secret? |
|---|---|---|---|
| Project URL | Supabase → Project Settings → API | `NEXT_PUBLIC_SUPABASE_URL` (Vercel env) | No |
| `anon` / publishable key | same page | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Vercel env) | No (browser-safe) |
| `service_role` key | same page | Supabase Edge Function secret + `GitHub secret` | **Yes — keep secret** |
| Access token (CLI) | Supabase → Account → Access Tokens | `GitHub secret` (CI deploys) | **Yes** |

> After the projects exist, tell me and I'll give you the exact migration/seed steps to push the TP1-01
> schema into staging. Don't run anything on production until we've rehearsed on staging.

---

## 2. Vercel — 🟢 needed now

Hosts the app. Create the project and link it to the `techfleetworks/trackpoli-platform` GitHub repo.
Set the region to **Europe** (e.g. Frankfurt / `fra1`).

| What you copy | From | Where it goes | Secret? |
|---|---|---|---|
| Vercel token | Vercel → Account → Settings → Tokens | `GitHub secret` → `VERCEL_TOKEN` | **Yes** |
| Org ID | Vercel → Project → Settings → General | `GitHub secret` → `VERCEL_ORG_ID` | Low-sensitivity |
| Project ID | same page | `GitHub secret` → `VERCEL_PROJECT_ID` | Low-sensitivity |

You'll also paste the **Supabase**, **Turnstile**, and **Sentry** values (below) into **Vercel env**
for both the Preview and Production environments.

---

## 3. Cloudflare — 🟡 mostly defer

Sits in front of Vercel for HTTPS, bot rules, and rate limiting. The **account** can be made now, but the
DNS/domain cutover is **domain-blocked (Q-1-21)**. We don't need it to build or test the sign-in flow.

| What you do | When |
|---|---|
| Create a Cloudflare account | now (optional) |
| Add the domain → point DNS to Vercel | 🟡 after the domain is decided |
| SSL/TLS **Full (strict)**, managed rules, never-cache `/admin/*`, rate-limit sign-in/reset | 🟡 during the Cloudflare "spike" step, recorded in `decisions.md` |

---

## 4. Google OAuth client — 🟡 defer the redirect

Powers "Continue with Google". Google is wired **through Supabase** — you paste Google's client ID/secret
into Supabase, not into our code. The redirect URL needs the real domain, so the live redirect is
**domain-blocked (Q-1-21)**; we build and unit-test the flow against the temporary URL first.

| What you copy | From | Where it goes | Secret? |
|---|---|---|---|
| OAuth Client ID | Google Cloud Console → Credentials | Supabase → Auth → Providers → Google | Low-sensitivity |
| OAuth Client Secret | same page | Supabase → Auth → Providers → Google | **Yes** |
| Authorized redirect URI | you set it in Google | `https://<supabase-project>.supabase.co/auth/v1/callback` | — |

> No env var for Google in our app: Supabase holds the client credentials and hands us a signed-in
> session. Our only code is the `/admin/auth/callback` route that finishes the handshake.

---

## 5. Cloudflare Turnstile — 🟢 needed now

The "are you a robot?" check on every sign-in attempt. Create a Turnstile site (works without a custom
domain — add `localhost` to the allowed hostnames for local testing).

| What you copy | From | Where it goes | Secret? |
|---|---|---|---|
| Site key | Turnstile dashboard | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Vercel env) | No (browser-safe) |
| Secret key | same page | Supabase Edge Function secret → `TURNSTILE_SECRET_KEY` | **Yes** |

---

## 6. Sentry (EU) — 🟢 needed now

Catches and reports errors. Create an organization/project in the **EU** data region.

| What you copy | From | Where it goes | Secret? |
|---|---|---|---|
| DSN | Sentry → Project → Client Keys (DSN) | `NEXT_PUBLIC_SENTRY_DSN` (Vercel env) | No |
| Auth token | Sentry → Settings → Auth Tokens | `GitHub secret` → `SENTRY_AUTH_TOKEN` | **Yes** |

---

## 7. GitHub (no new account) — 🟢 needed now

You already own the repo. You'll need repo-admin rights to:

- Add the **Actions secrets** listed above (`VERCEL_*`, `SUPABASE_*`, `SENTRY_AUTH_TOKEN`).
- Raise **required approvals from 0 → 1** on `main` (the ticket requires a human review before merge).

---

## Quick reference — what's a secret vs. what's config

**True secrets** (service-role key, Vercel token, Supabase access token, Google client secret, Turnstile
secret key, Sentry auth token) → go into **Supabase dashboard / Vercel env / GitHub secrets**, from you,
never through me.

**Browser-safe config** (`NEXT_PUBLIC_*`: Supabase URL, anon key, Turnstile site key, Sentry DSN) → also
set in **Vercel env**, but these are not secret and may appear in the browser bundle.

See `.env.example` for the exact variable names; copy it to `.env.local` for local development and fill in
the browser-safe values plus your local Supabase keys.
