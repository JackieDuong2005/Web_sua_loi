# BRIEFING — 2026-10-18T19:08:00Z

## Mission
Analyze, discover, and document the complete and precise API contracts, schemas, headers, query parameters, payloads, edge cases, and timeout/fallback behaviors for the Semantic-Acoustic Decoupled Pipeline across Next.js BFF (`app/api/dictation/*`) and Python AI Core (`python_service/main.py`).

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Specification Mining, API Contract Definition, Verification Mapping
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: M1 - API Contract Discovery & Specification Mining

## 🔒 Key Constraints
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md).
- Do NOT implement anything — read-only for codebase, write only to our own agent folder (`.agents/teamwork/spec_miner_survey_1/`).
- Prioritize authoritative sources over LLM prior knowledge.
- Capture all inputs, outputs, query parameters, schemas, and edge cases.
- Use ASCII / Markdown tables for illustrations.

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T19:08:00Z

## Task Summary
- **What was analyzed**:
  1. `app/api/dictation/tts/route.ts` & `python_service/main.py` (`GET /tts`)
  2. `app/api/dictation/play-local/route.ts` & `python_service/main.py` (`POST /tts/play-local`)
  3. `app/api/dictation/qwen-director/route.ts` (target BFF endpoint) & `python_service/main.py` (`GET /qwen/status`, `POST /qwen/extract-sgk`, `POST /qwen/direct-prosody`)
  4. Audio playback integrations across `app/teacher/dictation/page.tsx`, `app/teacher/grade/page.tsx`, and `app/student/page.tsx`.
- **Success criteria**:
  - Full schema documentation in `api_specs.md` [COMPLETED]
  - Self-contained handoff report in `handoff.md` [COMPLETED]
  - Formatted tables with Features Discovered and Edge Cases [COMPLETED]
  - Notification sent to parent via `send_message` [IN PROGRESS]

## Key Decisions Made
- All acoustic parameters (`style`, `noise_scale`, `noise_w`, `read_punctuation`) mapped to Piper `SynthesisConfig`.
- Defined strict 650 MB RAM threshold and `unload_qwen_model()` within `finally` blocks for Raspberry Pi 4 protection.
- In-memory LRU `_prosody_script_cache` keyed by hash to guarantee < 1ms response on cache hits.
- Next.js BFF `qwen-director` route configured with 30s timeout and `guardAiRoute(req, 20)`.

## Artifact Index
- `DISPATCH.md` — Record of assignment prompt
- `progress.md` — Heartbeat & execution log
- `api_specs.md` — Comprehensive API contract specifications
- `handoff.md` — Final 5-component handoff report
