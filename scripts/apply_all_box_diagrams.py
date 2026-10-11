# -*- coding: utf-8 -*-
"""
Script to generate and replace all diagrams in:
1. 01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md (Diagrams 3.1, 3.2A, 3.2B, 3.3, 3.4, 3.5)
2. 02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md (Part 1 architecture, Part 6.1 ERD & Part 6.4 State Machine)
Using pure Unicode Box-Drawing characters, no Mermaid, matching the style of Part II.
"""
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

DOC1_PATH = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong\01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md"
DOC2_PATH = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong\02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md"

# ==============================================================================
# DOC 1: DIAGRAM 3.1
# ==============================================================================
DIAGRAM_3_1 = r'''```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TẦNG CLIENT & THIẾT BỊ ĐẦU CUỐI (CLIENT TIER)                                                 │
│  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ Android Native Client (Kotlin / Compose)     │    │ Web Studio & PWA (Next.js 16 / React 19)│ │
│  │ • SDK 36 (Android 16), Min SDK 24            │    │ • Tailwind CSS v4 + Radix UI            │ │
│  │ • CameraX 1.5.0 (Low-latency capture)        │    │ • Service Worker offline cache (PWA)    │ │
│  │ • Lockstep Co-Transformation (Pinch 1x-4x)   │    │ • AI Grading Studio (5-Step Stepper)    │ │
│  │ • Dynamic Difficult Words Notebook           │    │ • Dictation Studio & SGK Corpus Browser │ │
│  │ • Room Database v4 (vihand_grade.db)         │    │ • Admin Control Center & System Monitor │ │
│  └──────────────────────┬───────────────────────┘    └────────────────────┬────────────────────┘ │
└─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────┘
                          │ HTTP REST DTO (GradeApiRequest)                 │ Web Fetch (HTTP REST)
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
┌──────────────────────────────┐ ┌─────────────────────────────────────────────────────────────────┐
│      TẦNG CLOUD VLM          │ │ 3. TẦNG LÕI AI MICROSERVICES (FASTAPI PYTHON CORE :8000)        │
│  ┌────────────────────────┐  │ │  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│  │ Google Gemini Cloud    │  │ │  │ YOLOv8 Word Detector         │  │ ViT5 Correction Engine   │ │
│  │ • gemini-3.1-flash-lite│  │ │  │ • best.pt (640x640)          │  │ • Dynamic INT8 CPU       │ │
│  │ • gemini-2.5-flash FB  │  │ │  │ • Vertical Overlap (0.40)    │  │ • Prose Chunking <=160   │ │
│  │ • Zero-Loss Prompt     │  │ │  │ • Rel BBoxes [0.0, 1.0]      │  │ • 6 Phân nhóm lỗi ngữ âm │ │
│  │ • Xoay vòng Multi-Keys │  │ │  └──────────────────────────────┘  └──────────────────────────┘ │
│  └────────────────────────┘  │ │  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│                              │ │  │ Qwen 2.5-0.5B-Instruct SLM   │  │ Microsoft Edge-TTS Engine│ │
│                              │ │  │ • bfloat16 (~577MB RAM)      │  │ • HoaiMy & NamMinh Neural│ │
│                              │ │  │ • Nhận xét sư phạm TT27      │  │ • Tốc độ chuẩn: rate=-15%│ │
│                              │ │  └──────────────────────────────┘  └──────────────────────────┘ │
└──────────────────────────────┘ └────────────────────────────────┬────────────────────────────────┘
                                                                  │ Ghi bản ghi / Lưu ảnh đĩa
                                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. TẦNG CƠ SỞ DỮ LIỆU & TRẠM TÍNH TOÁN BIÊN (DATABASE & EDGE APPLIANCE TIER)                     │
│  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ SQLite Database (prisma/vihand.db • 22.4MB)  │    │ Lưu trữ Ảnh Vật lý (Anti-Bloat Shield)  │ │
│  │ • PRAGMA journal_mode = WAL                  │    │ • /public/uploads/grades/mobile-*.jpg   │ │
│  │ • PRAGMA busy_timeout = 5000; synchronous=NRM│    │ • imageBase64 rỗng, chỉ lưu imagePath   │ │
│  │ • Soft Purge & Anonymization (NĐ 13/2023)    │    │ • Tự động unlink khi xóa bài chấm       │ │
│  └──────────────────────────────────────────────┘    └─────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Trạm Biên Phần Cứng: Raspberry Pi 4 Model B (4GB RAM) / Nvidia Jetson Nano (4GB VRAM)      │  │
│  │ • Swap: 3072MB (vm.swappiness = 20) chống tràn RAM OOM Killer khi chạy đồng thời Next + AI │  │
│  │ • CGroups Systemd: vihand-python (Max 2.5GB), vihand-web (Max 2.0GB, Heap 1.5GB)           │  │
│  │ • Tường lửa UFW: Khóa cổng 8000 nội bộ, chỉ mở cổng 3000 (Web Gateway) & 22 (SSH)          │  │
│  │ • Cloudflare Named Tunnel (vihandgrade.click): Ingress TLS an toàn, vượt CGNAT nhà mạng    │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```'''

