# 포스트 작성 계약

> 이 문서는 포스트 작성·등록·동기화 표준의 정본이다. 헌법은 `AGENTS.md`, 절차는 `docs/agents/`에 있다.
> URL·locale 규칙과 slug 정규화는 [url-architecture.md](url-architecture.md)에, 빌드 파이프라인 규칙은 [build-pipeline.md](build-pipeline.md)에 있다.

## 이중 언어 정책

- 모든 포스트는 영어(English)와 한국어(Korean) 두 언어로 작성해야 한다.
- 신규 포스팅 등록 시 영어 원문과 한국어 버전을 기본으로 동시 작성하며, 파일명은 동일한 `YYYY-MM-DD-N.md`를 사용한다. 경로는 콘텐츠 성격에 따라 다음을 따른다.
  - **Archright 카테고리**: Axiom 프로젝트 및 정형 검증 관련 포스트. 영어 `src/posts/archright/`, 한국어 `src/posts/ko/archright/`에 저장한다. frontmatter의 `category` 값을 `Archright`로 설정하고 `tags`에 반드시 `Axiom`을 포함해야 한다 (사이드바 "Axiom" 서브토픽 필터링을 위해 필요).
  - **Project 카테고리**: 개인 프로젝트 일반. 영어 `src/posts/project/`, 한국어 `src/posts/ko/project/`에 저장하며 frontmatter의 `category` 값을 `Project`로 설정한다.
  - **Company Work 카테고리**: 재직 중 회사 업무 회고. 영어 `src/posts/company/`, 한국어 `src/posts/ko/company/`에 저장하며 frontmatter의 `category` 값을 `Company Work`로 설정한다.

## 카테고리/태그 독점 규칙 (exclusiveTags)

- `categories.json`의 `exclusiveTags`에 선언된 태그는 해당 카테고리에서만 사용할 수 있다. 예: `Axiom` 태그는 반드시 `Archright` 카테고리여야 하며, 빌드(`build-github.ts`)와 절차 게이트(`procedure-gate.ts`)에서 하드 검증되어 위반 시 즉시 실패한다. 런타임에서는 `postLoader.ts`가 자동으로 `Archright`로 덮어쓴다.

## 한영 포스트 동기화 규칙

- 동일 slug의 한영 포스트 중 한쪽 본문을 각색하면 다른 언어 버전도 동일한 메시지로 동기화한다.
- 동일 slug의 한영 포스트 자동 동기화는 `scripts/sync-post-localization.ts`로 수행하며, KO 앵커 문장이 유지될 때 EN 대응 섹션을 뉘앙스 고정 템플릿으로 자동 패치한다.
- 자동 패치 범위는 최소 `### 1`, `### 2`, `### 3`, 최종 결론(`##`) 블록을 포함해 의도 흐름·레이어 체인·결론 문장을 함께 동기화해야 한다.
- 동일 slug의 한영 포스트에서 구간 가독성 구분선(`hr` 점선)을 적용할 때는 양 언어 버전에 동일한 상·하 경계를 동기화한다.
- 동일 slug의 한영 포스트 동기화 시 제목 계층, 문단 분할, 수사 강도(은유·강조 어휘)까지 원문의 논리 흐름과 뉘앙스를 보존한다.
- 동일 slug의 한영 포스트 동기화 시 정형 검증 단락의 확률 한계 주장과 수치(예: 99%, 99.99%, 0.01%)를 동일 의미로 보존한다.

## 기존 포스트 부분 수정 규칙

