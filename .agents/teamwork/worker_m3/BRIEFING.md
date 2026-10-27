# BRIEFING — 2026-10-18T20:44:00Z

## Mission
Implement Next.js BFF API Gateway endpoints for Milestone 3: TTS (`/api/dictation/tts`), Play-Local (`/api/dictation/play-local`), and Qwen Director (`/api/dictation/qwen-director`), with strict TypeScript typing, error guards, streaming & JSON proxying, and comprehensive automated verification.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m3
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Milestone 3 (Next.js BFF API Gateway for TTS, Play-Local, and Qwen Director Routes)

## 🔒 Key Constraints
- EXCLUSIVELY own:
  * `app/api/dictation/tts/route.ts`
  * `app/api/dictation/play-local/route.ts`
  * `app/api/dictation/qwen-director/route.ts`
  * `tests/test_bff_routes.py` (or node verification script)
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md).
- Rigorous verification: `npx tsc --noEmit` must pass with exit code 0.
- Mandatory integrity: No mock cheating, no hardcoded responses, genuine implementations only.
- Proper error handling: 15s timeout for TTS, 10s for status, 30s for Qwen Director, graceful fallbacks for status when backend is offline.

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T20:44:00Z

## Task Summary
- **What to build**: Next.js route handlers for `/api/dictation/tts`, `/api/dictation/play-local`, and `/api/dictation/qwen-director` (GET status and POST multiplexer for `extract_sgk` and `direct_prosody`).
- **Success criteria**: Zero TypeScript errors (`npx tsc --noEmit`), passing `npm run build`, and passing end-to-end automated test suite (`tests/test_bff_routes.py`).
- **Interface contracts**: `spec_miner_survey_1/api_specs.md` & explorer analysis files.
- **Code layout**: Next.js App Router under `app/api/dictation/`.

## Change Tracker
- **Files modified**:
  * `app/api/dictation/tts/route.ts`: added `export const dynamic = "force-dynamic"`, URLSearchParams forwarding all 7 acoustic params to Python :8000, header propagation (`X-TTS-Engine`, `X-TTS-Style`, `X-Prosody-Style`), 15s AbortController timeout handling (504 on timeout, 503 on service unreachable).
  * `app/api/dictation/play-local/route.ts`: added `export const dynamic = "force-dynamic"`, JSON body parsing with all acoustic params forwarded to `${VIT5_SERVICE_URL}/tts/play-local`, return full response JSON (`status`, `device`, `length_scale`, `noise_scale`, `noise_w_scale`), timeout/network error handling.
  * `app/api/dictation/qwen-director/route.ts`: created route handler with `guardAiRoute(req, 20, "qwen-director")`, `GET` proxying `/qwen/status` with 10s timeout and graceful fallback HTTP 200 `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true, lifecycle_mode: "offline" }`, and `POST` multiplexing `extract_sgk` and `direct_prosody` with 30s timeout guard (`AbortSignal.timeout(30000)`).
  * `tests/test_bff_routes.py`: automated test suite with 23 test cases covering FastAPI microservice contract parity and live Next.js BFF HTTP endpoints (both offline validation and online live integration).
- **Build status**: PASS (`npx tsc --noEmit` exit 0, `npm run build` exit 0).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: 23/23 tests passed (100% pass rate).
- **Lint status**: Zero TypeScript errors.
- **Tests added/modified**: `tests/test_bff_routes.py` (23 test cases).

## Key Decisions Made
- Used `(process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")` across all three BFF routes to prevent Windows IPv6 dual-stack resolution hangs.
- Integrated `guardAiRoute(req, 20, "qwen-director")` to protect the SLM endpoint from client-side rate abuse.
- Ensured `GET /api/dictation/qwen-director` never fails with 500 when Python service is offline, instead returning HTTP 200 with `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true, lifecycle_mode: "offline" }` to prevent UI crash.

## Artifact Index
- `DISPATCH.md` — assignment details
- `BRIEFING.md` — active situational awareness
- `progress.md` — liveness heartbeat and execution log
- `handoff.md` — 5-component self-contained completion handoff report
