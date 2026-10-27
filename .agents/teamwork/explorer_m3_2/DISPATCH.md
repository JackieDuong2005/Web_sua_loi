## 2026-10-18T20:28:29Z
You are Explorer 2 for Milestone 3: Next.js BFF API Gateway (Qwen Director Route).

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 3 section).
- Read the API specification report: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\api_specs.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_2`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Inspect and design `app/api/dictation/qwen-director/route.ts`:
   - `GET` method:
     * Proxies `GET ${VIT5_SERVICE_URL}/qwen/status` with 10s timeout (`AbortSignal.timeout(10000)`).
     * Returns live status JSON: `{ enabled, model_id, is_loaded, lifecycle_mode, available_ram_mb, cache_entries, memory_mode }`.
     * If Python service is offline, return graceful fallback `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true }`.
   - `POST` method:
     * Parse JSON body.
     * If `body.action === "extract_sgk"`:
       - Validate `body.raw_text`.
       - Forward to `POST ${VIT5_SERVICE_URL}/qwen/extract-sgk` with `{ raw_text: body.raw_text, grade: body.grade || 3 }`.
       - Use 30s timeout (`AbortSignal.timeout(30000)`) to allow on-demand cold start on Raspberry Pi.
       - Return `{ success: true, data: result }`.
     * If `body.action === "direct_prosody"`:
       - Validate `body.passage`.
       - Forward to `POST ${VIT5_SERVICE_URL}/qwen/direct-prosody` with `{ passage: body.passage, difficult_words: body.difficult_words || [], grade: body.grade || 3, chunk_mode: body.chunk_mode || "phrase" }`.
       - Use 30s timeout (`AbortSignal.timeout(30000)`).
       - Return `{ success: true, data: result }`.
     * Invalid action: return HTTP 400 with helpful error message.
3. Recommend exact code implementation strategy for Worker. Do NOT edit source files yourself.
4. Write report to `analysis.md` and `handoff.md`.
5. Send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
