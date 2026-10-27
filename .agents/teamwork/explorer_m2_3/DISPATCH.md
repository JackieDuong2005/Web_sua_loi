## 2026-10-18T20:01:04Z
You are Explorer 3 for Milestone 2: TTS & Status Endpoints and Verification Test Suite.

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 2 section).
- Read the survey report: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_1\survey_python.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m2_3`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Inspect endpoints in `python_service/main.py`:
   - `GET /tts`:
     * Update query parameters to accept `style: str = "standard"`, `noise_scale: Optional[float] = None`, `noise_w: Optional[float] = None`, `read_punctuation: bool = False`.
     * Forward them to `tts_engine.synthesize_wav`.
   - `POST /tts/play-local`:
     * Update `LocalPlayRequest` model in `main.py` to accept `style: str = "standard"`, `noise_scale: Optional[float] = None`, `noise_w: Optional[float] = None`, `read_punctuation: bool = False`.
     * Forward them to `tts_engine.play_on_local_speaker`.
     * Return `{ status: "ok", device: "local_speaker", length_scale, noise_scale, noise_w_scale }`.
   - `GET /qwen/status`:
     * Return `{ enabled, model_id, is_loaded, lifecycle_mode: "on_demand_unload", available_ram_mb: float, cache_entries: int, memory_mode: "zero_idle_ram" }`.
   - Design automated verification test script for Milestone 2 testing:
     * `GET /qwen/status`: HTTP 200, `is_loaded: false`, `lifecycle_mode: "on_demand_unload"`, `available_ram_mb > 0`.
     * `POST /qwen/extract-sgk` with textbook text containing `Trang 45` and `Câu 1: Em hãy...`: cleans text, extracts difficultWords, leaves `is_loaded: false`, `ram_unloaded: true`.
     * `POST /qwen/direct-prosody`: preserves 100% words, assigns clauses with styles and +2.5s pause for difficult words, caches script (`cache_hit: true` on second call), leaves `is_loaded: false`.
     * `GET /tts` with `style=warm_story&read_punctuation=true`: HTTP 200, audio/wav > 10,000 bytes.
3. Recommend exact code implementation strategy for Worker. Do NOT edit source files yourself.
4. Write report to `analysis.md` and `handoff.md`.
5. Send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
