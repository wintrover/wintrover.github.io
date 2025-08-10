# 윤수혁 포트폴리오 웹사이트

윤수혁의 개인 포트폴리오 웹사이트입니다.

## 🌐 웹사이트

- **메인 사이트**: [wintrover.github.io](https://wintrover.github.io)
- **한국어/English**: 언어 전환 지원

## 🛠 기술 스택

- **Frontend Framework**: SvelteKit
- **Static Site Generator**: SvelteKit with Static Adapter
- **Hosting**: GitHub Pages
- **Languages**: Svelte, TypeScript, CSS
- **Internationalization**: svelte-i18n

## 📁 프로젝트 구조

```
├── src/
│   ├── lib/
│   │   ├── components/          # Svelte 컴포넌트
│   │   ├── i18n/               # 다국어 지원
│   │   └── utils/              # 유틸리티 함수
│   ├── routes/                 # SvelteKit 라우트
│   ├── app.html               # HTML 템플릿
│   └── app.css                # 글로벌 스타일
├── static/                     # 정적 자산
│   └── assets/                # 이미지 등
├── .github/                    # GitHub Actions
└── package.json               # 프로젝트 설정
```

## 🚀 로컬 개발

### 필요 조건
- Node.js (>= 18)
- npm

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프리뷰
npm run preview
```

## 🚀 주요 기능

- **반응형 디자인**: 모든 디바이스에서 최적화된 경험
- **다국어 지원**: 한국어/영어 실시간 전환
- **모던한 UI/UX**: 깔끔하고 직관적인 인터페이스
- **빠른 로딩**: SvelteKit의 최적화된 성능
- **SEO 최적화**: 검색 엔진 친화적 구조
- **정적 사이트 생성**: GitHub Pages 호환

## 🌍 다국어 지원

`svelte-i18n`을 사용하여 구현된 다국어 지원:
- 한국어 (기본)
- 영어
- 실시간 언어 전환
- 브라우저 언어 자동 감지

## 🔧 커스터마이징

### 개인 정보 수정
`src/lib/i18n/locales/` 폴더의 언어별 JSON 파일을 수정하세요.

### 스타일 수정
- `src/app.css`: 글로벌 스타일
- 각 컴포넌트의 `<style>` 섹션: 컴포넌트별 스타일

### 새 섹션 추가
1. `src/lib/components/`에 새 컴포넌트 생성
2. `src/routes/+page.svelte`에 컴포넌트 추가
3. 다국어 텍스트를 `src/lib/i18n/locales/`에 추가

## 🔄 배포

GitHub Pages를 통한 자동 배포:
1. `main` 브랜치에 푸시
2. GitHub Actions가 자동으로 빌드 및 배포
3. `gh-pages` 브랜치에 정적 파일 생성

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 연락처

- **이메일**: wintrover@gmail.com
- **GitHub**: [@wintrover](https://github.com/wintrover)
- **LinkedIn**: [suhyok-yun-1934b713a](https://linkedin.com/in/suhyok-yun-1934b713a)