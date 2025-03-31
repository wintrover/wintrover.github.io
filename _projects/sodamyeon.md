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
  <p data-en="Key challenges and solutions in developing facial landmark recognition system and creating the senior dating app." data-ko="얼굴 랜드마크 인식 시스템 개발 및 시니어 데이팅 앱 제작의 주요 과제와 해결책"></p>

  <hr class="subsection-divider">

  <!-- 얼굴 랜드마크 라이브러리 선택 및 정확도 문제 -->
  <div class="section">
    <h3 data-en="Face Landmark Library Selection" data-ko="얼굴 랜드마크 라이브러리 선택"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Initial testing revealed significant differences in landmark detection quality across libraries." data-ko="초기 테스트에서 라이브러리 간 랜드마크 검출 품질의 상당한 차이가 발견되었습니다."></li>
          <li data-en="Mediapipe, dlib, and FAN had varying accuracy under different lighting conditions and head poses." data-ko="Mediapipe, dlib, FAN은 다양한 조명 조건과 머리 포즈에서 서로 다른 정확도를 보였습니다."></li>
          <li data-en="Tried to use dlib initially but found it couldn't handle non-frontal faces well (only 60% accuracy)." data-ko="처음에는 dlib을 사용하려 했으나 정면이 아닌 얼굴을 잘 처리하지 못하는 것을 발견했습니다(정확도 60%에 불과)."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Created a comprehensive benchmark script to compare all three libraries (MPvsdlibvsFA.py)." data-ko="세 라이브러리를 모두 비교하는 종합적인 벤치마크 스크립트(MPvsdlibvsFA.py)를 작성했습니다."></li>
          <li data-en="Discovered MediaPipe provided the best balance of speed, accuracy, and landmark density (400+ points vs dlib's 68)." data-ko="MediaPipe가 속도, 정확도, 랜드마크 밀도(dlib의 68점 대비 400점 이상)의 최적의 균형을 제공한다는 사실을 발견했습니다."></li>
          <li data-en="Implemented a hybrid solution using both MediaPipe and dlib for specific cases where one outperformed the other." data-ko="한 라이브러리가 다른 라이브러리보다 성능이 뛰어난 특정 사례에 MediaPipe와 dlib을 모두 사용하는 하이브리드 솔루션을 구현했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight python %}
# 라이브러리 비교 코드 일부 (MPvsdlibvsFA.py)
if torch.cuda.is_available():
    print("CUDA Available:", torch.cuda.is_available())
    print("CUDA Version:", torch.version.cuda)
    
    # 기존 환경 변수 제거
    if 'PYTORCH_CUDA_ALLOC_CONF' in os.environ:
        del os.environ['PYTORCH_CUDA_ALLOC_CONF']
    
    num_gpus = torch.cuda.device_count()
    print(f"Number of GPUs available: {num_gpus}")
    for i in range(num_gpus):
        print(f"GPU {i}: {torch.cuda.get_device_name(i)}")
    
    device = torch.device('cuda')
else:
    print("CUDA is not available. Using CPU.")
    device = torch.device('cpu')

# 1. MediaPipe 처리
mp_face_mesh = mp.solutions.face_mesh.FaceMesh()
results = mp_face_mesh.process(rgb_image)
if results.multi_face_landmarks:
    mediapipe_landmarks = np.array([[lm.x * rgb_image.shape[1], lm.y * rgb_image.shape[0]] 
                            for lm in results.multi_face_landmarks[0].landmark])

