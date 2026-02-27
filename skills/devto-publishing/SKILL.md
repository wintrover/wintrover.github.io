---
name: devto-publishing
description: 로컬 블로그 포스트를 DEV.to 플랫폼에 배포하는 안전한 절차.
---

## When to Use

- 블로그 포스트 작성이 완료되어 외부(DEV.to)로 발행할 준비가 되었을 때

## Rules

- **사전 검증**: 배포 전 반드시 `bun test`와 `pnpm lint`를 통과해야 한다.
- **이미지 주소**: DEV.to 배포 시 이미지는 공개적으로 접근 가능한 절대 URL(`https://wintrover.github.io/blog/assets/images/...`)이어야 한다. (스크립트에서 자동 처리되나 확인 필수)
- **배포 스크립트**: `bun scripts/post-to-dev.ts src/posts/<파일명>.md` 명령어를 사용한다. (tsx보다 bun이 실행 속도가 빠름)
- **비밀 정보**: `DEVTO_API_KEY` 등 환경 변수가 커밋되지 않도록 주의한다.

## Checklist

- [ ] 로컬 테스트 및 린트가 통과했는가?
- [ ] `git push`를 통해 최신 이미지가 GitHub Pages에 반영되었는가?
- [ ] 배포 스크립트 실행 후 출력된 드래프트 URL에서 이미지가 깨지지 않는지 확인했는가?
