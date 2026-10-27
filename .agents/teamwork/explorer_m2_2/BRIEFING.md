# BRIEFING — 2026-10-18T20:07:30Z

## Mission
Investigate and design SGK Extractor & Prosody Director Endpoints in `python_service/main.py` for Milestone 2.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, architectural & technical design, synthesis, handoff preparation
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m2_2
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Milestone 2: SGK Extractor & Prosody Director Endpoints

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source files directly.
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
- LRU `_prosody_script_cache`: SHA-256 hash key, max 128 entries, <1ms return, 0 MB allocation.
- `POST /qwen/extract-sgk`: RAM guard >= 650MB, fallback to deterministic pedagogical extractor, unload_qwen_model() in finally block, output schema `{ title, clean_content, difficultWords, summary, source, ram_unloaded: True }`.
- `POST /qwen/direct-prosody`: 100% original textbook verbatim preservation, clause segmentation, difficult word matching, style assignment (+2.5s pause for difficult words, question, warm_story, standard), PROSODY_STYLE_PRESETS acoustic params, caching, unload_qwen_model() in finally block.
- Produce comprehensive analysis.md and handoff.md for Worker.

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T20:07:30Z

## Investigation State
- **Explored paths**:
  * `python_service/main.py` (Qwen lazy load, status, generate, tts endpoints)
  * `python_service/tts_engine.py` (PROSODY_STYLE_PRESETS, synthesize_wav, play_on_local_speaker)
  * `start_all.bat` (line 79 startup flags)
  * `test_ram.py`, `test_cache.py`, `test_cleaning.py`, `test_difficult.py`, `test_segmentation.py`, `test_director.py`, `test_integrated_m2.py`
- **Key findings**:
  * Cross-platform RAM sensing via ctypes `GlobalMemoryStatusEx` on Windows and `/proc/meminfo` on Linux works without dependencies (7589 MB free).
  * In-memory LRU cache with SHA-256 key yields 0.0045 ms hit latency with 128 items cap.
  * Punctuation-based pedagogical segmentation with delimiter re-attachment strictly preserves 100% original textbook words (`Zero-Word-Mutation Invariant`).
  * Difficult word clauses receive `emphasis` style and +2.5s extra pause duration.
  * Auto-unload in `finally` guarantees 0 MB RAM idle footprint on Raspberry Pi 4.
- **Unexplored areas**: None for Milestone 2 scope.

## Key Decisions Made
- Use `collections.OrderedDict` for LRU cache with max 128 items and SHA-256 hash key.
- Provide full fallback to deterministic pedagogical extractor when available RAM < 650MB.
- Document exact code changes and lines in `analysis.md` and `handoff.md` for Worker.

## Artifact Index
- DISPATCH.md — incoming dispatch instructions
- BRIEFING.md — persistent situational awareness
- progress.md — liveness heartbeat and activity tracking
- test_ram.py — verification script for Win32/Linux RAM sensing
- test_cache.py — verification script for prosody LRU cache
- test_cleaning.py — verification script for textbook text cleaning
- test_difficult.py — verification script for deterministic difficult words
- test_segmentation.py — verification script for Zero-Word-Mutation Invariant
- test_director.py — verification script for prosody clause directing
- test_integrated_m2.py — full integrated test script for Milestone 2
- analysis.md — detailed technical investigation and design
- handoff.md — 5-component handoff report for Worker
