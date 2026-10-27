# BÁO CÁO ĐẶC TẢ KỸ THUẬT HỢP ĐỒNG API (API CONTRACT SPECIFICATION)
## Kiến trúc Phân tầng Semantic-Acoustic Decoupled Pipeline (Qwen2.5 SLM + Piper VITS ONNX)
**Dự án**: ViHand Grade — Hệ sinh thái Chấm điểm & Luyện viết chính tả thông minh  
**Nền tảng tối ưu**: Raspberry Pi 4 (4GB RAM) & Edge Server (Windows/Linux)  
**Ngày lập đặc tả**: 2026-10-18T19:04:00Z  
**Tác giả**: Specification Miner Agent (`spec_miner_survey_1`)  
**Tài liệu tham chiếu chuẩn**: `ORIGINAL_REQUEST.md` (2026-10-18T18:59:10Z), `orchestrator_4/DISPATCH.md`

---

## 1. TỔNG QUAN KIẾN TRÚC VÀ NGUYÊN LÝ HOẠT ĐỘNG

Hệ thống Dictation & Pedagogical Speech của ViHand Grade áp dụng mô hình **Phân tách Ngữ nghĩa - Âm học (Semantic-Acoustic Decoupled Pipeline)**:
1. **Tầng Đạo diễn Ngữ nghĩa (Semantic Director - Qwen2.5-0.5B-Instruct)**:
   - Đảm nhiệm việc làm sạch ngữ liệu SGK/PDF, phân tích ngữ pháp, nhận diện từ khó và đạo diễn nhịp ngắt nghỉ, cao độ, phong cách biểu cảm cho từng vế câu.
   - Vận hành theo cơ chế **Staged On-Demand Activation & Auto-Unload (`ON_DEMAND_UNLOAD`)**: Chỉ nạp mô hình vào RAM khi cần xử lý, kiểm tra RAM khả dụng (ngưỡng tối thiểu 650 MB), sau đó giải phóng hoàn toàn bộ nhớ (`0 MB RAM idle`) thông qua khối `finally`.
   - Tích hợp bộ nhớ đệm kịch bản **LRU Prosody Script Cache**: Các văn bản đã được đạo diễn sẽ lưu trữ theo hàm băm (`hash(passage + difficult_words + grade + chunk_mode)`), các lần truy vấn tiếp theo trả kết quả trong `< 1ms` mà không cần nạp lại SLM.
2. **Tầng Tổng hợp Âm thanh (Acoustic Synthesizer - Piper VITS ONNX Runtime)**:
   - Động cơ tổng hợp giọng đọc ngoại tuyến đơn tầng, Real-Time Factor < 0.15 trên ARM Cortex-A72.
   - Điều khiển ngữ điệu động qua 4 thông số âm học: `length_scale`, `noise_scale`, `noise_w_scale` kết hợp bộ chuyển đổi đọc tên dấu câu sư phạm (`inject_pedagogical_punctuation`).

