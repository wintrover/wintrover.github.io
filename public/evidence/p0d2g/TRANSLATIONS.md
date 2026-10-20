# Translation ledger — p0d2g public snapshot

The public evidence bundle is English-only. Seven entries below contain
Korean in whole or in part (private records or a Korean harness); their
public copies are English translations.

A translation is **not** a byte-identical copy. The hash below proves which
public bytes are being served; it does not prove fidelity to the private
Korean original. A reader without access to the private repository cannot
independently check the translation.

| Public file | Private origin | Origin SHA-256 | Public SHA-256 |
|---|---|---|---|
| `AGENT_SPEC.md` | `experiments/act2-wp-toml-b1-input-integrity/p0d2g/AGENT_SPEC.md` | `f9c8f2d3ef47fdc5563037df5e37506a9b49be5d08e5421993c927002121a91d` | `506b1fb0e5a4038db33e9509e26b4479e864921341736f4a77b43886118bafe5` |
| `FORMAL_EXPERIMENT.md` | `experiments/act2-wp-toml-b1-input-integrity/p0d2g/FORMAL_EXPERIMENT.md` | `deaeddb7d9e01d757a1c35c70d5b6ec57e45281a07a2c0141a940c0a4987b539` | `9434f290d382ea64322e420412cb5ad4118a5fdc0b49535098cc58a980629044` |
| `orig_pragma/ORIG_PRAGMA_LIMIT.md` | `experiments/act2-wp-toml-b1-input-integrity/p0d2g/ORIG_PRAGMA_LIMIT.md` | `8b59752e18318f6383a1d7f016fb4724eb1dfc949bbd8449c5759b5bddf43589` | `b0c5103b8fba89324522db60f36f9e610c18f49505ecd8ea8255cc9bdf87962d` |
| `replay/replay_agent.redacted.sh` | `experiments/act2-wp-toml-b1-input-integrity/p0d2g/replay_agent.sh` (plus path redaction) | `48df9c3e902b205e9b222f6217e9bd39f19ca9aa3e705649193a91e00af55ee2` | `d0610a478fd9bc45aa071b83e63f36ad70998307cabbed662f38941ae16b3ab4` |
| `fixes/0b9c79d47.md` | `git log -1 0b9c79d47` subject | n/a (export) | `c9b962f9f31c54a72e09b837df8ff05d9679bb6260ed814d8d3df8dae1aa413c` |
| `acceptance-2026-10-20/acceptance.md` | `/tmp/p0d2g-acceptance.log` (harness output) | `b3e9b7b3d7a02e52993397a9412e90a00687807c537a3e8406feb9372d904363` | `d7fa512a27d7037a8a09779af5632e4d5538f6d29b622e2c6e7abf7987243bd9` |
| `contract/toml_d2_agent_binding_contract.md` | `docs/spec/toml_d2_agent_binding_contract.md` (one Korean parenthetical translated) | `90a938bf9a1a8e54ed82da7931f47453e4ef4fab261bc13788e4af55a6c127dc` | `e94698dfbebc98ffc23ea0ea318cda4380c7018094c820eab3c45ef39561be4c` |

`README.md` is generated metadata, not a translation.

Where a file was redacted before translation, the translation source was the
redacted public copy, not the unredacted private original. Pre-translation
public hashes: `ORIG_PRAGMA_LIMIT.md` `200189ac…`, `replay_agent.redacted.sh`
`80b1334c…`, `acceptance.md` `5d0dce96…`, `fixes/0b9c79d47.md`
`fd187598…`. The "Private origin" hashes above are the unredacted originals.

## What was preserved

For every translated file:

- all code blocks, commands, identifiers, paths, line numbers, commit hashes,
  SHA-256 values, dates, numbers, and English quotations;
- Markdown structure: heading sequence, section numbering, table rows, code
  fences, and blank-line layout;
- the semantic content: no claim was added, removed, softened, or
  strengthened.

`AGENT_SPEC.md` preserves 16 headings, 6 code fences, and 29 table rows
before and after translation. `FORMAL_EXPERIMENT.md` preserves its frozen
verdict: `ACCEPTANCE: INCOMPLETE` is still the record's expected outcome;
the later PASS run is a separate file under `acceptance-2026-10-20/`.

## What changed

- Korean prose and Korean code comments were translated.
- In `replay_agent.redacted.sh`, Korean prose inside `echo`/`printf` string
  literals was translated so the zero-Hangul requirement holds. No executable
  logic, path, exit code, or variable name changed; `bash -n` passes.
- Two placeholders that contained Korean inside code spans were translated to
  `<subject root>`, and the harness's Korean comments were translated.

## Verification

```sh
# zero Hangul across the public bundle
grep -RInP '[\x{ac00}-\x{d7a3}]' public/evidence/p0d2g   # expect no output

# public byte integrity
cd public/evidence/p0d2g && sha256sum -c --strict SHA256SUMS
```