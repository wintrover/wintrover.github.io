---
name: blog-agent-operational-guide
description: 블로그 에이전트의 행동 헌법(Fact·Invariant·Authority·Acceptance). 절차·도구·체크리스트의 SSOT는 docs/agents/에 있다.
---

# AGENTS.md — 에이전트 행동 헌법

> **이 파일이 정의하는 것**: AGENTS.md는 **무엇이 참인가 · 무엇이 허용되는가 · 누가 권한을 가지는가 · 무엇이 완료인가**를 규정한 헌법이다. "어떻게 실행하는가"를 가르치는 문서가 아니다.
> **잔류 기준**: 이 파일에 남는 문장은 **Fact · Invariant · Authority · Acceptance/Failure**뿐이다. Procedure · Tool · Checklist · Rationale · Example은 이 파일에 존재하지 않으며, 그 전문은 `docs/agents/`가 담는다.
> **단방향 구조**: AGENTS.md가 정의하고 `docs/agents/`가 이를 참조한다 — 역방향 참조는 허용되지 않는다.
> **측정·역사·생성 데이터**: 정본 계산이 존재할 때 이 문서는 그 값을 중복하지 않으며, 위치는 §4 SSOT 표를 따른다.

블로그 오너의 공식 정체성은 **사고 궤적 아키텍트 (Thought Trajectory Architect)**이며, 핵심 역량은 단순 구현이 아니라 **복잡한 문제를 해결하기 위한 논리적 궤적을 설계하고 이를 AI와 협업해 물리적 코드로 이식하는 것**이다.

---

## §0. 헌법 (CONSTITUTION)

### §0.1 정체성

- 이 프로젝트는 커밋 히스토리와 대화 로그에서 개발자의 사고방식을 추출해 블로그 포스팅으로 전환하는 Devlog 프로젝트다.
- 결과물은 단순 작업 기록이 아니라 **문제 정의 · 의사결정 · 시행착오 · 개선 근거**를 재구성한 학습 가능한 개발 기록이어야 한다.
- 아키텍트의 사고 궤적은 BDD와 TDD를 통한 논리적 증명으로만 보존된다. **증거 없는 관점은 완료가 아니다.**

### §0.2 언어 정책

- 최종 산출물과 사용자 응대는 **한국어**를 표준으로 한다.
- 공개 포스트는 **영어(English)와 한국어(Korean) 두 언어**로 작성하며, 파일명과 slug는 두 버전이 일치한다.
- 기본 URL은 영어가 루트(`/`), 한국어가 `/ko/`를 쓴다. `/en/` 경로는 아키텍처에서 제거되어 있다.
- 커밋 메시지는 **영어**로 작성한다.

### §0.3 증거 문화 불변식

- 모든 기능·코드 변경은 **증거 삼중항** — `CONTEXT.md` 반영 + `tests/features/*.feature` 시나리오 + `tests/**/*.test.ts` 실패→통과 테스트 — 으로 논리적 증명을 완료하기 전까지 완료로 간주하지 않는다.
- 절차가 누락되거나 순서가 뒤바뀌면 에이전트는 즉시 작업을 중단하고 절차를 복구한다. 절차의 상세는 `docs/agents/task-process.md`에 있다.
- "버그가 없다"는 단정은 금지된다. 검증 단계에서 프레임워크 특성 기반 부작용 가설을 최소 3가지(애니메이션 소실 · 상태 유지/오염 · 메모리 누수 관점 포함) 수립·검증해야 한다.
- 완료의 정의는 **기계 검증**이다. 명령 → 관측 → pass/fail 없이 완료를 주장할 수 없다.
- 데이터 변경만으로 모션 정상으로 간주하지 않는다. UI 모션 회귀 방지의 완료 기준은 **DOM 교체 증명(`not.toBe`)까지** 포함한다.

### §0.4 발행 계약 (Facts)

- 콘텐츠 원천은 `main`이며, 사이트 배포는 `pages-deploy.yml`이 `main`에서 수행한다.
- 외부 발행은 `Draft One`(`repository_dispatch: draft-one`)만 사용한다.
- 신규 DEV.to 결과물은 **초안(`published:false`)만** 허용한다. 공개 전환은 이 저장소의 자동화 범위가 아니며, 이미 공개된 글을 초안으로 되돌릴 때는 `Unpublish One`을 사용한다.
- 발행 완료 판정은 DEV.to `GET /api/articles/me/all`에서 동일 `id`와 `published:false`를 관측하는 것이다. 로컬 로그·마커의 success는 증거가 아니다.
- `DEVTO_API_KEY`의 목표 권위는 `sns-publish` 환경 secret이다. 오너 이전 전까지는 저장소 secret이 임시로 사용된다.
- 결과 불명(`unknown`)은 성공으로 기록하지 않으며 자동 재POST하지 않는다.
- `state.json`, `DB`/`deploy` 브랜치, Nim `devlog`, `.deploy/` 마커는 **역사 기록**이며 현재 발행 권위가 아니다.
- LinkedIn 자동 발행은 비활성이다. 재활성화는 별도 제품 결정과 독립 acceptance를 요구한다.
- 정본 규칙의 상세는 `CONTEXT.md`에 있다.

