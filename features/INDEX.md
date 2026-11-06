# BDD coverage index

Generated from the feature files by `bdd-index-generate.mjs` - do not edit by hand.

| Feature | Scenario | Domain | Audience | Use case | Category | Quality | Severity | Status |
|---|---|---|---|---|---|---|---|---|
| auth/password-recovery.feature | A Google-only account gets the same screen and no recovery email | auth | administrator | google-only-no-password | negative | security | medium | covered |
| auth/password-recovery.feature | A reset request reveals nothing about whether an account exists | auth | anonymous | account-enumeration | negative | security | critical | covered |
| auth/password-recovery.feature | A reused or expired reset link is refused and creates no session | auth | administrator | reset-link-single-use | adverse | security | high | covered |
| auth/password-recovery.feature | Completing a reset ends all sessions and clears the lockout counter | auth | administrator | reset-completion | happy | security | high | covered |
| auth/password-recovery.feature | Every reset request requires a valid bot-check token | auth | anonymous | bot-check | adverse | security | high | covered |
| auth/password-recovery.feature | Repeated reset requests never lock the targeted account | auth | anonymous | no-lockout-on-request | adverse | security | medium | covered |
| auth/password-recovery.feature | The one-time token is exchanged only on an explicit continue, not on a page fetch | auth | anonymous | scanner-safe-link | adverse | security | high | covered |
| auth/password-recovery.feature | The reset-request endpoint rejects a non-server caller | auth | anonymous | internal-only-endpoint | permission | security | high | covered |
| auth/sign-in-protection.feature | A fifth wrong attempt pauses the account | auth | anonymous | repeated-failures | adverse | security | critical | covered |
| auth/sign-in-protection.feature | A successful sign-in clears the failure counter | auth | administrator-manager | success-clears-failures | happy | functional | medium | covered |
| auth/sign-in-protection.feature | An unknown email and a wrong password are indistinguishable | auth | anonymous | account-enumeration | negative | security | critical | covered |
| auth/sign-in-protection.feature | Every attempt requires a valid bot-check token | auth | anonymous | bot-check | adverse | security | high | covered |
| auth/sign-in-protection.feature | The pre-authentication endpoints reject a non-server caller | auth | anonymous | internal-only-endpoint | permission | security | high | covered |
