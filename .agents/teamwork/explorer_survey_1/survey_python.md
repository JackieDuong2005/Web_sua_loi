# Khảo sát & Đặc tả Kỹ thuật Toàn diện Python AI Service (ViHand Grade)
**Tác giả:** Explorer Survey Agent  
**Mục tiêu:** Nâng cấp Semantic-Acoustic Decoupled Pipeline (`Qwen2.5-0.5B-Instruct` SLM + `Piper VITS ONNX` Acoustic Engine) tối ưu hóa cho **Raspberry Pi 4 (4GB RAM)**  
**Thời điểm khảo sát:** 2026-10-18T19:08:00Z  
**Phạm vi khảo sát:** `python_service/tts_engine.py`, `python_service/main.py`, `python_service/requirements.txt`, `start_all.bat`, Next.js BFF Contracts & Frontend Playback Surfaces.

---

## 1. TỔNG QUAN KIẾN TRÚC HIỆN TRẠNG & BÀI TOÁN RASPBERRY PI 4 (4GB RAM)

### 1.1. Hiện trạng triển khai AI Service
Dịch vụ Python FastAPI (`python_service/main.py`, Port 8000) hiện phục vụ 3 năng lực cốt lõi:
1. **ViT5 Vietnamese Correction Engine** (`chamdentimem/ViT5_Vietnamese_Correction`): Đã lượng tử hóa Dynamic INT8 trên CPU, tiêu tốn ~250MB - 350MB RAM.
2. **YOLOv8 Word Detection** (`yolov8n` custom weights): Tiêu tốn ~80MB - 120MB RAM khi nạp ONNX/PyTorch.
3. **Piper VITS Acoustic Engine** (`python_service/tts_engine.py`): Mô hình ONNX `vi_VN-vais1000-medium.onnx` (~65MB file size, tốn ~90MB - 120MB RAM khi inference).
4. **Qwen2.5-0.5B-Instruct SLM** (`python_service/main.py` lines 918-1359): Hiện được lazy-load qua hàm `get_qwen_model()`. Tuy nhiên, khi đã nạp vào bộ nhớ RAM, biến `_qwen_model` và `_qwen_tokenizer` được giữ vĩnh viễn (resident) mà KHÔNG có cơ chế giải phóng (unload). Ở định dạng `bfloat16`, Qwen2.5 chiếm thêm ~580MB - 850MB RAM; ở `float32`, chiếm tới ~2.3GB RAM.

### 1.2. Thách thức bộ nhớ trên Raspberry Pi 4 (4GB RAM)
Khi chạy đồng thời:
- Linux OS + Desktop/Services: ~600MB - 800MB
- Next.js Web Studio BFF (`node` runtime): ~250MB - 400MB
- ViT5 INT8 + YOLOv8: ~400MB - 500MB
- Trình duyệt Chromium (hiển thị giao diện giáo viên): ~800MB - 1.2GB

Tổng RAM nền đã dao động từ **2.1GB đến 2.9GB**. Nếu Qwen2.5-0.5B duy trì thường trực trên RAM (~650MB - 850MB) trong suốt tiết học (khi giáo viên đang chấm bài hoặc cho học sinh nghe đọc chính tả), nguy cơ tràn RAM (Out-Of-Memory OOM Killer) trên Raspberry Pi 4 là rất cao, dẫn tới treo tiến trình `python main.py` hoặc ngắt kết nối WebSocket/HTTP.

Do đó, kiến trúc **Staged On-Demand Activation & Auto-Unload (`ON_DEMAND_UNLOAD`)** kết hợp **In-Memory LRU Prosody Script Caching** và **VITS Acoustic Style Presets** là giải pháp then chốt để đưa mức chiếm dụng RAM của Qwen về **0 MB RAM** khi ở trạng thái nghỉ (idle) và trong suốt quá trình đọc chính tả/chấm bài.

---

## 2. KHẢO SÁT CHI TIẾT PIPER VITS ONNX (`python_service/tts_engine.py`)

