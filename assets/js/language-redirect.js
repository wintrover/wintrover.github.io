(function() {
  try {
    // 사용자가 수동으로 언어를 선택했거나, 리디렉션이 이미 수행된 경우 다시 실행하지 않음
    if (sessionStorage.getItem('lang_redirect_done')) {
      // console.log('언어 자동 리디렉션을 이미 수행했으므로 건너뜁니다.');
      return;
    }

    // 루트 경로일 때만 언어 감지 기능 실행
    if (window.location.pathname === '/') {
      const userLang = navigator.language || navigator.userLanguage;
      // console.log(`감지된 브라우저 언어: ${userLang}`);

      // 브라우저 언어가 'ko'로 시작하지 않으면 영어 페이지로 리디렉션
      if (!userLang.toLowerCase().startsWith('ko')) {
        // console.log('영문 페이지로 리디렉션합니다.');
        window.location.replace('/en/');
      } else {
        // console.log('브라우저 언어가 한국어이므로 현재 페이지를 유지합니다.');
      }
    }
    
    // 세션 동안 다시 실행되지 않도록 플래그 설정
    sessionStorage.setItem('lang_redirect_done', 'true');

  } catch (e) {
    // console.error('언어 자동 리디렉션 스크립트 실행 중 오류가 발생했습니다:', e);
  }
})(); 