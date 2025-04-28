document.addEventListener('DOMContentLoaded', function() {
    // 언어 설정
    const userLanguage = getUserLanguage();
    setLanguage(userLanguage);
    setupLanguageToggle();
    
    // Highlight.js 초기화
    document.querySelectorAll('pre code').forEach(block => {
        hljs.highlightBlock(block);
    });

    // Copy 버튼 로직
    document.querySelectorAll('.code-container').forEach(container => {
        const pre = container.querySelector('pre');
        const code = pre.querySelector('code');
        const button = container.querySelector('.copy-btn');

        button.addEventListener('click', () => {
            navigator.clipboard.writeText(code.innerText).then(() => {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }).catch(err => console.error('Failed to copy:', err));
        });
    });

    // 이미지 호버 줌 효과
    const hoverZoomLinks = document.querySelectorAll('.hoverZoomLink');
    hoverZoomLinks.forEach(function(link) {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });

    // project.html 레이아웃에서 네비게이션에 뒤로가기 버튼 추가
    addBackButtonToNavigation();
});

// project.html 레이아웃에서 네비게이션에 뒤로가기 버튼 추가
function addBackButtonToNavigation() {
  const navigationDiv = document.querySelector('.navigation');
  if (navigationDiv && window.location.pathname.startsWith('/projects/')) { // 프로젝트 페이지에서만 실행
    // site.baseurl 값을 가져올 방법이 필요합니다. Jekyll 변수는 JS에서 직접 접근 불가.
    // 여기서는 상대 경로를 사용합니다.
    navigationDiv.innerHTML = '<a href="../" class="back-button" data-en="← Back to Previous page" data-ko="← 이전 페이지로 돌아가기">← Back to Previous page</a>';
    // 언어 설정 함수 호출하여 버튼 텍스트 업데이트 필요
    const currentLang = localStorage.getItem('language') || 'en';
    const backButton = navigationDiv.querySelector('.back-button');
    if (backButton) {
      if (currentLang === 'en' && backButton.hasAttribute('data-en')) {
        backButton.innerHTML = backButton.getAttribute('data-en');
      } else if (currentLang === 'ko' && backButton.hasAttribute('data-ko')) {
        backButton.innerHTML = backButton.getAttribute('data-ko');
      }
    }
  }
}

// 언어 감지 및 설정 함수
function getUserLanguage() {
    // 저장된 언어 설정이 있는지 확인
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
        return savedLanguage;
    }
    
    // 국가 기반 자동 언어 설정
    try {
        // 사용자 IP 기반 국가 감지 API (무료 서비스)
        fetch('https://ipapi.co/json/')
            .then(response => response.json())
            .then(data => {
                // 한국에서 접속한 경우 한국어로 설정
                if (data.country === 'KR') {
                    setLanguage('ko');
                }
            })
            .catch(error => {
                console.error('국가 감지 실패:', error);
            });
    } catch (error) {
        console.error('언어 감지 중 오류 발생:', error);
    }
    
    // 기본값은 영어
    return 'en';
}

// 언어 설정 함수
function setLanguage(lang) {
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('language', lang);
    
    // 모든 다국어 요소 업데이트
    document.querySelectorAll('[data-en], [data-ko]').forEach(element => {
        if (lang === 'en' && element.hasAttribute('data-en')) {
            element.innerHTML = element.getAttribute('data-en');
        } else if (lang === 'ko' && element.hasAttribute('data-ko')) {
            element.innerHTML = element.getAttribute('data-ko');
        }
    });
}

// 언어 토글 설정
function setupLanguageToggle() {
    const toggle = document.getElementById('language-toggle');
    if (toggle) {
        toggle.addEventListener('click', function() {
            const currentLang = localStorage.getItem('language') || 'en';
            const newLang = currentLang === 'en' ? 'ko' : 'en';
            setLanguage(newLang);
            
            // 토글 버튼 텍스트 업데이트
            updateToggleText(newLang);
        });
        
        // 초기 토글 텍스트 설정
        updateToggleText(localStorage.getItem('language') || 'en');
    }
}

// 토글 버튼 텍스트 업데이트
function updateToggleText(lang) {
    const toggle = document.getElementById('language-toggle');
    if (toggle) {
        toggle.textContent = lang === 'en' ? '한국어' : 'English';
    }
}

// 코드 복사 기능
function copyCode(button) {
    const codeBlock = button.closest('.code-block').querySelector('code');
    const codeText = codeBlock.textContent;
    
    // 클립보드에 텍스트 복사
    navigator.clipboard.writeText(codeText).then(() => {
        // 복사 성공 시 버튼 상태 변경
        button.classList.add('copied');
        
        // 복사 확인 효과
        const originalText = button.textContent;
        button.textContent = '✓';
        
        // 2초 후 원래 상태로 복귀
        setTimeout(() => {
            button.classList.remove('copied');
            button.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('복사 실패:', err);
    });
}