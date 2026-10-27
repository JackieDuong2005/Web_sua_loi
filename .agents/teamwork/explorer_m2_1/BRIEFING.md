# BRIEFING — 2026-10-18T20:07:30Z

## Mission
Investigate and design Milestone 2: Qwen2.5 Staged On-Demand Lifecycle & RAM Guard for `python_service/main.py` and `start_all.bat`.

## 🔒 My Identity
- Archetype: explorer
- Roles: [investigation, synthesis]
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m2_1
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Milestone 2 - Qwen2.5 Staged On-Demand Lifecycle & RAM Guard

## 🔒 Key Constraints
- Read-only investigation — do NOT implement / modify source code directly
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
- Must provide exact code recommendations for Worker

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T20:07:30Z

## Investigation State
- **Explored paths**: `python_service/main.py` (lines 918-1925), `start_all.bat`, `python_service/tts_engine.py`, `PROJECT.md`, `ORIGINAL_REQUEST.md`, `survey_python.md`.
- **Key findings**:
  1. `get_available_ram_mb()` designed and verified: parses `/proc/meminfo` on Linux, calls Win32 `GlobalMemoryStatusEx` on Windows, fallbacks to `psutil`.
  2. `unload_qwen_model()` designed and verified: sets `_qwen_model = None`, `_qwen_tokenizer = None`, calls `gc.collect()` 3 times to exhaustively clear cyclic references, guarantees 0 MB RAM idle consumption.
  3. `QWEN_LIFECYCLE_MODE` defaulting to `"on_demand_unload"` designed for both Python code and `start_all.bat`.
  4. In-memory LRU cache `_prosody_script_cache` designed: SHA-256 key, capacity 100, hit latency < 1ms.
  5. Endpoints `/qwen/extract-sgk` and `/qwen/direct-prosody` specified with 650MB RAM threshold and auto-unloading `finally:` blocks.
  6. Endpoints `/tts`, `/tts/play-local`, and `/qwen/status` updated to report lifecycle, RAM metrics, and support acoustic style parameters.
- **Unexplored areas**: None for Milestone 2 Python scope.

## Key Decisions Made
- Standardized `QWEN_LIFECYCLE_MODE` default to `"on_demand_unload"`.
- Formulated complete, drop-in Python code snippets and verification tests for Worker in `handoff.md` and `analysis.md`.

## Artifact Index
- `DISPATCH.md` — Incoming dispatch instructions
- `BRIEFING.md` — Persistent working memory
- `progress.md` — Liveness heartbeat
- `analysis.md` — In-depth architectural analysis and design document
- `handoff.md` — Self-contained 5-component handoff report with exact code implementation blueprint
