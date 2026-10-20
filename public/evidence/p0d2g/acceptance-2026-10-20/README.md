# Post-fix acceptance run — 2026-10-20

This directory records the first full `replay_agent.sh` run that observed
**C4** on the p0d2g experiment and produced `ACCEPTANCE: PASS`.

The original experiment record (`../FORMAL_EXPERIMENT.md`) is frozen at
2026-10-18 and still says `ACCEPTANCE: INCOMPLETE`; that was the
contemporaneous expectation before the P4 and replay-harness fixes landed.
This run is the later observation, published separately rather than by
rewriting the frozen record.

## Run identity

| Item | Value |
|---|---|
| Axiom HEAD | `7ae9561a9` |
| Axiom version | v0.5.9 |
| `bin/ax` SHA-256 | `79bd8394b7c6bde0a934754dc5238fb54bb78847722fa717e500749bfb4c33f1` |
| Toolchain | Nim 2.2.10 · z3 4.13.3 · Lean 4.33.0 |
| Subject | `status-im/nim-toml-serialization` @ `4aa8e2223649fc0837c490a4acfca7b8b1e756f9` |
| `lexer.nim` SHA-256 | `19d69eed84f74c51fa1784b2e71a4525abc8d2b8aa854c567565d2d603133f4d` |
| Harness | `experiments/act2-wp-toml-b1-input-integrity/p0d2g/replay_agent.sh` |

Command (from the Axiom repository root):

```sh
bash experiments/act2-wp-toml-b1-input-integrity/p0d2g/replay_agent.sh
```

## C1–C5

| Condition | State | Observation |
|---|---|---|
| C1 defect refutation | **OBS** | defect run exit 1; trajectory `scanString` = `clDisproved`; vault manifest `scanString` = `certRed` |
| C2 control proof | **OBS** | same run trajectory `d2CommentGateReject` = `clProved`; manifest = `certZ3Candidate` |
| C3 cold determinism | **OBS** | defect digest = cold digest = recorded digest `3516fcfc…ced6a` |
| C4 replay agreement | **OBS** | `[ce-replay] d2StringGateReject — replay agreed; BUG_FOUND payload assembled (13 records)` in both defect and cold logs |
| C5 evidence completeness | **OBS** | spec, discovery A/B, overlay, contract, harness, both manifest rows, toolchain all present |

Verdict:

```text
ACCEPTANCE: PASS
```

Harness exit code: **0**.

## Digests

```text
defect      3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a
defect_cold 3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a
recorded    3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a
```

The cold-run proof-state files differ in timing fields; the canonical
digest is the determinism claim.

## Two different gates

The defect run still contains:

```text
[ERROR] loop_driver: IR pipeline FAIL: scanString status=psFail ...
[WARN] axiom_engine: canonical run accounting: ... ⇒ GateVerdict=FAIL
```

That is the **proof gate** failing because the claim was disproved — the
expected outcome for C1. `ACCEPTANCE: PASS` is the **experiment acceptance**
(evidence conditions C1–C5), not the proof gate. The two must not be
conflated.

## Files

| File | Content |
|---|---|
| `acceptance.md` | full harness output: C1–C5 table and verdict |
| `defect.err` | defect-leg log (contains the C4 `BUG_FOUND` line) |
| `defect_cold.err` | cold-leg log (same C4 line) |
| `toolchain.md` | recorded z3/nim/ax identity |
| `state_r1_ax_proof_state.json.md` | defect-run proof state (digest) |
| `state_r2_ax_proof_state.json.md` | cold-run proof state (digest) |
| `state_r1_ax_prove_trajectory.jsonl` | defect-run claim outcomes |
| `state_r2_ax_prove_trajectory.jsonl` | cold-run claim outcomes |
| `vault_r1_manifest.json.md` | cert states for both carriers |

Filenames use `.md` / `.jsonl` / `.err` because this blog repository's
`.gitignore` ignores `*.json`, `*.txt`, `logs/`, and `*.log`.

## Redactions

Absolute local paths in `acceptance.md`, `defect.err`, `defect_cold.err`,
and both trajectory files were replaced with `<AXIOM_REPO>/`. Original and
published hashes are recorded in `../REDACTIONS.md`. The proof-state JSON
and vault manifest contain no absolute local paths and are byte-identical
copies.

## What this proves, and what it does not

It proves:

- on this exact HEAD, binary, and toolchain, C1–C5 were observed together;
- the original decoder's replay agreed with the model's prediction and the
  harness assembled the `BUG_FOUND` payload;
- the cold rerun reproduced the same canonical digest.

It does not prove:

- that the solver verified the original `scanString` function body (it
  verified the adopted constructed-IR model);
- that the original frozen record is wrong — it records an earlier state;
- that the private Axiom repository equals this public snapshot;
- that the hashes attest the run happened (they attest public bytes only).