### Sơ đồ Dòng Dữ liệu & Điều phối (ASCII Architecture Flow)
```
+---------------------------------------------------------------------------------+
|                       WEB APP FRONTEND (Client Browser)                         |
|  - Teacher Dictation: Buoc 1 (Mau), Buoc 2 (Tu kho), Buoc 3 (Doc), Buoc 4 (Soat)|
|  - Teacher Grading: Nghe nhan xet su pham (warm_story), Phat am tu sai (emphasis) |
|  - Student Portal: Luyen phat am kho tu kho, Nghe nhan xet cua co giao          |
+---------------------------------------------------------------------------------+
        │                                                         ▲
        │ HTTP / JSON                                            │ Audio Stream (WAV)
        ▼                                                         │
+---------------------------------------------------------------------------------+
|                    NEXT.JS BFF GATEWAY (Port 3000)                              |
|  - Rate Limiting Guard (lib/api-guard.ts)                                        |
|  - GET  /api/dictation/tts          ──> Forward query params                     |
|  - POST /api/dictation/play-local   ──> Forward JSON body                        |
|  - GET  /api/dictation/qwen-director──> Proxy status / health                    |
|  - POST /api/dictation/qwen-director──> Action Multiplexer (extract / prosody)  |
+---------------------------------------------------------------------------------+
        │                                                         ▲
        │ HTTP REST (Timeout 5s - 30s)                           │ WAV / DTO
        ▼                                                         │
+---------------------------------------------------------------------------------+
|               PYTHON AI CORE MICROSERVICE (FastAPI - Port 8000)                 |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | [1] QWEN2.5-0.5B ON-DEMAND LIFECYCLE (python_service/main.py)              |  |
|  | - get_available_ram_mb() (Check RAM >= 650 MB)                           |  |
|  | - LRU _prosody_script_cache (Response < 1ms on cache hit)                |  |
|  | - POST /qwen/extract-sgk (Clean text + SGK extractor + Auto-Unload)      |  |
|  | - POST /qwen/direct-prosody (Clause segmentation + Prosody + Auto-Unload)|  |
|  | - finally: unload_qwen_model() -> _qwen_model = None, gc.collect()       |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | [2] PIPER VITS ONNX ACOUSTIC ENGINE (python_service/tts_engine.py)        |  |
|  | - Presets: warm_story | standard | emphasis | question                    |  |
|  | - inject_pedagogical_punctuation(text, enabled=True)                      |  |
|  | - GET  /tts (Audio/WAV synthesis with SynthesisConfig)                    |  |
|  | - POST /tts/play-local (Direct hardware speaker: aplay / winsound)       |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

---

## 2. BẢNG TẬP HỢP TÍNH NĂNG ĐƯỢC PHÁT HIỆN (FEATURES DISCOVERED)

| # | Phân loại | Tính năng | Mô tả chức năng | Dữ liệu Đầu vào (Inputs) | Dữ liệu Đầu ra (Outputs) | Cơ chế Xử lý Lỗi (Error Behavior) | Phương thức Khảo sát |
|---|---|---|---|---|---|---|---|
| 1 | BFF Audio Stream | `GET /api/dictation/tts` | Forward yêu cầu phát âm TTS đến Python Core, stream nhị phân WAV về trình duyệt | Query params: `text`, `voice`, `speed`/`rate`, `style`, `noise_scale`, `noise_w`, `read_punctuation` | `audio/wav` stream, Headers (`Content-Type`, `Cache-Control`, `X-TTS-Engine`) | 400 (Thiếu text), 503 (Core offline), 504 (Timeout 15s) | `app/api/dictation/tts/route.ts` & `python_service/main.py` |
| 2 | BFF Local Play | `POST /api/dictation/play-local` | Ra lệnh Raspberry Pi phát trực tiếp ra loa phần cứng (3.5mm AUX / USB) | JSON: `{ text, voice, rate/speed, style, noise_scale, noise_w, read_punctuation }` | JSON: `{ success: boolean, message: string }` | 400 (Thiếu text), 502 (Lỗi loa phần cứng), 504 (Timeout 15s) | `app/api/dictation/play-local/route.ts` |
| 3 | BFF Director Status | `GET /api/dictation/qwen-director` | Kiểm tra tình trạng nạp của Qwen2.5, lượng RAM trống và thống kê Cache | None | JSON: `{ enabled, lifecycle_mode, is_loaded, available_ram_mb, cache_stats, ... }` | 503 (Core offline), Fallback status JSON an toàn | Khảo sát yêu cầu R2/R3 & `main.py` |
| 4 | BFF Director Action: SGK | `POST /api/dictation/qwen-director` (`action: "extract_sgk"`) | Trích xuất ngữ liệu sạch từ văn bản thô hoặc PDF/SGK tải lên, tách tiêu đề và từ khó | JSON: `{ action: "extract_sgk", raw_text: string, grade?: number }` | JSON: `{ success: true, title, clean_content, difficultWords, summary, source, ram_unloaded }` | 400 (Văn bản rỗng), 429 (Rate limit), Fallback bộ lọc regex SGK nếu RAM < 650 MB | Khảo sát yêu cầu R2/R3 & `main.py` |
| 5 | BFF Director Action: Prosody | `POST /api/dictation/qwen-director` (`action: "direct_prosody"`) | Tách vế câu bảo toàn 100% chữ/dấu, gắn nhãn biểu cảm, tham số âm học và thời gian ngắt nghỉ | JSON: `{ action: "direct_prosody", passage, difficult_words, grade, chunk_mode }` | JSON: `{ success: true, clauses: ClauseItem[], cache_hit, ram_unloaded }` | 400 (Văn bản rỗng), Cache hit < 1ms, Fallback tách quy tắc sư phạm nếu lỗi SLM | Khảo sát yêu cầu R2/R3 & `main.py` |
| 6 | Python TTS Core | `GET /tts` | Tổng hợp sóng âm WAV sử dụng Piper ONNX với cấu hình âm học động | Query: `text`, `voice`, `rate`, `style`, `noise_scale`, `noise_w`, `read_punctuation` | Binary WAV bytes (`Content-Type: audio/wav`) | 400 (Text rỗng), 500 (Piper crash), Fallback sinh sóng beeps tần số 440Hz nếu thiếu model | `python_service/main.py:1746` |
| 7 | Python Hardware Audio | `POST /tts/play-local` | Phát âm trực tiếp trên card âm thanh cục bộ thiết bị qua subprocess ALSA `aplay` hoặc Windows `winsound` | JSON: `{ text, voice, rate, style, noise_scale, noise_w, read_punctuation }` | JSON: `{ success: boolean, message: string }` | 400 (Văn bản rỗng), 500 (Thiếu card âm thanh / driver hỏng) | `python_service/main.py:1791` |
| 8 | Python SLM Status | `GET /qwen/status` | Báo cáo chi tiết trạng thái RAM, chế độ `on_demand_unload` và hiệu quả bộ nhớ đệm kịch bản | None | JSON: `{ lifecycle_mode, is_loaded, available_ram_mb, min_ram_threshold_mb, ... }` | 500 (Lỗi hệ điều hành khi đọc RAM) | `python_service/main.py:1809` |
| 9 | Python SGK Cleaner | `POST /qwen/extract-sgk` | Lọc bỏ số trang (`Trang 45`), câu hỏi thảo luận, kích hoạt Qwen on-demand giải phóng RAM | JSON: `{ raw_text: string, grade: int }` | JSON: `{ title, clean_content, difficultWords, summary, source, ram_unloaded }` | 400 (Rỗng), Fallback Deterministic Extractor nếu RAM < 650 MB | Khảo sát yêu cầu R2 & `main.py` |
| 10 | Python Prosody Director | `POST /qwen/direct-prosody` | Phân đoạn ngữ lưu, tra cứu cache hash, gắn tham số âm học, xả RAM trong khối `finally` | JSON: `{ passage, difficult_words, grade, chunk_mode }` | JSON: `{ clauses: [...], cache_hit, ram_unloaded, latency_ms }` | 400 (Rỗng), Fallback Rule-based Prosody Segmenter | Khảo sát yêu cầu R2 & `main.py` |
| 11 | TTS Prosody Presets | `PROSODY_STYLE_PRESETS` | Định nghĩa ma trận tham số âm học 4 phong cách sư phạm (`warm_story`, `standard`, `emphasis`, `question`) | Tên preset: string | Tuple: `(noise_scale, noise_w_scale, length_multiplier)` | Trả về preset `standard` nếu tên style không hợp lệ | `python_service/tts_engine.py` |
| 12 | Pedagogical Punctuation | `inject_pedagogical_punctuation` | Thay thế các dấu câu thành từ ngữ đọc chính tả sư phạm trong tiếng Việt | Chuỗi văn bản tiếng Việt kèm cờ `enabled: bool` | Chuỗi văn bản đã chèn nhãn đọc dấu (`, phẩy,`, `, chấm.`, v.v.) | Trả về văn bản gốc nếu `enabled=False` hoặc chuỗi rỗng | `python_service/tts_engine.py` |

---

## 3. ĐẶC TẢ CHI TIẾT CÁC ENDPOINT API (DETAILED SPECIFICATIONS)

### 3.1. Nhóm Endpoint BFF Gateway (Next.js - Port 3000)

#### Endpoint 1: `GET /api/dictation/tts`
- **Mục đích**: Chuyển tiếp yêu cầu tổng hợp âm thanh từ trình duyệt xuống dịch vụ Python trên Raspberry Pi/Edge Server.
- **Phương thức HTTP**: `GET`
- **Query Parameters**:
  | Tham số | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả & Ràng buộc giá trị |
  |---|---|---|---|---|
  | `text` | `string` | **Có** | — | Nội dung văn bản cần phát âm. Không được rỗng sau khi trim. Độ dài tối đa khuyến nghị 500 từ. |
  | `voice` | `string` | Không | `"vi_VN-vais1000-medium"` | ID của giọng đọc Piper ONNX. Tùy chọn: `"vi_VN-vais1000-medium"`, `"vi_VN-mailinh-medium"`, `"vi_VN-25hours_single-low"`, hoặc model clone giáo viên. |
  | `speed` / `rate` | `string` / `number` | Không | `"-15%"` | Tốc độ đọc. Chấp nhận dạng phần trăm (`"-15%"`, `"-25%"`, `"+10%"`) hoặc hệ số (`0.85`). Tốc độ chuẩn sư phạm tiểu học là `"-15%"`. |
  | `style` | `string` | Không | `"standard"` | Phong cách biểu cảm ngữ điệu: `"warm_story"` (ấm áp truyền cảm), `"standard"` (chuẩn mực), `"emphasis"` (nhấn mạnh từ khó), `"question"` (câu hỏi). |
  | `noise_scale` | `number` | Không | Preset | Ghi đè biến thiên âm vị (0.0 đến 1.5). Ví dụ: `0.78`. |
  | `noise_w` | `number` | Không | Preset | Ghi đè độ dài âm tiết ngẫu nhiên (0.0 đến 1.5). Ví dụ: `0.90`. |
  | `read_punctuation` | `boolean` / `string` | Không | `false` | Nếu `true` hoặc `"true"`, kích hoạt đọc tên dấu câu (`, phẩy,`, `, chấm.`, v.v.). |

- **Headers Gửi đi**: Không yêu cầu header đặc thù.
- **Headers Phản hồi (Thành công - HTTP 200)**:
  ```http
  Content-Type: audio/wav
  Cache-Control: public, max-age=86400, s-maxage=86400
  X-TTS-Engine: Piper-VITS-ONNX-Offline-RPi
  X-Prosody-Style: warm_story
  ```
- **Response Body**: Luồng nhị phân âm thanh định dạng WAV (PCM 16-bit, 22.050 Hz, Mono).
- **Cơ chế Timeout**: `15.000 ms` (15 giây) qua `AbortController`.
- **Mã Trạng thái & Phản hồi Lỗi**:
  * `400 Bad Request`:
    ```json
    { "error": "Thiếu nội dung văn bản cần đọc" }
    ```
  * `503 Service Unavailable` (Khi không kết nối được tới Python Service `:8000`):
    ```json
    { "error": "Không thể kết nối đến trạm phát âm thanh Raspberry Pi. Vui lòng kiểm tra dịch vụ python_service." }
    ```
  * `504 Gateway Timeout` (Khi xử lý quá 15s):
    ```json
    { "error": "Dịch vụ TTS Raspberry Pi quá hạn xử lý (Timeout 15s)" }
    ```

---

#### Endpoint 2: `POST /api/dictation/play-local`
- **Mục đích**: Điều khiển Raspberry Pi phát âm thanh trực tiếp ra Loa phần cứng cắm tại lớp học (jack 3.5mm AUX hoặc loa USB).
- **Phương thức HTTP**: `POST`
- **Request Headers**: `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "text": "Bầu trời mùa thu xanh trong vắt.",
    "voice": "vi_VN-vais1000-medium",
    "rate": "-15%",
    "style": "warm_story",
    "noise_scale": 0.78,
    "noise_w": 0.90,
    "read_punctuation": false
  }
  ```
  | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả |
  |---|---|---|---|---|
  | `text` | `string` | **Có** | — | Câu hoặc vế văn bản cần phát ra loa lớp học. |
  | `voice` | `string` | Không | `"vi_VN-vais1000-medium"` | ID mô hình Piper giọng đọc. |
  | `rate` | `string` | Không | `"-15%"` | Tốc độ phát âm. |
  | `style` | `string` | Không | `"standard"` | Phong cách biểu cảm âm học. |
  | `noise_scale` | `number` | Không | Theo style | Hệ số nhiễu biến thiên âm vị. |
  | `noise_w` | `number` | Không | Theo style | Hệ số nhiễu thời lượng nguyên âm. |
  | `read_punctuation` | `boolean` | Không | `false` | Đọc tên dấu câu sư phạm hay không. |

- **Response Body (Thành công - HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Đã phát ra loa cục bộ thiết bị",
    "voice": "vi_VN-vais1000-medium",
    "style": "warm_story",
    "read_punctuation": false
  }
  ```
