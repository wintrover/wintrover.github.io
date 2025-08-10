# Svelte Portfolio

Jekyll에서 Svelte로 리팩토링된 포트폴리오 사이트입니다.

## 🚀 주요 기능

- 🌐 **다국어 지원**: 한국어/영어 실시간 전환
- 📱 **반응형 디자인**: 모든 디바이스에서 최적화된 경험
- ⚡ **빠른 로딩**: SvelteKit의 최적화된 번들링
- 🎨 **모던한 UI/UX**: 깔끔하고 전문적인 디자인
- 📊 **섹션별 네비게이션**: 스무스 스크롤과 활성 섹션 표시
- 🔄 **스크롤 애니메이션**: 부드러운 페이지 전환 효과
- 📧 **연락처 통합**: 소셜 링크와 이메일 연동

## 🛠️ 기술 스택

- **Frontend**: SvelteKit, JavaScript
- **Styling**: CSS3 (Custom Properties, Flexbox, Grid)
- **Icons**: Font Awesome 6
- **Internationalization**: svelte-i18n
- **Build Tool**: Vite
- **Deployment**: Static Site Generation

## 📦 설치 및 실행

```bash
# 프로젝트 클론
git clone <repository-url>
cd svelte-portfolio

# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 타입 체크
npm run check
```

## 📁 프로젝트 구조

```
svelte-portfolio/
├── src/
│   ├── lib/
│   │   ├── components/          # 재사용 가능한 컴포넌트
│   │   │   ├── Header.svelte
│   │   │   ├── AboutSection.svelte
│   │   │   ├── ProjectsSection.svelte
│   │   │   ├── ExperienceSection.svelte
│   │   │   ├── EducationSection.svelte
│   │   │   ├── Footer.svelte
│   │   │   ├── ScrollToTop.svelte
│   │   │   └── LoadingSpinner.svelte
│   │   ├── i18n/               # 다국어 설정
│   │   │   ├── index.js
│   │   │   └── locales/
│   │   │       ├── ko.json
│   │   │       └── en.json
│   │   └── utils/
│   │       └── animations.js    # 애니메이션 유틸리티
│   ├── routes/
│   │   ├── +layout.svelte      # 레이아웃
│   │   └── +page.svelte        # 메인 페이지
│   ├── app.html                # HTML 템플릿
│   └── app.css                 # 글로벌 스타일
├── static/                     # 정적 파일
│   └── assets/
│       └── images/             # 이미지 파일들
└── package.json
```

## 🎨 컴포넌트 설명

### Header
- 고정 네비게이션 바
- 언어 전환 버튼
- 활성 섹션 하이라이트

### AboutSection
- 프로필 이미지와 소개
- 연락처 정보
- 반응형 그리드 레이아웃

### ProjectsSection
- 프로젝트 카드 형태
- 외부 링크 (GitHub, Demo, YouTube)
- 호버 효과와 애니메이션

### ExperienceSection
- 타임라인 형태의 경력 표시
- 좌우 교대 레이아웃
- 반응형 모바일 최적화

### EducationSection
- 아이콘과 함께 학력 표시
- 카드 형태의 깔끔한 디자인

### Footer
- 소셜 링크 모음
- 저작권 정보
- 반응형 레이아웃

## 🌐 배포

### GitHub Pages
```bash
npm run build
# build 폴더를 GitHub Pages에 배포
```

### Netlify
```bash
# Build command: npm run build
# Publish directory: build
```

### Vercel
```bash
# Framework Preset: SvelteKit
# Build Command: npm run build
```

## 📝 커스터마이징

### 색상 변경
`src/app.css`에서 CSS 변수를 수정:
```css
:root {
  --primary-color: #007acc;
  --secondary-color: #f8f9fa;
  --text-color: #333;
}
```

### 콘텐츠 수정
`src/lib/i18n/locales/` 폴더의 JSON 파일에서 텍스트 수정

### 이미지 추가
`static/assets/images/` 폴더에 이미지 파일 추가

## ✅ 완성된 기능

- ✅ **기본 프로젝트 구조**: SvelteKit + Vite 설정
- ✅ **다국어 지원**: svelte-i18n 완전 통합
- ✅ **헤더 및 네비게이션**: 스무스 스크롤, 활성 섹션 표시
- ✅ **About 섹션**: 프로필, 소개, 연락처
- ✅ **Projects 섹션**: 프로젝트 카드, 외부 링크
- ✅ **Experience 섹션**: 타임라인 형태의 경력 표시
- ✅ **Education 섹션**: 학력 정보 카드
- ✅ **Footer**: 소셜 링크, 저작권 정보
- ✅ **스크롤 투 탑**: 부드러운 상단 이동 버튼
- ✅ **로딩 스피너**: 다국어 로딩 중 표시
- ✅ **반응형 디자인**: 모바일 최적화
- ✅ **SEO 최적화**: 메타 태그, Open Graph
- ✅ **애니메이션**: CSS 애니메이션과 전환 효과

## 🔄 Jekyll에서 마이그레이션된 내용

- **설정 파일**: `_config.yml` → `svelte.config.js`
- **다국어 데이터**: `_data/[lang]/strings.yml` → `src/lib/i18n/locales/[lang].json`
- **레이아웃**: Jekyll 템플릿 → Svelte 컴포넌트
- **스타일**: SCSS → CSS3 (Custom Properties)
- **빌드 시스템**: Jekyll → SvelteKit + Vite

## 📞 지원

문제가 있거나 개선 사항이 있다면 이슈를 생성해주세요.

---

**Built with ❤️ using SvelteKit**