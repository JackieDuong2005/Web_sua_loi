## 2026-10-18T21:07:30Z
You are the Worker for Milestone 4: Multi-Surface Teacher & Student UI Integration.

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 4 section).
- Read the 3 Explorers' analysis files for exact implementation blueprints and code diffs:
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m4_1\analysis.md` (Dictation Cockpit blueprints & diffs)
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m4_2\analysis.md` (Grading Studio & Student Portal blueprints & diffs)
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m4_3\analysis.md` (Audio lifecycle, Toaster mounting, TypeScript typing, and verification strategy)

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m4`

File Ownership:
You EXCLUSIVELY own:
- `app/layout.tsx`
- `app/teacher/dictation/page.tsx`
- `app/teacher/grade/page.tsx`
- `app/student/page.tsx`
- `components/student/student-grade-detail-modal.tsx`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. In `app/layout.tsx`:
   - Import `Toaster` from `@/components/ui/sonner` or `@/components/ui/toaster`.
   - Mount `<Toaster />` inside the root layout body to ensure all toasts/alerts render globally.
3. In `app/teacher/dictation/page.tsx`:
   - Define TypeScript interfaces: `ProsodyClause`, `QwenStatusState`, `SpeakClauseOptions`.
   - Implement the 5-step `stopActiveAudio(ref)` cleanup pattern to eliminate overlapping audio, memory leaks, and zombie callbacks.
   - Add Header Live Status Badge (lines 982-986): render Piper readiness and Qwen2.5 RAM state polling `GET /api/dictation/qwen-director` every 12s with lifecycle transitions (`Ngủ 0MB RAM`, `Đang bật cờ xử lý...`, `Đã lưu kịch bản & Xả RAM (0MB)`).
   - Add Dialog "📄 Trích xuất SGK / PDF (Qwen2.5)": grade selector, `.txt` file upload, textarea, calling `POST /api/dictation/qwen-director` (`action: "extract_sgk"`), populating `title`, `passageText`, `difficultWords`.
   - Add "🎬 Qwen2.5 Đạo diễn Nhịp đọc" button and Interactive Prosody Script Preview: clause badges for `warm_story`, `emphasis`, `standard`, `question`, speaking rates, pause countdowns, listen preview button, and deterministic pedagogical fallback if service is offline.
   - Add Piper VITS Acoustic Controls in Right Column: `acousticStyle` dropdown (`warm_story`, `standard`, `emphasis`, `question`) and Switch toggle "Đọc tên dấu câu" (`read_punctuation`).
   - Upgrade `speakClause` and Step 3 (Nghe - Viết chính thức) dynamic dictation loop to pass clause-directed parameters (`style`, `rate`, `noise_scale`, `noise_w`, `pause_sec`, `read_punctuation`) into `speakClause`.
   - Add unmount cleanup `useEffect`.
4. In `app/teacher/grade/page.tsx`:
   - Import `Volume2` from `"lucide-react"`.
   - Implement `audioRef` and `stopActiveAudio(ref)`.
   - In `ResultPopup` teacher comment section (around line 740-775), add "🔊 Nghe cô giáo đọc nhận xét" button playing `/api/dictation/tts?text=${encodeURIComponent(teacherComment)}&voice=vi_VN-vais1000-medium&style=warm_story`.
   - In Error and suggestion cards (both Stacked mode around line 1080-1110 and Side-by-side mode around line 1190-1220), add `Volume2` word pronunciation button next to `c.suggestion` playing `/api/dictation/tts?text=${encodeURIComponent(c.suggestion)}&voice=vi_VN-vais1000-medium&style=emphasis`.
   - Add unmount cleanup `useEffect`.
5. In `app/student/page.tsx`:
   - In Hero Banner pedagogical comment section (around line 218-220), add "🔊 Nghe cô nhận xét" audio button (`warm_story`).
   - Update `wordsToPractice` audio player (`playAudio`, line 65-75): replace legacy cloud voice `vi-VN-HoaiMyNeural` with `voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`.
   - Implement `stopActiveAudio(ref)` and add unmount cleanup `useEffect`.
6. In `components/student/student-grade-detail-modal.tsx`:
   - In TT27 pedagogical comment block (around line 456-468), add "🔊 Nghe cô nhận xét" audio button (`warm_story`).
   - Update `playAudio` helper (line 235-245): replace `vi-VN-HoaiMyNeural` with `voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`. (This immediately powers clear pronunciation when students or parents tap red bounding boxes on handwritten exam sheets in `student-bbox-canvas.tsx`).
   - Update `useEffect` cleanup hook to include `open` in dependency array (`[open, grade]`) and call `stopActiveAudio(audioRef)` so modal dismiss immediately silences audio.
7. Verification:
   - Run `npx tsc --noEmit` and confirm exit code 0 (zero TypeScript errors).
   - Run `npm run build` and confirm exit code 0 (Next.js production build succeeds for all 37 routes).
   - Run `python tests/test_bff_routes.py` to confirm no regressions on API routes.
8. Document all changes and verification outputs in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m4\handoff.md`.
9. Send completion message to parent.
