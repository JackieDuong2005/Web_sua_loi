# BRIEFING — 2026-10-18T19:09:30Z

## Mission
Survey Python AI Service (`tts_engine.py`, `main.py`, `requirements.txt`, `start_all.bat`) for Piper VITS prosody controls, Qwen model lifecycle (on-demand unload, 650MB RAM check), and SGK extraction/direct prosody endpoints.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_1
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Python AI Service Survey for ViHand Grade R1/R2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement / modify source code directly
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md)
- Write output reports to workspace folder: `survey_python.md` and `handoff.md`

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T19:09:30Z

## Investigation State
- **Explored paths**:
  - `python_service/tts_engine.py` (PiperVoice loading, caching, synthesize_wav, play_on_local_speaker)
  - `python_service/main.py` (Qwen global model, get_qwen_model, endpoints /tts, /qwen/status)
  - `python_service/requirements.txt` (piper-tts, onnxruntime, transformers, torch)
  - `start_all.bat` (startup parameters, QWEN_LIFECYCLE_MODE)
  - `app/api/dictation/...` and frontend pages (`app/teacher/dictation/page.tsx`, `components/student/student-grade-detail-modal.tsx`, `app/student/page.tsx`)
- **Key findings**:
  - Piper `SynthesisConfig` supports `length_scale`, `noise_scale`, `noise_w_scale`.
  - Punctuation cues need single-pass tokenized regex to prevent recursive replacement.
  - Windows `GlobalMemoryStatusEx` and Linux `/proc/meminfo` verified for 650MB RAM check.
  - Qwen currently stays resident without an unload method; needs `unload_qwen_model()` in `finally` block and `QWEN_LIFECYCLE_MODE=on_demand_unload`.
  - SHA-256 LRU cache for direct prosody delivers `< 1ms` lookup with zero RAM.
- **Unexplored areas**: None for this survey phase.

## Key Decisions Made
- Formulated single-pass regex replacement algorithm for spoken punctuation.
- Structured exact schemas and fallback logic for `POST /qwen/extract-sgk` and `POST /qwen/direct-prosody`.
- Defined full specification in `survey_python.md` and summarized in `handoff.md`.

## Artifact Index
- `DISPATCH.md` — Inbound instruction record
- `progress.md` — Liveness and step tracking
- `survey_python.md` — Comprehensive analysis and proposed design specifications
- `handoff.md` — 5-component handoff report
