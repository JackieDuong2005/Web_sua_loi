## 2026-10-18T20:57:46Z
You are Explorer 2 for Milestone 4: Multi-Surface Teacher & Student UI Integration (Grading Studio & Student Portal).

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 4 section).
- Read the survey report: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2\survey_frontend.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m4_2`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Deeply inspect the 3 frontend files:
   - `app/teacher/grade/page.tsx`:
     * Inspect lines 740-775 (Teacher comment block). Design adding "🔊 Nghe cô giáo đọc nhận xét" button playing `/api/dictation/tts?text=...&voice=vi_VN-vais1000-medium&style=warm_story`.
     * Inspect lines 1076-1106 (Error and suggestion items). Design adding word pronunciation audio button next to `c.suggestion` playing `/api/dictation/tts?text=...&voice=vi_VN-vais1000-medium&style=emphasis`.
   - `app/student/page.tsx`:
     * Inspect lines 218-220 (Latest pedagogical comment banner). Design adding audio playback button (`warm_story`).
     * Inspect lines 65-75 (Word practice audio). Update hardcoded `vi-VN-HoaiMyNeural` to `voice=vi_VN-vais1000-medium&style=emphasis`.
   - `components/student/student-grade-detail-modal.tsx`:
     * Inspect lines 456-468 (Pedagogical comment block). Design adding "🔊 Nghe cô nhận xét" button (`warm_story`).
     * Inspect lines 235-245 (Word correction audio / BBox canvas audio). Update audio URL to `voice=vi_VN-vais1000-medium&style=emphasis` so clicking BBox on real student paper triggers clear pronunciation.
3. Provide concrete code diffs and implementation recommendations for Worker M4. Do NOT edit source files yourself.
4. Write report to `analysis.md` and `handoff.md`.
5. Send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
