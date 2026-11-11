Feature: Existing features migrate to the design system

  # PR 3 (sign-in pilot, ADR-0011) migrates the sign-in flow to the shadcn/ui primitives with behaviour
  # parity. Executed at the lowest layer that proves it: the SignInPage unit test (RTL + Vitest) drives
  # this behaviour (generic error + remaining-attempts helper, locked view, password toggle). The later
  # migration scenarios (old-component removal, per-screen rollback) land with their own PRs (4-7).

  @audience:end-user @usecase:signin-migrated @category:happy @quality:functional @severity:high
  Scenario: The sign-in screen uses design-system components with behaviour parity
    Given the sign-in screen migrated to the design-system button, input, and alert
    When a user signs in with valid credentials
    Then the flow behaves exactly as before the migration
    And the password visibility toggle and error banner still work

  # PR 4 (password-reset flow). Executed by ForgotPasswordPage.test.tsx and ResetPasswordPage.test.tsx.

  @audience:end-user @usecase:forgot-password-migrated @category:happy @quality:functional @severity:high
  Scenario: The forgot-password screen uses design-system components with behaviour parity
    Given the forgot-password screen migrated to the design-system input, label and alert
    When a user requests a reset link
    Then the flow behaves exactly as before the migration
    And the enumeration-safe check-your-email acknowledgement still shows

  @audience:end-user @usecase:reset-password-migrated @category:happy @quality:functional @severity:high
  Scenario: The set-new-password screen uses design-system components with behaviour parity
    Given the set-new-password screen migrated to the design-system input, label, alert and button
    When a user sets a matching password that meets the length rule
    Then the flow behaves exactly as before the migration
    And the password visibility toggles and the mismatch helper still work

  # PR 5 (MFA enrol). Executed by MfaEnrolPage.test.tsx.

  @audience:end-user @usecase:mfa-enrol-migrated @category:happy @quality:functional @severity:high
  Scenario: The two-factor enrolment wizard uses design-system components with behaviour parity
    Given the MFA-enrol wizard migrated to the design-system button, input and alert
    When a new administrator enrols through the instructions, QR and code steps
    Then the flow behaves exactly as before the migration
    And the step actions, back links, sign-out and wrong-code alert still work

  # PR 6 (settings/security). Executed by TwoFactorCard.test.tsx.

  @audience:end-user @usecase:settings-2fa-migrated @category:happy @quality:functional @severity:high
  Scenario: The two-factor card and device-replacement modal use design-system components with behaviour parity
    Given the two-factor card and replacement modal migrated to the design-system button, input and alert
    When an administrator replaces their authenticator device
    Then the flow behaves exactly as before the migration
    And the re-authentication, new-device, code steps, lost-device path and modal actions still work

  # PR 7 (session-timeout warning, the final migration PR). Executed by SessionWarningDialog.test.tsx.

  @audience:end-user @usecase:session-warning-migrated @category:happy @quality:functional @severity:high
  Scenario: The session-timeout warning dialog uses design-system components with behaviour parity
    Given the session-timeout warning dialog migrated to the design-system button
    When the dialog warns an administrator their session is about to end
    Then the flow behaves exactly as before the migration
    And both actions stay keyboard-focusable buttons with focus on the primary and the trap intact

  # Shell (TP1-06 app shell, clears the last 7 waivers). Executed by SideNav.test.tsx and ErrorState.test.tsx.

  @audience:administrator @usecase:shell-migrated @category:happy @quality:functional @severity:high
  Scenario: The app shell (side nav + error screens) uses design-system components with behaviour parity
    Given the side-nav controls and the error-state action migrated to the design-system button
    When an administrator collapses the nav, expands a section, or opens a forbidden/not-found screen
    Then the controls behave exactly as before the migration
    And they stay native buttons with their names and aria state, and the nav links stay basePath-relative
