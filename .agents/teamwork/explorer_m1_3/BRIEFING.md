# BRIEFING — 2026-10-18T19:21:55Z

## Mission
Investigate Python TTS engine (`python_service/tts_engine.py` and callers in `python_service/main.py`) for Milestone 1: Expressive Piper VITS Engine & Spoken Punctuation, ensuring backward compatibility, parameter mapping (style, noise_scale, noise_w, read_punctuation), local playback handling, and verification test strategy.

## 🔒 My Identity
- Archetype: explorer
- Roles: Investigation, Synthesis
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_3
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Milestone 1: Expressive Piper VITS Engine & Spoken Punctuation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
- Write only to working directory `.agents/teamwork/explorer_m1_3/`
- Ensure backward compatibility for `synthesize_wav` and `play_on_local_speaker`

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T19:21:55Z

## Investigation State
- **Explored paths**: `python_service/tts_engine.py`, `python_service/main.py` (callers at 1758 and 1799), `ORIGINAL_REQUEST.md`, `orchestrator_4/PROJECT.md`, `explorer_m1_1/` and `explorer_m1_2/` analyses.
- **Key findings**:
  - `synthesize_wav` and `play_on_local_speaker` can accept new parameters with defaults (`style="standard"`, `noise_scale=None`, `noise_w=None`, `read_punctuation=False`, `**kwargs`), guaranteeing 100% backward compatibility for all existing callers in `main.py`.
  - Piper's `SynthesisConfig` expects `noise_w_scale` while REST APIs use `noise_w`. `resolve_prosody_params` reconciles both seamlessly.
  - `inject_pedagogical_punctuation` must execute after `normalize_vietnamese_text` to prevent corrupting abbreviations like `tr. 15`.
  - Local speaker playback via `play_on_local_speaker` safely forwards all expressive parameters to `synthesize_wav`, uses `winsound` on Windows and `aplay` on Linux, with guaranteed tempfile cleanup in `finally`.
  - Synthetic test command verified on local machine, producing >150,000 bytes valid WAV audio.
- **Unexplored areas**: None for M1 scope.

## Key Decisions Made
- Reconciled Explorer 1 and Explorer 2 findings into unified architecture in `analysis.md`.
- Produced 5-component self-contained Hard handoff in `handoff.md`.

## Artifact Index
- `DISPATCH.md` — Log of incoming instructions
- `BRIEFING.md` — Agent working memory
- `progress.md` — Heartbeat and status
- `analysis.md` — Detailed technical findings and implementation guide for Worker M1
- `handoff.md` — Formal 5-component handoff report
