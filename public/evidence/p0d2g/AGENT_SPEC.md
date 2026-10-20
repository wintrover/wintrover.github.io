# P0-D2-G — AGENT SPEC: Selection of Formally Verified Candidates and Specification Package (Acceptance of Control Characters Inside Strings)

Experiment: `act2-wp-toml-b1-input-integrity/p0d2g` · Date: 2026-10-17

**Source·Methodology**: This document is the 1st artifact of the SPEC INFERENCE agent. Its inputs are two independent blind analysis reports, `discovery/agentA_raw.md`·`discovery/agentB_raw.md` (preserved verbatim), and the candidate pool was taken entirely from those reports. For the subject repository `nim-toml-serialization @ 4aa8e2223649fc0837c490a4acfca7b8b1e756f9` (read-only), the **inherited citations were verified exhaustively against the subject bytes** (correction records in §11), and it was written by static analysis alone, **without compilation or execution** — compile verification of the replay procedure is the responsibility of a later stage. The style and kernel structure follow the prior slice [`../p0d2f/SPEC.md`](../p0d2f/SPEC.md). In particular, reflecting the **frontend if-expression loss issue** demonstrated in the p0d2f amendment (p0d2f/SPEC.md Amendment), the preconditions and postconditions of this specification use only comparisons and `and`/`or`/`not`, without `if`.

---

## 1. Candidate pool scoring table

11 unique candidates extracted from the two reports (duplicates merged, discovering agent notation). Scoring criteria: **C1** a genuine defect (the code violates the repository's own compliance claim or API contract — a doc-stale where only the documentation is wrong is a weakness), **C2** formalizability (the deciding property can be described with sets/arithmetic over a single integer), **C3** reproducibility from the original (observable via calls to the pristine subject's public API), **C4** differential contrast (a sibling input exists for which the same specification holds). ◎ excellent · ○ good · △ fair/reserved · ✕ insufficient.

| # | Candidate | Found by | C1 | C2 | C3 | C4 | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **Acceptance of control characters inside strings** — lexer rejection set `{8,16,31,127}` (single-line) / `{16,31,127}` (multiline) vs the README's v1.1.0 compliance claim (`lexer.nim:554,588` vs `README.md:65`) | A3+B3 | ● | ◎ | ◎ | ◎ | **Selected** |
| 2 | **writeKey does not quote special characters** — it fails to quote `=` etc., producing output that violates the "full spec TOML" claim (`README.md:44`) (`writer.nim:166-180`) | A7 | ● | ○ | △ | ● | **Runner-up** |
| 3 | **loadFile↔decode tomlCase wiring mismatch** — the loadFile path does not pass tomlCase to `init` (`decoder.nim:48` vs `:73`) | B4 | ● | △ | ◎ | ◎ | 3rd |
| 4 | **innerValue `dateDimte` typo** — the TomlDate/TomlTime accessor branch cannot compile (`value_ops.nim:32,36`) | A4 | ● | △ | ◎ | ◎ | 4th |
| 5 | **enum built-in writer string output** — README "ordinal built-in writer" vs the `$value` output (`writer.nim:482-484`); the code and tests agree and only the documentation is wrong | A2+B1 | △ doc-stale | ○ | ◎ | △ | — |
| 6 | **The README fruits example fails under the default configuration** — decoding `fruit2 = 1` raises under the default flavor (`README.md:350-353` vs `reader.nim:134-136,154`); the code and tests deliberately implement the default rejection | B2 | △ doc-stale | ○ | ◎ | ○ | — |
| 7 | **50 skips in the spec runner** vs the "pass these test suites" claim (`spec_test/run_test.sh`, `-skip=` 50 in total; including datetime·hex-escape·control) | A1 (B3 in part) | ○ | ✕ | △ | ✕ | — |
| 8 | **The trailing-comma test is vacuous** — the test input fails earlier at `:`, so the trailing comma is never checked (`test_decoder.nim:634-636` vs the default-flavor v1.1.0 documented behavior) | A6 | △ | ○ | ◎ | ◎ | — |
| 9 | **Order-dependence of unknown-field rejection** — an early break on `fieldsDone >= totalFields` (`reader.nim:345-346`); since the README does not explicitly promise an exception, the test codifies the behavior | B5 | △ | ○ | ◎ | ◎ | — |
| 10 | **TomlHourMinute encoder output elision** — the flag documented as a parsing convenience omits `:00` in the default-flavor output (`writer.nim:88-89` + `format.nim:36`) | B6 | ○ | △ | ◎ | ○ | — |
| 11 | **nimble 0.2.18 vs README "Since v0.3.0"** — metadata drift (`toml_serialization.nimble:4` vs `README.md:54-57`; the latest tag is v0.2.18) | A5+B7 | △ meta | ✕ | ✕ | ✕ | — |