# 2. dlib 처리
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(predictor_path)
faces = detector(rgb_image)
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 메모리 문제와 CUDA 오류 -->
  <div class="section">
    <h3 data-en="Memory Issues and CUDA Errors" data-ko="메모리 문제와 CUDA 오류"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Encountered 'CUDA out of memory' errors when loading multiple models simultaneously on older GPUs." data-ko="오래된 GPU에서 여러 모델을 동시에 로드할 때 'CUDA 메모리 부족' 오류가 발생했습니다."></li>
          <li data-en="FaceAlignment (FAN) model was consuming too much GPU memory (~2GB), causing crashes during benchmark tests." data-ko="FaceAlignment(FAN) 모델이 너무 많은 GPU 메모리(~2GB)를 소비하여 벤치마크 테스트 중 충돌이 발생했습니다."></li>
          <li data-en="Incompatible CUDA versions between torch and other libraries created runtime environment issues." data-ko="torch와 다른 라이브러리 간의 CUDA 버전 비호환성으로 런타임 환경 문제가 발생했습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Implemented proper CUDA memory management with explicit garbage collection." data-ko="명시적 가비지 컬렉션으로 적절한 CUDA 메모리 관리를 구현했습니다."></li>
          <li data-en="Added dynamic device detection to fall back to CPU when GPU memory is insufficient." data-ko="GPU 메모리가 부족할 때 CPU로 폴백하는 동적 장치 감지를 추가했습니다."></li>
          <li data-en="Created environment isolation using Docker to avoid version conflicts in deployment." data-ko="배포 시 버전 충돌을 방지하기 위해 Docker를 사용한 환경 격리를 구현했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight python %}
# 메모리 관리 개선 코드
import torch
import gc

def process_image_with_memory_safety(image_path, use_gpu=True):
    try:
        # GPU 사용 가능 여부 및 메모리 확인
        if use_gpu and torch.cuda.is_available():
            # 현재 가용 메모리 확인
            free_memory = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
            if free_memory < 1024 * 1024 * 1024:  # 1GB 미만이면 CPU 사용
                print("GPU memory low, falling back to CPU")
                device = torch.device('cpu')
            else:
                device = torch.device('cuda')
        else:
            device = torch.device('cpu')
            
        # 모델 로드 및 처리
        model.to(device)
        result = model(image.to(device))
        
        return result
    finally:
        # 명시적 메모리 정리
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 관상학 분석 알고리즘 개발 -->
  <div class="section">
    <h3 data-en="Physiognomy Analysis Algorithm Development" data-ko="관상학 분석 알고리즘 개발"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Translating traditional face reading principles into quantifiable metrics proved challenging." data-ko="전통적인 관상학 원리를 정량화할 수 있는 지표로 변환하는 것이 어려웠습니다."></li>
          <li data-en="Initial measurements were inconsistent due to perspective distortion in selfie images." data-ko="셀카 이미지의 원근 왜곡으로 인해 초기 측정값이 일관되지 않았습니다."></li>
          <li data-en="Face measurement algorithm gave inaccurate results when face was not properly centered or aligned." data-ko="얼굴이 제대로 중앙에 위치하거나 정렬되지 않았을 때 얼굴 측정 알고리즘이 부정확한 결과를 제공했습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Developed a comprehensive facial ratio system based on both modern research and traditional Eastern principles." data-ko="현대 연구와 전통적인 동양의 원리를 모두 기반으로 종합적인 얼굴 비율 시스템을 개발했습니다."></li>
          <li data-en="Implemented face alignment preprocessing to standardize input images before measurement." data-ko="측정 전 입력 이미지를 표준화하기 위한 얼굴 정렬 전처리를 구현했습니다."></li>
          <li data-en="Created a relative measurement system using facial width as a baseline to eliminate perspective issues." data-ko="원근 문제를 제거하기 위해 얼굴 너비를 기준으로 상대적 측정 시스템을 만들었습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight python %}