# ==============================================================================
# DOC 1: DIAGRAM 3.2A
# ==============================================================================
DIAGRAM_3_2A = r'''```
┌────────────┐          ┌────────────┐          ┌─────────────────┐          ┌─────────────────┐          ┌────────────────┐          ┌──────────────┐
│Giáo viên/HS│          │ App / Web  │          │ Gateway (:3000) │          │ Py Core (:8000) │          │  Gemini Cloud  │          │ SQLite / Đĩa │
└─────┬──────┘          └─────┬──────┘          └────────┬────────┘          └────────┬────────┘          └───────┬────────┘          └──────┬───────┘
      │                       │                          │                            │                           │                          │
  1   ├─ Nộp bài thi ────────►│                          │                            │                           │                          │
      │                       │                          │                            │                           │                          │
  2   │                       ├─ POST /api/grade ───────►│                            │                           │                          │
      │                       │  (hoặc mobile/grade)     │                            │                           │                          │
  3   │                       │                          ├─ Rate Limit Check ───────┐ │                           │                          │
      │                       │                          │  (Sliding Window Map)    │ │                           │                          │
      │                       │                          │◄─────────────────────────┘ │                           │                          │
      │                       │                          │                            │                           │                          │
      │   ┌─── [TRƯỜNG HỢP 1: CÓ BÀI MẪU GROUND TRUTH (ZERO-TOKEN OFFLINE)] ─────────────────────────────────────────────────────────────┐   │
      │   │                   │                          │                            │                           │                      │   │
  4   │   │                   │                          ├─ LCS Diff Opcodes ───────┐ │                           │                      │   │
      │   │                   │                          │  (Zero-Hallucination)    │ │                           │                      │   │
      │   │                   │                          │◄─────────────────────────┘ │                           │                      │   │
  5   │   │                   │                          ├─ Phân tích 6 nhóm lỗi ────►│                           │                      │   │
      │   │                   │                          │  (parse_vietnamese)        │                           │                      │   │
  6   │   │                   │                          │◄─ Chi tiết lỗi & điểm 7đ-3đ┤                           │                      │   │
  7   │   │                   │                          ├─ Ghi bản ghi (tokenCount=0)──────────────────────────────────────────────────►│   │
  8   │   │                   │◄─ Kết quả Zero-Token ────┤  (0đ phí Cloud, 0 Token)   │                           │                      │   │
      │   └─── [HOÀN TẤT TRƯỜNG HỢP 1: TỰ ĐỘNG LƯU TRỮ VÀ PHẢN HỒI CLIENT] ──────────────────────────────────────────────────────────────┘   │
      │                       │                          │                            │                           │                          │
      │   ┌─── [TRƯỜNG HỢP 2: CHẤM TỪ ẢNH CHỤP BÀI THI VIẾT TAY (HYBRID MODE)] ──────────────────────────────────────────────────────────┐   │
      │   │                   │                          │                            │                           │                      │   │
      │   │   ┌── PARALLEL PROCESSING (Xử lý đồng thời Promise.all) ──────────────────────────────────────────────────────────────┐       │   │
  9   │   │   ├─ Gọi Gemini OCR (5 bước prompt) ─────────────────────────────────────────────────────────────────►│                      │   │
 10   │   │   ├─ Gửi ảnh sang YOLOv8 (:8000/detect-words) ───────────────────────────►│                           │                      │   │
 11   │   │   │◄─ Trả về tọa độ relative BBoxes [0.0, 1.0] ───────────────────────────┤                           │                      │   │
 12   │   │   │◄─ Trả về original_text & fixed_text ──────────────────────────────────────────────────────────────┤                      │   │
      │   │   └── HOÀN TẤT XỬ LÝ SONG SONG (PROMISE.ALL RESOLVED) ────────────────────────────────────────────────┘                      │   │
      │   │                   │                          │                            │                           │                      │   │
 13   │   │                   │                          ├─ So khớp thứ tự đọc ─────┐ │                           │                      │   │
      │   │                   │                          │  (Universal Reading Order) │                           │                      │   │
      │   │                   │                          │◄─────────────────────────┘ │                           │                      │   │
      │   │                   │                          │                            │                           │                      │   │
      │   │   ┌── PHÂN NHÁNH ĐỘNG CƠ SỬA LỖI & SINH LỜI PHÊ ─────────────────────────────────────────────────────────────┐       │   │
      │   │   │ [Nhánh A: ViT5 INT8 Cục bộ Khả dụng]                                                                      │       │   │
 14a  │   │   ├─ Gọi ViT5 INT8 & Qwen 2.5 SLM ───────────────────────────────────────►│                           │       │       │   │
 14b  │   │   │◄─ Trả về văn bản sửa lỗi & 3 phương án nhận xét Thông tư 27 ──────────┤                           │       │       │   │
      │   │   │ ───────────────────────────────────────────────────────────────────────────────────────────────────────── │       │   │
      │   │   │ [Nhánh B: ViT5 Timeout / Lỗi -> Fallback Nóng sang Gemini Cloud Prompt]                                   │       │   │
 15a  │   │   ├─ Gọi Gemini Text Grading Prompt (Barem BGD&ĐT TT27) ──────────────────────────────────────────────►│       │       │   │
 15b  │   │   │◄─ Trả về điểm số Thông tư 27 & lời phê dự phòng ──────────────────────────────────────────────────┤       │       │   │
      │   │   └── KẾT THÚC PHÂN NHÁNH ĐỘNG CƠ SỬA LỖI ────────────────────────────────────────────────────────────────────┘       │   │
      │   │                   │                          │                            │                           │                      │   │
 16   │   │                   │                          ├─ Tách Base64 ghi đĩa, ghi bản ghi Grade vào SQLite ──────────────────────────►│   │
 17   │   │                   │◄─ GradeApiResponse ──────┤  (Kèm đầy đủ BBoxes, lỗi sai & điểm số Thông tư 27)    │                      │   │
      │   └─── [HOÀN TẤT TRƯỜNG HỢP 2: DỮ LIỆU ĐÃ LƯU TRỮ VÀ PHẢN HỒI HTTP 200 OK] ──────────────────────────────────────────────────────┘   │
      │                       │                          │                            │                           │                          │
 18   ├─ Nhận kết quả ◄───────┤                          │                            │                           │                          │
      │  (Xem ảnh/BBox &      │                          │                            │                           │                          │
      │   Pinch-to-zoom 4x)   │                          │                            │                           │                          │
      ▼                       ▼                          ▼                            ▼                           ▼                          ▼
```'''

