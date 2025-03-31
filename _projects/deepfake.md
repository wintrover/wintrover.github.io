---
title: Deep Fake Detect App
layout: project
description: A mobile application that uses deep learning models to detect deepfake images and videos.
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
  <h2>Development Process and Challenges</h2>
  <p>This section outlines the challenges faced during the development of the AI model for deepfake detection and how they were resolved.</p>

  <hr class="subsection-divider">

  <!-- Model Lightweighting -->
  <div class="section">
    <h3>Model Lightweighting Failures and Performance Degradation</h3>
    <ul class="steps">
      <li>
        <strong>Problem:</strong>
        <ul>
          <li>A ResNet-50-based model resulted in an inference time of 3.2 seconds, making real-time processing impossible.</li>
        </ul>
      </li>
      <li>
        <strong>Solution:</strong>
        <ul>
          <li>Switched to MobileNetV3-Small and applied depthwise separable convolutions, reducing inference time to 0.7 seconds (Snapdragon 8 Gen2 benchmark).</li>
          <li>Reconverted the model with <code>opset_version = 13</code> to resolve compatibility issues.</li>
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
    <h3>Multi-Face Processing Logic Flaws</h3>
    <ul class="steps">
      <li>
        <strong>Problem:</strong>
        <ul>
          <li>YOLO detected multiple faces, but the logic classified only the largest face, leading to false detections.</li>
        </ul>
      </li>
      <li>
        <strong>Solution:</strong>
        <ul>
          <li>Applied NMS (Non-Max Suppression) to remove overlapping bounding boxes.</li>
          <li>Improved the UI to display individual confidence scores for each face (e.g., "85% Real, 72% Fake").</li>
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
    <h3>False Detections in Real-World Environments</h3>
    <ul class="steps">
      <li>
        <strong>Problem:</strong>
        <ul>
          <li>False detections occurred for video-captured images or reflections on screens.</li>
        </ul>
      </li>
      <li>
        <strong>Solution:</strong>
        <ul>
          <li>Added a video frame consistency check algorithm to ensure consistency across consecutive frames.</li>
          <li>Adjusted YOLO's <code>conf_threshold = 0.65</code> to improve detection rates.</li>
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
    <h3>Exceptions During Android Integration</h3>
    <ul class="steps">
      <li>
        <strong>Problem:</strong>
        <ul>
          <li>Memory leaks occurred when loading gallery images, causing OOM crashes.</li>
        </ul>
      </li>
      <li>
        <strong>Solution:</strong>
        <ul>
          <li>Managed memory by reusing Bitmap and forcing <code>bitmap.recycle()</code> calls.</li>
          <li>Optimized CPU usage with ONNX Runtime's SequentialExecutor to limit thread counts.</li>
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
    <h3>Outcome</h3>
    <ul class="steps">
      <li><strong>Accuracy:</strong> Achieved 92% (F1 Score 0.89).</li>
      <li><strong>Performance:</strong> Average inference time of 0.7 seconds (Snapdragon 8 Gen2 benchmark).</li>
      <li><strong>User Feedback:</strong> "3 out of 5 attempts to add verification marks succeeded," indicating room for improvement in model reliability.</li>
    </ul>
  </div>
</div> 