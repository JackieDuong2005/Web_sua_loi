## 2026-10-18T20:45:08Z
You are Challenger 1 for Milestone 3: Next.js BFF API Gateway (Edge Cases & Validation Fuzzing).

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md`.
- Read Worker M3's handoff: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m3\handoff.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\challenger_m3_1`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Empirically stress-test the BFF routes under adversarial inputs and boundary conditions:
   - Fuzz `app/api/dictation/tts/route.ts`:
     * Empty text `text=""`, whitespace `text="   "`, missing text parameter -> verify HTTP 400.
     * Malformed `noise_scale="not_a_number"`, `noise_w="abc"` -> verify server doesn't crash, ignores invalid float.
     * Extreme styles: `style="custom_style"`, `read_punctuation="invalid_bool"` -> verify proper handling.
   - Fuzz `app/api/dictation/play-local/route.ts`:
     * Non-JSON body, empty body `{}` -> verify HTTP 400.
     * Missing text field -> verify HTTP 400.
   - Fuzz `app/api/dictation/qwen-director/route.ts`:
     * Missing action, unknown action `action="unknown_action"`, non-JSON body -> verify HTTP 400.
     * `action="extract_sgk"` with missing or empty `raw_text` -> verify HTTP 400.
     * `action="direct_prosody"` with missing or empty `passage` -> verify HTTP 400.
   - Execute the test suite `python tests/test_bff_routes.py`.
3. Render verdict: APPROVE or REJECT.
4. Document findings and evidence in `handoff.md` and send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
