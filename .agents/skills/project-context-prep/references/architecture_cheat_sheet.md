# ViHand Grade — Architecture & Workflow Cheat Sheet

> Tài liệu tham khảo nhanh cho AI Agent khi làm việc với codebase ViHand Grade.
> Được nạp theo cơ chế **Progressive Disclosure** khi kích hoạt skill `project-context-prep`.

---

## 1. Tổng quan hệ thống

**ViHand Grade** là hệ thống AI hỗ trợ chấm điểm và sửa lỗi chính tả bài viết tay tiếng Việt dành cho học sinh tiểu học (Đề tài NCKH Sinh viên — Đại học Tôn Đức Thắng).

### Cấu trúc 4 tầng (Hybrid AI Architecture):
```text
┌────────────────────────────────────────────────────────┐
│ 📸 Ảnh bài viết tay (Web Camera hoặc Android CameraX)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 1. Tiền xử lý (Jimp - lib/image-processor.ts)          │
│    (Auto-rotate -> Grayscale -> Khử bóng -> 1600px)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Song song: Gemini OCR + YOLOv8 Word Bounding Boxes  │
│    (Nhận diện text + Tọa độ Bounding Box từng chữ viết)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Sửa lỗi chính tả & Đối soát chuẩn (ViT5 / Levenshtein│
│    (So khớp 1-1, phân loại 6 nhóm lỗi, Qwen nhận xét)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. Báo cáo kết quả & Lưu Server-Only (vihand.db)       │
│    (Đồng bộ điểm số cho Giáo viên Web & Android App)   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Các dịch vụ & Cổng kết nối (Services & Ports)

| Service | Đường dẫn | Công nghệ | Cổng mặc định | Vai trò |
|:---|:---|:---|:---:|:---|
| **Web App & Mobile BFF Gateway** | `/` | Next.js 16, React 19, Tailwind v4 | `3000` (Local) / `7860` (Docker) | Giao diện giáo viên/học sinh/admin + BFF API `/api/mobile/grade` |
| **Android Native App** | `android_app/` | Kotlin, Jetpack Compose, CameraX, Retrofit | Client | Ứng dụng di động chụp bài và chấm điểm thực địa |
| **AI Core Microservice** | `python_service/` | Python 3.11, FastAPI, ViT5 INT8, YOLOv8, Qwen SLM | `8000` | Sửa chính tả (`/grade`, `/correct`), Bounding Box (`/detect-words`), TTS (`/tts`) |
| **Trạm Biên Edge Computing** | Raspberry Pi 5 | Debian/Linux, Cloudflare Tunnel | `vihandgrade.click` | Trạm xử lý biên trường học, không phụ thuộc cloud ngoài |
| **Database** | `prisma/` | SQLite (`prisma/vihand.db`), Prisma ORM 5 | File-based | Cơ sở dữ liệu duy nhất lưu trữ tài khoản, lớp học, kết quả chấm |

Khởi động toàn bộ dịch vụ cục bộ bằng file batch:
```bat
start_all.bat
```

---

## 3. Luồng dữ liệu cốt lõi (Core Data Flows)

### A. Pipeline Chấm điểm bài chính tả Web & Mobile (`app/api/grade/route.ts` & `app/api/mobile/grade/route.ts`)
1. **Tiền xử lý ảnh (`lib/image-processor.ts`)**:
   - Jimp thực hiện chuỗi 9 bước: Auto-rotate -> Cân bằng sáng -> Grayscale -> CLAHE/Contrast -> Khử bóng -> Khử nhiễu -> Nhị phân hóa Otsu -> Crop lề -> Chuẩn hóa kích thước (1600px).
2. **Gemini Vision OCR & YOLOv8 Word Detector**:
   - Chạy song song: Gemini trích xuất văn bản + YOLOv8 quét tọa độ Bounding Box từng từ viết tay.
3. **ViT5 Spelling Correction (`http://localhost:8000/grade` hoặc `/correct`)**:
   - Đưa văn bản qua mô hình `chamdentimem/ViT5_Vietnamese_Correction` (PyTorch INT8 Quantized).
   - Nếu có bài mẫu Ground Truth từ SGK, chạy thuật toán Levenshtein Sequence Alignment 100% không ảo giác.
   - Nếu service Python offline, fallback sang prompt chuyên dụng của Gemini Flash.
