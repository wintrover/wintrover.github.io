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
  - Kotlin
  - YOLOv11
  - EfficientNet
---

<!-- Development Process Section -->
<div class="section">
  <h2 data-en="Development Process and Challenges" data-ko="개발 과정 및 도전 과제"></h2>
  <p data-en="This section outlines the challenges faced during the development of the AI model for deepfake detection and how they were resolved." data-ko="이 섹션에서는 딥페이크 감지를 위한 AI 모델 개발 중 직면한 문제와 해결 방법을 설명합니다."></p>

  <hr class="subsection-divider">

  <!-- 모델 성능과 앱 크기 균형 -->
  <div class="section">
    <h3 data-en="Balancing Model Performance and App Size" data-ko="모델 성능과 앱 크기의 균형"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="The initial EfficientNet-B4 model was accurate (96%), but resulted in an AAB file over 110MB, exceeding the Google Play Store limit." data-ko="초기 EfficientNet-B4 모델은 정확도가 높았지만(96%), AAB 파일이 110MB를 초과하여 Google Play 스토어 제한을 넘었습니다."></li>
          <li data-en="The ONNX model alone was 68MB, too large for mobile deployment." data-ko="ONNX 모델만 68MB로, 모바일 배포에 너무 컸습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Switched to EfficientNet-Lite0, reducing model size to 16MB but decreasing accuracy to 91%." data-ko="EfficientNet-Lite0로 전환하여 모델 크기를 16MB로 줄였지만 정확도는 91%로 감소했습니다."></li>
          <li data-en="Implemented model quantization, converting from FP32 to INT8, reducing size by additional 65%." data-ko="모델 양자화를 구현하여 FP32에서 INT8로 변환하고 크기를 추가로 65% 줄였습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight kotlin %}
// ModelQuantizer.kt 구현 코드의 일부
@WorkerThread
suspend fun quantizeModelToInt8(
    modelName: String,
    calibrationData: List<ByteBuffer>,
    inputShape: LongArray
): File? = withContext(Dispatchers.Default) {
    val quantizedModelFile = File(quantizedCacheDir, "${modelName.substringBeforeLast(".")}_int8.onnx")
    
    // 이미 양자화된 모델이 있는 경우 재사용
    if (quantizedModelFile.exists()) {
        Log.d(TAG, "Quantized model already exists: $modelName")
        return@withContext quantizedModelFile
    }
    
    try {
        // 원본 모델 바이트 배열 로드
        val modelBytes = context.assets.open(modelName).readBytes()
        
        // 세션 옵션 설정 - 양자화 활성화
        val sessionOptions = OrtSession.SessionOptions()
        sessionOptions.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
        
        // 구현 후략...
    }
}
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 메모리 누수와 OOM -->
  <div class="section">
    <h3 data-en="Memory Leaks and OOM Crashes" data-ko="메모리 누수와 OOM 오류"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="The app crashed with OOM (Out of Memory) errors after analyzing 7-8 images, especially on older devices." data-ko="앱이 7-8개의 이미지를 분석한 후 특히 구형 기기에서 OOM(메모리 부족) 오류로 충돌했습니다."></li>
          <li data-en="Memory profile showed Bitmap objects were not being properly released after analysis." data-ko="메모리 프로필에서 분석 후 Bitmap 객체가 제대로 해제되지 않는 것을 확인했습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Implemented proper bitmap recycling in the analysis pipeline." data-ko="분석 파이프라인에서 적절한 비트맵 재활용을 구현했습니다."></li>
          <li data-en="Created a bitmap pool to reuse bitmap objects instead of creating new ones." data-ko="새 비트맵을 생성하는 대신 비트맵 객체를 재사용하기 위한 비트맵 풀을 만들었습니다."></li>
          <li data-en="Added checks for proper release of ONNX tensors after each inference." data-ko="각 추론 후 ONNX 텐서의 적절한 해제를 위한 검사를 추가했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight kotlin %}
// 메모리 누수 수정 코드
private fun processImageWithMemorySafety(bitmap: Bitmap): DetectionResult? {
    var inputTensor: OnnxTensor? = null
    var resultBitmap: Bitmap? = null
    
    try {
        // ... 처리 코드
        return result
    } catch (e: Exception) {
        Log.e(TAG, "Error processing image", e)
        return null
    } finally {
        // 중요: 리소스 정리
        inputTensor?.close()
        
        if (bitmap != resultBitmap) {
            resultBitmap?.recycle()
        }
    }
}
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 얼굴 검출 정확도 -->
  <div class="section">
    <h3 data-en="Face Detection Accuracy Issues" data-ko="얼굴 검출 정확도 문제"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Initial face detection using CascadeClassifier had poor results with non-frontal faces." data-ko="CascadeClassifier를 사용한 초기 얼굴 검출은 정면이 아닌 얼굴에서 결과가 좋지 않았습니다."></li>
          <li data-en="Missed over 30% of faces in profile or partial views, leading to incorrect deepfake assessments." data-ko="프로필이나 부분적 시야에서 30% 이상의 얼굴을 놓쳐 잘못된 딥페이크 평가로 이어졌습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Replaced with YOLOv11-Face for more robust detection (accuracy improved to 94%)." data-ko="더 강력한 검출을 위해 YOLOv11-Face로 대체했습니다(정확도 94%로 향상)."></li>
          <li data-en="Implemented box expansion logic to capture more of the face context for better classification." data-ko="더 나은 분류를 위해 얼굴 컨텍스트를 더 많이 캡처하도록 박스 확장 로직을 구현했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight kotlin %}
