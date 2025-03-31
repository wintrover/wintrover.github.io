---
title: CVFactory
layout: project
description: An automated personal statement generation tool that creates professional documents from raw data.
ko_title: 자소서공장
ko_description: 원시 데이터에서 전문적인 자기소개서를 생성하는 자동화된 자소서 생성 도구입니다.
dev_period: In progress
ko_dev_period: 진행 중
github_link: https://github.com/wintrover/CVFactory
skills: 
  - Python
  - Django
  - Groq API
  - Selenium
---

<!-- Project Logo -->
<div class="logo-container" style="text-align: center; margin-bottom: 30px;">
  <img src="{{ site.baseurl }}/images/CVFactory_logo.png" alt="자소서공장 로고" style="max-width: 200px;">
</div>

<!-- Development Process Section -->
<div class="section">
  <h2 data-en="Development Process and Overview" data-ko="개발 과정 및 개요"></h2>
  <p data-en="Key features and components of the automated personal statement generation tool." data-ko="자동화된 자기소개서 생성 도구의 주요 기능 및 구성 요소"></p>

  <hr class="subsection-divider">

  <!-- 주요 기능 섹션 -->
  <div class="section">
    <h3 data-en="Key Features" data-ko="주요 기능"></h3>
    <ul class="features">
      <li data-en="Job Posting Crawler: Automatically collects relevant job information when a recruitment site URL is entered" data-ko="채용 공고 크롤링: 채용 사이트 URL을 입력하면 관련 채용 정보를 자동으로 수집"></li>
      <li data-en="Company Information Crawler: Gathers company vision, mission, values, and other information through the company website URL" data-ko="기업 정보 크롤링: 기업 홈페이지 URL을 통해 기업의 비전, 미션, 가치관 등 정보 수집"></li>
      <li data-en="Customized Cover Letter Generation: Automatically generates personalized cover letters using Groq API" data-ko="맞춤형 자기소개서 생성: Groq API를 활용하여 개인화된 자기소개서 자동 생성"></li>
    </ul>
  </div>

  <hr class="subsection-divider">

  <!-- 기술 스택 섹션 -->
  <div class="section">
    <h3 data-en="Technology Stack" data-ko="기술 스택"></h3>
    <div class="tech-stack">
      <div class="tech-category">
        <h4 data-en="Backend" data-ko="백엔드"></h4>
        <ul>
          <li>Django</li>
          <li>Django REST Framework</li>
          <li>Groq API</li>
          <li>Selenium / BeautifulSoup</li>
        </ul>
      </div>
      <div class="tech-category">
        <h4 data-en="Frontend" data-ko="프론트엔드"></h4>
        <ul>
          <li>HTML/CSS/JavaScript</li>
          <li>Bootstrap</li>
        </ul>
      </div>
      <div class="tech-category">
        <h4 data-en="Deployment" data-ko="배포"></h4>
        <ul>
          <li>Docker</li>
          <li>Git</li>
        </ul>
      </div>
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 개발 과정 -->
  <div class="section">
    <h3 data-en="Development Journey" data-ko="개발 여정"></h3>
    <p data-en="The project was developed to streamline the personal statement creation process, especially for job seekers who need to highlight specific achievements and qualifications." data-ko="이 프로젝트는 특히 특정 성과와 자격을 강조해야 하는 구직자를 위해 자기소개서 작성 과정을 간소화하기 위해 개발되었습니다."></p>
    
    <div class="dev-timeline">
      <div class="timeline-item">
        <h4 data-en="Phase 1: Web Crawling System" data-ko="1단계: 웹 크롤링 시스템"></h4>
        <p data-en="Developed robust crawlers for job postings and company information using Selenium and BeautifulSoup to extract structured data from diverse sources." data-ko="Selenium과 BeautifulSoup을 활용하여 다양한 소스에서 구조화된 데이터를 추출하는 채용 공고 및 기업 정보 크롤러를 개발했습니다."></p>
      </div>
      <div class="timeline-item">
        <h4 data-en="Phase 2: Django Backend & API" data-ko="2단계: Django 백엔드 및 API"></h4>
        <p data-en="Built a Django application with REST API endpoints for serving crawled data and managing user requests, along with data persistence and authentication system." data-ko="크롤링된 데이터를 제공하고 사용자 요청을 관리하기 위한 REST API 엔드포인트와 함께 데이터 지속성 및 인증 시스템을 갖춘 Django 애플리케이션을 구축했습니다."></p>
      </div>
      <div class="timeline-item">
        <h4 data-en="Phase 3: AI Integration" data-ko="3단계: AI 통합"></h4>
        <p data-en="Integrated Groq API to generate high-quality personal statements based on job descriptions, user profiles, and company information with optimized prompts for consistent results." data-ko="채용 공고, 사용자 프로필 및 기업 정보를 기반으로 일관된 결과를 위한 최적화된 프롬프트로 고품질 자기소개서를 생성하는 Groq API를 통합했습니다."></p>
      </div>
    </div>
  </div>
</div>

<!-- Code Examples Section -->
<div class="section">
  <h2 data-en="Code Examples" data-ko="코드 예시"></h2>
  
  <div class="code-block">
    <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight python %}
