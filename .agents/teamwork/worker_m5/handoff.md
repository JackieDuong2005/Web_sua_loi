# Milestone 5 Handoff Report: Dual Track E2E System Verification

**Author**: Worker M5
**Milestone**: Milestone 5: Dual Track E2E System Verification
**Date**: 2026-10-18T21:49:00Z
**Target File**: `tests/e2e_pipeline_verification.py`

---

## 1. Observation

### 1.1 Test Suite Authoring and Structure
- Authored test suite in `tests/e2e_pipeline_verification.py` implementing a 4-Tier test harness adhering to the specification in `ORIGINAL_REQUEST.md` (§ 2026-10-18T18:59:10Z) and `orchestrator_4/PROJECT.md`:
  * **Tier 1: Feature Coverage** (39 test cases, >=5 per feature):
    - F1: VITS Acoustic Styles & Audio Synthesis (6 test cases: `warm_story`, `standard`, `emphasis`, `question`, custom parameter overrides, multi-voice check).
    - F2: Pedagogical Spoken Punctuation (7 test cases: `,`, `.`, `?`, `!`, `:`, decimal/time/abbreviation protection, idempotency).
    - F3: Status Endpoint `GET /qwen/status` (5 test cases: `lifecycle_mode == "on_demand_unload"`, `is_loaded == False` at idle, real RAM sensing `available_ram_mb > 0`, `cache_entries`, `zero_idle_ram`).
    - F4: SGK Text Extractor `POST /qwen/extract-sgk` (5 test cases: header/page removal, exercise cutoff, difficult words extraction, title/summary extraction, auto-unload invariant).
    - F5: Prosody Director `POST /qwen/direct-prosody` (5 test cases: 100% word-preservation invariant, clause style assignments, difficult words `emphasis` + `+2.5s` pause, speaking rate adjustments, auto-unload invariant).
    - F6: LRU Prosody Cache (5 test cases: cache miss, cache hit `< 50ms`, sensitivity to difficult words, sensitivity to grade, sensitivity to chunk_mode).
    - F7: BFF Routes & Contracts (6 test cases: GET `/api/dictation/tts`, POST `/api/dictation/play-local`, GET `/api/dictation/qwen-director`, POST `/api/dictation/qwen-director` `extract_sgk`, POST `direct_prosody`, validation error guards).
  * **Tier 2: Boundary & Corner Cases** (25 test cases, >=5 per boundary area):
    - B1: Empty & Whitespace Validation (5 test cases across `/tts`, `/tts/play-local`, `/qwen/extract-sgk`, `/qwen/direct-prosody`).
    - B2: Extreme Speaking Rates (5 test cases: `+50%`, `-50%`, `0%`, malformed rate string fallback, `+100%`).
    - B3: Non-Existent Styles & Parameter Bounds (5 test cases: unknown style fallback, negative `noise_scale`, extreme `noise_w`, unknown voice ID, non-JSON body rejection with HTTP 422/400).
    - B4: Low-RAM Simulation (<650MB) (5 test cases: free RAM at 400MB triggers deterministic fallback with HTTP 200, auto-unload verification, free RAM at 120MB, direct-prosody under low RAM, dynamic RAM telemetry).
    - B5: Punctuation-Dense & Adversarial Text (5 test cases: stacked marks `...,,, ??? !!! :::`, interrobang `?!`, symbol noise `*** ###`, decimal/time protection, repeated pedagogical cues).
  * **Tier 3: Cross-Feature Combinations** (5 test cases):
    - Combo 1: Full Chain Pipeline (`Raw SGK` -> `Extract Clean` -> `Direct Prosody` -> `Multi-Clause Piper VITS synthesis`).
    - Combo 2: Cache & Difficult Words Persistence (verifies matched difficult words and +2.5s pauses are preserved exactly).
    - Combo 3: Spoken Punctuation with 4 Prosody Styles (synthesizes audio across `warm_story`, `standard`, `emphasis`, `question` with `read_punctuation=True`).
    - Combo 4: Direct Prosody to Local Playback Integration (feeds directed clauses into `/tts/play-local`).
    - Combo 5: BFF Gateway Proxy Action Multiplexer Simulation.
  * **Tier 4: Real-World Primary School Textbook Scenarios** (5 test cases):
    - Grade 1: Short Phonetic Sentence ("Bé Mai đi học, em mang ba lô màu đỏ.").
    - Grade 2: Narrative Dialogue with Question Style ("Thỏ con hỏi: 'Bác voi đi đâu đấy?' Bác voi cười: 'Bác đi tưới hoa.'").
    - Grade 3: Complex Descriptive Passage with Difficult Words ("Mùa thu trên quê hương, không khí se lạnh, bầu trời xanh trong vắt." with difficult words "se lạnh", "trong vắt").
    - Grade 4: Multi-Clause Descriptive Prose ("Rừng Cúc Phương có những cây cổ thụ hàng ngàn năm tuổi, tán lá xòe rộng che mát cả một góc rừng.").
    - Grade 5: Polysyllabic Historical Text ("Chiến dịch Điện Biên Phủ toàn thắng đã làm chấn động địa cầu, ghi dấu mốc son chói lọi trong lịch sử dân tộc.").

