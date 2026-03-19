Feature: Modern UI motion across core blog surfaces
  As a reader
  I want consistent, polished motion in major UI sections
  So the Geist-based blog feels modern and lively

  Scenario: Homepage sections expose modern motion hooks
    Given I render the homepage
    When the hero, projects, and about sections appear
    Then each section should expose a motion-ready class hook

  Scenario: Sidebar and footer expose motion hooks
    Given I render the app shell
    When I inspect sidebar and footer regions
    Then profile and social link containers should expose motion-ready class hooks

  Scenario: Resume surface exposes motion hooks
    Given I render the resume page
    When I inspect key resume cards and links
    Then resume sections and cards should expose motion-ready class hooks

  Scenario: Category route changes replay list motion
    Given I render the category list route
    When I move from /category/company-work to /category/project
    Then the previous post list DOM should be destroyed and a new DOM should be created for motion replay

  Scenario: Mobile sidebar toggle keeps sidebar open after manual open
    Given I render the app shell on a mobile viewport
    When I tap the sidebar toggle button to open sidebar
    Then the sidebar should remain open without immediate auto-collapse

  Scenario: Sidebar active indicator follows current route
    Given I render the app shell after selecting a category
    When I move to a non-list route like /resume
    Then category active styling should be cleared to match current location

  Scenario: Sidebar nested subtopics are constrained to approved list
    Given I render the app shell with category nested items
    When I inspect nested labels under category nodes
    Then nested items should only include SMBholdings CVFactory and Devlog
