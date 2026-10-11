# -*- coding: utf-8 -*-
import os

filepath = '01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md'
with open(filepath, 'rb') as f:
    raw = f.read()

cut_pos = raw.find(b'B\xe1\xbb\x99 l\xe1\xbb\x8dc Filter Chips ph\xc3\xa2n lo\xe1\xba\xa1i theo')
part1 = raw[:cut_pos].decode('utf-8')

hdr_idx = raw.find(b'# PH\xe1\xba\xa6N IV:')
part4 = raw[hdr_idx:].decode('utf-8')

part2_missing = """Bộ lọc Filter Chips phân loại theo Thể loại và 4 khoảng điểm số Thông tư 27.
- **Độ tin cậy & Kiểm thử:** Vượt qua 100% bộ kiểm thử tự động **23/23 Tests** (Robolectric SDK 36 Pixel 8, Unit tests, Roborazzi snapshot tests, stress tests). Kích thước APK tối ưu: `25.38 MB` (`app-debug.apk`).

#### B. Nền tảng Web Studio & PWA (`app/`)
- **Nền tảng công nghệ:** Next.js `16.2.4` (App Router), React `19`, TypeScript `5.7.3`, Tailwind CSS `v4`, Radix UI.
- **3 Phân hệ giao diện theo vai trò (RBAC):**
  - **Giáo viên (`/teacher`):** AI Grading Studio (quy trình 5 bước với Bounding Box interactive editor), Dictation Studio (nghe - phát âm Edge-TTS với 50+ bài trích SGK GDPT 2018), Sổ điểm lớp học và biểu đồ phổ điểm Recharts.
  - **Học sinh (`/student`):** Dashboard rèn luyện, Sổ tay từ khó cá nhân hóa kèm audio phát âm, Tra cứu lịch sử bài thi và xem lại ảnh bài làm gốc.
  - **Quản trị viên (`/admin`):** Quản lý người dùng & lớp học, Giám sát tài nguyên hệ thống (CPU, RAM, độ trễ, token), Thiết lập chính sách bảo vệ dữ liệu trẻ em theo Nghị định 13/2023.
- **Khả năng PWA:** Hỗ trợ cài đặt trên máy tính bảng giáo viên với Service Worker (`/app/sw.js`) và Dynamic App Icons.

---

### 2.2. Tầng 2: Cổng Giao tiếp & Backend-for-Frontend (Gateway / BFF Tier)

Hệ thống triển khai mô hình BFF thông qua App Router của Next.js 16 bao gồm **24 route handlers** (38 HTTP methods), không sử dụng Server Actions nhằm bảo đảm tính tương thích RESTful nguyên bản giữa Web Client và Android Client.

#### Điểm Nhấn: Gateway Đa Năng `/api/mobile/grade`
Được thiết kế chuyên biệt cho ứng dụng Android Native, thực hiện toàn bộ chuỗi xử lý phức tạp chỉ trong một lời gọi mạng duy nhất:
1. **Kiểm soát Tần suất:** Gọi `guardAiRoute(req, 20)` bảo vệ endpoint không vượt quá 20 req/phút/IP.
2. **Xử lý Song song (Parallel Processing):** Kích hoạt đồng thời qua `Promise.all`:
   - `runGeminiOCR`: Gọi Gemini Vision OCR với cơ chế xoay vòng Multi-API Keys trích xuất `original_text` và `fixed_text`.
   - `detectYoloBoxes`: Gửi ảnh sang Python AI Core `POST http://127.0.0.1:8000/detect-words` để quét tọa độ Bounding Box của từng từ.
3. **Gọi Trực tiếp Trong Bộ Nhớ (In-process Direct Invocation):**
   Gọi trực tiếp hàm `handleGradePost` của `app/api/grade/route.ts` trong cùng tiến trình Node.js (Zero-network delay) để thực thi thuật toán so khớp Levenshtein và sinh điểm Thông tư 27.
4. **Ánh xạ Hợp đồng (Data Transformation):** Chuyển đổi toàn bộ kết quả sang cấu trúc DTO `GradeApiResponse` khớp 100% với Moshi Adapter phía Android.
5. **Tự động Lưu trữ (Auto Persistence):** Tự động bóc tách ảnh Base64 ghi file vật lý ra đĩa và lưu bản ghi kết quả vào bảng `Grade` trong Prisma `vihand.db`.

#### Bộ Lọc Tần Suất Cửa Sổ Trượt (In-Memory Sliding Window Rate Limiting)
Triển khai tại `lib/api-guard.ts` (109 dòng):
- Lưu trữ danh sách mốc thời gian truy cập trong `Map<string, { timestamps: number[] }>`.
- Chu kỳ dọn rác tự động `setInterval` mỗi 60 giây dọn sạch các IP không hoạt động, loại bỏ triệt để rò rỉ bộ nhớ (Memory Leak).
- Hạn mức: `/api/mobile/grade` (20 req/phút), `/api/grade` (30 req/phút), `/api/yolo/detect` (60 req/phút).
- Khi vi phạm: Phản hồi HTTP `429 Too Many Requests` kèm headers chuẩn `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

---

### 2.3. Tầng 3: Lõi Xử lý Trí tuệ Nhân tạo Đa Dịch vụ (AI Microservices Core Tier)

Được xây dựng trên nền tảng **FastAPI** (`python_service/main.py`), vận hành độc lập tại cổng `8000`:

#### 1. YOLOv8 Word Detector & Thuật Toán Vertical Overlap (`python_service/yolo_detector.py`)
- **Trọng số mô hình:** `best.pt` được huấn luyện chuyên biệt trên tập dữ liệu vở ô ly học sinh tiểu học Việt Nam. Kích thước ảnh chuẩn hóa `imgsz = 640`.
- **Thuật toán Gom dòng Vertical Overlap (Ngưỡng 0.40):**
  Khắc phục nhược điểm của thuật toán quét tâm $y_{mid}$ khi gặp các ký tự vươn cao (*b, h, l, d*) hoặc hạ thấp (*g, y, p*). Thuật toán tính toán độ giao thoa theo phương thẳng đứng giữa hộp chữ mới và dải bao trung bình của dòng kẻ:
  $$\\text{overlap\\_ratio} = \\frac{\\max(0.0, \\min(by_2, \\text{line\\_y2\\_avg}) - \\max(by_1, \\text{line\\_y1\\_avg}))}{\\min(\\text{box\\_h}, \\text{line\\_h})}$$
  Nếu $\\text{overlap\\_ratio} \\ge 0.40$, từ được xếp vào dòng tương ứng. Sau đó sắp xếp dòng từ trên xuống dưới và từ trong dòng từ trái sang phải theo thứ tự đọc tự nhiên.
- **Tọa độ tương đối:** Toàn bộ bounding box được chuẩn hóa về dải $[0.0, 1.0]$ (`rel_x1, rel_y1, rel_w, rel_h`).

#### 2. Động Cơ Sửa Lỗi Chính Tả ViT5 & Phân Loại Âm Tiết (`python_service/main.py`)
- **Mô hình định danh:** `chamdentimem/ViT5_Vietnamese_Correction` (Seq2Seq Transformer, 226M tham số).
- **Dynamic INT8 Quantization:** Lượng tử hóa động các lớp tuyến tính (`torch.qint8`), giảm dung lượng RAM chiếm dụng từ 1.1GB xuống còn **~510MB**, tăng tốc suy luận CPU từ 30% đến 50%.
- **Giải pháp Chia Đoạn Ngắt Câu (Prose Chunking $\\le 160$ ký tự):**
  Chia nhỏ đoạn văn theo dấu chấm câu sao cho độ dài mỗi đoạn $\\le 160$ ký tự ($\\approx 240$ SentencePiece tokens), vừa vặn trong cửa sổ ngữ cảnh `max_length = 256`. Tuyệt đối không dùng cửa sổ trượt (sliding window) để triệt tiêu hoàn toàn hiện tượng lặp lại câu trước trong output.
- **Bộ Phân tích Âm tiết & So khớp Levenshtein (Syllable Parser):**
  Bóc tách âm tiết tiếng Việt thành 5 thành phần (âm đầu, âm đệm, âm chính, âm cuối, dấu thanh). Kết hợp `difflib.SequenceMatcher` để phân loại chính xác 6 nhóm lỗi ngữ âm và tính điểm trừ 0.5đ/lỗi.

#### 3. Mô Hình Sinh Ngôn Ngữ Nhỏ Qwen 2.5-0.5B-Instruct
- **Cấu hình tài nguyên:** Chạy ở độ chính xác `bfloat16`, chỉ tiêu tốn **~577MB RAM**, rất phù hợp cho Raspberry Pi 4.
- **Nhiệm vụ 1: Lời nhận xét sư phạm ấm áp:** Nhận diện các biện pháp tu từ (so sánh, từ láy, nhân hóa) từ Tier-1 Analyzer, sinh 3 phương án nhận xét khích lệ theo đúng tinh thần Thông tư 27 (khen ngợi sáng tạo trước, nhắc lỗi chính tả sau).
- **Nhiệm vụ 2: Sáng tác bài đọc SGK 2018:** Sinh đoạn văn chính tả theo khối lớp (1 đến 5), chủ đề bài học và trích xuất danh sách từ khó viết.

#### 4. Động Cơ Phát Âm Chuẩn Sư Phạm Microsoft Edge-TTS
- Tích hợp thư viện `edge-tts` với 2 giọng đọc tự nhiên: **Cô Hoài My** (`vi-VN-HoaiMyNeural`) và **Thầy Nam Minh** (`vi-VN-NamMinhNeural`).
- Thiết lập tốc độ đọc `rate = "-15%"` mô phỏng nhịp đọc bài chuẩn mực của giáo viên tiểu học. Stream trực tiếp dữ liệu âm thanh qua HTTP GET `/tts` với độ trễ $< 1.0$ giây.

#### 5. Kênh Gemini Vision Multimodal Cloud OCR
- Sử dụng mô hình `gemini-3.1-flash-lite` làm kênh nhận diện thị giác chính từ ảnh chụp bài thi thô.
- Thiết lập `temperature: 0.05` và prompt 5 bước bắt buộc giữ nguyên 100% lỗi sai của học sinh và ràng buộc số từ tương ứng $1:1$ giữa `original_text` và `fixed_text`.
- Hỗ trợ xoay vòng nhiều API keys khi chạm hạn mức HTTP 429 và fallback sang `gemini-2.5-flash`.

---

### 2.4. Tầng 4: Cơ sở Dữ liệu & Trạm Tính toán Biên (Database & Edge Computing Tier)

#### 1. Cơ Sở Dữ Liệu Prisma SQLite (`prisma/vihand.db`)
- **Tối ưu hóa đa kết nối (High Concurrency Design):**
  Kích hoạt chế độ Write-Ahead Logging thông qua `lib/prisma.ts`:
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA synchronous = NORMAL;
  ```
  Cho phép nhiều kết nối đọc chạy song song không bị chặn bởi 1 kết nối ghi, loại bỏ triệt để lỗi `"database is locked"` khi học sinh nộp bài đồng loạt.
- **Chống Phình to Cơ sở Dữ liệu (Image Bloat Shield):**
  Hàm `saveImageToDisk` bóc tách Base64 và ghi tệp ảnh vật lý vào `public/uploads/grades/${Date.now()}-${random}.jpg`. Cột `imageBase64` trong DB được để rỗng, chỉ lưu đường dẫn `imagePath`, giữ cho kích thước `vihand.db` ổn định (~22.4 MB).

#### 2. Cơ Sở Dữ Liệu Cục Bộ Room DB v4 (`vihand_grade.db`)
- Lưu trữ offline trên thiết bị Android: Bảng `grade_records` (bổ sung cột `serverId` ở phiên bản v4), `classes`, `students`.
- Tích hợp 10 câu lệnh SQL truy vấn thống kê sư phạm phục vụ Thông tư 27 (tỷ lệ Xuất sắc, Tốt, Khá, Cần cố gắng, Top học sinh cần rèn luyện).
- Cơ chế **Đồng bộ hai chiều (`syncTwoWayWithServer`)**: Đẩy các bài chấm offline lên server (`POST /api/grades`) và tải các bài mới từ server về máy (`GET /api/grades`) mà không ghi đè dữ liệu trùng lặp.

#### 3. Trạm Biên Phần Cứng (Hardware Appliance): Raspberry Pi 4 / Jetson Nano
- **Bộ nhớ Swap 3072MB (`00_init_system.sh`):** Cấu hình swap 3GB và `vm.swappiness = 20`. Đây là giải pháp sống còn giúp bo mạch Pi 4 (4GB RAM) không bị nhân Linux Out-Of-Memory (OOM Killer) ngắt tiến trình khi nạp đồng thời ViT5 INT8 (~500MB), YOLOv8 (~80MB) và Next.js build.
- **Giới hạn Tài nguyên CGroups Systemd (`03_setup_services.sh`):**
  - Dịch vụ `vihand-python.service`: Giới hạn `MemoryHigh=2000M`, `MemoryMax=2500M`, `CPUQuota=90%`.
  - Dịch vụ `vihand-web.service`: Giới hạn `MemoryHigh=1600M`, `MemoryMax=2048M`, `CPUQuota=85%`, `NODE_OPTIONS="--max-old-space-size=1536"`.
- **Tường lửa Cô lập UFW (`04_setup_network_firewall.sh`):**
  Chặn toàn bộ truy cập từ ngoài vào cổng `8000` của Python Core. Toàn bộ lưu lượng mạng bắt buộc phải đi qua cổng `3000` (Next.js AI Gateway) để được kiểm soát phiên làm việc và lọc tần suất DoS.
- **Cloudflare Named Tunnel (`05_setup_cloudflare_tunnel.sh`):**
  Kết nối trạm biên nội bộ ra tên miền Internet an toàn `https://vihandgrade.click` thông qua đường hầm mã hóa outbound TLS của `cloudflared`. Hoàn toàn không cần mở port modem (No Port Forwarding), không cần IP tĩnh, vượt qua mọi lớp CGNAT của nhà mạng.

---

"""