- **Cơ chế Timeout**: `15.000 ms` qua `AbortController`.
- **Mã Trạng thái & Phản hồi Lỗi**:
  * `400 Bad Request`: `{ "error": "Thiếu nội dung văn bản" }`
  * `502 Bad Gateway`: `{ "error": "Lỗi kết nối đến thiết bị phát âm thanh Raspberry Pi" }`
  * `504 Gateway Timeout`: `{ "error": "Quá hạn xử lý phát loa cục bộ (Timeout 15s)" }`

---

#### Endpoint 3: `GET /api/dictation/qwen-director`
- **Mục đích**: Cung cấp trạng thái sống (Liveness & Health) của bộ điều phối Qwen2.5 SLM cho Web App Dashboard.
- **Phương thức HTTP**: `GET`
- **Query Parameters**: Không.
- **Cơ chế Xử lý**: Chuyển tiếp đến `GET http://127.0.0.1:8000/qwen/status` với timeout `5.000 ms`.
- **Response Body (Thành công - HTTP 200)**:
  ```json
  {
    "enabled": true,
    "lifecycle_mode": "on_demand_unload",
    "model_id": "Qwen/Qwen2.5-0.5B-Instruct",
    "precision": "bfloat16",
    "quantized": true,
    "is_loaded": false,
    "available_ram_mb": 2185.5,
    "min_ram_threshold_mb": 650,
    "ram_safe_to_load": true,
    "device": "cpu",
    "cache_stats": {
      "cached_scripts": 3,
      "cache_hits": 18,
      "cache_misses": 3
    },
    "description": "Tầng 2: SLM Pedagogical Director & Staged On-Demand Engine"
  }
  ```
