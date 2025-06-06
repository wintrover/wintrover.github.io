document.addEventListener('DOMContentLoaded', function() {
  try {
    console.log("--- 언어 전환 버튼 디버깅 시작 ---");

    const langButton = document.querySelector('.language-switcher a.button');

    if (langButton) {
      console.log("✅ 버튼 요소를 찾았습니다:", langButton.outerHTML);
      
      const styles = window.getComputedStyle(langButton);
      console.log("🎨 적용된 마진(Margin) 값:");
      console.log(`- margin-top: ${styles.marginTop}`);
      console.log(`- margin-right: ${styles.marginRight}`);
      console.log(`- margin-bottom: ${styles.marginBottom}`);
      console.log(`- margin-left: ${styles.marginLeft}`);

    } else {
      console.error("❌ 오류: 언어 전환 버튼 요소를 찾지 못했습니다. 선택자를 확인하세요.");
    }

  } catch (e) {
    console.error("🐞 디버깅 스크립트 실행 중 예외가 발생했습니다:", e);
  } finally {
    console.log("--- 언어 전환 버튼 디버깅 종료 ---");
  }
}); 