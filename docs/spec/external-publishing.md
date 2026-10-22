# 외부 발행(DEV.to) 파이프라인 계약

> 이 문서는 외부 플랫폼(DEV.to) 초안 발행 파이프라인의 도메인 규칙 정본이다. 헌법은 `AGENTS.md`(§0.4 발행 계약), 절차는 `docs/agents/task-process.md`에, 단계별 실행은 `docs/DEVTO_PUBLISH_RUNBOOK.md`에 있다.

## 본문 변환 (`scripts/post-to-dev.ts`)

- 외부 발행 본문(`body_markdown`)의 사이트 내부 참조는 모두 공개 기본 URL(`BLOG_PUBLIC_BASE_URL`, 기본 `https://wintrover.github.io/`) 기준 절대 URL로 변환되어야 한다. [REQ-EXT-PUB-01]
- 변환 대상은 이미지(`![](...)`, `<img src>`)뿐 아니라 일반 마크다운 링크(`[텍스트](URL)`)를 포함한다. 루트 상대 링크(예: `/evidence/p0d2g/README.md`)가 변환 없이 남으면 DEV.to 도메인에서 깨진 링크가 된다. [REQ-EXT-PUB-02]
- 링크 변환 판별 규칙: 링크 대상이 `/`로 시작하고 `//`로 시작하지 않으면 공개 기본 URL로 해석해 절대화한다. `#` 앵커, `http(s)://` 등 스킴을 가진 절대 URL, `//` 프로토콜 상대 URL, 문서 상대 경로(`./`, `../`)는 변환하지 않고 원문을 유지한다. [REQ-EXT-PUB-03]
- 변환 후 초안 본문에는 루트 상대 링크 대상이 남아 있어서는 안 된다. [REQ-EXT-PUB-04]

## 재실행(초안 재동기화) 계약

- Draft One 재실행이 canonical URL(또는 제목 폴백)으로 기존 초안을 찾으면(adopt), 해당 초안의 본문·제목·태그·설명·canonical을 현재 포스트 원문으로 PUT 갱신한다. 초안은 저장소 포스트가 SSOT이며 DEV.to 초안은 파생 산출물이다. [REQ-EXT-PUB-05]
- 갱신 PUT은 동일 article id를 대상으로 하며 새 POST를 만들지 않고 `published:false`를 유지한다. [REQ-EXT-PUB-06]
- 갱신 PUT이 4xx면 `failed`, 5xx·타임아웃·응답 유실이면 `unknown`으로 종료한다. `unknown`은 성공이 아니며 자동 재POST·자동 재PUT 없이 외부 목록 재조회로만 판정한다(헌법 §0.4 불변). [REQ-EXT-PUB-07]
- 완료 판정의 유일한 증거는 외부 관측(`GET /api/articles/me/all`에서 동일 `id`가 `published:false`)이다. 워크플로 로그의 success는 증거가 아니다. [REQ-EXT-PUB-08]

## 관련

- [AGENTS.md §0.4](../../AGENTS.md) — 발행 계약(초안 전용·단일 실행 경로·외부 관측)
- [docs/agents/task-process.md](../agents/task-process.md) — 외부 플랫폼 발행 절차
- [docs/DEVTO_PUBLISH_RUNBOOK.md](../DEVTO_PUBLISH_RUNBOOK.md) — 단계별 실행 절차
