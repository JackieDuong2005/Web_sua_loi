# HANDOFF REPORT: FRONTEND MULTI-SURFACE UI SURVEY
## Semantic-Acoustic Decoupled Pipeline (Qwen2.5-0.5B + Piper VITS ONNX)

**Working directory**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2`  
**Author**: `explorer_survey_2`  
**Recipient**: `orchestrator_4` (`0516b259-befc-4fac-baa8-b10ce65a612b`)  
**Artifact**: `survey_frontend.md`

---

### 1. OBSERVATION

1. **`app/teacher/dictation/page.tsx`**:
   - Header badge at line 983–986 currently renders a static indicator:
     ```tsx
     <div className="hidden sm:flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 rounded-full px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
       <span>Piper Offline TTS (Pi 4/5)</span>
     </div>
     ```
     No polling or live Qwen RAM status badge is currently present.
   - Text editing and passage setup toolbar (lines 1093–1138) contains buttons for `AI soạn bài` (`setIsAiGenerateOpen(true)`), `Kho SGK`, `Dán`, and `Xóa`, but lacks the **"📄 Trích xuất SGK / PDF (Qwen2.5)"** button.
   - Passage clause preview currently relies on regex function `splitIntoPedagogicalClauses` (lines 177–232). It has no concept of acoustic prosody styling (`style`), difficult word emphasis, or per-clause pauses.
   - Acoustic controls in the cockpit right column (lines 1248–1438) currently allow selecting voice (`selectedVoiceId`), output destination (`audioOutputDest`), speed rate slider (`speedRate`), repeat count (`repeatCount`), and pause (`pauseSetting`). It lacks a **Prosody Style selector** (`warm_story`, `standard`, `emphasis`, `question`) and **"Đọc tên dấu câu"** toggle (`read_punctuation`).
   - `speakClause` function (lines 535–597) only sends `{ text, voice, rate }` to `/api/dictation/play-local` or `/api/dictation/tts`, omitting `style`, `noise_scale`, `noise_w`, and `read_punctuation`.
   - Step 3 dictation loop (`startStep3Dictation`, lines 683–751) iterates through plain strings in `preparedClauses` with a fixed auto-pause rule (`pauseTime = Math.max(5, Math.round(wCount * 1.6))`), ignoring dynamic prosody parameters directed by Qwen.

2. **`app/teacher/grade/page.tsx`**:
   - Pedagogical comment block (lines 740–800) displays `teacherComment` in a `<Textarea>` with a `3 Gợi ý mẫu` button, but lacks a button to play or preview the comment via TTS.
   - Word corrections list (lines 1076–1114) maps `corrections` to cards showing `c.error → c.suggestion` with type badges, but currently lacks an audio speaker button for teachers to listen to the correct pronunciation of misspelled words.

3. **`app/student/page.tsx`**:
   - Hero banner quote (line 218–220) displays:
     ```tsx
     <p className="text-xs sm:text-sm text-muted-foreground italic line-clamp-1">
       &ldquo;{latestGrade?.pedagogicalComment || latestGrade?.feedback || "Con làm bài rất tốt!"}&rdquo;
     </p>
     ```
     No audio button is attached to this comment.
   - Word practice section `wordsToPractice` (lines 406–444) contains a speaker button calling `playAudio(w.suggestion)` (line 426).
   - In line 71, `playAudio` is currently hardcoded with legacy online Edge-TTS:
     ```typescript
     const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
     ```

4. **`components/student/student-grade-detail-modal.tsx`**:
   - Teacher pedagogical comment card (lines 456–468) displays `grade.pedagogicalComment || grade.feedback` without an audio play button.
   - Misspelled word correction list (lines 513–573) has a `<Volume2>` button calling `playAudio(item.suggestion)` (line 557).
   - In line 238, `playAudio` is also hardcoded with `voice=vi-VN-HoaiMyNeural&rate=-15%`:
     ```typescript
     const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
     ```
   - This `playAudio` is also passed directly to `StudentBoundingBoxCanvas` (`onPlayAudio={playAudio}`, line 329), meaning clicking on any red bounding box on the actual scanned notebook image currently triggers this outdated endpoint.

5. **`app/api/dictation/...`**:
   - `app/api/dictation/tts/route.ts`: Currently forwards `text`, `voice`, and `rate` to `VIT5_SERVICE_URL/tts`.
   - `app/api/dictation/play-local/route.ts`: Currently forwards `text`, `voice`, and `rate` to `VIT5_SERVICE_URL/tts/play-local`.
   - `app/api/dictation/qwen-director/route.ts`: Does not yet exist in `app/api/dictation/`.

---

### 2. LOGIC CHAIN

1. **Step 1 (Dictation Cockpit Header & RAM Badge)**:
   - Observation 1 shows a static badge at line 983.
   - By creating `app/api/dictation/qwen-director/route.ts` with `GET` proxying to `http://127.0.0.1:8000/qwen/status`, the frontend can poll every 10s and capture `is_loaded`, `available_ram_mb`, and `lifecycle_mode`.
   - Connecting UI states (`isQwenProcessing`, `qwenJustUnloaded`) will accurately reflect `Ngủ 0MB RAM`, `Đang bật cờ xử lý`, and `Đã lưu kịch bản & Xả RAM`.

