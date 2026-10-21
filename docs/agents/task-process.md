# Agent Task Process

> AGENTS.md §0.3(증거 문화 불변식)에서 추출한 절차 문서다. **규칙의 원천은 `AGENTS.md`와 `docs/spec/`**이며, 이 문서는 "어떻게 실행하는가"만 담는다.

## 작업 시작 전 전수조사 (MUST)

- **작업 시작 시 반드시 `docs/spec/`, BDD Gherkin(.feature), 테스트 코드를 전수조사한다.** 사용자의 지시를 받으면 구현에 앞서 이 세 가지 요소를 최우선으로 분석하여 현재 상태와 규칙을 완벽히 파악해야 한다.
- **UI 모션 관련 작업은 `docs/spec/ui-design.md`의 `[UI Motion Rule]`을 최우선으로 확인한다.** Svelte 컴포넌트 재사용으로 진입 모션이 소실되는 회귀를 절대 허용하지 않는다.
- `skills/` 디렉토리를 탐색한다. 현재 작업과 연관된 `SKILL.md`가 있다면 즉시 로드하고, 그 스킬이 가리키는 절차 문서를 따른다. (`skills/`는 **발견 포인터**이고 절차 SSOT가 아니다.)

## 기능 변경 5단계 (MUST)

1. **Context**: 전역 규칙에 영향이 있는 요구사항을 관련 `docs/spec/` 문서에 먼저 반영한다.
2. **BDD**: 기능 변경을 `.feature`의 Given-When-Then 시나리오로 먼저 정의한다.
3. **TDD**: 정의된 시나리오에 따라 **실패하는** 테스트를 먼저 작성한다.
4. **Implementation**: 테스트를 통과하기 위한 **최소한의 코드 변경**만 반영한다.
5. **Verification**: 테스트 통과와 빌드 결과가 `docs/spec/`와 일치하는지 확인한다.

- 모든 작업은 위 순서를 **반드시(MUST)** 준수하며, 선행 단계 완료 전 다음 단계로 진행하거나 코드 구현을 시작하는 것을 엄격히 금지한다.
- 절차가 하나라도 누락되거나 순서가 뒤바뀌면 즉시 작업을 중단하고 절차를 복구한다.
- **아키텍트의 사고 궤적 보존 규칙**: 모든 변경 사항은 BDD와 TDD를 통해 의사결정의 논리적 증명을 완료하기 전까지 완료로 간주하지 않는다.

## 게이트·스크립트 불변 규칙 (MUST)

- MCP 프록시(`scripts/context7-toolname-proxy.ts`)는 다운스트림 입력 프레이밍으로 Content-Length와 NDJSON을 모두 수용하고, 감지된 프레이밍과 동일한 형식으로 응답해야 한다.
- 레포지토리 루트의 런타임/설정 스크립트는 `.js/.mjs/.cjs` 대신 TypeScript 또는 JSON 기반으로 유지한다.

## 부작용 가설 (검증 단계)

- **검증 단계에서 "버그가 없다"고 단정하기 전에 프레임워크 특성 기반 부작용 가설을 최소 3가지 수립·검증한다.**
- 필수 관점 3종:
  1. **애니메이션 소실** — 진입 모션이 컴포넌트 재사용으로 재생되지 않는가
  2. **상태 유지/오염** — 이전 상태가 남거나, 다른 컨텍스트의 상태로 오염되지 않는가
  3. **메모리 누수** — 리스너·타이머·구독이 해제·정리되지 않는가
- 가설은 "관측 가능한 부작용"으로 표현하고, 관측 방법을 함께 정의한다.

## 테스트 설계 표준

- 신규/수정 테스트는 `fast-check` 기반 Property-Based Testing(PBT)을 기본으로 한다.
- 사용자 시나리오/버그 재현은 Given-When-Then 형태의 BDD 스타일 테스트를 우선하며, UI 모션 시나리오는 **DOM 재렌더링/재생성 단위**까지 명시한다.
- UI 모션 회귀 테스트는 데이터 변경 검증만으로 종료하지 않고, **DOM 참조 비교(`not.toBe`)**로 실제 컴포넌트 교체를 기계적으로 증명한다.
- 테스트 커버리지는 회귀(regression) 방지의 최소 기준이며, 프로젝트의 커버리지 임계치를 지속적으로 만족해야 한다.

## [UI Motion Rule] 요약