# ==============================================================================
# DOC 1: DIAGRAM 3.2B
# ==============================================================================
DIAGRAM_3_2B = r'''```
                                ┌──────────────────────────────────────────────┐
                                │          BẮT ĐẦU YÊU CẦU CHẤM ĐIỂM           │
                                │          (Client Submit Grading Req)         │
                                └──────────────────────┬───────────────────────┘
                                                       │
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │ ĐIỀU KIỆN 1: Có bài mẫu Ground Truth từ SGK? │
                                └───────┬──────────────────────────────┬───────┘
                                        │                              │
                               [CÓ: Đã có bài mẫu]            [KHÔNG: Chưa có bài mẫu]
                                        │                              │
                                        ▼                              ▼
  ┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐
  │      CHẾ ĐỘ ZERO-TOKEN OFFLINE         │ │ ĐIỀU KIỆN 2: Định dạng dữ liệu nộp bài?│
  │ • So khớp chuỗi LCS Diff Opcodes (1:1) │ └───────┬────────────────────────┬───────┘
  │ • Phân tích âm tiết Levenshtein 6 nhóm │         │                        │
  │ • Áp barem điểm Thông tư 27 (7đ - 3đ)  │  [ẢNH CHỤP BÀI THI]     [VĂN BẢN NHẬP TAY]
  │ • Chi phí 0đ, Tiêu thụ 0 token Cloud   │         │                        │
  └──────────────────┬─────────────────────┘         ▼                        │
                     │                     ┌────────────────────┐             │
                     │                     │  XỬ LÝ SONG SONG   │             │
                     │                     │ 1. Gemini Cloud OCR│             │
                     │                     │ 2. YOLOv8 Edge BBox│             │
                     │                     └─────────┬──────────┘             │
                     │                               │                        │
                     │                               ▼                        │
                     │                     ┌────────────────────┐             │
                     │                     │ Ánh xạ Bounding Box│             │
                     │                     │ theo Universal     │             │
                     │                     │ Reading Order      │             │
                     │                     └─────────┬──────────┘             │
                     │                               │                        │
                     │                               ▼                        │
                     │                     ┌──────────────────────────────────┴───────┐
                     │                     │ ĐIỀU KIỆN 3: Lõi ViT5 cục bộ sẵn sàng?   │
                     │                     └───────┬──────────────────────────┬───────┘
                     │                             │                          │
                     │                    [CÓ: ViT5 Online]          [KHÔNG: Timeout / Lỗi]
                     │                             │                          │
                     │                             ▼                          ▼
                     │              ┌──────────────────────────┐ ┌──────────────────────────┐
                     │              │ ĐỘNG CƠ CỤC BỘ BIÊN      │ │ DỰ PHÒNG NÓNG (FALLBACK) │
                     │              │ • ViT5 INT8 CPU sửa lỗi  │ │ • Gemini Text Prompt     │
                     │              │ • Qwen 2.5 sinh 3 lời    │ │ • Barem BGD&ĐT TT27      │
                     │              │   nhận xét Thông tư 27   │ │ • Ghi nhận tokenCount    │
                     │              └──────────────┬───────────┘ └────────────┬─────────────┘
                     │                             │                          │
                     │                             └────────────┬─────────────┘
                     │                                          │
                     └──────────────────────┬───────────────────┘
                                            │
                                            ▼
                                ┌──────────────────────────────────────────────┐
                                │      TỰ ĐỘNG LƯU TRỮ DỮ LIỆU & BẢN GHI       │
                                │ • Bóc tách Base64 ghi đĩa /uploads/grades/*.jpg│
                                │ • Ghi bản ghi Grade vào SQLite vihand.db     │
                                └──────────────────────┬───────────────────────┘
                                                       │
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │       KẾT THÚC: TRẢ VỀ PHẢN HỒI THÀNH CÔNG   │
                                │         GradeApiResponse (HTTP 200 OK)       │
                                └──────────────────────────────────────────────┘
```'''

