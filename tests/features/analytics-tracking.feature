Feature: GA4 tracking and GSC verification integration
  As a maintainer
  I want analytics and search verification to be environment-driven
  So that production tracking is reliable and secure

  Scenario: App bootstrap initializes GA4 only with valid measurement ID
    Given the app starts from src/main.ts
    When VITE_GA_MEASUREMENT_ID matches "G-<id>"
    Then analytics initialization should run once
    And GA script loading should target googletagmanager with that ID

  Scenario: SPA route updates emit page_view with normalized hash path
    Given the app uses hash-based routing
    When route hash changes from "#/..." to another page
    Then page_view should be sent with normalized "/..." page_path
    And duplicate page_path should not be sent repeatedly

  Scenario: Build output includes Google Search Console verification meta
    Given the build pipeline renders index.html from Vite env values
    When VITE_GOOGLE_SITE_VERIFICATION is provided
    Then root and ko index pages should include google-site-verification meta content