- 기존 포스트를 부분 수정할 때 동일한 구간은 토씨·문장부호·줄바꿈까지 원문을 유지하고, 줄 끝 `\`를 임의 삭제·이동·치환하면 안 된다.
- 기존 포스트의 문단 구분선(`<hr ... />`)과 제목 계층(`##`, `###`)은 동일 위치와 표기(`1)`, `1.` 포함)로 유지해야 한다.
- 기존 포스트의 흐름 다이어그램형 텍스트(`요구사항 입력`, `→` 단계 연결)는 빈 줄 간격과 줄 끝 `\`를 포함한 레이아웃을 유지해야 하며, 단일행 압축/다중행 분해 여부를 임의 변경하면 안 된다.
- 정형 검증 절차 단락은 번호 목록(`1.`~`N.`) 기반 순서 표현을 유지해야 하며, 예시 문장의 조건절/결과절 종결부 쉼표·마침표·역슬래시를 표준 표기로 보존해야 한다.
- 정형 검증 예시 단락에 반례 탐지 설명을 추가할 경우 `다른 사용자 ID` 같은 반례 상황과 `→` 결과 라인을 한 쌍으로 유지하고, 마지막 생성 중단 결론 문장을 누락하지 않는다.
- 가독성 개선을 위해 한 문장을 여러 줄로 분할할 때는 핵심 주장(예: `이건 엔지니어링이 아니다` / `비용 이연`)의 의미 결합을 유지하고, 원문의 강조 의도를 약화시키지 않는다.

## 공개 본문 기준

- 공개 포스트 본문에는 작성 프로세스용 체크리스트(예: Verification Checklist, Length Guidelines)를 남기지 않는다.

## 프로젝트 명칭 정책

- 포스팅 내용에서 프로젝트명은 일관되게 지칭한다.
  - `Axiom Enterprise` 폴더명을 그대로 사용하지 말고, `Axiom`으로만 지칭
  - 예: "Axiom Enterprise was built" → "Axiom was built"

## 콘텐츠 변경 경로와 게이트 예외

- **Procedure Gate 예외**: 콘텐츠(`src/posts/`) 파일은 아키텍처의 '실록(History)' 또는 '홍보(Publicity)' 영역에 속하므로 `src/core`에 적용되는 Procedure Gate의 엄격한 증거 의무(`docs/spec/*.md`, `tests/features/*.feature`, `tests/**/*.test.ts`)에서 제외된다. `[REQ-PROCEDURE-GATE-07]` 단, `docs/spec/`와의 정합성 검토는 유지한다. **CI 스킵 금지**: Procedure Gate 예외는 로컬 git hooks(`--no-verify`)에만 적용되며, GitHub Actions CI(`[skip ci]`)는 스킵하면 안 된다. 블로그 배포를 위해 `Pages Build & Deploy` 워크플로우가 반드시 실행되어야 한다.
- **deploy 브랜치 검증 의무**: `deploy` 브랜치에 푸시한 후에는 반드시 `gh` 명령어로 GitHub Actions 실행 결과를 검증해야 한다.

## 기록: 2026-04-02 포스트 변경 이력

> 아래 항목은 표준이 아니라 특정 포스트의 변경 기록이다.

- **2026-04-02 Axiom 포스트**: 기술 블로그 시리즈 첫 포스트로 BMC, Z3, Lean 4, Dr.Nim을 활용한 무결성 검증 엔진 소개
- **2026-04-02 포스트 리라이팅**: Gemini 첨삭 반영 - 서론 재작성, 검증 비대칭성 섹션 추가, BMC 설명 보강
- **2026-04-02 포맷팅 수정**: 지표 바 그래프 정렬 - 텍스트와 시각적 바의 시작 위치 수직 일치, 고정 폭 적용, 한국어 Trust Gap 공백 조정
- **2026-04-02 사이드바 스타일**: h4 헤더에 좌우 패딩 추가 (0.55rem)
- **2026-04-02 포스팅 수정**: "수학적으로 건전" → "수학적으로 증명"으로 표현 변경
- **2026-04-02 포스팅 미션 문구**: "확률적 출력에서 검증된 산출물" → "비결정론적 출력을 결정론적 자산으로 정제"
- **2026-04-02 포스팅 다음편 예고**: BMC 구현 → 아키텍처 철학 Rule First 원칙으로 변경

## 관련

- [AGENTS.md §0.2](../../AGENTS.md) — 언어 정책(이중 언어)
- [docs/agents/task-process.md](../agents/task-process.md) — 포스트 작성 절차·기존 포스트 부분 수정 규칙
- [docs/spec/url-architecture.md](url-architecture.md) — slug 정규화·Front Matter 규칙