- **Fallback Ngoại tuyến**: Khi Python Service chưa bật, trả về HTTP 200 với trạng thái thông báo an toàn:
  ```json
  {
    "enabled": false,
    "lifecycle_mode": "offline",
    "is_loaded": false,
    "available_ram_mb": 0,
    "ram_safe_to_load": false,
    "status": "unavailable",
    "error": "Dịch vụ Python AI Core chưa sẵn sàng"
  }
  ```

---

#### Endpoint 4: `POST /api/dictation/qwen-director` (Action Multiplexer)
- **Mục đích**: Điểm tiếp nhận duy nhất cho các tác vụ phân tích ngôn ngữ sư phạm nâng cao từ giao diện giáo viên.
- **Phương thức HTTP**: `POST`
- **Request Headers**: `Content-Type: application/json`
- **Bảo vệ Bảo mật**: Tích hợp `guardAiRoute(req, 20)` (tối đa 20 yêu cầu/phút/IP để bảo toàn tài nguyên CPU Pi).
- **Cơ chế Timeout**: `30.000 ms` (30 giây) để đáp ứng thời gian nạp on-demand mô hình Qwen từ thẻ nhớ MicroSD/USB khi cache miss.

##### Nhánh Tác vụ A: `action: "extract_sgk"`
- **Request Body (JSON)**:
  ```json
  {
    "action": "extract_sgk",
    "raw_text": "Tiếng Việt 3 - Tập 1\nTrang 48\nBài đọc: MÙA HOA TÂY BẮC\nKhi làn gió xuân ấm áp tràn về, núi rừng Tây Bắc bừng sáng bởi sắc trắng tinh khôi của hoa ban và sắc thắm rực rỡ của hoa đào rừng. Tiếng khèn bè ngân vang réo rắt bên sườn non như lời mời gọi tha thiết của mùa lễ hội truyền thống.\nCâu hỏi thảo luận:\n1. Em hãy tìm những từ ngữ miêu tả hoa ban?\n2. Mùa xuân Tây Bắc có gì đặc biệt?",
    "grade": 3
  }
  ```
  | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mô tả |
  |---|---|---|---|
  | `action` | `"extract_sgk"` | **Có** | Định danh tác vụ trích xuất ngữ liệu SGK. |
  | `raw_text` | `string` | **Có** | Văn bản copy từ file PDF hoặc giáo viên dán vào. |
  | `grade` | `number` | Không | Khối lớp tiểu học (1 đến 5). Mặc định là 3. |

