// 스크롤 애니메이션을 위한 유틸리티 함수들

export function fadeInUp(node, { delay = 0, duration = 600 } = {}) {
  return {
    delay,
    duration,
    css: (t) => {
      const eased = cubicOut(t);
      return `
        transform: translateY(${(1 - eased) * 40}px);
        opacity: ${eased};
      `;
    }
  };
}

export function slideInLeft(node, { delay = 0, duration = 600 } = {}) {
  return {
    delay,
    duration,
    css: (t) => {
      const eased = cubicOut(t);
      return `
        transform: translateX(${(1 - eased) * -50}px);
        opacity: ${eased};
      `;
    }
  };
}

export function slideInRight(node, { delay = 0, duration = 600 } = {}) {
  return {
    delay,
    duration,
    css: (t) => {
      const eased = cubicOut(t);
      return `
        transform: translateX(${(1 - eased) * 50}px);
        opacity: ${eased};
      `;
    }
  };
}

export function scaleIn(node, { delay = 0, duration = 400 } = {}) {
  return {
    delay,
    duration,
    css: (t) => {
      const eased = cubicOut(t);
      return `
        transform: scale(${0.8 + eased * 0.2});
        opacity: ${eased};
      `;
    }
  };
}

// Easing function
function cubicOut(t) {
  const f = t - 1.0;
  return f * f * f + 1.0;
}

// Intersection Observer를 사용한 스크롤 애니메이션
export function createScrollObserver(callback, options = {}) {
  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
    ...options
  };

  return new IntersectionObserver(callback, defaultOptions);
}