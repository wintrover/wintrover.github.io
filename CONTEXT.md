# wintrover-blog Context (SSoT 헌법)

이 문서는 이 프로젝트의 진실의 단일 원천(SSoT)이다.
모든 작업은 이 문서를 최우선으로 참조하며, 충돌 시 이 문서의 규칙을 기준으로 판단한다.

## 1) 프로젝트 목적

- 블로그 오너의 정체성은 **사고 궤적 아키텍트 (Thought Trajectory Architect)**다.
- 핵심 역량은 단순 코드 작성이 아니라 **복잡한 문제를 해결하기 위한 논리적 궤적을 설계하고, 이를 AI와 협업하여 물리적 코드로 이식하는 것**이다.
- 이 프로젝트는 커밋 히스토리와 대화 로그에서 개발자의 사고방식을 추출해 블로그 포스팅으로 전환하는 Devlog 프로젝트다.
- 결과물은 단순 작업 기록이 아니라 문제 정의, 의사결정, 시행착오, 개선 근거를 재구성한 학습 가능한 개발 기록이어야 한다.

## 1-1) Devlog/Axiom 엔진 아키텍처 규칙

- 배포 상태의 진실 원천은 UI가 아니라 루트 `state.json`이며, 구조는 그래프(Node/Edge) 모델을 따른다.
- Node는 최소한 `id`, `path`, `kind`, `status`, `timestamps`, `integrity`를 포함해 포스트와 사고 조각의 상태를 기술해야 한다.
- Edge는 최소한 `from`, `to`, `relation`, `status`를 포함해 `parent_thought_id`, `derived_from` 같은 사고 연결을 표현해야 한다.
- 무결성 검증은 단순 `published` 플래그가 아니라 의존성(`requires`)의 충족 여부를 계산하는 방식이어야 한다.
- 배포/동기화/그래프 생성 비즈니스 로직은 Nim CLI(`devlog`) 내부에 캡슐화하고, GitHub Actions나 향후 `/admin`은 CLI 호출만 수행해야 한다.
- GitHub Actions는 임시 GUI로 사용하며 `workflow_dispatch` 입력과 `GITHUB_STEP_SUMMARY` 출력을 제공해야 한다.
- Nim CLI 실행으로 `state.json`이 변경되면 워크플로는 변경분을 `main`에 자동 커밋/푸시하고 커밋 메시지에 `[skip ci]`를 포함해야 한다.
- publish 워크플로는 `X_API_KEY`, `LINKEDIN_ACCESS_TOKEN`, `DEVTO_API_KEY`를 Secrets에서 주입해 Nim 엔진에 전달해야 한다.
- 초기 publish 구현은 외부 API 호출 대신 플랫폼별 Mock 성공 응답을 기록하고 `state.json` 채널 상태를 갱신해야 한다.
- 이미 `published` 상태인 노드의 publish 재호출은 API/Mock 호출 없이 `already_published`를 반환하는 멱등성 규칙을 지켜야 한다.
- SNS 배포 워크플로는 Git 파일시스템 상태머신을 사용해야 하며 `.deploy/lock` Soft Lock으로 중복 실행을 방지해야 한다.
- `main` 브랜치는 포스팅 작성과 코드 개발의 기본 브랜치로 사용하고 SNS 배포 트리거 대상으로 사용하지 않는다.
- `deploy` 브랜치는 실제 SNS 배포가 일어나는 프로덕션 브랜치로 사용해야 한다.
- 배포 상태는 소스코드가 없는 독립 `DB` 브랜치(이하 DB 브랜치)에서만 관리해야 한다.
- 포스트별 플랫폼 상태는 `.deploy/[post-slug]/[platform].status`를 SSOT로 기록하고 `.success`/`.failed` 마커로 재시도 여부를 결정해야 한다.
- 상태머신 규칙은 `.success`가 있으면 Skip, `.failed` 또는 상태 파일 부재면 재배포 시도를 수행해야 한다.
- LinkedIn 배포는 `rest/posts`를 사용하고 Posts API 페이로드(`author`, `commentary`, `visibility`)를 적용해야 하며 Author는 `v2/me`로 확인한 person URN을 우선 주입하되 프로필 조회 권한 이슈가 발생하면 `LINKEDIN_PERSON_URN`(기본값 `urn:li:person:binfyrHJAK`) fallback으로 배포를 지속해야 한다.
- LinkedIn `commentary`는 소개 문단과 링크 문단을 `\n\n`으로 분리해야 하며 링크는 별도 단락으로 출력해야 한다.
- LinkedIn 소개 문단은 영어로만 작성해야 하며 `content/posts/ko/**` 배포 시에는 동일 slug의 영어 원문(`content/posts/**`) excerpt/description을 우선 사용하고, 영어 문단을 확보하지 못하면 영어 기본 소개문을 사용해야 한다.
- DEV.to 및 LinkedIn 본문의 이미지 링크는 `https://wintrover.github.io/` 기반 절대 경로로 치환해야 한다.
- 모든 플랫폼 시도 결과는 `GITHUB_STEP_SUMMARY` 마크다운 표와 `DB` 브랜치의 `STATUS.md`에 동시 반영해야 하며, 상태 스냅샷은 `DB` 브랜치에서만 단일 커밋으로 영속화해야 한다.
- SNS 배포 워크플로는 `deploy`와 `DB` 브랜치를 이중 체크아웃하고, 배포 후 `database` 저장소에서 `git pull --rebase` 기반 최대 3회 재시도 후 원자적으로 푸시해야 한다.
- `main` 브랜치에는 `.deploy/` 상태 데이터를 커밋하거나 푸시하면 안 된다.
- SNS 배포 스캔 대상은 현재 워킹 디렉토리의 `content/posts/` 아래에 실제로 존재하는 물리적 `.md` 파일로만 제한해야 하며, 이 경로 밖의 입력·Git 이력·캐시 인덱스 결과를 배포 후보로 허용하면 안 된다.
- SNS 배포 실행 시 `GITHUB_STEP_SUMMARY`에는 스캔 기준 루트와 배포 후보 물리 파일 목록 스냅샷을 함께 기록해 실행 시점 입력 집합을 추적 가능해야 한다.
- SNS 배포 실행 시 터미널 로그에도 스캔 기준 루트와 배포 후보 물리 파일 목록 스냅샷을 동일하게 출력해 워크플로 로그 검색으로 입력 집합을 재구성 가능해야 한다.
- SNS 배포 워크플로는 `push` 이벤트에서도 `target=content/posts`, `platforms=devto,linkedin` 기본값을 강제해 수동 입력 부재로 인한 루트 오탐 스캔을 허용하면 안 된다.
- `content/posts/ko/` 로케일 서브트리의 물리 `.md` 파일은 배포 후보에서 제외하면 안 된다.

