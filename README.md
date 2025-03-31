# Su Hyok Yun 포트폴리오 웹사이트

Jekyll을 사용한 개인 포트폴리오 웹사이트입니다.

## 로컬 개발 환경 설정

### 필수 요구사항

- Ruby 2.7.0 이상
- RubyGems
- GCC 및 Make

### 설치 및 실행

1. 필요한 gem 설치:
```
bundle install
```

2. 로컬 서버 실행:
```
bundle exec jekyll serve
```

3. 브라우저에서 `http://localhost:4000` 접속

## 로컬 개발과 GitHub Pages 환경 차이

로컬 개발 환경과 GitHub Pages 환경이 다를 경우 아래와 같이 설정합니다:

1. 로컬에서는 `_config.yml`의 `baseurl`을 변경할 수 있습니다:
```
baseurl: "/wintrover.github.io" # 로컬 개발 환경
```

2. GitHub Pages에 배포 시:
```
baseurl: "" # GitHub Pages 환경
```

## 새 프로젝트 추가 방법

1. `_projects` 폴더에 새 프로젝트 폴더 생성
2. 해당 폴더 내에 `index.md` 파일 생성
3. Front matter 작성:
```yaml
---
layout: project
title: "프로젝트 제목"
description: "프로젝트 설명"
dev_period: "개발 기간"
github_link: "GitHub 링크"
youtube_embed: "유튜브 임베드 링크"
skills: 
  - 기술1
  - 기술2
---
```
4. 프로젝트 내용 작성