- **Response Body (Thành công - HTTP 200)**:
  ```json
  {
    "success": true,
    "action": "extract_sgk",
    "title": "Mùa Hoa Tây Bắc",
    "clean_content": "Khi làn gió xuân ấm áp tràn về, núi rừng Tây Bắc bừng sáng bởi sắc trắng tinh khôi của hoa ban và sắc thắm rực rỡ của hoa đào rừng. Tiếng khèn bè ngân vang réo rắt bên sườn non như lời mời gọi tha thiết của mùa lễ hội truyền thống.",
    "difficultWords": ["Tây Bắc", "tinh khôi", "hoa ban", "rực rỡ", "khèn bè", "réo rắt", "tha thiết"],
    "summary": "Đoạn văn miêu tả vẻ đẹp lộng lẫy và âm thanh rộn rã của mùa xuân vùng cao Tây Bắc.",
    "grade": 3,
    "source": "qwen2.5_on_demand",
    "ram_unloaded": true,
    "latency_ms": 1380.5
  }
  ```

##### Nhánh Tác vụ B: `action: "direct_prosody"`
- **Request Body (JSON)**:
  ```json
  {
    "action": "direct_prosody",
    "passage": "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen.",
    "difficult_words": "se lạnh, trong vắt, gợn mây",
    "grade": 2,
    "chunk_mode": "clause"
  }
  ```
  | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mô tả |
  |---|---|---|---|
  | `action` | `"direct_prosody"` | **Có** | Định danh tác vụ đạo diễn nhịp đọc chính tả. |
  | `passage` | `string` | **Có** | Đoạn văn chuẩn giáo viên muốn học sinh nghe - viết. |
  | `difficult_words` | `string` hoặc `string[]` | Không | Danh sách các từ khó phát âm hoặc dễ viết sai dấu. |
  | `grade` | `number` | Không | Khối lớp (1 đến 5, mặc định 3). |
  | `chunk_mode` | `string` | Không | Chế độ ngắt: `"clause"` (vế câu), `"sentence"` (trọn câu), `"phrase"` (cụm 3-5 từ). Mặc định: `"clause"`. |

- **Response Body (Thành công - HTTP 200)**:
  ```json
  {
    "success": true,
    "action": "direct_prosody",
    "grade": 2,
    "chunk_mode": "clause",
    "clauses": [
      {
        "index": 0,
        "text": "Gió mùa thu se lạnh thổi qua từng kẽ lá.",
        "word_count": 9,
        "style": "emphasis",
        "style_label": "Nhấn mạnh từ khó",
        "rate": "-15%",
        "noise_scale": 0.58,
        "noise_w": 0.72,
        "pause_sec": 14.5,
        "matched_difficult_words": ["se lạnh"]
      },
      {
        "index": 1,
        "text": "Bầu trời xanh trong vắt,",
        "word_count": 5,
        "style": "emphasis",
        "style_label": "Nhấn mạnh từ khó",
        "rate": "-15%",
        "noise_scale": 0.58,
        "noise_w": 0.72,
        "pause_sec": 10.5,
        "matched_difficult_words": ["trong vắt"]
      },
      {
        "index": 2,
        "text": "không một gợn mây đen.",
        "word_count": 5,
        "style": "emphasis",
        "style_label": "Nhấn mạnh từ khó",
        "rate": "-15%",
        "noise_scale": 0.58,
        "noise_w": 0.72,
        "pause_sec": 10.5,
        "matched_difficult_words": ["gợn mây"]
      }
    ],
    "cache_hit": false,
    "ram_unloaded": true,
    "source": "qwen2.5_director",
    "latency_ms": 1450.2
  }
  ```

---

### 3.2. Nhóm Endpoint Python AI Core Service (FastAPI - Port 8000)

#### Endpoint 5: `GET /tts` (`python_service/main.py`)
- **Định nghĩa hàm**:
  ```python
  @app.get("/tts")
  async def tts_endpoint(
      text: str,
      voice: str = "vi_VN-vais1000-medium",
      rate: str = "-15%",
      speed: Optional[str] = None,
      style: str = "standard",
      noise_scale: Optional[float] = None,
      noise_w: Optional[float] = None,
      read_punctuation: bool = False
  )
  ```
- **Xử lý tham số**:
  - Ưu tiên `speed` nếu được truyền, nếu không dùng `rate`.
  - Gọi `tts_engine.synthesize_wav(text, voice_id=voice, rate=rate, style=style, noise_scale=noise_scale, noise_w=noise_w, read_punctuation=read_punctuation)`.
  - Phản hồi kiểu `fastapi.responses.Response` với `media_type="audio/wav"`.

#### Endpoint 6: `POST /tts/play-local` (`python_service/main.py`)
- **Pydantic Model**:
  ```python
  class LocalPlayRequest(BaseModel):
      text: str
      voice: str = "vi_VN-vais1000-medium"
      rate: str = "-15%"
      speed: Optional[str] = None
      style: str = "standard"
      noise_scale: Optional[float] = None
      noise_w: Optional[float] = None
      read_punctuation: bool = False
  ```
