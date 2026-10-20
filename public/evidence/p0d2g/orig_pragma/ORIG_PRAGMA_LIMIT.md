# P0-D2-G — ORIG_PRAGMA_LIMIT: Observation of the Limits of Directly Attaching a Spec to the Original Function

Experiment: `act2-wp-toml-b1-input-integrity/p0d2g` · Date: 2026-10-17
Binary: `bin/ax` v0.3.7 (copy `/tmp/p0d2g_d_ax`) · Subject: `nim-toml-serialization @ 4aa8e2223649fc0837c490a4acfca7b8b1e756f9`

**Purpose**: attach the adopted agent reasoning spec S2 (`AGENT_SPEC.md` §4) **directly to the header of the original subject function**, execute it, and observe which stage refuses this connection and why. This document is an observation-only record — no fix, no solution. The original source clone (`<SUBJECT_CLONE>`) was not touched, and all variants were performed in the `env_orig/subject` clone.

---

## 1. Target original procedures (gate membership, as measured)

The two gates are in different procedures, and the **signatures are of the same shape** (`toml_serialization/lexer.nim`, pristine sha256 `19d69eed84f74c51fa1784b2e71a4525abc8d2b8aa854c567565d2d603133f4d` — matching the value recorded in spec §5):

| gate | procedure | declaration (original line) |
|---|---|---|
| `:554` (multiline, `{16, 31, 127}`) | `scanMultiLineString` | 468 |
| `:588` (single-line, `{8, 16, 31, 127}`) | `scanSingleLineString` | 565 |

```nim
proc scanMultiLineString[T](lex: var TomlLexer, res: var T, kind: static[StringType]) {.raises: [IOError, TomlError].} =
proc scanSingleLineString[T](lex: var TomlLexer, res: var T, kind: static[StringType]) {.raises: [IOError, TomlError].} =
```

- Generic `[T]` (including a `{.fatal.}` guard restricting it to string or TomlVoid), a `static` parameter, no return value (`proc`), side effects `raises: [IOError, TomlError]`.
- **Signature binding mismatch (a potential bottleneck)**: the `c` and `result` of the S2 pragma correspond to no name in this signature. The actual character is the loop-local variable `next` (char), and the result is whether an exception was raised. This mismatch was left in place as part of the observation design (§4).

## 2. Variant patch (variant_orig.patch, 1531 bytes)

- `git clone` the original clone → `env_orig/subject`, checkout the pinned revision, verify with `rev-parse` (`4aa8e2223649fc0837c490a4acfca7b8b1e756f9`).
- The only change: insertion of the spec pragma in front of the existing pragma block of the two procedure headers (2 lines per file, no other changes):

```diff
-proc scanSingleLineString[T](lex: var TomlLexer, res: var T, kind: static[StringType]) {.raises: [IOError, TomlError].} =
+proc scanSingleLineString[T](lex: var TomlLexer, res: var T, kind: static[StringType]) {.axiom: [pre: (c >= 1 and c <= 255 and c != 10 and c != 13 and c != 34 and c != 92), post: (result == ((c <= 8) or (c >= 10 and c <= 31) or (c == 127)))], raises: [IOError, TomlError].} =
```

(`scanMultiLineString` of the same shape. Since the replay stage was never reached, compile fitness was not a verification target — following the pipeline design in which the materializer reads the pragma from the raw AST.)

## 3. Execution observations (verbatim)

### 3.1 This run — original target with the pragma attached `scanSingleLineString`

`AXIOM_STATE_DIR=state_orig AXIOM_PROVE_VAULT_DIR=vault_orig ax prove --project env_orig/subject --target 'toml_serialization/lexer.nim::scanSingleLineString'` → **exit 2** (0.7 seconds, solver not reached).

The full text of `runs/orig_pragma.err` (including the line mentioning the target procedure — there are **no** `unsupported decl kind`/`lossy`/`binding` lines; they were not reached):

```
[INFO] axiom_engine: analyzing topology...
[INFO] topology_cli: topology: 31 files, 31 changed, sourceRoot=.../p0d2g/env_orig/subject
[INFO] axiom_engine: topology: 31 files, 344 candidates
[INFO] frontier_selection: --target=toml_serialization/lexer.nim::scanSingleLineString not found in frontier — canonical target: NotFound (fail-closed, empty selection)
[ERROR] action_interpreter_cli: [ERROR] --target toml_serialization/lexer.nim::scanSingleLineString resolved to no frontier nodes (NotFound or Ambiguous). Canonical targets require exactly one match; 0 matches = NotFound, >1 = Ambiguous. Refuse to run an implicit full-frontier verification on a canonical target.
```

(`runs/orig_pragma.out` is an empty file.)

**Deterministic precise observation** — the target does exist in the index. The record left by this run in `state_orig/.axiom/cache/topology_merkle.json`:

