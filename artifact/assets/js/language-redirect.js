(function() {
  try {
    // 사용자가 수동으로 언어를 선택했거나, 리디렉션이 이미 수행된 경우 다시 실행하지 않음
    if (sessionStorage.getItem('lang_redirect_done')) {
      // console.log('언어 자동 리디렉션을 이미 수행했으므로 건너뜁니다.');
      return;
    }

    // 특정 봇(User-Agent)이면 리디렉션을 수행하지 않음
    const botPattern = /bot|crawl|spider|bingpreview|slurp|facebook|twitter|linkedin|pinterest|embedly|quora|whatsapp|telegram|vkshare|facebot|outbrain/i;
    if (botPattern.test(navigator.userAgent)) {
      return;
    }

    // 루트 경로일 때만 언어 감지 기능 실행
    if (window.location.pathname === '/') {
      const userLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      // console.log(`감지된 브라우저 언어: ${userLang}`);

      // 1순위: 한국어 → /ko/로 리디렉션
      if (userLang.startsWith('ko')) {
        window.location.replace('/ko/');
        return;
      }

      // 한국어 외의 언어는 별도 리디렉션 없이 루트(영문) 페이지에 머무릅니다.
      // (루트가 이미 영어이므로 추가 동작이 필요 없습니다.)
    }
    
    // 세션 동안 다시 실행되지 않도록 플래그 설정
    sessionStorage.setItem('lang_redirect_done', 'true');

  } catch (e) {
    // console.error('언어 자동 리디렉션 스크립트 실행 중 오류가 발생했습니다:', e);
  }
})(); 