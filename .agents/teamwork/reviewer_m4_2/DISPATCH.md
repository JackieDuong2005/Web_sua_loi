## 2026-10-18T21:21:50Z
You are Reviewer 2 for Milestone 4: Multi-Surface Teacher & Student UI Integration (Grading Studio & Student Portal).

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md`.
- Read Worker M4's handoff: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m4\handoff.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\reviewer_m4_2`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Review the 3 frontend files:
   - `app/teacher/grade/page.tsx`:
     * Verify `Volume2` import and `audioRef` with `stopActiveAudio(ref)`.
     * Verify "🔊 Nghe cô giáo đọc nhận xét" button in `ResultPopup` playing `/api/dictation/tts?text=${encodeURIComponent(teacherComment)}&voice=vi_VN-vais1000-medium&style=warm_story`.
     * Verify `Volume2` word pronunciation buttons next to `c.suggestion` in both Stacked mode and Side-by-side mode playing `/api/dictation/tts?text=${encodeURIComponent(c.suggestion)}&voice=vi_VN-vais1000-medium&style=emphasis`.
     * Verify unmount and popup dismiss cleanup.
   - `app/student/page.tsx`:
     * Verify "🔊 Nghe cô nhận xét" audio button (`warm_story`) in Hero Banner pedagogical comment section.
     * Verify `wordsToPractice` audio player (`playAudio`): uses Piper VITS `voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%` (no legacy cloud voices).
     * Verify `stopActiveAudio(ref)` and unmount cleanup `useEffect`.
   - `components/student/student-grade-detail-modal.tsx`:
     * Verify "🔊 Nghe cô nhận xét" audio button (`warm_story`) in TT27 comment block.
     * Verify `playAudio` helper: uses Piper VITS `voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%` (powers BBox canvas clicks).
     * Verify `useEffect` cleanup hook includes `open` in dependency array with immediate audio cessation when modal dismisses.
3. Run verification commands:
   - Run `npx tsc --noEmit` and confirm exit code 0.
4. Render verdict: APPROVE or REQUEST_CHANGES.
5. Document findings in `handoff.md` and send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
