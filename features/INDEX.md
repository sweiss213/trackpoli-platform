# BDD coverage index

Generated from the feature files by `bdd-index-generate.mjs` - do not edit by hand.

| Feature | Scenario | Domain | Audience | Use case | Category | Quality | Severity | Status |
|---|---|---|---|---|---|---|---|---|
| auth/sign-in-protection.feature | A fifth wrong attempt pauses the account | auth | anonymous | repeated-failures | adverse | security | critical | covered |
| auth/sign-in-protection.feature | A successful sign-in clears the failure counter | auth | administrator-manager | success-clears-failures | happy | functional | medium | covered |
| auth/sign-in-protection.feature | An unknown email and a wrong password are indistinguishable | auth | anonymous | account-enumeration | negative | security | critical | covered |
| auth/sign-in-protection.feature | Every attempt requires a valid bot-check token | auth | anonymous | bot-check | adverse | security | high | covered |
| auth/sign-in-protection.feature | The pre-authentication endpoints reject a non-server caller | auth | anonymous | internal-only-endpoint | permission | security | high | covered |