### 2.1. Phân tích hiện trạng `tts_engine.py`
1. **Nạp & Cache mô hình (`_get_or_load_voice`)**:
   - Sử dụng thư viện `piper.PiperVoice` (hoặc lệnh nhị phân `piper`).
   - `_loaded_voices` là một từ điển bộ nhớ đệm `Dict[str, PiperVoice]`.
   - File model chuẩn đã có sẵn cục bộ tại:
     - `models/tts/vi_VN-vais1000-medium.onnx` (65.4MB) & `.onnx.json`
     - `models/tts/vi_VN-25hours_single-low.onnx` (32.8MB) & `.onnx.json`
2. **Hàm `synthesize_wav` hiện tại**:
   ```python
   def synthesize_wav(self, text: str, voice_id: str = "vi_VN-vais1000-medium", rate: str = "-15%") -> bytes:
   ```
   - Chỉ nhận tham số `text`, `voice_id`, `rate`.
   - Tính toán `length_scale` dựa trên `rate` (mặc định 1.15 cho `-15%`).
   - Khởi tạo `SynthesisConfig(length_scale=length_scale)`.
   - **Hạn chế**: Hoàn toàn bỏ trống `noise_scale` và `noise_w_scale`. VITS mặc định chạy với các giá trị cố định, dẫn tới âm điệu bị đều đều (robotic/flat), thiếu sự truyền cảm, thiếu phân biệt giữa bài thơ/văn xuôi, và không thể nhấn mạnh từ khó hay đổi ngữ điệu câu hỏi.
3. **Hàm `play_on_local_speaker` hiện tại**:
   ```python
   def play_on_local_speaker(self, text: str, voice_id: str = "vi_VN-vais1000-medium", rate: str = "-15%") -> bool:
   ```
   - Lưu file WAV tạm và gọi `aplay -q` trên Linux hoặc `winsound.PlaySound` trên Windows.
   - Chưa chuyển tiếp các tham số âm học (acoustic prosody parameters) và cờ đọc dấu câu.

### 2.2. Kiểm chứng thực tế thư viện `piper` trong môi trường dự án
Qua kiểm thử trực tiếp bằng `python -c` trên môi trường dự án:
- Thư viện `piper-tts` v1.2.0 đã được cài đặt sẵn.
- Lớp `piper.SynthesisConfig` có các trường:
  ```python
  SynthesisConfig(
      speaker_id: Optional[int] = None,
      length_scale: Optional[float] = None,
      noise_scale: Optional[float] = None,
      noise_w_scale: Optional[float] = None,
      normalize_audio: bool = True,
      volume: float = 1.0
  )
  ```
- Thử nghiệm sinh âm thanh thực tế với `vi_VN-vais1000-medium.onnx` thành công 100%:
  - Đoạn kiểm tra: *"Gió mùa thu se lạnh, phẩy, bầu trời xanh trong vắt, chấm."*
  - `length_scale=1.05`, `noise_scale=0.78`, `noise_w_scale=0.90`.
  - Kết quả: Sinh ra 139,308 bytes WAV hợp lệ trong ~250ms (đạt yêu cầu > 10,000 bytes của Acceptance Criteria).

### 2.3. Thiết kế chi tiết cho Yêu cầu R1

