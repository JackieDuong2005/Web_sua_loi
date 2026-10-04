# Project: ViHand Grade Architectural Parity Audit & Android Roadmap

## Architecture
- **Web App**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Radix UI, Prisma ORM 5 with SQLite (`prisma/vihand.db`).
- **Python AI Services**: FastAPI (port 8000), ViT5 Seq2Seq model (`chamdentimem/ViT5_Vietnamese_Correction`) with dynamic INT8 quantization, YOLOv8 detection (`python_service/yolo_detector.py`), Microsoft Edge-TTS neural voices.
- **Android App**: Kotlin Native, Jetpack Compose Material 3, CameraX 1.5.0, Retrofit 2.11.0, Moshi 1.15.2, Room Database (`AppDatabase`), Android TextToSpeech.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|:---:|
| 1 | API Contracts Parity Matrix (R1) | 39 HTTP endpoints mapped across Android and Web BFF | Milestone 1 (API Audit) | survey | DONE |
| 2 | Core Business Logic Parity (R2) | 3 core flows: AI Grading/OCR, Student/Class/Score management, Dictation/TTS | Milestone 2 (Logic Audit) | survey | DONE |
| 3 | UI/UX & Design System Parity (R3) | Design language, color tokens, typography, feedback states, touch UX | Milestone 3 (UI/UX Audit) | survey | DONE |
| 4 | Feature Parity Matrix across 7 Screens (R4.1) | Full screen coverage: Auth, Dashboard, Grading, History, Reports, Dictation, Settings | Milestone 4 (Parity Matrix) | survey | DONE |
| 5 | Gap Analysis with P0/P1/P2 (R4.2) | Prioritized gaps: Security/Sync (P0), Contracts/UX (P1), Polish/Room (P2) | Milestone 5 (Gap Analysis) | survey | DONE |
| 6 | 3-Phase Actionable Roadmap (R4.3) | Phase 1 (Core AI & Sync), Phase 2 (Management & Dictation), Phase 3 (Touch UX & Polish) | Milestone 6 (Roadmap) | survey | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Survey & Deep Domain Inspection | 3 parallel explorers across API, Business Logic, and UI/UX | none | DONE |
| 2 | Master Audit Report Compilation | Synthesize comprehensive AUDIT_REPORT.md covering R1, R2, R3, R4 | M1 | DONE |
| 3 | Independent Multi-Agent Review | 2 Reviewers independently assess report against Acceptance Criteria | M2 | DONE (APPROVE) |
| 4 | Adversarial Empirical Challenge | 2 Challengers verify line numbers, endpoints and factual claims | M2 | DONE (APPROVE) |
| 5 | Forensic Integrity Audit | Forensic Auditor audits citations, non-hallucination and integrity | M3, M4 | DONE (CLEAN) |
| 6 | Final Delivery & Victory Claim | Submit handoff to Parent Sentinel | M5 | DONE |

## Interface Contracts
### Android Native App ↔ Web BFF
- Entry point: `https://vihandgrade.click/api/`
- AI Grading: `POST /api/mobile/grade` (`GradeApiRequest` -> `GradeApiResponse`)
- Health check: `GET /api/health`
- Auth: `POST /api/auth/login` (`LoginRequest` -> `LoginResponse`)
- Dictation: `GET /api/dictation/passages`, `GET /api/dictation/tts`
- Class & Student: `GET /api/classes`, `GET /api/users?role=student`
- Grade sync: `POST /api/grades`, `GET /api/grades`, `PATCH /api/grades/{id}`