4. **Thuật toán Chấm điểm & Phân loại lỗi**:
   - So khớp văn bản học sinh với văn bản mẫu / văn bản sửa bằng Levenshtein/Diff.
   - Phân loại lỗi: **Dấu thanh**, **Phụ âm đầu**, **Phụ âm cuối**, **Nguyên âm/âm chính**, **Vần**, **Viết hoa**, **Bỏ sót/thừa từ**.
   - Tính điểm theo barem chuẩn:
     - Bài chính tả: 7.0đ Chính tả + 3.0đ Hình thức.
     - Tập làm văn: 4.0đ Chính tả + 3.0đ Hình thức + 2.0đ Nội dung + 1.0đ Sáng tạo (Qwen SLM).
5. **Cơ chế Lưu trữ Server-Only Storage**:
   - Lưu ảnh vật lý vào thư mục máy chủ: `public/uploads/grades/`.
   - Lưu bản ghi vào bảng `prisma.grade` trên SQLite Server.
   - Android App và Web nhận kết quả trực tiếp từ server, không lưu cache cục bộ trên điện thoại.

### B. Module Đọc chính tả (`app/teacher/dictation/page.tsx` & `python_service/main.py`)
- Giáo viên chọn bài từ kho SGK Lớp 1-5 hoặc nhập tùy ý.
- Chia câu theo nhịp đọc tiểu học (3-5 từ/nhịp, lặp 2 lần, ngắt nghỉ 5-8 giây).
- Stream audio trực tiếp bằng Microsoft Edge-TTS tiếng Việt (`vi-VN-HoaiMyNeural` / `vi-VN-NamMinhNeural`) qua endpoint `/tts`.

---

## 4. Bản đồ mã nguồn quan trọng (Anchor Points)

```
Web_sua_loi/
├── app/
│   ├── api/
│   │   ├── mobile/grade/route.ts   ⭐ Mobile BFF Gateway (Gemini OCR + YOLO + Levenshtein + Auto-save)
│   │   ├── grade/route.ts          ⭐ Core Web grading pipeline (Jimp + Ground Truth Alignment)
│   │   ├── grades/route.ts         ⭐ Quản lý kết quả chấm & lưu trữ ảnh vật lý
│   │   ├── ocr/route.ts            ⭐ Gemini OCR endpoint
│   │   └── dictation/              ⭐ Dictation & TTS API
│   ├── teacher/
│   │   ├── grade/page.tsx          ⭐ Giao diện chấm bài của giáo viên
│   │   ├── dictation/page.tsx      ⭐ Giao diện đọc chính tả
│   │   └── reports/page.tsx        ⭐ Báo cáo thống kê lớp học
│   ├── student/history/page.tsx    ⭐ Học sinh xem lại bài chấm
│   └── admin/                      ⭐ Quản lý phân quyền 3 cấp (RBAC)
├── android_app/                    ⭐ Ứng dụng Android Native (Kotlin + CameraX + Retrofit)
│   └── app/src/main/java/com/example/
│       ├── ui/viewmodel/           ⭐ MainViewModel (điều phối chấm điểm & hiển thị server)
│       └── data/repository/        ⭐ GradeRepository (kết nối BFF Gateway, Server-Only)
├── lib/
│   ├── image-processor.ts          ⭐ 9 bước tiền xử lý ảnh (Jimp)
│   ├── prisma.ts                   ⭐ Prisma Client singleton
│   └── api-guard.ts                ⭐ Sliding Window Rate Limiter chống DoS
├── python_service/
│   ├── main.py                     ⭐ FastAPI (ViT5 INT8 + YOLOv8 + Qwen SLM + Edge-TTS)
│   └── yolo_detector.py            ⭐ YOLOv8 Word Bounding Box & Reading-order alignment
├── prisma/
│   └── schema.prisma               ⭐ SQLite database schema (vihand.db)
└── 01_Bao_cao_Nghien_cuu/
    └── Tai_lieu_Bao_cao/           ⭐ Toàn bộ tài liệu NCKH / TechSpec v2.3
```

---

## 5. Quy tắc bảo mật & vận hành bắt buộc

1. **Database SQLite (`prisma/*.db*`)**: Chứa thông tin học sinh thực tế — **TUYỆT ĐỐI KHÔNG** commit lên GitHub công khai.
2. **API Keys**: Các biến trong `.env` (`GEMINI_API_KEY`, `GEMINI_API_KEYS`, `NEXTAUTH_SECRET`) không bao giờ được hardcode hoặc push lên git.
3. **Môi trường chạy**: Môi trường Windows sử dụng lệnh `python` (không dùng `python3`).
4. **Không dùng Mermaid**: Bắt buộc dùng ASCII Box Drawing hoặc Bảng Markdown theo quy chuẩn dự án.
