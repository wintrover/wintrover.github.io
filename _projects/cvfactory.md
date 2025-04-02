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
    # 1단계: 채용/회사 분석
    job_analysis = analyze_job_and_company(job_description, company_info)
    
    # 2단계: 자기소개서 초안 작성
    resume_draft = create_resume_draft(job_analysis, user_story)
    
    # 3단계: 최종 자기소개서 완성
    final_resume = finalize_resume(resume_draft)
    
    return final_resume
{% endhighlight %}
          </div>

          <h4 data-en="Additional Improvements" data-ko="추가 개선사항"></h4>
          <p data-en="Further refined the solution by breaking down the functions into smaller, more manageable pieces:" data-ko="함수들을 더 작고 관리하기 쉬운 단위로 분리하여 해결책을 추가로 개선했습니다:"></p>
          
          <ul>
            <li data-en="Resume Draft Creation:" data-ko="자기소개서 초안 작성:">
              <ul>
                <li data-en="create_resume_intro: Introduction section" data-ko="create_resume_intro: 도입부 섹션"></li>
                <li data-en="create_resume_body: Main body section" data-ko="create_resume_body: 본문 섹션"></li>
                <li data-en="create_resume_conclusion: Conclusion section" data-ko="create_resume_conclusion: 마무리 섹션"></li>
              </ul>
            </li>
            <li data-en="Resume Finalization:" data-ko="자기소개서 완성:">
              <ul>
                <li data-en="finalize_resume_metrics: Emphasize quantified achievements" data-ko="finalize_resume_metrics: 수치화된 성과 강조"></li>
                <li data-en="finalize_resume_style: Improve writing style" data-ko="finalize_resume_style: 문체 개선"></li>
                <li data-en="finalize_resume_emphasis: Adjust emphasis points" data-ko="finalize_resume_emphasis: 강조점 조정"></li>
              </ul>
            </li>
          </ul>

          <h4 data-en="Current Status and Next Steps" data-ko="현재 상태 및 다음 단계"></h4>
          <p data-en="Current token usage:" data-ko="현재 토큰 사용량:"></p>
          <ul>
            <li data-en="generate_resume: 12,097 tokens (limit: 6,000)" data-ko="generate_resume: 12,097 토큰 (제한: 6,000)"></li>
            <li data-en="analyze_job_and_company: 11,194 tokens (limit: 6,000)" data-ko="analyze_job_and_company: 11,194 토큰 (제한: 6,000)"></li>
          </ul>
          <p data-en="Next steps:" data-ko="다음 단계:"></p>
          <ul>
            <li data-en="Reduce input data size (especially company_info and user_story)" data-ko="입력 데이터 크기 줄이기 (특히 company_info와 user_story)"></li>
            <li data-en="Improve debug logging for better token usage monitoring" data-ko="토큰 사용량 모니터링을 위한 디버그 로깅 개선"></li>
            <li data-en="Fix Django ALLOWED_HOSTS configuration" data-ko="Django ALLOWED_HOSTS 설정 수정"></li>
          </ul>
        </div>
      </div>
    </details>

    <hr class="subsection-divider">

    <details class="challenge-item">
      <summary>
        <h3 data-en="Frontend-Backend CSRF Token Integration" data-ko="프론트엔드-백엔드 CSRF 토큰 통합 문제"></h3>
      </summary>
      <div class="challenge-content">
        <div class="challenge-description">
          <h4 data-en="Problem" data-ko="문제"></h4>
          <p data-en="Cross-site request forgery (CSRF) warnings appeared in logs during resume creation API calls. Frontend JavaScript wasn't properly handling CSRF tokens required by Django's security middleware, leading to potential 403 errors." data-ko="자기소개서 생성 API 호출 중 로그에 교차 사이트 요청 위조(CSRF) 경고가 표시되었습니다. 프론트엔드 JavaScript가 Django의 보안 미들웨어에서 요구하는 CSRF 토큰을 제대로 처리하지 않아 403 오류가 발생할 가능성이 있었습니다."></p>
          
          <h4 data-en="Solution" data-ko="해결책"></h4>
          <p data-en="Implemented a two-step API call approach in the frontend JavaScript: first request fetches the CSRF token, then the second request includes this token in the header for secure API calls." data-ko="프론트엔드 JavaScript에서 두 단계 API 호출 접근 방식을 구현했습니다: 첫 번째 요청은 CSRF 토큰을 가져오고, 두 번째 요청은 안전한 API 호출을 위해 헤더에 이 토큰을 포함합니다."></p>
          
          <div class="code-snippet">
{% highlight javascript %}
// 수정 전: CSRF 토큰 없이 직접 API 호출
async function generateResume() {
    const data = {
        recruitment_notice_url: document.getElementById('job-url').value,
        target_company_url: document.getElementById('company-url').value,
        user_story: document.getElementById('user-story').value
    };

    try {
        const response = await fetch('/api/resume/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        // ... 결과 처리 ...
    } catch (error) {
        console.error('Error:', error);
    }
}

// 수정 후: CSRF 토큰을 먼저 요청 후 API 호출
async function generateResume() {
    const data = {
        recruitment_notice_url: document.getElementById('job-url').value,
        target_company_url: document.getElementById('company-url').value,
        user_story: document.getElementById('user-story').value
    };

    try {
        // 1단계: CSRF 토큰 가져오기
        const tokenResponse = await fetch('/api/resume/create/', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        if (tokenResponse.ok) {
            // 2단계: 토큰을 사용하여 실제 요청
            const csrfToken = tokenResponse.headers.get('X-CSRFToken');
            
            const response = await fetch('/api/resume/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify(data)
            });
            // ... 결과 처리 ...
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
{% endhighlight %}
          </div>

          <h4 data-en="Backend CSRF Handler Improvements" data-ko="백엔드 CSRF 핸들러 개선사항"></h4>
          <p data-en="Also modified the Django backend view to properly handle CSRF tokens with appropriate decorators:" data-ko="적절한 데코레이터로 CSRF 토큰을 올바르게 처리하도록 Django 백엔드 뷰도 수정했습니다:"></p>
          
          <div class="code-snippet">
{% highlight python %}
# 수정 전: 데코레이터 순서 문제
@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def create_resume(request):
    # ... 기존 코드 ...

# 수정 후: 최적화된 데코레이터 순서와 CSRF 토큰 관리
@api_view(["OPTIONS", "POST", "GET"])
@permission_classes([AllowAny])
@csrf_protect  # @csrf_exempt 대신 @csrf_protect 사용
@ensure_csrf_cookie  # 쿠키에 CSRF 토큰 보장
def create_resume(request):
    # CSRF 토큰 명시적 생성 및 로깅
    csrf_token = get_token(request)
    logger.debug(f" CSRF 쿠키: {request.COOKIES.get('csrftoken')}")
    logger.debug(f" CSRF 토큰: {csrf_token}")
    
    if request.method == "GET":
        # GET 요청을 통해 CSRF 토큰 제공
        return Response({"detail": "CSRF 토큰이 쿠키에 설정되었습니다"}, status=200)
        
    # POST 요청 처리
    # ... 기존 코드 ...
{% endhighlight %}
          </div>

          <h4 data-en="Results and Impact" data-ko="결과 및 영향"></h4>
          <p data-en="After implementing these changes:" data-ko="이러한 변경 사항을 구현한 후:"></p>
          <ul>
            <li data-en="<strong>CSRF warning messages in logs were eliminated</strong>" data-ko="<strong>로그의 CSRF 경고 메시지가 제거되었습니다</strong>"></li>
            <li data-en="<strong>Resume generation API calls succeeded consistently</strong>" data-ko="<strong>자기소개서 생성 API 호출이 일관되게 성공했습니다</strong>"></li>
            <li data-en="<strong>Improved overall security posture of the application</strong>" data-ko="<strong>애플리케이션의 전반적인 보안 태세가 향상되었습니다</strong>"></li>
            <li data-en="<strong>Front-end now properly manages CSRF tokens for all API interactions</strong>" data-ko="<strong>프론트엔드는 이제 모든 API 상호 작용에 대해 CSRF 토큰을 적절하게 관리합니다</strong>"></li>
          </ul>

          <h4 data-en="Additional Security Enhancement" data-ko="추가 보안 개선사항"></h4>
          <p data-en="Modified backend to handle OPTIONS requests for CORS preflight checks, enhancing cross-origin security without compromising functionality." data-ko="CORS 프리플라이트 검사를 위한 OPTIONS 요청을 처리하도록 백엔드를 수정하여 기능을 손상시키지 않으면서 크로스 오리진 보안을 강화했습니다."></p>
        </div>
      </div>
    </details>
    
    <hr class="subsection-divider">
    
    <details class="challenge-item">
      <summary>
        <h3 data-en="Recent System Integration Improvements" data-ko="최근 시스템 통합 개선사항"></h3>
      </summary>
      <div class="challenge-content">
        <div class="challenge-description">
          <h4 data-en="Challenge Summary" data-ko="도전 과제 요약"></h4>
          <p data-en="Several concurrent issues were causing instability in the resume generation system: CSRF token mismanagement between frontend and backend, Groq API token limit overflows, and cross-domain security constraints." data-ko="여러 동시 문제로 인해 자기소개서 생성 시스템이 불안정했습니다: 프론트엔드와 백엔드 간의 CSRF 토큰 관리 문제, Groq API 토큰 한도 초과, 크로스 도메인 보안 제약 조건."></p>
          
          <h4 data-en="Comprehensive Solution" data-ko="종합적인 해결책"></h4>
          <p data-en="Implemented a multi-faceted approach focusing on three key areas:" data-ko="세 가지 주요 영역에 중점을 둔 다면적 접근 방식을 구현했습니다:"></p>
          
          <ol>
            <li data-en="<strong>Frontend-Backend CSRF Integration:</strong> Modified script.js to properly fetch and utilize CSRF tokens for API requests, eliminating 403 errors in production." data-ko="<strong>프론트엔드-백엔드 CSRF 통합:</strong> API 요청에 대한 CSRF 토큰을 올바르게 가져오고 활용하도록 script.js를 수정하여 프로덕션 환경에서 403 오류를 제거했습니다."></li>
            <li data-en="<strong>API Service Optimization:</strong> Restructured groq_service.py to break down large API calls into smaller, more manageable functions that respect token limits, resolving 'Request too large' errors." data-ko="<strong>API 서비스 최적화:</strong> 큰 API 호출을 토큰 한도를 준수하는 더 작고 관리하기 쉬운 함수로 분할하도록 groq_service.py를 재구성하여 '요청이 너무 큽니다' 오류를 해결했습니다."></li>
            <li data-en="<strong>Backend Security Enhancement:</strong> Refactored views.py with proper decorator ordering (@ensure_csrf_cookie before @csrf_protect) and comprehensive error handling for better debugging and security." data-ko="<strong>백엔드 보안 강화:</strong> 적절한 데코레이터 순서(@ensure_csrf_cookie가 @csrf_protect보다 먼저)와 더 나은 디버깅 및 보안을 위한 포괄적인 오류 처리로 views.py를 리팩토링했습니다."></li>
          </ol>
          
          <h4 data-en="Implementation Process" data-ko="구현 과정"></h4>
          <p data-en="The process followed a systematic debugging and resolution approach:" data-ko="체계적인 디버깅 및 해결 접근 방식을 따랐습니다:"></p>
          
          <ol>
            <li data-en="<strong>Log Analysis:</strong> Identified recurring error patterns in error.log, pinpointing CSRF issues and API token overflows" data-ko="<strong>로그 분석:</strong> error.log에서 반복되는 오류 패턴을 식별하여 CSRF 문제와 API 토큰 오버플로우 지점을 정확히 파악했습니다"></li>
            <li data-en="<strong>Code Review:</strong> Examined frontend-backend integration points, discovering mismatches in token handling" data-ko="<strong>코드 검토:</strong> 프론트엔드-백엔드 통합 지점을 검토하여 토큰 처리의 불일치를 발견했습니다"></li>
            <li data-en="<strong>Incremental Testing:</strong> Made targeted changes to each component, verifying fixes individually before system-wide testing" data-ko="<strong>점진적 테스트:</strong> 각 구성 요소에 대한 대상 변경을 수행하고 시스템 전체 테스트 전에 수정 사항을 개별적으로 확인했습니다"></li>
            <li data-en="<strong>Final Validation:</strong> Confirmed resolution with successful resume generation through multiple complete system tests" data-ko="<strong>최종 검증:</strong> 여러 완전한 시스템 테스트를 통한 성공적인 자기소개서 생성으로 해결을 확인했습니다"></li>
          </ol>
          
          <h4 data-en="Results and Impact" data-ko="결과 및 영향"></h4>
          <p data-en="The comprehensive solution delivered significant improvements:" data-ko="종합적인 해결책으로 상당한 개선을 이루었습니다:"></p>
          
          <ul>
            <li data-en="<strong>Stability:</strong> Eliminated unpredictable behavior in resume generation process" data-ko="<strong>안정성:</strong> 자기소개서 생성 과정에서 예측할 수 없는 동작을 제거했습니다"></li>
            <li data-en="<strong>Performance:</strong> Optimized API usage, reducing token consumption and speeding up generation" data-ko="<strong>성능:</strong> API 사용을 최적화하여 토큰 소비를 줄이고 생성 속도를 높였습니다"></li>
            <li data-en="<strong>Security:</strong> Properly implemented CSRF protection according to Django best practices" data-ko="<strong>보안:</strong> Django 모범 사례에 따라 CSRF 보호를 적절히 구현했습니다"></li>
            <li data-en="<strong>Reliability:</strong> System now consistently handles various inputs without errors" data-ko="<strong>신뢰성:</strong> 시스템이 이제 오류 없이 다양한 입력을 일관되게 처리합니다"></li>
          </ul>
          
          <h4 data-en="Code Changes Summary" data-ko="코드 변경 요약"></h4>
          <p data-en="Key files modified in this improvement:" data-ko="이 개선에서 수정된 주요 파일:"></p>
          
          <ul>
            <li data-en="<strong>frontend/script.js</strong>: Enhanced CSRF token handling in API requests" data-ko="<strong>frontend/script.js</strong>: API 요청에서 CSRF 토큰 처리 강화"></li>
            <li data-en="<strong>api/views.py</strong>: Improved request handling with proper decorator ordering" data-ko="<strong>api/views.py</strong>: 적절한 데코레이터 순서로 요청 처리 개선"></li>
            <li data-en="<strong>api/groq_service.py</strong>: Restructured API calls to respect token limits" data-ko="<strong>api/groq_service.py</strong>: 토큰 한도를 준수하도록 API 호출 재구성"></li>
          </ul>
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