```json
{"modulePath": "toml_serialization/lexer.nim", "functionName": "scanSingleLineString",
 "nodeType": "proc", "nodeIdStr": "toml_serialization/lexer.nim::scanSingleLineString",
 "declarationLine": 565, "exported": false, "hasAxiomImpl": false,
 "rawCallTargets": ["post:", "or", "isnot", "stringDelimiter", "UTF8Validator",
  "raiseTomlErr", "ord", "raiseInvalidChar", "valid", "clear", "scanEscapeChar", "push", "add"]}
```

(`scanMultiLineString` is the same — declarationLine 468, `hasAxiomImpl: false`, with `"post:"` included in rawCallTargets.)

What this tells us:
1. **The pragma was read at least as far as the raw AST** — the fact that the `post:` token of the payload leaked into `rawCallTargets` is evidence that the CST parsed the pragma expression and that the meaning the pipeline assigned to it is at the level of a "call candidate". The pragma was not converted into an obligation.
2. **`hasAxiomImpl: false`** — the implementation flag is set only from a **different pragma name**, `axiomImpl` (`src/core/topology/topology_engine.nim:309`, `hasPragmaNamedP(fnNode, "axiomImpl")`). The IR transition entry point likewise presupposes a `{.axiom, axiomImpl.}` pair (`src/core/trusted/ast_to_ir.nim:1502`). In other words, the pipeline's AST marker vocabulary and the spec pragma vocabulary (`axiom: [pre/post]`) have separated roles.

### 3.2 Control run — leaf original without a pragma `stringDelimiter` (same file)

`--target 'toml_serialization/lexer.nim::stringDelimiter'` → **exit 2**. The decisive line of `runs/orig_pragma_ctrldelim.err`:

```
[INFO] axiom_engine: external candidate excluded: stringDelimiter eligibility=elNoObligation rejection=ogr.no-applicable obligations=0 nonTrivial=0 source=toml_serialization/lexer.nim
[ERROR] action_interpreter_cli: [ERROR] --target toml_serialization/lexer.nim::stringDelimiter resolved to no frontier nodes (NotFound or Ambiguous). ...
```

An original function with 0 dependencies **does enter the pre-eligibility frontier**, but since it has no obligation (`ogr.no-applicable`, obligations=0) it is dropped at the qualification gate.

### 3.3 if-gap re-verification probe (`/tmp/d2if_probe`, single-file subject)

`probe.nim` = `func p*(c: int): int {.axiom: [pre: (c >= 0), post: (result == (if c < 1: 0 else: 1))].} = 0`, `--target 'probe.nim::p'` → **exit 2**. The decisive line of `runs/if_probe.err`:

```
[INFO] axiom_engine: external candidate unsupported decl kind: p in probe.nim reason=axiom spec expression has no IR translation (translator marked loss); the explicit spec cannot be ingested for this symbol
[ERROR] action_interpreter_cli: [ERROR] --target probe.nim::p resolved to no frontier nodes (NotFound or Ambiguous). ...
```

**Verdict: an if-expression spec is still rejected as lossy in v0.3.7 as well.** Cause confirmed in the code: the spec ingestion path `ingestExplicitSpec`, when it sees lossy, fails closed with `moUnsupportedDeclKind` + the reason above (`src/infrastructure/external_ir_materializer.nim:449-453`). The Canon frontend if-loss recorded in p0d2f (the absence of nkElifExpr/nkElseExpr in `toCanonKind`) **remains valid for the current binary as well**.

### 3.4 Positive control — same rig, spec without an if

`/tmp/d2if_probe_ctl`: the same configuration with only `post: (result == (c - c))` substituted → **exit 0**. `runs/if_probe_ctl.err`:

```
[INFO] axiom_engine: --target filter: 1 node(s) match 'probe.nim::p'
[INFO] ir_pipeline_runner: [classify] p → vtSmtNative (simple bitvec/bool operations)
[INFO] ir_pipeline_runner: type-level candidate 'p' but no LSP — routed to standard SMT pipeline
[WARN] loop_driver: [LEAN ERROR] p: canonicalLeanKernelCheck: exit code 1: ... (Lean variable unused warning)
[INFO] loop_driver:   [1/1] probe.nim::p — orchestrationNotVerifiable
```

If only the if is removed, the spec of the same rig advances through materializer→classification→SMT→Lean kernel check (the final status is `certZ3Candidate`/`orchestrationNotVerifiable` — the promotion condition is not met, but that is the result of the solver stage, not a qualification rejection). In other words, the rejection in 3.3 is not a rig problem but one about the if-expression itself.

## 4. Classification — what blocks the direct connection to the original

The blocking indicated by the observed evidence is **not one stage but three serial gates**. This run was blocked at the first gate and the control at the second, and the content of the third gate was established by reading the code + the 3.3 probe.

