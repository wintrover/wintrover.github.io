Feature: Not-found route completion
  As a reader
  I want unknown routes to render a localized not-found view
  So that I never see a blank screen and can find my way home

  Scenario: Unknown hash route renders the NotFound view instead of blank content
    Given the SPA router is loaded with an unknown hash route
    When the route map resolves the location
    Then the catch-all "*" route must be the last route map entry
    And the NotFound view must render inside the main content area

  Scenario: English build renders English general not-found copy
    Given the English build locale is active
    When an unknown hash route renders the NotFound view
    Then the heading must be "Page not found"
    And the body must explain the page does not exist or has been moved
    And the home action must read "Go back to home"

  Scenario: Korean build renders Korean general not-found copy
    Given the Korean build locale is active
    When an unknown hash route renders the NotFound view
    Then the heading must be "페이지를 찾을 수 없습니다"
    And the body must explain the page is missing or has been moved
    And the home action must read "홈으로 돌아가기"

  Scenario: English post detail not-found keeps the existing copy
    Given the English build locale is active
    When a post detail route targets a missing slug
    Then the heading must be "Post not found"
    And the home action must read "Go back to home"

  Scenario: Korean post detail not-found renders Korean copy
    Given the Korean build locale is active
    When a post detail route targets a missing slug
    Then the heading must be "포스트를 찾을 수 없습니다"
    And the body must explain the post is missing or has been moved
    And the home action must read "홈으로 돌아가기"

  Scenario: Server 404 shell and SEO boundary remain unchanged
    Given hash-routed not-found views share the document URL with real content
    When the SPA renders any not-found view
    Then the view must not claim robots noindex
    And the public 404 shell must keep owning first-entry misses and language redirects