/**
 * 얼굴 영역을 상하좌우로 확장하여 Crop
 * 안전한 경계 검사 추가
 */
private fun cropFaceArea(
    src: Bitmap,
    box: FaceBox,
    extendRatio: Float = 0.5f
): Bitmap {
    // 얼굴 영역 확장 로직
    val width = box.x2 - box.x1
    val height = box.y2 - box.y1
    
    val extendX = width * extendRatio
    val extendY = height * extendRatio
    
    // 안전한 경계 계산
    val x1 = (box.x1 - extendX).coerceIn(0f, src.width.toFloat())
    val y1 = (box.y1 - extendY).coerceIn(0f, src.height.toFloat())
    val x2 = (box.x2 + extendX).coerceIn(0f, src.width.toFloat())
    val y2 = (box.y2 + extendY).coerceIn(0f, src.height.toFloat())
    
    // 안전하게 크롭
    return Bitmap.createBitmap(
        src,
        x1.toInt(),
        y1.toInt(),
        (x2 - x1).toInt(),
        (y2 - y1).toInt()
    )
}
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- UI 응답성 -->
  <div class="section">
    <h3 data-en="UI Responsiveness During Analysis" data-ko="분석 중 UI 응답성"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="The UI froze during model inference, causing poor user experience with ANR warnings." data-ko="모델 추론 중 UI가 멈춰 ANR 경고와 함께 사용자 경험이 저하되었습니다."></li>
          <li data-en="Users reported 'App not responding' errors when processing large images." data-ko="사용자들은 큰 이미지를 처리할 때 '앱이 응답하지 않음' 오류를 보고했습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Migrated all inference code to coroutines with Dispatchers.Default." data-ko="모든 추론 코드를 Dispatchers.Default와 함께 코루틴으로 마이그레이션했습니다."></li>
          <li data-en="Added dynamic progress UI with animations to keep the UI thread responsive." data-ko="UI 스레드의 응답성을 유지하기 위해 애니메이션이 있는 동적 진행 상황 UI를 추가했습니다."></li>
          <li data-en="Implemented process cancellation support for long-running analyses." data-ko="장시간 실행되는 분석을 위한 프로세스 취소 지원을 구현했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight kotlin %}
// 코루틴을 활용한 비동기 처리
private val analyzeScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
private var currentAnalysisJob: Job? = null

fun analyzeImage(bitmap: Bitmap, callback: (DetectionResult?) -> Unit) {
    // 실행 중인 이전 작업 취소
    currentAnalysisJob?.cancel()
    
    // 새 분석 작업 시작
    currentAnalysisJob = analyzeScope.launch {
        val result = detectAndClassifyAsync(bitmap)
        
        // UI 스레드에서 결과 전달
        withContext(Dispatchers.Main) {
            callback(result)
        }
    }
}
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 모델 버전 불일치 -->
  <div class="section">
    <h3 data-en="ONNX Runtime Version Mismatches" data-ko="ONNX 런타임 버전 불일치"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="The model trained with PyTorch 1.10 wouldn't load correctly with ONNX Runtime 1.14 on Android." data-ko="PyTorch 1.10으로 학습된 모델이 Android의 ONNX 런타임 1.14에서 제대로 로드되지 않았습니다."></li>
          <li data-en="Error: 'This model requires opset version 12 but the runtime only supports until opset version 11'." data-ko="오류: '이 모델은 opset 버전 12가 필요하지만 런타임은 opset 버전 11까지만 지원합니다.'"></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Re-exported model with explicit opset_version=11 to ensure compatibility." data-ko="호환성을 보장하기 위해 명시적 opset_version=11로 모델을 다시 내보냈습니다."></li>
          <li data-en="Created a model converter script that handles versioning issues automatically." data-ko="버전 관리 문제를 자동으로 처리하는 모델 변환기 스크립트를 만들었습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight python %}
# 모델 재변환 스크립트
import torch
import torchvision.models as models

def export_model_with_compatible_opset(model_path, output_path, opset_version=11):
    # 모델 로드
    model = torch.load(model_path)
    model.eval()
    
    # 더미 입력
    x = torch.randn(1, 3, 128, 128, requires_grad=False)
    
    # ONNX로 내보내기 (opset 버전 명시)
    torch.onnx.export(
        model,
        x,
        output_path,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'},
                      'output': {0: 'batch_size'}}
    )
    print(f"모델이 opset 버전 {opset_version}으로 성공적으로 내보내졌습니다.")
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 결과 -->
  <div class="section">
    <h3 data-en="Final Results" data-ko="최종 결과"></h3>
    <ul class="steps">
      <li><strong data-en="Performance:" data-ko="성능:"></strong> <span data-en="Model size: 4.2MB, Inference time: 350ms on mid-range devices (Snapdragon 765G)." data-ko="모델 크기: 4.2MB, 추론 시간: 중급 기기에서 350ms (스냅드래곤 765G)."></span></li>
      <li><strong data-en="Accuracy:" data-ko="정확도:"></strong> <span data-en="91% accuracy on the FaceForensics++ benchmark dataset." data-ko="FaceForensics++ 벤치마크 데이터셋에서 91% 정확도."></span></li>
      <li><strong data-en="User Feedback:" data-ko="사용자 피드백:"></strong> <span data-en="App stability improved to 0.2% crash rate from initial 15%." data-ko="앱 안정성이 초기 15%에서 0.2% 충돌률로 향상되었습니다."></span></li>
    </ul>
  </div>
</div>
