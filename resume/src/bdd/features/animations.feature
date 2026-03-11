Feature: UI animations helpers

  Scenario: fadeInUp generates expected translateY and opacity
    Given a "fadeInUp" transition with default options
    When I render css at t=0
    Then translateY is 40 and opacity is 0
    When I render css at t=1
    Then translateY is 0 and opacity is 1

  Scenario: slideInLeft and slideInRight generate expected translateX and opacity
    Given a "slideInLeft" transition with delay 10 and duration 20
    And a "slideInRight" transition with delay 11 and duration 21
    When I render left css at t=0
    Then left translateX is -50 and opacity is 0
    When I render right css at t=0
    Then right translateX is 50 and opacity is 0
    When I render left css at t=1
    Then left translateX is 0 and opacity is 1
    When I render right css at t=1
    Then right translateX is 0 and opacity is 1

  Scenario: createScrollObserver merges defaults and respects overrides
    Given a scroll observer callback
    When I create a scroll observer with threshold 0.2 and rootMargin "1px"
    Then observer options equal threshold 0.2 and rootMargin "1px"
    When I create a scroll observer with default options
    Then observer options equal threshold 0.1 and rootMargin "0px 0px -50px 0px"
