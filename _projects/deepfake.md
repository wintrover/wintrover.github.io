---
title: Deep Fake Detect App
layout: project
description: A mobile application that uses deep learning models to detect deepfake images and videos.
ko_title: 딥페이크 감지 앱
ko_description: 딥러닝 모델을 사용하여 딥페이크 이미지와 비디오를 감지하는 모바일 애플리케이션입니다.
dev_period: 2 weeks
github_link: https://github.com/wintrover/DeepFakeDetectApp
youtube_embed: https://www.youtube.com/embed/O3X-rWDxpi8
skills: 
  - ONNX
  - YOLOv11
  - EfficientNet-Mobile
---

<!-- Development Process Section -->
<div class="section">
  <h2 data-en="Development Process and Challenges" data-ko="개발 과정 및 도전 과제"></h2>
  <p data-en="This section outlines the challenges faced during the development of the AI model for deepfake detection and how they were resolved." data-ko="이 섹션에서는 딥페이크 감지를 위한 AI 모델 개발 중 직면한 문제와 해결 방법을 설명합니다."></p>

  <hr class="subsection-divider">

  <!-- Model Lightweighting -->
  <div class="section">
    <h3 data-en="Model Lightweighting Failures and Performance Degradation" data-ko="모델 경량화 실패와 성능 저하"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="A ResNet-50-based model resulted in an inference time of 3.2 seconds, making real-time processing impossible." data-ko="ResNet-50 기반 모델은 추론 시간이 3.2초로, 실시간 처리가 불가능했습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Switched to MobileNetV3-Small and applied depthwise separable convolutions, reducing inference time to 0.7 seconds (Snapdragon 8 Gen2 benchmark)." data-ko="MobileNetV3-Small로 전환하고 깊이별 분리 합성곱을 적용하여 추론 시간을 0.7초로 단축했습니다 (스냅드래곤 8 Gen2 벤치마크)."></li>
          <li data-en="Reconverted the model with <code>opset_version = 13</code> to resolve compatibility issues." data-ko="호환성 문제를 해결하기 위해 <code>opset_version = 13</code>으로 모델을 다시 변환했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
      <pre><code class="language-python">import torch

model = torch.hub.load('pytorch/vision:v0.10.0', 'mobilenet_v3_small', pretrained=True)
model.eval()
torch.onnx.export(
    model,
    torch.randn(1, 3, 224, 224),
    "mobilenet_v3_small.onnx",
    opset_version=13)</code></pre>
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- Multi-Face Processing -->
  <div class="section">
    <h3 data-en="Multi-Face Processing Logic Flaws" data-ko="다중 얼굴 처리 로직 결함"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="YOLO detected multiple faces, but the logic classified only the largest face, leading to false detections." data-ko="YOLO는 여러 얼굴을 감지했지만 로직은 가장 큰 얼굴만 분류하여 잘못된 감지가 발생했습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Applied NMS (Non-Max Suppression) to remove overlapping bounding boxes." data-ko="겹치는 경계 상자를 제거하기 위해 NMS(Non-Max Suppression)를 적용했습니다."></li>
          <li data-en="Improved the UI to display individual confidence scores for each face (e.g., \"85% Real, 72% Fake\")." data-ko="각 얼굴의 개별 신뢰도 점수(예: \"85% 진짜, 72% 가짜\")를 표시하도록 UI를 개선했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
      <pre><code class="language-python">import cv2

def apply_nms(boxes, scores, threshold=0.5):
    indices = cv2.dnn.NMSBoxes(boxes, scores, score_threshold=0.5, nms_threshold=threshold)
    return [boxes[i] for i in indices]

# 예제 데이터
boxes = [[50, 50, 100, 100], [60, 60, 110, 110]]
scores = [0.9, 0.75]
filtered_boxes = apply_nms(boxes, scores)
print(filtered_boxes)</code></pre>
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- False Detections -->
  <div class="section">
    <h3 data-en="False Detections in Real-World Environments" data-ko="실제 환경에서의 오탐지"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="False detections occurred for video-captured images or reflections on screens." data-ko="비디오로 촬영된 이미지나 화면 반사에서 오탐지가 발생했습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Added a video frame consistency check algorithm to ensure consistency across consecutive frames." data-ko="연속 프레임 간의 일관성을 보장하기 위해 비디오 프레임 일관성 검사 알고리즘을 추가했습니다."></li>
          <li data-en="Adjusted YOLO's <code>conf_threshold = 0.65</code> to improve detection rates." data-ko="감지율을 개선하기 위해 YOLO의 <code>conf_threshold = 0.65</code>로 조정했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
      <pre><code class="language-python">def check_frame_consistency(frames, threshold=0.65):
    consistent_frames = []
    for frame in frames:
        if detect_face(frame, conf_threshold=threshold):
            consistent_frames.append(frame)
    return consistent_frames

# 예제 데이터
frames = [cv2.imread(f"frame_{i}.jpg") for i in range(10)]
consistent_frames = check_frame_consistency(frames)</code></pre>
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- Android Integration -->
  <div class="section">
    <h3 data-en="Exceptions During Android Integration" data-ko="안드로이드 통합 중 예외 상황"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Memory leaks occurred when loading gallery images, causing OOM crashes." data-ko="갤러리 이미지 로딩 시 메모리 누수가 발생하여 OOM 충돌이 발생했습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Managed memory by reusing Bitmap and forcing <code>bitmap.recycle()</code> calls." data-ko="Bitmap을 재사용하고 <code>bitmap.recycle()</code> 호출을 강제하여 메모리를 관리했습니다."></li>
          <li data-en="Optimized CPU usage with ONNX Runtime's SequentialExecutor to limit thread counts." data-ko="ONNX Runtime의 SequentialExecutor를 사용하여 스레드 수를 제한하고 CPU 사용량을 최적화했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
      <pre><code class="language-java">Bitmap bitmap = BitmapFactory.decodeFile(imagePath);

bitmap.recycle();</code></pre>
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- Outcome -->
  <div class="section">
    <h3 data-en="Outcome" data-ko="결과"></h3>
    <ul class="steps">
      <li><strong data-en="Accuracy:" data-ko="정확도:"></strong> <span data-en="Achieved 92% (F1 Score 0.89)." data-ko="92% 달성 (F1 점수 0.89)."></span></li>
      <li><strong data-en="Performance:" data-ko="성능:"></strong> <span data-en="Average inference time of 0.7 seconds (Snapdragon 8 Gen2 benchmark)." data-ko="평균 추론 시간 0.7초 (스냅드래곤 8 Gen2 벤치마크)."></span></li>
      <li><strong data-en="User Feedback:" data-ko="사용자 피드백:"></strong> <span data-en="\"3 out of 5 attempts to add verification marks succeeded,\" indicating room for improvement in model reliability." data-ko="\"5번 시도 중 3번 인증 마크 추가 성공\", 모델 신뢰성에 개선의 여지가 있음을 나타냄."></span></li>
    </ul>
  </div>
</div> 