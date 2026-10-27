## 2026-10-18T21:21:52Z
You are the Forensic Auditor for Milestone 4: Multi-Surface Teacher & Student UI Integration.

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md`.
- Read Worker M4's handoff: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m4\handoff.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\auditor_m4`

Task:
Conduct a rigorous forensic integrity audit on all 5 modified files in Milestone 4:
- `app/layout.tsx`
- `app/teacher/dictation/page.tsx`
- `app/teacher/grade/page.tsx`
- `app/student/page.tsx`
- `components/student/student-grade-detail-modal.tsx`

1. Initialize BRIEFING.md and progress.md in your working directory.
2. Check for Integrity Violations:
   - Check if `<Toaster />` in `app/layout.tsx` is genuinely mounted or dummy/commented out.
   - In `app/teacher/dictation/page.tsx`:
     * Is the Header Live Status Badge genuinely polling `GET /api/dictation/qwen-director` and reflecting real RAM/lifecycle states, or returning canned fake data?
     * Does the SGK Extractor genuinely call `action: "extract_sgk"`?
     * Does the Prosody Director genuinely call `action: "direct_prosody"` and pass clause parameters to `speakClause`?
     * Are acoustic parameters (`style`, `rate`, `noise_scale`, `noise_w`, `read_punctuation`) genuinely passed to `/api/dictation/tts` or `/api/dictation/play-local`?
   - In `app/teacher/grade/page.tsx`:
     * Are the comment audio and suggestion pronunciation buttons genuinely constructed with `/api/dictation/tts` with `voice=vi_VN-vais1000-medium` and respective styles (`warm_story` and `emphasis`)?
   - In `app/student/page.tsx` and `components/student/student-grade-detail-modal.tsx`:
     * Is legacy cloud voice `vi-VN-HoaiMyNeural` genuinely eliminated?
     * Do they genuinely call `/api/dictation/tts` with `voice=vi_VN-vais1000-medium`?
   - Check for any test mocking, dummy bypasses, hardcoded success responses, or integrity violations across all 5 files.
3. Render audit verdict: CLEAN or INTEGRITY VIOLATION.
   (Remember: Integrity violation is a binary veto with zero tolerance).
4. Document forensic evidence in `handoff.md` and send completion message to parent with your verdict.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
