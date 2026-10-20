# p0d2g — public evidence snapshot

This directory is a **curated public snapshot** of the Axiom experiment
`act2-wp-toml-b1-input-integrity/p0d2g`. It exists because the Axiom source
repository is private, while the claims in the companion blog post must be
checkable by a reader who has no access to it.

The snapshot is served verbatim from this blog's `public/` directory. It is
not a re-execution and not a re-analysis. It is a copy of the recorded
artifacts, plus the redactions listed in `REDACTIONS.md`.

## Provenance

| Item | Value |
|---|---|
| Source repository | `Archright/Axiom` (private) |
| Source commit at snapshot time | `7ae9561a9` |
| Experiment record last changed | `9775389e2` (2026-10-18, PR #912) |
| Snapshot generated | 2026-10-20 |
| Subject | `status-im/nim-toml-serialization` @ `4aa8e2223649fc0837c490a4acfca7b8b1e756f9` |
| Subject file | `toml_serialization/lexer.nim` |
| Subject file SHA-256 | `19d69eed84f74c51fa1784b2e71a4525abc8d2b8aa854c567565d2d603133f4d` |

Most artifacts are byte-for-byte copies of the named source file. Three are
redacted copies; three kinds are generated. `REDACTIONS.md` records every
difference, including original and published SHA-256 values.

## Why the filenames look like this

This blog repository's `.gitignore` ignores `logs/`, `*.log`, `*.json`, and
`*.txt` (`.gitignore:2,3,38,39`). A published artifact with those names would
be silently left out of the commit. The snapshot therefore uses
`run-records/`, `.err`, `.exit`, `.jsonl`, `.json.md`, `.patch`, and `.md`
names. Only the filenames changed; the bytes inside the copied files are
unchanged.

## Redactions and generated files

1. `run-records/ax_prove_trajectory.redacted.jsonl` — four absolute local path
   values replaced with `<AXIOM_REPO>/`.
2. `replay/replay_agent.redacted.sh` — the hard-coded subject clone path
   replaced with `<SUBJECT_CLONE>`.
3. `orig_pragma/ORIG_PRAGMA_LIMIT.md` — one home-relative subject clone path
   replaced with `<SUBJECT_CLONE>`.

Generated, not copied: `fixes/*.md` (git log exports),
`subject/lexer_gate_excerpt.md` (authored excerpt), and this README,
`REDACTIONS.md`, `SHA256SUMS`.

No other content was removed or rewritten. `FORMAL_EXPERIMENT.md` is the
frozen record; it still describes the pre-fix state and its expected verdict
is `ACCEPTANCE: INCOMPLETE`. The later fixes are recorded separately in
`fixes/`.

Authorship note: the discovery and specification files describe the agents'
own process. No prompt transcript, invocation log, or per-run timestamp is
included, so "zero-context" and "agent-authored" are documented in the
records and the contract, not independently attested by a machine log.

## Integrity: what SHA-256 proves here

`SHA256SUMS` lists every file in this directory **except itself** and uses
relative paths, so it can be verified from this directory:

```sh
sha256sum -c --strict SHA256SUMS
```

This proves:

- the public bytes have not changed since the manifest was generated;
- every listed public artifact matches the manifest.

This does **not** prove:

- that the snapshot equals the private origin — an outsider cannot read the
  private repository to compare;
- that the recorded run actually happened — a hash is not an execution
  attestation;
- that the analysis is correct — correctness claims are argued in the
  documents, not in the hash;
- that the directory contains no extra files — GNU `sha256sum -c` ignores
  unlisted files. The published file list below is the inventory; a verifier
  should compare the served directory listing to it.

The private origin hashes are therefore not published as proof. They would
only be checkable by someone with access to the private repository.

## Claim → evidence

| # | Claim in the companion post | Public artifact |
|---|---|---|
| 1 | Two independently authored blind analysis reports each contain 7 genuine candidates; the experiment record describes the runs as zero-hint/zero-context | `discovery/agentA_raw.md`, `discovery/agentB_raw.md`; `FORMAL_EXPERIMENT.md` §Procedure Phase A |
| 2 | 3 candidates converged across the two reports | `AGENT_SPEC.md` §1 "발견" column (`A3+B3`, `A2+B1`, `A5+B7`) |
| 3 | Both blind reports missed the BEL/`\x07` anchor; the synthesis pass introduced it and corrected 4 inherited citations | `FORMAL_EXPERIMENT.md` §Classification and §Non-Conclusions; `AGENT_SPEC.md` §11 |
| 4 | The synthesis pass scored 11 candidates on four criteria and selected candidate 1; the specification says this was authored without compiling or running | `AGENT_SPEC.md` §1–§2, §5 |
| 5 | The synthesis pass authored proposition S2: `∀ c ∈ D: reject(c) = forbid(c)` | `AGENT_SPEC.md` §4; `contract/toml_d2_agent_binding_contract.md` §1 |
| 6 | Content authorship and verification authority are separate; the verification authority is the explicit adoption | `contract/toml_d2_agent_binding_contract.md` §6; `overlay/toml_d2_agent_spec.json.md` `claimOwnership` |
| 7 | The adopted overlay was actually injected: obligations 7/7, both carriers eligible | `run-records/e_defect.err` line 4 |
| 8 | In one run, `scanString` was `clDisproved` while `d2CommentGateReject` was `clProved` | `run-records/ax_prove_trajectory.redacted.jsonl` (`skReport` line); `run-records/manifest.json.md` |
| 9 | Vault certificate states: `scanString` = `certRed`, `d2CommentGateReject` = `certZ3Candidate` | `run-records/manifest.json.md` |
| 10 | The cold rerun produced the same `canonicalRunDigest` (`3516fcfc…`) | `run-records/ax_proof_state.json.md`, `run-records/ax_proof_state_cold.json.md`, trajectory `skRunAccounting` line |
| 11 | P4 re-validation asserted the bool carrier body as a precondition, excluding exactly the defect witnesses | `PIPELINE_GAP_P4_BOOL_BINDING.md` §Root cause and §Probe evidence |
| 12 | The slice refused to patch-to-pass; the gap was documented, not hidden | `PIPELINE_GAP_P4_BOOL_BINDING.md` header (`Status: NOT FIXED`); `FORMAL_EXPERIMENT.md` §Result 5 |
| 13 | The gap was later fixed in generic pipeline code, not in the binding | `fixes/c31bc944f.md`, `fixes/60717df13.md`, `fixes/52abab1bb.md`, `fixes/0b9c79d47.md`, `fixes/5b6754613.md` |
| 14 | The standalone control target was refused (fail-closed NotFound) at the time, and later became targetable | `run-records/e_control.err`; `fixes/5b6754613.md` |
| 15 | Attaching the spec pragma directly to the original header was structurally blocked | `orig_pragma/ORIG_PRAGMA_LIMIT.md`, `orig_pragma/variant_orig.patch` |
| 16 | The frozen record's expected verdict is `ACCEPTANCE: INCOMPLETE`; a post-fix run on 2026-10-20 observed C1–C5 all OBS and `ACCEPTANCE: PASS` | `FORMAL_EXPERIMENT.md` §ACCEPTANCE 상태; `acceptance-2026-10-20/README.md`, `acceptance-2026-10-20/acceptance.md` |
| 17 | The post-fix run observed C4 replay agreement (`BUG_FOUND` payload, 13 records) and identical canonical digests in the defect and cold legs | `acceptance-2026-10-20/defect.err:36`, `acceptance-2026-10-20/defect_cold.err:36`, `acceptance-2026-10-20/state_r1_ax_proof_state.json.md`, `acceptance-2026-10-20/state_r2_ax_proof_state.json.md` |

## Post-fix acceptance (2026-10-20)

The original Phase E run did not observe C4; the frozen record's expected
verdict is `ACCEPTANCE: INCOMPLETE`. After the P4 and replay-harness fixes,
a full harness run on Axiom HEAD `7ae9561a9` with a rebuilt `bin/ax` v0.5.9
observed:

```text
C1 OBS  C2 OBS  C3 OBS  C4 OBS  C5 OBS
ACCEPTANCE: PASS
```

C4's observed line is:

```text
[INFO] ir_pipeline_runner: [ce-replay] d2StringGateReject — replay agreed;
BUG_FOUND payload assembled (13 records)
```

The defect and cold legs produced the same canonical digest
`3516fcfc…ced6a`. The Axiom repository does not commit the run output; this
snapshot is the public record. The frozen `FORMAL_EXPERIMENT.md` remains
unchanged as the contemporaneous record.

## What this snapshot does not claim

- **Not a vulnerability report.** No CVE, CVSS, severity, or upstream
  advisory is claimed. The scope is a TOML conformance gap in a string
  content gate.
- **Not a proof about the original `scanString`.** The solver decided the
  adopted constructed-IR model. The original function body was not
  extracted. The canonical seal was declined (`EA_UNSUPPORTED: ckVarTy`),
  which is an honest unmeasured result.
- **Not a proof of discovery completeness.** The candidate pool came from two
  blind reports; the absence of further defects is not claimed.
- **Not a claim that the multi-line gate is covered by the primary model.**
  `:554` is an auxiliary counterexample family only.
- **Not a claim that the experiment is independently reproducible from this
  snapshot alone.** Reproduction requires the Axiom toolchain, which is
  private. The subject side is public and pinned, so the decoder behaviour
  can be reproduced independently.
- **Not a rewrite of the frozen record.** The PASS run is a later
  observation; it does not change the fact that the original Phase E run did
  not observe C4.
- **Not a claim that the private origin equals this snapshot.** The hashes
  cover the public bytes only.

## Reproduction, split by what is publicly possible

Subject side (public):

```sh
git clone https://github.com/status-im/nim-toml-serialization
git -C nim-toml-serialization checkout 4aa8e2223649fc0837c490a4acfca7b8b1e756f9
sha256sum nim-toml-serialization/toml_serialization/lexer.nim
# expected: 19d69eed84f74c51fa1784b2e71a4525abc8d2b8aa854c567565d2d603133f4d
```

A one-file probe can then call the public API:

```nim
import toml_serialization
discard Toml.decode("k = \"a\x07b\"", TomlValueRef)  # accepted by :588
```

Axiom side (private): the `bin/ax` run, the overlay injection, the P4
re-validation, and the replay harness are recorded but not redistributable.
`replay/replay_agent.redacted.sh` documents the harness shape.

## Published file list

```
README.md
REDACTIONS.md
SHA256SUMS
AGENT_SPEC.md
FORMAL_EXPERIMENT.md
PIPELINE_GAP_P4_BOOL_BINDING.md
discovery/agentA_raw.md
discovery/agentB_raw.md
contract/toml_d2_agent_binding_contract.md
overlay/toml_d2_agent_spec.json.md
run-records/e_defect.err
run-records/e_defect.exit
run-records/e_defect2.err
run-records/e_defect2.exit
run-records/e_control.err
run-records/e_control.exit
run-records/manifest.json.md
run-records/ax_proof_state.json.md
run-records/ax_proof_state_cold.json.md
run-records/ax_prove_trajectory.redacted.jsonl
fixes/0b9c79d47.md
fixes/52abab1bb.md
fixes/5b6754613.md
fixes/60717df13.md
fixes/c31bc944f.md
orig_pragma/ORIG_PRAGMA_LIMIT.md
orig_pragma/variant_orig.patch
replay/replay_agent.redacted.sh
subject/lexer_gate_excerpt.md
acceptance-2026-10-20/README.md
acceptance-2026-10-20/acceptance.md
acceptance-2026-10-20/defect.err
acceptance-2026-10-20/defect_cold.err
acceptance-2026-10-20/toolchain.md
acceptance-2026-10-20/state_r1_ax_proof_state.json.md
acceptance-2026-10-20/state_r2_ax_proof_state.json.md
acceptance-2026-10-20/state_r1_ax_prove_trajectory.jsonl
acceptance-2026-10-20/state_r2_ax_prove_trajectory.jsonl
acceptance-2026-10-20/vault_r1_manifest.json.md
```
