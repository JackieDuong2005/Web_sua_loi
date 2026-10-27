# Task Assignment: Worker M5

You are the Worker / Test Suite Author for Milestone 5: Dual Track E2E System Verification.

## Objectives
1. Author `tests/e2e_pipeline_verification.py` implementing comprehensive 4-tier verification for the Semantic-Acoustic Decoupled Pipeline:
   - Tier 1: Feature Coverage (>=5 test cases per feature: GET /qwen/status, POST /qwen/extract-sgk, POST /qwen/direct-prosody, GET /tts with 4 styles, POST /tts/play-local, spoken punctuation).
   - Tier 2: Boundary & Corner Cases (>=5 test cases per feature: empty text, whitespace, extreme rates, missing fields, low-RAM <650MB simulation fallback).
   - Tier 3: Cross-Feature Combinations (pairwise interactions: SGK extraction -> Prosody direction -> Piper synthesis -> BFF route proxying).
   - Tier 4: Real-World Primary School Textbook Scenarios (Grades 1-5 authentic texts, poetry, dialogues, difficult words pause +2.5s).
2. Execute the E2E verification test suite `python tests/e2e_pipeline_verification.py`.
3. Run `npx tsc --noEmit` and confirm exit code 0.
4. Run `npm run build` and confirm exit code 0.
5. Record results in `handoff.md`.

## 2026-10-18T21:32:45Z
You are Worker M5 for Milestone 5: Dual Track E2E System Verification.

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md`.
- Read DISPATCH: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m5\DISPATCH.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m5`

File Ownership:
You EXCLUSIVELY own:
- `tests/e2e_pipeline_verification.py`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Author `tests/e2e_pipeline_verification.py` implementing a comprehensive 4-Tier test suite:
   - Tier 1: Feature Coverage (>=5 test cases per feature)
     * VITS acoustic styles: `warm_story`, `standard`, `emphasis`, `question` producing valid WAV (>10KB).
     * Pedagogical spoken punctuation: `inject_pedagogical_punctuation` with commas, periods, question marks, exclamation marks, colons.
     * Status endpoint `GET /qwen/status`: verifies `lifecycle_mode == "on_demand_unload"`, `is_loaded == False` when idle, and real RAM sensing.
     * SGK Text Extractor `POST /qwen/extract-sgk`: cleans headers, page numbers, discussion questions; verifies auto-unload `is_loaded == False`.
     * Prosody Director `POST /qwen/direct-prosody`: preserves 100% textbook words, assigns clause styles, adds +2.5s pause & emphasis for difficult words; verifies auto-unload `is_loaded == False`.
     * LRU Prosody Cache: verifies second identical request returns `< 1ms` with `cache_hit: true`.
     * BFF Routes: `/api/dictation/tts`, `/api/dictation/play-local`, `/api/dictation/qwen-director`.
   - Tier 2: Boundary & Corner Cases (>=5 test cases per feature)
     * Empty strings, whitespace-only strings, extreme speaking rates, non-existent styles, non-JSON payloads.
     * Low-RAM simulation (<650MB) triggering deterministic pedagogical extractor fallback with HTTP 200.
     * Punctuation-dense text (`...,,, ??? !!! :::`).
   - Tier 3: Cross-Feature Combinations (Pairwise integration)
     * Full chain: Raw textbook text -> SGK extraction -> Prosody direction -> Piper VITS WAV synthesis using directed style and rates.
     * Cache & difficult words interaction: caching maintains matched difficult words and +2.5s pauses.
   - Tier 4: Real-World Primary School Textbook Scenarios (Grades 1-5)
     * Grade 1: Short phonetic sentence ("Bé Mai đi học, em mang ba lô màu đỏ.").
     * Grade 2: Narrative dialogue ("Thỏ con hỏi: 'Bác voi đi đâu đấy?'.").
     * Grade 3: Complex passage with difficult words ("Mùa thu trên quê hương, không khí se lạnh, bầu trời xanh trong vắt.").
     * Grade 4: Descriptive prose ("Rừng Cúc Phương có những cây cổ thụ hàng ngàn năm tuổi.").
     * Grade 5: Historical text ("Chiến dịch Điện Biên Phủ toàn thắng đã làm chấn động địa cầu.").
3. Run the test suite:
   `python tests/e2e_pipeline_verification.py`
   (Note: Use python directly or ensure FastAPI backend is running / mock transport if testing offline routes).
4. Run workspace build verification:
   - `npx tsc --noEmit` (must exit 0)
   - `npm run build` (must exit 0)
5. Document all execution results, test counts, passing rates, and evidence in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m5\handoff.md`.
6. Send completion message to parent.
