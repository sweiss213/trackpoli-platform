Feature: Two-factor protection (mandatory TOTP, forced enrolment, step-up, device replacement)
  Two-factor is mandatory for every administrator, including Google sign-ins (NFR-S6, Q-1-01). No
  administrator can reach data without a verified factor, a code is required at every sign-in, and replacing
  a device is a high-risk action that re-authenticates with a credential bound to the account plus a current
  code — the open session alone is never trusted. A lost device is a manager recreate, not a self-service
  bypass, and two-factor can never be switched off. These scenarios specify the behaviour backed by ADR-0009
  and the OWASP Multifactor Authentication cheat sheet. The visible enrolment and code-entry screens land
  with the Figma designs; the full end-to-end run (E2E-11) is gated on the full-stack harness. Executable
  step definitions land with the Playwright + Supabase harness.

  @audience:administrator @usecase:forced-enrolment @category:happy @security @severity:high
  Scenario: A signed-in administrator with no factor is forced to enrol before any data route
    Given an administrator who has just signed in and has no verified second factor
    When they try to open any data route
    Then they are routed to the two-factor enrolment screen
    And confirming a code from their authenticator app lifts the session to aal2

  @audience:administrator @usecase:forced-enrolment-google @category:permission @security @severity:high
  Scenario: Forced enrolment applies to Google sign-ins too
    Given an administrator who signed in with Google and has no verified second factor
    When they try to open any data route
    Then they are routed to the two-factor enrolment screen the same as a password sign-in

  @audience:administrator @usecase:signin-step-up @category:happy @security @severity:high
  Scenario: A code is required at every sign-in once enrolled
    Given an administrator with a verified factor who has just signed in
    When their session is at aal1
    Then they are routed to the verify screen
    And entering a valid code lifts the session to aal2

  @audience:administrator @usecase:aal2-data-gate @category:permission @security @severity:critical
  Scenario: No data is reachable until the second factor is satisfied
    Given an administrator whose session is at aal1
    When they request any protected record or action
    Then the database denies it by the RLS aal2 gate
    And no routing miss can expose data, because access is decided by RLS, not the route

  @audience:administrator @usecase:verify-wrong-code @category:negative @security @severity:medium
  Scenario: A wrong code at the verify step is refused and the session stays aal1
    Given an administrator at the verify screen
    When they enter an incorrect code
    Then the attempt is refused without revealing whether the code was wrong or expired
    And the session remains at aal1

  @audience:administrator @usecase:device-replacement @category:happy @security @severity:high
  Scenario: Replacing a device requires password and the current code for an email administrator
    Given an email administrator who wants to move to a new authenticator
    When they re-enter their password and a code from their current device
    Then they are shown a new factor to enrol
    And verifying the new device removes the old one, leaving exactly one verified factor

  @audience:administrator @usecase:device-replacement-google @category:happy @security @severity:high
  Scenario: Replacing a device uses Google re-auth and the current code for a Google-only administrator
    Given a Google-only administrator who wants to move to a new authenticator
    When they re-authenticate through Google and enter a code from their current device
    Then they are shown a new factor to enrol the same as an email administrator

  @audience:administrator @usecase:replacement-requires-reauth @category:adverse @security @severity:high
  Scenario: A hijacked open session cannot replace the device without re-authentication
    Given an open administrator session that has not re-authenticated
    When a device replacement is attempted
    Then it is refused before any new factor is created
    And the current factor is left unchanged

  @audience:administrator @usecase:lost-device-no-self-service @category:negative @security @severity:medium
  Scenario: A lost authenticator is not self-service and must be a manager recreate
    Given an administrator who has lost their device and has no current code
    When they try to replace the device
    Then there is no self-service path to complete it
    And recovery is a manager recreating the account

  @audience:administrator-manager @usecase:lost-device-only-manager @category:adverse @security @severity:medium
  Scenario: The only Admin manager who loses their device cannot self-recreate from the app
    Given the only Admin manager has lost their device
    When they open the lost-device path
    Then the app states the account cannot be re-created from the app
    And it directs them to the recovery runbook with two people present

  @audience:administrator @usecase:replacement-attempt-cap @category:adverse @security @severity:medium
  Scenario: Repeated wrong codes during replacement are rate-limited, not endlessly retriable
    Given an administrator entering codes during device replacement
    When too many incorrect codes are submitted
    Then the attempt is paused for the account
    And no new factor is created or old factor removed by the failed attempts

  @audience:administrator @usecase:no-self-disable @category:adverse @security @severity:high
  Scenario: Two-factor cannot be switched off
    Given an enrolled administrator
    When they look for a way to disable two-factor
    Then no disable or remove-only option exists
    And the only factor change available is an atomic replacement that keeps one verified factor

  @audience:administrator @usecase:E2E-11 @category:happy @security @severity:high
  Scenario: Enrol at first sign-in, then replace the device, and the next sign-in needs a code
    Given a new administrator signing in for the first time
    When they enrol a second factor, then later replace the device in Security settings
    Then replacing requires their password and current code
    And a code is required at the next sign-in using the new device
