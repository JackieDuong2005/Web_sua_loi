# BRIEFING — 2026-10-18T21:20:45Z

## Mission
Milestone 4: Multi-Surface Teacher & Student UI Integration. Implement Piper VITS audio and Qwen2.5 director controls across Teacher Dictation, Teacher Grade, Student Portal, and Student Grade Detail Modal, plus Toaster in Root Layout.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m4
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Milestone 4: Multi-Surface Teacher & Student UI Integration

## 🔒 Key Constraints
- Exclusively own and modify:
  * app/layout.tsx
  * app/teacher/dictation/page.tsx
  * app/teacher/grade/page.tsx
  * app/student/page.tsx
  * components/student/student-grade-detail-modal.tsx
- DO NOT CHEAT. All implementations must be genuine.
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md).
- Strict verification: npx tsc --noEmit, npm run build, python tests/test_bff_routes.py.
- Follow 5-step stopActiveAudio cleanup pattern to prevent overlapping audio, memory leaks, and zombie callbacks.
- Pass-through clause-directed parameters (style, rate, noise_scale, noise_w, pause_sec, read_punctuation).

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T21:20:45Z

## Task Summary
- **What to build**: Full integration of Qwen2.5 Director and Piper VITS TTS across Teacher Dictation Cockpit, Teacher Grading Studio, and Student Portal & Modal, plus Toaster in app/layout.tsx.
- **Success criteria**:
  1. app/layout.tsx mounts Toaster: [COMPLETED]
  2. app/teacher/dictation/page.tsx: QwenStatusState, ProsodyClause, stopActiveAudio(ref), live RAM/Piper badge, SGK extractor dialog, Qwen director button & prosody interactive preview, Piper VITS acoustic controls, clause-directed dynamic dictation playback, unmount cleanup: [COMPLETED]
  3. app/teacher/grade/page.tsx: teacher comment TTS button, suggestion word pronunciation buttons, stopActiveAudio(ref), unmount cleanup: [COMPLETED]
  4. app/student/page.tsx: hero pedagogical comment TTS button, practice words TTS updated to Piper VITS, stopActiveAudio(ref), unmount cleanup: [COMPLETED]
  5. components/student/student-grade-detail-modal.tsx: TT27 comment TTS button, playAudio updated to Piper VITS, modal close stops audio, unmount cleanup: [COMPLETED]
  6. Verification: npx tsc --noEmit (0 errors), npm run build (0 errors, 37/37 routes), test_bff_routes.py (8/8 passed): [VERIFIED]

## Key Decisions Made
- Used unified `stopActiveAudio(ref)` 5-step cleanup pattern (`pause`, nullify callbacks, reset `src = ""`, `load`, nullify ref).
- Implemented deterministic pedagogical fallback in Qwen Prosody Director when offline, ensuring graceful degradation with zero crashes.
- Replaced all legacy cloud `vi-VN-HoaiMyNeural` with offline Piper VITS `voice=vi_VN-vais1000-medium` (`style=emphasis&rate=-10%` for word corrections, `style=warm_story` for teacher comments).

## Artifact Index
- DISPATCH.md — Assignment instructions
- progress.md — Liveness & step-by-step progress
- handoff.md — Final 5-component handoff report

## Change Tracker
- **Files modified**:
  * `app/layout.tsx`: Mounted Toaster inside body.
  * `app/teacher/dictation/page.tsx`: Added interfaces, dual live status badge, SGK dialog, Qwen director button, prosody preview, acoustic controls, dynamic playback loop, stopActiveAudio.
  * `app/teacher/grade/page.tsx`: Added Volume2, teacher comment audio, word suggestion pronunciation in stacked & side-by-side views, stopActiveAudio.
  * `app/student/page.tsx`: Added hero comment audio, upgraded practice words audio to Piper VITS, stopActiveAudio.
  * `components/student/student-grade-detail-modal.tsx`: Added TT27 comment audio, upgraded BBox canvas audio to Piper VITS, modal close audio cessation.
- **Build status**: `npx tsc --noEmit` exit code 0; `npm run build` exit code 0 (37/37 routes static/dynamic).
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (TSC exit 0, Build exit 0, Pytest BFF 8/8 pass, M2 pipeline 4/4 pass).
- **Lint status**: Clean
- **Tests added/modified**: Validated via test_bff_routes.py and test_milestone2_pipeline.py.