## 2) URL 아키텍처 규칙

- 기본 언어는 영어(English)이며 루트 경로 `/`를 사용한다.
- 한국어는 `/ko/` 경로를 사용한다.
- `/en/` 경로는 아키텍처에서 제거하며, 신규 링크/리다이렉트/사이트맵/캐노니컬에서 사용하지 않는다.
- 영어 콘텐츠의 표준 URL은 루트 기반(`/post/:slug/`, `/resume/`)으로 유지한다.
- 신규 포스팅 등록 시 영어 원문과 한국어 버전을 기본으로 동시 작성하며, 파일명은 동일한 `YYYY-MM-DD-N.md`를 사용한다. 경로는 영어 `src/posts/{project|company}/`, 한국어 `src/posts/ko/{project|company}/`를 따른다.
- 신규 포스팅의 기본 분류는 `Project` 카테고리와 `Devlog` 태그를 사용한다. `Company Work` 카테고리는 재직 중 회사 업무 회고를 작성할 때만 사용한다.
- 포스트 Front Matter는 `---` 구분자를 사용해야 하며 `tags`가 문자열로 입력되어도 태그 집합으로 정규화되어 렌더링되어야 한다.
- 포스트 경로 기반 카테고리/폴더 판별은 `__proto__` 같은 프로토타입 키 입력에도 영향을 받지 않도록 own-key 조회만 사용해야 한다.
- 동일 slug의 한영 포스트 중 한쪽 본문을 각색하면 다른 언어 버전도 동일한 메시지로 동기화한다.

## 3) 빌드 및 Mermaid 파이프라인 불변 규칙

### build-github.ts

- GitHub Pages 빌드 산출물은 최소한 다음 랜딩 파일을 항상 포함해야 한다.
  - `dist/index.html`
  - `dist/ko/index.html`
  - `dist/resume/index.html`
  - `dist/ko/resume/index.html`
