Feature: Visual cleanup of the home hero section
  As a reader
  I want a clean, focused hero section
  So I can focus on the content without distracting visual elements

  Scenario: Remove the bottom-right gradient from the hero section
    Given I render the homepage
    When I inspect the hero section
    Then it should not have a bottom-right radial gradient pseudo-element
