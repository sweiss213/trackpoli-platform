Feature: Design-system components are accessible

  # PR 3 (ADR-0011) adds the shadcn/ui button, input, label and alert primitives, themed from the MD3
  # grayscale tokens. These scenarios pin the accessibility contract the migration must preserve. The
  # component-level scenarios (A1-A4) are executed as unit tests with React Testing Library + Vitest
  # (src/components/ui/component-accessibility.test.tsx). A5 (rendered contrast) and A6 (cross-browser)
  # are not assessable in jsdom: A5 is a human/axe pass (a11y-conformance.json records it not-assessed
  # for the rendered shadcn appearance) and A6 is held by the no-user-agent-sniffing gate plus the
  # support matrix.

  @audience:assistive-tech @usecase:button-a11y @category:happy @quality:accessibility @severity:high
  Scenario: The button is keyboard operable with a visible focus state
    Given a page rendering the design-system button with the label "Save"
    When a keyboard user tabs to it
    Then it has an accessible name of "Save"
    And a visible focus indicator
    And pressing Enter or Space activates it

  @audience:assistive-tech @usecase:input-a11y @category:happy @quality:accessibility @severity:high
  Scenario: The input exposes its label and invalid state to assistive tech
    Given a design-system input with a visible label
    When the field is in an error state
    Then the label is programmatically associated with the input
    And the input exposes aria-invalid as true

  @audience:assistive-tech @usecase:alert-a11y @category:happy @quality:accessibility @severity:high
  Scenario: The alert announces errors to screen readers
    Given a design-system alert that becomes visible with an error message
    When it appears
    Then it exposes an alert role or a live region so a screen reader announces it

  @audience:assistive-tech @usecase:disabled-control @category:edge @quality:accessibility @severity:medium
  Scenario: A disabled control is non-interactive and announced as disabled
    Given a design-system button rendered as disabled
    When a keyboard or screen-reader user reaches it
    Then it cannot be activated
    And it is announced as disabled

  @audience:assistive-tech @audience:end-user @usecase:grayscale-contrast @category:boundary @quality:accessibility @severity:high
  Scenario: Grayscale components meet WCAG 2.2 AA contrast
    Given the grayscale theme tokens are applied
    When axe evaluates text and controls
    Then all text and UI contrast ratios meet WCAG 2.2 AA

  @audience:end-user @usecase:cross-browser @category:edge @quality:functional @severity:medium
  Scenario: Components render consistently across supported browsers
    Given the supported browser matrix
    When a component renders in each engine
    Then layout and interaction are consistent
    And no user-agent sniffing is used to achieve it
