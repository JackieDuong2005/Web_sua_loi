## 2026-10-18T19:02:34Z
You are an Explorer surveying the Frontend Multi-Surface UI for ViHand Grade.
Read the authoritative requirements at:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) and
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\DISPATCH.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2`

Your task:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Inspect the multi-surface UI pages:
   - `app/teacher/dictation/page.tsx`
   - `app/teacher/grade/page.tsx`
   - `app/student/page.tsx`
   - `components/student/student-grade-detail-modal.tsx`
3. Analyze `app/teacher/dictation/page.tsx`:
   - Current state variables, UI layout, and dictation workflow (Step 1, Step 2, Step 3).
   - Where and how to place the live status badge in the header (Piper ONNX readiness & Qwen RAM state: `Ngủ 0MB RAM`, `Đang bật cờ xử lý`, `Đã lưu kịch bản & Xả RAM`).
   - How to implement the "Trích xuất SGK / PDF (Qwen2.5)" dialog (paste text / upload .txt, populate title, passageText, difficultWords).
   - How to implement the "Qwen2.5 Đạo diễn Nhịp đọc" button and interactive Prosody Script preview showing clause styles, speaking rate, pause duration, and difficult word tags.
   - How to add Piper VITS Acoustic Controls (Prosody Style selector: `warm_story`, `standard`, `emphasis`, `question` and "Đọc tên dấu câu" toggle).
   - How to upgrade Step 3 (Nghe - Viết chính thức) playback loop (`speakClause` and pause timer) to use each clause's directed `style`, `rate`, `noise_scale`, `noise_w`, `pause_sec`, and `read_punctuation`.
4. Analyze `app/teacher/grade/page.tsx`, `app/student/page.tsx`, and `components/student/student-grade-detail-modal.tsx`:
   - Where pedagogical teacher comments are displayed and how to add the "🔊 Nghe cô giáo đọc nhận xét" button with `voice=vi_VN-vais1000-medium&style=warm_story`.
   - Where word corrections are rendered and how to update audio pronunciation buttons to use `style=emphasis`.
5. Write your comprehensive findings to `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2\survey_frontend.md` and summarize in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2\handoff.md`.
6. Send a completion message back to parent.
