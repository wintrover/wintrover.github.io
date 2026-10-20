commit 52abab1bba9775fc4a86520b44d8fed9abc2b1d4
author wintrover <wintrover@users.noreply.github.com>
date 2026-10-19 11:05:47 +0900

fix(verification): ce-replay collateral harness — include splice, module-repo binding, Q5 dep roots

Self-kernel collateral replays (calcDynamicTimeoutCore) failed on every
defect-leg run with 'harness nonzero exit 1' — three mechanical gaps in the
plain-harness path, each isolated by manual reproduction:

- Q5 (paths): the skip-flag compile (--skipParentCfg/--skipUserCfg/
  --skipProjCfg, Q1/Q3 resolution) loses the repo config's path injections.
  Observed cascade: 'cannot open file: checksums/sha2' → 'cannot open file:
  compiler/parser'. Plain harnesses now ride the subject repo's nimble
  requires roots (declarative contract, resolved via the existing
  deterministic store resolver) plus the Nim toolchain root derived from the
  MEASURED nimExe (compiler/* imports). d2-agent stamped-template path
  untouched (byte-identical command).
- Q6 (privacy): kernel collateral symbols are mostly PRIVATE (no * export);
  an 'import' harness can never expose them ('undeclared identifier').
  renderReplayHarness now splices with 'include <module>' — same --path
  search, read-only, relative imports inside the spliced file resolve
  against the spliced file's dir (verified on 2.2.10).
- binding: the subject repo root is discovered from the SUBJECT MODULE's git
  toplevel, not the caller's analysis root — an external --project run
  proves Axiom-repo collateral, so identity folds (subjectGitRef/treeMerkle),
  the porcelain check, and the compile roots must describe THAT repo.
  ceReplayModulePath gains the repo-root join candidate (cwd-independent
  resolution for repo-relative collateral sourcePaths).

proximityScore is NOT changed: its model lacks nodeCount because the typed-
obligation lowering replaces the classic script with a div obligation over
interfaceDistance only (upstream, documented in the adapter spec) — the
exact-input gate's fail-closed refusal is correct-by-design.

Evidence: baseline defect-leg run reproduced all three ce-replay lines
verbatim; post-fix unit suite 31/31 (5 new tests: include render, requires
parser, module-path candidates, nested-private-symbol e2e with module-repo
identity). Upstream defects observed by the honest adapter are recorded in
docs/spec/counterexample_replay_adapter.md §4 (unknown-constant BMC script;
partial-param obligation model) — adapter stays authority-0, fail-closed
demotion preserved.

