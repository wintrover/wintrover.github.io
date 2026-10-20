#!/usr/bin/env bash
# replay_agent.sh — replay harness for the p0d2g agent vertical slice acceptance.
#
# pristine subject materialization → re-runs the defect run + the cold rerun and
# adjudicates conditions C1·C2·C3·C4·C5 to produce an ACCEPTANCE verdict. All artifacts are
# recorded under $EXP/runs_r/ (gitignored — the recorded original runs/ is not overwritten).
#
# Precondition: nim-toml-serialization @ 4aa8e2223649fc0837c490a4acfca7b8b1e756f9
# (pristine — no mutation patch. The adopted spec S2 is synthesized into the carrier by
# the overlay binding `config/spec/toml_d2_agent_spec.json`),
# lexer.nim sha256 == 19d69eed…33f4d. The cwd=$ROOT fixation is
# inherited from replay_harness_config_quirks.md Q1(config.nims), and the clean-tree precondition is
# a requirement of Q2 (the drift gate).
#
# Exit codes: 0=PASS, 1=FAIL(condition not met), 3=INCOMPLETE(preconditions or replay unavailable).
#
# Note: ROOT is resolved by an upward search for the `.axiom_root` anchor (hard-coding the
# step count drifts off the root after relocation).
set -euo pipefail

EXP="$(cd "$(dirname "$0")" && pwd)"

# ── ROOT: upward search for the .axiom_root anchor ──
ROOT=""
_d="$EXP"
for _ in 1 2 3 4 5 6 7 8; do
  if [ -f "$_d/.axiom_root" ]; then ROOT="$_d"; break; fi
  _d="$(dirname "$_d")"
done
if [ -z "$ROOT" ]; then
  echo "[replay_agent] Could not find the Axiom3 root (.axiom_root) above $EXP."
  echo "ACCEPTANCE: INCOMPLETE (repo root not resolvable from script location)"
  exit 3
fi
AX="$ROOT/bin/ax"
if [ ! -x "$AX" ]; then
  echo "[replay_agent] bin/ax is missing. Rebuild from the root: cd \"$ROOT\" && make build"
  echo "ACCEPTANCE: INCOMPLETE (bin/ax missing — run: make build)"
  exit 3
fi

SOURCE_CLONE="<SUBJECT_CLONE>"
PIN="4aa8e2223649fc0837c490a4acfca7b8b1e756f9"
LEXER_SHA="19d69eed84f74c51fa1784b2e71a4525abc8d2b8aa854c567565d2d603133f4d"
# Phase E recorded cold digest (state_e1 == state_e3) — FORMAL_EXPERIMENT.md Result 4.
# Caution: this value is sensitive to the bin/ax build and toolchain at recording time. If run-to-run equality
# holds but disagrees with this constant, that is not nondeterminism but binary build drift (the rebuilt
# bin/ax differs from the recorded binary) — the C3 evidence text states this.
RECORDED_DIGEST="3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a"
DEFECT_TARGET="toml_serialization/lexer.nim::scanString"
DEFECT_FN="scanString"
CONTROL_FN="d2CommentGateReject"

RUNS="$EXP/runs_r"
SUBJECT="$EXP/env_r/subject"

# ── Step 0: fail-closed preconditions ──
pre_fail() { echo "[replay_agent] precondition failed: $1"; echo "ACCEPTANCE: INCOMPLETE ($1)"; exit 3; }

[ -d "$SOURCE_CLONE/.git" ] || pre_fail "source clone missing: $SOURCE_CLONE"
src_head="$(git -C "$SOURCE_CLONE" rev-parse HEAD)"
[ "$src_head" = "$PIN" ] || pre_fail "source clone HEAD $src_head != pin $PIN"
[ -z "$(git -C "$SOURCE_CLONE" status --porcelain)" ] || pre_fail "source clone porcelain not empty"

if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "[replay_agent] The Axiom3 tree is not clean — the replay drift gate will fail (quirks Q2):"
  git -C "$ROOT" status --porcelain
  echo "ACCEPTANCE: INCOMPLETE (tree not clean — replay drift gate will fail)"
  exit 3
