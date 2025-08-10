# 윤수혁 포트폴리오 웹사이트

윤수혁의 개인 포트폴리오 웹사이트입니다.

## 🌐 웹사이트

- **메인 사이트**: [wintrover.github.io](https://wintrover.github.io)
- **한국어**: [wintrover.github.io/ko](https://wintrover.github.io/ko)
- **English**: [wintrover.github.io](https://wintrover.github.io)

## 🛠 기술 스택

- **Static Site Generator**: Jekyll
- **Theme**: Modern Resume Theme (Customized)
- **Hosting**: GitHub Pages
- **Languages**: HTML, SCSS, JavaScript
- **Internationalization**: Jekyll Polyglot

## 📁 프로젝트 구조

```
├── _data/                  # 데이터 파일
│   ├── en/                # 영어 콘텐츠
│   └── ko/                # 한국어 콘텐츠
├── _includes/             # Jekyll include 파일
├── _layouts/              # Jekyll 레이아웃
├── _sass/                 # SCSS 스타일시트
├── assets/                # 정적 자산 (이미지, JS, CSS)
│   ├── images/           # 이미지 파일
│   └── js/               # JavaScript 파일
├── pages/                 # 페이지 파일들
│   ├── ko/               # 한국어 페이지
│   └── blog/             # 블로그 페이지
├── .github/               # GitHub Actions 워크플로우
├── _config.yml            # Jekyll 설정
└── index.md               # 메인 페이지
```

## 🚀 로컬 개발

### 필요 조건
- Ruby (>= 2.7)
- Bundler

### 설치 및 실행
```bash
# 의존성 설치
bundle install

# 로컬 서버 실행
bundle exec jekyll serve

# 다국어 지원으로 실행
bundle exec jekyll serve --config _config.yml
```

## 📝 콘텐츠 수정

### 개인 정보 수정
- `_config.yml`: 기본 설정 및 개인 정보
- `_data/en/strings.yml`: 영어 콘텐츠
- `_data/ko/strings.yml`: 한국어 콘텐츠

### 프로젝트 추가
1. `_config.yml`의 `content.projects` 섹션에 새 프로젝트 ID 추가
2. `_data/[lang]/strings.yml`에 해당 프로젝트 정보 추가

### 경력 추가
1. `_config.yml`의 `content.experience` 섹션에 새 경력 ID 추가
2. `_data/[lang]/strings.yml`에 해당 경력 정보 추가

## 🌍 다국어 지원

이 웹사이트는 Jekyll Polyglot을 사용하여 한국어와 영어를 지원합니다.

- 기본 언어: 영어 (`en`)
- 지원 언어: 한국어 (`ko`)

## 📊 SEO 및 분석

- **Google Analytics**: 설정됨
- **SEO 최적화**: Jekyll SEO Tag 플러그인 사용
- **Sitemap**: 자동 생성
- **RSS Feed**: 자동 생성

## 🔧 배포

GitHub Pages를 통해 자동 배포됩니다.

- `main` 브랜치: 프로덕션 배포
- `develop` 브랜치: 개발 브랜치

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 연락처

- **이메일**: wintrover@gmail.com
- **GitHub**: [@wintrover](https://github.com/wintrover)
- **LinkedIn**: [suhyok-yun-1934b713a](https://linkedin.com/in/suhyok-yun-1934b713a)