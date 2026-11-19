# URL 아키텍처 계약

> 이 문서는 URL·로케일 아키텍처 계약의 정본이다. 헌법은 `AGENTS.md`, 절차는 `docs/agents/`에 있다.
> 포스트 등록·동기화·부분 수정 표준은 [post-creation.md](post-creation.md)에, 빌드 산출물의 sitemap·canonical 생성 규칙은 [build-pipeline.md](build-pipeline.md)에 있다.

## 경로 원칙

- 기본 언어는 영어(English)이며 루트 경로 `/`를 사용한다.
- 한국어는 `/ko/` 경로를 사용한다.
- `/en/` 경로는 아키텍처에서 제거하며, 신규 링크/리다이렉트/사이트맵/캐노니컬에서 사용하지 않는다.
- `/kr`과 `/kr/`는 `/ko/`로 수렴하는 호환 별칭이며 canonical은 `/ko/`다. 별칭은 locale이 아니므로 `src/lib/locale.ts`·`parseLocaleFromPathname`·hreflang·sitemap·canonical에 `kr`을 추가하지 않는다.
- `/kr` 하위 경로(`/kr/post/...` 등)는 이 계약에 포함하지 않는다. `/kr`은 GitHub Pages가 `/kr/`로 301 정규화한 뒤 200 별칭 문서를 제공하는 경로만 지원한다.
- `/en/`은 루트가 영어 canonical이므로 별칭을 두지 않는다. `/kr` 별칭은 한국어 canonical이 `/ko/`로 분리되어 있기 때문에만 존재한다.
- 영어 콘텐츠의 표준 URL은 루트 기반(`/post/:slug/`, `/resume/`)으로 유지한다.

## Not-Found 라우트 계약

- 해시 라우트 맵의 마지막 키는 catch-all `'*'`(NotFound 뷰)이며, 존재하지 않는 해시 라우트는 빈 화면(null 렌더) 대신 NotFound 뷰를 렌더링한다.
- Not-Found 문구는 런타임 로케일(en/ko)과 일치하며, 일반 NotFound(`Page not found`/`페이지를 찾을 수 없습니다`)와 게시글 not-found(`Post not found`/`포스트를 찾을 수 없습니다`) 문구를 구분해 `config.ts`의 ko/en 쌍 SSOT에서 공급한다.
- 첫 진입 miss의 서버 404(`public/404.html` 언어 셤)는 불변이며, SPA not-found 뷰는 문서 URL을 실제 콘텐츠와 공유하므로 robots noindex 같은 색인 주장을 하지 않는다(문서 색인 방어는 서버 404의 기존 `noindex,nofollow`가 담당).

## slug 정규화와 조회 호환

- 배포 스크립트의 canonical URL slug 생성은 앱 라우터의 `slugify` 규칙과 동일해야 하며, 아포스트로피가 포함된 제목도 동일 slug로 정규화해야 한다.
- 빌드 canonical slug는 `slugify(title) || slugify(fileName)`이다. 제목이 비었거나 정규화 결과가 비면 파일명 slug를 사용하고, 둘 다 비면 빌드를 실패시킨다(fail-closed).
- 비라틴 문자 제목(예: 한국어)은 `slugify`가 빈 문자열을 반환하므로 `fileName` slug를 사용한다.
- 한 locale 안에서 하나의 canonical slug는 정확히 하나의 포스트에 속한다. 파생 slug가 중복되면 빌드는 실패하며, 조용히 덮어쓰거나 건너뛰지 않는다.
- 공개 URL 장부는 `url-contract.json`이며 canonical과 alias의 단일 권위다. 스키마·전이 행렬·보장 범위는 [url-contract.md](url-contract.md)에 있다.
- 기존에 공개된 영어 포스트 별칭은 영구 보존한다. 신규 별칭은 append-only 관례로만 추가하며 기존 항목의 target을 수정하거나 삭제하지 않는다.
- registry는 다음을 검증한다: canonical 집합과 파생 집합의 일치(누락·추가 모두 위반), url 중복, self-reference, target 미등록, 순환 체인, locale 변경, alias URL과 canonical slug 충돌. 체인은 허용하며 최종 canonical로 해석한다. alias `from` URL은 sitemap에서 제외한다.
- 한국어 별칭 이력은 아직 레지스트리에 없다. 한국어 포스트의 과거 slug 호환은 이 계약의 범위가 아니다.
- `/kr` 하위 경로(`/kr/post/...` 등)는 이 계약에 포함하지 않는다.
- 포스트 로더는 기존 canonical slug(`dont`)와 현재 slug(`don-t`)를 모두 조회 호환해 과거 링크의 Post not found를 방지해야 한다.

## 포스트 메타데이터 정규화

- 포스트 Front Matter는 `---` 구분자를 사용해야 하며 `tags`가 문자열로 입력되어도 태그 집합으로 정규화되어 렌더링되어야 한다.
- 포스트 경로 기반 카테고리/폴더 판별은 `__proto__` 같은 프로토타입 키 입력에도 영향을 받지 않도록 own-key 조회만 사용해야 한다.

## 이력서 메타데이터

- 이력서 소셜의 LinkedIn 링크는 `https://www.linkedin.com/in/<slug>/` 형식의 canonical URL을 사용하며, GitHub 링크는 `https://github.com/wintrover` 개인 프로필을 사용한다.
- 이력서 프로젝트의 Axiom GitHub 링크는 저장소 `https://github.com/Archright/Axiom`을 사용한다. 소셜 GitHub 링크와 프로젝트 저장소 링크는 서로 다른 계약이며 혼합하지 않는다.
- 이력서 메타 타이틀은 로케일 공통으로 `resume` 표기를 사용한다.

## 관련

- [AGENTS.md §0.2](../../AGENTS.md) — 언어 정책
- [docs/spec/post-creation.md](post-creation.md) — 포스트 등록·카테고리·동기화 표준
- [docs/spec/build-pipeline.md](build-pipeline.md) — 빌드 파이프라인 불변 규칙