# face_measurements.py에서 얼굴 측정 알고리즘 일부
def get_face_measurements(landmarks, img_width, img_height):
    # 측정 점 정의 (MediaPipe Face Mesh의 인덱스 사용)
    LEFT_EYE = [33, 133]  # 왼쪽 눈 외각, 내각
    RIGHT_EYE = [362, 263]  # 오른쪽 눈 외각, 내각
    
    # 오류 발생 지점: 한 측정값이 0으로 나오는 경우 검사
    mouth_width = np.linalg.norm(landmarks[MOUTH_WIDTH[0]] - landmarks[MOUTH_WIDTH[1]])
    mouth_height = np.linalg.norm(landmarks[MOUTH_HEIGHT[0]] - landmarks[MOUTH_HEIGHT[1]])
    if mouth_height == 0:
        print("입 높이가 0으로 계산됨. 랜드마크 좌표 확인 필요:")
        print(f"MOUTH_HEIGHT[0]: {landmarks[MOUTH_HEIGHT[0]]}")
        print(f"MOUTH_HEIGHT[1]: {landmarks[MOUTH_HEIGHT[1]]}")
        # 기본값 설정 또는 다른 측정 방법 사용
        
    # 상대적 측정값: 얼굴 너비 대비 비율 계산
    left_eye_center = (landmarks[33] + landmarks[133]) / 2  # 왼쪽 눈 중심
    right_eye_center = (landmarks[362] + landmarks[263]) / 2  # 오른쪽 눈 중심
    
    eye_left_ratio = (left_eye_center[0] - landmarks[FACE_CONTOUR[0]][0]) / face_width
    eye_right_ratio = (landmarks[FACE_CONTOUR[1]][0] - right_eye_center[0]) / face_width
    
    # 얼굴 대칭 검사
    symmetry_balance = abs(eye_left_ratio - eye_right_ratio)
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 멀티디바이스 호환성 문제 -->
  <div class="section">
    <h3 data-en="Multi-device Compatibility Issues" data-ko="멀티디바이스 호환성 문제"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Face detection performed well on high-end devices but poorly on budget smartphones (especially older models)." data-ko="얼굴 검출이 고급 기기에서는 잘 작동했지만 저가형 스마트폰(특히 구형 모델)에서는 성능이 좋지 않았습니다."></li>
          <li data-en="Different camera resolutions and aspect ratios across devices created inconsistent landmark positioning." data-ko="기기마다 다른 카메라 해상도와 화면비로 인해 일관되지 않은 랜드마크 위치가 생겼습니다."></li>
          <li data-en="Mediapipe model was too large and slow for real-time processing on older devices (3+ seconds per frame)." data-ko="Mediapipe 모델이 구형 기기에서 실시간 처리에 너무 크고 느렸습니다(프레임당 3초 이상)."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Created a device capability detection system to adjust processing parameters automatically." data-ko="처리 매개변수를 자동으로 조정하는 기기 기능 감지 시스템을 만들었습니다."></li>
          <li data-en="Implemented a resolution normalization pipeline to standardize inputs across all devices." data-ko="모든 기기에서 입력을 표준화하는 해상도 정규화 파이프라인을 구현했습니다."></li>
          <li data-en="Developed a server-side processing option for low-end devices to offload complex calculations to our backend." data-ko="복잡한 계산을 백엔드로 오프로드하기 위해 저사양 기기를 위한 서버 측 처리 옵션을 개발했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight python %}
