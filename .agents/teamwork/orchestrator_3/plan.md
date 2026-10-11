# Plan: ViHand Grade System Architecture & Technical Specifications

## Objective
Thực hiện thanh tra, rà soát toàn diện hệ sinh thái ViHand Grade (Next.js 16 Web Studio BFF, Python AI Core ViT5 + YOLOv8, Android Native App Kotlin/Compose, Trạm biên Raspberry Pi Edge Station, SQLite Prisma/Room DB) và biên soạn 2 tài liệu đặc tả chuẩn mực, đầy đủ, chính xác 100% với codebase thực tế:
1. `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md`
2. `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md`

## Architecture & Scope
### Phase 0: Ecosystem Survey (3 Parallel Explorers/Spec Miners)
- Explorer 1: Web Studio BFF (Next.js 16, App Router, TypeScript, Prisma SQLite vihand.db, API routes, RBAC, Rate Limiting Guard, session auth).
- Explorer 2: Android Native App (`android_app/`, Jetpack Compose, Room DB v4, CameraX, Retrofit2, Edge TTS client, Bounding Box co-transformation touch gestures, unit tests 23/23).
- Explorer 3: Python AI Core (`ai_services/` or python backend, FastAPI, YOLOv8 segmentation, ViT5 Vietnamese correction, VietOCR/Gemini fallback, Qwen 2.5 SLM) & Edge Station (Raspberry Pi scripts, Cloudflare Tunnel, Zero-token offline fallback).

### Milestone 1: Author Document 1 (Tổng Quan Kiến Trúc Hệ Thống ViHand Grade)
- Bối cảnh giáo dục tiểu học & TT27/2020/TT-BGDĐT.
- Sơ đồ kiến trúc 4 tầng với Mermaid chi tiết.
- Mô hình Multi-Agent & Hybrid Edge-Cloud (Zero-token offline fallback, Cloudflare tunnel).
- Quy chuẩn luồng nghiệp vụ (OCR chữ viết tay, Luyện chính tả Neural TTS, Quản lý điểm số & sổ tay từ khó).
- Đánh giá chất lượng: Bảo mật, Tính sẵn sàng, Hiệu năng và độ trễ.
- Verification Loop: 3 Explorers -> 1 Worker -> 2 Reviewers -> 2 Challengers -> 1 Forensic Auditor -> Gate.

### Milestone 2: Author Document 2 (Đặc Tả Kỹ Thuật End-to-End ViHand Grade)
- Tầng Client Mobile: Android Native chi tiết (Compose, Room DB v4, CameraX, Retrofit2, Edge TTS, Bounding Box pinch/pan).
- Tầng Web Studio & BFF: Next.js 16 App Router, TypeScript, Prisma ORM, Server Actions, API routes, Rate Limiting.
- Tầng AI Core: FastAPI, YOLOv8, ViT5, VietOCR/Gemini, Qwen 2.5.
- Hợp đồng API & Schemas: Full HTTP routes, JSON DTOs, status codes, error handling.
- Mô hình Dữ liệu: ERD Prisma SQLite (`vihand.db`) & Room DB v4, 2-way sync, offline-first.
- Quy trình Kiểm thử & PStack: Unit tests 23/23, TypeScript 0 errors, ảnh bài thi thực nghiệm.
- Verification Loop: 3 Explorers -> 1 Worker -> 2 Reviewers -> 2 Challengers -> 1 Forensic Auditor -> Gate.

### Milestone 3: Final E2E Audit & Delivery
- Đảm bảo 100% khớp thực tế, không giả định.
- Báo cáo kết quả và submit handoff cho Parent Agent.