#### A. Định nghĩa Bộ thông số Prosody Style Presets (`PROSODY_STYLE_PRESETS`)
Khai báo bảng preset âm học chuẩn sư phạm:
```python
PROSODY_STYLE_PRESETS: Dict[str, Dict[str, Any]] = {
    "warm_story": {
        "noise_scale": 0.78,
        "noise_w_scale": 0.90,
        "length_multiplier": 1.05,
        "label": "Truyền cảm, ấm áp",
        "desc": "Giọng đọc diễn cảm, ấm áp, nhịp điệu thong thả, thích hợp cho văn miêu tả và bài thơ.",
    },
    "standard": {
        "noise_scale": 0.667,
        "noise_w_scale": 0.80,
        "length_multiplier": 1.00,
        "label": "Chuẩn mực sư phạm",
        "desc": "Giọng đọc mẫu mực, cân bằng, rõ ràng từng âm tiết theo chuẩn phát âm SGK.",
    },
    "emphasis": {
        "noise_scale": 0.58,
        "noise_w_scale": 0.72,
        "length_multiplier": 1.20,
        "label": "Nhấn mạnh từ khó",
        "desc": "Đọc chậm hơn, dõng dạc, giảm rung âm để nhấn rõ từng phụ âm/vần khó viết.",
    },
    "question": {
        "noise_scale": 0.82,
        "noise_w_scale": 0.92,
        "length_multiplier": 1.08,
        "label": "Câu hỏi nhẹ nhàng",
        "desc": "Ngữ điệu linh hoạt, cao độ hơi vút lên ở cuối câu hỏi sư phạm.",
    },
}
```

#### B. Thiết kế hàm `inject_pedagogical_punctuation`
**Phân tích bẫy kỹ thuật (Pitfall Analysis)**:
Nếu áp dụng tuần tự các lệnh `re.sub`:
- Thay `!` bằng `, chấm than.` $\to$ phát sinh dấu `.`
- Sau đó thay `.` bằng `, chấm.` $\to$ dấu `.` trong `, chấm than.` bị thay thế tiếp thành `, chấm than, chấm.`!
- Sau đó thay `,` bằng `, phẩy,` $\to$ toàn bộ dấu phẩy mới sinh bị nhân đôi đệ quy!

**Giải pháp Single-Pass Tokenized Regex Replacement**:
Dùng một biểu thức chính quy duy nhất quét qua chuỗi và ánh xạ qua bảng quy đổi:
```python
PUNCT_SPOKEN_MAP = {
    ",": ", phẩy,",
    ".": ", chấm.",
    "?": ", chấm hỏi.",
    "!": ", chấm than.",
    ":": ", hai chấm,",
}

def inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str:
    """Chuyển đổi dấu câu thành lời đọc khẩu ngữ sư phạm trong giờ chính tả nghe - viết:
    ',' -> ', phẩy,'
    '.' -> ', chấm.'
    '?' -> ', chấm hỏi.'
    '!' -> ', chấm than.'
    ':' -> ', hai chấm,'
    """
    if not enabled or not text:
        return text

    # Xử lý dấu 3 chấm trước (tránh bị tách thành 3 dấu chấm đơn)
    t = re.sub(r"\.{3}|…", ", ba chấm,", text)

    # Thay thế trong 1 lượt duy nhất (single pass) ngăn ngừa thay thế đệ quy
    pattern = re.compile(r"([,\.\?!:])")
    t = pattern.sub(lambda m: PUNCT_SPOKEN_MAP.get(m.group(1), m.group(1)), t)

    # Dọn dẹp khoảng trắng kép
    t = re.sub(r"\s+", " ", t).strip()
    return t
```
*Lưu ý vị trí thực thi:* Chuẩn hóa văn bản `normalize_vietnamese_text(text)` chạy trước để chuyển đổi số và từ viết tắt (`3A` $\to$ `ba A`, `tr.` $\to$ `trang `), sau đó mới gọi `inject_pedagogical_punctuation` nếu `read_punctuation=True`.

#### C. Chữ ký cập nhật cho `synthesize_wav` và `play_on_local_speaker`
```python
def synthesize_wav(
    self,
    text: str,
    voice_id: str = "vi_VN-vais1000-medium",
    rate: str = "-15%",
    style: str = "standard",
    noise_scale: Optional[float] = None,
    noise_w: Optional[float] = None,
    read_punctuation: bool = False,
) -> bytes:
```
**Logic tính toán thông số âm học tổng hợp:**
1. Áp dụng `inject_pedagogical_punctuation(norm_text, enabled=read_punctuation)`.
2. Lấy preset từ `PROSODY_STYLE_PRESETS.get(style, PROSODY_STYLE_PRESETS["standard"])`.
3. `base_length_scale` tính từ `rate` (ví dụ: `-15%` $\to$ `1.15`).
4. `final_length_scale = base_length_scale * preset["length_multiplier"]`.
5. `final_noise_scale = noise_scale if noise_scale is not None else preset["noise_scale"]`.
6. `final_noise_w = noise_w if noise_w is not None else preset["noise_w_scale"]`.
7. Truyền vào:
   ```python
   syn_config = SynthesisConfig(
       length_scale=final_length_scale,
       noise_scale=final_noise_scale,
       noise_w_scale=final_noise_w,
   )
   voice.synthesize_wav(injected_text, wav_file, syn_config=syn_config)
   ```