# ==============================================================================
# DOC 1: DIAGRAM 3.3
# ==============================================================================
DIAGRAM_3_3 = r'''```
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐
│ Giáo viên │ │Android App│ │  CameraX  │ │Gateway :3000│ │YOLOv8 :8000 │ │Gemini Cloud │ │Grading Core │ │SQLite/Đĩa │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬─────┘
      │             │             │              │               │               │               │              │
      │ ════ GIAI ĐOẠN 1: THU NHẬN ẢNH BÀI THI & CHUẨN HÓA DỮ LIỆU (IMAGE CAPTURE & PREPROCESSING) ═══════════════ │
  1   ├─ Chụp ảnh ─►│             │              │               │               │               │              │
      │  bài thi    │             │              │               │               │               │              │
  2   │             ├─ Chụp ảnh ─►│              │               │               │               │              │
      │             │  (MIN_LAT)  │              │               │               │               │              │
  3   │             │◄─ ImageProxy┤              │               │               │               │              │
      │             │   (Flash,   │              │               │               │               │              │
      │             │    EXIF)    │              │               │               │               │              │
  4   │             ├─ Nén Base64, tạo DTO ────┐ │               │               │               │              │
      │             │◄─────────────────────────┘ │               │               │               │              │
      │             │                            │               │               │               │              │
      │ ════ GIAI ĐOẠN 2: GATEWAY TIẾP NHẬN & KÍCH HOẠT XỬ LÝ SONG SONG (PROMISE.ALL PARALLEL OCR) ═══════════════ │
  5   │             ├─ POST /api/mobile/grade ──►│               │               │               │              │
      │             │  (imageBase64, DTO)        │               │               │               │              │
  6   │             │                            ├─ RateLimit ─┐ │               │               │              │
      │             │                            │  (<=20/min) │ │               │               │              │
      │             │                            │◄────────────┘ │               │               │              │
      │             │                            │               │               │               │              │
      │             │                            │── PARALLEL PROCESSING (Promise.all) ────────┐ │              │
  7   │             │                            ├─ POST /detect-words ─────────►│             │ │              │
      │             │                            │  (imgsz=640, conf=0.50)       │             │ │              │
  8   │             │                            ├─ Prompt 5 bước (Vision OCR) ─────────────────►│              │
  9   │             │                            │◄─ Trả về relative BBoxes ─────┤             │ │              │
 10   │             │                            │◄─ Trả về original & fixed text ─────────────┤ │              │
      │             │                            └── HOÀN TẤT XỬ LÝ SONG SONG ─────────────────┘ │              │
      │             │                            │                                               │              │
      │ ════ GIAI ĐOẠN 3: SO KHỚP TỌA ĐỘ BBOX & TÍNH ĐIỂM THÔNG TƯ 27 (IN-PROCESS CORE GRADING) ══════════════════ │
 11   │             │                            ├─ In-process call: handleGradePost ───────────►│              │
 12   │             │                            │                                               ├─ LCS Diff ──┐│
      │             │                            │                                               │  Syllable   ││
      │             │                            │                                               │◄────────────┘│
 13   │             │                            │                                               ├─ Ghép BBox ─┐│
      │             │                            │                                               │  Universal  ││
      │             │                            │                                               │◄────────────┘│
 14   │             │                            │                                               ├─ Điểm TT27 ─┐│
      │             │                            │                                               │  & Lời phê  ││
      │             │                            │                                               │◄────────────┘│
 15   │             │                            │◄─ Trả về kết quả chấm điểm hoàn chỉnh ────────┤              │
      │             │                            │                                                              │
      │ ════ GIAI ĐOẠN 4: LƯU TRỮ CHỐNG PHÌNH TO, PHẢN HỒI & LOCKSTEP CO-TRANSFORMATION ══════════════════════════ │
 16   │             │                            ├─ Ghi file ảnh vật lý đĩa (/public/uploads/grades/xyz.jpg) ──►│
 17   │             │                            ├─ Ghi bản ghi vào Prisma vihand.db (WAL Mode) ───────────────►│
 18   │             │◄─ GradeApiResponse (200) ──┤                                                              │
      │             │   (score, criteria, BBoxes)│                                                              │
 19   │             ├─ Lưu bản ghi cục bộ ─────┐ │                                                              │
      │             │  (Room DB v4)            │ │                                                              │
      │             │◄─────────────────────────┘ │                                                              │
 20   ├─ Xem kết quả ◄┤                          │                                                              │
      │  trực quan  │                            │                                                              │
 21   ├─ Pinch 1x-4x ─►                          │                                                              │
      │  soi nét mực│ (Lockstep Co-Transformation)                                                              │
      ▼             ▼                            ▼                                                              ▼
```'''

# ==============================================================================
# DOC 1: DIAGRAM 3.4
# ==============================================================================
DIAGRAM_3_4 = r'''```
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
│                         │                     │Translat│ │ • Locale("vi", "VN") offline 100%    │  │
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
```'''

