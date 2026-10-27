# Project: ViHand Grade — Semantic-Acoustic Decoupled Pipeline (Qwen2.5-0.5B + Piper VITS ONNX)

## Architecture
- **Semantic Engine (SLM)**: Qwen2.5-0.5B-Instruct on-demand activation & immediate auto-unload (`QWEN_LIFECYCLE_MODE=on_demand_unload`), cross-platform RAM sensing (`GlobalMemoryStatusEx` on Windows, `/proc/meminfo` on Linux), and in-memory LRU prosody cache.
- **Acoustic Engine (Neural TTS)**: Piper VITS ONNX (`vi_VN-vais1000-medium.onnx`), 4 prosody style presets (`warm_story`, `standard`, `emphasis`, `question`), single-pass tokenized pedagogical spoken punctuation (`inject_pedagogical_punctuation`), and `SynthesisConfig(length_scale, noise_scale, noise_w_scale)`.
- **BFF Gateway (Next.js 16)**: Proxy endpoints for `/api/dictation/tts`, `/api/dictation/play-local`, and multiplexer `/api/dictation/qwen-director` (`status`, `extract_sgk`, `direct_prosody`) with 30s timeout guard.
- **Multi-Surface Frontend**: Teacher Dictation Cockpit (`app/teacher/dictation/page.tsx`), Teacher Grading (`app/teacher/grade/page.tsx`), Student Portal (`app/student/page.tsx`), and Student Grade Detail Modal (`components/student/student-grade-detail-modal.tsx`).

