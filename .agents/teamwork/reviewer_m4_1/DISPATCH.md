## 2026-10-18T21:21:50Z
[Message] timestamp=2026-10-18T21:21:50Z sender=0516b259-befc-4fac-baa8-b10ce65a612b priority=MESSAGE_PRIORITY_HIGH content=You are Reviewer 1 for Milestone 4: Multi-Surface Teacher & Student UI Integration (Dictation Cockpit & Root Layout).

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md`.
- Read Worker M4's handoff: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m4\handoff.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\reviewer_m4_1`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Review `app/layout.tsx` and `app/teacher/dictation/page.tsx`:
   - In `app/layout.tsx`: verify `<Toaster />` is mounted inside `<body>` to support global toast/alert dispatching.
   - In `app/teacher/dictation/page.tsx`:
     * Verify Header Live Status Badge polls `GET /api/dictation/qwen-director` every 12s and reflects both Piper readiness and Qwen2.5 RAM lifecycle states (`Ngủ 0MB RAM`, `Đang bật cờ xử lý...`, `Đã lưu kịch bản & Xả RAM (0MB)`, `Qwen2.5: Chế độ Sư phạm Tất định`).
     * Verify Dialog "Trích xuất SGK": grade selection, `.txt` file upload, textarea, calls `POST /api/dictation/qwen-director` (`action: "extract_sgk"`), populates `title`, `passageText`, `difficultWords`.
     * Verify "🎬 Qwen2.5 Đạo diễn Nhịp đọc" button and Interactive Prosody Script Preview: clause style badges (`warm_story`, `emphasis`, `standard`, `question`), speeds, pause countdowns (+2.5s for difficult words), listen preview buttons, and deterministic pedagogical fallback.
     * Verify Piper VITS Acoustic Controls in Right Column: `acousticStyle` selector and Switch toggle "Đọc tên dấu câu" (`read_punctuation`).
     * Verify `speakClause` and Step 3 dynamic dictation loop passes clause-directed parameters (`style`, `rate`, `noise_scale`, `noise_w`, `pause_sec`, `read_punctuation`) into `speakClause`.
     * Verify 5-step `stopActiveAudio(ref)` pattern and unmount cleanup `useEffect`.
3. Run verification commands:
   - Run `npx tsc --noEmit` and confirm exit code 0.
4. Render verdict: APPROVE or REQUEST_CHANGES.
5. Document findings in `handoff.md` and send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