# ==============================================================================
# DOC 1: DIAGRAM 3.5
# ==============================================================================
DIAGRAM_3_5 = r'''```
┌──────────┐          ┌─────────────┐          ┌─────────────┐          ┌────────────┐          ┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│ Học sinh │          │Giao diện App│          │  GradeRepo  │          │ Room DB v4 │          │ Next.js BFF │          │SQLite Server │          │ Android TTS │
└────┬─────┘          └──────┬──────┘          └──────┬──────┘          └─────┬──────┘          └──────┬──────┘          └──────┬───────┘          └──────┬──────┘
     │                       │                        │                       │                        │                        │                         │
     │ ════ GIAI ĐOẠN 1: ĐỒNG BỘ HAI CHIỀU DỮ LIỆU SỔ ĐIỂM (TWO-WAY SYNC LIFECYCLE) ════════════════════════════════════════════════════════════════════════════ │
 1   ├─ Mở App / Bấm ───────►│                        │                       │                        │                        │                         │
     │  "Đồng bộ sổ điểm"    │                        │                       │                        │                        │                         │
 2   │                       ├─ syncTwoWayWithServer►│                       │                        │                        │                         │
     │                       │                        │                       │                        │                        │                         │
     │   ┌── CHIỀU 1: UPLOAD CÁC BÀI CHẤM NGOẠI TUYẾN TỪ THIẾT BỊ LÊN MÁY CHỦ (Mobile -> Web) ────────────────────────────────────────────────────────┐  │         │
 3   │   │                   │                        ├─ Lọc bài offline ────►│                        │                        │             │  │         │
     │   │                   │                        │  (serverId == null)   │                        │                        │             │  │         │
 4   │   │                   │                        │◄─ Danh sách bài thi ──┤                        │                        │             │  │         │
     │   │                   │                        │   chưa đồng bộ        │                        │                        │             │  │         │
     │   │   ┌── VÒNG LẶP CHO TỪNG BÀI THI NGOẠI TUYẾN ───────────────────────────────────────────────────────────────────────────┐ │  │         │
 5   │   │   ├─ POST /api/grades (ServerGradeSyncRequest) ────────────────────────────────────────────►│                        │ │ │  │         │
 6   │   │   │                                        │                       │                        ├─ Ghi DB & sinh CUID ──►│ │ │  │         │
 7   │   │   │                                        │                       │                        │◄─ newServerId (CUID) ──┤ │ │  │         │
 8   │   │   │◄─ Phản hồi thành công { success: true, id: cuid } ──────────────────────────────────────┤                        │ │ │  │         │
 9   │   │   ├─ Cập nhật serverId = cuid ────────────────────────────────────►│                        │                        │ │ │  │         │
     │   │   └── KẾT THÚC VÒNG LẶP ────────────────────────────────────────────────────────────────────────────────────────────┘ │ │  │         │
     │   └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │         │
     │                       │                        │                       │                        │                        │       │         │
     │   ┌── CHIỀU 2: DOWNLOAD CÁC BÀI MỚI TỪ MÁY CHỦ VỀ THIẾT BỊ (Web -> Mobile) ─────────────────────────────────────────────────────┐ │         │
10   │   │                   │                        ├─ GET /api/grades?class=Lớp 3A ────────────────►│                        │ │ │         │
11   │   │                   │                        │                       │                        ├─ Truy vấn điểm cả lớp ─►│ │ │         │
12   │   │                   │                        │                       │                        │◄─ Danh sách bài thi ───┤ │ │         │
13   │   │                   │                        │◄─ Phản hồi ServerGradesResponse ───────────────┤                        │ │ │         │
14   │   │                   │                        ├─ Đối soát khóa duy nhất (studentName_title) ──►│                        │ │ │         │
15   │   │                   │                        ├─ Chèn bản ghi mới tải vào Room DB ────────────►│                        │ │ │         │
     │   └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │         │
     │                       │                        │                       │                        │                        │       │         │
16   │                       │◄─ Báo cáo đồng bộ ─────┤ Triple(UploadOk, UploadErr, NewDownloaded)     │                        │       │         │
     │                       │                        │                       │                        │                        │       │         │
     │ ════ GIAI ĐOẠN 2: ĐỘNG HÓA SỔ TAY TỪ KHÓ CÁ NHÂN HÓA & PHÁT ÂM MẪU SƯ PHẠM ═══════════════════════════════════════════════════════════════════ │         │
17   │                       ├─ Truy vấn các bài thi gần nhất của học sinh ──►│                        │                        │       │         │
18   │                       │◄─ Danh sách GradeRecordEntity (kèm errorsJson)─┤                        │                        │       │         │
19   │                       ├─ Thuật toán extractDifficultWords(records) ──┐ │                        │                        │       │         │
     │                       │  • Có bài sai: Bóc tách cặp (từ gốc -> giải thích)                      │                        │       │         │
     │                       │  • Khử trùng lặp từ không phân biệt hoa thường │                        │                        │       │         │
     │                       │  • Đạt điểm 10/Bài mới: Nạp 5 từ SGK mặc định│ │                        │                        │       │         │
     │                       │◄─────────────────────────────────────────────┘ │                        │                        │       │         │
20   ├─ Hiển thị sổ tay ────►│                                                │                        │                        │       │         │
     │  từ khó (hp001)       │                                                │                        │                        │       │         │
21   ├─ Chạm thẻ từ khó ────►│                                                │                        │                        │       │         │
     │  (vd: "trổ hoa")      │                                                │                        │                        │       │         │
22   │                       ├─ speak("trổ hoa", QUEUE_FLUSH, Locale("vi", "VN")) ─────────────────────────────────────────────────────►│         │
23   │                       │                                                │                        │                        │       ├─ Âm thanh mẫu ─►
     │                       │                                                │                        │                        │       │  chuẩn sư phạm │
     ▼                       ▼                                                ▼                        ▼                        ▼       ▼  (HS lắng nghe)▼
```'''

