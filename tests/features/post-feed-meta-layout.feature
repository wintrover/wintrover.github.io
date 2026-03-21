Feature: Post feed meta layout
  As a reader
  I want date and tags to appear in a predictable order
  So that metadata is scanned naturally from left to right

  Scenario: date appears before tags in post meta row
    Given post feed card renders a meta row
    When metadata order is inspected
    Then date element is rendered before keyword list
    And tags are placed immediately after date without auto push to far right