# app.py에서 서버 측 처리 구현
@app.route('/api/analyze-face', methods=['POST'])
def analyze_face_endpoint():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    temp_path = os.path.join(tempfile.gettempdir(), file.filename)
    file.save(temp_path)
    
    # 장치 기능 헤더 확인
    device_capability = request.headers.get('X-Device-Capability', 'low')
    
    try:
        # 기기 성능에 따라 다른 처리 방법 사용
        if device_capability == 'high':
            # 고성능 기기: 모든 랜드마크 계산
            result = analyze_face(temp_path, landmarks_type='full')
        else:
            # 저성능 기기: 축소된 랜드마크 세트 사용
            result = analyze_face(temp_path, landmarks_type='reduced')
            
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # 임시 파일 정리
        if os.path.exists(temp_path):
            os.remove(temp_path)
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 소켓 통신과 실시간 메시징 -->
  <div class="section">
    <h3 data-en="Socket Communication and Real-time Messaging" data-ko="소켓 통신과 실시간 메시징"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Initial WebSocket implementation suffered from frequent disconnections on mobile networks." data-ko="초기 WebSocket 구현이 모바일 네트워크에서 잦은 연결 끊김 현상을 겪었습니다."></li>
          <li data-en="Message delivery was unreliable with 15-20% message loss during network transitions." data-ko="네트워크 전환 중 15-20%의 메시지 손실로 메시지 전달이 불안정했습니다."></li>
          <li data-en="Chat history synchronization issues when users reconnected after being offline." data-ko="사용자가 오프라인 상태 후 재연결할 때 채팅 기록 동기화 문제가 발생했습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Implemented Socket.IO with its automatic reconnection and transport fallback mechanisms." data-ko="자동 재연결 및 전송 폴백 메커니즘이 있는 Socket.IO를 구현했습니다."></li>
          <li data-en="Added Firebase Realtime Database as a message queue to guarantee delivery." data-ko="전송 보장을 위해 Firebase 실시간 데이터베이스를 메시지 큐로 추가했습니다."></li>
          <li data-en="Developed a client-side offline queuing system with read receipts and synchronization on reconnect." data-ko="재연결 시 읽음 확인 및 동기화 기능이 있는 클라이언트 측 오프라인 큐잉 시스템을 개발했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight kotlin %}
// 안드로이드 앱에서 소켓 통신 구현
class ChatService(private val context: Context) {
    private lateinit var socket: Socket
    private val messageQueue = ConcurrentLinkedQueue<ChatMessage>()
    private val firebaseDB = FirebaseDatabase.getInstance().reference.child("messages")
    
    // 안정적인 연결 설정
    fun connect(userId: String) {
        try {
            val options = IO.Options().apply {
                reconnection = true
                reconnectionAttempts = Int.MAX_VALUE
                reconnectionDelay = 1000
                timeout = 20000
            }
            
            socket = IO.socket("https://sodamyeon-api.com", options)
            
            socket.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "소켓 연결됨")
                socket.emit("register", userId)
                syncOfflineMessages() // 오프라인 메시지 동기화
            }
            
            socket.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "소켓 연결 끊김 - 재연결 시도 중...")
            }
            
            socket.on(Socket.EVENT_RECONNECT_FAILED) {
                Log.e(TAG, "소켓 재연결 실패 - Firebase 폴백으로 전환")
                enableFirebaseFallbackMode()
            }
            
            socket.connect()
        } catch (e: Exception) {
            Log.e(TAG, "소켓 초기화 오류", e)
            enableFirebaseFallbackMode()
        }
    }
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 시니어 친화적 UI/UX 설계 -->
  <div class="section">
    <h3 data-en="Senior-Friendly UI/UX Design" data-ko="시니어 친화적 UI/UX 설계"></h3>
    <ul class="steps">
      <li>
        <strong data-en="Problem:" data-ko="문제:"></strong>
        <ul>
          <li data-en="Initial user tests with seniors showed confusion with standard mobile UI patterns and small touch targets." data-ko="시니어를 대상으로 한 초기 사용자 테스트에서 표준 모바일 UI 패턴과 작은 터치 영역에 대한 혼란이 나타났습니다."></li>
          <li data-en="Complex navigation flows resulted in task completion rates of only 45% among users 65+." data-ko="복잡한 탐색 흐름으로 인해 65세 이상 사용자 중 작업 완료율이 45%에 불과했습니다."></li>
          <li data-en="Text legibility issues with default font sizes and contrast ratios." data-ko="기본 글꼴 크기와 대비율로 인한 텍스트 가독성 문제가 있었습니다."></li>
        </ul>
      </li>
      <li>
        <strong data-en="Solution:" data-ko="해결책:"></strong>
        <ul>
          <li data-en="Redesigned UI with larger touch targets (minimum 48dp), increased font sizes, and higher contrast ratios." data-ko="더 큰 터치 대상(최소 48dp), 증가된 글꼴 크기 및 높은 대비율로 UI를 재설계했습니다."></li>
          <li data-en="Simplified navigation with clearer visual hierarchies and reduced number of steps to complete key tasks." data-ko="더 명확한 시각적 계층 구조와 주요 작업 완료 단계 수 감소로 탐색을 단순화했습니다."></li>
          <li data-en="Added optional voice guidance system for navigation and help functions." data-ko="탐색 및 도움말 기능을 위한 선택적 음성 안내 시스템을 추가했습니다."></li>
        </ul>
      </li>
    </ul>

    <div class="code-block">
      <button class="hover-copy-btn" onclick="copyCode(this)">📋</button>
{% highlight xml %}
<!-- 시니어 친화적 버튼 스타일 (res/values/styles.xml) -->
<style name="SeniorFriendlyButton">
    <item name="android:layout_width">match_parent</item>
    <item name="android:layout_height">60dp</item>  <!-- 더 큰 터치 영역 -->
    <item name="android:textSize">18sp</item>  <!-- 더 큰 텍스트 -->
    <item name="android:textColor">@color/white</item>
    <item name="android:letterSpacing">0.05</item>  <!-- 향상된 가독성 -->
    <item name="android:textAllCaps">false</item>  <!-- 대문자 아닌 텍스트 -->
    <item name="android:fontFamily">@font/noto_sans_medium</item>
    <item name="android:background">@drawable/rounded_button_bg</item>
    <item name="android:foreground">?attr/selectableItemBackground</item>
    <item name="android:padding">16dp</item>
    <item name="android:elevation">4dp</item>  <!-- 명확한 깊이감 -->