fi
command -v z3 >/dev/null 2>&1 || pre_fail "z3 not on PATH"
command -v nim >/dev/null 2>&1 || pre_fail "nim not on PATH"
[ -f "$ROOT/data/verification_scope.lock" ] || pre_fail "scope lock missing: $ROOT/data/verification_scope.lock"

mkdir -p "$RUNS"
{
  echo "z3: $(z3 --version)"
  echo "nim: $(nim --version | head -1)"
  echo "ax: $(sha256sum "$AX" | cut -c1-16)"
} > "$RUNS/toolchain.txt"

# ── Step 1: pristine subject materialization (clone → pin checkout → lexer sha verification) ──
materialize() {
  local got
  rm -rf "$EXP/env_r"
  mkdir -p "$EXP/env_r"
  git clone --quiet "$SOURCE_CLONE" "$SUBJECT"
  git -C "$SUBJECT" checkout -q "$PIN"
  [ "$(git -C "$SUBJECT" rev-parse HEAD)" = "$PIN" ] || pre_fail "materialized subject HEAD != pin $PIN"
  [ -z "$(git -C "$SUBJECT" status --porcelain)" ] || pre_fail "materialized subject porcelain not empty"
  got="$(sha256sum "$SUBJECT/toml_serialization/lexer.nim" | cut -d' ' -f1)"
  [ "$got" = "$LEXER_SHA" ] || pre_fail "lexer.nim sha256 $got != expected $LEXER_SHA"
}
materialize

# ── Step 2: run execution (exit codes are observations — set -e exception region) ──
run_ax() { # <name> <state_dir(abs)> <vault_dir(abs)>
  local name="$1" state="$2" vault="$3"
  mkdir -p "$state/data" "$vault" "$RUNS"
  cp "$ROOT/data/verification_scope.lock" "$state/data/verification_scope.lock"
  set +e
  ( cd "$ROOT" && \
    AXIOM_STATE_DIR="$state" \
    AXIOM_PROVE_VAULT_DIR="$vault" \
    "$AX" prove --project "$SUBJECT" --target "$DEFECT_TARGET" \
  ) > "$RUNS/$name.out" 2> "$RUNS/$name.err"
  echo "$?" > "$RUNS/$name.exit"
  set -e
}
run_ax defect      "$EXP/state_r1" "$EXP/vault_r1"
run_ax defect_cold "$EXP/state_r2" "$EXP/vault_r2"

# ── observation helpers ──
exit_of() { cat "$RUNS/$1.exit"; }
digest_of() { # <state_dir> → canonicalRunDigest (empty string if absent)
  sed -nE 's/.*"canonicalRunDigest": *"([a-f0-9]{64})".*/\1/p' "$EXP/$1/logs/ax_proof_state.json" 2>/dev/null | head -1 || true
}
# trajectory skReport unitEvidenceRefs — "<module>::<fn>":{"claimId":…,"claimOutcome":"…"}
traj_outcome() { # <state_dir> <module::fn> <outcome>
  grep -Eq "\"$2\": *\\{[^}]*\"claimOutcome\": *\"$3\"" "$EXP/$1/logs/ax_prove_trajectory.jsonl" 2>/dev/null
}
manifest_row() { # <manifest> <fn> <status> — verify the status after the functionName row
  grep -A 3 -E "\"functionName\": *\"$2\"" "$1" 2>/dev/null | grep -Eq "\"status\": *\"$3\""
}

D1="$(digest_of state_r1)"; D2="$(digest_of state_r2)"
M1="$EXP/vault_r1/manifest.json"

# ── Step 3: condition adjudication ──

# C1: defect refutation — exit 1 ∧ trajectory scanString clDisproved ∧ manifest certRed row
c1=OBS; c1ev=""
[ "$(exit_of defect)" = "1" ] || { c1=NOT; c1ev="exit=$(exit_of defect) != 1"; }
if [ "$c1" = "OBS" ]; then
  if traj_outcome state_r1 "toml_serialization/lexer.nim::$DEFECT_FN" clDisproved; then
    c1ev="trajectory: $DEFECT_FN clDisproved (state_r1)"
  else
    c1=NOT; c1ev="trajectory: no $DEFECT_FN clDisproved in state_r1"
  fi
