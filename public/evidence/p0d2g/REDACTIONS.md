# Redaction manifest — p0d2g public snapshot

This file records every difference between the private origin artifact and the
published copy. If a file is not listed here, its published bytes are identical
to the origin file named in its directory.

## 1. `run-records/ax_prove_trajectory.redacted.jsonl`

- Origin: `experiments/act2-wp-toml-b1-input-integrity/p0d2g/evidence/defect/ax_prove_trajectory.jsonl`
- Origin SHA-256: `196ffd2746818b3a8a2735bc0b353d6d488e9e8719344195cdf8c02c85a4cb2d`
- Published SHA-256: `d2df5397d2ca8ddfba88f6e7af31b7aaf9ebecddd124856969aa357395fe5d09`
- Redaction: the absolute local prefix `/home/<user>/.../Axiom3/` was replaced
  with `<AXIOM_REPO>/` in **4** JSON keys on the `skReport` line:

  1. `.../orchestrator_api.nim::normalizeMaxWorkers`
  2. `.../orchestrator_topology_worker.nim::calcDynamicTimeoutCore`
  3. `.../orchestrator_vault.nim::safeSpeedupRatioCore`
  4. `.../topology/topology_dependency.nim::proximityScore`

- Not redacted: claim IDs, outcomes, timestamps, counts, and the
  `canonicalRunDigest` on the `skRunAccounting` line.

## 2. `replay/replay_agent.redacted.sh`

- Origin: `experiments/act2-wp-toml-b1-input-integrity/p0d2g/replay_agent.sh`
- Origin SHA-256: `48df9c3e902b205e9b222f6217e9bd39f19ca9aa3e705649193a91e00af55ee2`
- Published SHA-256: `80b1334c4e2746376731cb834669547826bd006b9bec0e2ed767da1ad1127cbe`
- Redaction: the hard-coded `SOURCE_CLONE` absolute path on line 42 was
  replaced with `<SUBJECT_CLONE>`. One line changed.

## 3. `orig_pragma/ORIG_PRAGMA_LIMIT.md`

- Origin: `experiments/act2-wp-toml-b1-input-integrity/p0d2g/ORIG_PRAGMA_LIMIT.md`
- Origin SHA-256: `8b59752e18318f6383a1d7f016fb4724eb1dfc949bbd8449c5759b5bddf43589`
- Published SHA-256: `200189ac6533d023fcde33d317597346e64d3bbfd6550090afe912b70a369509`
- Redaction: one home-relative subject clone path
  (`~/.../nim-toml-serialization`) was replaced with `<SUBJECT_CLONE>`.
  One line changed.

## 4. Generated files (not copies)

- `fixes/*.md` — exported with `git log -1 --format=...` from the private
  repository. They are not byte copies of a file in the source tree.
- `subject/lexer_gate_excerpt.md` — authored for this snapshot from the
  public subject at the pinned commit. It is an excerpt, not a copy.
- `README.md`, `REDACTIONS.md`, `SHA256SUMS` — authored/generated metadata.

## 5. Byte-identical tier

All other published files are byte-identical to their origin paths:

```
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
orig_pragma/variant_orig.patch
```

The `run-records/` directory and the `.md`/`.err`/`.jsonl`/`.patch` names are
chosen because this blog repository's `.gitignore` ignores `logs/`, `*.log`,
`*.json`, and `*.txt`. The bytes inside the copied files are unchanged.

## 6. Verification

```sh
sha256sum -c --strict SHA256SUMS
```

`SHA256SUMS` excludes itself and includes every other published file,
including this `REDACTIONS.md`. GNU `sha256sum -c` ignores extra unlisted
files, so compare the served file list to the inventory in `README.md` as
well.