| # | gate | location | verdict handed down to the original function | evidence |
|---|---|---|---|---|
| 1 | **Frontier inclusion (dependency closure)** | `src/core/topology/verified_frontier.nim:40` `computeVerifiedFrontier` — all `dependencyIds` must be in the verified set for inclusion | `scanSingleLineString`/`scanMultiLineString` have dependencies such as `stringDelimiter`·`UTF8Validator`·`raiseTomlErr`·`scanEscapeChar`·`raiseInvalidChar`, and in an empty vault those dependencies can never become "verified" → **not included in the frontier → NotFound rejection** | 3.1 (`not found in frontier`), the rawCallTargets in the merkle cache |
| 2 | **Qualification gate (existence of obligations)** | `src/cli/axiom_engine.nim:2842` `isEligible` → `classifyExternalCandidate`(:2149) → census classification | a dependency-free leaf original is included, but is dropped with 0 obligations (`ogr.no-applicable`). The only sources of obligations are (a) the Axiom kernel registry and (b) the subject declared by the overlay (`overlayDeclaresSubject` etc.) — **the spec pragma in a subject function header is not a source of obligations** | 3.2 (`ogr.no-applicable obligations=0`) |
| 3 | **Spec ingestion (lossless translation)** | `src/infrastructure/external_ir_materializer.nim:449` — translates pre/post from Canon→IR, and fails closed if lossy | (if reached) the binding mismatch of `c`/`result` absent from the signature and the if-expression loss are caught here. The if-loss was re-confirmed (3.3). As a note, the comparison chain in `pre` is of a form without if, so 3.3's `pre: (c >= 0)` was not lossy — the loss verdict came from the if in post | 3.3/3.4, the materializer source |

There is yet another vocabulary mismatch upstream of gate 2: the pragma name by which the pipeline sets the "is an implementation" flag from the subject AST is `axiomImpl` (`topology_engine.nim:309`), and the payload of the spec pragma (`axiom: [pre/post]`) is observed only as a call-candidate token (`"post:"`), not as an obligation (3.1). **Merely attaching the spec pragma to the original header does not register it as an 'obligation' at any gate.**

As for the signature binding mismatch (the absence of `c`/`result`): it is clearly a real potential bottleneck (the spec variables are not in the original signature, the actual check target is the loop-local variable `next: char`, and the verdict result is the occurrence of an exception), but **it was not even reached in this observation** — gate 1 blocked it first. In other words, "direct attachment" is structurally blocked before the binding problem can be diagnosed.

## 5. Implication — the reason the bespoke overlay path exists

The path adopted by p0d2f — **adding a new kernel module at the root of the subject tree** (`d2kernels.nim`, "this file is the ONLY delta from the baseline tree"), attaching the spec pragma to its `func`, adding a compile-time `template axiom*(val: untyped = "") {.pragma.}` shim alongside it, and having the overlay declare that symbol as the subject — is not a bypass; this observation establishes that it was the **only configuration that passes each of the three gates above**:

1. The kernel `func` has 0 dependencies (a leaf) → passes gate 1 (as 3.2 shows, leaves are included).
2. Overlay declaration → secures the obligation source for gate 2 (the configuration in `p0d2f/env2/subject_variant/d2kernels.nim` + the overlay branch in `axiom_engine.nim:2854-2880`).
3. A comparison/div spec without an if → passes gate 3 (the p0d2f SPEC.md revision + 3.4 of this document).

Conversely, the path of directly attaching the spec to the original function is blocked at gate 1 (non-leaf) and gate 2 (non-overlay), and even the point of blockage is expressed not as a "spec-original binding" diagnosis but as a **fail-closed rejection of the frontier/qualification structure**. This disconnection between the original code and the formal spec is precisely the structural reason the bespoke overlay (extracted kernel) path exists.

## 6. Artifacts·scope

| artifact | path |
|---|---|
| variant clone (pinned) | `p0d2g/env_orig/subject/` (@4aa8e22, 2 lines of lexer.nim modified) |
| patch | `p0d2g/variant_orig.patch` (1531 B) |
| log of this run | `p0d2g/runs/orig_pragma.{out,err,exit}` (exit 2) |
| leaf control log | `p0d2g/runs/orig_pragma_ctrldelim.{out,err,exit}` (exit 2) |
| if-probe log | `p0d2g/runs/if_probe.{out,err,exit}` (exit 2) |
| positive control log | `p0d2g/runs/if_probe_ctl.{out,err,exit}` (exit 0) |
| state/vault | `p0d2g/state_orig/`, `p0d2g/vault_orig/`, `p0d2g/state_probe/`, `p0d2g/vault_probe/` |

Scope compliance: the original clone is unmodified, `src/`·p0d2f·`AGENT_SPEC.md`·discovery are unmodified, `make build` was not run, no commits. The replay (solver/counterexample) stage was not reached — because gate 1 refused the execution upstream of it, and this by itself is the observation result of this slice.
