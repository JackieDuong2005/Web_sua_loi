# BRIEFING — 2026-10-18T19:20:00Z

## Mission
Analyze spoken pedagogical punctuation requirements, regex safety, edge case handling, and whitespace/boundary preservation for Piper VITS in `python_service/tts_engine.py` (Milestone 1).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_2
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Milestone 1: Expressive Piper VITS Engine & Spoken Punctuation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID — Dùng ASCII hoặc bảng Markdown (tuân thủ GEMINI.md)
- Follow Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method)
- Output findings in analysis.md and handoff.md, notify caller via send_message

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T19:20:00Z

## Investigation State
- **Explored paths**: `python_service/tts_engine.py`, `python_service/main.py`, `models/tts/vi_VN-vais1000-medium.onnx*`, `ORIGINAL_REQUEST.md`, `PROJECT.md`
- **Key findings**:
  * Comma phoneme ID 8 and period phoneme ID 10 in Piper VITS trigger essential espeak pause states (~150ms for comma, ~350-500ms for period).
  * Replacing `,` -> `, phẩy, `, `.` -> `, chấm. `, `?` -> `, chấm hỏi. `, `!` -> `, chấm than. `, `:` -> `, hai chấm, ` produces natural pedagogical dictation pacing.
  * Single-pass regex lexer matching existing cues, decimals (`9.5`, `8,5`), timestamps (`08:30`), ratios (`2:1`), ellipses (`...`, `…`), and abbreviations (`TP.HCM`) guarantees 100% idempotence and prevents double-substitution.
  * `normalize_vietnamese_text` must precede `inject_pedagogical_punctuation` to allow acronym expansion (`tr.` -> `trang`) without breaking.
  * Horizontal whitespace `[ \t]*` must be used instead of `\s*` to preserve newlines `\n` across multi-line dictation passages.
  * Verified synthesis with `warm_story` and `read_punctuation=True` produces 153,132 bytes (> 10,000 bytes acceptance threshold).
- **Unexplored areas**: None for Explorer 2 scope.

## Key Decisions Made
- Designed and verified single-pass regex lexer for `inject_pedagogical_punctuation`.
- Established pipeline ordering: `normalize_vietnamese_text` -> `inject_pedagogical_punctuation`.
- Documented complete Python implementation and 15-case verification matrix in `analysis.md` and `handoff.md`.

## Artifact Index
- DISPATCH.md — Received dispatch message from parent
- BRIEFING.md — Persistent situational awareness
- progress.md — Liveness heartbeat
- analysis.md — Detailed technical analysis and recommendations
- handoff.md — 5-component handoff report
