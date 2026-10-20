# Subject excerpt — `toml_serialization/lexer.nim`

Public source: <https://github.com/status-im/nim-toml-serialization>

- Repository: `status-im/nim-toml-serialization`
- Commit: `4aa8e2223649fc0837c490a4acfca7b8b1e756f9`
- File: `toml_serialization/lexer.nim`
- SHA-256: `19d69eed84f74c51fa1784b2e71a4525abc8d2b8aa854c567565d2d603133f4d`
- Verified read-only: `git status --porcelain` empty before and after the experiment.

The excerpts below are verbatim from the pinned commit. Line numbers are
the file's own line numbers.

## The repository's own correct set (comment path)

```nim
  EOF* = '\0'                                                       # :72
  invalidCommentChar = {'\x00'..'\x08', '\x0A'..'\x1F', '\x7F'}    # :75
```

`invalidCommentChar` is used at `:224`:

```nim
        elif next in invalidCommentChar:
```

## Multi-line string gate

```nim
    if ord(next) in {16, 31, 127}:                                  # :554
      raiseInvalidChar(lex, next)
```

## Single-line string gate (the defect carrier's grounding)

```nim
      break                                                          # :583

    if next in {CR, LF, EOF}:                                        # :585
      raiseTomlErr(lex, errUnterminatedString)                       # :586

    if ord(next) in {8, 16, 31, 127}:                                # :588
      raiseInvalidChar(lex, next)                                    # :589
```

## Public API path into the gate

```nim
  of '\"':                                                           # :1805
    advance(lex)
    when T is (string or TomlVoid):
      discard scanString(lex, value, StringType.Basic)
    else:
      value = TomlValueRef(kind: TomlKind.String)
      discard scanString(lex, value.stringVal, StringType.Basic)      # :1811
```

## What the excerpt shows, and what it does not

- It shows the four-member single-line reject set `{8, 16, 31, 127}` and the
  three-member multi-line set `{16, 31, 127}`, next to the repository's own
  full set at `:75`.
- It does not prove that `:588` is the only control-character decision on
  every path. That is a static-reading argument recorded in
  `AGENT_SPEC.md` §5 and `toml_d2_agent_binding_contract.md` §3.
- The Unicode `TomlValueRef` branch reached by `Toml.decode(..., TomlValueRef)`
  is the last branch above; the earlier `when T is (string or TomlVoid)`
  branch is for other instantiations.
