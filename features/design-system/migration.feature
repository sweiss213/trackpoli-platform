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