# ==============================================================================
# DOC 2: PART 1 DIAGRAM
# ==============================================================================
DOC2_PART1_DIAGRAM = r'''```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TẦNG CLIENT MOBILE & WEB STUDIO (CLIENT & EDGE DEVICES TIER)                                  │
│  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ Android Native Client (Kotlin / Compose)     │    │ Web Studio & PWA (Next.js 16 / React 19)│ │
│  │ • SDK 36 (Android 16), Min SDK 24            │    │ • Tailwind CSS v4 + Radix UI            │ │
│  │ • CameraX 1.5.0 (Low-latency capture)        │    │ • Service Worker offline cache (PWA)    │ │
│  │ • Lockstep Co-Transformation (Pinch 1x-4x)   │    │ • AI Grading Studio (5-Step Stepper)    │ │
│  │ • Dynamic Difficult Words Notebook           │    │ • Dictation Studio & SGK Corpus Browser │ │
│  │ • Room Database v4 (vihand_grade.db)         │    │ • Admin Control Center & System Monitor │ │
│  └──────────────────────┬───────────────────────┘    └────────────────────┬────────────────────┘ │
└─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────┘
                          │ HTTP REST DTO (GradeApiRequest)                 │ Web Fetch (HTTP REST)
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
┌──────────────────────────────┐ ┌─────────────────────────────────────────────────────────────────┐
│      TẦNG CLOUD VLM          │ │ 3. TẦNG LÕI AI MICROSERVICES (FASTAPI PYTHON CORE :8000)        │
│  ┌────────────────────────┐  │ │  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│  │ Google Gemini Cloud    │  │ │  │ YOLOv8 Word Detector         │  │ ViT5 Correction Engine   │ │
│  │ • gemini-3.1-flash-lite│  │ │  │ • best.pt (640x640)          │  │ • Dynamic INT8 CPU       │ │
│  │ • gemini-2.5-flash FB  │  │ │  │ • Vertical Overlap (0.40)    │  │ • Prose Chunking <=160   │ │
│  │ • Zero-Loss Prompt     │  │ │  │ • Rel BBoxes [0.0, 1.0]      │  │ • 6 Phân nhóm lỗi ngữ âm │ │
│  │ • Xoay vòng Multi-Keys │  │ │  └──────────────────────────────┘  └──────────────────────────┘ │
│  └────────────────────────┘  │ │  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│                              │ │  │ Qwen 2.5-0.5B-Instruct SLM   │  │ Microsoft Edge-TTS Engine│ │
│                              │ │  │ • bfloat16 (~577MB RAM)      │  │ • HoaiMy & NamMinh Neural│ │
│                              │ │  │ • Nhận xét sư phạm TT27      │  │ • Tốc độ chuẩn: rate=-15%│ │
│                              │ │  └──────────────────────────────┘  └──────────────────────────┘ │
└──────────────────────────────┘ └────────────────────────────────┬────────────────────────────────┘
                                                                  │ Ghi bản ghi / Lưu ảnh đĩa
                                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. TẦNG CƠ SỞ DỮ LIỆU & TRẠM TÍNH TOÁN BIÊN (DATABASE & EDGE APPLIANCE TIER)                     │
│  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ SQLite Database (prisma/vihand.db • 22.4MB)  │    │ Lưu trữ Ảnh Vật lý (Anti-Bloat Shield)  │ │
│  │ • PRAGMA journal_mode = WAL                  │    │ • /public/uploads/grades/mobile-*.jpg   │ │
│  │ • PRAGMA busy_timeout = 5000; synchronous=NRM│    │ • imageBase64 rỗng, chỉ lưu imagePath   │ │
│  │ • Soft Purge & Anonymization (NĐ 13/2023)    │    │ • Tự động unlink khi xóa bài chấm       │ │
│  └──────────────────────────────────────────────┘    └─────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Trạm Biên Phần Cứng: Raspberry Pi 4 Model B (4GB RAM) / Nvidia Jetson Nano (4GB VRAM)      │  │
│  │ • Swap: 3072MB (vm.swappiness = 20) chống tràn RAM OOM Killer khi chạy đồng thời Next + AI │  │
│  │ • CGroups Systemd: vihand-python (Max 2.5GB), vihand-web (Max 2.0GB, Heap 1.5GB)           │  │
│  │ • Tường lửa UFW: Khóa cổng 8000 nội bộ, chỉ mở cổng 3000 (Web Gateway) & 22 (SSH)          │  │
│  │ • Cloudflare Named Tunnel (vihandgrade.click): Ingress TLS an toàn, vượt CGNAT nhà mạng    │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```'''

