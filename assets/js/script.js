// 간단한 동적 요소 추가 (예: 방문자 카운트)
document.addEventListener("DOMContentLoaded", () => {
    const footer = document.querySelector("footer");
    const visitorCount = localStorage.getItem("visitorCount") || 0;
    localStorage.setItem("visitorCount", parseInt(visitorCount) + 1);
  
    const countElement = document.createElement("p");
    countElement.textContent = `방문자 수: ${visitorCount}`;
    footer.appendChild(countElement);
  });