- Svelte 라우트/필터 전환에서 진입 모션 재생이 요구되는 UI는 컴포넌트 재사용으로 모션이 누락되지 않도록 DOM 재생성을 보장해야 한다.
- 모든 리스트형 컴포넌트(BlogList 등)는 라우트 파라미터(`category`, `tag` 등) 변경 시 애니메이션이 초기화되도록 고유 키를 사용하는 `{#key}` 블록으로 감싸야 한다.
- 포스트 상세 라우트(`/post/:slug/`)에서도 히어로/헤더 진입 모션이 동일 톤으로 재생되어야 하며, 직접 진입과 라우트 전환 모두에서 DOM 재생성으로 이를 보장한다.
- BDD Gherkin의 UI Then 절은 눈에 보이는 결과뿐 아니라 DOM 생명주기(생성/파괴) 상태를 명시해야 한다.
- "화면 데이터만 정상"인 상태를 모션 정상으로 간주하지 않으며, 모션 회귀 방지의 완료 기준은 DOM 교체 증명까지 포함한다.
- **정본**: `docs/spec/ui-design.md`의 `[UI Motion Rule]`.

## 포스트 작성 표준

- **이중 언어 정책**: 모든 포스트는 영어(English)와 한국어(Korean) 두 언어로 작성한다. 파일명은 동일한 `YYYY-MM-DD-N.md`를 쓴다. (정본은 `docs/spec/post-creation.md`다)
  - 영어: `src/posts/project/` · `src/posts/company/` · `src/posts/archright/`
  - 한국어: `src/posts/ko/project/` · `src/posts/ko/company/` · `src/posts/ko/archright/`
- **카테고리**: `categories.json`의 선언을 따른다 (`Project` · `Company Work` · `Archright`). 정본은 `docs/spec/post-creation.md`다.
- **프론트매터 필수 필드**:
  - `layout: post`
  - `title`: 명확하고 호기심을 유발하는 제목
  - `date`: `YYYY-MM-DD HH:MM:SS -0000`
  - `tags`: 3개 이상의 관련 태그
  - `category`: `Project` 또는 `Company Work`
  - `description`: 1-2문장의 핵심 요약
- **프로젝트 명칭 정책**: 포스팅 내용에서 프로젝트명은 일관되게 지칭한다. `Axiom Enterprise` 폴더명을 그대로 사용하지 말고 `Axiom`으로만 지칭한다. (예: "Axiom Enterprise was built" → "Axiom was built")
- **본문 구성**: 섹션 구성과 분량은 전달력을 해치지 않는 범위에서 자유롭게 쓴다.
- **공개 포스트 본문에는 작성 프로세스용 체크리스트를 남기지 않는다.** (예: Verification Checklist, Length Guidelines)

### 콘텐츠 변경 경로와 병합 검증

- **콘텐츠 변경 경로**: 콘텐츠(`src/posts/`)는 `main`에 PR로 병합한다. `deploy` 브랜치에 푸시하거나 `--no-verify`로 검증을 우회하지 않는다.
- **병합 검증 의무**: PR 생성 후 `validate` 필수 검사 결과를 `gh run list`/`gh run view`로 확인하고, 오너 승인 없이 병합하지 않는다.

### 기존 포스트 부분 수정 규칙

- **기본 규칙**: 동일한 부분은 토씨·문장부표·줄바꿈을 유지하고, 특히 줄 끝 `\`를 제거·이동·정규화하지 않는다.
- **가독성 구조 규칙**: 문단 구분선(`<hr ... />`)과 제목 계층(`##`, `###`)은 기존 위치와 표기를 유지하며, 섹션 번호 표기(`1)`, `1.`)도 원문 형식을 따른다.
- **흐름 블록 가독성 규칙**: `요구사항 입력` 같은 흐름 블록은 빈 줄과 줄 끝 `\`를 포함한 단계형 레이아웃을 유지하고, 화살표(`→`) 연결 구문은 원문 배치(단일행/다중행)를 보존한다.
- **정형 검증 절차 표기 규칙**: 검증 절차를 설명하는 단락은 번호 목록(`1.`~`N.`)을 기본 형식으로 유지하고, 예시 문장은 조건문/결과문 종결부의 쉼표·마침표·역슬래시를 원문대로 보존한다.

## 시각화 자료(Mermaid) 처리

- **마크다운 직접 사용 금지**: 본문에 ` ```mermaid ` 블록을 그대로 두지 않는다.
- **이미지 생성**: Mermaid 소스는 `scripts/image-tools.ts`의 파이프라인에 등록한다. (정본 진입점: `pnpm run images:generate:ci` → `scripts/image-tools.ts`)
- **명령어 실행**: `pnpm run images:generate:ci`를 실행하여 `public/images/`에 PNG를 생성한다. 이 명령은 CI(`pages-deploy.yml`)가 사용하는 동일 경로다.
- **참조 방식**: 마크다운에서는 `../assets/images/파일명.png` 경로를 사용하여 이미지를 삽입한다.

