# Orchestrator Soft Handoff — Orchestrator 4 to Successor (Generation 5)

## 1. Milestone State

| Milestone | Scope / Target Files | Status | Gate Verdict |
|---|---|---|---|
| **M0: Survey & Scope Mapping** | Survey Python, Frontend, API Specs | **DONE** | Complete (PROJECT.md) |
| **M1: Expressive Piper VITS Engine & Spoken Punctuation** | `python_service/tts_engine.py` | **DONE** | **PASS** (67/67 adversarial tests pass, 0 crash, Clean audit) |
| **M2: Qwen2.5 Staged On-Demand Lifecycle & Endpoints** | `python_service/main.py`, `start_all.bat` | **DONE** | **PASS** (7/7 pipeline tests pass, 0 memory leak, Clean audit) |
| **M3: Next.js BFF API Gateway** | `app/api/dictation/tts/route.ts`<br>`app/api/dictation/play-local/route.ts`<br>`app/api/dictation/qwen-director/route.ts` | **IN_PROGRESS**<br>(Exploration 100% Complete) | **PENDING**<br>(Ready for Worker M3 dispatch) |
| **M4: Multi-Surface Teacher & Student UI Integration** | `app/teacher/dictation/page.tsx`<br>`app/teacher/grade/page.tsx`<br>`app/student/page.tsx`<br>`components/student/student-grade-detail-modal.tsx` | **PLANNED** | Not started |
| **M5: E2E Testing & System Verification** | `tests/e2e_pipeline_verification.py`, `npx tsc --noEmit`, `npm run build` | **PLANNED** | Not started |

---

## 2. Observation & Logic Chain

### Milestone 1 Accomplishments:
- Implemented `PROSODY_STYLE_PRESETS`: `warm_story` (0.78, 0.90, 1.05), `standard` (0.667, 0.80, 1.00), `emphasis` (0.58, 0.72, 1.20), `question` (0.82, 0.92, 1.08).
- Implemented tokenized regex `inject_pedagogical_punctuation` with 100% mathematical idempotency $f(f(x)) == f(x)$, protecting abbreviations (`TP. HCM`), decimals (`9.5`), timestamps (`08:30`), and ellipses (`...`).
- Pre-initialized wave headers (`1ch`, `16bit`, `22050Hz`) and silence fallback (`_generate_silence_wav`) in `tts_engine.synthesize_wav` eliminating zero-frame crash on non-phonemic input.
- Verified: `tests/test_adversarial_punctuation.py` (67/67 PASS), `python_service/tests/test_adversarial_tts.py` (PASS), CLEAN forensic audit.

### Milestone 2 Accomplishments:
- Configured `QWEN_LIFECYCLE_MODE = "on_demand_unload"` in `main.py` and `start_all.bat` (line 79).
- Cross-platform RAM sensing `get_available_ram_mb()` supporting Windows `GlobalMemoryStatusEx` and Linux `/proc/meminfo`.
- `unload_qwen_model()` clearing model references, CUDA cache, and running 3x `gc.collect()` in `finally:` blocks.
- In-memory SHA-256 LRU cache `_prosody_script_cache` (max 128 entries, hit latency 8.3ms < 15ms).
- `POST /qwen/extract-sgk` with textbook cleaning, 650MB RAM threshold check, deterministic pedagogical fallback, and auto-unload.
- `POST /qwen/direct-prosody` with 100% Zero-Word-Mutation invariant, difficult word matching (+2.5s pause & `emphasis` style), and auto-unload.
- Updated `GET /tts`, `POST /tts/play-local`, and `GET /qwen/status`.
- Verified: `tests/test_milestone2_pipeline.py` (7/7 PASS), `tests/test_challenger2_ram_stress.py` (16/16 PASS, RSS delta +0.38MB across 10 calls), CLEAN forensic audit.

### Milestone 3 Exploration Deliverables:
All 3 Explorers completed in-depth investigations and produced copy-paste-ready code blueprints:
1. `explorer_m3_1` (`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_1\analysis.md`):
   - Blueprint for `app/api/dictation/tts/route.ts`: extract `style`, `noise_scale`, `noise_w`, `read_punctuation`, forward to `${VIT5_SERVICE_URL}/tts`, propagate headers `X-TTS-Engine` and `X-TTS-Style`.
   - Blueprint for `app/api/dictation/play-local/route.ts`: parse all 7 acoustic fields in JSON body, forward to `${VIT5_SERVICE_URL}/tts/play-local`, return computed scales.
