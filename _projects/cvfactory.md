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

<style>
/* 세부 항목 스타일 */
details.challenge-item {
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

details.challenge-item summary {
  padding: 15px;
  cursor: pointer;
  position: relative;
  background-color: #f8f9fa;
  transition: background-color 0.3s;
  list-style: none;
}

details.challenge-item summary::-webkit-details-marker {
  display: none;
}

details.challenge-item summary::after {
  content: '\25BC';
  font-size: 0.8em;
  color: #555;
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  transition: transform 0.3s;
}

details.challenge-item[open] summary::after {
  transform: translateY(-50%) rotate(180deg);
}

details.challenge-item summary:hover {
  background-color: #f0f0f0;
}

details.challenge-item[open] summary {
  border-bottom: 1px solid #e0e0e0;
}

details.challenge-item .challenge-content {
  padding: 20px;
}

details.challenge-item summary h3 {
  margin: 0;
  display: inline;
}
</style>

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

<hr class="subsection-divider">

<!-- Technical Challenges and Solutions Section -->
<div class="section">
  <h2 data-en="Technical Challenges and Solutions" data-ko="기술적 도전과 해결 과정"></h2>
  <p data-en="Key challenges faced during development and the innovative solutions implemented." data-ko="개발 과정에서 직면한 주요 도전 과제와 구현된 혁신적인 해결책입니다."></p>

  <hr class="subsection-divider">

  <div class="challenges">
    <details class="challenge-item">
      <summary>
        <h3 data-en="CSRF Protection Middleware Issue" data-ko="CSRF 보호 미들웨어 문제"></h3>
      </summary>
      <div class="challenge-content">
        <div class="challenge-description">
          <h4 data-en="Problem" data-ko="문제"></h4>
          <p data-en="Encountered 'MiddlewareMixin.init() missing 1 required positional argument: get_response' error during CSRF verification in API views, causing insecure API endpoints despite Django's built-in protection." data-ko="API 뷰의 CSRF 검증 중 'MiddlewareMixin.init() missing 1 required positional argument: get_response' 오류가 발생하여 Django의 내장 보호 기능에도 불구하고 API 엔드포인트가 안전하지 않게 되었습니다."></p>
          
          <h4 data-en="Solution" data-ko="해결책"></h4>
          <p data-en="Replaced direct instantiation of CsrfViewMiddleware with proper Django decorators (@csrf_protect) and implemented get_token(request) for token generation, maintaining security while fixing the initialization error." data-ko="CsrfViewMiddleware의 직접 인스턴스화를 적절한 Django 데코레이터(@csrf_protect)로 대체하고 토큰 생성을 위해 get_token(request)를 구현하여 초기화 오류를 수정하면서 보안을 유지했습니다."></p>
          
          <div class="code-snippet">
{% highlight python %}
# 수정 전
try:
    reason = CsrfViewMiddleware().process_view(request, None, (), {})
    if reason:
        logger.error(f" CSRF 보호로 인해 403 발생: {reason}")
except Exception as e:
    logger.error(f" CSRF 검사 중 오류 발생: {str(e)}")

# 수정 후
@api_view(["OPTIONS", "POST", "GET"])
@permission_classes([AllowAny])
@csrf_protect  # @csrf_exempt 대신 @csrf_protect 사용
@ensure_csrf_cookie
def create_resume(request):
    # CSRF 토큰 생성 및 가져오기
    csrf_token = get_token(request)
    logger.debug(f" CSRF 쿠키: {request.COOKIES.get('csrftoken')}")
    logger.debug(f" CSRF 토큰: {csrf_token}")
    # ... 기존 코드 ...
{% endhighlight %}
          </div>
        </div>
      </div>
    </details>

    <hr class="subsection-divider">

    <details class="challenge-item">
      <summary>
        <h3 data-en="Groq API Token Limit Overflow" data-ko="Groq API 토큰 한도 초과 문제"></h3>
      </summary>
      <div class="challenge-content">
        <div class="challenge-description">
          <h4 data-en="Problem" data-ko="문제"></h4>
          <p data-en="API calls failed with '413: Request too large for model qwen-qwq-32b' errors, as our request with job descriptions, company info, and user stories exceeded the 6,000 token limit (requesting 12,097 tokens)." data-ko="채용 공고, 회사 정보, 사용자 스토리를 포함한 요청이 6,000 토큰 한도를 초과하여(12,097 토큰 요청) '413: Request too large for model qwen-qwq-32b' 오류로 API 호출이 실패했습니다."></p>
          
          <h4 data-en="Solution" data-ko="해결책"></h4>
          <p data-en="Implemented a multi-stage approach that breaks down the request into three smaller API calls: 1) job/company analysis (1,500 tokens), 2) resume draft creation (2,000 tokens), and 3) final resume polishing (2,000 tokens)." data-ko="요청을 세 개의 작은 API 호출로 분할하는 다단계 접근 방식을 구현했습니다: 1) 채용/회사 분석(1,500 토큰), 2) 자기소개서 초안 작성(2,000 토큰), 3) 최종 자기소개서 완성(2,000 토큰)."></p>
          
          <div class="code-snippet">
{% highlight python %}
# 수정 전: 단일 대형 API 호출
def generate_resume(job_description, user_story, company_info = ""):
    # ... 기존 코드 ...
    response = client.chat.completions.create(
        model="qwen-qwq-32b",
        messages=[
            {"role": "system", "content": "당신은 자기소개서 전문가입니다..."},
            {"role": "user", "content": prompt}  # 거대한 프롬프트
        ],
        temperature=0.7,
        max_tokens=3000  # 출력 토큰 수 조정
    )
    # ... 기존 코드 ...

# 수정 후: 3단계 API 호출 접근 방식
def generate_resume(job_description, user_story, company_info=""):
    # 1단계: 채용 공고와 회사 정보 분석
    job_analysis = analyze_job_and_company(job_description, company_info)
    
    # 2단계: 자기소개서 초안 작성
    resume_draft = create_resume_draft(job_analysis, user_story)
    
    # 3단계: 최종 자기소개서 완성
    final_resume = finalize_resume(resume_draft)
    
    return final_resume
{% endhighlight %}
          </div>
        </div>
      </div>
    </details>
  </div>
</div>

<hr class="subsection-divider">

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
