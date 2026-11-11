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
| auth/safe-sessions.feature | A deleted activity cookie fails open to the session's other controls, never a lockout | auth | administrator | timeout-fail-open | adverse | security | medium | covered |
| auth/safe-sessions.feature | A normal sign-out does not revoke the administrator's other devices | auth | administrator | local-sign-out-scope | negative | security | medium | covered |
| auth/safe-sessions.feature | A tampered last-activity cookie is never accepted to extend a session | auth | administrator | forged-activity-cookie | adverse | security | high | covered |
| auth/safe-sessions.feature | An expired session calling an API is sent to the session-expired screen | auth | anonymous | expired-api-401 | adverse | security | medium | covered |
| auth/safe-sessions.feature | An idle session warns, then lands on the session-expired screen keeping the return path | auth | administrator | E2E-06 | happy | security | high | covered |
| auth/safe-sessions.feature | An over-idle session is rejected server-side, not just in the browser | auth | administrator | middleware-enforced | adverse | security | high | covered |
| auth/safe-sessions.feature | Choosing Stay signed in extends the session | auth | administrator | stay-signed-in | happy | security | medium | covered |
| auth/safe-sessions.feature | Signing out in one tab signs out the other within two seconds | auth | administrator | E2E-07 | happy | security | high | covered |
| auth/safe-sessions.feature | Signing out other sessions leaves this session signed in | auth | administrator | sign-out-others | happy | security | high | covered |
| auth/safe-sessions.feature | The session ends at the 4-hour absolute limit even while active | auth | administrator | absolute-limit | adverse | security | high | covered |
| auth/sign-in-protection.feature | A fifth wrong attempt pauses the account | auth | anonymous | repeated-failures | adverse | security | critical | covered |
| auth/sign-in-protection.feature | A successful sign-in clears the failure counter | auth | administrator-manager | success-clears-failures | happy | functional | medium | covered |
| auth/sign-in-protection.feature | An unknown email and a wrong password are indistinguishable | auth | anonymous | account-enumeration | negative | security | critical | covered |
| auth/sign-in-protection.feature | Every attempt requires a valid bot-check token | auth | anonymous | bot-check | adverse | security | high | covered |
| auth/sign-in-protection.feature | The pre-authentication endpoints reject a non-server caller | auth | anonymous | internal-only-endpoint | permission | security | high | covered |
| auth/two-factor.feature | A code is required at every sign-in once enrolled | auth | administrator | signin-step-up | happy | security | high | covered |
| auth/two-factor.feature | A hijacked open session cannot replace the device without re-authentication | auth | administrator | replacement-requires-reauth | adverse | security | high | covered |
| auth/two-factor.feature | A lost authenticator is not self-service and must be a manager recreate | auth | administrator | lost-device-no-self-service | negative | security | medium | covered |
| auth/two-factor.feature | A signed-in administrator with no factor is forced to enrol before any data route | auth | administrator | forced-enrolment | happy | security | high | covered |
| auth/two-factor.feature | A wrong code at the verify step is refused and the session stays aal1 | auth | administrator | verify-wrong-code | negative | security | medium | covered |
| auth/two-factor.feature | Enrol at first sign-in, then replace the device, and the next sign-in needs a code | auth | administrator | E2E-11 | happy | security | high | covered |
| auth/two-factor.feature | Forced enrolment applies to Google sign-ins too | auth | administrator | forced-enrolment-google | permission | security | high | covered |
| auth/two-factor.feature | No data is reachable until the second factor is satisfied | auth | administrator | aal2-data-gate | permission | security | critical | covered |
| auth/two-factor.feature | Repeated wrong codes during replacement are rate-limited, not endlessly retriable | auth | administrator | replacement-attempt-cap | adverse | security | medium | covered |
| auth/two-factor.feature | Replacing a device requires password and the current code for an email administrator | auth | administrator | device-replacement | happy | security | high | covered |
| auth/two-factor.feature | Replacing a device uses Google re-auth and the current code for a Google-only administrator | auth | administrator | device-replacement-google | happy | security | high | covered |
| auth/two-factor.feature | The only Admin manager who loses their device cannot self-recreate from the app | auth | administrator-manager | lost-device-only-manager | adverse | security | medium | covered |
| auth/two-factor.feature | Two-factor cannot be switched off | auth | administrator | no-self-disable | adverse | security | high | covered |
| design-system/component-accessibility.feature | A disabled control is non-interactive and announced as disabled | design-system | assistive-tech | disabled-control | edge | accessibility | medium | covered |
| design-system/component-accessibility.feature | Components render consistently across supported browsers | design-system | end-user | cross-browser | edge | functional | medium | covered |
| design-system/component-accessibility.feature | Grayscale components meet WCAG 2.2 AA contrast | design-system | assistive-tech | grayscale-contrast | boundary | accessibility | high | covered |
| design-system/component-accessibility.feature | The alert announces errors to screen readers | design-system | assistive-tech | alert-a11y | happy | accessibility | high | covered |
| design-system/component-accessibility.feature | The button is keyboard operable with a visible focus state | design-system | assistive-tech | button-a11y | happy | accessibility | high | covered |
| design-system/component-accessibility.feature | The input exposes its label and invalid state to assistive tech | design-system | assistive-tech | input-a11y | happy | accessibility | high | covered |
| design-system/migration.feature | The forgot-password screen uses design-system components with behaviour parity | design-system | end-user | forgot-password-migrated | happy | functional | high | covered |
| design-system/migration.feature | The set-new-password screen uses design-system components with behaviour parity | design-system | end-user | reset-password-migrated | happy | functional | high | covered |
| design-system/migration.feature | The sign-in screen uses design-system components with behaviour parity | design-system | end-user | signin-migrated | happy | functional | high | covered |