- **Hành vi**:
  - Gọi `tts_engine.play_on_local_speaker(...)`.
  - Trả về `{ "success": True, "message": "Đã phát ra loa cục bộ thiết bị", "style": req.style, "read_punctuation": req.read_punctuation }`.

#### Endpoint 7: `GET /qwen/status` (`python_service/main.py`)
- **Logic kiểm tra**:
  - Đo RAM khả dụng qua `get_available_ram_mb()`.
  - Kiểm tra `_qwen_model is not None`.
  - Trả về số lượng phần tử trong `_prosody_script_cache`.

#### Endpoint 8: `POST /qwen/extract-sgk` (`python_service/main.py`)
- **Pydantic Model**:
  ```python
  class ExtractSgkRequest(BaseModel):
      raw_text: str
      grade: Optional[int] = 3
  ```
- **Xử lý**:
  - Tiền xử lý Regex: Loại bỏ các dòng `Trang \d+`, `tr\. \d+`, `Câu \d+:.*`, `Bài tập.*`.
  - Kiểm tra RAM: Nếu `get_available_ram_mb() < 650`, tự động dùng `deterministic_sgk_extractor` để chống OOM.
  - Nếu đủ RAM: Nạp Qwen on-demand, sinh JSON, sau đó gọi `unload_qwen_model()` trong khối `finally`.

#### Endpoint 9: `POST /qwen/direct-prosody` (`python_service/main.py`)
- **Pydantic Model**:
  ```python
  class DirectProsodyRequest(BaseModel):
      passage: str
      difficult_words: Optional[Any] = None # Union[str, List[str]]
      grade: Optional[int] = 3
      chunk_mode: Optional[str] = "clause" # clause, sentence, phrase
  ```
- **Xử lý**:
  - Sinh khóa băm: `cache_key = hashlib.sha256(f"{req.passage}:{req.difficult_words}:{req.grade}:{req.chunk_mode}".encode("utf-8")).hexdigest()`.
  - Nếu `cache_key` có trong `_prosody_script_cache`, trả về ngay lập tức với `"cache_hit": True`.
  - Nếu chưa có: Nạp Qwen (hoặc bộ phân tách quy chuẩn tiếng Việt), phân tách vế câu.
  - **Quy tắc bất biến (Strict Invariant)**: Toàn bộ danh sách vế câu khi nối lại bằng khoảng trắng phải khớp 100% từng chữ và từng dấu câu so với `req.passage`.
  - Mỗi vế chứa từ khó được gán:
    * `style: "emphasis"`
    * `style_label: "Nhấn mạnh từ khó"`
    * `noise_scale: 0.58`, `noise_w: 0.72`
    * `pause_sec = round(base_pause + 2.5, 1)`
  - Lưu kết quả vào `_prosody_script_cache` (dung lượng tối đa 100 kịch bản, tự xóa mục cũ nhất).
  - Khối `finally`: Bắt buộc gọi `unload_qwen_model()`.

---

## 4. MA TRẬN PHONG CÁCH ÂM HỌC (PROSODY STYLE PRESETS)

Đặc tả các hằng số âm học chuẩn hóa cho `Piper VITS ONNX` tại `python_service/tts_engine.py`:

| Tên Preset (`style`) | `noise_scale` | `noise_w_scale` | `length_multiplier` | Mục đích Sư phạm | Kịch bản Áp dụng |
|---|---|---|---|---|---|
| `warm_story` | **0.78** | **0.90** | **1.05** | Truyền cảm, ấm áp, cao độ uốn lượn tự nhiên như giọng cô giáo | Bước 1 đọc mẫu toàn bài; Đọc nhận xét sư phạm tổng kết |
| `standard` | **0.667** | **0.80** | **1.00** | Rõ ràng, dõng dạc, nhịp độ chuẩn mực | Bước 3 đọc chính tả các câu thông thường; Lời dẫn chuyển bước |
| `emphasis` | **0.58** | **0.72** | **1.20** | Tốc độ chậm rãi (+20% độ dài), phát âm tròn vành rõ chữ, giảm biến thiên ngẫu nhiên | Bước 2 luyện từ khó; Các vế câu có chứa từ khó; Nút nghe từ sửa sai |
| `question` | **0.82** | **0.92** | **1.08** | Tăng biến thiên âm vị, ngữ điệu lên giọng ở cuối câu hỏi | Các câu kết thúc bằng dấu chấm hỏi (`?`); Câu hỏi gợi mở tư duy |

### Công thức Tính toán Length Scale của Piper:
```python
# Tốc độ đọc % (VD: rate="-15%" -> tốc độ chậm 15% -> base_scale = 1.15)
base_scale = 1.0 + abs(rate_val) / 100.0 if rate_val < 0 else max(0.5, 1.0 - rate_val / 100.0)

# Nhân với hệ số phong cách:
final_length_scale = base_scale * preset.length_multiplier
```

---

## 5. BỘ CHUYỂN ĐỔI ĐỌC TÊN DẤU CÂU SƯ PHẠM (PEDAGOGICAL PUNCTUATION)

Hàm `inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str` trong `python_service/tts_engine.py`:

