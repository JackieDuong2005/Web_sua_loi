## 2026-10-05T15:31:41Z
You are a teamwork_preview_explorer specializing in End-to-End Technical Specifications, Code Citations, and API/Data Schemas for ViHand Grade.
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_doc2_2
Project root: c:\Users\Jackie Duong\Desktop\Web_sua_loi

MANDATORY FIRST STEPS:
1. Read c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section ## 2026-10-05T15:01:07Z).
2. Read the 3 exhaustive survey reports prepared by our survey team:
   - c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\report.md
   - c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2\report.md
   - c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_3\report.md

YOUR MISSION:
Synthesize and produce a complete, exhaustive technical specification blueprint with verified code citations, exact lines, and DTO schemas for Document 2:
`01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md`.

Your output blueprint MUST detail:
1. Client Mobile Tier (Android Native):
   - Architecture: MVVM, StateFlow `collectAsStateWithLifecycle()`, Compose UI.
   - Dual-layer zero-letterbox Bounding Box co-transformation architecture with 1x-4x pinch-to-zoom & pan gestures in lockstep (`PhotoBoundingBoxViewer.kt`).
   - CameraX capture with EXIF rotation normalization & 90ms shutter flash (`CameraScanScreen.kt`).
   - Room DB v4 (`vihand_grade.db`): 18-column `GradeRecordEntity`, DAOs, analytical SQL queries, two-way sync protocol (`syncTwoWayWithServer` in `GradeRepository.kt`).
2. Web Studio & BFF Tier:
   - Next.js 16 App Router, TypeScript, Prisma ORM (`lib/prisma.ts` with WAL mode, busy_timeout=5000).
   - In-memory Sliding Window Rate Limiter (`lib/api-guard.ts`): limits, cleanup intervals, headers.
   - Client-side Layout RBAC guards and session handling.
   - Anti-disk-bloat strategy: storing images on disk (`public/uploads/grades/`) and referencing paths.
3. AI Core Service Tier:
   - FastAPI Python service (`python_service/main.py`), 10 endpoints, ThreadPoolExecutor.
   - YOLOv8 Line/Word Segmentation (`python_service/yolo_detector.py`): Vertical Overlap (threshold 0.40), relative coordinates [0.0, 1.0], imgsz=640.
   - ViT5 Vietnamese Correction Engine: Dynamic INT8 quantization, prose chunking max_chunk=160 without sliding window, 5-component syllable parsing, 6 error categories.
   - Qwen 2.5 SLM: `Qwen2.5-0.5B-Instruct` bfloat16 (~577MB RAM) for Circular 27 comments and passage generation.
   - Edge-TTS: `vi-VN-HoaiMyNeural` at speed -15%.
4. API Contracts & Schemas:
   - Detailed specification of all primary API endpoints (e.g. `/api/mobile/grade`, `/api/grade`, `/api/dictation/*`, `/api/grades/*`, `/api/users`), complete request/response JSON payloads, status codes, and exception models.
5. Data Models & ERD:
   - Prisma SQLite schema (6 models: User, Class, Grade, DictationSession, DictationLog, TextbookPassage).
   - Room DB v4 schema (GradeRecordEntity, ClassEntity, StudentEntity).
   - 2-way sync state machine, conflict resolution, and offline resilience.

OUTPUT:
- Write your comprehensive blueprint to: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_doc2_2\blueprint.md`
- Write your handoff report to: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_doc2_2\handoff.md`
- Send message back to caller (Recipient: "18c248ba-19cd-491f-bb1c-a47796deb34c") when done.
