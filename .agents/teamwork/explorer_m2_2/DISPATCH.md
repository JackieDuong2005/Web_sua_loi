## 2026-10-18T20:01:04Z
You are Explorer 2 for Milestone 2: SGK Extractor & Prosody Director Endpoints.

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 2 section).
- Read the survey report: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_1\survey_python.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m2_2`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Inspect and design in `python_service/main.py`:
   - In-memory LRU `_prosody_script_cache`:
     * Hash key based on SHA-256 of text/passage + grade + chunk_mode.
     * Maximum 128 entries. Cache hits return in < 1ms with 0 MB RAM allocation.
   - `POST /qwen/extract-sgk`:
     * Accepts `{ raw_text: str, grade: int = 3 }`.
     * Cleans raw text: strips page headers (`Trang \d+`, `Tuần \d+`), discussion questions (`Câu \d+:`, `Em hãy...`).
     * RAM guard: check `get_available_ram_mb() >= 650.0`. If < 650MB or if Qwen is disabled/fails, fallback to deterministic pedagogical extractor.
     * If free RAM >= 650MB and Qwen enabled: activate Qwen on-demand, run extraction, and in a `finally` block ALWAYS call `unload_qwen_model()`.
     * Returns `{ title, clean_content, difficultWords, summary, source, ram_unloaded: True }`.
   - `POST /qwen/direct-prosody`:
     * Accepts `{ passage: str, difficult_words: List[str] = [], grade: int = 3, chunk_mode: str = "phrase" }`.
     * Preserves 100% OF ORIGINAL TEXTBOOK WORDS AND PUNCTUATION verbatim.
     * Segments passage into pedagogical clauses.
     * Matches difficult words against clause text.
     * If clause contains difficult word: assign `style="emphasis"`, `style_label="Nhấn mạnh từ khó"`, and add +2.5s to `pause_sec`.
     * If clause ends in `?`: assign `style="question"`. If descriptive/story: assign `style="warm_story"`. Default: `standard`.
     * Assign acoustic parameters from `PROSODY_STYLE_PRESETS`: `noise_scale`, `noise_w`, `rate`.
     * Caches result in `_prosody_script_cache`.
     * In a `finally` block ALWAYS call `unload_qwen_model()`.
     * Returns `{ clauses, total_words, estimated_duration_sec, cache_hit, ram_unloaded: True }`.
3. Recommend exact code implementation strategy for Worker. Do NOT edit source files yourself.
4. Write report to `analysis.md` and `handoff.md`.
5. Send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