# Groq API를 활용한 자기소개서 생성 코드
import os
from dotenv import load_dotenv
import groq
import re
import logging

# .env 파일 로드
load_dotenv(dotenv_path="groq.env")

# Groq API 키 설정
api_key = os.getenv("GROQ_API_KEY")

# Groq 클라이언트 초기화
client = groq.Client(api_key=api_key)

def generate_resume(job_description, user_story, company_info = ""):
    """
    Groq API를 호출하여 자기소개서를 생성하는 함수
    """
    prompt = f"""
    채용 공고 설명: {job_description}
    사용자의 이야기: {user_story}
    회사 정보: {company_info}

    위 정보를 바탕으로 다음 구조의 자기소개서를 작성하세요:

    1. 핵심역량과 지원동기 요약 (두괄식)
    2. 회사가 당면한 문제와 채용의 배경 분석
    3. 회사의 비전/인재상 분석 및 지원자 역량과의 연결성
    4. 문제해결 능력과 관련 경험 (수치로 표현)
    5. 입사 후 기여 가능 분야 및 예상 성과 (수치로 제시)
    6. 핵심 경쟁력 강조
    """

    try:
        # Groq API 호출
        response = client.chat.completions.create(
            model="qwen-qwq-32b",  # qwen-qwq-32b 모델 사용
            messages=[
                {"role": "system", "content": "당신은 자기소개서 전문가입니다. 주어진 채용 공고와 지원자 정보를 바탕으로 맞춤형 자기소개서를 작성해주세요."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=3000
        )
        
        # 응답 처리
        generated_resume = response.choices[0].message.content
        return generated_resume

    except Exception as e:
        return "자기소개서 생성 중 오류가 발생했습니다. 다시 시도해 주세요."
{% endhighlight %}
  </div>
  
  <div class="code-block">
    <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight python %}
# 채용 공고 크롤링 코드
import requests
from bs4 import BeautifulSoup
import logging
import re
from typing import Optional
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# 로깅 설정
logger = logging.getLogger('crawlers')

class WebScrapingError(Exception):
    """웹 스크래핑 관련 사용자 정의 예외"""
    pass

def create_session():
    """ HTTP 요청 세션 생성 (재시도 설정 포함)"""
    session = requests.Session()
    retries = Retry(
        total=3,  # 최대 재시도 횟수
        backoff_factor=1,  # 재시도 간격
        status_forcelist=[429, 500, 502, 503, 504],  # 재시도할 HTTP 상태 코드
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def fetch_job_description(url: str) -> Optional[str]:
    """ 주어진 URL에서 채용 공고 정보를 크롤링하여 텍스트로 반환"""
    session = create_session()
    try:
        logger.info(f"채용 공고 크롤링 시작: {url}")

        # HTTP 요청 헤더 설정 (User-Agent 지정)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        # HTTP 요청 실행 (타임아웃 10초 설정)
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # HTTP 오류 발생 시 예외 발생

        # 응답 인코딩 설정
        response.encoding = response.apparent_encoding or 'utf-8'
        html_content = response.text

        # HTML 파싱
        soup = BeautifulSoup(html_content, 'html.parser')
        raw_text = soup.get_text(separator='\n')

        # 텍스트 정제
        cleaned_text = clean_text(raw_text)
        return cleaned_text

    except requests.exceptions.RequestException as e:
        logger.error(f"HTTP 요청 오류: {str(e)}", exc_info=True)
        raise WebScrapingError(f"HTTP 요청 오류 발생: {str(e)}")
        
def clean_text(text: str) -> str:
    """ 크롤링된 텍스트에서 불필요한 문자를 제거하여 정제"""
    try:
        # 괄호와 그 안의 내용 제거
        text = re.sub(r'\(.*?\)', '', text)  # 소괄호 제거
        text = re.sub(r'\[.*?\]', '', text)  # 대괄호 제거

        # 연속된 공백 및 줄바꿈 정리
        text = re.sub(r'\s+', ' ', text).strip()

        # 유니코드 제어 문자 제거
        text = re.sub(r'[\x00-\x1F\x7F]', '', text)

        return text
    except re.error as e:
        logger.error(f"정규식 오류: {str(e)}")
        raise
{% endhighlight %}
  </div>
</div>

<!-- Future Improvements Section -->
<div class="section">
  <h2 data-en="Future Improvements" data-ko="향후 개선 사항"></h2>
  <ul class="future-items">
    <li data-en="AI-powered content suggestions for more persuasive statements" data-ko="더 설득력 있는 내용을 위한 AI 기반 콘텐츠 제안"></li>
    <li data-en="Keyword optimization for job description matching" data-ko="채용 공고 매칭을 위한 키워드 최적화"></li>
    <li data-en="Integration with job platforms for direct application" data-ko="직접 지원을 위한 채용 플랫폼과의 통합"></li>
    <li data-en="Expanded template library with industry-specific designs" data-ko="산업별 디자인이 포함된 확장된 템플릿 라이브러리"></li>
  </ul>
</div> 
