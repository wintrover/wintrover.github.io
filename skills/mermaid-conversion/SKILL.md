---
name: mermaid-conversion
description: 마크다운 내 Mermaid 다이어그램을 배포용 PNG 이미지로 변환하는 절차.
---

## When to Use

- 포스트 내에 그래프, 시퀀스 다이어그램, 표 등의 시각화 자료가 필요할 때

## Rules

- **마크다운 직접 사용 금지**: 본문에 ` ```mermaid ` 블록을 그대로 두지 않는다.
- **GitHub Actions 확인**: `gh` 명령어만 사용한다. (예: `gh run list`, `gh run view`)
- **이미지 생성**: `scripts/generate-blog-images.ts` 파일에 Mermaid 소스를 등록한다.
- **명령어 실행**: `bun scripts/generate-blog-images.ts`를 실행하여 `public/images/`에 PNG를 생성한다. (tsx보다 bun이 실행 속도가 빠름)
- **참조 방식**: 마크다운에서는 `../assets/images/파일명.png` 경로를 사용하여 이미지를 삽입한다.

## Checklist

- [ ] `scripts/generate-blog-images.ts`에 코드가 올바르게 추가되었는가?
- [ ] 생성된 PNG 파일이 `public/images/`에 존재하는가?
- [ ] 마크다운에서 호출하는 경로가 배포 환경 규격(`../assets/images/`)에 맞는가?
