Feature: Internationalization initialization

  Scenario: server-side initialization uses default locale
    Given I am running on the server
    When i18n initializes
    Then initial locale is "ko"
    And both "ko" and "en" locale loaders resolve

  Scenario: browser initialization uses navigator language
    Given I am running in the browser with navigator language "en-US"
    When i18n initializes
    Then initial locale is "en-US"
