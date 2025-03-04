document.addEventListener('DOMContentLoaded', () => {
    // Highlight.js 초기화
    document.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
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
});