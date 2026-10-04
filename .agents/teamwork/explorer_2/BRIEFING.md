# BRIEFING — 2026-09-30T14:36:00Z

## Mission
Perform an exhaustive technical inspection and audit of the 3 core business logic flows (AI Grading & OCR, Student/Class/History Management & Statistics, Dictation & Audio Sync) between Android Native App and Web/Python/MCP services.

## 🔒 My Identity
- Archetype: explorer
- Roles: Core AI & Business Logic Specialist
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_2
- Original parent: f0ddaab8-a84b-4aaf-a6c0-6db4d7c7f28a
- Milestone: Audit Business Logic & AI Parity (Flows 1, 2, 3)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Precise file paths and line numbers on both Android and Web/Python sides
- 5-Component handoff report (Observation, Logic Chain, Caveats, Conclusion, Verification Method)

## Current Parent
- Conversation ID: f0ddaab8-a84b-4aaf-a6c0-6db4d7c7f28a
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `android_app/app/src/main/java/com/example/data/model/GradeModels.kt`
  - `android_app/app/src/main/java/com/example/data/api/GradeApiModels.kt`
  - `android_app/app/src/main/java/com/example/data/api/GradeApiService.kt`
  - `android_app/app/src/main/java/com/example/data/api/NetworkClient.kt`
  - `android_app/app/src/main/java/com/example/data/local/AppDatabase.kt`
  - `android_app/app/src/main/java/com/example/data/local/GradeRecordEntity.kt`
  - `android_app/app/src/main/java/com/example/data/local/GradeRecordDao.kt`
  - `android_app/app/src/main/java/com/example/data/local/UserSessionManager.kt`
  - `android_app/app/src/main/java/com/example/data/repository/GradeRepository.kt`
  - `android_app/app/src/main/java/com/example/data/repository/LocalDictationPassages.kt`
  - `android_app/app/src/main/java/com/example/ui/viewmodel/MainViewModel.kt`
  - `android_app/app/src/main/java/com/example/ui/viewmodel/ReportsViewModel.kt`
  - `android_app/app/src/main/java/com/example/ui/screens/CameraScanScreen.kt`
  - `android_app/app/src/main/java/com/example/ui/screens/DictationScreen.kt`
  - `android_app/app/src/main/java/com/example/ui/components/CriteriaScoreCard.kt`
  - `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt`
  - `app/api/mobile/grade/route.ts`
  - `app/api/grade/route.ts`
  - `app/api/grades/route.ts`
  - `app/api/grades/[id]/route.ts`
  - `app/api/classes/route.ts`
  - `app/api/classes/[id]/route.ts`
  - `app/api/users/route.ts`
  - `app/api/users/[id]/route.ts`
  - `app/api/dictation/passages/route.ts`
  - `app/api/dictation/tts/route.ts`
  - `app/api/dictation/sessions/route.ts`
  - `lib/image-processor.ts`
  - `prisma/schema.prisma`
  - `python_service/main.py`
  - `python_service/yolo_detector.py`
- **Key findings**:
  - Flow 1: Android has NO local AI/OpenCV/TFLite. Offloads all inference to `POST /api/mobile/grade`. Offline fallback is a deterministic simulation in `GradeRepository.kt:305-367`. Web has 9-step Jimp preprocessing pipeline in `lib/image-processor.ts`. Persistence is SQLite via Prisma with image on disk (`public/uploads/grades`) vs Android Room DB `grade_records` with local JPEG in `context.filesDir/grades`.
  - Flow 2: Web has full relational DB (`Class`, `User`, `Grade`) with REST CRUD. Android has NO local Room entities for Class or Student (only hardcoded in-memory fallbacks `defaultClasses`, `defaultStudents`). Statistics on Web uses Recharts with 4 buckets (`9-10`, `7-8`, `5-6`, `0-4`); Android uses `ReportsViewModel` with Room queries for 4 tiers (`>=9.0`, `8.0-9.0`, `6.5-8.0`, `<6.5`) and exports CSV to MediaStore. Deletion in Android is local only (does NOT call server `DELETE /api/grades/{id}`).
  - Flow 3: Web has 3-5 word clause chunking (`splitIntoPedagogicalClauses`), repeats 2x, pauses dynamically 5-8s (`Math.max(5, Math.round(wCount * 1.6))`). Android splits by sentence/line, repeats 2x (first 2.8s, second 10s). TTS on Web is Microsoft Edge-TTS Neural via Python with Google TTS fallback; Android streams from Web TTS with local `android.speech.tts.TextToSpeech` fallback. Android lacks DictationSession persistence or sync.
- **Unexplored areas**: None.

## Key Decisions Made
- Structure comprehensive handoff report with complete evidence chains, comparison tables, and exact file:line citations on both sides.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- BRIEFING.md — Persistent context
- progress.md — Heartbeat and status
- handoff.md — Final comprehensive report
