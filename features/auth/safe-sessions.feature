Feature: Safe sessions (idle + absolute limits, multi-tab sync, session revocation)
  Admin sessions expire predictably and are revocable (NFR-S5, Q-1-02, ADR-0010). An idle session warns at 13
  minutes and ends at 15; a session ends at most 4 hours after it began, whatever the activity; both land on
  /session-expired keeping the return path. The idle/absolute limits are enforced server-side in middleware
  from a signed, HttpOnly last-activity cookie the browser cannot forge — the cookie is a UX + defense-in-depth
  timeout, while the RLS aal2 gate stays the real authorization boundary. Signing out in one tab signs out
  every tab, and an administrator can sign out their other sessions without signing out this one. The limits
  are configuration, not code, so a test can shorten them. The full end-to-end runs (E2E-06, E2E-07) are gated
  on the full-stack harness; the executable step definitions land with the Playwright + Supabase harness.

  @audience:administrator @usecase:E2E-06 @category:happy @security @owasp:session-management @severity:high
  Scenario: An idle session warns, then lands on the session-expired screen keeping the return path
    Given a signed-in administrator on a data route with the limits shortened for the test
    When they stop interacting until the idle warning appears
    Then a warning dialog offers Stay signed in before the session ends
    And doing nothing signs them out and lands on /session-expired with the original path kept as the return path

  @audience:administrator @usecase:stay-signed-in @category:happy @security @owasp:session-management @severity:medium
  Scenario: Choosing Stay signed in extends the session
    Given a signed-in administrator seeing the idle warning dialog
    When they choose Stay signed in before the countdown ends
    Then the session continues and the warning dialog closes
    And the last-activity cookie is re-stamped so the idle countdown starts again

  @audience:administrator @usecase:absolute-limit @category:adverse @security @owasp:session-management @severity:high
  Scenario: The session ends at the 4-hour absolute limit even while active
    Given a signed-in administrator whose session began four hours ago (shortened for the test)
    When they are still actively using the app
    Then a non-extendable warning appears two minutes before the limit
    And at the limit they are signed out to /session-expired regardless of their activity

  @audience:administrator @usecase:middleware-enforced @category:adverse @security @owasp:session-management @severity:high
  Scenario: An over-idle session is rejected server-side, not just in the browser
    Given a signed-in administrator whose signed last-activity cookie is older than the idle limit
    When they request any data route directly, with scripting disabled
    Then the edge middleware redirects them to /session-expired before any data route renders
    And the RLS aal2 gate would deny the data regardless of the routing

  @audience:administrator @usecase:forged-activity-cookie @category:adverse @security @owasp:session-management @severity:high
  Scenario: A tampered last-activity cookie is never accepted to extend a session
    Given an administrator who edits the last-activity timestamp in their cookie to a recent time
    When they request a data route
    Then the HMAC signature no longer matches and the forged cookie is never trusted to extend the session
    And enforcement falls back to the server-side session controls rather than the forged timestamp

  @audience:administrator @usecase:timeout-fail-open @category:adverse @security @owasp:session-management @severity:medium
  Scenario: A deleted activity cookie fails open to the session's other controls, never a lockout
    Given a signed-in administrator whose signed activity cookie has been deleted at the workstation
    When they request a data route
    Then the idle/absolute middleware check has no signed reading and does not block the request
    And the session is still subject to the RLS aal2 gate and the Supabase token lifetime
    And this best-effort, fail-open behaviour is the documented posture (ADR-0010), not an accidental bypass

  @audience:administrator @usecase:E2E-07 @category:happy @security @owasp:session-management @severity:high
  Scenario: Signing out in one tab signs out the other within two seconds
    Given a signed-in administrator with the app open in two tabs
    When they sign out in the first tab
    Then the second tab leaves for the sign-in screen within two seconds over the shared channel

  @audience:administrator @usecase:sign-out-others @category:happy @security @owasp:session-management @severity:high
  Scenario: Signing out other sessions leaves this session signed in
    Given a signed-in administrator with sessions on other devices
    When they choose Sign out other sessions in security settings
    Then their other sessions are revoked
    And this session stays signed in

  @audience:administrator @usecase:local-sign-out-scope @category:negative @security @owasp:session-management @severity:medium
  Scenario: A normal sign-out does not revoke the administrator's other devices
    Given a signed-in administrator also signed in on another device
    When they sign out normally on this device
    Then only this session ends
    And the session on the other device is still valid

  @audience:anonymous @usecase:expired-api-401 @category:adverse @security @owasp:session-management @severity:medium
  Scenario: An expired session calling an API is sent to the session-expired screen
    Given a browser whose session has expired
    When a same-origin API call returns 401
    Then the client lands on /session-expired rather than failing silently