2. `explorer_m3_2` (`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_2\analysis.md`):
   - Blueprint for `app/api/dictation/qwen-director/route.ts`:
     - `GET`: Proxy `${VIT5_SERVICE_URL}/qwen/status` with 10s timeout, fallback `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true }` when Python backend is down.
     - `POST`: Multiplex on `body.action`:
       - `extract_sgk`: Validate `raw_text`, forward to `${VIT5_SERVICE_URL}/qwen/extract-sgk` with 30s timeout guard (`AbortSignal.timeout(30000)`).
       - `direct_prosody`: Validate `passage`, forward to `${VIT5_SERVICE_URL}/qwen/direct-prosody` with 30s timeout guard (`AbortSignal.timeout(30000)`).
       - Returns `{ success: true, data: result, ...result }`.
3. `explorer_m3_3` (`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_3\analysis.md`):
   - Baseline TypeScript check confirmed 0 errors (`npx tsc --noEmit`).
   - Rate limiting via `guardAiRoute(req, 20, "qwen-director")`.
   - Export `export const dynamic = "force-dynamic"` on all 3 routes.
   - Comprehensive 3-tier test plan (Static, Offline validation, Live E2E).

---

## 3. Active Subagents (Roster)
All spawned subagents have completed their tasks and delivered reports:
- `explorer_m3_1` (`db70e79d-685c-443f-baff-4adfadfe38eb`): IDLE (Report delivered)
- `explorer_m3_2` (`9e2ae8e8-a401-4623-9973-2bcd4f3518ef`): IDLE (Report delivered)
- `explorer_m3_3` (`072809b3-d813-44bc-a383-efcb261bcd2d`): IDLE (Report delivered)

---

## 4. Pending Decisions & Key Constraints
- Strict dispatch-only orchestrator: NEVER write source code, NEVER run builds/tests directly. Require workers to do so.
- Audit enforcement: Zero tolerance on forensic audit integrity violations.
- GEMINI.md compliance: **TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID**. Use ASCII box drawings and Markdown tables.
- Raspberry Pi 4 4GB RAM budget: Qwen must remain 0MB RAM idle (`on_demand_unload`).

---

## 5. Remaining Work (Immediate Roadmap for Successor)

### Step 1: Dispatch Worker M3 (`teamwork_preview_worker`)
- Working directory: `.agents/teamwork/worker_m3`
- File ownership:
  - `app/api/dictation/tts/route.ts`
  - `app/api/dictation/play-local/route.ts`
  - `app/api/dictation/qwen-director/route.ts`
- Inputs to pass in prompt:
  - `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (mandatory)
  - `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md`
  - `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_1\analysis.md`
  - `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_2\analysis.md`
  - `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_3\analysis.md`
- Tasks:
  1. Update `app/api/dictation/tts/route.ts` with acoustic parameter forwarding and `X-TTS-Style`.
  2. Update `app/api/dictation/play-local/route.ts` with full acoustic payload forwarding.
  3. Create `app/api/dictation/qwen-director/route.ts` with GET status proxy and POST multiplexer (`extract_sgk`, `direct_prosody`), rate limiter, 30s timeout guard, and dynamic export.
  4. Run `npx tsc --noEmit` and execute HTTP verification tests.
  5. Deliver `handoff.md`.

### Step 2: Milestone 3 Gate Verification
- Dispatch 2 Reviewers (`teamwork_preview_reviewer`): Review code, run `npx tsc --noEmit`, verify interface contracts.
- Dispatch 2 Challengers (`teamwork_preview_challenger`): Stress test timeout handling, invalid action rejection, offline backend fallback, parameter conversion.
- Dispatch 1 Forensic Auditor (`teamwork_preview_auditor`): Verify genuine proxy forwarding, no mocked static responses, clean audit.
- Record in `GATE_STATUS.md`.

### Step 3: Milestone 4 (Multi-Surface UI Integration)
- Target files:
  - `app/teacher/dictation/page.tsx`: Live RAM/Piper badge, SGK extractor modal, prosody preview, acoustic controls, Step 3 playback loop.
  - `app/teacher/grade/page.tsx`: Comment audio `warm_story`, word correction audio `emphasis`.
  - `app/student/page.tsx`: Hero comment audio `warm_story`, word practice audio `emphasis`.
  - `components/student/student-grade-detail-modal.tsx`: Pedagogical comment audio `warm_story`, BBox canvas audio `emphasis`.
- Run Explorer -> Worker -> Reviewers -> Challengers -> Auditor gate.

### Step 4: Milestone 5 (Dual Track E2E Verification & Victory Report)
- Run `tests/e2e_pipeline_verification.py`.
- Run `npx tsc --noEmit` -> 0 errors.
- Run `npm run build` -> 0 errors across all routes.
- Final Forensic Audit -> CLEAN.
- Call `send_message` to Sentinel parent (`dbc8bb26-69e0-487b-b7c4-1c1409f96544`).

---

## 6. Key Artifacts
- Scope document: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md`
- Briefing: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\BRIEFING.md`
- Progress: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\progress.md`
- Gate Status: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\GATE_STATUS.md`
- Original Request: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md`