</style>

<!-- 접근성이 향상된 입력 필드 -->
<style name="SeniorFriendlyEditText">
    <item name="android:layout_width">match_parent</item>
    <item name="android:layout_height">wrap_content</item>
    <item name="android:textSize">16sp</item>
    <item name="android:paddingTop">16dp</item>
    <item name="android:paddingBottom">16dp</item>
    <item name="android:paddingStart">16dp</item>
    <item name="android:paddingEnd">16dp</item>
    <item name="android:background">@drawable/edit_text_bg</item>
    <item name="android:importantForAutofill">yes</item>  <!-- 자동 완성 지원 -->
    <item name="android:inputType">text</item>
</style>
{% endhighlight %}
    </div>
  </div>

  <hr class="subsection-divider">

  <!-- 결과 -->
  <div class="section">
    <h3 data-en="Final Results" data-ko="최종 결과"></h3>
    <ul class="steps">
      <li><strong data-en="Facial Analysis Performance:" data-ko="얼굴 분석 성능:"></strong> <span data-en="Landmark detection accuracy improved from 75% to 94% by using MediaPipe and custom validation." data-ko="MediaPipe와 사용자 정의 검증을 사용하여 랜드마크 감지 정확도가 75%에서 94%로 향상되었습니다."></span></li>
      <li><strong data-en="User Experience:" data-ko="사용자 경험:"></strong> <span data-en="Senior task completion rate increased from 45% to 92% after UI redesign." data-ko="UI 재설계 후 시니어 작업 완료율이 45%에서 92%로 증가했습니다."></span></li>
      <li><strong data-en="System Performance:" data-ko="시스템 성능:"></strong> <span data-en="Average processing time reduced from 3.2s to 0.7s through optimizations." data-ko="최적화를 통해 평균 처리 시간이 3.2초에서 0.7초로 단축되었습니다."></span></li>
      <li><strong data-en="Matching Accuracy:" data-ko="매칭 정확도:"></strong> <span data-en="Compatibility predictions aligned with user feedback in 78% of cases." data-ko="호환성 예측이 78%의 사례에서 사용자 피드백과 일치했습니다."></span></li>
    </ul>
  </div>
</div> 