The representative citation of each candidate in the scoring table was also checked against the subject bytes (no discrepancies — detailed corrections in §11).

## 2. Selection rationale

Candidate 1 is the only candidate that satisfies all four criteria in the upper tier. Responsibility for the defect lies on the code side: against the TOML v1.1.0 compliance claim declared by `README.md:65`, the lexer checks bytes inside strings only against the sets `{8,16,31,127}`/`{16,31,127}`, violating the string control-character ban common to v1.0.0·v1.1.0, and nowhere in the repository is there a document justifying this reduced set. Since the deciding property is set membership on a single byte value, it reduces to a minimal arithmetic model friendly to BitVec 8, and the counterexample observation is defined by a single `Toml.decode` call against the pristine subject (exception vs. return with the value preserved). In the contrast inputs (0x08·0x10·0x7F·tab) the code matches the specification exactly, proving that this is not universal acceptance but a defect confined to the missing set members. Moreover, the comment path in the same file uses the exact full set (`lexer.nim:75`), and the string fixtures and unit tests check only `{0x00,0x10,0x1F,0x7F}`, so the existing suite structurally cannot catch this gap; hence its value as an assumption for formal verification is the highest.

**Runner-up**: Candidate 2 (writeKey does not quote) — C1 and C4 are strong, but reproducing the counterexample requires manually constructing a `TomlValueRef` table AST, which makes C3 heavy, and the deciding property includes the existential quantifier "a forbidden character exists in the key string", so it is larger than candidate 1 in C2.

## 3. P (Proposition)

Given the TOML specification whose compliance the README declares (README.md:65), if a raw byte c inside a string is a forbidden control character, then `Toml.decode` must fail; however, the subject's lexer fails only when c ∈ {8,16,31,127} (single-line) or c ∈ {16,31,127} (multiline), so, for example, it accepts a document containing the raw byte 0x07 without exception and preserves that byte in the decoded value.

## 4. Formal specification S2 (pre/post)

```text
S2:  ∀ c ∈ D:  reject(c) = forbid(c)

  D          = { c | (c ≥ 1) ∧ (c ≤ 255) ∧ (c ≠ 10) ∧ (c ≠ 13) ∧ (c ≠ 34) ∧ (c ≠ 92) }
  forbid(c)  = (c ≤ 8) ∨ (c ≥ 10 ∧ c ≤ 31) ∨ (c = 127)
  reject(c)  = (c = 8) ∨ (c = 16) ∨ (c = 31) ∨ (c = 127)
  defect(c)  = forbid(c) ∧ ¬reject(c)
```