8. Fallback CLI: Truyền `--length_scale`, `--noise_scale`, `--noise_w` vào lệnh subprocess `piper`.

Tương tự cho `play_on_local_speaker`:
```python
def play_on_local_speaker(
    self,
    text: str,
    voice_id: str = "vi_VN-vais1000-medium",
    rate: str = "-15%",
    style: str = "standard",
    noise_scale: Optional[float] = None,
    noise_w: Optional[float] = None,
    read_punctuation: bool = False,
) -> bool:
```

---

## 3. KHẢO SÁT CHI TIẾT VÒNG ĐỜI QWEN & CÁC ENDPOINT (`python_service/main.py`)

### 3.1. Phân tích hiện trạng nạp mô hình Qwen trong `main.py`
1. **Biến toàn cục hiện tại (lines 918-923)**:
   - `_qwen_model = None`
   - `_qwen_tokenizer = None`
   - `_qwen_lock = threading.Lock()`
   - `ENABLE_QWEN_SLM = os.getenv(...)`
   - `QWEN_MODEL_ID = os.getenv(...)`
   - `QWEN_PRECISION = os.getenv(...)`
2. **Hàm `get_qwen_model()` (lines 926-993)**:
   - Nạp `AutoModelForCausalLM` và `AutoTokenizer`.
   - Lưu vào biến toàn cục và không bao giờ xả RAM.
   - Chưa có biến cấu hình `QWEN_LIFECYCLE_MODE`.
3. **Các endpoint hiện có liên quan đến Qwen**:
   - `GET /qwen/status` (lines 1809-1823): Chỉ trả về `enabled`, `model_id`, `precision`, `quantized`, `is_loaded`, `device`. Chưa có thông tin RAM khả dụng, mode lifecycle và cache metrics.
   - `POST /qwen/generate` (lines 1834-1848): Sinh lời nhận xét sư phạm Tầng 2.
   - `POST /qwen/generate-passage` (lines 1858-1867): Sáng tác bài đọc chính tả kèm từ khó.

### 3.2. Đo đạc & Xác thực RAM Đa nền tảng (`get_available_ram_mb`)
Để bảo vệ Raspberry Pi 4 khỏi tràn RAM mà không phụ thuộc vào gói ngoài `psutil`:
- **Trên Linux (Raspberry Pi 4)**: Đọc trực tiếp từ `/proc/meminfo` trường `MemAvailable:` (tính bằng kB $\to$ chia 1024 ra MB). Đây là chỉ số chuẩn xác nhất của Linux Kernel thể hiện lượng bộ nhớ thực tế có thể cấp phát mà không phải swap.
- **Trên Windows (Môi trường Dev của giáo viên)**: Sử dụng hàm Win32 API `GlobalMemoryStatusEx` thông qua `ctypes.windll.kernel32`. Đã chạy thử nghiệm thực tế trong dự án: Trả về chính xác `AvailPhys MB: 7583.05`.

