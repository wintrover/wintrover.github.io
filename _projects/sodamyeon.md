---
title: Face Recognition Dating App
layout: project
description: A senior dating app that leverages face reading and astrology-based matching algorithms.
ko_title: 얼굴 인식 데이팅 앱
ko_description: 관상학과 천문학 기반 매칭 알고리즘을 활용한 노인 데이팅 앱입니다.
dev_period: 2 weeks
github_link: https://github.com/Suyangdaekun/Sodamyeon.git
youtube_embed: https://www.youtube.com/embed/OM7OZrjQ1wo
skills: 
  - Mediapipe
  - Flask
  - Socket
  - Firebase
---

<!-- Development Process Section -->
<div class="section">
  <h2 data-en="Development Process and Challenges" data-ko="개발 과정 및 도전 과제"></h2>
  <p data-en="Key challenges and solutions in developing facial landmark recognition system" data-ko="얼굴 랜드마크 인식 시스템 개발의 주요 과제와 해결책"></p>

  <hr class="subsection-divider">

  <!-- Testing Various Libraries -->
  <div class="section">
    <h3 data-en="Testing Various Libraries" data-ko="다양한 라이브러리 테스트"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Accuracy differences between Mediapipe, dlib, and FAN" data-ko="Mediapipe, dlib, FAN 간의 정확도 차이"></li>
          <li data-en="Recognition rate drops under specific lighting/angles" data-ko="특정 조명/각도에서 인식률 하락"></li>
          <li data-en="Speed vs accuracy trade-offs" data-ko="속도와 정확도 간의 트레이드오프"></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Parallel processing with Mediapipe and dlib" data-ko="Mediapipe와 dlib을 사용한 병렬 처리"></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
      <pre><code class="language-python"># Mediapipe implementation
import mediapipe as mp

mp_face_mesh = mp.solutions.face_mesh.FaceMesh()
results = mp_face_mesh.process(rgb_image)

# dlib implementation
detector = dlib.get_frontal_face_detector()
predictor_path = r"D:\Coding\AI4FW\image_modeling\model_comparing\shape_predictor_68_face_landmarks.dat"
predictor = dlib.shape_predictor(predictor_path)</code></pre>
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- Landmark Visualization and Validation -->
  <div class="section">
    <h3 data-en="Landmark Visualization and Validation" data-ko="랜드마크 시각화 및 검증"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Need for accuracy verification" data-ko="정확도 검증의 필요성"></li>
          <li data-en="Lack of debugging visualization tools" data-ko="디버깅 시각화 도구의 부재"></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Custom visualization function with OpenCV" data-ko="OpenCV를 활용한 커스텀 시각화 함수"></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
      <pre><code class="language-python">def visualize_landmarks(image_path, landmarks, img_width, img_height):
    img = cv2.imread(image_path)
    for idx, landmark in enumerate(landmarks):
        x, y = int(landmark[0]), int(landmark[1])
        cv2.circle(img, (x, y), 2, (0, 0, 255), -1)  # Red dots
        cv2.putText(img, str(idx), (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)</code></pre>
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- Performance Optimization -->
  <div class="section">
    <h3 data-en="Performance Optimization" data-ko="성능 최적화"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Insufficient real-time performance" data-ko="실시간 성능 부족"></li>
          <li data-en="Inefficient resource utilization" data-ko="비효율적인 리소스 활용"></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="GPU acceleration with PyTorch" data-ko="PyTorch를 활용한 GPU 가속"></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
      <pre><code class="language-python">device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")</code></pre>
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- Data Normalization -->
  <div class="section">
    <h3 data-en="Data Normalization" data-ko="데이터 정규화"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Inconsistent image sizes/resolutions" data-ko="일관되지 않은 이미지 크기/해상도"></li>
          <li data-en="Coordinate system inconsistency" data-ko="좌표계 불일치"></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Dynamic coordinate conversion" data-ko="동적 좌표 변환"></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
      <pre><code class="language-python">face_landmarks = np.array([[lm.x * rgb_image.shape[1], lm.y * rgb_image.shape[0]] 
                       for lm in results.multi_face_landmarks[0].landmark])</code></pre>
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- Outcome -->
  <div class="section">
    <h3 data-en="Outcome" data-ko="결과"></h3>
    <ul class="steps">
      <li><strong data-en="Accuracy:" data-ko="정확도:"></strong> <span data-en="Achieved 92% (F1 Score 0.89)." data-ko="92% 달성 (F1 점수 0.89)"></span></li>
      <li><strong data-en="Performance:" data-ko="성능:"></strong> <span data-en="Average inference time of 0.7 seconds (Snapdragon 8 Gen2 benchmark)." data-ko="평균 추론 시간 0.7초 (스냅드래곤 8 Gen2 벤치마크)."></span></li>
      <li><strong data-en="User Feedback:" data-ko="사용자 피드백:"></strong> <span data-en="\"3 out of 5 attempts to add verification marks succeeded,\" indicating room for improvement." data-ko="\"5번 시도 중 3번 인증 마크 추가 성공\", 개선의 여지가 있음을 나타냄."></span></li>
    </ul>
  </div>
</div> 