# ==============================================================================
# DOC 2: PART 6.1 ERD DIAGRAM (REPLACING MERMAID)
# ==============================================================================
DOC2_PART6_ERD = r'''### Sơ Đồ Quan Hệ Thực Thể (Entity Relationship Diagram - ERD)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                    SƠ ĐỒ QUAN HỆ THỰC THỂ CƠ SỞ DỮ LIỆU TRUNG TÂM VIHAND GRADE                   │
│                                (PRISMA SQLITE DATA SCHEMA ARCHITECTURE)                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

       ┌─────────────────────────┐                           ┌─────────────────────────┐
       │          USER           │                           │          CLASS          │
       │ (Tài khoản & Xác thực)  │                           │  (Lớp học & Giáo viên)  │
       ├─────────────────────────┤                           ├─────────────────────────┤
       │ * id            String  │◄── [1]                     │ * id            String  │
       │ * name          String  │    Quản lý lớp phụ trách   │ * name          String  │
       │ * username      String  │    (TeacherClasses)        │   grade         Int     │
       │   password      String  │            │              │   teacherId     String  │───┐ [N]
       │ * role          String  │            └──────────────┼──►[FK: User.id]         │   │
       │   className     String  │                           │   createdAt     DateTime│   │
       │   active        Boolean │                           └────────────┬────────────┘   │
       │   createdAt     DateTime│                                        │ [1]            │
       └─────────────────────────┘                                        │                │
                                                                          │ Thuộc lớp      │
       ┌──────────────────────────────────────────────────────────────────┴────────────┐   │
       │                                                                               ▼   │
       │                               ┌──────────────────────────────────────────────┐│   │
       │                               │                    GRADE                     ││   │
       │                               │           (Bài chấm & Đánh giá AI)           ││   │
       │                               ├──────────────────────────────────────────────┤│   │
       │                               │ * id                 String  [PK, cuid]      ││   │
       │                               │ * gradingMode        String  [default:"dict"]││   │
       │                               │ * studentName        String                  ││   │
       │                               │ * assignmentTitle    String                  ││   │
       │                               │   className          String  [FK: Class.name]◄┘   │
       │                               │   originalText       String                  │    │
       │                               │   fixedText          String                  │    │
       │                               │   corrections        String  [JSON BBoxes]   │    │
       │                               │ * score              String                  │    │
       │                               │ * scoreNum           Float                   │    │
       │                               │   scoreBreakdown     String  [JSON 7đ - 3đ]  │    │
       │                               │   feedback           String                  │    │
       │                               │   pedagogicalComment String  [TT27 3 options]│    │
       │                               │   overallRating      String  [Hoàn thành tốt]│    │
       │                               │   processingTimeMs   Int     [độ trễ ms]     │    │
       │                               │   tokenCount         Int     [0 token = 0đ]  │    │
       │                               │   imageBase64        String  [rỗng chống nở] │    │
       │                               │   imagePath          String  [/uploads/...]  │    │
       │                               │   dictationSessionId String  [FK Session] ◄──┼────┼───┐
       │                               │   expiresAt          DateTime[Hạn lưu 365d]  │    │   │
       │                               │   isAnonymized       Boolean [Nghị định 13]  │    │   │
       │                               │   anonymizedAt       DateTime                │    │   │
       │                               │ * createdAt          DateTime                │    │   │
       │                               └──────────────────────────────────────────────┘    │   │
       │                                                                                   │   │
       │                               ┌─────────────────────────┐                         │   │
       │                               │    TEXTBOOK_PASSAGE     │                         │   │
       │                               │ (Ngữ liệu SGK GDPT 2018)│                         │   │
       │                               ├─────────────────────────┤                         │   │
       │                               │ * id            String  │                         │   │
       │                               │   gradeLevel    Int     │                         │   │
       │                               │   bookSet       String  │                         │   │
       │                               │   unit          String  │                         │   │
       │                               │ * title         String  │                         │   │
       │                               │ * content       String  │                         │   │
       │                               │   difficultWordsString  │                         │   │
       │                               │   createdAt     DateTime│                         │   │
       │                               └────────────┬────────────┘                         │   │
       │                                            │                                      │   │
       │                                            │ Cung cấp ngữ liệu đọc chuẩn          │   │
       │                                            ▼                                      │   │
       │                               ┌─────────────────────────┐                         │   │
       │                               │    DICTATION_SESSION    │                         │   │
       │                               │  (Phiên đọc chính tả)   │                         │   │
       │                               ├─────────────────────────┤                         │   │
       │                               │ * id            String  │─────────────────────────┴───┘
       │                               │ * title         String  │ [1] Bài nộp từ phiên
       │                               │ * passage       String  │
       │                               │   className     String  │
       │                               │   teacherName   String  │
       │                               │   source        String  │
       │                               │   deviceId      String  │
       │                               │   status        String  │
       │                               │   summary       String  │
       │                               │ * createdAt     DateTime│
       │                               └────────────┬────────────┘
       │                                            │ [1] Chứa nhật ký phát âm
       │                                            │     (DictationLog entries)
       │                                            ▼ [N]
       │                               ┌─────────────────────────┐
       │                               │      DICTATION_LOG      │
       │                               │   (Nhật ký đọc âm thanh)│
       │                               ├─────────────────────────┤
       │                               │ * id            String  │
       │                               │ * sessionId     String  │──► [FK: DictationSession.id]
       │                               │ * speaker       String  │    (Cô Hoài My / Thầy Nam Minh)
       │                               │ * content       String  │    (Cụm 3 - 5 từ ngắt nhịp)
       │                               │ * createdAt     DateTime│
       │                               └─────────────────────────┘
```

#### Ma Trận Quan Hệ Khóa & Tính Toàn Vẹn Tham Chiếu (Referential Integrity):
1. **`User` $\xrightarrow{1:N}$ `Class` (`teacherId` $\to$ `User.id`):** Một giáo viên có thể quản lý nhiều lớp học. Xóa tài khoản giáo viên không làm mất lớp học (`onDelete: SetNull`).
2. **`Class` $\xrightarrow{1:N}$ `Grade` (`className` $\to$ `Class.name`):** Các bài thi được nhóm theo tên lớp để tính toán bảng thống kê phổ điểm Thông tư 27.
3. **`DictationSession` $\xrightarrow{1:N}$ `DictationLog` (`sessionId` $\to$ `DictationSession.id`):** Quan hệ Cascade Delete — khi xóa phiên đọc chính tả, toàn bộ log phát âm chi tiết sẽ tự động được thu hồi.
4. **`DictationSession` $\xrightarrow{1:N}$ `Grade` (`dictationSessionId` $\to$ `DictationSession.id`):** Kết nối các bài làm của học sinh trong lớp về đúng phiên đọc chính tả đã được giáo viên tổ chức.'''

# ==============================================================================
# DOC 2: PART 6.4 STATE MACHINE
# ==============================================================================
DOC2_PART6_4_MACHINE = r'''```
                 ┌────────────────────────────────┐
                 │       KHỞI TẠO ĐỒNG BỘ         │
                 │  syncTwoWayWithServer(server)  │
                 └───────────────┬────────────────┘
                                 │
                   Kiểm tra kết nối Máy chủ?
                     /                      \\
                 [MẤT MẠNG]              [KẾT NỐI OK]
                    /                         \\
    ┌───────────────────────────┐    ┌─────────────────────────────────┐
    │     CHẾ ĐỘ NGOẠI TUYẾN    │    │ BƯỚC 1: ĐỒNG BỘ CHIỀU UPLOAD    │
    │  - Lưu bài vào Room DB    │    │  - Quét Room: getAllRecordsList │
    │  - Gắn serverId = null    │    │  - Lọc bài có serverId == null  │
    │  - Gắn serverSource=local │    │  - POST /api/grades             │
    │  - Cho phép xem lại & lọc │    │  - Cập nhật serverId trả về     │
    └───────────────────────────┘    └────────────────┬────────────────┘
                                                      │
                                     ┌────────────────┴────────────────┐
                                     │ BƯỚC 2: ĐỒNG BỘ CHIỀU DOWNLOAD  │
                                     │  - GET /api/grades              │
                                     │  - Tạo bộ khóa Unique Set:      │
                                     │    studentName_title_className  │
                                     │  - Bỏ qua các bài đã có trong máy│
                                     │  - Thêm bài mới vào Room DB     │
                                     └────────────────┬────────────────┘
                                                      │
                                     ┌────────────────┴────────────────┐
                                     │ BÁO CÁO KẾT QUẢ ĐỒNG BỘ         │
                                     │ Triple(UploadOk, UploadErr, New)│
                                     └─────────────────────────────────┘
```'''

