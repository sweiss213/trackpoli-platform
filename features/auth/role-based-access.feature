Feature: Role-based access (route guards, manager-only routes, forbidden + not-found)
  An administrator sees only what their role allows, and manager-only routes and data stay closed to
  Administrators even if they type the URL or call the API directly (P1-11, ADR-0011). Access is enforced in
  three layers: the middleware early redirect and the nested guard wrappers are ROUTING only — they read the
  role from the access-token claims (migration 006) surfaced through AuthProvider — while the database (RLS,
  migration 005/009) is what actually protects the data, denying a non-manager the manager tables no matter
  how they arrived. Hiding the manager navigation is a convenience, never the boundary. The full end-to-end
  run (E2E-08) is gated on the full-stack harness; the executable step definitions land with it.

  @audience:administrator @usecase:E2E-08 @category:permission @security @owasp:authorization @severity:critical
  Scenario: An Administrator is denied a manager route in the page and the API
    Given a signed-in Administrator (not a manager)
    When they open the manager-only /admins route and also call the manager API directly
    Then the page shows the forbidden screen and the manager API returns 403
    And the manager tables return no rows to them regardless of how they arrived (RLS)

  @audience:administrator-manager @usecase:manager-allowed @category:happy @security @owasp:authorization @severity:high
  Scenario: An Administrator manager may open the manager route and read the manager data
    Given a signed-in Administrator manager
    When they open /admins and call the manager API
    Then they see the Admin management screen and the API returns the administrator list

  @audience:administrator @usecase:manager-nav-hidden @category:permission @security @owasp:authorization @severity:medium
  Scenario: The manager navigation is hidden for an Administrator but never relied on for security
    Given a signed-in Administrator
    When the side navigation renders
    Then the Admin management entry is not shown
    But typing its URL still hits the middleware redirect, the API 403 and RLS, not a hidden link

  @audience:administrator-manager @usecase:manager-nav-shown @category:happy @security @owasp:authorization @severity:low
  Scenario: The manager navigation is shown to an Administrator manager
    Given a signed-in Administrator manager
    When the side navigation renders
    Then the Admin management entry is shown

  @audience:administrator @usecase:unreadable-role-fail-closed @category:adverse @security @owasp:authorization @severity:high
  Scenario: A session whose role cannot be confirmed is treated as not a manager
    Given a signed-in administrator whose role claim is missing or unreadable
    When they open a manager-only route
    Then the guard fails closed and shows the forbidden screen rather than manager UI
    And RLS returns no manager rows to them

  @audience:anonymous @usecase:public-only @category:happy @security @owasp:authorization @severity:medium
  Scenario: A signed-in administrator is bounced off the public-only sign-in screen
    Given an already signed-in administrator
    When they open the sign-in screen
    Then they are sent into the app rather than shown the sign-in form

  @audience:administrator @usecase:not-found @category:negative @security @owasp:authorization @severity:low
  Scenario: A missing route shows the not-found screen inside the shell
    Given a signed-in administrator
    When they open a route that does not exist
    Then the not-found screen is shown with the attempted path, inside the app shell
