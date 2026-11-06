Feature: Sign-in protection (lockout, enumeration resistance, bot check)
  The admin sign-in must slow and hide repeated wrong attempts, never reveal which emails have accounts,
  and require a bot check on every attempt. These scenarios specify the server-side behaviour — the
  sign-in-check and auth-event Edge Functions and the per-account lockout (migration 010). The visible
  sign-in screen and its full end-to-end run (E2E-01/02/16) are specified alongside the UI. Backed by
  ADR-0005. Executable step definitions land with the Playwright + Inbucket e2e harness.

  @audience:anonymous @usecase:repeated-failures @category:adverse @security @severity:critical
  Scenario: A fifth wrong attempt pauses the account
    Given an administrator email with four recorded failed sign-in attempts
    When a fifth failed attempt is recorded for that email
    Then the account is paused for a cooldown period
    And an "auth.sign_in_failed" event and an "auth.account_locked" event are written
    And a later sign-in check for that email reports the attempt is not allowed

  @audience:anonymous @usecase:account-enumeration @category:negative @security @severity:critical
  Scenario: An unknown email and a wrong password are indistinguishable
    Given an email that has no administrator account
    And an administrator email with the wrong password
    When a sign-in is attempted for each
    Then both return the same generic failure in the same shape
    And neither response reveals whether the email has an account

  @audience:anonymous @usecase:bot-check @category:adverse @security @severity:high
  Scenario: Every attempt requires a valid bot-check token
    Given a sign-in check request without a valid Turnstile token
    When the request is processed
    Then it is rejected before any password or lockout state is checked
    And no sign-in failure is recorded for it

  @audience:anonymous @usecase:internal-only-endpoint @category:permission @security @severity:high
  Scenario: The pre-authentication endpoints reject a non-server caller
    Given a sign-in-check request without the internal call secret
    When the request is processed
    Then it is refused as forbidden
    And no lockout state is read or changed

  @audience:administrator-manager @usecase:success-clears-failures @category:happy @quality:functional @severity:medium
  Scenario: A successful sign-in clears the failure counter
    Given an administrator manager with some recorded failed attempts
    When that administrator manager signs in successfully
    Then the recorded failures for that email are cleared
    And an "auth.sign_in" event is written by the auth trigger