---

## §1. 권한 (AUTHORITY)

### §1.1 병합 권위

- 병합 권위는 **GitHub ruleset + `validate` 필수 검사 + 오너 PR 승인**이다. 검증을 우회하는 직접 push는 금지된다.
- **모든 PR은 필수 `validate` 검사를 통과하고 1건의 승인 리뷰를 충족해야 병합할 수 있다. 이 저장소의 유일 협업자는 오너이며 PR 작성자는 자기 PR을 승인할 수 없으므로(플랫폼 규칙), `main` 착지는 오너의 명시적 규칙 우회(bypass, 감사 기록됨)로만 이루어진다. 우회 병합은 정상 병합과 동일하게 취급하지 않는다.**
- `CODEOWNERS`가 지정하는 통제 경로(집행 경로 `package.json`·`vite.config.ts`·워크플로 포함)의 변경은 리뷰 요청의 우선 대상이다.
- 필수 검사(`validate`)의 구성과 로컬 집행 체인은 `docs/agents/quality-gates.md`에 있다.

### §1.2 발행 권위

- 발행 실행은 `sns-publish` 환경의 오너 승인을 통과해야 한다. **에이전트는 승인자가 될 수 없다.**
- 재실행은 canonical URL/title로 기존 초안을 찾아 `already_draft`/`draft_found`로 종료한다. 새 POST를 만들지 않는다.

### §1.3 비밀 권위

- 자격 증명은 네이티브 클라이언트로만 취급한다. 코드·로그·문서에 비밀 값을 남기지 않는다.

### §1.4 임시 감독 모드 (App 등록 전)

- 에이전트는 아직 오너의 관리자 토큰으로 동작한다. 따라서 무인으로 ruleset·environment·secret·workflow를 변경하거나 `Draft One`/`Unpublish One`을 실행하지 않는다.
- 모든 병합·발행·승인은 오너가 지켜보는 상태에서만 수행한다.
- App 등록과 토큰 교체가 끝나면 이 조항을 제거한다.

---

## §2. 아키텍처 원칙 (ARCHITECTURE)

- **SSOT 원칙**: 규칙은 한 곳에 산다. 중복 의미 상태를 만들지 않고, 정본이 존재하면 다른 곳은 이를 가리키기만 한다.
- **그래프 모델은 역사다**: `state.json`의 Node/Edge 그래프, Nim CLI(`engine/devlog.nim`), `DB`/`deploy` 브랜치, `.deploy/` 상태·마커는 과거 운영 체계의 기록이다. 삭제하지 않으며 별도 아카이브·퇴역 작업에서 다룬다. 현재 발행 경로는 §0.4의 계약만 따른다.
- **단일 리스트 소스**: 포스트 리스트 마크업·스타일은 단일 컴포넌트를 SSOT로 삼고, 경로별 페이지는 분류·SEO·구성만 담당한다.
- **모션은 DOM 교체로 증명한다**: 라우트 전환 시 진입 모션 소실은 데이터가 아니라 DOM 생명주기 문제이며, `[UI Motion Rule]`의 정본은 `CONTEXT.md` §4다.
- 도메인 규칙(URL 아키텍처 · 빌드/Mermaid 파이프라인 · UI/디자인 · 포스트 작성 표준)의 정본은 `CONTEXT.md`에 있다.

---

## §3. 환경 (ENVIRONMENT)

- 이 저장소는 Svelte 5 · TypeScript · Vite로 구성되고, Node 20 · pnpm 9를 기준으로 고정된다.
- 의존성 설치·관리는 `pnpm`, 로컬 실행·테스트 등 속도가 중요한 작업은 `bun`을 우선한다.
- 툴체인·도구 강제·명령어·로깅·타입 안정성의 상세는 `docs/agents/operations.md`에 있다.

---

## §4. SSOT 위치

| 계층 | 내용 |
|---|---|
| `AGENTS.md` | 에이전트 행동 헌법 (Fact · Invariant · Authority · Acceptance/Failure) |
| `docs/agents/` | 절차 · 도구 · 체크리스트 (`operations.md` · `task-process.md` · `quality-gates.md`) |
| `CONTEXT.md` | 운영 계약 · 도메인 규칙 · 참조 정본 (SSoT 계약·증거 문서) |
| `skills/` | 발견 포인터 (절차 SSOT가 아니며, 위 문서를 가리킨다) |
| `.pre-commit-config.yaml` · `.github/workflows/validate.yml` | 집행 (실행 경로) |
| `state.json` · `DB`/`deploy` 브랜치 · `.deploy/` | 역사 기록 (현재 권위 아님) |

**규칙**: 측정·역사적 결론·생성 데이터를 이 문서에 배치하지 않는다. 정본 계산이 존재할 때 이 문서는 그 현재 값을 중복하지 않는다.