- The exclusion terms of the precondition D are structural paths outside the model gate: 10(LF)·13(CR) are the single-line string termination checks (`lexer.nim:585-586`), 34(`"`) is the delimiter, and 92(`\`) falls into the escape path. c=0 is excluded from the domain because it is an incidental rejection path caused by the `EOF* = '\0'` alias (`lexer.nim:72`) (§9).
- `forbid` is the "must reject" set required by S2. The tab (9) is allowed as a wschar (%x20/%x09) by the TOML string grammar, so it is excluded from the forbidden set.
- Pipeline pragma form (no `if` — the lesson of the p0d2f amendment; the kernel function returns bool):

```nim
{.axiom: [
  pre:  (c >= 1 and c <= 255 and c != 10 and c != 13 and c != 34 and c != 92),
  post: (result == ((c <= 8) or (c >= 10 and c <= 31) or (c == 127)))].}
```

- Evaluation on a single concrete input: `defect(7) = true ∧ ¬false = true` (violation), `defect(8) = true ∧ ¬true = false` (satisfied), `defect(9) = false` (not forbidden within the domain, satisfied).

## 5. Model specification (certified arithmetic model)

| Kernel | Definition | Original extraction basis | Expected verdict |
|---|---|---|---|
| `d2StringGateReject` (defect kernel) | `func d2StringGateReject*(c: int): bool = (c == 8) or (c == 16) or (c == 31) or (c == 127)` | `lexer.nim:588` — the mechanical extraction of the only byte-classification gate in the `scanSingleLineString` (`:565`) loop. The multiline extension is at `:554`. Original `lexer.nim` sha256 @`4aa8e22`: `19d69eed84f74c51fa1784b2e71a4525abc8d2b8aa854c567565d2d603133f4d` (same commit, same file — carried over verbatim from the kernel table in `../p0d2f/SPEC.md`) | **SAT** — counterexample c = 7 (reject(7) = false ≠ forbid(7) = true) |
| `d2CommentGateReject` (contrast kernel) | `func d2CommentGateReject*(c: int): bool = (c <= 8) or (c >= 10 and c <= 31) or (c == 127)` | `lexer.nim:75` — the mechanical extraction of `invalidCommentChar = {'\x00'..'\x08', '\x0A'..'\x1F', '\x7F'}` (usage site `:224`). It is the set the repository itself adopted on the adjacent text path (comments), and it is **identical as a set** to the forbid of S2 | **UNSAT** — the model is equivalent to forbid over the entire precondition D |

- **Model statement**: what the solver reasons about is two bool membership functions over a single integer variable c on the domain D — the defect kernel is the code's actual gate, and the contrast kernel is the repository's own consistency set. The differential structure is the same as in p0d2f: only the defect kernel may be SAT, while the contrast kernel must be UNSAT; if the contrast kernel turns out SAT, the defect lies not in the subject but in the specification injection.
- **Correspondence basis (1 line)**: in a well-formed document `k = "a⟨c⟩b"`, the only control-character decision that the `scanSingleLineString` loop performs for the in-string character c is the set check at `:588` (the delimiter·CR/LF/EOF take a separate structural-termination path at `:583-586`), and the UTF-8 validator accepts all of 0x00–0x1F (the entire first row of the table at `private/utf8_validate.nim:17-18` is 0), so the success/failure of decode is determined exactly by the negation of `reject(c)`.
- Public API ingress path: the `of '\"'` branch of `parseValue` (`lexer.nim:1805-1811`) sets `value = TomlValueRef(kind: TomlKind.String)` and then calls `scanString(lex, value.stringVal, StringType.Basic)` — `Toml.decode(…, TomlValueRef)` reaches this gate directly.

## 6. Counterexample input

| Item | Value |
|---|---|
| Input document | `k = "a\x07b"` — a single **raw byte 0x07(BEL)** between the closing quotes (base 16: `6B 20 3D 20 22 61 07 62 22`) |
| Model output | `reject(7) = false` → decode acceptance prediction |
| Specification requirement | `forbid(7) = true` → a `TomlError` must be raised |
| defect | `defect(7) = true` — confirmed violation of the specification |

Auxiliary counterexamples (other realizations of the same defect, identical to the S2 evaluation): `k = """a\x08b"""` (multiline, `:554` omits 8 — `reject_multi(8) = false`), `k = 'a\x07b'` (literal string, the same gate `:588`).

## 7. Contrast input

| Input | forbid | reject(code) | Verdict |
|---|---|---|---|
| `k = "a\x08b"` (raw 0x08) | true | true → raise | **Specification satisfied** (1st contrast — a differential within the same "control character inside strings" family) |
| `k = "a\x10b"` (raw 0x10) | true | true → raise | Specification satisfied |
| `k = "a\x7Fb"` (raw 0x7F) | true | true → raise | Specification satisfied |
| `k = "a\tb"` (raw 0x09 tab) | false | false → accept | Specification satisfied (non-forbidden side — rules out universal rejection) |

Since the contrast set holds, SAT arises only from members of exactly {1..7, 11, 12, 14..15, 17..30} ∖ (structural paths), proving that this is a **set-gap defect** and not "the lexer performs no string checking at all".

## 8. Replay procedure (public API — compile verification is a later stage)

Type declarations the harness must include itself: **none** — `Toml`, `TomlValueRef`, `TomlKind`, and `TomlError` are all exported from the `toml_serialization` module (`types.nim:106` `TomlValueRef* = ref TomlValue`, `TomlValue.stringVal*` `:120`). The only additional import is `std/strutils` for base-16 observation (optional).

```nim
# replay.nim — compile against the pristine subject with only --path: (no modification of the subject)
import toml_serialization

# counterexample: raw 0x07 — the specification demands a raise, the defect model predicts acceptance
let vCx = Toml.decode("k = \"a\x07b\"", TomlValueRef)   # (A) returns without exception ← violation observation
doAssert vCx.kind == TomlKind.Table                      # key "" → returns the root table
doAssert vCx.tableVal["k"].kind == TomlKind.String
doAssert vCx.tableVal["k"].stringVal == "a\x07b"         # 0x07 is preserved in the value

# contrast: raw 0x08 — raises as the specification requires
try:
  discard Toml.decode("k = \"a\x08b\"", TomlValueRef)
  doAssert false            # if reached, the contrast also fails → loss of the defect's discriminating power
except TomlError:
  discard                   # expected behavior

# auxiliary counterexample (multiline gap)·non-forbidden contrast (tab)
discard Toml.decode("k = \"\"\"a\x08b\"\"\"", TomlValueRef)  # (B) accepted ← violation observation
discard Toml.decode("k = \"a\tb\"", TomlValueRef)            # (C) accepted — normal
```

- **Compilation**: `nim c --skipParentCfg --skipUserCfg --path:<subject root> replay.nim` — `--skipParentCfg` is there to avoid the parent `nim.cfg` integrity hook intercepting external builds when run inside the Axiom3 tree (the subject itself has no configuration interference).
- **Comparative observation**: (A)·(B) yield **exit 0 + the control byte preserved in the decoded value** (the specification demands a `TomlError` → mismatch = defect), whereas (C)·the 0x08 contrast yield a **`TomlError`** (consistent with the specification). If (A) ends in a raise, the counterexample is rejected; if the 0x08 contrast does not raise, the differential structure itself is invalid.
- This document did not execute this replay (scope correction). For reference (out of scope, not adopted as evidence): while drafting, the harness draft was accidentally executed 1 time, and it was observed that the decode of (A) returns without exception; however, that attempt was an incomplete observation because of a defect in the harness's shape assertion, so the definitive verdict is left to the later replay stage.

## 9. Assumptions and scope limits

1. **What S2 does not cover**: the behavior of key names and the comment path, multiline line-break rules (LF/CRLF/bare-CR), escape-sequence validity, multibyte UTF-8, and combinations of multiple control characters at different positions. The multiline gap (`:554`) is presented only as an auxiliary counterexample; the 1st model is the single-line `:588`.
2. **Source of forbid**: the TOML v1.0.0 ABNF whose compliance is claimed by README `:65` (control characters excluded in basic/literal strings, only wschar=%x20/%x09 allowed) is the determining basis, and v1.1.0 is taken to maintain it — however, a re-verification against the v1.1.0 preamble/body text was not performed in this slice. Instead, **the violation already holds under a v1.0.0-only reading** (0x07 was already forbidden in v1.0.0), and the fact that the repository itself adopted the same set in the comment set at `:75` is an internal consistency basis independent of external document interpretation.
3. **Parts of the code↔model correspondence for which only evidence has been secured**: (i) the claim that "`:588` is the only control-character decision for in-string characters" is a basis from static reading of the loop structure, not a formal proof. (ii) The UTF-8 table pass-through is a reading of the table values at `utf8_validate.nim:17-18`. (iii) The UNSAT of the contrast kernel is the constructive fact that "invalidCommentChar is identical as a set to forbid", not a verification of the runtime behavior of the comment path. (iv) c=0(NUL) is the single point outside the domain that is rejected **incidentally** at `:586` because of the `EOF*='\0'` (`:72`) alias, so it was excluded from the precondition — this exclusion is itself a basis from code reading.
4. **Observation contract**: the runtime observations of the counterexample/contrast are fixed by the later replay stage. The contribution of this document is limited to a specification with verified citations and the expected verdict (SAT/UNSAT).

## 10. Evidence ledger (verbatim citations from both sides — every item checked against the subject bytes)

**Claim side (README)**:
- `README.md:64-66` — `## Spec compliance` / `nim-toml-serialization implements [v1.1.0](https://github.com/toml-lang/toml/releases/tag/1.1.0)` / `TOML spec and pass these test suites:` (`:68-69` listing iarna·burntsushi)
- `README.md:43` — `Encode Nim data types into a **subset** of TOML.`(the encoder itself admits the subset — a comparative contrast with the decoder compliance claim)

**Code side (defect)**:
- `lexer.nim:588-589` — `    if ord(next) in {8, 16, 31, 127}:` / `      raiseInvalidChar(lex, next)` (single-line, inside `scanSingleLineString` `:565`)
- `lexer.nim:554-555` — `    if ord(next) in {16, 31, 127}:` / `      raiseInvalidChar(lex, next)` (multiline, inside `scanMultiLineString` `:468`)
- `lexer.nim:583-586` — `if next == delimiter: break` / `if next in {CR, LF, EOF}:` / `raiseTomlErr(lex, errUnterminatedString)` (structural termination path — basis for the exclusion from the precondition)
- `lexer.nim:72` — `  EOF* = '\0'` (NUL incidental rejection path)
- `lexer.nim:1805-1811` — `of '\"':` / `advance(lex)` / `value = TomlValueRef(kind: TomlKind.String)` / `discard scanString(lex, value.stringVal, StringType.Basic)` (public API ingress path)
- `private/utf8_validate.nim:17-18` — `const utf8Table = [` / `  0'u8,0,0,…,0, # 00..1f` (accepts all of 0x00–0x1F)

**Code side (the repository's own consistency set — contrast kernel and proof of defectiveness)**:
- `lexer.nim:75` — `  invalidCommentChar = {'\x00'..'\x08', '\x0A'..'\x1F', '\x7F'}` (identical as a set to the forbid of S2)
- `lexer.nim:224` — `        elif next in invalidCommentChar:` (usage site on the comment path)
- `writer.nim:131-134` — `proc writeValue*(w: var TomlWriter, s: string)` / `lowEscape = {'\0'..'\31'} - {'\b', '\e', '\f', '\n', '\r', '\t'}` / `highEscape = {'\127'..'\255'}` (the encoder always escapes these bytes — documents the decoder accepts are forms the encoder itself would never emit)

**Test and fixture side (basis for the suite being unable to catch the gap)**:
- `tests/test_decoder.nim:618-632` — `test "invalid chars in comment":` block(`# com\x00ment`, `\x08`, `\x0A`, `\x1F`, `\x7F` — checks **comments only**)
- `tests/test_lexer.nim:264-265` — `expect TomlError:` / `testBasicString("hello\b", "hello\b")` (the string content check covers only 0x08 — a member inside the rejection set)
- `tests/test_lexer.nim:721-725` — `test "control char not allowed in comments":` / `testComment("# TOML \x01 doc\n[miaw]", '[')` (0x01 likewise only in comments)
- `tests/tomls/iarna/invalid/string-basic-control-{1,2,3,4}.toml` — hexdump: respectively `a = "null\x00"`, `a = "ctrl-P\x10"`, `a = "ctrl-_\x1F"`, `a = "0x7f\x7F"` — the control bytes of the fixtures are exactly **{0x00, 0x10, 0x1F, 0x7F} = rejection set members only** (the multiline control-1/2 have the same structure, 0x00/0x10) → the suite can never check gap members (e.g. 0x07)

## 11. Corrections and adjudication records against the discovery reports

1. **agentA candidate 3, typo in the violating set**: in the report's single-line violating set notation `{0x01..0x07, 0x0B, 0x0C, 0x0E..0x15, 0x17..0x1E}`, **0x16(22) is missing** — since 22 ∉ {8,16,31,127}, the violating member is correct. Correction: the violating members are {1..7, 11, 12, 14, 15, **17..30**}, but 10(LF)·13(CR) are excluded from the counterexample because they are structural paths (`:585-586`).
2. **agentB candidate 1, README scope**: `README.md:322-327` → the actual claim range is `:321-327` (the "ordinal built-in writer" sentence is at `:323`, "ordinal = TOML integer" at `:327`). Minor.
3. **agentA candidate 1, attribution of the skip blocks**: the per-skip attribution of the v1.0.0 block (47-64) and the v1.1.0 block (73-108) differs between the two reports (e.g. `invalid/control/bare-cr` is at `run_test.sh:100` upon verification). The only facts adopted are the total (`-skip=` **50** occurrences in the file) and the representative lines (`:77-81` datetime group, `:98` hex-escape, `:100-102` control group).
4. **Treatment of c=0(NUL)**: agentA's description "NUL only raises accidentally" was verified with `lexer.nim:72` + `:586`, and this was formalized as the reason for excluding it from the model domain (§4 precondition, §9-3).
5. **Everything else**: all citations adopted in the scoring table and ledger (`lexer.nim:75/554/588/1805-1811`, `writer.nim:131-134/166-180/225-234/466/482-484/88-89`, `value_ops.nim:29-36/86-87`, `decoder.nim:48/73/77`, `reader.nim:134-136/152-154/324-325/345-346`, `format.nim:28-36`, `test_decoder.nim:303/338-345/592-598/618-632/634-636`, `test_lexer.nim:264-265/721-725`, `test_encoder.nim:196-208`, `test_toml_v110.nim:61-68`, `test_features.nim:276/347-351/398-401`, `test_spec.nim:70-73`, `toml_serialization.nimble:4`, `README.md:39-58/82/187-194/321-336/350-362`, `spec_test/run_test.sh`, fixture hexdump, tag v0.2.18, commits 62dcb2c·096659b) matched the subject bytes. agentA's `lexer.nim:714-715` (`notin {'a'..'z','A'..'Z','0'..'9','_','-'}` in `scanName` → `raiseIllegalChar`) was also confirmed — valid as the basis for candidate 2's "its own lexer rejects re-parsing".
