# BRIEFING — 2026-10-18T20:20:15Z

## Mission
Implement Milestone 2: Qwen2.5 Staged On-Demand Lifecycle & Pedagogical Director Endpoints in python_service/main.py, start_all.bat, and tests/test_milestone2_pipeline.py with zero idle RAM footprint, deterministic fallback, LRU caching, and rigorous testing.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m2
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Milestone 2 (Qwen2.5 Lifecycle & Pedagogical Endpoints)

## 🔒 Key Constraints
- File Ownership: EXCLUSIVELY own python_service/main.py, start_all.bat, tests/test_milestone2_pipeline.py.
- Integrity Mandate: genuine implementation, no dummy facade, no cheating.
- GEMINI.md: TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (use ASCII or tables). Fit & verify.
- QWEN_LIFECYCLE_MODE default "on_demand_unload". Do not preload Qwen at startup.
- RAM check >= 650.0 MB for Qwen activation; fallback to deterministic pedagogical cleaner.
- Always unload Qwen model and call gc.collect() in finally block (guarantee 0 MB idle RAM).
- Zero-Word-Mutation invariant in prosody director: preserve 100% of original words & punctuation verbatim.
- Forward style, noise_scale, noise_w, read_punctuation in GET /tts and POST /tts/play-local.
- Communicate via send_message to parent 0516b259-befc-4fac-baa8-b10ce65a612b.

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T20:20:15Z

## Task Summary
- **What to build**: On-demand Qwen lifecycle, RAM detection, LRU cache, /qwen/extract-sgk, /qwen/direct-prosody, TTS parameter pass-through in /tts and /tts/play-local, update start_all.bat, comprehensive integration test suite.
- **Success criteria**: All tests pass, 0 MB idle RAM, exact contracts met.
- **Interface contracts**: PROJECT.md & explorer analysis reports.
- **Code layout**: python_service/, tests/, start_all.bat.

## Change Tracker
- **Files modified**:
  * `python_service/main.py`: RAM guard, auto-unloader, LRU prosody cache, SGK cleaner, prosody director, /tts, /tts/play-local, /qwen/status, /qwen/extract-sgk, /qwen/direct-prosody.
  * `start_all.bat`: Added `set QWEN_LIFECYCLE_MODE=on_demand_unload`.
  * `tests/test_milestone2_pipeline.py`: Comprehensive automated verification test suite.
- **Build status**: PASS (7/7 automated integration tests passed)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 7/7 PASSED in `tests/test_milestone2_pipeline.py`; 67/67 PASSED in `tests/test_adversarial_punctuation.py`.
- **Lint status**: 0 errors (`python -m py_compile` passed clean).
- **Tests added/modified**: `tests/test_milestone2_pipeline.py` (TC-01 to TC-07).

## Loaded Skills
- Source: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\skills\long_mode\SKILL.md
  Core methodology: No Mermaid diagrams (ASCII/JPEG), Fit check, rigorous verification.

## Key Decisions Made
- Implemented cross-platform RAM sensing (`GlobalMemoryStatusEx` on Windows, `/proc/meminfo` on Linux).
- Applied 3-pass `gc.collect()` in `unload_qwen_model()` to clear cyclic references and ensure 0 MB idle RAM.
- Ensured Zero-Word-Mutation invariant in `segment_into_pedagogical_clauses` so `orig_words == clause_words` 100%.
- Verified cache hit response latency < 10ms with zero extra RAM allocation.

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Persistent context & identity
- progress.md — Liveness heartbeat & task progress
- handoff.md — Final completion report
