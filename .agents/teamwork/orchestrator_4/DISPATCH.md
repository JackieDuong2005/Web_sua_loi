# Orchestrator Dispatch — 2026-10-18T18:59:10Z

## Task Overview
Complete the Semantic-Acoustic Decoupled Pipeline (`Qwen2.5-0.5B-Instruct` SLM + `Piper VITS ONNX` Acoustic Engine) for the **ViHand Grade** educational platform, specifically optimized for **Raspberry Pi 4 (4GB RAM)** using Staged On-Demand Activation & Auto-Unload (`ON_DEMAND_UNLOAD`), Prosody Script Caching, VITS Expressive Tuning (`noise_scale`, `noise_w_scale`, spoken Vietnamese punctuation), and multi-surface audio playback across Teacher Dictation, Teacher Grading, and Student Portal views.

## Working Directory
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4`
Project root: `c:\Users\Jackie Duong\Desktop\Web_sua_loi`

## Authoritative User Request
Refer to `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` under section `## 2026-10-18T18:59:10Z`.

## Requirements
### R1. Expressive Piper VITS ONNX Engine & Spoken Punctuation (`python_service/tts_engine.py`)
Upgrade the offline Piper VITS TTS engine to eliminate flat/robotic output without increasing RAM or CPU overhead on Raspberry Pi 4:
- Define acoustic prosody presets (`PROSODY_STYLE_PRESETS`): `warm_story` (`noise_scale=0.78, noise_w_scale=0.90, length_multiplier=1.05`), `standard` (`noise_scale=0.667, noise_w_scale=0.80, length_multiplier=1.00`), `emphasis` (`noise_scale=0.58, noise_w_scale=0.72, length_multiplier=1.20`), and `question` (`noise_scale=0.82, noise_w_scale=0.92, length_multiplier=1.08`).
- Implement `inject_pedagogical_punctuation(text: str, enabled: bool = False)` to convert punctuation marks into spoken Vietnamese dictation cues when `read_punctuation=True` (`,` → `, phẩy,`, `.` → `, chấm.`, `?` → `, chấm hỏi.`, `!` → `, chấm than.`, `:` → `, hai chấm,`).
- Update `synthesize_wav` and `play_on_local_speaker` to accept `style`, `noise_scale`, `noise_w`, and `read_punctuation`, passing `SynthesisConfig(length_scale=..., noise_scale=..., noise_w_scale=...)` to `PiperVoice.synthesize_wav`.

### R2. Qwen2.5-0.5B Staged On-Demand Lifecycle & Pedagogical Director Endpoints (`python_service/main.py` & `start_all.bat`)
Implement strict RAM protection for Raspberry Pi 4 (4GB RAM) so `Qwen2.5-0.5B` consumes `0 MB RAM` when idle and during classroom dictation/grading:
- Default `QWEN_LIFECYCLE_MODE` to `"on_demand_unload"` (including in `start_all.bat`). Do not preload Qwen at server startup.
- Implement `get_available_ram_mb()` (cross-platform Linux `/proc/meminfo` and Windows `GlobalMemoryStatusEx`) and `unload_qwen_model()` (resetting `_qwen_model = None`, `_qwen_tokenizer = None`, calling `gc.collect()`).
- Implement an in-memory LRU `_prosody_script_cache` keyed by content/grade/mode hash so repeated requests return in `< 1ms` without reloading Qwen.
- Add `POST /qwen/extract-sgk`: Accepts raw textbook/PDF text (`raw_text`, `grade`), strips page numbers, headers, and textbook discussion questions, activates Qwen on-demand (if free RAM >= 650 MB, else uses deterministic Vietnamese pedagogical extractor fallback), extracts `{ title, clean_content, difficultWords, summary, source, ram_unloaded }`, and unloads Qwen immediately in a `finally` block.
- Add `POST /qwen/direct-prosody`: Accepts `{ passage, difficult_words, grade, chunk_mode }`, segments the passage while preserving 100% of original textbook words/punctuation, assigns each clause `{ index, text, word_count, style, style_label, rate, noise_scale, noise_w, pause_sec, matched_difficult_words }` (adding +2.5s pause and `emphasis` style for clauses containing difficult words), caches the script, and unloads Qwen immediately in a `finally` block.
- Update `GET /tts`, `POST /tts/play-local`, and `GET /qwen/status` to support the new acoustic parameters and report live lifecycle/RAM/cache metrics.

