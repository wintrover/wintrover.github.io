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
        <h3 data-en="Environment Variable Integration and Security Enhancement" data-ko="환경 변수 통합 및 보안 강화"></h3>
      </summary>
      <div class="challenge-content">
        <div class="challenge-description">
          <h4 data-en="Problem" data-ko="문제"></h4>
          <p data-en="Multiple security issues were identified during the security audit: exposed sensitive information in Git (Django secret key, OAuth credentials), disabled CSRF protection, enabled debug mode in production, and excessively verbose logging that could leak sensitive data." data-ko="보안 감사 중 여러 보안 문제가 확인되었습니다: Git에 노출된 민감한 정보(Django 시크릿 키, OAuth 자격 증명), 비활성화된 CSRF 보호, 프로덕션 환경에서의 디버그 모드 활성화, 그리고 민감한 데이터가 유출될 수 있는 과도한 로깅 등이 있었습니다."></p>
          
          <h4 data-en="Solution" data-ko="해결책"></h4>
          <p data-en="Implemented a comprehensive security improvement plan:" data-ko="포괄적인 보안 개선 계획을 구현했습니다:"></p>
          
          <ol>
            <li data-en="Environment variable consolidation: Integrated scattered environment variables (.env, secretkey.env, groq.env) into a single .env file for better security management" data-ko="환경 변수 통합: 분산된 환경 변수(.env, secretkey.env, groq.env)를 단일 .env 파일로 통합하여 보안 관리 개선"></li>
            <li data-en="Strengthened .gitignore settings: Explicitly excluded all sensitive files to prevent accidental commits" data-ko=".gitignore 설정 강화: 실수로 인한 커밋을 방지하기 위해 모든 민감한 파일을 명시적으로 제외"></li>
            <li data-en="Enhanced CSRF protection: Replaced @csrf_exempt with @csrf_protect and fixed CSRF token setup in API endpoints" data-ko="CSRF 보호 강화: @csrf_exempt를 @csrf_protect로 대체하고 API 엔드포인트에서 CSRF 토큰 설정 수정"></li>
            <li data-en="Removed hardcoded secrets: Eliminated default hardcoded secret keys in settings.py" data-ko="하드코딩된 시크릿 제거: settings.py에서 기본 하드코딩된 시크릿 키 제거"></li>
          </ol>
          
          <div class="code-snippet">
{% highlight diff %}
# .gitignore 개선
+ *.env
+ .env
+ .env.*
+ secretkey.env
+ groq.env
+ *secret*.env
+ *api_key*.env
+ cvfactory/*.env

# settings.py 환경 변수 로드 개선
- load_dotenv(dotenv_path=BASE_DIR / "secretkey.env")
- SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-7q@k&$)+32d7r8nvr!sy3em4y^m19)58yf8)&_je+e&2f)parw")
+ load_dotenv(dotenv_path=BASE_DIR / ".env")
+ SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

# API 엔드포인트 CSRF 보호 개선
- @csrf_exempt  # CSRF 보호를 비활성화 (개발 환경에서만 사용)
+ @csrf_protect  # CSRF 보호 활성화
{% endhighlight %}
          </div>

          <h4 data-en="Results" data-ko="결과"></h4>
          <p data-en="The security improvements yielded several benefits:" data-ko="보안 개선으로 다음과 같은 이점을 얻었습니다:"></p>
          
          <ul>
            <li data-en="Enhanced API endpoint security with proper CSRF protection" data-ko="적절한 CSRF 보호로 API 엔드포인트 보안 강화"></li>
            <li data-en="Eliminated risk of exposing sensitive credentials in version control" data-ko="버전 관리에서 민감한 자격 증명이 노출될 위험 제거"></li>
            <li data-en="Better environment variable management through consolidation" data-ko="통합을 통한 환경 변수 관리 개선"></li>
            <li data-en="Maintained full application functionality with improved security" data-ko="보안이 향상된 상태에서 전체 애플리케이션 기능 유지"></li>
          </ul>
          
          <h4 data-en="Additional Security Recommendations" data-ko="추가 보안 권장사항"></h4>
          <p data-en="For future improvements:" data-ko="향후 개선 사항:"></p>
          
          <ul>
            <li data-en="Configure proper Django logging to prevent sensitive data leakage" data-ko="민감한 데이터 유출을 방지하는 적절한 Django 로깅 구성"></li>
            <li data-en="Implement proper authentication and authorization for sensitive API endpoints" data-ko="민감한 API 엔드포인트에 대한 적절한 인증 및 권한 부여 구현"></li>
            <li data-en="Set up proper CORS restrictions in production environments" data-ko="프로덕션 환경에서 적절한 CORS 제한 설정"></li>
            <li data-en="Implement environment-specific configuration (dev/prod) to ensure DEBUG=False in production" data-ko="프로덕션에서 DEBUG=False를 보장하기 위한 환경별 구성(개발/프로덕션) 구현"></li>
          </ul>
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
        <h3 data-en="Groq API Client Initialization Error" data-ko="Groq API 클라이언트 초기화 오류"></h3>
      </summary>
      <div class="challenge-content">
        <div class="challenge-description">
          <h4 data-en="Problem" data-ko="문제"></h4>
          <p data-en="The Groq API client failed to initialize in the production environment, producing the error '__init__() got an unexpected keyword argument 'proxies''. This prevented the core AI functionality from working, as multiple initialization attempts consistently failed with the same proxies parameter error." data-ko="프로덕션 환경에서 Groq API 클라이언트가 초기화되지 않고 '__init__() got an unexpected keyword argument 'proxies'' 오류가 발생했습니다. 여러 초기화 시도가 동일한 proxies 파라미터 오류로 계속 실패하여 핵심 AI 기능이 작동하지 않았습니다."></p>
          
          <h4 data-en="Solution" data-ko="해결책"></h4>
          <p data-en="Implemented a comprehensive solution with two key components:" data-ko="두 가지 핵심 구성 요소가 있는 포괄적인 해결책을 구현했습니다:"></p>
          
          <ol>
            <li data-en="<strong>Original client patching:</strong> Created a custom patched initialization method for the Groq client that intercepts and removes the problematic 'proxies' parameter before passing arguments to the original initialization method" data-ko="<strong>원본 클라이언트 패치:</strong> 문제가 되는 'proxies' 파라미터를 가로채서 제거한 후 원본 초기화 메서드에 인수를 전달하는 Groq 클라이언트용 사용자 정의 패치 초기화 메서드 생성"></li>
            <li data-en="<strong>Fallback HTTP client:</strong> Added a fallback implementation using httpx that directly interfaces with the Groq API without the problematic client if the patched approach fails" data-ko="<strong>대체 HTTP 클라이언트:</strong> 패치된 접근 방식이 실패할 경우 문제가 있는 클라이언트 없이 Groq API와 직접 인터페이스하는 httpx를 사용한 대체 구현 추가"></li>
          </ol>
          
          <div class="code-snippet">
{% highlight python %}
# 패치된 초기화 메서드 구현
try:
    # 원본 클래스를 직접 패치하여 proxies 문제 해결
    import types
    from groq import Client
    from groq._client import Groq as OriginalGroq
    
    # 원본 __init__ 메서드 가져오기
    original_init = OriginalGroq.__init__
    
    # 패치 적용 전에 클래스 정보 출력
    groq_logger.debug(f"OriginalGroq 클래스: {OriginalGroq}")
    groq_logger.debug(f"original_init 메서드: {original_init}")
    groq_logger.debug(f"original_init 파라미터: {inspect.signature(original_init)}")
    
    # 모든 인자를 받되 proxies 인자를 무시하는 새로운 __init__ 함수 정의
    def patched_init(self, *args, **kwargs):
        # 원본 kwargs 로깅
        groq_logger.debug(f"patched_init 호출 kwargs: {kwargs}")
        
        # proxies 파라미터 제거
        if 'proxies' in kwargs:
            groq_logger.info(f"proxies 파라미터 제거됨: {kwargs['proxies']}")
            del kwargs['proxies']
            
        # 수정된 kwargs 로깅
        groq_logger.debug(f"수정된 kwargs: {kwargs}")
        
        try:
            result = original_init(self, *args, **kwargs)
            groq_logger.info("원본 __init__ 함수 호출 성공")
            return result
        except Exception as e:
            groq_logger.error(f"원본 __init__ 함수 호출 중 오류 발생: {str(e)}")
            groq_logger.debug(f"오류 상세: {traceback.format_exc()}")
            raise
    
    # 패치 적용
    groq_logger.info("groq.Client 클래스 패치 적용")
    OriginalGroq.__init__ = patched_init
    
    # 패치 적용 후 클라이언트 초기화 시도
    groq_logger.info("패치된 클래스로 클라이언트 초기화 시도")
    
    # 최소한의 필수 인자만으로 초기화 시도
    client_params = {"api_key": api_key}
    groq_logger.debug(f"클라이언트 초기화 파라미터: {client_params}")
    
    client = Client(**client_params)
    groq_logger.info("Groq 클라이언트 초기화 성공 (패치 방식)")
    
except Exception as e:
    groq_logger.error(f"Groq 클라이언트 초기화 실패: {str(e)}")
    
    # 대체 초기화 방법 시도
    groq_logger.info("대체 초기화 방법 시도")
    try:
        # httpx를 사용한 대체 클라이언트 설정
        import httpx
        groq_logger.info("httpx를 사용한 대체 클라이언트 설정 시도")
        
        # 사용자 정의 클래스 생성
        class SimpleGroqClient:
            def __init__(self, api_key):
                self.api_key = api_key
                self.base_url = "https://api.groq.com/openai/v1"
                self.client = httpx.Client(
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=60.0
                )
                self.chat = SimpleGroqChatCompletions(self)
        
        # 새로운 클라이언트 생성
        client = SimpleGroqClient(api_key)
        groq_logger.info("대체 클라이언트 초기화 성공")
            
    except Exception as alt_e:
        groq_logger.error(f"대체 초기화 방법도 실패: {str(alt_e)}")
        groq_logger.warning("이 오류로 인해 AI 기능이 제한됩니다.")
        # 클라이언트 객체 None으로 설정
        client = None
{% endhighlight %}
          </div>

          <h4 data-en="Enhanced Dependencies Management" data-ko="향상된 의존성 관리"></h4>
          <p data-en="Added httpx dependency with specific version constraints to prevent compatibility issues:" data-ko="호환성 문제를 방지하기 위해 특정 버전 제약이 있는 httpx 의존성을 추가했습니다:"></p>
          
          <div class="code-snippet">
{% highlight diff %}
# requirements.txt
  # AI API
  # openai>=1.0.0  # OpenAI API 대신 Groq 사용
  groq>=0.4.0,<0.5.0  # 실행 환경과 호환되는 버전 범위 지정
+ httpx>=0.24.0,<0.25.0  # 대체 HTTP 클라이언트 (Groq API 직접 호출용)
{% endhighlight %}
          </div>

          <h4 data-en="Results and Verification" data-ko="결과 및 검증"></h4>
          <p data-en="After deploying the changes to production:" data-ko="변경 사항을 프로덕션에 배포한 후:"></p>
          <ul>
            <li data-en="Successfully initialized the Groq API client with the patched approach" data-ko="패치된 접근 방식으로 Groq API 클라이언트 초기화 성공"></li>
            <li data-en="Logs confirmed the removal of the problematic 'proxies' parameter" data-ko="로그에서 문제가 되는 'proxies' 파라미터가 제거되었음을 확인"></li>
            <li data-en="Core AI functionality resumed working properly" data-ko="핵심 AI 기능이 올바르게 작동 재개"></li>
            <li data-en="The fallback mechanism provides added reliability if future issues occur" data-ko="대체 메커니즘은 향후 문제가 발생할 경우 추가적인 안정성 제공"></li>
          </ul>
          
          <h4 data-en="Long-term Improvements" data-ko="장기적인 개선 사항"></h4>
          <p data-en="To ensure continued reliability:" data-ko="지속적인 안정성을 보장하기 위해:"></p>
          <ul>
            <li data-en="Added comprehensive logging throughout the initialization process" data-ko="초기화 과정 전반에 걸쳐 포괄적인 로깅 추가"></li>
            <li data-en="Created a version-pinned dependency strategy to avoid future compatibility issues" data-ko="향후 호환성 문제를 방지하기 위한 버전 고정 의존성 전략 마련"></li>
            <li data-en="Implemented a reliable fallback mechanism that can operate independently of the main client" data-ko="주 클라이언트와 독립적으로 작동할 수 있는 안정적인 대체 메커니즘 구현"></li>
          </ul>
        </div>
      </div>
    </details>
  </div>
</div>

<hr class="subsection-divider">

<!-- 서버 호스팅 선택 및 배포 Section -->
<div class="section">
  <h2 data-en="Server Hosting Selection and Deployment" data-ko="서버 호스팅 선택 및 배포"></h2>
  <p data-en="The process of selecting and configuring the most suitable hosting service for the application's requirements." data-ko="애플리케이션 요구사항에 가장 적합한 호스팅 서비스를 선택하고 구성하는 과정입니다."></p>

  <hr class="subsection-divider">

  <div class="section">
    <h3 data-en="Hosting Service Selection" data-ko="호스팅 서비스 선택"></h3>
    <p data-en="After evaluating several hosting options including Netlify, Firebase, and Render, we selected Render for the following reasons:" data-ko="Netlify, Firebase, Render 등 여러 호스팅 옵션을 평가한 후, 다음과 같은 이유로 Render를 선택했습니다:"></p>

    <div class="comparison-table">
      <table>
        <thead>
          <tr>
            <th data-en="Criteria" data-ko="기준"></th>
            <th data-en="Render" data-ko="Render"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-en="Free Plan" data-ko="무료 플랜"></td>
            <td data-en="Offers free plan with usage limits" data-ko="사용량 제한이 있는 무료 플랜 제공"></td>
          </tr>
          <tr>
            <td data-en="Dynamic Processing" data-ko="동적 처리"></td>
            <td data-en="Supports continuously running web services, providing stable performance for heavy tasks like LLM processing and web crawling" data-ko="지속 실행 가능한 웹서비스 제공으로 LLM 처리 및 웹 크롤링과 같은 무거운 작업도 안정적으로 처리 가능"></td>
          </tr>
          <tr>
            <td data-en="Execution Time/Memory Limits" data-ko="실행 시간/메모리 제한"></td>
            <td data-en="Allows long-running processes with higher resource options available in standard plans" data-ko="장시간 처리 가능하며 표준 플랜에서 더 높은 리소스 옵션 제공"></td>
          </tr>
          <tr>
            <td data-en="Custom Domain Support" data-ko="커스텀 도메인 지원"></td>
            <td data-en="Supports custom domains with free SSL" data-ko="무료 SSL이 포함된 커스텀 도메인 지원"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <p data-en="Render was specifically chosen for its ability to handle resource-intensive backend operations like web crawling and LLM processing, which are core functionalities of CVFactory." data-ko="Render는 특히 CVFactory의 핵심 기능인 웹 크롤링 및 LLM 처리와 같은 리소스 집약적인 백엔드 작업을 처리할 수 있는 능력 때문에 선택되었습니다."></p>
  </div>

  <hr class="subsection-divider">

  <div class="section">
    <h3 data-en="Deployment Process" data-ko="배포 과정"></h3>
    <p data-en="The application deployment on Render included the following key steps:" data-ko="Render에서의 애플리케이션 배포에는 다음과 같은 주요 단계가 포함되었습니다:"></p>
    
    <ol>
      <li data-en="GitHub Integration: Connected the project repository to Render for automatic deployments" data-ko="GitHub 통합: 자동 배포를 위해 프로젝트 저장소를 Render에 연결"></li>
      <li data-en="Environment Configuration: Set up all necessary environment variables in Render's secure environment" data-ko="환경 구성: Render의 보안 환경에서 모든 필요한 환경 변수 설정"></li>
      <li data-en="Service Setup: Configured a Web Service with appropriate Python runtime and dependencies" data-ko="서비스 설정: 적절한 Python 런타임 및 종속성으로 웹 서비스 구성"></li>
      <li data-en="Resource Allocation: Optimized resource allocation to balance performance and cost" data-ko="리소스 할당: 성능과 비용의 균형을 맞추기 위한 리소스 할당 최적화"></li>
    </ol>
    
    <p data-en="The deployment strategy includes monitoring usage to ensure we stay within free tier limits while providing sufficient performance for the application." data-ko="배포 전략에는 애플리케이션에 충분한 성능을 제공하면서 무료 티어 한도 내에서 유지할 수 있도록 사용량을 모니터링하는 것이 포함됩니다."></p>
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
