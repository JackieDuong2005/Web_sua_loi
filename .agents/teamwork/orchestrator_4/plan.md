# Plan: Semantic-Acoustic Decoupled Pipeline (Qwen2.5-0.5B + Piper VITS ONNX)

## Mission
Complete the Semantic-Acoustic Decoupled Pipeline (`Qwen2.5-0.5B-Instruct` SLM + `Piper VITS ONNX` Acoustic Engine) for ViHand Grade on Raspberry Pi 4 (4GB RAM) with Staged On-Demand Activation & Auto-Unload (`ON_DEMAND_UNLOAD`), Prosody Script Caching, VITS Expressive Tuning (`noise_scale`, `noise_w_scale`, spoken Vietnamese punctuation), and multi-surface audio playback across Teacher Dictation, Teacher Grading, and Student Portal views.

## Phase 0: Survey & Codebase Audit
- Spawn 3 survey agents:
  1. `explorer_survey_python`: Inspect `python_service/tts_engine.py`, `python_service/main.py`, `python_service/requirements.txt`, `start_all.bat`.
  2. `explorer_survey_frontend`: Inspect `app/teacher/dictation/page.tsx`, `app/teacher/grade/page.tsx`, `app/student/page.tsx`, `components/student/student-grade-detail-modal.tsx`.
  3. `spec_miner_contracts`: Map all API contracts between Next.js BFF (`app/api/dictation/...`) and Python service (`:8000`), document parameter schemas and edge cases.
- Synthesize survey findings into `PROJECT.md` in orchestrator folder.

## Phase 1: Implementation Milestones
- **Milestone 1 (M1)**: Expressive Piper VITS ONNX Engine & Spoken Punctuation (`python_service/tts_engine.py`)
  - Presets: `warm_story`, `standard`, `emphasis`, `question`
  - Spoken punctuation injection: `,` -> `, phẩy,`, `.` -> `, chấm.`, etc.
  - SynthesisConfig forwarding to PiperVoice.
- **Milestone 2 (M2)**: Qwen2.5-0.5B Staged On-Demand Lifecycle & Pedagogical Director (`python_service/main.py`, `start_all.bat`)
  - On-demand unload lifecycle, cross-platform RAM detection, LRU prosody cache.
  - Endpoints: `POST /qwen/extract-sgk`, `POST /qwen/direct-prosody`, `GET /qwen/status`, updated `/tts` & `/tts/play-local`.
- **Milestone 3 (M3)**: Next.js BFF API Gateway (`app/api/dictation/...`)
  - Update `tts/route.ts` & `play-local/route.ts` with new acoustic params.
  - Create `qwen-director/route.ts` for status, extract_sgk, and direct_prosody.
- **Milestone 4 (M4)**: Multi-Surface Teacher & Student UI Integration
  - Teacher Dictation: RAM badge, SGK extractor modal, Prosody director preview, acoustic controls, Step 3 playback.
  - Teacher Grade & Student Portal: Pedagogical comment TTS (`warm_story`), word correction pronunciation (`emphasis`).

## Phase 2: Dual Track E2E Testing & System Verification
- E2E Test Suite (Tiers 1-4) verifying live HTTP status, SGK extraction, prosody direction, audio synthesis, BFF routes.
- TypeScript compilation check (`npx tsc --noEmit`) and Next.js build (`npm run build`).
- Forensic integrity audit & final sign-off.