- 블로그 브랜드 메타데이터(타이틀/설명/OG)는 런타임 설정과 빌드 파이프라인에서 **하나의 공유 소스**로부터 파생되어야 한다.
- GA4 측정 ID와 GSC 사이트 검증 토큰은 하드코딩하지 않고 `VITE_GA_MEASUREMENT_ID`, `VITE_GOOGLE_SITE_VERIFICATION` 환경 변수로 주입해야 한다.
- GitHub Actions 주입 경로는 `secrets`를 우선 사용하고, 필요 시 `vars`를 fallback으로 허용해야 한다.
- GA4 추적 초기화는 앱 부팅 시점(`src/main.ts`)에서 단일 진입점으로 시작해야 하며, 해시 라우트 변경(`hashchange`)과 히스토리 이동(`popstate`)에서 페이지뷰를 갱신해야 한다.
- 페이지뷰 경로 계산 시 해시 기반 라우팅(`#/...`)은 실제 페이지 경로(`/...`)로 정규화해 전송해야 한다.
- `index.html`은 `%VITE_GOOGLE_SITE_VERIFICATION%` 값을 사용하는 `google-site-verification` 메타 태그를 유지해야 한다.
- 영어는 루트에 배치하므로 `dist/en/index.html` 생성에 의존하지 않는다.
- Sitemap과 canonical 생성 시 영어는 루트 prefix(`""`), 한국어는 `/ko` prefix를 사용한다.
- 검색/AI 노출 제어 메타는 `index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1` 정책을 기본으로 유지해야 한다.
- `robots.txt`는 `Google-Extended` 그룹을 명시해 Gemini/Vertex AI 학습·grounding 제어 정책을 분리 가능하게 유지해야 한다.
- 빌드 검증 단계(`verifyBuildOutput`)는 위 규칙 위반을 실패로 처리해야 한다.

### image-tools.ts

- Mermaid 파이프라인은 다음 순서를 유지해야 한다.
  - Markdown에서 Mermaid 블록 추출
  - PNG 렌더링
  - 이미지 URL 치환
  - 실패 시 폴백 마크다운 유지
- 출력 포맷은 PNG를 기본으로 하며 출력 경로는 `public/images` 규칙을 따른다.
- `generateMermaidImagesForPosts`의 파일명 파생 규칙(날짜-번호 기반)은 깨지면 안 된다.
- CI 진입점(`runGenerateImagesCi`)은 실패 시 반드시 non-zero 종료를 보장해야 한다.

## 4) UI/디자인 원칙

- 블로그 리스트 레이아웃은 항상 세로 정렬을 유지한다.
- 모든 포스트 카드는 콘텐츠 길이와 무관하게 일정한 카드 크기를 유지한다.
- 카드 높이 균일성을 해치지 않도록 제목/요약의 표시 방식(line clamp 등)을 일관되게 적용한다.
- 루트(`/`)·카테고리(`/category/:category`)·태그(`/category/:category/tag/:tag`) 목록은 동일한 포스트 리스트 UI 컴포넌트를 사용한다.
- 포스트 리스트의 카드 마크업/스타일은 단일 컴포넌트를 SSOT로 삼고, 경로별 페이지는 필터링/SEO/섹션 조합만 담당한다.
- 포스트 상세 페이지는 앱 전역 Geist 다크 테마의 색상/타이포 톤과 일관된 시각 체계를 유지한다.
- 포스트 상세의 배지·버튼·코드블록은 레거시 GitHub 팔레트 대신 zinc 기반 중성 팔레트를 사용한다.
- 포스트 상세의 제목/본문 타이포 스케일과 줄 간격은 리스트 페이지와 유사한 시각 밀도를 유지한다.
- 포스트 리스트와 상세는 동일한 수직 리듬 스케일 토큰(간격·행간·타이포 단위)을 공유한다.
- 한국어 포스트 상세 타이포는 CJK 줄바꿈 안정성을 위해 제목/본문에서 `word-break: keep-all`과 `overflow-wrap: break-word`를 기본 정책으로 유지한다.
- 주요 UI 섹션(홈 히어로·사이드바·리스트·푸터·이력서)은 동일한 모션 톤(부드러운 fade/fly, hover micro-interaction)으로 일관성을 유지한다.
- 카테고리/태그 라우트 간 전환 시에도 포스트 리스트 진입 모션은 재생되어야 하며, 동일 컴포넌트 재사용으로 모션이 소실되면 안 된다.
- 모든 신규 모션은 `prefers-reduced-motion` 환경에서 과도한 이동/지연 없이 즉시 또는 최소 전환으로 동작해야 한다.

