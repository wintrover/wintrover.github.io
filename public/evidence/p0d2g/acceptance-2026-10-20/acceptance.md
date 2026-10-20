=== 조건 판정표 (p0d2g replay_agent) ===
COND STATE  EVIDENCE
C1   OBS    trajectory: scanString clDisproved (state_r1); manifest: <AXIOM_REPO>/experiments/act2-wp-toml-b1-input-integrity/p0d2g/vault_r1/manifest.json certRed row
C2   OBS    trajectory: d2CommentGateReject clProved (state_r1 — same run); manifest: <AXIOM_REPO>/experiments/act2-wp-toml-b1-input-integrity/p0d2g/vault_r1/manifest.json certZ3Candidate row
C3   OBS    defect 3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a == defect_cold 3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a == recorded 3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a
C4   OBS    BUG_FOUND observed
C5   OBS    spec+discovery+overlay+contract+harness+manifest rows present; toolchain: z3: Z3 version 4.13.3 - 64 bit|nim: Nim Compiler Version 2.2.10 [Linux: amd64]|ax: 79bd8394b7c6bde0|
digests: defect=3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a defect_cold=3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a recorded=3516fcfcb4d891f99caed95d55405e29a8032371b5ba73028dee03e598cced6a
=== 4축 판정 (기록된 기계 관측 — 본 스크립트는 축 점수를 재도출하지 않는다) ===
축        판정    근거
발견     PARTIAL   진짜 후보 7+7(3수렴); 기정담(\xHH 디코드 의미론) 양측 미발견 — 기록값
명세생성 OBSERVED  S2 fail-closed 수용: 의무 7, 캐리어 2/2 eligible
검증정확성 OBSERVED  차동 clDisproved+clProved 동일 런 + 콜드 결정론 MATCH
증거신뢰성 OBSERVED  원본 재생 합치·BUG_FOUND 관측(C4 OBS)
ACCEPTANCE: PASS
