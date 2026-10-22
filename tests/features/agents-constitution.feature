Feature: Agent constitution split
  As a Thought Trajectory Architect
  I want AGENTS.md to carry only constitutional statements
  So that procedures live in one place and drift is mechanically prevented

  Rule: AGENTS.md is the behavioral constitution of this repository

  Scenario: constitution keeps only fact invariant authority acceptance statements
    Given AGENTS.md is the behavioral constitution of the repository
    When a reviewer inspects the residual sections of AGENTS.md
    Then AGENTS.md must declare the residual criteria as Fact, Invariant, Authority and Acceptance/Failure
    And AGENTS.md must contain no command catalog, tool how-to or checklist section
    And AGENTS.md must reference docs/agents/operations.md, docs/agents/task-process.md and docs/agents/quality-gates.md

  Scenario: detailed procedure documents exist and are referenced one way
    Given procedure details are moved out of AGENTS.md
    When the agent looks up where procedures live
    Then docs/agents/operations.md, docs/agents/task-process.md and docs/agents/quality-gates.md must exist
    And AGENTS.md must point to those documents as the single direction of the reference
    And the procedure documents must not redefine the constitution

  Scenario: moved procedure and tool content cannot reappear in AGENTS.md
    Given AGENTS.md was reduced to constitutional statements
    When the moved sections are searched for inside AGENTS.md
    Then AGENTS.md must not contain the tool usage enforcement section
    And AGENTS.md must not contain the quick recap section
    And AGENTS.md must not contain the task process and skill mapping section

  Scenario: skills are discovery pointers and not a second source of truth
    Given the platform discovers skills from skills/*/SKILL.md
    When an agent loads a skill for guidance
    Then every skill body must point to a document under docs/agents/
    And every skill body must stay within the pointer size limit
    And the skill body must not restate the procedure it points to

  Scenario: codeowners declares the control plane paths
    Given the control plane of this repository spans docs, gates and toolchain files
    When GitHub computes review requests for a pull request
    Then CODEOWNERS must cover AGENTS.md, docs/spec/ and docs/agents/
    And CODEOWNERS must cover the execution paths .pre-commit-config.yaml, package.json, vite.config.ts and pnpm-lock.yaml
    And CODEOWNERS must cover the constitution contract test and the skills directory

  Scenario: retired procedure gate workflow is absent
    Given the procedure gate lost its CI and hook enforcement on 2026-10-19
    When the workflow directory is inspected
    Then .github/workflows/procedure-gate.yml must not exist
    And the evidence triple requirement must survive as a declared procedure policy

  Scenario: automation app is not a bypass actor
    Given an automation app identity with contents and pull requests permissions
    When it attempts a ruleset change, a workflow-file push, or a bypass merge
    Then the platform rejects each attempt
    And merging requires only the passing validate check with auto-merge
