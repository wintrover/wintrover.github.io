# 빌드 및 Mermaid 파이프라인 계약

> 이 문서는 빌드·Mermaid 파이프라인 불변 규칙의 정본이다. 헌법은 `AGENTS.md`, 절차는 `docs/agents/`에 있다.
> URL·locale 아키텍처 규칙은 [url-architecture.md](url-architecture.md)에, UI/디자인 원칙은 [ui-design.md](ui-design.md)에 있다.

## build-github.ts

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
