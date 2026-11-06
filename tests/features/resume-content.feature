Feature: Resume content integrity
  As a blog maintainer
  I want resume links and metadata to stay consistent
  So that resume navigation remains trustworthy

  Scenario: resume social linkedin uses canonical profile URL
    Given resume social links are defined in site config
    When linkedin link is rendered
    Then linkedin URL must use https://www.linkedin.com/in/<slug>/ format

  Scenario: resume meta title uses unified short label
    Given resume locale metadata is configured for both Korean and English
    When title fields are resolved for runtime and build fallback
    Then meta title and og title should use "resume" consistently

  Scenario: resume wintrover social github link uses personal profile
    Given resume social links are defined in site config
    When github link is rendered
    Then github URL must use https://github.com/wintrover format

  Scenario: resume project entry names the real Axiom project
    Given resume project entries are defined in korean and english locales
    When the devlog project entry is resolved
    Then title must be "Axiom" and the description must present the integrity proof engine for AI-generated software logic
