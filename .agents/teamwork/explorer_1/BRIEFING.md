# BRIEFING — 2026-09-30T14:33:00Z

## Mission
Perform an exhaustive technical inspection and audit of all API contracts, networking layers, endpoints, data schemas, headers, authentication, status codes, and synchronization mechanisms between Android Native App (`android_app/`) and Web App (`app/` / `app/api/*`), constructing the comprehensive API Parity Matrix with exact file paths and line numbers.

## 🔒 My Identity
- Archetype: explorer
- Roles: API & Data Schema Specialist
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_1
- Original parent: f0ddaab8-a84b-4aaf-a6c0-6db4d7c7f28a
- Milestone: ViHand Grade Android vs Web API Parity Audit

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code modifications in app/ or android_app/
- Exact file paths and line numbers cited for every endpoint on both sides
- Rigorous 4-category classification: Đồng nhất hoàn toàn, Lệch Payload, Android chưa tích hợp, Endpoint mồ côi
- Audit headers, auth, status codes, error handling schemas, and offline caching

## Current Parent
- Conversation ID: f0ddaab8-a84b-4aaf-a6c0-6db4d7c7f28a
- Updated: 2026-09-30T14:33:00Z

## Investigation State
- **Explored paths**:
  - `android_app/app/src/main/java/com/example/data/api/GradeApiService.kt`
  - `android_app/app/src/main/java/com/example/data/api/GradeApiModels.kt`
  - `android_app/app/src/main/java/com/example/data/api/NetworkClient.kt`
  - `android_app/app/src/main/java/com/example/data/repository/GradeRepository.kt`
  - `android_app/app/src/main/java/com/example/data/local/UserSessionManager.kt`
  - `android_app/app/src/main/java/com/example/data/local/GradeRecordDao.kt`
  - `android_app/app/src/main/java/com/example/data/local/GradeRecordEntity.kt`
  - `android_app/app/src/main/java/com/example/ui/screens/DictationScreen.kt`
  - `android_app/app/src/main/java/com/example/ui/viewmodel/MainViewModel.kt`
  - `prisma/schema.prisma`
  - `lib/types.ts`
  - `lib/api-guard.ts`
  - All 24 route handlers in `app/api/*`
- **Key findings**:
  - Exactly 10 endpoints interact between Android and Web BFF:
    - 7 fully synchronized: `GET /api/health`, `POST /api/auth/login`, `GET /api/dictation/passages`, `GET /api/classes`, `GET /api/users`, `GET /api/grades`, `PATCH /api/grades/{id}`, plus `GET /api/dictation/tts` via MediaPlayer.
    - 2 payload mismatches: `POST /api/mobile/grade` (`the_loai` vs `essayType`, unparsed `studentId`/`classId`) and `POST /api/grades` (missing `overallRating`, `processingTimeMs`, `tokenCount`, `imageBase64`).
    - 1 historical orphan endpoint: `POST /api/grade` directly called with mobile image payload returned HTTP 400 (`studentText` missing).
    - 28 Web endpoints have not yet been integrated into Android.
  - Zero token/JWT auth implementation: plain text passwords in SQLite `User` table, no Authorization header in OkHttp or Next.js route handlers.
- **Unexplored areas**: None within the API & Data Schema scope.

## Key Decisions Made
- Include full 39-endpoint cross-reference table covering all HTTP methods on both sides.
- Document exact security, error code, and offline caching architectural findings.

## Artifact Index
- `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_1\DISPATCH.md` — Dispatch log
- `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_1\progress.md` — Progress tracker and heartbeat
- `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_1\handoff.md` — Final comprehensive handoff report
