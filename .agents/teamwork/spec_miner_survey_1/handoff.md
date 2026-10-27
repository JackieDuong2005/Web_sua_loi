# Handoff Report — Specification Mining for Semantic-Acoustic Decoupled Pipeline
**Agent**: `spec_miner_survey_1` (Specification Miner)  
**Date**: 2026-10-18T19:07:00Z  
**Recipient**: Orchestrator (`0516b259-befc-4fac-baa8-b10ce65a612b`)  
**Artifact Path**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\api_specs.md`

---

## 1. Observation
1. **Existing Next.js BFF Routes**:
   - `app/api/dictation/tts/route.ts` (lines 13-23): Accepts `text`, `voice`, `rate`. Forwards to `${VIT5_SERVICE_URL}/tts?text=...&voice=...&rate=...`. AbortController timeout is 15s (`line 26`). Returns `audioBuffer` with headers `Content-Type`, `Cache-Control`, `X-TTS-Engine`. Lacks `style`, `noise_scale`, `noise_w`, `read_punctuation` forwarding.
   - `app/api/dictation/play-local/route.ts` (lines 12-27): Accepts JSON `{ text, voice, rate }`. Forwards to `${VIT5_SERVICE_URL}/tts/play-local`. AbortController timeout is 15s (`line 20`). Lacks `style`, `noise_scale`, `noise_w`, `read_punctuation`.
   - `app/api/dictation/qwen-director/route.ts`: Currently **does not exist** and must be created.
   - `app/api/dictation/generate/route.ts` (lines 96-98, 114-125): Uses `guardAiRoute(req)` from `@/lib/api-guard.ts` and `AbortSignal.timeout(8000)`.
2. **Existing Python Service Endpoints**:
   - `python_service/main.py` (lines 1746-1776): `GET /tts` accepts `(text: str, voice: str = "vi_VN-vais1000-medium", rate: str = "-15%")`. Currently calls `tts_engine.synthesize_wav(text.strip(), voice_id=voice, rate=rate)`.
   - `python_service/main.py` (lines 1791-1806): `POST /tts/play-local` accepts `req: LocalPlayRequest(text, voice, rate)`.
   - `python_service/main.py` (lines 1809-1823): `GET /qwen/status` returns `{ enabled, model_id, precision, quantized, is_loaded, device, description }`. Does not yet report `available_ram_mb`, `lifecycle_mode`, or cache metrics.
   - `python_service/main.py`: Endpoints `POST /qwen/extract-sgk` and `POST /qwen/direct-prosody` **do not exist yet** in `main.py`.
   - `python_service/tts_engine.py` (lines 344-380): `synthesize_wav(text, voice_id, rate)` computes `length_scale` and calls `PiperVoice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)`.
3. **Existing Client UI Playback Calls**:
   - `app/teacher/dictation/page.tsx` (lines 550-577): Calls `/api/dictation/play-local` and `/api/dictation/tts` passing `voice` and `rate`.
   - `components/student/student-grade-detail-modal.tsx` (line 238) and `app/student/page.tsx` (line 71): Uses legacy `/api/dictation/tts?text=...&voice=vi-VN-HoaiMyNeural&rate=-15%`.
4. **Platform & Resource Invariants**:
   - Raspberry Pi 4 has 4GB total RAM. Running ViT5, YOLOv8, Next.js, and OS leaves approximately 1.5GB - 2.2GB available. Loading Qwen2.5-0.5B requires ~600MB. If kept loaded in memory, it risks Out-Of-Memory (OOM) during image OCR or multi-tab usage.

---

## 2. Logic Chain
1. Based on Observation 1 and 2, the current TTS pipeline only passes `text`, `voice`, and `rate`, which causes the Piper VITS voice to sound uniform and lack pedagogical emphasis or question intonation.
2. Based on Requirement R1, adding `style`, `noise_scale`, `noise_w`, and `read_punctuation` to `python_service/tts_engine.py` enables:
   - 4 expressive acoustic presets (`warm_story`, `standard`, `emphasis`, `question`).
   - Spoken pedagogical punctuation (`inject_pedagogical_punctuation`) which changes `,` to `, phẩy,` and `.` to `, chấm.`.
   - Forwarding these parameters through both Next.js BFF routes (`/api/dictation/tts` and `/api/dictation/play-local`) preserves complete architectural decoupling.
3. Based on Observation 4 and Requirement R2, permanently holding `Qwen2.5-0.5B` in RAM violates the 0 MB idle RAM constraint on Raspberry Pi 4. Thus:
   - Setting `QWEN_LIFECYCLE_MODE = "on_demand_unload"` and calling `unload_qwen_model()` in a `finally` block ensures 0 MB RAM consumption when idle.
   - Cross-platform RAM sensing (`/proc/meminfo` on Linux, `GlobalMemoryStatusEx` on Windows) prevents OOM by enforcing a 650 MB minimum RAM threshold before loading Qwen.
   - An in-memory LRU `_prosody_script_cache` keyed by hash avoids re-loading the SLM on repeated requests, reducing latency from ~1.5s to < 1ms.
4. Based on Observation 1, Next.js BFF currently lacks `app/api/dictation/qwen-director/route.ts`. Creating this multiplexer route allows the frontend to dispatch both `extract_sgk` and `direct_prosody` actions cleanly, with a 30s timeout configured for on-demand model spin-up.
5. All specifications have been structured into `api_specs.md` with explicit DTOs, parameters, error formats, and integration patterns.

---

## 3. Caveats
- **SD Card Read Latency on Raspberry Pi**: First-time loading of `Qwen2.5-0.5B-Instruct` from a Class 10 MicroSD card can take 10s to 20s. The Next.js BFF timeout for `qwen-director` must be set to at least 30s.
- **Audio Device Fallback**: On headless Raspberry Pi setups lacking an audio HAT or connected speaker, `POST /tts/play-local` will return HTTP 502/500 if ALSA `aplay` cannot open `default` PCM. The frontend should gracefully handle this and default to browser audio streaming (`audioOutputDest = "browser"`).
- No mermaid diagrams were used, in strict adherence to `GEMINI.md`.

---

## 4. Conclusion
The API contracts and behavioral specifications for the Semantic-Acoustic Decoupled Pipeline have been completely mined, documented, and cross-referenced with the ViHand Grade codebase.
The authoritative specification report is published at:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\api_specs.md`