part3 = """# PHẦN III: HỆ THỐNG SƠ ĐỒ ĐẶC TẢ KIẾN TRÚC & QUY TRÌNH TOÀN DIỆN (SYSTEM ARCHITECTURE BLUEPRINTS)

Tất cả 6 sơ đồ kiến trúc và quy trình dưới đây được thiết kế và đặc tả chi tiết bằng đồ họa ký tự chuẩn (Unicode Box-Drawing Blueprints), phản ánh chính xác cấu trúc thực tế của hệ sinh thái ViHand Grade, đảm bảo tính trực quan, sắc nét và khả chuyển tuyệt đối trên mọi môi trường hiển thị.

### 3.1. Sơ đồ Kiến trúc Tổng quan 4 Tầng Hệ thống (System Overview 4-Tier Architecture)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TẦNG CLIENT & THIẾT BỊ ĐẦU CUỐI (CLIENT TIER)                                                 │
│  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ Android Native Client (Kotlin / Compose)    │    │ Web Studio & PWA (Next.js 16 / React 19)│ │
│  │ • SDK 36 (Android 16), Min SDK 24            │    │ • Tailwind CSS v4 + Radix UI            │ │
│  │ • CameraX 1.5.0 (Low-latency capture)        │    │ • Service Worker offline cache (PWA)    │ │
│  │ • Lockstep Co-Transformation (Pinch 1x-4x)   │    │ • AI Grading Studio (5-Step Stepper)    │ │
│  │ • Dynamic Difficult Words Notebook           │    │ • Dictation Studio & SGK Corpus Browser │ │
│  │ • Room Database v4 (vihand_grade.db)         │    │ • Admin Control Center & System Monitor │ │
│  └──────────────────────┬───────────────────────┘    └────────────────────┬────────────────────┘ │
└─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────┘
                          │ HTTP POST (Base64 Image / DTO)                  │ Web Fetch (HTTP REST)
                          ▼                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. TẦNG CỔNG GIAO TIẾP & BFF GATEWAY (GATEWAY / BFF TIER - Next.js 16 App Router :3000)          │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ In-Memory Sliding Window Rate Limiting Guard (lib/api-guard.ts • 20-60 req/min/IP)         │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│         ┌───────────────────────────────────────┼───────────────────────────────────────┐        │
│         ▼                                       ▼                                       ▼        │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌────────────────────────────┐  │
│  │ Mobile All-in-One BFF Route │ │ Core Grading & Alignment    │ │ Dictation & Audio Stream   │  │
│  │ POST /api/mobile/grade      │ │ POST /api/grade             │ │ GET /api/dictation/tts     │  │
│  │ (Parallel Vision & YOLO)    │ │ (LCS Diff, ViT5, Fallback)  │ │ (Edge-TTS / Google Bridge) │  │
│  └──────────────┬──────────────┘ └──────────────┬──────────────┘ └─────────────┬──────────────┘  │
│                 │                               │                              │                 │
│                 │ ┌─────────────────────────────┴────────────────────────────┐ │                 │
│                 └─► Prisma Client v5.22.0 ORM (PRAGMA journal_mode = WAL)    ◄─┘                 │
└───────────────────┼─────────────────────────────┬──────────────────────────────┼─────────────────┘
                    │ Parallel Vision Call        │ Local Loopback (:8000)       │ Stream Audio
                    │ (Multi-Key Rotation)        │ (INT8 / bfloat16)            │ (audio/mpeg)
                    ▼                             ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────────────────────────────────────────┐
│      TẦNG CLOUD VLM          │ │ 3. TẦNG LÕI AI MICROSERVICES (FASTAPI PYTHON CORE :8000)       │
│  ┌────────────────────────┐  │ │  ┌──────────────────────────────┐ ┌──────────────────────────┐ │
│  │ Google Gemini Cloud    │  │ │  │ YOLOv8 Word Detector         │ │ ViT5 Correction Engine   │ │
│  │ • gemini-3.1-flash-lite│  │ │  │ • best.pt (640x640)          │ │ • Dynamic INT8 CPU       │ │
│  │ • gemini-2.5-flash FB  │  │ │  │ • Vertical Overlap (0.40)    │ │ • Prose Chunking <=160   │ │
│  │ • Zero-Loss Prompt     │  │ │  │ • Rel BBoxes [0.0, 1.0]      │ │ • 6 Phân nhóm lỗi ngữ âm │ │
│  │ • Xoay vòng Multi-Keys │  │ │  └──────────────────────────────┘ └──────────────────────────┘ │
│  └────────────────────────┘  │ │  ┌──────────────────────────────┐ ┌──────────────────────────┐ │
│                              │ │  │ Qwen 2.5-0.5B-Instruct SLM   │ │ Microsoft Edge-TTS Engine│ │
│                              │ │  │ • bfloat16 (~577MB RAM)      │ │ • HoaiMy & NamMinh Neural│ │
│                              │ │  │ • Nhận xét sư phạm TT27      │ │ • Tốc độ chuẩn: rate=-15%│ │
│                              │ │  └──────────────────────────────┘ └──────────────────────────┘ │
└──────────────────────────────┘ └────────────────────────────────┬───────────────────────────────┘
                                                                  │ Ghi bản ghi / Lưu ảnh đĩa
                                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. TẦNG CƠ SỞ DỮ LIỆU & TRẠM TÍNH TOÁN BIÊN (DATABASE & EDGE APPLIANCE TIER)                    │
│  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ SQLite Database (prisma/vihand.db • 22.4MB)  │    │ Lưu trữ Ảnh Vật lý (Anti-Bloat Shield)  │ │
│  │ • PRAGMA journal_mode = WAL                  │    │ • /public/uploads/grades/mobile-*.jpg   │ │
│  │ • PRAGMA busy_timeout = 5000; synchronous=NRM│    │ • imageBase64 rỗng, chỉ lưu imagePath   │ │
│  │ • Soft Purge & Anonymization (NĐ 13/2023)    │    │ • Tự động unlink khi xóa bài chấm       │ │
│  └──────────────────────────────────────────────┘    └─────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Trạm Biên Phần Cứng: Raspberry Pi 4 Model B (4GB RAM) / Nvidia Jetson Nano (4GB VRAM)      │  │
│  │ • Swap: 3072MB (vm.swappiness = 20) chống tràn RAM OOM Killer khi chạy đồng thời Next + AI  │  │
│  │ • CGroups Systemd: vihand-python (Max 2.5GB), vihand-web (Max 2.0GB, Heap 1.5GB)           │  │
│  │ • Tường lửa UFW: Khóa cổng 8000 nội bộ, chỉ mở cổng 3000 (Web Gateway) & 22 (SSH)          │  │
│  │ • Cloudflare Named Tunnel (vihandgrade.click): Ingress TLS an toàn, vượt CGNAT nhà mạng    │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2. Sơ đồ Mô hình Cộng tác Hybrid Edge-Cloud & Định tuyến Dự phòng Zero-Token Offline

#### A. Sơ đồ Tuần tự Quyết định Định tuyến Thông minh (Smart AI Routing Sequence):

```
 Giáo viên/HS       App / Web         Gateway (:3000)     Python Core (:8000)    Gemini Cloud          DB / Disk
      │                 │                    │                     │                   │                   │
  1   ├─ Nộp bài thi ──►│                    │                     │                   │                   │
      │                 │                    │                     │                   │                   │
  2   │                 ├─ POST /api/grade ─►│                     │                   │                   │
      │                 │  (hoặc mobile)     │                     │                   │                   │
  3   │                 │                    ├─ Rate Limit Check ──┐                   │                   │
      │                 │                    │  (Sliding Window)   │                   │                   │
      │                 │                    │◄────────────────────┘                   │                   │
      │                 │                    │                                         │                   │
      │   ┌─── [TRƯỜNG HỢP 1: CÓ BÀI MẪU GROUND TRUTH (ZERO-TOKEN OFFLINE)] ───────────────────────────┐   │
      │   │                                  │                                         │               │   │
  4   │   │                                  ├─ LCS Diff Opcodes ──┐                   │               │   │
      │   │                                  │  (Zero-Hallucination)                   │               │   │
      │   │                                  │◄────────────────────┘                   │               │   │
  5   │   │                                  ├─ Phân tích 6 nhóm lỗi ─────────────►│                   │   │
      │   │                                  │  (parse_vietnamese_syllable)        │                   │   │
  6   │   │                                  │◄─ Trả về chi tiết lỗi & điểm 7đ-3đ ─┤                   │   │
  7   │   │                                  ├─ Lưu kết quả (tokenCount = 0) ─────────────────────────►│   │
  8   │   │             │◄─ Hoàn thành chấm ─┤  (0đ phí Cloud, 0 Token)                                │   │
      │   │             │   bài Zero-Token   │                                                         │   │
      │   └─── [KẾT THÚC TRƯỜNG HỢP 1] ────────────────────────────────────────────────────────────────┘   │
      │                                      │                                         │                   │
      │   ┌─── [TRƯỜNG HỢP 2: CHẤM TỪ ẢNH CHỤP BÀI THI VIẾT TAY (HYBRID MODE)] ────────────────────────┐   │
      │   │                                  │                     │                   │               │   │
      │   │   ┌── PARALLEL PROCESSING (Xử lý đồng thời) ──────────────────────────┐    │               │   │
  9   │   │   ├─ Gọi Gemini OCR (5 bước prompt) ──────────────────────────────────────►│               │   │
 10   │   │   ├─ Gửi ảnh sang YOLOv8 (:8000/detect-words) ────────►│                   │               │   │
 11   │   │   │◄─ Trả về tọa độ relative BBoxes [0.0, 1.0] ────────┤                   │               │   │
 12   │   │   │◄─ Trả về original_text & fixed_text ───────────────────────────────────┤               │   │
      │   │   └── HOÀN TẤT PARALLEL ──────────────────────────────────────────────┘    │               │   │
      │   │                                  │                                         │               │   │
 13   │   │                                  ├─ So khớp thứ tự đọc ┐                   │               │   │
      │   │                                  │  (Universal Reading)│                   │               │   │
      │   │                                  │◄────────────────────┘                   │               │   │
      │   │                                  │                                         │               │   │
      │   │   ┌── PHÂN NHÁNH ĐỘNG CƠ SỬA LỖI & SINH LỜI PHÊ ───────────────────────┐   │               │   │
      │   │   │ [Nhánh A: ViT5 Cục bộ Khả dụng]                    │               │   │               │   │
 14a  │   │   ├─ Gọi ViT5 INT8 & Qwen 2.5 SLM ────────────────────►│               │   │               │   │
 14b  │   │   │◄─ Trả về văn bản sửa lỗi & 3 phương án nhận xét ───┤               │   │               │   │
      │   │   │ ────────────────────────────────────────────────── │ ───────────── │   │               │   │
      │   │   │ [Nhánh B: ViT5 Bị Treo / Timeout -> Fallback Nóng] │               │   │               │   │
 15a  │   │   ├─ Gọi Gemini Text Grading Prompt (Barem BGD&ĐT) ───────────────────────►│               │   │
 15b  │   │   │◄─ Trả về điểm số Thông tư 27 & nhận xét dự phòng ──────────────────────┤               │   │
      │   │   └── KẾT THÚC PHÂN NHÁNH ─────────────────────────────────────────────┘   │               │   │
      │   │                                  │                                                         │   │
 16   │   │                                  ├─ Tách Base64 ghi đĩa, lưu bản ghi Grade ───────────────►│   │
 17   │   │             │◄─ GradeApiResponse ┤  (Kèm đầy đủ BBoxes, lỗi sai & điểm số)                │   │
      │   │             │   (HTTP 200 OK)    │                                                         │   │
      │   └─── [KẾT THÚC TRƯỜNG HỢP 2] ────────────────────────────────────────────────────────────────┘   │
      │                 │                    │                     │                   │                   │
 18   ├─ Nhận kết quả ◄─┤                    │                     │                   │                   │
      │  (Xem ảnh/BBox) │                    │                     │                   │                   │
      ▼                 ▼                    ▼                     ▼                   ▼                   ▼
```

#### B. Sơ đồ Khối Điều kiện Rẽ nhánh (Routing Decision Flowchart):

```
                        ┌──────────────────────────────────────────────┐
                        │          BẮT ĐẦU YÊU CẦU CHẤM ĐIỂM           │
                        └──────────────────────┬───────────────────────┘
                                               │
                                               ▼
                                    /─────────────────────\
                                   <  Đầu vào có văn bản   >
                                   <  mẫu Ground Truth?    >
                                    \─────────────────────/
                                       │               │
                         CÓ (Đã có bài │               │ KHÔNG (Chưa có bài mẫu)
                         chuẩn từ SGK) │               │
                                       ▼               ▼
┌──────────────────────────────────────────────┐    /─────────────────────\
│         CHẾ ĐỘ ZERO-TOKEN OFFLINE            │   <  Đầu vào là Ảnh chụp  >
│  • So khớp chuỗi LCS Diff Opcodes 1-1        │   <  hay Văn bản thuần?   >
│  • Phân tích âm tiết Levenshtein 6 nhóm lỗi  │    \─────────────────────/
│  • Áp Barem Thông tư 27 (Chính tả 7đ - HT 3đ)│       │                 │
│  • tokenCount = 0 (100% Cục bộ, 0đ chi phí)  │       │ Ảnh chụp bài    │ Văn bản nhập tay
└──────────────────────┬───────────────────────┘       ▼                 ▼
                       │                    ┌──────────────────────┐     │
                       │                    │   XỬ LÝ SONG SONG    │     │
                       │                    │ 1. Gemini Cloud OCR  │     │
                       │                    │ 2. YOLOv8 Edge BBox  │     │
                       │                    └──────────┬───────────┘     │
                       │                               │                 │
                       │                               ▼                 │
                       │                    ┌──────────────────────┐     │
                       │                    │ Ánh xạ Bounding Box  │     │
                       │                    │ theo thứ tự đọc tự   │     │
                       │                    │ nhiên Universal Order│     │
                       │                    └──────────┬───────────┘     │
                       │                               │                 │
                       │                               ▼                 │
                       │                    /─────────────────────\ ◄────┘
                       │                   <     Dịch vụ ViT5      >
                       │                   <  cục bộ có sẵn sàng?  >
                       │                    \─────────────────────/
                       │                       │               │
                       │          CÓ (Online)  │               │ KHÔNG (Timeout / Lỗi)
                       │                       ▼               ▼
                       │         ┌──────────────────────┐ ┌──────────────────────┐
                       │         │ ĐỘNG CƠ CỤC BỘ BIÊN  │ │ DỰ PHÒNG NÓNG (CLOUD)│
                       │         │ • ViT5 INT8 sửa lỗi  │ │ • Gemini Text Prompt │
                       │         │ • Qwen 2.5 sinh lời  │ │ • Barem BGD&ĐT TT27  │
                       │         │   nhận xét sư phạm   │ │ • Ghi nhận tokenCount│
                       │         └──────────┬───────────┘ └──────────┬───────────┘
                       │                    │                        │
                       └────────────────────┼────────────────────────┘
                                            │
                                            ▼
                        ┌──────────────────────────────────────────────┐
                        │      TỰ ĐỘNG LƯU TRỮ DỮ LIỆU & BẢN GHI       │
                        │  • Bóc tách Base64 ghi file ảnh vào đĩa      │
                        │    (/public/uploads/grades/mobile-*.jpg)     │
                        │  • Ghi bản ghi Grade vào SQLite vihand.db    │
                        └──────────────────────┬───────────────────────┘
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │         TRẢ VỀ KẾT QUẢ CHẤM HOÀN TẤT         │
                        │       GradeApiResponse (HTTP 200 OK)         │
                        └──────────────────────────────────────────────┘
```

---

### 3.3. Sơ đồ Quy trình Nghiệp vụ 1: Luồng Chấm điểm OCR Chữ viết tay Tự động

```
Giáo viên      Android App     CameraX       Mobile BFF (:3000)     YOLOv8 (:8000)    Gemini Cloud    Grading Core    SQLite / Disk
   │                │             │                  │                     │               │               │              │
 1 ├─ Chụp ảnh bài ─►│             │                  │                     │               │               │              │
   │  thi học sinh  │             │                  │                     │               │               │              │
 2 │                ├─ Chụp ảnh ─►│                  │                     │               │               │              │
   │                │  (MINIMIZE_LATENCY)            │                     │               │               │              │
 3 │                │◄─ ImageProxy ┤                 │                     │               │               │              │
   │                │   (Flash 90ms, xoay EXIF)      │                     │               │               │              │
 4 │                ├─ Nén Base64, tạo DTO ──┐       │                     │               │               │              │
   │                │◄───────────────────────┘       │                     │               │               │              │
 5 │                ├─ POST /api/mobile/grade ──────►│                     │               │               │              │
   │                │  (imageBase64, studentName...) │                     │               │               │              │
   │                │                                │                     │               │               │              │
 6 │                │                                ├─ RateLimit Check ──┐│               │               │              │
   │                │                                │  (<=20 req/min/IP) ││               │               │              │
   │                │                                │◄───────────────────┘│               │               │              │
   │                │                                │                     │               │               │              │
   │                │                                │── PARALLEL CALL ──────────────────────────┐ │       │              │
 7 │                │                                ├─ POST /detect-words ───────────────►│     │ │       │              │
   │                │                                │  (imgsz=640, conf=0.50)             │     │ │       │              │
 8 │                │                                ├─ OCR Prompt 5 bước (Key Rotation) ───────►│ │       │              │
 9 │                │                                │◄─ Trả về BBoxes rel_x, rel_y ───────┤     │ │       │              │
10 │                │                                │◄─ Trả về original & fixed text ───────────┤ │       │              │
   │                │                                └── HOÀN TẤT XỬ LÝ SONG SONG ───────────────┘ │       │              │
   │                │                                │                                             │       │              │
11 │                │                                ├─ In-process call: handleGradePost ─────────────────►│              │
12 │                │                                │                                                     ├─ LCS Diff ──┐│
   │                │                                │                                                     │  Syllable   ││
   │                │                                │                                                     │◄────────────┘│
13 │                │                                │                                                     ├─ Ghép BBox ─┐│
   │                │                                │                                                     │  Universal  ││
   │                │                                │                                                     │◄────────────┘│
14 │                │                                │                                                     ├─ Điểm TT27 ─┐│
   │                │                                │                                                     │  & Lời phê  ││
   │                │                                │                                                     │◄────────────┘│
15 │                │                                │◄─ Trả về Grade Result hoàn chỉnh ───────────────────┤              │
   │                │                                │                                                            │
16 │                │                                ├─ Ghi file ảnh vật lý (/uploads/grades/xyz.jpg) ───────────►│
17 │                │                                ├─ Ghi bản ghi vào Prisma vihand.db (WAL mode) ─────────────►│
18 │                │◄─ GradeApiResponse (HTTP 200) ─┤                                                            │
   │                │   (score, criteria, errors...) │                                                            │
19 │                ├─ Lưu bản ghi cục bộ ──┐        │                                                            │
   │                │  (Room DB v4)         │        │                                                            │
   │                │◄──────────────────────┘        │                                                            │
20 ├─ Xem kết quả ◄─┤                                │                                                            │
   │  trực quan     │                                │                                                            │
21 ├─ Pinch 1x-4x ─►│                                │                                                            │
   │  kiểm tra nét  │ (Lockstep Co-Transformation)   │                                                            │
   ▼                ▼                                ▼                                                            ▼
```

---

### 3.4. Sơ đồ Quy trình Nghiệp vụ 2: Luồng Luyện viết Chính tả Sư phạm & Tổng hợp Giọng đọc Neural TTS

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TIẾP NHẬN & CHUẨN BỊ BÀI ĐỌC SGK (INPUT PREPARATION)                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Giáo viên truy cập Dictation Studio (Giao diện Web /teacher/dictation hoặc Android App)    │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│                                                 │                                                │
│                                                 ▼                                                │
│                                      /─────────────────────\                                     │
│                                     <  Lựa chọn Nguồn Bài?  >                                    │
│                                      \─────────────────────/                                     │
│                                         │               │                                        │
│                        Bài chuẩn từ SGK │               │ Sáng tác bài mới theo chủ đề           │
│                                         ▼               ▼                                        │
│  ┌──────────────────────────────────────────┐ ┌───────────────────────────────────────────────┐ │
│  │ Kho Ngữ liệu SGK GDPT 2018               │ │ Sáng tác tự động bằng AI                      │ │
│  │ • 50+ bài trích Lớp 1 - Lớp 5            │ │ • POST /api/dictation/generate                │ │
│  │ • Bộ sách: Kết nối tri thức, Cánh diều   │ │ • Qwen 2.5-0.5B-Instruct SLM                  │ │
│  └──────────────────────┬───────────────────┘ └───────────────────────┬───────────────────────┘ │
│                         │                                             │                         │
│                         └───────────────────────┬─────────────────────┘                         │
│                                                 ▼                                                │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Trích xuất Đoạn văn Văn bản Chuẩn (Ground Truth) & Danh mục Từ Khó Cần Rèn Luyện          │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┼────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. PHÂN TÁCH NGỮ PHÁP SƯ PHẠM (PEDAGOGICAL CLAUSE SPLITTING)                                     │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Thuật toán splitIntoPedagogicalClauses: Tách đoạn văn thành từng cụm từ ngắn (3 - 5 từ)    │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Cấu hình Nhịp đọc Sư phạm Chuẩn mực:                                                       │  │
│  │ • Giọng đọc: Cô Hoài My (Nữ - Bắc Bộ) hoặc Thầy Nam Minh (Nam - Bắc Bộ)                    │  │
│  │ • Tốc độ đọc: rate = "-15%" (Chậm rãi, tròn vành rõ chữ, phù hợp học sinh tiểu học)        │  │
│  │ • Chu kỳ phát: Lặp lại 2 lần/cụm • Khoảng nghỉ học sinh viết bài: 10 giây giữa các lượt    │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┼────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. ĐIỀU KHIỂN LUỒNG PHÁT ÂM THANH NEURAL TTS (ADAPTIVE TTS PLAYBACK LOOP)                        │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Bắt đầu Chu trình Đọc Tự động: Gửi yêu cầu GET /api/dictation/tts?text=...&rate=-15%       │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│                                                 │                                                │
│                                                 ▼                                                │
│                                      /─────────────────────\                                     │
│                                     <  Kiểm tra Kết nối     >                                    │
│                                     <  Mạng Thiết bị?       >                                    │
│                                      \─────────────────────/                                     │
│                                         │        │        │                                      │
│                             Kết nối tốt │        │ Mạng   │ Ngoại tuyến                          │
│                                         ▼        │ chập   │ hoàn toàn                            │
│  ┌──────────────────────────────────────────┐    │ chờn   │                                      │
│  │ KÊNH CHÍNH: Microsoft Edge-TTS Stream    │    ▼        ▼                                      │
│  │ • audio/mpeg truyền trực tiếp            │ ┌────────┐ ┌────────────────────────────────────┐  │
│  │ • Giọng đọc truyền cảm, độ trễ < 1.0s    │ │Fallback│ │ Fallback 2: Android Native TTS     │  │
│  └──────────────────────┬───────────────────┘ │1:Google│ │ • Engine TextToSpeech trên máy     │  │
│                         │                     │Translate│ • Locale("vi", "VN") offline 100%    │  │
│                         │                     └────┬───┘ └─────────────────┬──────────────────┘  │
│                         └──────────────────────────┼───────────────────────┘                     │
│                                                    ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ LƯỢT 1: Phát âm thanh cụm từ lần 1 ra loa trợ giảng (Học sinh lắng nghe và bắt đầu viết)    │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ ĐẾM NGƯỢC NGHỈ 10 GIÂY: Thanh tiến trình hiển thị đếm ngược (Học sinh nắn nót viết vào vở) │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ LƯỢT 2: Phát âm thanh cụm từ lặp lại lần 2 (Học sinh kiểm tra lại từ ngữ và dấu thanh)    │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│                                                 │                                                │
│                                                 ▼                                                │
│                                      /─────────────────────\                                     │
│                                     <  Còn cụm từ tiếp      >──── CÒN CỤM TỪ (Tiếp tục chu kỳ)   │
│                                     <  theo trong bài?      >───┐                                │
│                                      \─────────────────────/    │                                │
│                                                 │ HẾT CÂU       │                                │
│                                                 ▼               │                                │
│  ┌───────────────────────────────────────────────────────────┐  │                                │
│  │ LƯỢT SOÁT LỖI CUỐI: Đọc toàn bài 1 lần với nhịp vừa phải  │  │                                │
│  │ để cả lớp rà soát lại toàn bộ bài viết trước khi nộp      │  │                                │
│  └──────────────────────────────────────────────┬────────────┘  │                                │
│                                                 │               │                                │
└─────────────────────────────────────────────────┼───────────────┼────────────────────────────────┘
                                                  │               │ (Vòng lặp quay lại cụm kế tiếp)
                                                  ▼               └────────────────────────────────►
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. KẾT NỐI SANG MODULE CHẤM ĐIỂM (SEAMLESS GRADING HANDOFF)                                       │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Lưu phiên đọc vào CSDL DictationSession (Tiêu đề, Lớp, Giáo viên, Nhật ký DictationLog)     │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Giáo viên bấm "Chuyển sang Chấm bài" -> Toàn bộ văn bản bài đọc tự động gán Ground Truth   │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ SẴN SÀNG CHẤM ĐIỂM ZERO-TOKEN: Đối soát 1-1 LCS Diff Opcodes, không tốn token Cloud LLM     │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.5. Sơ đồ Quy trình Nghiệp vụ 3: Luồng Đồng bộ Sổ điểm & Sổ tay Từ khó Cá nhân hóa Hai chiều

```
Học sinh         Giao diện App      GradeRepository       Room DB v4        Next.js BFF       SQLite Máy chủ     Android TTS
   │                   │                   │                   │                 │                   │                │
   │ ════ GIAI ĐOẠN 1: ĐỒNG BỘ HAI CHIỀU DỮ LIỆU SỔ ĐIỂM (TWO-WAY SYNC LIFECYCLE) ══════════════════════════════════════ │
 1 ├─ Mở App / Bấm ───►│                   │                   │                 │                   │                │
   │  "Đồng bộ sổ điểm"│                   │                   │                 │                   │                │
 2 │                   ├─ syncTwoWay() ───►│                   │                 │                   │                │
   │                   │                   │                   │                 │                   │                │
   │   ┌── CHIỀU 1: UPLOAD CÁC BÀI CHẤM NGOẠI TUYẾN TỪ THIẾT BỊ LÊN MÁY CHỦ (Mobile -> Web) ─────────┐ │                │
 3 │   │                                   ├─ Lọc bài offline ─►│                 │                   │ │                │
   │   │                                   │  (serverId == null)│                 │                   │ │                │
 4 │   │                                   │◄─ Danh sách bài ───┤                 │                   │ │                │
   │   │                                   │   chưa đồng bộ     │                 │                   │ │                │
   │   │   ┌── VÒNG LẶP CHO TỪNG BÀI THI NGOẠI TUYẾN ───────────────────────────┐ │                   │ │                │
 5 │   │   ├─ POST /api/grades (ServerGradeSyncRequest) ────────────────────────►│                   │ │                │
 6 │   │   │                                                                      ├─ Ghi vào DB & ───►│ │                │
   │   │   │                                                                      │  sinh cuid()      │ │                │
 7 │   │   │                                                                      │◄─ newServerId ────┤ │                │
 8 │   │   │◄─ Phản hồi thành công { success: true, id: cuid } ───────────────────┤                   │ │                │
 9 │   │   ├─ Cập nhật serverId = cuid ───────────────────────►│                  │                   │ │                │
   │   │   └── KẾT THÚC VÒNG LẶP ───────────────────────────────────────────────┘  │                   │ │                │
   │   └──────────────────────────────────────────────────────────────────────────────────────────────┘ │                │
   │                                       │                                      │                   │ │                │
   │   ┌── CHIỀU 2: DOWNLOAD CÁC BÀI MỚI TỪ MÁY CHỦ VỀ THIẾT BỊ (Web -> Mobile) ──────────────────────┐ │                │
10 │   │                                   ├─ GET /api/grades?class=Lớp 3A1 ─────►│                   │ │                │
11 │   │                                   │                                      ├─ Truy vấn bảng ──►│ │                │
   │   │                                   │                                      │  điểm cả lớp      │ │                │
12 │   │                                   │                                      │◄─ Danh sách bài ──┤ │                │
13 │   │                                   │◄─ Phản hồi ServerGradesResponse ─────┤                   │ │                │
14 │   │                                   ├─ Đối soát khóa duy nhất ────────────►│                   │ │                │
   │   │                                   │  (studentName_title_className)       │                   │ │                │
15 │   │                                   ├─ Chèn bản ghi mới tải vào Room DB ──►│                   │ │                │
   │   └──────────────────────────────────────────────────────────────────────────────────────────────┘ │                │
   │                                       │                                                            │                │
16 │                   │◄─ Báo cáo đồng bộ ┤ Triple(uploaded, errors, downloaded)                       │                │
   │                   │                                                                                │                │
   │ ════ GIAI ĐOẠN 2: ĐỘNG HÓA SỔ TAY TỪ KHÓ CÁ NHÂN HÓA & PHÁT ÂM MẪU SƯ PHẠM ═══════════════════════════════════════ │
17 │                   ├─ Truy vấn các bài thi gần nhất của học sinh ────────────►│                     │                │
18 │                   │◄─ Danh sách GradeRecordEntity (kèm errorsJson) ──────────┤                     │                │
19 │                   ├─ Chạy thuật toán extractDifficultWords(records) ────────┐│                     │                │
   │                   │  • Có bài sai: Bóc tách cặp (từ gốc -> giải thích)      ││                     │                │
   │                   │  • Khử trùng lặp từ không phân biệt hoa thường          ││                     │                │
   │                   │  • Đạt điểm 10/Bài mới: Nạp 5 từ SGK mặc định dự phòng  ││                     │                │
   │                   │◄────────────────────────────────────────────────────────┘│                     │                │
20 ├─ Hiển thị sổ tay ◄┤                                                                                │                │
   │  từ khó (hp001)   │                                                                                │                │
21 ├─ Chạm thẻ từ khó ─►│                                                                                │                │
   │  (vd: "trổ hoa")  │                                                                                │                │
22 │                   ├─ speak("trổ hoa", QUEUE_FLUSH, Locale("vi", "VN")) ───────────────────────────►│                │
23 │                   │                                                                                ├─ Phát âm thanh ─►
   │                   │                                                                                │  chuẩn sư phạm   │
   ▼                   ▼                                                                                ▼  (Học sinh nghe) ▼
```

---

"""

full_content = part1 + part2_missing + part3 + part4

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(full_content)

print("Successfully reconstructed doc 1! Total characters:", len(full_content))
