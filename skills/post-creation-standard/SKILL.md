---
name: post-creation-standard
description: 블로그 포스트의 일관된 품질과 구조를 유지하기 위한 작성 표준 가이드라인.
---

## When to Use

- 새로운 블로그 포스트(Project 또는 Company)를 작성할 때
- 기존 포스트의 구조를 개선하거나 수정할 때

## Rules

- **언어(Language)**: **모든 포스팅 본문과 Frontmatter는 반드시 영어(English)로 작성한다.**
- **파일명**: `YYYY-MM-DD-N.md` 형식을 준수한다. (예: `2026-02-01-18.md`)
- **Frontmatter**: 아래 필드를 반드시 포함한다.
  - `layout: post`
  - `title`: 명확하고 호기심을 유발하는 제목
  - `date`: `YYYY-MM-DD HH:MM:SS -0000`
  - `tags`: 3개 이상의 관련 태그
  - `category`: `Project` 또는 `Company Work`
  - `description`: 1-2문장의 핵심 요약
- **구조**: `src/templates/unified-template.md`를 기반으로 5대 섹션을 구성한다.
  1. `## Overview`
  2. `## Implementation`
  3. `## Debugging/Challenges`
  4. `## Results`
  5. `## Key Takeaways`

## Checklist

- [ ] Frontmatter가 모든 필수 필드를 포함하고 있는가?
- [ ] 카테고리가 정확히 `Project` 또는 `Company Work`로 지정되었는가?
- [ ] 5개의 핵심 섹션이 모두 포함되어 있는가?
- [ ] 전체 분량이 400-800라인 사이인가?
- [ ] **모든 내용이 영어로 작성되었는가?**