**Mã cài đặt đề xuất**:
```python
def get_available_ram_mb() -> float:
    """Xác định dung lượng RAM khả dụng (MB) hỗ trợ đa nền tảng (Linux RPi & Windows Dev)."""
    if sys.platform.startswith("linux"):
        try:
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if line.startswith("MemAvailable:"):
                        parts = line.split()
                        return round(float(parts[1]) / 1024.0, 2)
        except Exception as e:
            logger.warning(f"Không thể đọc /proc/meminfo: {e}")
    elif sys.platform.startswith("win"):
        try:
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ('dwLength', ctypes.c_ulong),
                    ('dwMemoryLoad', ctypes.c_ulong),
                    ('ullTotalPhys', ctypes.c_ulonglong),
                    ('ullAvailPhys', ctypes.c_ulonglong),
                    ('ullTotalPageFile', ctypes.c_ulonglong),
                    ('ullAvailPageFile', ctypes.c_ulonglong),
                    ('ullTotalVirtual', ctypes.c_ulonglong),
                    ('ullAvailVirtual', ctypes.c_ulonglong),
                    ('sullAvailExtendedVirtual', ctypes.c_ulonglong),
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
                return round(stat.ullAvailPhys / (1024.0 * 1024.0), 2)
        except Exception as e:
            logger.warning(f"Không thể gọi GlobalMemoryStatusEx: {e}")

    return 1024.0  # Fallback an toàn
```

### 3.3. Cơ chế Xả RAM Qwen (`unload_qwen_model`)
```python
def unload_qwen_model():
    """Giải phóng hoàn toàn Qwen2.5-0.5B và Tokenizer khỏi RAM, thu hồi về 0 MB RAM."""
    global _qwen_model, _qwen_tokenizer
    with _qwen_lock:
        if _qwen_model is not None or _qwen_tokenizer is not None:
            logger.info("🧹 [Qwen Unloader] Đang xả mô hình Qwen2.5-0.5B khỏi bộ nhớ RAM...")
            del _qwen_model
            del _qwen_tokenizer
            _qwen_model = None
            _qwen_tokenizer = None
            import gc
            gc.collect()
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass
            logger.info("✅ [Qwen Unloader] Đã giải phóng hoàn toàn Qwen2.5-0.5B (0 MB RAM).")
```

### 3.4. Bộ nhớ đệm In-Memory LRU Prosody Script Cache (`_prosody_script_cache`)
Để đảm bảo các yêu cầu đọc lặp lại hoặc các tiết dạy cùng bài đọc phản hồi tức thì trong `< 1ms` mà không cần kích hoạt lại Qwen:
- **Cấu trúc lưu trữ**: `OrderedDict` với kích thước `MAX_PROSODY_CACHE_SIZE = 100`.
- **Khóa Cache Key**: Mã băm SHA-256 kết hợp nội dung văn bản, khối lớp, chế độ phân đoạn, và danh sách từ khó:
  ```python
  def _get_prosody_cache_key(passage: str, grade: int, chunk_mode: str, difficult_words: list) -> str:
      norm_text = passage.strip().lower()
      norm_words = ",".join(sorted(w.strip().lower() for w in (difficult_words or [])))
      raw = f"{norm_text}_{grade}_{chunk_mode}_{norm_words}"
      return hashlib.sha256(raw.encode("utf-8")).hexdigest()
  ```
- **Tốc độ truy xuất thực nghiệm**: Đã đo đạc thực tế đạt `0.00ms` (< 1ms).

### 3.5. Thiết kế chi tiết Endpoint `POST /qwen/extract-sgk`
**Mục tiêu**: Làm sạch văn bản chụp/quét từ SGK hoặc tài liệu PDF, loại bỏ số trang, tiêu đề đầu trang và câu hỏi bài tập thảo luận; đồng thời trích xuất tự động tiêu đề, đoạn văn sạch và từ khó chính tả.

