## 2026-10-18T20:57:46Z
You are Explorer 3 for Milestone 4: Multi-Surface Teacher & Student UI Integration (Lifecycle, Types & Testing Verification).

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 4 section).
- Read the survey report: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2\survey_frontend.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m4_3`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Investigate:
   - Audio Lifecycle Management: Ensure `HTMLAudioElement` instances across all 4 surfaces properly stop prior playback (`audio.pause()`, `audioRef.current = null`) to avoid overlapping speech when users rapidly click buttons.
   - Offline & Fallback State Handling: If the Python core is offline or returns error, ensure clear, friendly Toast or inline alerts are shown without throwing unhandled exceptions.
   - TypeScript Interface Parity: Verify `ProsodyClause`, `QwenStatusState`, and audio options interfaces integrate cleanly with existing types.
   - Verification Test Strategy: Design verification checks (`npx tsc --noEmit`, `npm run build`, and automated/manual tests) to prove all 4 surfaces compile with 0 errors and all audio endpoints and buttons function correctly.
3. Provide recommendations and test plan for Worker M4 and Reviewers. Do NOT edit source files yourself.
4. Write report to `analysis.md` and `handoff.md`.
5. Send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