### [UI Motion Rule]

- Svelte 라우트/필터 전환에서 진입 모션 재생이 요구되는 UI는 컴포넌트 재사용으로 모션이 누락되지 않도록 DOM 재생성을 보장해야 한다.
- 모든 리스트형 컴포넌트(BlogList 등)는 라우트 파라미터(`category`, `tag` 등) 변경 시 애니메이션이 초기화되도록 고유 키를 사용하는 `{#key}` 블록으로 감싸야 한다.
- 포스트 상세 라우트(`/post/:slug/`)에서도 히어로/헤더 진입 모션이 동일 톤으로 재생되어야 하며, 직접 진입과 라우트 전환 모두에서 DOM 재생성으로 이를 보장해야 한다.
- BDD Gherkin의 UI Then 절은 눈에 보이는 결과뿐 아니라 DOM 생명주기(생성/파괴) 상태를 명시해야 한다.
- 테스트 코드는 애니메이션/전환 작업에서 이전 DOM 객체와 현재 DOM 객체의 참조 비교(`not.toBe`)를 반드시 포함해야 한다.
- "화면 데이터만 정상"인 상태를 모션 정상으로 간주하지 않으며, 모션 회귀 방지의 완료 기준은 DOM 교체 증명까지 포함한다.

## 5) 에이전트 행동 강령

- 디자인 현대화 시 HTML 구조(시맨틱 태그와 DOM 뼈대)를 파괴하지 않는다.
- 개선은 CSS 변수, 토큰, 스타일 계층 정리 중심으로 수행한다.
- 구조 변경이 필요한 경우에도 기존 빌드 로직과 Mermaid 파이프라인 안정성을 우선 보장한다.
- 아키텍트의 사고 궤적을 보존하기 위해 모든 변경 사항은 BDD와 TDD를 통한 논리적 증명을 완료해야 한다.

## 6) 작업 절차 표준 (MUST/차단 규칙)

- 모든 작업은 아래 순서를 **반드시(MUST)** 준수하며, 선행 단계 완료 전 다음 단계로 진행하거나 코드 구현을 시작하는 것을 엄격히 금지한다.
- **1단계 (Context)**: 전역 규칙에 영향이 있는 요구사항은 먼저 이 문서(`CONTEXT.md`)에 반영한다.
- **2단계 (BDD)**: 기능 변경은 BDD(Given-When-Then) 시나리오를 `.feature` 파일로 먼저 정의한다.
- **3단계 (TDD)**: 정의된 시나리오에 따라 실패하는 테스트 코드를 먼저 작성한다.
- **4단계 (Implementation)**: 테스트를 통과하기 위한 **최소한의 코드 변경**만 반영한다.
- **5단계 (Verification)**: 최종 검증 시 테스트 통과 및 `scripts/build-github.ts` 실행 결과가 이 문서와 일치하는지 확인한다.
- 구현 파일 변경은 `CONTEXT.md`, `tests/features/*.feature`, `tests/**/*.test.ts` 변경 증거가 함께 있어야 하며, 해당 검증은 `scripts/procedure-gate.ts`와 CI 워크플로로 자동 차단한다.
- CI 절차 게이트의 변경 파일 계산은 기본적으로 three-dot diff를 사용하되, 히스토리 재작성으로 merge base가 없을 때 two-dot diff로 폴백해 차단 규칙을 계속 적용한다.
- MCP 프록시(`scripts/context7-toolname-proxy.ts`)는 다운스트림 입력 프레이밍으로 Content-Length와 NDJSON을 모두 수용하고, 감지된 프레이밍과 동일한 형식으로 응답해야 한다.
- 레포지토리 루트의 런타임/설정 스크립트는 `.js/.mjs/.cjs` 대신 TypeScript 또는 JSON 기반으로 유지한다.
- 이 절차 중 하나라도 누락되거나 순서가 뒤바뀔 경우, 에이전트는 즉시 작업을 중단하고 절차를 복구해야 한다.
