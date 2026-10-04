# Master Execution Plan: ViHand Grade Parity Audit & Android Roadmap

## Objective
Thanh tra, đối soát và đánh giá mức độ đồng nhất toàn diện về kiến trúc, luồng nghiệp vụ (chấm điểm AI, OCR, quản lý học sinh/lớp học), giao diện UI/UX và hợp đồng API giữa Android Native App (`android_app/`) và Web App (`app/`) của hệ sinh thái ViHand Grade; đồng thời lập báo cáo phân tích khoảng cách (gap analysis) chi tiết và lộ trình phát triển (development roadmap) cho Android app.

## Strategy & Phasing
- **Phase 0: Survey & Deep Multi-Domain Exploration (Parallel)**:
  - `explorer_1`: API Contracts & Schema Parity (Retrofit vs Next.js BFF routes, payload matching, status codes, headers/auth, offline fallback, line numbers).
  - `explorer_2`: Core Business Logic & AI Pipelines (Grading/OCR YOLOv8+Gemini+ViT5, Student/Class/Score analytics, Dictation & sync, line numbers).
  - `explorer_3`: UI/UX & Design System Parity (Compose/XML vs Tailwind v4/Radix, colors, typography, loading/skeleton, error/toast/empty states, UX flows, line numbers).
- **Phase 1: Synthesis & Master Deliverables Compilation**:
  - Compile Master Architecture & Parity Report (`AUDIT_REPORT.md` and `PROJECT.md`).
  - Generate comprehensive API Parity Matrix (R1).
  - Generate Core Business Logic & Feature Parity Analysis (R2).
  - Generate UI/UX Design System & Experience Evaluation (R3).
  - Generate Feature Parity Matrix across all main screens (R4).
  - Formulate Actionable 3-Phase Android Development Roadmap with P0/P1/P2 priorities and independent acceptance criteria (R4).
- **Phase 2: Review, Empirical Verification & Forensic Audit**:
  - Dispatch Reviewers and Challengers to verify line numbers, contract accuracy, completeness, and realism of roadmap.
  - Dispatch Forensic Auditor to verify non-hallucination, genuine code citations, and audit integrity.
- **Phase 3: Final Delivery & Victory Claim**:
  - Handoff report and communication to parent Sentinel.

## Acceptance Criteria Checklist
- [ ] R1: Ma trận đối soát API & dữ liệu chi tiết từng endpoint (HTTP method, URL, Request, Response, Status, exact line numbers in `android_app` and `app/api`).
- [ ] R2: Đối chiếu 3 luồng tính năng cốt lõi (Chấm điểm AI/OCR, Quản lý học sinh/lớp/phổ điểm, Dictation & sync).
- [ ] R3: Đánh giá UI/UX (Design language, màu sắc, typography, skeleton/progress, error/toast/dialogs).
- [ ] R4.1: Feature Parity Matrix bao quát toàn bộ màn hình chính (Dashboard, Chấm bài, Lịch sử, Học sinh, Cài đặt).
- [ ] R4.2: Gap Analysis chi tiết xếp hạng P0, P1, P2.
- [ ] R4.3: Lộ trình phát triển 3 giai đoạn (Phase 1, 2, 3) với tiêu chí nghiệm thu rõ ràng, độc lập.