## System Architecture Diagram (ASCII)
```
+-----------------------------------------------------------------------------------+
|                            MULTI-SURFACE CLIENT LAYER                             |
|  Teacher Dictation Cockpit  |  Teacher Grade View  |  Student Portal & BBox Modal |
|  - Live RAM/Piper Badge     |  - Teacher Comment   |  - Pedagogical Comment Audio |
|  - SGK Text Cleaner Dialog  |    Audio Playback    |    (style=warm_story)        |
|  - Qwen Prosody Director UI |  - Word Correction   |  - Word Correction Audio     |
|  - Step 3 Dynamic Loop      |    Audio (emphasis)  |    (style=emphasis)          |
+-----------------------------------------------------------------------------------+
                                        | (HTTP / Fetch)
                                        v
+-----------------------------------------------------------------------------------+
|                        NEXT.JS BFF API GATEWAY LAYER                              |
|  - GET  /api/dictation/tts (forwarding style, noise_scale, noise_w, read_punct)   |
|  - POST /api/dictation/play-local (forwarding acoustic parameters)                |
|  - GET  /api/dictation/qwen-director (proxies /qwen/status)                       |
|  - POST /api/dictation/qwen-director (multiplexes extract_sgk & direct_prosody)   |
+-----------------------------------------------------------------------------------+
                                        | (HTTP Proxy :8000)
                                        v
+-----------------------------------------------------------------------------------+
|                      PYTHON AI MICROSERVICE LAYER (:8000)                         |
|                                                                                   |
|  [Qwen2.5-0.5B Pedagogical Director]           [Piper VITS Acoustic Engine]       |
|  - On-Demand Activation & Auto-Unload          - PROSODY_STYLE_PRESETS:           |
|  - Cross-platform RAM guard (>= 650MB)           warm_story, standard,           |
|  - Deterministic SGK fallback                    emphasis, question               |
|  - In-memory SHA-256 LRU Cache (<1ms)          - inject_pedagogical_punctuation   |
|  - POST /qwen/extract-sgk                      - SynthesisConfig(length_scale,    |
|  - POST /qwen/direct-prosody (verbatim 100%)     noise_scale, noise_w_scale)      |
|  - GET  /qwen/status (RAM & cache metrics)     - GET /tts & POST /tts/play-local  |
+-----------------------------------------------------------------------------------+
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | VITS Prosody Presets | Define `PROSODY_STYLE_PRESETS`: `warm_story` (0.78, 0.90, 1.05), `standard` (0.667, 0.80, 1.00), `emphasis` (0.58, 0.72, 1.20), `question` (0.82, 0.92, 1.08). | M1 | ORIGINAL_REQUEST § R1 |
| F2 | Spoken Punctuation | Single-pass tokenized `inject_pedagogical_punctuation` converting punctuation marks into spoken Vietnamese dictation cues (`phẩy`, `chấm`, `chấm hỏi`, `chấm than`, `hai chấm`). | M1 | ORIGINAL_REQUEST § R1 |
| F3 | VITS SynthesisConfig | Update `synthesize_wav` and `play_on_local_speaker` to accept `style`, `noise_scale`, `noise_w`, `read_punctuation` and pass `SynthesisConfig` to `PiperVoice`. | M1 | ORIGINAL_REQUEST § R1 |
| F4 | On-Demand Lifecycle | Default `QWEN_LIFECYCLE_MODE="on_demand_unload"` and configure `start_all.bat`. Guarantee 0 MB RAM idle consumption. | M2 | ORIGINAL_REQUEST § R2 |
| F5 | Cross-Platform RAM Guard | Implement `get_available_ram_mb()` (Windows `GlobalMemoryStatusEx` + Linux `/proc/meminfo`) and `unload_qwen_model()` using `gc.collect()`. | M2 | ORIGINAL_REQUEST § R2 |
| F6 | Prosody Script Cache | Implement in-memory LRU `_prosody_script_cache` keyed by content/grade hash returning in < 1ms on cache hits. | M2 | ORIGINAL_REQUEST § R2 |
| F7 | SGK Text Extractor Endpoint | `POST /qwen/extract-sgk`: Strip page numbers, headers, textbook questions; 650MB RAM check; deterministic fallback; auto-unload in `finally`. | M2 | ORIGINAL_REQUEST § R2 |
| F8 | Prosody Director Endpoint | `POST /qwen/direct-prosody`: Preserve 100% textbook verbatim words; assign clause styles; add +2.5s pause & emphasis for difficult words; cache result; auto-unload in `finally`. | M2 | ORIGINAL_REQUEST § R2 |
| F9 | TTS & Status Endpoints Update | Update `GET /tts`, `POST /tts/play-local`, and `GET /qwen/status` to support new acoustic parameters and report RAM/lifecycle/cache metrics. | M2 | ORIGINAL_REQUEST § R2 |
| F10 | BFF TTS Route Updates | Update `app/api/dictation/tts/route.ts` & `play-local/route.ts` to forward `style`, `noise_scale`, `noise_w`, and `read_punctuation`. | M3 | ORIGINAL_REQUEST § R3 |
| F11 | BFF Qwen Director Route | Create `app/api/dictation/qwen-director/route.ts` supporting `GET` (proxies `/qwen/status`) and `POST` (`extract_sgk` & `direct_prosody`) with 30s timeout. | M3 | ORIGINAL_REQUEST § R3 |
| F12 | Dictation Header Live Badge | Live badge in `app/teacher/dictation/page.tsx` displaying Piper readiness and Qwen RAM state (`Ngủ 0MB RAM` / `Đang bật cờ xử lý` / `Đã lưu kịch bản & Xả RAM`). | M4 | ORIGINAL_REQUEST § R4 |
| F13 | SGK Extraction Dialog | "Trích xuất SGK / PDF (Qwen2.5)" dialog in Dictation view allowing text paste or `.txt` upload, populating title, passageText, and difficultWords. | M4 | ORIGINAL_REQUEST § R4 |
| F14 | Prosody Director Preview | "Qwen2.5 Đạo diễn Nhịp读" button and interactive Prosody Script preview showing clause badges, speaking rates, pauses, and difficult words. | M4 | ORIGINAL_REQUEST § R4 |
| F15 | Acoustic Controls & Toggle | Prosody style selector (`warm_story`, `standard`, `emphasis`, `question`) and "Đọc tên dấu câu" toggle in Dictation Cockpit. | M4 | ORIGINAL_REQUEST § R4 |
| F16 | Step 3 Dynamic Dictation Loop | Upgrade `speakClause` and pause countdown timer in Step 3 to dynamically apply directed prosody parameters per clause. | M4 | ORIGINAL_REQUEST § R4 |
| F17 | Multi-Surface Audio Playback | "Nghe cô giáo đọc nhận xét" (`warm_story`) on Teacher Grade, Student Portal, and Modal; word correction pronunciation (`emphasis`) across all surfaces. | M4 | ORIGINAL_REQUEST § R4 |
| F18 | E2E Test Suite & Verification | Automated test suite validating status, SGK extraction, prosody direction, audio synthesis, and BFF routing. | M5 | ORIGINAL_REQUEST § Acceptance Criteria |
| F19 | TypeScript & Build Parity | `npx tsc --noEmit` exits with code 0; `npm run build` exits with code 0 across all routes. | M5 | ORIGINAL_REQUEST § Acceptance Criteria |
| F20 | Forensic Integrity Audit | Independent forensic audit confirming clean, genuine implementations without hardcoded mocks or facade logic. | M5 | Project Governance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Expressive Piper VITS Engine & Spoken Punctuation | `python_service/tts_engine.py` (F1, F2, F3) | Survey complete | **DONE** |
| M2 | Qwen2.5 On-Demand Lifecycle & Pedagogical Endpoints | `python_service/main.py`, `start_all.bat` (F4, F5, F6, F7, F8, F9) | M1 | **DONE** |
| M3 | Next.js BFF API Gateway | `app/api/dictation/...` (F10, F11) | M2 | **DONE** |
| M4 | Multi-Surface Teacher & Student UI Integration | `app/teacher/...`, `app/student/...`, `components/student/...` (F12, F13, F14, F15, F16, F17) | M3 | **DONE** |
| M5 | Dual Track E2E Testing, System Verification & Audit | E2E test scripts, `npx tsc --noEmit`, `npm run build`, forensic audit (F18, F19, F20) | M1, M2, M3, M4 | **IN_PROGRESS** |

## Interface Contracts
### Client / BFF ↔ Python Service (:8000)
- `GET /tts?text={str}&voice={str}&rate={str}&style={str}&noise_scale={float}&noise_w={float}&read_punctuation={bool}`
  - Response: HTTP 200 `audio/wav` binary stream.
- `POST /tts/play-local`
  - Body: `{ text: str, voice?: str, rate?: str, style?: str, noise_scale?: float, noise_w?: float, read_punctuation?: bool }`
  - Response: HTTP 200 `{ status: "ok", device: "local_speaker", length_scale: float, noise_scale: float, noise_w_scale: float }`
- `GET /qwen/status`
  - Response: HTTP 200 `{ enabled: bool, model_id: str, is_loaded: bool, lifecycle_mode: "on_demand_unload", available_ram_mb: float, cache_entries: int }`
- `POST /qwen/extract-sgk`
  - Body: `{ raw_text: str, grade?: int }`
  - Response: HTTP 200 `{ title: str, clean_content: str, difficultWords: string[], summary: str, source: str, ram_unloaded: bool }`
- `POST /qwen/direct-prosody`
  - Body: `{ passage: str, difficult_words?: string[], grade?: int, chunk_mode?: str }`
  - Response: HTTP 200 `{ clauses: Array<{ index: int, text: str, word_count: int, style: str, style_label: str, rate: str, noise_scale: float, noise_w: float, pause_sec: float, matched_difficult_words: string[] }>, total_words: int, estimated_duration_sec: float, cache_hit: bool, ram_unloaded: bool }`

### Next.js BFF Route: `app/api/dictation/qwen-director/route.ts`
- `GET`: Proxies `GET :8000/qwen/status` with 10s timeout.
- `POST`: Proxies with 30s timeout:
  - If `body.action === "extract_sgk"`: calls `POST :8000/qwen/extract-sgk` with `{ raw_text: body.raw_text, grade: body.grade }`.
  - If `body.action === "direct_prosody"`: calls `POST :8000/qwen/direct-prosody` with `{ passage: body.passage, difficult_words: body.difficult_words, grade: body.grade, chunk_mode: body.chunk_mode }`.

## Code Layout
- `python_service/tts_engine.py` (M1: VITS presets, spoken punctuation, SynthesisConfig) [COMPLETED & VERIFIED]
- `python_service/main.py` (M2: RAM detection, unloader, LRU cache, SGK & prosody endpoints, updated /tts) [COMPLETED & VERIFIED]
- `start_all.bat` (M2: QWEN_LIFECYCLE_MODE=on_demand_unload) [COMPLETED & VERIFIED]
- `app/api/dictation/tts/route.ts` (M3: forward style, noise_scale, noise_w, read_punctuation)
- `app/api/dictation/play-local/route.ts` (M3: forward style, noise_scale, noise_w, read_punctuation)
- `app/api/dictation/qwen-director/route.ts` (M3: status proxy and action multiplexer)
- `app/teacher/dictation/page.tsx` (M4: RAM badge, SGK extractor dialog, prosody preview, acoustic controls, Step 3 dynamic playback)
- `app/teacher/grade/page.tsx` (M4: teacher comment audio warm_story, word correction audio emphasis)
- `app/student/page.tsx` (M4: hero comment audio warm_story, word practice audio emphasis)
- `components/student/student-grade-detail-modal.tsx` (M4: pedagogical comment audio warm_story, BBox canvas audio emphasis)
- `tests/e2e_pipeline_verification.py` (M5: E2E test suite covering Tiers 1-4)
