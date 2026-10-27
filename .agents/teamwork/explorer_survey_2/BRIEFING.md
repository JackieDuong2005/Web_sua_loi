# BRIEFING — 2026-10-18T19:07:00Z

## Mission
Survey the Frontend Multi-Surface UI for ViHand Grade (Teacher Dictation, Teacher Grade, Student Portal) to support the Semantic-Acoustic Decoupled Pipeline (Qwen2.5-0.5B + Piper VITS ONNX).

## 🔒 My Identity
- Archetype: explorer
- Roles: frontend UI survey, architecture analysis, synthesized report
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Survey & UI Analysis Complete

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md)
- Write output to .agents/teamwork/explorer_survey_2/

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `app/teacher/dictation/page.tsx` (2496 lines)
  - `app/teacher/grade/page.tsx` (2914 lines)
  - `app/student/page.tsx` (516 lines)
  - `components/student/student-grade-detail-modal.tsx` (673 lines)
  - `components/student/student-bbox-canvas.tsx` (449 lines)
  - `app/api/dictation/tts/route.ts` & `app/api/dictation/play-local/route.ts`
  - `python_service/tts_engine.py` & `python_service/main.py`
- **Key findings**:
  - Exact file locations, state variables, component trees, and UI placements cataloged.
  - Dictation header badge can integrate Qwen RAM status polling (`GET /api/dictation/qwen-director`) alongside Piper ONNX readiness.
  - "Trích xuất SGK / PDF" dialog designed with drag-and-drop / paste text to populate `title`, `passageText`, `difficultWords`.
  - "Qwen2.5 Đạo diễn Nhịp đọc" button and interactive Prosody Script preview designed with per-clause style badges (`warm_story`, `emphasis`, `standard`, `question`), rate, and pause duration.
  - Piper VITS acoustic controls (`PROSODY_STYLE_PRESETS`, `read_punctuation` toggle) specified for both cockpit and chalkboard modes.
  - Step 3 dictation playback loop mapped to dynamically consume per-clause `style`, `rate`, `noise_scale`, `noise_w`, `pause_sec`.
  - Teacher comment playback buttons mapped with `voice=vi_VN-vais1000-medium&style=warm_story` on grading page, student portal hero, and student detail modal.
  - Misspelled word pronunciation buttons mapped with `voice=vi_VN-vais1000-medium&style=emphasis` on grading error cards, student practice bank, and student bbox canvas.
- **Unexplored areas**: None for frontend survey.

## Key Decisions Made
- All findings and integration blueprints synthesized into `survey_frontend.md` and summarized in `handoff.md`.

## Artifact Index
- survey_frontend.md — Comprehensive findings
- handoff.md — 5-component handoff report
- progress.md — Liveness heartbeat
- BRIEFING.md — Situational awareness
- DISPATCH.md — Received task