## 외부 플랫폼(DEV.to) 발행

- **초안 전용**: `Draft One`은 `published:false` 초안만 만든다. 공개 전환은 이 저장소의 자동화 범위가 아니다. 이미 공개된 글을 초안으로 되돌릴 때는 `Unpublish One`을 사용한다.
- **단일 실행 경로**: 발행은 `.github/workflows/publish-one.yml`의 `repository_dispatch: draft-one`으로만 요청한다. 로컬에서 `scripts/post-to-dev.ts`를 직접 실행하지 않는다. `--publish-one` 외의 레거시 경로는 `PUBLISH_LEGACY_ENABLED` 없이는 거부된다.
- **승인 경계**: 실제 실행은 `sns-publish` 환경의 오너 승인을 통과해야 한다. 에이전트는 승인자가 될 수 없다.
- **감독 모드 (App 등록 전)**: 현재 에이전트는 오너의 관리자 토큰으로 동작하므로, dispatch와 승인은 오너가 지켜보는 상태에서만 수행한다. App 토큰으로 교체된 뒤 이 임시 조항을 제거한다.
- **사전 검증**: 발행 전 `pnpm run typecheck`, `pnpm run test`, `pnpm run build:github`가 통과해야 한다.
- **외부 관측이 유일한 증거**: 성공 판정은 `GET https://dev.to/api/articles/me/all`에서 동일 `id`가 `published:false`로 보이는 것이다. 워크플로 로그의 success나 로컬 마커는 증거가 아니다.
- **재실행**: 동일 포스트를 다시 요청하면 기존 초안을 찾아 `already_draft`/`draft_found`로 종료해야 하며 새 POST를 만들면 안 된다.
- **불명 상태**: `unknown`은 성공이 아니다. 자동 재POST하지 말고 `/me/all`을 다시 조회해 동일 canonical/title의 글을 찾은 뒤 판정한다.
- **이미지 주소**: 본문 이미지는 공개 절대 URL(`https://wintrover.github.io/assets/images/...`)이어야 한다. `/blog` 접두사는 사용하지 않는다.
- **비밀 정보**: `DEVTO_API_KEY`의 목표 권위는 `sns-publish` 환경 secret이다. 오너 이전 전까지는 저장소 secret이 임시로 사용되며, 코드·로그에 값을 남기지 않는다.
- **단계별 실행 절차**: [docs/DEVTO_PUBLISH_RUNBOOK.md](../DEVTO_PUBLISH_RUNBOOK.md)

## 스킬 매핑 (skills/는 발견 포인터)

실제 절차 SSOT는 `docs/agents/` 디렉토리다. `skills/*/SKILL.md`는 아래 문서를 가리키는 얇은 포인터이며, 그 자체가 절차의 원천이 아니다.

| 작업 | 절차 SSOT | 발견 포인터 |
|---|---|---|
| 포스트 작성 및 수정 | [task-process.md](task-process.md) | `skills/post-creation-standard` |
| 시각화 자료(Mermaid) 처리 | [task-process.md](task-process.md) | `skills/mermaid-conversion` |
| 외부 플랫폼(DEV.to) 배포 | [task-process.md](task-process.md) | `skills/devto-publishing` |
| 품질 검증 및 테스트 | [quality-gates.md](quality-gates.md) | `skills/quality-assurance` |
| 도구·환경 운영 | [operations.md](operations.md) | — |

## 관련

- [AGENTS.md §0.3](../../AGENTS.md) — 증거 문화 불변식(압축 버전)
- [docs/spec/](../../spec/) — 도메인 계약 정본(URL·빌드·UI·포스트 작성)
- [docs/agents/quality-gates.md](quality-gates.md) — 집행 체인