**Quy trình xử lý**:
```
┌────────────────────────────────────────────────────────┐
│               Nhận raw_text & grade                    │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 1. Tiền xử lý Regex (Loại bỏ số trang, tiêu đề đầu     │
│    sách, các câu hỏi bài tập 'Câu 1:', 'Bài tập:'...)  │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Kiểm tra RAM khả dụng (get_available_ram_mb)        │
└──────────────┬───────────────────────────┬─────────────┘
               │ (RAM >= 650MB)            │ (RAM < 650MB hoặc tắt SLM)
               ▼                           ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Kích hoạt Qwen2.5-0.5B       │ │ Deterministic Fallback       │
│ on-demand để trích xuất sâu  │ │ (Trích xuất bằng phân tích   │
│ JSON: title, clean_content,  │ │ ngữ pháp & âm tiết tiếng Việt│
│ difficultWords, summary      │ │ không tốn RAM)               │
└──────────────┬───────────────┘ └──────────────┬───────────────┘
               │                                │
               └───────────────┬────────────────┘
                               ▼
┌────────────────────────────────────────────────────────┐
│ 3. Khối finally:                                       │
│    Nếu QWEN_LIFECYCLE_MODE == 'on_demand_unload'       │
│    -> Gọi unload_qwen_model()                          │
│    -> Trả về ram_unloaded = True                       │
└────────────────────────────────────────────────────────┘
```

**Chi tiết thuật toán làm sạch tiền xử lý (Textbook Stripping)**:
- **Số trang**: Loại bỏ `r"(?i)\b(?:trang|tr\.?)\s*\d+\b"`, `r"^\s*\d+\s*$"`, `r"\b\d+\s*/\s*\d+\b"`.
- **Đầu sách & Tuần học**: Loại bỏ `r"(?i)^tiếng\s*việt\s*\d+.*"`, `r"(?i)^tập\s*\d+.*"`, `r"(?i)^tuần\s*\d+.*"`, `r"(?i)^bài\s*\d+:?.*"`.
- **Câu hỏi thảo luận & bài tập cuối bài**: Cắt bỏ toàn bộ phần văn bản bắt đầu từ các trigger:
  `r"(?i)^\s*(?:câu\s*\d+|câu\s*hỏi|bài\s*tập|luyện\s*từ\s*và\s*câu|tập\s*làm\s*văn|\*?\s*ghi\s*nhớ|\d+\.\s*(?:em\s+hãy|tìm|hãy|đặt\s+câu|chọn)).*"`

### 3.6. Thiết kế chi tiết Endpoint `POST /qwen/direct-prosody`
**Mục tiêu**: Đóng vai trò "Đạo diễn nhịp đọc sư phạm", phân đoạn bài đọc thành các vế câu chính tả, gán thông số âm học cho từng vế câu, và đặc biệt **bảo toàn 100% từ ngữ và dấu câu gốc của SGK**.

**Bảo toàn 100% từ ngữ (Zero-Word-Mutation Invariant)**:
Để học sinh viết chính tả chuẩn xác theo SGK, AI tuyệt đối không được tự ý sửa đổi hay diễn giải lại văn bản gốc.
- Phân đoạn vế câu được thực hiện bằng thuật toán bảo toàn ký tự:
  Tách theo các ranh giới dấu câu: `([,\.;:!?\n]+)`.
  Mỗi vế câu (`clause`) chứa nguyên vẹn các từ và dấu câu kết thúc của nó.
- Ghép toàn bộ các vế lại sẽ tái hiện chính xác 100% văn bản đầu vào.

**Quy tắc gán nhịp điệu & phong cách cho từng vế câu**:
1. **Kiểm tra từ khó (`matched_difficult_words`)**:
   - Đối soát danh sách `difficult_words` với nội dung vế câu.
   - Nếu vế câu chứa từ khó:
     - `style = "emphasis"`
     - `style_label = "Nhấn mạnh từ khó"`
     - `rate = "-20%"`
     - `noise_scale = 0.58`, `noise_w = 0.72`
     - **Thời gian dừng nghỉ (`pause_sec`) được cộng thêm +2.5 giây** (ví dụ: vế thường nghỉ 2.0s $\to$ vế có từ khó nghỉ **4.5s** để học sinh có đủ thời gian suy nghĩ và nắn nót viết từ khó).
