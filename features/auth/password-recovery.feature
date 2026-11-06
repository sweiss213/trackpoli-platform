Feature: Password recovery (forgot password, enumeration resistance, single-use links)
  Recovering a forgotten password must not reveal which emails have accounts, must not let a reset link be
  reused or replayed, and must not become a way to lock out or spam a known user. These scenarios specify
  the server-side behaviour — the request-password-reset Edge Function, the reset-completion endpoint, and
  the shared /auth/confirm Continue page — backed by ADR-0008 and the OWASP Forgot Password cheat sheet. The
  visible recovery screens and the recovery email, and the full end-to-end run (E2E-05), are specified
  alongside the UI. Executable step definitions land with the Playwright + Inbucket e2e harness.

  @audience:anonymous @usecase:account-enumeration @category:negative @security @severity:critical
  Scenario: A reset request reveals nothing about whether an account exists
    Given a known-registered administrator email and an email with no account
    When a password reset is requested for each
    Then both requests return the same acknowledgement in the same shape
    And both requests take the same amount of time within a small tolerance
    And no account is locked or changed until a valid single-use token is presented

  @audience:administrator @usecase:reset-link-single-use @category:adverse @security @severity:high
  Scenario: A reused or expired reset link is refused and creates no session
    Given a recovery link that has already been used or has expired
    When the administrator opens the Continue page and continues
    Then the link-expired state is shown
    And no recovery session is created
    And no password is changed

  @audience:anonymous @usecase:bot-check @category:adverse @security @severity:high
  Scenario: Every reset request requires a valid bot-check token
    Given a reset request without a valid Turnstile token
    When the request is processed
    Then it is rejected before any recovery email is sent
    And no account state is read or changed

  @audience:anonymous @usecase:internal-only-endpoint @category:permission @security @severity:high
  Scenario: The reset-request endpoint rejects a non-server caller
    Given a request-password-reset call without the internal call secret
    When the request is processed
    Then it is refused as forbidden
    And no recovery email is sent

  @audience:anonymous @usecase:no-lockout-on-request @category:adverse @security @severity:medium
  Scenario: Repeated reset requests never lock the targeted account
    Given many password reset requests for one administrator email
    When the per-email request limit is reached
    Then further requests are rate-limited
    And the targeted account is never locked or paused by the requests alone

  @audience:administrator @usecase:google-only-no-password @category:negative @security @severity:medium
  Scenario: A Google-only account gets the same screen and no recovery email
    Given an administrator who signs in only with Google and has no password
    When a password reset is requested for that account
    Then the same acknowledgement is returned as for any other address
    And no recovery email is sent to that account

  @audience:administrator @usecase:reset-completion @category:happy @security @severity:high
  Scenario: Completing a reset ends all sessions and clears the lockout counter
    Given an administrator on a valid recovery session
    When they set a new password that meets the policy
    Then the password is updated
    And the lockout counter for that account is cleared
    And an "auth.password_reset_completed" event is written
    And all existing sessions are ended and the user is sent to sign in

  @audience:anonymous @usecase:scanner-safe-link @category:adverse @security @severity:high
  Scenario: The one-time token is exchanged only on an explicit continue, not on a page fetch
    Given a recovery link that lands on the shared /auth/confirm Continue page
    When the page is merely fetched, as an email security scanner would, without selecting Continue
    Then the single-use token is not exchanged and no session is created
    And the token is exchanged only when the recipient explicitly selects Continue
