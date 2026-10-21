# URL 아키텍처 계약

> 이 문서는 URL·로케일 아키텍처 계약의 정본이다. 헌법은 `AGENTS.md`, 절차는 `docs/agents/`에 있다.
> 포스트 등록·동기화·부분 수정 표준은 [post-creation.md](post-creation.md)에, 빌드 산출물의 sitemap·canonical 생성 규칙은 [build-pipeline.md](build-pipeline.md)에 있다.

## 경로 원칙

- 기본 언어는 영어(English)이며 루트 경로 `/`를 사용한다.
- 한국어는 `/ko/` 경로를 사용한다.
- `/en/` 경로는 아키텍처에서 제거하며, 신규 링크/리다이렉트/사이트맵/캐노니컬에서 사용하지 않는다.
- 영어 콘텐츠의 표준 URL은 루트 기반(`/post/:slug/`, `/resume/`)으로 유지한다.

## slug 정규화와 조회 호환

- 배포 스크립트의 canonical URL slug 생성은 앱 라우터의 `slugify` 규칙과 동일해야 하며, 아포스트로피가 포함된 제목도 동일 slug로 정규화해야 한다.
- 포스트 로더는 기존 canonical slug(`dont`)와 현재 slug(`don-t`)를 모두 조회 호환해 과거 링크의 Post not found를 방지해야 한다.

## 포스트 메타데이터 정규화

- 포스트 Front Matter는 `---` 구분자를 사용해야 하며 `tags`가 문자열로 입력되어도 태그 집합으로 정규화되어 렌더링되어야 한다.
- 포스트 경로 기반 카테고리/폴더 판별은 `__proto__` 같은 프로토타입 키 입력에도 영향을 받지 않도록 own-key 조회만 사용해야 한다.

## 이력서 메타데이터

- 이력서 소셜의 LinkedIn 링크는 `https://www.linkedin.com/in/<slug>/` 형식의 canonical URL을 사용하며, GitHub 링크는 `https://github.com/wintrover` 개인 프로필을 사용한다.
- 이력서 메타 타이틀은 로케일 공통으로 `resume` 표기를 사용한다.

## 관련

- [AGENTS.md §0.2](../../AGENTS.md) — 언어 정책
- [docs/spec/post-creation.md](post-creation.md) — 포스트 등록·카테고리·동기화 표준
- [docs/spec/build-pipeline.md](build-pipeline.md) — 빌드 파이프라인 불변 규칙
