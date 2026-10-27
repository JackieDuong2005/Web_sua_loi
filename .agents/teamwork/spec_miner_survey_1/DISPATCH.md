## 2026-10-18T19:02:35Z

You are a Specification Miner analyzing API contracts for the Semantic-Acoustic Decoupled Pipeline.
Read the authoritative requirements at:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) and
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\DISPATCH.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1`

Your task:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Inspect existing Next.js BFF routes and Python API routes:
   - `app/api/dictation/tts/route.ts`
   - `app/api/dictation/play-local/route.ts`
   - Any other files under `app/api/dictation/`
   - Target route to create: `app/api/dictation/qwen-director/route.ts`
   - Python endpoints in `python_service/main.py`: `/tts`, `/tts/play-local`, `/qwen/status`, `/qwen/extract-sgk`, `/qwen/direct-prosody`.
3. Document exact request/response schemas, query parameters, payload structures, headers, and error responses for:
   - `GET /api/dictation/tts` forwarding `text`, `voice`, `speed`, `style`, `noise_scale`, `noise_w`, `read_punctuation` to Python service `:8000/tts`.
   - `POST /api/dictation/play-local` forwarding `text`, `voice`, `speed`, `style`, `noise_scale`, `noise_w`, `read_punctuation` to Python service `:8000/tts/play-local`.
   - `GET /api/dictation/qwen-director` proxying `GET :8000/qwen/status`.
   - `POST /api/dictation/qwen-director` handling:
     * `action: "extract_sgk"` -> proxies `POST :8000/qwen/extract-sgk` with `{ raw_text, grade }`.
     * `action: "direct_prosody"` -> proxies `POST :8000/qwen/direct-prosody` with `{ passage, difficult_words, grade, chunk_mode }`.
4. Specify edge cases, timeout handling (e.g. 15s-30s when Qwen model loads on-demand), and fallback error JSON formats.
5. Write your comprehensive specification report to `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\api_specs.md` and summarize in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\handoff.md`.
6. Send a completion message back to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md).
- Do not modify source code — document precise specifications and test criteria.