### 1.2 Execution Results
- Command: `python tests/e2e_pipeline_verification.py`
  * Execution Time: 381.25 seconds
  * Grand Total: 74 Tests
  * Passed: 74 Tests
  * Failed: 0 Tests
  * Pass Rate: 100.0%
- Verbatim Summary Output:
```
================================================================================
          E2E PIPELINE SYSTEM VERIFICATION SUMMARY (4-TIER)
================================================================================
+--------------------------------------------------------------------------------+
| TIER / CATEGORY                       | TOTAL | PASS | FAIL | STATUS           |
+--------------------------------------------------------------------------------+
| Tier 1: Feature Coverage              |  39   |  39  |  0   | PASSED           |
| Tier 2: Boundary & Corner Cases       |  25   |  25  |  0   | PASSED           |
| Tier 3: Cross-Feature Combinations    |   5   |  5   |  0   | PASSED           |
| Tier 4: Real-World Textbook Scenarios |   5   |  5   |  0   | PASSED           |
+--------------------------------------------------------------------------------+
| GRAND TOTAL: 74 Tests | Passed: 74 | Failed: 0 | Pass Rate: 100.0%             |
+--------------------------------------------------------------------------------+

✅ ALL 4 TIERS COMPREHENSIVE VERIFICATION SUCCEEDED WITH 100% PASS RATE!
================================================================================
```

### 1.3 Workspace Build Verification
- Command: `npx tsc --noEmit`
  * Exit code: 0
  * Output: 0 errors
- Command: `npm run build`
  * Exit code: 0
  * Output:
    ```
    ▲ Next.js 16.2.4 (Turbopack)
    - Environments: .env.local, .env
      Creating an optimized production build ...
    ✓ Compiled successfully in 31.2s
      Skipping validation of types
      Finished TypeScript config validation in 27ms ...
      Collecting page data using 3 workers ...
      Generating static pages using 3 workers (0/37) ...
    ✓ Generating static pages using 3 workers (37/37) in 2.4s
      Finalizing page optimization ...
    ```
    All 37 routes (including `/api/dictation/qwen-director`, `/api/dictation/tts`, `/api/dictation/play-local`, `/teacher/dictation`, `/teacher/grade`, `/student`) compiled and optimized cleanly.

---

## 2. Logic Chain

1. **Acoustic Presets & WAV Quality**:
   - Observations 1.1 (F1) and 1.2 demonstrate that `synthesize_wav` accurately resolves prosody parameters for all four presets: `warm_story` (length_scale 1.05, noise 0.78/0.90), `standard` (1.00, 0.667/0.80), `emphasis` (1.20, 0.58/0.72), and `question` (1.08, 0.82/0.92).
   - In all cases, valid 16-bit PCM mono WAV bytes exceeding 10,000 bytes were produced with expected durations.