| Ký tự Gốc | Ký tự Thay thế Đọc | Ví dụ Đầu vào | Kết quả Chuyển đổi |
|---|---|---|---|
| `,` (phẩy) | `, phẩy,` | `Gió mùa thu se lạnh, bầu trời xanh.` | `Gió mùa thu se lạnh, phẩy, bầu trời xanh, chấm.` |
| `.` (chấm) | `, chấm.` | `Bầu trời xanh trong vắt.` | `Bầu trời xanh trong vắt, chấm.` |
| `?` (chấm hỏi) | `, chấm hỏi.` | `Em đã làm bài chưa?` | `Em đã làm bài chưa, chấm hỏi.` |
| `!` (chấm than) | `, chấm than.` | `Mùa xuân đã về rồi!` | `Mùa xuân đã về rồi, chấm than.` |
| `:` (hai chấm) | `, hai chấm,` | `Cô giáo dặn:` | `Cô giáo dặn, hai chấm,` |
| `...` (ba chấm) | `, ba chấm.` | `Rừng cọ quê tôi...` | `Rừng cọ quê tôi, ba chấm.` |

*Lưu ý ngữ âm*: Các từ chèn vào được kẹp giữa 2 dấu phẩy để Piper tự động tạo khoảng nghỉ vi mô (micro-pause ~250ms), giúp học sinh tiểu học nghe kịp tên dấu câu mà không bị dính chữ.

---

## 6. QUẢN LÝ BỘ NHỚ RAM VÀ VÒNG ĐỜI ON-DEMAND TRÊN RASPBERRY PI 4

### 6.1. Phương thức Đo RAM Khả dụng (`get_available_ram_mb()`)
- **Trên Linux / Raspberry Pi**:
  Đọc trực tiếp từ file hạt nhân `/proc/meminfo`, bóc tách trường `MemAvailable: ... kB` (chia cho 1024 để ra MB). Đây là thước đo chính xác nhất về dung lượng RAM có thể cấp phát ngay mà không gây Swapping.
- **Trên Windows**:
  Sử dụng thư viện `ctypes` gọi Windows API `kernel32.GlobalMemoryStatusEx`, đọc trường `ullAvailPhys / (1024 * 1024)`.

### 6.2. Phương thức Giải phóng Bộ nhớ (`unload_qwen_model()`)
```python
def unload_qwen_model():
    global _qwen_model, _qwen_tokenizer
    with _qwen_lock:
        if _qwen_model is not None or _qwen_tokenizer is not None:
            logger.info("🧹 [Qwen On-Demand] Đang xả mô hình Qwen2.5 khỏi RAM...")
            _qwen_model = None
            _qwen_tokenizer = None
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info("✅ [Qwen On-Demand] Đã xả RAM hoàn tất (Idle 0 MB RAM).")
```

### 6.3. Khối Thực thi An toàn Bắt buộc (Pattern chuẩn)
Mọi endpoint kích hoạt Qwen (`/qwen/extract-sgk`, `/qwen/direct-prosody`, v.v.) BẮT BUỘC phải đặt trong cấu trúc `try ... finally`:
```python
try:
    if get_available_ram_mb() < 650:
        logger.warning("⚠️ RAM khả dụng < 650MB -> Kích hoạt bộ xử lý dự phòng không dùng mô hình.")
        return run_deterministic_fallback(...)
    model, tokenizer = get_qwen_model()
    # Thực hiện suy luận...
    return result
finally:
    if QWEN_LIFECYCLE_MODE == "on_demand_unload":
        unload_qwen_model()
```

---

## 7. BẢNG KHẢO SÁT CÁC TRƯỜNG HỢP BIÊN & DỊ THƯỜNG (EDGE CASES)

