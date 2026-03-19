---
name: post-creation-standard
description: 블로그 포스트의 일관된 품질과 구조를 유지하기 위한 작성 표준 가이드라인.
---

## When to Use

- 새로운 블로그 포스트(Project 또는 Company)를 작성할 때
- 기존 포스트의 구조를 개선하거나 수정할 때

## Rules

- **언어(Language)**: **모든 포스팅 본문과 Frontmatter는 반드시 영어(English)로 작성한다.**
- **GitHub Actions 확인**: `gh` 명령어만 사용한다. (예: `gh run list`, `gh run view`)
- **Git 명령어 페이저 비활성화**: 모든 git 명령어는 반드시 `git --no-pager <subcommand>` 형식으로 실행한다.
- **공식 문서 탐색**: Context7은 MCP가 아닌 CLI(`ctx7` 또는 `npx ctx7`)만 사용한다.
- **파일명**: `YYYY-MM-DD-N.md` 형식을 준수한다. (예: `2026-02-01-18.md`)
- **Frontmatter**: 아래 필드를 반드시 포함한다.
  - `layout: post`
  - `title`: 명확하고 호기심을 유발하는 제목
  - `date`: `YYYY-MM-DD HH:MM:SS -0000`
  - `tags`: 3개 이상의 관련 태그
  - `category`: `Project` 또는 `Company Work`
  - `description`: 1-2문장의 핵심 요약
- **본문 구성**: 포스팅 형식과 섹션 구성은 자유롭게 작성한다.
- **분량**: 전달력을 해치지 않는 범위에서 자유롭게 작성한다.

## Checklist

- [ ] Frontmatter가 모든 필수 필드를 포함하고 있는가?
- [ ] 카테고리가 정확히 `Project` 또는 `Company Work`로 지정되었는가?
- [ ] **모든 내용이 영어로 작성되었는가?**
