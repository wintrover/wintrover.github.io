document.addEventListener('DOMContentLoaded', function() {
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
});

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