2. **Step 2 (Textbook & PDF Extraction)**:
   - Observation 1 shows toolbar buttons at line 1093.
   - Placing a **"📄 Trích xuất SGK / PDF (Qwen2.5)"** dialog with file input (`FileReader.readAsText`) and raw text textarea allows teachers to submit messy text.
   - Sending `POST /api/dictation/qwen-director` with `{ action: "extract_sgk", raw_text, grade }` triggers backend cleaning and populates `title`, `passageText`, and `difficultWords`.

3. **Step 3 (Prosody Direction & Dynamic Playback)**:
   - Observation 1 shows deterministic splitting and hardcoded playback loops.
   - Adding **"🎬 Qwen2.5 Đạo diễn Nhịp đọc"** calls `POST /api/dictation/qwen-director` with `{ action: "direct_prosody", passage, difficult_words, grade, chunk_mode }`.
   - The interactive preview displays clauses with color-coded badges (`warm_story`, `emphasis`, `standard`, `question`), assigned rate, and calculated pause duration (+2.5s on difficult words).
   - Upgrading `speakClause` to pass `style`, `noise_scale`, `noise_w`, and `read_punctuation` allows `startStep3Dictation` to dynamically adapt acoustic delivery clause-by-clause.

4. **Step 4 (Multi-Surface Teacher & Student Parity)**:
   - Observations 2, 3, and 4 show comment sections missing audio play buttons, while correction words use an outdated, hardcoded voice (`vi-VN-HoaiMyNeural`).
   - Adding a **"🔊 Nghe cô giáo đọc nhận xét"** button on `app/teacher/grade/page.tsx`, `app/student/page.tsx`, and `components/student/student-grade-detail-modal.tsx` targeting `/api/dictation/tts?voice=vi_VN-vais1000-medium&style=warm_story` fulfills R4.
   - Updating `playAudio` in both `app/student/page.tsx` and `components/student/student-grade-detail-modal.tsx` (which propagates to `StudentBoundingBoxCanvas`) plus adding a speaker button on `app/teacher/grade/page.tsx` to use `voice=vi_VN-vais1000-medium&style=emphasis` fulfills R4.

---

### 3. CAVEATS

1. **Local Audio Playback on Server**:
   - `play-local` plays audio on the physical machine running `python_service` (via `aplay` on Linux / `winsound` on Windows). On web clients (remote browser), audio must be streamed via `/api/dictation/tts` (`new Audio()`). The UI already supports this toggle via `audioOutputDest` ("web" vs "rpi_local").
2. **Audio Cache & Latency**:
   - When generating audio for teacher comments or words, caching responses on the BFF with appropriate `Cache-Control` prevents duplicate synthesis calls when teachers click repeatedly.
3. **No Mermaid Diagrams**:
   - All architecture and workflow schemas are rendered in clean ASCII box drawing as mandated by `GEMINI.md`.

---

### 4. CONCLUSION

The frontend architecture across all 4 surfaces is fully surveyed and prepared for implementation:
- **`app/teacher/dictation/page.tsx`**: Integration points identified for Live Status Badge, SGK Extraction Dialog, Prosody Director Preview, Acoustic Controls, and Step 3 Dynamic Loop.
- **`app/teacher/grade/page.tsx`**: Integration points identified for Teacher Comment Audio (`warm_story`) and Correction Pronunciation (`emphasis`).
- **`app/student/page.tsx`**: Integration points identified for Hero Comment Audio (`warm_story`) and Spelling Practice Audio (`emphasis`).
- **`components/student/student-grade-detail-modal.tsx`**: Integration points identified for Pedagogical Comment Audio (`warm_story`) and BBox Canvas Audio (`emphasis`).
- Detailed implementation blueprints, TypeScript types, ASCII flowcharts, and component layouts are documented in `survey_frontend.md`.

---

### 5. VERIFICATION METHOD

1. **Inspect Survey Artifacts**:
   - View `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2\survey_frontend.md`
   - View `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2\handoff.md`
2. **Verify Target Codebases**:
   - `app/teacher/dictation/page.tsx` lines 983–986, 1093–1138, 1248–1438, 535–597, 683–751.
   - `app/teacher/grade/page.tsx` lines 740–800, 1076–1114.
   - `app/student/page.tsx` lines 67–76, 218–220, 422–430.
   - `components/student/student-grade-detail-modal.tsx` lines 234–243, 456–468, 550–562.
3. **Invalidation Conditions**:
   - If `app/api/dictation/qwen-director/route.ts` is named differently or returns schemas other than `{ action: "extract_sgk" | "direct_prosody" }`.
   - If `python_service/tts_engine.py` modifies preset names from `warm_story`, `standard`, `emphasis`, `question`.