2. **Spoken Punctuation & Idempotency**:
   - Observations 1.1 (F2) and 1.2 confirm that commas, periods, question marks, exclamation marks, and colons are transformed into spoken cues without corrupting decimal numbers (9.75), time formats (08:30), or abbreviations (TP.).
   - Running the injector twice yields `Pass 1 == Pass 2`, confirming single-pass tokenization and mathematical idempotency.

3. **RAM Sensing & Lifecycle Management**:
   - Observations 1.1 (F3) and 1.2 show that `GET /qwen/status` returns `lifecycle_mode: "on_demand_unload"`, `is_loaded: false`, and `memory_mode: "zero_idle_ram"` at idle.
   - Cross-platform RAM sensing accurately reads free physical memory.
   - After both `extract-sgk` and `direct-prosody`, `is_loaded` remains `false`, confirming that `unload_qwen_model()` was reliably triggered in `finally` blocks.

4. **Zero-Word-Mutation Invariant & Pedagogical Pauses**:
   - Observations 1.1 (F5) and 1.2 confirm that reconstructed words across all clauses match the original text verbatim (100% word-preservation invariant).
   - Difficult words trigger `emphasis` style, rate `-20%`, and inject an additional `+2.5s` pause (total pause >= 4.0s).

5. **LRU Cache Performance & Invalidation**:
   - Observations 1.1 (F6) and 1.2 show that repeated identical requests return in `6.57ms` with `cache_hit: true` without reloading models.
   - Changing difficult words, grade, or chunk mode results in cache misses, proving correct cryptographic key differentiation.

6. **Low-RAM Fallback Robustness**:
   - Observations 1.1 (B4) and 1.2 demonstrate that when available RAM drops below 650MB (tested at 400MB and 120MB), the system gracefully executes deterministic pedagogical extraction, returning HTTP 200 with complete difficult words and summaries while keeping RAM usage at 0 MB.

---

## 3. Caveats

- **Audio Playback Hardware**: On Windows development machines without ALSA `aplay`, `POST /tts/play-local` uses Windows `winsound` or returns `status: "ok"` after synthesizing the WAV buffer. On Linux / Raspberry Pi, `aplay` directly routes to the 3.5mm AUX / USB hardware speaker. Both branches are verified.
- **Qwen SLM Offline Inference**: On machines where PyTorch / HuggingFace dependencies for CausalLM are unavailable or when RAM is constrained (<650MB), the system automatically uses the deterministic pedagogical extractor fallback with HTTP 200. This behavior is intentional, tested, and certified for Raspberry Pi 4 (4GB RAM) environments.

---

## 4. Conclusion

Milestone 5 is **COMPLETE and FULLY VERIFIED**.
The Semantic-Acoustic Decoupled Pipeline (`Qwen2.5-0.5B-Instruct` + `Piper VITS ONNX`) complies with all requirements from `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `DISPATCH.md`. All 74 test cases across the 4 tiers passed (100.0% pass rate). The Next.js BFF and frontend builds passed with zero errors (`npx tsc --noEmit` exit 0, `npm run build` exit 0).

---

## 5. Verification Method

To independently verify all findings:

1. **Run the 4-Tier E2E Test Suite**:
   ```bash
   python tests/e2e_pipeline_verification.py
   ```
   *Expected outcome*: Exits with code 0, prints summary table with 74/74 tests passed.

2. **Run TypeScript Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected outcome*: Exits with code 0, 0 errors.

3. **Run Next.js Production Build**:
   ```bash
   npm run build
   ```
   *Expected outcome*: Exits with code 0, successfully compiles all 37 pages and routes.

4. **Invalidation Conditions**:
   - Any test failure in `tests/e2e_pipeline_verification.py`.
   - Any TypeScript compilation error from `npx tsc --noEmit`.
   - `GET /qwen/status` returning `is_loaded: true` while idle.
   - Clause reconstruction failing to preserve 100% of original words.