2. **Vế câu hỏi (kết thúc bằng `?` hoặc chứa từ nghi vấn)**:
   - `style = "question"`
   - `style_label = "Câu hỏi nhẹ nhàng"`
   - `rate = "-15%"`
   - `noise_scale = 0.82`, `noise_w = 0.92`
   - `pause_sec = 2.5`
3. **Vế kết thúc câu (kết thúc bằng `.` hoặc `!`)**:
   - `style = "warm_story"`
   - `style_label = "Truyền cảm, ấm áp"`
   - `rate = "-15%"`
   - `noise_scale = 0.78`, `noise_w = 0.90`
   - `pause_sec = 2.0`
4. **Vế ngắt nhịp giữa câu (kết thúc bằng `,`, `;`, `:`)**:
   - `style = "standard"`
   - `style_label = "Chuẩn mực sư phạm"`
   - `rate = "-15%"`
   - `noise_scale = 0.667`, `noise_w = 0.80`
   - `pause_sec = 1.5`

**Cơ chế Cache & Unload**:
- Kiểm tra `_prosody_script_cache`. Nếu trúng cache: trả về ngay lập tức với `cache_hit=True`, `latency_ms < 1.0`, `is_loaded=False`.
- Nếu chưa có trong cache:
  - Kiểm tra RAM: Nếu RAM khả dụng $\ge 650$MB, kích hoạt Qwen tinh chỉnh phong cách cảm xúc của đoạn văn.
  - Sau khi xử lý xong, lưu kết quả vào `_prosody_script_cache`.
  - Trong khối `finally:` thực hiện `unload_qwen_model()` nếu `QWEN_LIFECYCLE_MODE == "on_demand_unload"`.

### 3.7. Cập nhật các Endpoint hiện hữu
1. **`GET /tts`**:
   - Bổ sung các query parameters: `style: str = "standard"`, `noise_scale: Optional[float] = None`, `noise_w: Optional[float] = None`, `read_punctuation: bool = False`.
   - Truyền đầy đủ vào `tts_engine.synthesize_wav`.
2. **`POST /tts/play-local`**:
   - Bổ sung vào `LocalPlayRequest`: `style`, `noise_scale`, `noise_w`, `read_punctuation`.
   - Truyền đầy đủ vào `tts_engine.play_on_local_speaker`.
3. **`GET /qwen/status`**:
   - Mở rộng thông tin trả về:
     ```json
     {
       "enabled": true,
       "lifecycle_mode": "on_demand_unload",
       "is_loaded": false,
       "available_ram_mb": 7583.05,
       "ram_threshold_mb": 650,
       "cache_entries": 4,
       "model_id": "Qwen/Qwen2.5-0.5B-Instruct",
       "precision": "bfloat16",
       "device": "cpu",
       "description": "Tầng 2: SLM Pedagogical Paraphraser & Prosody Director"
     }
     ```

### 3.8. Cấu hình Khởi động trong `start_all.bat`
Hiện trạng dòng 79 của `start_all.bat`:
```bat
start "ViHand AI Service (Port 8000)" cmd /k "cd /d ""%~dp0python_service"" && set PYTHONIOENCODING=utf-8 && set ENABLE_VIT5=1 && set ENABLE_YOLO=1 && set ENABLE_QWEN_SLM=1 && python main.py"
```
Cần bổ sung `set QWEN_LIFECYCLE_MODE=on_demand_unload` để bảo đảm mặc định toàn hệ thống hoạt động ở chế độ giải phóng RAM tức thì:
```bat
start "ViHand AI Service (Port 8000)" cmd /k "cd /d ""%~dp0python_service"" && set PYTHONIOENCODING=utf-8 && set ENABLE_VIT5=1 && set ENABLE_YOLO=1 && set ENABLE_QWEN_SLM=1 && set QWEN_LIFECYCLE_MODE=on_demand_unload && python main.py"
```

---

## 4. MA TRẬN HỢP ĐỒNG API (API CONTRACT MATRIX)

