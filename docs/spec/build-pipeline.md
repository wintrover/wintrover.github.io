# 빌드 및 Mermaid 파이프라인 계약

> 이 문서는 빌드·Mermaid 파이프라인 불변 규칙의 정본이다. 헌법은 `AGENTS.md`, 절차는 `docs/agents/`에 있다.
> URL·locale 아키텍처 규칙은 [url-architecture.md](url-architecture.md)에, UI/디자인 원칙은 [ui-design.md](ui-design.md)에 있다.

## build-github.ts

- GitHub Pages 빌드 산출물은 최소한 다음 랜딩 파일을 항상 포함해야 한다.
  - `dist/index.html`
  - `dist/ko/index.html`
  - `dist/resume/index.html`
  - `dist/ko/resume/index.html`
  - `dist/kr/index.html` (canonical `/ko/`로 수렴하는 레거시 별칭, sitemap/hreflang 제외)
- `url-contract.json`이 선언한 모든 alias URL의 산출물도 필수 entrypoint다. `verifyBuildOutput`은 registry의 alias 파일 경로를 기대하며 `dist/kr/index.html`도 그 registry 항목으로 포함된다.
- 블로그 브랜드 메타데이터(타이틀/설명/OG)는 런타임 설정과 빌드 파이프라인에서 **하나의 공유 소스**로부터 파생되어야 한다.
- 오너 직함(브랜드 정체성)의 공식 선언은 헌법(`AGENTS.md` §0.1)을 따르며, 사이트 브랜드 표면(`brandProfile`·resume locales·`public/404.html` 타이틀·빌드 폴백 문자열)이 그 직함을 동일하게 반영해야 한다.
- 직함 재발급 시 이전 직함의 full-string이 소스와 빌드 산출물(HTML·JS 번들)에 잔존해서는 안 된다.
- `Thought Trajectory System` / `사고 궤적 시스템`은 제품 기능명이므로 직함 재발급의 삭제 대상에서 제외한다.
- GA4 측정 ID와 GSC 사이트 검증 토큰은 하드코딩하지 않고 `VITE_GA_MEASUREMENT_ID`, `VITE_GOOGLE_SITE_VERIFICATION` 환경 변수로 주입해야 한다.
- GitHub Actions 주입 경로는 `secrets`를 우선 사용하고, 필요 시 `vars`를 fallback으로 허용해야 한다.
- GA4 추적 초기화는 앱 부팅 시점(`src/main.ts`)에서 단일 진입점으로 시작해야 하며, 해시 라우트 변경(`hashchange`)과 히스토리 이동(`popstate`)에서 페이지뷰를 갱신해야 한다.
- 페이지뷰 경로 계산 시 해시 기반 라우팅(`#/...`)은 실제 페이지 경로(`/...`)로 정규화해 전송해야 한다.
- `index.html`은 `%VITE_GOOGLE_SITE_VERIFICATION%` 값을 사용하는 `google-site-verification` 메타 태그를 유지해야 한다.
- 영어는 루트에 배치하므로 `dist/en/index.html` 생성에 의존하지 않는다.
- 레거시 `/kr` 별칭은 두 `buildBlog` 호출이 `dist`를 재생성한 뒤, `verifyBuildOutput` 이전에 `buildLegacyLocaleAlias`가 생성해야 한다. `public/`에 두지 않는다(과거 ko 빌드의 `copyPublicDir`가 `dist/ko/kr/`로 복사해 계약 밖 URL을 만들었다).
- locale 출력 경계: 영어 빌드는 `copyPublicDir`가 켜져 `public/` 전체를 `dist/`에 복사하지만, 한국어 빌드는 `COPY_PUBLIC_DIR=false`로 `copyPublicDir`를 끄고 `deriveKoPublicAssets`가 파생한 자산만 `copyKoPublicAssets`로 `dist/ko/`에 복사해야 한다.
- `deriveKoPublicAssets`는 `src/posts/ko/**/*.md` 본문의 `/images/` 참조와 `images/profile.png`만 수집해 정렬·중복 제거된 site-root 상대 경로를 반환한다. 파생 경로가 `public/`에 없으면 빌드를 실패시킨다.
- `findLocaleBoundaryViolations`/`verifyLocaleBoundary`는 `dist/ko/post`·`dist/post` 디렉터리 집합을 각각 KO slug ∪ 한국어 포스트 별칭 집합, EN slug ∪ 영어 포스트 별칭 집합과 비교하고, `dist/ko/images` 파일 집합을 `deriveKoPublicAssets` 결과와 비교한다. `dist/ko` 아래 `evidence`·`404.html`·`.nojekyll`·`auto-merge-verification.txt`·`kr`·`sitemap.xml`·`robots.txt`의 존재, 필수 산출물의 누락은 모두 빌드 실패다.
- 포스트 랜딩 페이지와 레거시 포스트 slug 별칭은 `build-github.ts`가 생성해야 하며 `public/`에 두지 않는다. Vite의 `publicDir` 복사는 영어 빌드에만 적용되므로 영어 전용 문서가 `dist/ko/`에 나타나서는 안 된다.
- `/ko` 트리에는 한국어 canonical slug와 한국어 포스트 별칭만 포함되어야 한다. 영어 별칭은 `dist/post/<옛 slug>/index.html`에만 생성하고 `dist/ko/post/<옛 slug>/`를 만들지 않는다. 한국어 별칭은 `dist/ko/post/<옛 slug>/index.html`에만 생성한다.
- 별칭 문서의 생성·검증은 `url-contract.json` registry를 권위로 삼는다. `buildAliasPages`가 각 alias의 최종 canonical을 해석해 최종 목적지 기준 canonical·redirect를 쓰고, `verifyAliasOutputs`가 파일 존재·canonical·meta refresh·`location.replace`·모든 alias의 `noindex,follow`·sitemap 미포함을 확인한다. 스키마·전이 행렬은 [url-contract.md](url-contract.md)가 정본이다.
- 수집된 모든 포스트는 정적 랜딩 페이지(`dist[/ko]/post/<slug>/index.html`)를 가져야 하며, 누락은 빌드 실패다.
- `collectPostEntries`는 slug를 파생할 수 없는 파일을 조용히 건너뛰지 않는다. 해당 파일 경로를 로그로 남기고 빌드를 실패시킨다. 한 locale 안에서 파생 slug가 중복되어도 빌드를 실패시킨다.
- `verifyPostLandingPages`는 각 랜딩 파일을 `renderPostLandingHtml` 결과와 바이트 단위로 비교하고, 불일치(canonical/redirect 포함)를 빌드 실패로 처리한다.
- `verifySitemapContract`는 `dist/sitemap.xml`의 `<loc>` 다중집합을 기대 URL 집합(루트·`/ko/`·resume 2종·EN/KO canonical 포스트)과 정확히 비교한다. 누락·추가·중복은 빌드 실패다.
- 레거시 포스트 별칭은 빌드가 생성하며 `public/`에 저장하지 않고, sitemap에서 제외한다.
- `public/post`와 `public/kr`는 금지된다. 두 경로는 locale별 복사로 계약 밖 URL(`dist/ko/post/<영어 slug>/`, `dist/ko/kr/`)을 생성한다.
- Sitemap과 canonical 생성 시 영어는 루트 prefix(`""`), 한국어는 `/ko` prefix를 사용한다.
- 검색/AI 노출 제어 메타는 `index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1` 정책을 기본으로 유지해야 한다.
- 브라우저 탭 제목(`<title>`)은 페이지 의미 중심으로 유지하고 브랜드 suffix(`- Axiom`)를 덧붙이지 않는다.
- `robots.txt`는 `Google-Extended` 그룹을 명시해 Gemini/Vertex AI 학습·grounding 제어 정책을 분리 가능하게 유지해야 한다.
- 빌드 검증 단계(`verifyBuildOutput`)는 위 규칙 위반을 실패로 처리해야 한다.

## image-tools.ts

- Mermaid 파이프라인은 다음 순서를 유지해야 한다.
  - Markdown에서 Mermaid 블록 추출
  - PNG 렌더링
  - 이미지 URL 치환
  - 실패 시 폴백 마크다운 유지
- 출력 포맷은 PNG를 기본으로 하며 출력 경로는 `public/images` 규칙을 따른다.
- `generateMermaidImagesForPosts`의 파일명 파생 규칙(날짜-번호 기반)은 깨지면 안 된다.
- CI 진입점(`runGenerateImagesCi`)은 실패 시 반드시 non-zero 종료를 보장해야 한다.

## 관련

- [docs/agents/task-process.md](../agents/task-process.md) — 시각화 자료(Mermaid) 처리 절차
- [docs/agents/quality-gates.md](../agents/quality-gates.md) — 집행 체인(CI 필수 검사)
