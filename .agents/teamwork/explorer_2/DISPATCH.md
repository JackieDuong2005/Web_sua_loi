## 2026-09-30T14:19:58Z
You are an Explorer subagent (Core AI & Business Logic Specialist) for ViHand Grade.
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_2
Project root: c:\Users\Jackie Duong\Desktop\Web_sua_loi
The authoritative user request is in: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md

Mission:
Perform an exhaustive technical inspection and audit of the 3 core business logic flows between Android Native App (`android_app/`) and Web App (`app/`, `python_service/`, `mcp_service/`, `lib/`).

Specific Requirements to cover in depth (Acceptance Criteria 2):
1. Flow 1: Luồng Chấm điểm bài thi tự động (AI Grading & OCR):
   - Investigate YOLOv8 bounding box detection, Gemini Vision OCR, ViT5 spelling correction (`chamdentimem/ViT5_Vietnamese_Correction`).
   - Rule-based scoring: 4 criteria (Chính tả 4.0đ, Hình thức 3.0đ, Nội dung 2.0đ, Chữ viết 1.0đ) and 6 error categories (dấu thanh, phụ âm đầu, vần, viết hoa, lặp từ, bỏ từ/thiếu chữ).
   - How does Android implement this vs Web? Does Android run local AI/OpenCV/TFLite/CameraX or call remote services? How are images pre-processed (Web Jimp 9-step vs Android)?
   - Where and how are grading results and images saved/persisted (SQLite local vs Web Prisma/uploads)?
2. Flow 2: Luồng Quản lý học sinh, lớp học, thống kê phổ điểm & lịch sử bài thi:
   - Class and Student data structures, CRUD operations, relationships.
   - Grade statistics, score distribution calculations, filtering, exports.
   - History records, pagination, re-grading, status tracking.
   - Compare Android implementation vs Web implementation.
3. Flow 3: Luồng Luyện viết chính tả (Dictation) & đồng bộ dữ liệu:
   - Text reading rhythm (3-5 words, repeat 2x, pauses 5-8s).
   - TTS engine (Microsoft Edge-TTS in Python FastMCP vs Android TextToSpeech/remote audio stream).
   - Textbook passages library (SGK Lớp 1-5).
   - Offline session recording and data sync with server.
4. For every flow, provide step-by-step logic comparison tables, algorithm differences, and cite EXACT file paths and line numbers on BOTH sides (`android_app/...:lines` and `app/...:lines` or `python_service/...:lines`).
