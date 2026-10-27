## 2026-10-18T20:36:24Z
You are the Worker for Milestone 3: Next.js BFF API Gateway (TTS, Play-Local, and Qwen Director Routes).

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 3 section).
- Read the API specification: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\api_specs.md`.
- Read the 3 Explorers' analysis files for exact implementation blueprints:
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_1\analysis.md` (TTS & play-local routes)
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_2\analysis.md` (qwen-director route)
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_3\analysis.md` (TypeScript typing, error guards, testing plan)

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m3`

File Ownership:
You EXCLUSIVELY own:
- `app/api/dictation/tts/route.ts`
- `app/api/dictation/play-local/route.ts`
- `app/api/dictation/qwen-director/route.ts` (create new directory and file)
- `tests/test_bff_routes.py` (or node verification script)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. In `app/api/dictation/tts/route.ts`:
   - Add `export const dynamic = "force-dynamic"`.
   - Parse query parameters: `text`, `voice` (default `vi_VN-vais1000-medium`), `rate` (default `-15%`), `style` (default `standard`), `noise_scale`, `noise_w`, `read_punctuation`.
   - Forward all parameters via `URLSearchParams` to `${VIT5_SERVICE_URL}/tts`.
   - Propagate headers: `Content-Type`, `Cache-Control`, `X-TTS-Engine: "Piper-VITS-ONNX-Offline-RPi"`, and `X-TTS-Style: style`.
   - Handle 15s timeout with `AbortController` (504 on AbortError, 503 on service unreachable).
3. In `app/api/dictation/play-local/route.ts`:
   - Add `export const dynamic = "force-dynamic"`.
   - Parse JSON body: `text`, `voice`, `rate`, `style`, `noise_scale`, `noise_w`, `read_punctuation`.
   - Validate `text`. Forward full payload to `${VIT5_SERVICE_URL}/tts/play-local`.
   - Return full response JSON with `status`, `device`, `length_scale`, `noise_scale`, `noise_w_scale`.
   - Handle timeout and network errors.
4. In `app/api/dictation/qwen-director/route.ts` (create `app/api/dictation/qwen-director/` if not exists):
   - Add `export const dynamic = "force-dynamic"`.
   - Integrate rate limiting via `guardAiRoute(req, 20, "qwen-director")`.
   - `GET`: Proxy `${VIT5_SERVICE_URL}/qwen/status` with 10s timeout (`AbortSignal.timeout(10000)`). If Python service is offline, return graceful fallback HTTP 200 `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true, lifecycle_mode: "offline" }`.
   - `POST`: Parse JSON body, check `body.action`:
     - If `body.action === "extract_sgk"`: validate `body.raw_text`. Forward `{ raw_text: body.raw_text.trim(), grade: Number(body.grade) || 3 }` to `POST ${VIT5_SERVICE_URL}/qwen/extract-sgk` with 30s timeout guard (`AbortSignal.timeout(30000)`). Return `{ success: true, data: result, ...result }`.
     - If `body.action === "direct_prosody"`: validate `body.passage`. Forward `{ passage: body.passage.trim(), difficult_words: body.difficult_words || [], grade: Number(body.grade) || 3, chunk_mode: body.chunk_mode || "phrase" }` to `POST ${VIT5_SERVICE_URL}/qwen/direct-prosody` with 30s timeout guard (`AbortSignal.timeout(30000)`). Return `{ success: true, data: result, ...result }`.
     - Invalid action: Return HTTP 400 Bad Request with descriptive message.
5. Verification:
   - Run `npx tsc --noEmit` and confirm exit code 0 (zero TypeScript errors).
   - Write and execute automated test script to test the 3 endpoints (both offline validation and live testing against FastAPI backend).
6. Document all changes and verification outputs in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m3\handoff.md`.
7. Send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