Key contracts specified:
1. `GET /api/dictation/tts` & `GET :8000/tts` (WAV stream, 4 acoustic presets, spoken punctuation).
2. `POST /api/dictation/play-local` & `POST :8000/tts/play-local` (Hardware speaker playback).
3. `GET /api/dictation/qwen-director` & `GET :8000/qwen/status` (RAM, lifecycle, cache stats).
4. `POST /api/dictation/qwen-director` & `POST :8000/qwen/extract-sgk`, `POST :8000/qwen/direct-prosody` (Text cleaning, prosody direction, LRU caching, auto-unload).

---

## 5. Verification Method
To independently verify the discoveries and specifications:
1. **File Inspection**:
   - Check `api_specs.md` at `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\api_specs.md`.
   - Inspect existing BFF routes: `app/api/dictation/tts/route.ts`, `app/api/dictation/play-local/route.ts`.
   - Inspect existing Python routes: `python_service/main.py:1746`, `python_service/tts_engine.py:344`.
2. **TypeScript Typecheck**:
   - Run `npx tsc --noEmit` from project root to ensure existing codebase compiles cleanly.
3. **Specification Verification Test Criteria**:
   - `GET :8000/qwen/status` returns HTTP 200 with `lifecycle_mode: "on_demand_unload"` and `is_loaded: false`.
   - `POST :8000/qwen/extract-sgk` cleans `Trang 45` and unloads model.
   - `POST :8000/qwen/direct-prosody` preserves 100% words and caches result.