fi
if [ "$c1" = "OBS" ]; then
  if manifest_row "$M1" "$DEFECT_FN" certRed; then
    c1ev="$c1ev; manifest: $M1 certRed row"
  else
    c1=NOT; c1ev="manifest: no certRed row for $DEFECT_FN in $M1"
  fi
fi

# C2: control proof — the census-selected control kernel clProved in the same run + certZ3Candidate
c2=OBS; c2ev=""
if traj_outcome state_r1 "toml_serialization/lexer.nim::$CONTROL_FN" clProved; then
  c2ev="trajectory: $CONTROL_FN clProved (state_r1 — same run)"
else
  c2=NOT; c2ev="trajectory: no $CONTROL_FN clProved in state_r1"
fi
if [ "$c2" = "OBS" ]; then
  if manifest_row "$M1" "$CONTROL_FN" certZ3Candidate; then
    c2ev="$c2ev; manifest: $M1 certZ3Candidate row"
  else
    c2=NOT; c2ev="manifest: no certZ3Candidate row for $CONTROL_FN in $M1"
  fi
fi

# C3: cold determinism — digest equality across runs ∧ fixed comparison with the recorded digest
c3=NOT; c3ev=""
if [ -n "$D1" ] && [ "$D1" = "$D2" ]; then
  if [ "$D1" = "$RECORDED_DIGEST" ]; then
    c3=OBS; c3ev="defect $D1 == defect_cold $D2 == recorded $RECORDED_DIGEST"
  else
    c3ev="run-to-run equal ($D1) but != recorded $RECORDED_DIGEST — binary-build sensitivity: rebuilt bin/ax or toolchain drift, not run nondeterminism"
  fi
else
  c3ev="digest mismatch/absent: defect($D1) cold($D2)"
fi

# C4: replay agreement — BUG_FOUND / scanString ce-replay (if the P4-bool gap is open, non-observation is expected)
c4=NOT; c4ev="no BUG_FOUND in runs_r/defect.err nor state_r1 trajectory, no [$DEFECT_FN] ce-replay (P4 bool-binding pipeline gap — see PIPELINE_GAP_P4_BOOL_BINDING.md)"
if grep -q 'BUG_FOUND' "$RUNS/defect.err" 2>/dev/null \
   || grep -q 'BUG_FOUND' "$EXP/state_r1/logs/ax_prove_trajectory.jsonl" 2>/dev/null; then
  c4=OBS; c4ev="BUG_FOUND observed"
elif grep -Eq "\[ce-replay\] *$DEFECT_FN" "$RUNS/defect.err" 2>/dev/null; then
  c4=OBS; c4ev="ce-replay observed for $DEFECT_FN (BUG_FOUND absent)"
fi

# C5: evidence completeness — the adopted·discovery·binding·evidence files + toolchain record
c5=OBS; c5ev=""; miss=""
[ -s "$EXP/AGENT_SPEC.md" ] || miss="$miss AGENT_SPEC.md"
[ -s "$EXP/discovery/agentA_raw.md" ] || miss="$miss discovery/agentA_raw.md"
[ -s "$EXP/discovery/agentB_raw.md" ] || miss="$miss discovery/agentB_raw.md"
[ -s "$ROOT/config/spec/toml_d2_agent_spec.json" ] || miss="$miss overlay(toml_d2_agent_spec.json)"
[ -s "$ROOT/docs/spec/toml_d2_agent_binding_contract.md" ] || miss="$miss contract(toml_d2_agent_binding_contract.md)"
[ -s "$EXP/evidence/defect/e_replay_harness_c0.nim" ] || miss="$miss evidence/defect/e_replay_harness_c0.nim"
manifest_row "$M1" "$DEFECT_FN" certRed || miss="$miss manifest:$DEFECT_FN certRed"
manifest_row "$M1" "$CONTROL_FN" certZ3Candidate || miss="$miss manifest:$CONTROL_FN certZ3Candidate"
grep -q 'z3:' "$RUNS/toolchain.txt" && grep -q 'nim:' "$RUNS/toolchain.txt" && grep -q 'ax:' "$RUNS/toolchain.txt" || miss="$miss toolchain.txt"
if [ -n "$miss" ]; then
  c5=NOT; c5ev="missing:$miss"