| Endpoint HTTP | Phương thức | Tham số đầu vào chính | Kết quả trả về | Cơ chế RAM & Cache |
|---|---|---|---|---|
| `/tts` | `GET` | `text`, `voice`, `rate`, `style`, `noise_scale`, `noise_w`, `read_punctuation` | `audio/wav` bytes stream | Piper ONNX (< 120MB RAM) |
| `/tts/play-local` | `POST` | `{ text, voice, rate, style, noise_scale, noise_w, read_punctuation }` | `{ success: bool, message: str }` | Phát trực tiếp ra Loa Pi |
| `/qwen/status` | `GET` | Không | Trạng thái RAM, `is_loaded`, `lifecycle_mode`, `cache_entries` | Đọc `/proc/meminfo` |
| `/qwen/extract-sgk` | `POST` | `{ raw_text: str, grade: int }` | `{ title, clean_content, difficultWords, summary, source, ram_unloaded }` | Check 650MB RAM, Auto-unload |
| `/qwen/direct-prosody` | `POST` | `{ passage: str, difficult_words: list, grade: int, chunk_mode: str }` | `{ clauses: [...], cache_hit: bool, is_loaded: false, latency_ms }` | LRU Cache (< 1ms), Auto-unload |

---

## 5. ĐÁNH GIÁ TÍCH HỢP VỚI NEXT.JS BFF & CÁC MÀN HÌNH GIAO DIỆN

### 5.1. Next.js BFF Routes (`app/api/dictation/...`)
1. **`app/api/dictation/tts/route.ts`**:
   - Hiện đã nhận `text`, `voice`, `rate`.
   - Cần nhận thêm từ query string: `style`, `noise_scale`, `noise_w`, `read_punctuation` và chuyển tiếp đến `:8000/tts`.
2. **`app/api/dictation/play-local/route.ts`**:
   - Cần chuyển tiếp `style`, `noise_scale`, `noise_w`, `read_punctuation` trong JSON body đến `:8000/tts/play-local`.
3. **`app/api/dictation/qwen-director/route.ts` (Tạo mới)**:
   - `GET`: Proxy tới `http://127.0.0.1:8000/qwen/status`.
   - `POST`: Nhận `{ action: "extract_sgk", raw_text, grade }` $\to$ gọi `:8000/qwen/extract-sgk`.
   - `POST`: Nhận `{ action: "direct_prosody", passage, difficult_words, grade, chunk_mode }` $\to$ gọi `:8000/qwen/direct-prosody`.

### 5.2. Giao diện Giáo viên & Học sinh
1. **`app/teacher/dictation/page.tsx`**:
   - Thêm Live Badge RAM: `Ngủ 0MB RAM` (xanh ngọc) / `Đang xử lý` / `Đã xả RAM & Lưu cache`.
   - Thêm Dialog **"📄 Trích xuất SGK / PDF (Qwen2.5)"**: Dán hoặc tải file `.txt` bài đọc, gọi API làm sạch và tự động điền tiêu đề, bài đọc, từ khó.
   - Thêm nút **"🎬 Qwen2.5 Đạo diễn Nhịp đọc"**: Gọi `/api/dictation/qwen-director` lấy danh sách vế câu đạo diễn, hiển thị huy hiệu `warm_story`, `emphasis`, thời gian nghỉ `pause_sec`.
   - Bộ điều khiển âm học: Chọn style (`warm_story`, `standard`, `emphasis`, `question`) và bật/tắt **"Đọc tên dấu câu (phẩy, chấm)"**.
   - Cập nhật vòng lặp phát âm Bước 3: Dùng `clause.style`, `clause.rate`, `clause.pause_sec`.
2. **`app/teacher/grade/page.tsx` & `components/student/student-grade-detail-modal.tsx` & `app/student/page.tsx`**:
   - Thêm nút **"🔊 Nghe cô giáo đọc nhận xét"** trên khung nhận xét: `voice=vi_VN-vais1000-medium&style=warm_story`.
   - Cập nhật nút nghe phát âm từ sửa lỗi sang: `voice=vi_VN-vais1000-medium&style=emphasis` để học sinh nghe rõ từng âm tiết khó.
