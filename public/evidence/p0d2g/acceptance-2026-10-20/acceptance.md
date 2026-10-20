=== Condition verdict table (p0d2g replay_agent) ===
COND STATE  EVIDENCE
C1   OBS    trajectory: scanString clDisproved (state_r1); manifest: <AXIOM_REPO>/experiments/act2-wp-toml-b1-input-integrity/p0d2g/vault_r1/manifest.json certRed row
C2   OBS    trajectory: d2CommentGateReject clProved (state_r1 — same run); manifest: <AXIOM_REPO>/experiments/act2-wp-toml-b1-input-integrity/p0d2g/vault_r1/manifest.json certZ3Candidate row
C3   OBS    defect 3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a == defect_cold 3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a == recorded 3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a
C4   OBS    BUG_FOUND observed
C5   OBS    spec+discovery+overlay+contract+harness+manifest rows present; toolchain: z3: Z3 version 4.13.3 - 64 bit|nim: Nim Compiler Version 2.2.10 [Linux: amd64]|ax: 79bd8394b7c6bde0|
digests: defect=3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a defect_cold=3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a recorded=3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a
=== 4-axis verdict (recorded machine observation — this script does not re-derive the axis scores) ===
Axis       Verdict   Evidence
Discovery  PARTIAL   genuine candidates 7+7(3 converged); the presupposition (\xHH decode semantics) not found on either side — recorded value
Specification generation OBSERVED  S2 fail-closed acceptance: obligations 7, carriers 2/2 eligible
Verification accuracy OBSERVED  differential clDisproved+clProved in the same run + cold determinism MATCH
Evidence reliability OBSERVED  original replay agreement·BUG_FOUND observed(C4 OBS)
ACCEPTANCE: PASS