else
  c5ev="spec+discovery+overlay+contract+harness+manifest rows present; toolchain: $(tr '\n' '|' < "$RUNS/toolchain.txt")"
fi

# ── verdict ──
echo "=== Condition verdict table (p0d2g replay_agent) ==="
printf '%-4s %-6s %s\n' "COND" "STATE" "EVIDENCE"
printf '%-4s %-6s %s\n' "C1" "$c1" "${c1ev:-defect refutation: exit=1 ∧ trajectory clDisproved ∧ manifest certRed}"
printf '%-4s %-6s %s\n' "C2" "$c2" "${c2ev:-control proof: same-run d2CommentGateReject clProved ∧ certZ3Candidate}"
printf '%-4s %-6s %s\n' "C3" "$c3" "${c3ev:-cold determinism: digest run-to-run ∧ recorded equality}"
printf '%-4s %-6s %s\n' "C4" "$c4" "$c4ev"
printf '%-4s %-6s %s\n' "C5" "$c5" "$c5ev"
echo "digests: defect=$D1 defect_cold=$D2 recorded=$RECORDED_DIGEST"
echo "=== 4-axis verdict (recorded machine observation — this script does not re-derive the axis scores) ==="
printf '%-10s %-9s %s\n' "Axis" "Verdict" "Evidence"
printf '%-10s %-9s %s\n' "Discovery" "PARTIAL" "genuine candidates 7+7(3 converged); the presupposition (\\xHH decode semantics) not found on either side — recorded value"
printf '%-10s %-9s %s\n' "Specification generation" "OBSERVED" "S2 fail-closed acceptance: obligations 7, carriers 2/2 eligible"
printf '%-10s %-9s %s\n' "Verification accuracy" "OBSERVED" "differential clDisproved+clProved in the same run + cold determinism MATCH"
# The evidence reliability axis is derived from the live observation of C4 (2026-10-18 consistency fix: the recorded snapshot row
# diverged from the live state after the P4+harness repair — making it the only row that re-derives an axis score).
# The discovery axis is still a recorded value (the script does not re-run the discovery stage).
ev_axis="$([ "$c4" = "OBS" ] && echo "OBSERVED" || echo "PARTIAL")"
ev_ev="$([ "$c4" = "OBS" ] && echo "original replay agreement·BUG_FOUND observed(C4 OBS)" || echo "replay·BUG_FOUND not observed — root cause: PIPELINE_GAP_P4_BOOL_BINDING.md")"
printf '%-10s %-9s %s\n' "Evidence reliability" "$ev_axis" "$ev_ev"

verdict_fail() { echo "ACCEPTANCE: FAIL (missing: $*)"; exit 1; }

if [ "$c1" = "OBS" ] && [ "$c2" = "OBS" ] && [ "$c3" = "OBS" ] && [ "$c4" = "OBS" ] && [ "$c5" = "OBS" ]; then
  echo "ACCEPTANCE: PASS"
  exit 0
fi
if [ "$c1" = "OBS" ] && [ "$c2" = "OBS" ] && [ "$c3" = "OBS" ] && [ "$c5" = "OBS" ] && [ "$c4" = "NOT" ]; then
  echo "ACCEPTANCE: INCOMPLETE (replay/promotion unavailable — P4 bool-binding pipeline gap, see PIPELINE_GAP_P4_BOOL_BINDING.md)"
  exit 3
fi
missing=""
[ "$c1" != "OBS" ] && missing="$missing C1"
[ "$c2" != "OBS" ] && missing="$missing C2"
[ "$c3" != "OBS" ] && missing="$missing C3"
[ "$c4" != "OBS" ] && missing="$missing C4"
[ "$c5" != "OBS" ] && missing="$missing C5"
verdict_fail "$missing"