### R3. Next.js BFF API Gateway (`app/api/dictation/...`)
- Update `app/api/dictation/tts/route.ts` and `app/api/dictation/play-local/route.ts` to forward `style`, `noise_scale`, `noise_w`, and `read_punctuation` to the Python service (`:8000`).
- Create `app/api/dictation/qwen-director/route.ts` supporting `GET` (proxies `/qwen/status`) and `POST` (`action: "extract_sgk"` → `/qwen/extract-sgk`, `action: "direct_prosody"` → `/qwen/direct-prosody`).

### R4. Multi-Surface Teacher & Student UI Integration (`app/teacher/...` & `app/student/...`)
- In `app/teacher/dictation/page.tsx`:
  1. Display a live status badge in the header showing Piper ONNX readiness and Qwen2.5 On-Demand RAM state (`Ngủ 0MB RAM` / `Đang bật cờ xử lý` / `Đã lưu kịch bản & Xả RAM`).
  2. Add a **"📄 Trích xuất SGK / PDF (Qwen2.5)"** dialog allowing teachers to paste raw textbook/PDF text or upload a `.txt` file to automatically clean the text and populate `title`, `passageText`, and `difficultWords`.
  3. Add a **"🎬 Qwen2.5 Đạo diễn Nhịp đọc"** button and interactive Prosody Script preview showing each clause's assigned style badge, speaking rate, pause duration, and difficult word highlights.
  4. Add Piper VITS Acoustic Controls: Prosody Style selector (`warm_story`, `standard`, `emphasis`, `question`) and a **"Đọc tên dấu câu (phẩy, chấm)"** toggle.
  5. Update Step 3 (Nghe - Viết chính thức) playback loop (`speakClause` & pause timer) to use each clause's directed `style`, `rate`, `noise_scale`, `noise_w`, `pause_sec`, and `read_punctuation`.
- In `app/teacher/grade/page.tsx`, `app/student/page.tsx`, and `components/student/student-grade-detail-modal.tsx`:
  - Add a **"🔊 Nghe cô giáo đọc nhận xét"** button on the pedagogical comment section using `voice=vi_VN-vais1000-medium&style=warm_story`.
  - Update word correction pronunciation buttons to use `voice=vi_VN-vais1000-medium&style=emphasis` so students clearly hear accurate pronunciation of misspelled words.

## Acceptance Criteria
- [ ] `GET /qwen/status` returns HTTP 200 with `lifecycle_mode: "on_demand_unload"`, `is_loaded: false` when idle, and valid `available_ram_mb` > 0.
- [ ] `POST /qwen/extract-sgk` with raw textbook text containing page numbers (`Trang 45`) and exercise questions (`Câu 1: Em hãy...`) returns HTTP 200 with clean dictation text, extracted `difficultWords`, and leaves `is_loaded: false` after completion (`ram_unloaded: true`).
- [ ] `POST /qwen/direct-prosody` returns HTTP 200 with a list of `clauses` containing `style`, `rate`, `noise_scale`, `noise_w`, `pause_sec`, preserves 100% of original passage words, caches the script (`cache_hit: true` on second call), and leaves `is_loaded: false` after completion.
- [ ] `GET /tts?text=Gió mùa thu se lạnh, bầu trời xanh trong vắt.&voice=vi_VN-vais1000-medium&style=warm_story&read_punctuation=true` returns HTTP 200 with valid `audio/wav` bytes (> 10,000 bytes).
- [ ] `app/api/dictation/qwen-director/route.ts` exists and responds with HTTP 200 for both `extract_sgk` and `direct_prosody` actions.
- [ ] `npx tsc --noEmit` completes with exit code 0 (zero TypeScript errors).
- [ ] `npm run build` completes with exit code 0 across all Next.js routes.
