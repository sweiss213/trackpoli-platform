Feature: Admin workspace shell and shared components (P1-12)
  The admin app is a responsive, keyboard-operable shell built from a shared component library on
  shadcn/ui + MD3 grayscale tokens (ADR-0013, ADR-0011). The shell works on every device from 320px up
  (Q-1-19): a persistent navigation rail at 1024px and above, an off-canvas drawer below it. Every screen
  is reachable and operable by keyboard with visible focus, and dialogs trap focus and return it. The
  acceptance runs (E2E-13 keyboard, E2E-14 axe) execute credential-free against the component gallery and
  the shell demo (e2e/admin-shell.spec.ts); the shared primitives' unit accessibility is proven in Vitest.

  @audience:assistive-tech @usecase:E2E-13 @category:happy @quality:accessibility @severity:high
  Scenario: A keyboard user can skip the navigation and reach the main content
    Given the admin shell is open
    When a keyboard user presses Tab from the top of the page
    Then the first stop is the "Skip to main content" link
    And activating it moves focus to the main content region

  @audience:assistive-tech @usecase:E2E-13 @category:happy @quality:accessibility @severity:high
  Scenario: The navigation drawer traps focus and returns it on close
    Given the admin shell is open below 1024px with the navigation drawer closed
    When the user opens the drawer from the menu button and then closes it with Escape
    Then focus is trapped within the drawer while it is open
    And focus returns to the menu button when it closes

  @audience:assistive-tech @usecase:E2E-14 @category:happy @quality:accessibility @severity:high
  Scenario: An automated accessibility scan finds no serious or critical violations
    Given the component gallery and the app shell are rendered
    When an axe scan runs against WCAG 2.2 A and AA
    Then it reports no serious or critical violations

  @audience:end-user @usecase:responsive-nav @category:happy @quality:functional @severity:medium
  Scenario: The navigation is a rail on desktop and a drawer on small screens
    Given the admin shell
    When it is viewed at 1024px or wider
    Then the side navigation is a persistent rail and no menu button is shown
    But below 1024px the navigation collapses into a drawer opened from a menu button

  @audience:end-user @usecase:responsive-min-width @category:boundary @quality:functional @severity:medium
  Scenario: The shell renders at the 320px minimum width without horizontal scrolling
    Given the admin shell
    When it is viewed at the 320px minimum supported width
    Then the content reflows with no horizontal scrolling

  @audience:administrator @usecase:manager-nav-hidden-shell @category:permission @quality:accessibility @severity:medium
  Scenario: The manager navigation entry is hidden for an Administrator
    Given a signed-in Administrator in the shell
    When the side navigation renders
    Then the "Admin management" entry is not shown
    But hiding it is a convenience only, never the security boundary (ADR-0012)

  @audience:end-user @usecase:password-field-paste @category:happy @security @owasp:authentication @severity:medium
  Scenario: The password field keeps paste and the correct autocomplete, never exposing the value
    Given a password field in a form
    When the user pastes a password and toggles visibility
    Then paste is allowed so password managers work, and the field masks the value by default
    And the field advertises the caller's autocomplete (current-password or new-password), never storing the value itself
