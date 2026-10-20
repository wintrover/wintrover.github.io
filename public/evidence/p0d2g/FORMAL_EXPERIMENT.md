# P0-D2-G — Formal Verification Experiment Record (Defect Differential of the Adopted Agent Spec S2 + Original Code Replay Binding)

Experiment: `act2-wp-toml-b1-input-integrity/p0d2g` · Date: 2026-10-17
Spec: `AGENT_SPEC.md` (the first creation product of the agent chain — this record is the record of adopting and verifying it) · Replay: `replay_agent.sh`
Evidence: `evidence/` (curated snapshot + `SHA256SUMS` correspondence guarantee; the original raw artifacts are preserved in the gitignored `runs/`·`state_*/`·`vault_*/`·`env*/`)
Binding: `config/spec/toml_d2_agent_spec.json` (SPEC-TOML-D2-AGENT) · `docs/spec/toml_d2_agent_binding_contract.md` — landing commit `efc90940d`
Pipeline gap record: `PIPELINE_GAP_P4_BOOL_BINDING.md` · Limits of direct attachment to the original: `ORIG_PRAGMA_LIMIT.md`

## FACT SHEET

### Question

Does the agent vertical slice that runs through blind discovery → spec reasoning → adoption → pipeline injection
discover the real defect (acceptance of control characters inside strings) **without a human telling it about the defect**,
and under the adopted spec S2 **refute the defect target with a counterexample** while **proving the control kernel**?
(terminal outcome: `DISPROVED` promotion + replay of the original code — the observation scope and the non-observations of
this slice are stated in the Classification and Non-Conclusions sections below.)

### Context

| item | value |
|---|---|
| subject | status-im/nim-toml-serialization @ `4aa8e2223649fc0837c490a4acfca7b8b1e756f9` (read-only pristine clone `env_p/subject`, `git status --porcelain` empty before and after — drift gate passed) |
| defect | `lexer.nim:588` single-line string gate `{8,16,31,127}` vs the forbid required by the README v1.1.0 conformance claim (`README.md:65`) — multiline `:554` further narrows to `{16,31,127}` |
| Axiom | this branch `followup/d2-agent-vertical`, binding commit `efc90940d` (+1,885 lines), `bin/ax` v0.3.7 |
| toolchain | Nim 2.2.10 [Linux: amd64] · z3 4.13.3 · Lean 4.33.0 (`state_e1/logs/ax_proof_state.json` `executionIdentity.toolchainIdentity`) |
| spec | S2 — `D = 1..255 ∖ {10,13,34,92}`, `forbid(c) = (c≤8) ∨ (10≤c≤31) ∨ (c=127)`, 2 carriers (`AGENT_SPEC.md` §4·§5) |

### Scope

