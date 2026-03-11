Feature: Core behavior

Scenario: fadeInUp default transition renders expected css at endpoints
  Given a "fadeInUp" transition with default options
  When I render css at t=0
  Then translateY is 40 and opacity is 0
  When I render css at t=1
  Then translateY is 0 and opacity is 1

Scenario: slideInLeft and slideInRight transitions render expected css at endpoints
  Given a "slideInLeft" transition with delay 0 and duration 600
  And a "slideInRight" transition with delay 0 and duration 600
  When I render left css at t=0
  Then left translateX is -50 and opacity is 0
  When I render right css at t=0
  Then right translateX is 50 and opacity is 0

Scenario: scroll observer uses provided options
  Given a scroll observer callback
  When I create a scroll observer with threshold 0.2 and rootMargin "0px 0px -10px 0px"
  Then observer options equal threshold 0.2 and rootMargin "0px 0px -10px 0px"

Scenario: scroll observer uses default options
  Given a scroll observer callback
  When I create a scroll observer with default options
  Then observer options equal threshold 0.1 and rootMargin "0px 0px -50px 0px"

Scenario: i18n initializes on server with default locale
  Given I am running on the server
  When i18n initializes
  Then initial locale is "ko"
  And both "ko" and "en" locale loaders resolve

Scenario: i18n initializes on browser with navigator language
  Given I am running in the browser with navigator language "en-US"
  When i18n initializes
  Then initial locale is "en-US"
  And both "ko" and "en" locale loaders resolve
