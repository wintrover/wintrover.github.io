---
layout: default
title: 홈
---

# 환영합니다!

이곳은 제 개발 블로그입니다. 다양한 프로젝트와 기술 관련 내용을 공유합니다.

## 최근 게시물

<ul>
  {% for post in site.posts limit:5 %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      <span>({{ post.date | date_to_string }})</span>
    </li>
  {% endfor %}
</ul>

<a href="/posts/">모든 게시물 보기</a>