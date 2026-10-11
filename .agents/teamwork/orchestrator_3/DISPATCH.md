## 2026-10-05T15:01:07Z
You are the Project Orchestrator for ViHand Grade.
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_3
Project root: c:\Users\Jackie Duong\Desktop\Web_sua_loi
The authoritative user request is recorded in: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md (under section ## 2026-10-05T15:01:07Z).

Your mission is to conduct a comprehensive audit of the entire ViHand Grade ecosystem (Next.js 16 Web Studio BFF, Python AI Core ViT5 + YOLOv8, Android Native App Kotlin/Compose, Raspberry Pi Edge Station, and SQLite Prisma/Room DB) and compose 2 complete, authoritative end-to-end architecture and technical specification documents in Markdown:

1. Document 1: `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md`
   - Bối cảnh bài toán giáo dục tiểu học và chuyển đổi số theo Thông tư 27/2020/TT-BGDĐT.
   - Sơ đồ kiến trúc tổng thể 4 tầng (Client Mobile/Web, Gateway BFF, AI Microservices Core, Database & Edge Computing) với sơ đồ Mermaid chi tiết.
   - Mô hình cộng tác Multi-Agent / Hybrid Edge-Cloud (Zero-Token offline fallback, Cloudflare Tunnel).
   - Quy chuẩn luồng dữ liệu nghiệp vụ (Chấm điểm OCR chữ viết tay, Luyện viết chính tả sư phạm Neural TTS, Quản lý điểm số và sổ tay từ khó).
   - Đánh giá các thuộc tính chất lượng (Bảo mật RBAC/Data protection, Tính sẵn sàng High Availability, Hiệu năng và độ trễ).

2. Document 2: `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md`
   - Tầng Client Mobile: Cấu trúc Android Native (Jetpack Compose, Room DB v4, CameraX, Retrofit2, Edge TTS client, Bounding Box co-transformation touch gestures).
   - Tầng Web Studio & BFF: Next.js 16 App Router, TypeScript, Prisma ORM, Server Actions & API Routes, cơ chế Rate Limiting Guard, xác thực phiên làm việc.
   - Tầng AI Core Service: FastAPI Python, YOLOv8 Line/Word Segmentation, VietOCR / Gemini Multimodal Fallback, ViT5 Vietnamese Correction Engine, Qwen 2.5 SLM Generator.
   - Hợp đồng API & Schemas: Toàn bộ HTTP routes (`/api/mobile/grade`, `/api/dictation/*`, `/api/grades/*`, `/api/users`), JSON request/response DTOs, mã trạng thái và xử lý ngoại lệ.
   - Mô hình Dữ liệu: Sơ đồ ERD Prisma SQLite (`vihand.db`) và Room DB cục bộ, đồng bộ hai chiều (Two-way sync) và bảo toàn tính toàn vẹn khi mất mạng.
   - Quy trình Kiểm thử & Xác thực: Toàn bộ kết quả thực nghiệm theo chuẩn Lauren Tan / PStack (Unit tests Android 23/23, TypeScript 0 error, kiểm thử ảnh bài thi thật).

Acceptance Criteria:
- Cả 2 file tài liệu .md được tạo đúng vị trí thư mục `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/`.
- File 1 chứa đầy đủ sơ đồ Mermaid kiến trúc hệ thống, phân tích luồng nghiệp vụ và mô hình bảo mật.
- File 2 chứa đầy đủ chi tiết kỹ thuật end-to-end: API payloads, mã nguồn dẫn chứng, Room DB schema v4, Prisma schema, luồng xử lý ảnh -> Bounding Box -> Điểm số TT27.
- Không chứa thông tin giả định; tất cả thông số độ trễ, kích thước APK, cấu trúc bảng CSDL và endpoint đều khớp chính xác 100% với codebase thực tế.

Please maintain plan.md, progress.md, and BRIEFING.md in your working directory.
Decompose the work into exploration, architectural synthesis, technical detailing, and verification phases.
When all acceptance criteria are met, deliver your handoff and victory claim.


## 2026-10-05T15:03:08Z
You are the Project Orchestrator for ViHand Grade.
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_3
Project root: c:\Users\Jackie Duong\Desktop\Web_sua_loi

Please read:
- c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_3\DISPATCH.md
- c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md (under section ## 2026-10-05T15:01:07Z)

Your mission is to conduct a comprehensive audit of the entire ViHand Grade ecosystem (Next.js 16 Web Studio BFF, Python AI Core ViT5 + YOLOv8, Android Native App Kotlin/Compose, Raspberry Pi Edge Station, and SQLite Prisma/Room DB) and compose 2 complete, authoritative end-to-end architecture and technical specification documents in Markdown:
1. `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md`
2. `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md`

All requirements, acceptance criteria, and quality standards are detailed in DISPATCH.md and ORIGINAL_REQUEST.md.
Maintain plan.md, progress.md, and BRIEFING.md in your working directory.
Orchestrate your team of specialists to examine the actual codebase without assumptions.
Once all acceptance criteria are met, submit your handoff.md and report victory back to parent.