def replace_doc1_diagrams():
    with open(DOC1_PATH, 'r', encoding='utf-8') as f:
        doc1 = f.read()

    # Locate each diagram block in Doc 1
    # 3.1
    idx_31 = doc1.find('### 3.1. Sơ đồ Kiến trúc Tổng quan 4 Tầng Hệ thống')
    idx_31_code_start = doc1.find('```', idx_31)
    idx_31_code_end = doc1.find('```', idx_31_code_start + 3) + 3

    # 3.2A
    idx_32a = doc1.find('#### A. Sơ đồ Tuần tự Quyết định Định tuyến Thông minh')
    idx_32a_code_start = doc1.find('```', idx_32a)
    idx_32a_code_end = doc1.find('```', idx_32a_code_start + 3) + 3

    # 3.2B
    idx_32b = doc1.find('#### B. Sơ đồ Khối Điều kiện Rẽ nhánh')
    idx_32b_code_start = doc1.find('```', idx_32b)
    idx_32b_code_end = doc1.find('```', idx_32b_code_start + 3) + 3

    # 3.3
    idx_33 = doc1.find('### 3.3. Sơ đồ Quy trình Nghiệp vụ 1: Luồng Chấm điểm OCR')
    idx_33_code_start = doc1.find('```', idx_33)
    idx_33_code_end = doc1.find('```', idx_33_code_start + 3) + 3

    # 3.4
    idx_34 = doc1.find('### 3.4. Sơ đồ Quy trình Nghiệp vụ 2: Luồng Luyện viết Chính tả')
    idx_34_code_start = doc1.find('```', idx_34)
    idx_34_code_end = doc1.find('```', idx_34_code_start + 3) + 3

    # 3.5
    idx_35 = doc1.find('### 3.5. Sơ đồ Quy trình Nghiệp vụ 3: Luồng Đồng bộ Sổ điểm')
    idx_35_code_start = doc1.find('```', idx_35)
    idx_35_code_end = doc1.find('```', idx_35_code_start + 3) + 3

    print(f"Doc 1 Diagram positions:")
    print(f"  3.1:  {idx_31_code_start} - {idx_31_code_end}")
    print(f"  3.2A: {idx_32a_code_start} - {idx_32a_code_end}")
    print(f"  3.2B: {idx_32b_code_start} - {idx_32b_code_end}")
    print(f"  3.3:  {idx_33_code_start} - {idx_33_code_end}")
    print(f"  3.4:  {idx_34_code_start} - {idx_34_code_end}")
    print(f"  3.5:  {idx_35_code_start} - {idx_35_code_end}")

    # Replace from back to front to preserve indices
    doc1 = doc1[:idx_35_code_start] + DIAGRAM_3_5 + doc1[idx_35_code_end:]
    doc1 = doc1[:idx_34_code_start] + DIAGRAM_3_4 + doc1[idx_34_code_end:]
    doc1 = doc1[:idx_33_code_start] + DIAGRAM_3_3 + doc1[idx_33_code_end:]
    doc1 = doc1[:idx_32b_code_start] + DIAGRAM_3_2B + doc1[idx_32b_code_end:]
    doc1 = doc1[:idx_32a_code_start] + DIAGRAM_3_2A + doc1[idx_32a_code_end:]
    doc1 = doc1[:idx_31_code_start] + DIAGRAM_3_1 + doc1[idx_31_code_end:]

    with open(DOC1_PATH, 'w', encoding='utf-8') as f:
        f.write(doc1)
    print("Doc 1 diagrams replaced successfully!")


def replace_doc2_diagrams():
    with open(DOC2_PATH, 'r', encoding='utf-8') as f:
        doc2 = f.read()

    # 1. Part 1 Architecture diagram
    idx_p1 = doc2.find('# PHẦN 1: TỔNG QUAN KIẾN TRÚC & PHÂN TẦNG CÔNG NGHỆ END-TO-END')
    idx_p1_code_start = doc2.find('```', idx_p1)
    idx_p1_code_end = doc2.find('```', idx_p1_code_start + 3) + 3

    # 2. Part 6.1 Mermaid ERD diagram
    idx_erd = doc2.find('### Sơ Đồ Quan Hệ Thực Thể (Entity Relationship Diagram - ERD)')
    idx_erd_end = doc2.find('## 6.2. Lược đồ Room DB v4', idx_erd)

    # 3. Part 6.4 State machine
    idx_sm = doc2.find('### A. Máy Trạng Thái Đồng Bộ (Two-Way Sync State Machine)')
    idx_sm_code_start = doc2.find('```', idx_sm)
    idx_sm_code_end = doc2.find('```', idx_sm_code_start + 3) + 3

    print(f"Doc 2 Diagram positions:")
    print(f"  Part 1:        {idx_p1_code_start} - {idx_p1_code_end}")
    print(f"  Part 6.1 ERD:  {idx_erd} - {idx_erd_end}")
    print(f"  Part 6.4 Sync: {idx_sm_code_start} - {idx_sm_code_end}")

    # Replace from back to front
    doc2 = doc2[:idx_sm_code_start] + DOC2_PART6_4_MACHINE + doc2[idx_sm_code_end:]
    # Replace ERD block (from heading to before 6.2)
    doc2 = doc2[:idx_erd] + DOC2_PART6_ERD + '\n\n---\n\n' + doc2[idx_erd_end:]
    # Re-find Part 1
    idx_p1 = doc2.find('# PHẦN 1: TỔNG QUAN KIẾN TRÚC & PHÂN TẦNG CÔNG NGHỆ END-TO-END')
    idx_p1_code_start = doc2.find('```', idx_p1)
    idx_p1_code_end = doc2.find('```', idx_p1_code_start + 3) + 3
    doc2 = doc2[:idx_p1_code_start] + DOC2_PART1_DIAGRAM + doc2[idx_p1_code_end:]

    with open(DOC2_PATH, 'w', encoding='utf-8') as f:
        f.write(doc2)
    print("Doc 2 diagrams replaced successfully!")


if __name__ == '__main__':
    replace_doc1_diagrams()
    replace_doc2_diagrams()
