Feature: Footer social link set
  As a blog visitor
  I want the footer to show only actively maintained social channels
  So that every footer link leads somewhere real

  Scenario: footer renders email github and linkedin social links only
    Given footer social link set is defined in site config
    When the footer is rendered
    Then links must be limited to email github and linkedin with no instagram button

  Scenario: footer linkedin link uses the canonical www profile URL
    Given the footer linkedin slug is defined in site config
    When the linkedin link is rendered
    Then it should point to https://www.linkedin.com/in/ with the slug and a trailing slash