Only the 2 carriers of the adopted S2 — `d2StringGateReject` (extraction of the defect gate) and `d2CommentGateReject`
(extraction of the repository's own conformance set, set-identical to forbid). Key·comment paths, multiline line-break
rules, escape validity, multibyte UTF-8, and candidates 2~11 (e.g. writeKey non-quoting) are **out of scope**
(refer to the rubric verdict in `AGENT_SPEC.md` §1).

### Procedure (6 steps — Phase A~E)

1. **Phase A discovery (2 blind agents)** — 2 independent zero-context analyses with a prompt containing zero defect hints.
   The originals are preserved verbatim: `discovery/agentA_raw.md` (sha256 `e3b20c9d6293c249…b6e5c9`),
   `discovery/agentB_raw.md` (`0b329a4498eabe6f…35f12`). The key assumption (\xHH decode semantics) was
   **not discovered by either side**, and 3 of the 7+7 genuine candidates converged. The selection (acceptance of
   control characters in strings, A3+B3) was made by the **reasoning agent** (not the orchestrator).
2. **Phase B spec reasoning** — `AGENT_SPEC.md` (sha256 `f9c8f2d3ef47fdc5…21a91d`): authoring of S2, with **4 citation
   corrections** recorded through an exhaustive comparison of the inherited citations (§11); static authoring without compilation or execution.
3. **Adoption** — overlay `config/spec/toml_d2_agent_spec.json` (soExplicit, agent chain
   provenance block + the adoption act = user-approved slice plan + committed contract
   `docs/spec/toml_d2_agent_binding_contract.md`).
4. **Limits of the direct connection to the original (Phase D)** — observed that the direct attachment of the spec pragma to the
   original header is blocked fail-closed by **3 serial gates** (frontier dependency closure NotFound → absence of an obligation
   source `ogr.no-applicable` → spec ingestion lossy): `ORIG_PRAGMA_LIMIT.md` + `variant_orig.patch` (1531B). The if-expression
   spec was re-confirmed as rejected as lossy in v0.3.7 as well (3.3/3.4 probes).
5. **Phase C engine binding** — commit `efc90940d` (+1,885 lines): overlay loader·validator (9-clause grammar,
   enforcement of control ≡ forbid set-identity), 2-carrier synthesizer (bool-native IR), module path gate
   routing, original code replay binding (harness template
   `Toml.decode("k = \"a" & chr(<c>) & "b\"", TomlValueRef)`, projecting the observed raise into a reject bool),
   unit tests 31/31 (`tests/unit/test_toml_d2_agent_binding.nim`).
6. **Phase E verification** — after reconstructing the pristine subject, the defect run (state_e1), the cold re-run
   (state_e3), and the standalone control rejection (state_e2). Command: `AXIOM_STATE_DIR=state_e1
   AXIOM_PROVE_VAULT_DIR=vault_e_defect bin/ax prove --project env_p/subject
   --target 'toml_serialization/lexer.nim::scanString'` (cwd=Axiom3 root, scope lock
   seed). `replay_agent.sh` is responsible for the full replay.

### Result (all machine-observed)

1. **Overlay synthesis** (`runs/e_defect.err:4` — the observation that the adopted spec was actually injected into the pipeline):

   ```
   [INFO] axiom_engine: toml d2-agent overlay carriers synthesized: d2StringGateReject (gate d2StringGateReject=@[8, 16, 31, 127]) + d2CommentGateReject (forbid 8/10/31/127) domain=1<=c<=255 exclusions=4 obligations=7/7 eligible=true/true source=toml_serialization/lexer.nim
   ```

   7 obligations, both carriers eligible — a normal passage of the fail-closed acceptance gate.
   The canonical seal receded into `sealError` because of EA non-measurement (ckVarTy), and the BMC lane
   determined the adopted model (contract §3 — an empty EA leg is an honest non-measurement).

2. **Defect differential — SAT refutation and proof coexisting within a single run** (state_e1, exit 1):
   - The BMC lane reached SAT by binding a real counterexample witness c=24 (a gap member) to `scanString`
     (`[ERROR] loop_driver: IR pipeline FAIL: scanString status=psFail
     provenance=solverMethod=smBMC,provenance=pkNone`, `runs/e_defect.err:42`).
   - claimOutcome trajectory (`state_e1/logs/ax_prove_trajectory.jsonl` skReport
     `unitEvidenceRefs`) — **the defect target is clDisproved, the control kernel is clProved**:

     ```
     toml_serialization/lexer.nim::scanString          → "claimOutcome": "clDisproved"  (claimId 707105aaeac78e6a…afa3dd)
     toml_serialization/lexer.nim::d2CommentGateReject → "claimOutcome": "clProved"     (claimId b36f8be708d4408e…f620b5)
     ```

   - Vault manifest (`vault_e_defect/manifest.json`): the `scanString` row is **certRed**
     (irHash `5c05274c86885add…b70fae75`), the `d2CommentGateReject` row is **certZ3Candidate**
     (irHash `cf15872b80c0c6bf…fd457c2`) — GateVerdict FAIL
     (`canonical run accounting: contestedCount=0 ∨ unsatisfiedCount=1 ⇒
     GateVerdict=FAIL`, `runs/e_defect.err:72`), `[Depth 1/1] Checking:
     lexer.nim::scanString... [FAILED]` (`runs/e_defect.err:73`).
   - 2 collateral items (a recurrence of Q3 in the Axiom's own code scanned by the defect leg — ce-replay failures
     unrelated to the defect target): `calcDynamicTimeoutCore — replay rvUnavailable:harness nonzero
     exit 1`(`:14`), `proximityScore — replay rvUnavailable:model does not bind
     parameter 'nodeCount'`(`:24`). This is the same generic replay bottleneck as Q3 in p0d2f.

3. **Standalone control rejection** (`runs/e_control.err`, state_e2, exit 2):
   `--target 'toml_serialization/lexer.nim::d2CommentGateReject'` yields
   `not found in frontier — canonical target: NotFound (fail-closed, empty selection)`.
   The control kernel is addressable by the census (a candidate), but because it does not pass the dependency closure
   for frontier inclusion, the standalone target execution is structurally rejected — the control verdict can only
   be observed **within the same run** as the defect run, and item 2 in fact achieved that.

4. **Cold determinism** (state_e3, exit 1): the `canonicalRunDigest` of the re-run **MATCHES** the first one —

   ```
   3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a   (state_e1 == state_e3)
   ```

   All claimId·irHash are identical, and the `e_defect.err`↔`e_defect2.err` diff is only 1 line in the vault path
   (harness·verdict bytes identical). Q1(cwd=$ROOT)·Q2
   (porcelain) of `replay_harness_config_quirks.md` were both avoided via seeds.

5. **Replay·promotion not observed (P-F1 — a generic pipeline gap)**: despite the BMC SAT (a real witness c=24),
   `[ce-replay]` was not emitted for `scanString` and remained `counterexample = null`.
   The root cause is `src/verification/counterexample_validator.nim:74-79` — the P4 re-verification
   `preconditionSmt` asserts the bool-typed initExpr as a **condition** (in the C20 one-state
   model the `result` binding becomes the body `gate(c)`, which exactly excludes the defect witness
   (`gate=false ∧ forbid=true`)) → `cvSpurious`(`:131-132`) → candidate preserved →
   `vsDisproved` not reached → the replay trigger (`ir_pipeline_runner.nim:1439-1441`) does not fire.
   A bool-returning carrier is **incapable of promotion** on this path (all preceding carriers were
   arithmetic — a non-bool equality branch, a path that never matched). The BMC model bound c=24 exactly
   (the model capture is normal). The originating commit is `05055aab5` (2026-10-08, generic) — `efc90940d` did
   not touch `counterexample_validator.nim`. The fix sketch (C20 one-state
   discriminator: `resultStateName=some("result")` + identity transition → asserting the index-aligned bool
   initExpr as an equality) is documented in `PIPELINE_GAP_P4_BOOL_BINDING.md`. **It was not fixed in this
   slice** — modifying the generic validator to make our experiment pass would be patch-to-pass, and
   the pipeline's preservation of cvSpurious is behaviour by the fail-closed design.
   The captured P4 script (quoted from `PIPELINE_GAP_P4_BOOL_BINDING.md`):

   ```smt2
   (declare-fun state ((_ BitVec 64) Bool) Bool)
   (declare-const c (_ BitVec 64))
   (declare-const result Bool)
   (assert (and (= c c) (or (or (or (= c #x0000000000000008) (= c #x0000000000000010)) (= c #x000000000000001F)) (= c #x000000000000007F))))
   (assert (not (= (or (or (or (= c #x0000000000000008) (= c #x0000000000000010)) (= c #x000000000000001F)) (= c #x000000000000007F)) (or (or (bvsle c #x0000000000000008) (and (bvsge c #x000000000000000A) (bvsle c #x000000000000001F))) (= c #x000000000000007F)))))
   (check-sat)
   ```

   This script asserts the body (`gate(c)`) as an entire term and thereby excludes the defect witness — the first
   assert already forces `(= c 8∨16∨31∨127)`, so gap members such as c=7·24 are removed from the model.

6. **Pristine integrity**: `env_p/subject` @4aa8e22, lexer.nim sha256
   `19d69eed84f74c51fa1784b2e71a4525abc8d2b8aa854c567565d2d603133f4d` (matching the value carried over
   in spec §5), porcelain empty before and after the run — drift gate passed.

### Evidence

`evidence/` — a curated snapshot (`README.md` carries the run↔state/target correspondence,
`SHA256SUMS` guarantees the file correspondence): the defect run originals (`runs/e_defect.{err,exit}`·
`e_defect2.{err,exit}`·`e_control.{err,exit}`)·the preserved replay harness
(`e_replay_harness_c0.nim`)·3 state_e1 logs (proof state·trajectory·z3 telemetry)·
state_e3 proof state·`vault_e_defect/manifest.json` (vault_e_control is an empty directory —
by itself the proof that the standalone control was rejected before the run)·`variant_orig.patch`·
`ORIG_PRAGMA_LIMIT.md`·`PIPELINE_GAP_P4_BOOL_BINDING.md`. **The originals were not moved** —
all raw artifacts remain as they are in the gitignored `runs/`·`state_*/`·`vault_*/`·`env*/` of the slice,
and `replay_agent.sh` is responsible for the regeneration of the full run. `AGENT_SPEC.md` and the 2 originals
in `discovery/` are already committed in the binding commit `efc90940d` (they are not duplicated here).

### Classification — 4 axes (machine-observed)

| axis | verdict | grounds |
|---|---|---|
| discovery | **PARTIAL** | genuine candidates 7+7 (3 converged) were discovered blindly — however, the key assumption (\xHH decode semantics) was not discovered by either side. The score of the discovery axis is the recorded value and is not re-derived by this record |
| spec generation | **OBSERVED** | S2 fail-closed acceptance: 7 obligations, both carriers eligible (overlay synthesis INFO line), grounds given + 4 citation corrections (`AGENT_SPEC.md` §11) |
| verification accuracy | **OBSERVED** | the differential within a single run (clDisproved SAT + clProved) + cold determinism MATCH (digest `3516fcfc…`) |
| evidence reliability | **PARTIAL** | replay·BUG_FOUND not observed — the root cause is documented (`PIPELINE_GAP_P4_BOOL_BINDING.md`); determinism·pristine drift 0·no UNKNOWN-as-success are satisfied |

### Vertical slice observation state (slice verdict)

**Discovery → reasoning → adoption → verification observed. DISPROVED promotion·original replay not observed.**
This slice proves that the agent chain, in a zero context, conjectured the real defect (and that it holds as a spec
that is mechanically refuted by the SAT counterexample c=24), and that this spec was observed through fail-closed
adoption·pipeline injection·differential verdict. However, the terminal outcome `vsDisproved` promotion and the replay
of the original code (`[ce-replay]` + BUG_FOUND) are **not observed** because of the P4 bool-binding pipeline gap —
the root cause of the non-observation lies in the generic validator code (`counterexample_validator.nim`) and not on
the binding side, so this slice closes that gap as a record. The final ACCEPTANCE verdict is issued by
`replay_agent.sh`, and the expected terminal result under the current observations is
`ACCEPTANCE: INCOMPLETE (replay/promotion unavailable — P4 bool-binding pipeline gap,
see PIPELINE_GAP_P4_BOOL_BINDING.md)`. This document does not substitute for that verdict.

### Interpretation

- **The discriminating power of the adopted spec is demonstrated**: from the same S2, only the extracted defect-gate kernel is
  refuted by SAT, while the forbid set-identical control kernel is proved — the negative control group excludes a defect in the
  spec injection·pipeline (if SAT had come out in the control, the defect would be in the injection, not in the subject).
- **The structural limit of the direct attachment to the original is established**: the spec pragma attached to the original
  header is not registered as an obligation — the 3 serial gates of frontier dependency closure·qualification (obligation
  source)·ingestion (lossy) block it, and this is exactly the reason the bespoke extraction kernel + overlay path exists (`ORIG_PRAGMA_LIMIT.md`).
- **The absence of a promotion path for bool carriers is established**: the BMC SAT→model→P4→vsDisproved→replay chain
  is broken for bool-returning carriers — the "the spec says false but it returns true" defect type (the verdict
  predicate claim) all passes through this path, and the arithmetic carriers of the preceding slice take the equality
  branch, so the gap is now exposed for the first time.
- The kernel↔original correspondence is backed by grounds of static reading (loop structure·UTF-8 table·comment set), but this
  is **not formal verification** — the direct extraction·verification of the original `scanString` was not performed.

### Non-Conclusions

- **The model↔original correspondence is based on grounds, not a formal proof** — the object of SAT/UNSAT is the adopted
  model (the extracted kernel), not the original `scanString` function.
- **The completeness of the discovery is not claimed** — the key assumption was missing from the candidate pool of the
  2 blind agents, and no observation backs "the absence of further defects".
- **The carrier, not the kernel form, is the adopted model** — `d2StringGateReject` is not a replica of the original code
  but a certification model of the defect gate declared by S2, and equivalence with the original has been secured only
  up to grounds of static reading.
- The clProved of the control kernel is forbidden from being broadened into "a proof of the correctness of lexer.nim as a
  whole (or of the comment path)" — what it backs is only "a model set-identical to S2 forbid satisfies forbid over the whole of D".
- The non-observation of replay·BUG_FOUND is forbidden from being read in the direction of "the original code is correct" —
  the BMC counterexample (c=24) is an existing defect witness, and the non-observation is a gap in the pipeline promotion path.

### Next Experiment (candidates)

1. **P4 bool-binding fix (Axiom improvement — root-cause treatment)** —
   Place a C20 one-state discriminator (`resultStateName=some("result")` + identity transition) in
   `counterexample_validator.nim` `preconditionSmt` and assert the index-aligned bool
   initExpr as an equality. Then re-run the p0d2g defect run and observe the whole chain
   `cvConfirmed → vsDisproved → [ce-replay] → BUG_FOUND → DISPROVED promotion`
   (fix shape in `PIPELINE_GAP_P4_BOOL_BINDING.md`).
2. **Subject commit mutation (of the replay drift-gate-passing kind)** — materialize a mutation commit
   that commits a mutation inside the original clone, so as to structurally pass Q2 (subject porcelain);
   this is the p0d2g application of p0d2f next experiment 3.
3. **Improvement of the discovery protocol** — a prompt/structure that closes the omission of the key assumption
   (\xHH decode semantics) (e.g. a runtime observation hint step, an API-semantics checklist before the convergence
   of candidates) — the direct follow-up to the discovery axis PARTIAL.
4. **if-expression frontend coverage** — `toCanonKind` nkElifExpr/nkElseExpr mapping +
   `convertExprCanon` ckIfStmt arm (re-confirmation of p0d2f next experiment 1 — the 3.3 probe of
   this slice re-verifies that it is still valid in v0.3.7 as well).

---

## ACCEPTANCE status

The final verdict is issued by `replay_agent.sh` — a 5-condition decision table and the ACCEPTANCE verdict over the conditions
C1 (defect refutation: exit 1 ∧ trajectory clDisproved ∧ manifest certRed)·C2 (control proof: d2CommentGateReject
clProved/certZ3Candidate in the same run)·C3 (cold determinism: a fixed comparison of the digest `3516fcfc…` between runs)·
C4 (replay/BUG_FOUND — **non-observation is expected as long as the P4 bool-binding gap remains open**)·C5 (evidence
completeness). The execution is scheduled after the merge into main, and the expected terminal result under the current
observations (C4 not observed — see the replay·promotion non-observation above) is
`INCOMPLETE (replay/promotion unavailable — P4 bool-binding pipeline gap)`.
This document does not substitute for that verdict.

## Addendum — landing path correction (2026-10-17)

The single PR #909 was rejected at the merge-group admission gate by **ROT_NEW_PIN**(④ line-set(pin@H) ≠ set(derived H)) +
**allowlistOk:false**(① non-closure companion path) — as measured: a change within the closure (876 members) is the 3 engine files
(axiom_engine·counterexample_replay·canonical_verification, all pin members), whereas a change to experiments·tests·
config/spec·docs/spec violates ①. With the same fix class as the precedent `62dbeab8b`, it lands as a **2-PR split**:

1. **PR #911 (ROTATION, MERGE d4b2a0e9)**: the 3 engine files (including making the overlay presence-optional) +
   re-anchoring of the 3 entries of trusted_writer_set.json (deriver-derived sha; pin==derived 876==876 as measured MATCH) +
   regeneration of architecture_debt. All changed paths satisfy ① (closure member·pin·allowlisted debt).
2. **This PR (NORMAL)**: overlay·contract (including the presence fix)·experiment record·unit tests — closure unchanged.

The presence fix proposal in §2 of the contract document is the basis of this split, and atomicity is preserved by the two
sequential PRs (at the point where the engine lands alone, main has no overlay = normal operation through an explicit log + an inactive binding).
