## 2026-10-18T20:08:47Z
You are the Worker for Milestone 2: Qwen2.5 Staged On-Demand Lifecycle & Pedagogical Director Endpoints.

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 2 section).
- Read the 3 Explorers' analysis files for exact implementation blueprints:
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m2_1\analysis.md` (RAM detection, unloader, lifecycle)
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m2_2\analysis.md` (SGK extractor, prosody director, LRU cache)
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m2_3\analysis.md` (TTS/Status endpoints, test suite)

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m2`

File Ownership:
You EXCLUSIVELY own:
- `python_service/main.py`
- `start_all.bat`
- `tests/test_milestone2_pipeline.py`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. In `python_service/main.py`:
   - Set default `QWEN_LIFECYCLE_MODE = os.getenv("QWEN_LIFECYCLE_MODE", "on_demand_unload").strip().lower()`. Do not preload Qwen at startup.
   - Implement `get_available_ram_mb() -> float`:
     * On Linux/Raspberry Pi: read `/proc/meminfo` -> `MemAvailable:`.
     * On Windows: `ctypes.windll.kernel32.GlobalMemoryStatusEx` -> `ullAvailPhys / (1024*1024)`.
     * Fallback to `psutil.virtual_memory().available / (1024*1024)`.
   - Implement `unload_qwen_model() -> None`:
     * Reset global `_qwen_model = None`, `_qwen_tokenizer = None`.
     * Clear cuda cache if available (`torch.cuda.empty_cache()`).
     * Call `gc.collect()` to guarantee 0 MB RAM idle consumption.
   - Implement `_prosody_script_cache`: in-memory LRU dict with max 128 entries keyed by SHA-256 hash.
   - Implement deterministic SGK cleaner & fallback:
     * Strip page headers/numbers (`Trang \d+`, `Tuần \d+`).
     * Strip discussion questions (`Câu \d+:`, `Em hãy...`, `Ghi nhớ:`).
     * Extract difficult words list.
   - Implement endpoint `POST /qwen/extract-sgk`:
     * Request: `{ raw_text: str, grade: int = 3 }`.
     * Check `get_available_ram_mb() >= 650.0`. If < 650MB or Qwen disabled/fails, use deterministic pedagogical fallback.
     * If free RAM >= 650MB and Qwen enabled, activate Qwen on-demand.
     * In a `finally` block ALWAYS call `unload_qwen_model()`.
     * Return `{ title, clean_content, difficultWords, summary, source, ram_unloaded: True }`.
   - Implement endpoint `POST /qwen/direct-prosody`:
     * Request: `{ passage: str, difficult_words: List[str] = [], grade: int = 3, chunk_mode: str = "phrase" }`.
     * Check `_prosody_script_cache` first. On hit, return immediately with `cache_hit: True`.
     * Preserve 100% OF ORIGINAL TEXTBOOK WORDS AND PUNCTUATION VERBATIM (Zero-Word-Mutation invariant).
     * Segment passage into pedagogical clauses.
     * For each clause: match against `difficult_words`. If matched: assign `style="emphasis"`, `style_label="Nhấn mạnh từ khó"`, `rate="-20%"`, and add **+2.5s** to `pause_sec`.
     * For other clauses: question marks `?` get `style="question"`; period/exclamation get `style="warm_story"`; mid-clause punctuation get `style="standard"`.
     * In a `finally` block ALWAYS call `unload_qwen_model()`.
     * Store in cache and return `{ clauses, total_words, estimated_duration_sec, cache_hit: False, ram_unloaded: True }`.
   - Update `GET /tts`: accept `style`, `noise_scale`, `noise_w`, `read_punctuation`, and forward to `tts_engine.synthesize_wav`.
   - Update `POST /tts/play-local`: accept `style`, `noise_scale`, `noise_w`, `read_punctuation`, forward to `tts_engine.play_on_local_speaker`, and return `{ status: "ok", device: "local_speaker", length_scale, noise_scale, noise_w_scale }`.
   - Update `GET /qwen/status`: return `{ enabled, model_id, is_loaded, lifecycle_mode: "on_demand_unload", available_ram_mb, cache_entries, memory_mode: "zero_idle_ram" }`.
3. In `start_all.bat`:
   - Update line 79 to include `set QWEN_LIFECYCLE_MODE=on_demand_unload`.
4. Deploy and run `tests/test_milestone2_pipeline.py`:
   - Verify all test suites pass with exit code 0.
5. Document all changes and test outputs in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m2\handoff.md`.
6. Send completion message to parent.
