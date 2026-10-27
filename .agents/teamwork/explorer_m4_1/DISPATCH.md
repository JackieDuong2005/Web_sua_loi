## 2026-10-18T20:57:46Z
You are Explorer 1 for Milestone 4: Multi-Surface Teacher & Student UI Integration (Dictation Cockpit).

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 4 section).
- Read the survey report: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2\survey_frontend.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m4_1`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Deeply inspect `app/teacher/dictation/page.tsx`:
   - Header Live Status Badge (lines 972-1003): Design the badge rendering both Piper readiness and Qwen2.5 RAM state ("Ngủ 0MB RAM" / "Đang bật cờ xử lý..." / "Đã lưu kịch bản & Xả RAM"). Check polling via `GET /api/dictation/qwen-director` and transition states.
   - Dialog "📄 Trích xuất SGK / PDF (Qwen2.5)": Design dialog opening, grade selection, text paste / `.txt` file upload, calling `POST /api/dictation/qwen-director` (`action: "extract_sgk"`), and populating `title`, `passageText`, `difficultWords`.
   - "🎬 Qwen2.5 Đạo diễn Nhịp đọc" Button & Interactive Prosody Script Preview: Design the button triggering `action: "direct_prosody"`, storing `prosodyClauses`, rendering clause badges (`warm_story`, `emphasis`, `standard`, `question`), speaking rates, pause countdowns, difficult words highlight, and preview play button.
   - Piper VITS Acoustic Controls: Design Prosody Style selector dropdown (`warm_story`, `standard`, `emphasis`, `question`) and "Đọc tên dấu câu" switch toggle (`read_punctuation`).
   - Step 3 (Nghe - Viết chính thức) dynamic dictation loop: Inspect `speakClause` and `startStep3Dictation` (lines 535-597, 683-751). Design passing clause-directed acoustic parameters (`style`, `rate`, `noise_scale`, `noise_w`, `pause_sec`, `read_punctuation`) into `speakClause`.
3. Provide concrete code diffs and implementation recommendations for Worker M4. Do NOT edit source files yourself.
4. Write report to `analysis.md` and `handoff.md`.
5. Send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