| # | Tính năng liên quan | Dữ liệu Đầu vào (Input) | Hành vi Quan sát & Đặc tả Xử lý (Observed / Expected Behavior) |
|---|---|---|---|
| 1 | `GET /api/dictation/tts` | `text=""` hoặc chỉ có khoảng trắng `   ` | Trả về HTTP 400 `{ "error": "Thiếu nội dung văn bản cần đọc" }`. Không kích hoạt subprocess hay động cơ Piper. |
| 2 | `GET /api/dictation/tts` | Ký tự dấu câu liên tiếp: `...,,,,???` | Bộ `normalize_vietnamese_text` gộp dấu câu dư thừa thành `...`, sau đó `inject_pedagogical_punctuation` đổi thành `, ba chấm.` an toàn, không làm Piper bị giật âm. |
| 3 | `POST /qwen/extract-sgk` | Văn bản lẫn số trang & câu hỏi: `Trang 45 - Câu 1: Em hãy tả...` | Loại bỏ hoàn toàn dòng `Trang 45` và các câu hỏi thảo luận; chỉ giữ lại tiêu đề và đoạn văn chính tả mẫu. |
| 4 | `POST /qwen/extract-sgk` | Hệ thống RAM chỉ còn 450 MB (< 650 MB ngưỡng an toàn) | Không nạp Qwen; kích hoạt bộ trích xuất quy tắc `deterministic_sgk_extractor`, trả về `source: "pedagogical_heuristic_fallback"`, `ram_unloaded: true`. |
| 5 | `POST /qwen/direct-prosody` | Trùng lặp đoạn văn và tham số đã gọi trước đó | Tra cứu trúng cache hash trong `_prosody_script_cache`; trả về kịch bản trong `< 1ms` với `"cache_hit": true` mà không cần nạp Qwen. |
| 6 | `POST /qwen/direct-prosody` | Danh sách từ khó chứa chữ hoa và chữ thường: `difficult_words="Lúa Chín, rực rỡ"` | So khớp không phân biệt chữ hoa chữ thường (`case-insensitive`) nhưng bảo toàn 100% định dạng chữ viết gốc trong văn bản. |
| 7 | `POST /qwen/direct-prosody` | Đoạn văn không có dấu câu nào (chỉ là chuỗi từ liên tục) | Tự động phân đoạn theo độ dài 5-7 từ/vế để đảm bảo học sinh tiểu học kịp chép bài. |
| 8 | `POST /api/dictation/qwen-director` | Trường `action` mang giá trị lạ: `action: "unknown_task"` | Trả về HTTP 400: `{ "error": "Hành động (action) không hợp lệ. Chỉ chấp nhận 'extract_sgk' hoặc 'direct_prosody'." }`. |
| 9 | `POST /api/dictation/play-local` | Thiết bị không có loa hoặc card âm thanh ALSA bị bận | Bắt ngoại lệ subprocess, trả về HTTP 502 `{ "error": "Lỗi khi phát ra loa", "success": false }` mà không làm crash tiến trình Python. |
| 10 | Toàn bộ Next.js BFF | Python microservice bị tắt hoặc crash | Trình điều khiển `fetch` bắt lỗi kết nối hoặc AbortError, trả về mã HTTP 503/504 kèm thông báo tiếng Việt thân thiện, không trả về raw HTML error. |

---

## 8. HƯỚNG DẪN TÍCH HỢP CHO GIAO DIỆN NGƯỜI DÙNG (FRONTEND INTEGRATION SPEC)

### 8.1. Trang Giáo viên Luyện Chính tả (`app/teacher/dictation/page.tsx`)
1. **Huy hiệu Trạng thái RAM & Qwen (Header Status Badge)**:
   - Polling nhẹ hoặc kiểm tra khi mở trang tới `GET /api/dictation/qwen-director`.
   - Hiển thị badge:
     * `is_loaded === false` & `available_ram_mb > 650`: `Badge variant="outline"` màu xanh emerald: **"Ngủ 0MB RAM (Sẵn sàng)"**.
     * Khi đang gọi extract/prosody: Badge màu amber kèm spinner: **"Đang nạp Qwen2.5 & xử lý..."**.
     * Sau khi hoàn tất: **"Đã lưu kịch bản & Xả RAM (0MB)"**.
2. **Dialog Trích xuất SGK / PDF (Qwen2.5)**:
   - Nút bấm `Button` **"📄 Trích xuất SGK / PDF (Qwen2.5)"**.
   - Mở Dialog cho phép paste text hoặc chọn file `.txt`.
   - Bấm "Trích xuất" -> gọi `POST /api/dictation/qwen-director` với `{ action: "extract_sgk", raw_text, grade }`.
   - Tự động điền dữ liệu trả về vào state `title`, `passageText`, `difficultWords`.
3. **Nút "🎬 Qwen2.5 Đạo diễn Nhịp đọc" & Bảng Xem trước Prosody Script**:
   - Gọi `POST /api/dictation/qwen-director` với `{ action: "direct_prosody", passage: passageText, difficult_words: difficultWords, grade, chunk_mode }`.
   - Hiển thị bảng danh sách các vế câu: Cột số thứ tự, Nội dung vế câu, Badge phong cách (`warm_story`, `emphasis`), Tốc độ đọc, Thời gian nghỉ (`pause_sec`), Từ khó nổi bật.
4. **Vòng lặp Đọc chính tả Bước 3 (Nghe - Viết chính thức)**:
   - Sử dụng các tham số `style`, `rate`, `noise_scale`, `noise_w`, `pause_sec` của từng vế câu trong mảng `clauses` thay vì dùng thông số cố định.
   - Thêm nút Toggle **"Đọc tên dấu câu (phẩy, chấm)"** gắn với `read_punctuation: true`.

### 8.2. Trang Chấm bài Giáo viên & Cổng Học sinh (`app/teacher/grade`, `app/student`)
1. **Nút "🔊 Nghe cô giáo đọc nhận xét"**:
   - Thêm vào khung `PedagogicalComment`:
     ```typescript
     const playTeacherComment = (commentText: string) => {
       const url = `/api/dictation/tts?text=${encodeURIComponent(commentText)}&voice=vi_VN-vais1000-medium&style=warm_story`
       new Audio(url).play()
     }
     ```
2. **Nút Phát âm Từ sửa sai (Word Correction Pronunciation)**:
   - Cập nhật hàm phát âm từ trong bảng sửa lỗi chính tả:
     ```typescript
     const playWordPronunciation = (correctWord: string) => {
       const url = `/api/dictation/tts?text=${encodeURIComponent(correctWord)}&voice=vi_VN-vais1000-medium&style=emphasis`
       new Audio(url).play()
     }
     ```

---
*Tài liệu đã được xác thực đối chiếu trực tiếp với mã nguồn dự án ViHand Grade.*
