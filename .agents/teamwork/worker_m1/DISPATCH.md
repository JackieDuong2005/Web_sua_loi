## 2026-10-18T19:21:59Z
You are the Worker for Milestone 1: Expressive Piper VITS Engine & Spoken Punctuation.

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 1 section).
- Read the 3 Explorers' analysis files for exact implementation blueprints:
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_1\analysis.md`
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_2\analysis.md`
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_3\analysis.md`

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m1`

File Ownership:
You EXCLUSIVELY own `python_service/tts_engine.py`. Do NOT edit any other file in this milestone.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks in `python_service/tts_engine.py`:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Define `PROSODY_STYLE_PRESETS`:
   - `warm_story`: noise_scale=0.78, noise_w_scale=0.90, length_multiplier=1.05
   - `standard`: noise_scale=0.667, noise_w_scale=0.80, length_multiplier=1.00
   - `emphasis`: noise_scale=0.58, noise_w_scale=0.72, length_multiplier=1.20
   - `question`: noise_scale=0.82, noise_w_scale=0.92, length_multiplier=1.08
3. Implement `inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str`:
   - Replace punctuation with Vietnamese dictation cues:
     * `,` -> `, phẩy,`
     * `.` -> `, chấm.`
     * `?` -> `, chấm hỏi.`
     * `!` -> `, chấm than.`
     * `:` -> `, hai chấm,`
   - Use single-pass tokenized regex (as designed in Explorer 2's analysis) to guarantee idempotence and avoid recursive replacement or corrupting decimals (`9.5`), ellipses (`...`), and timestamps.
4. Implement `resolve_prosody_params` on `OfflineTTSEngine` to compute composite `length_scale`, map `noise_w` to `noise_w_scale`, and resolve overrides.
5. Update `synthesize_wav` and `play_on_local_speaker` signatures:
   - Accept `style: str = "standard"`, `noise_scale: Optional[float] = None`, `noise_w: Optional[float] = None`, `read_punctuation: bool = False`, and `**kwargs`.
   - Run `normalize_vietnamese_text` first, then `inject_pedagogical_punctuation` if `read_punctuation=True`.
   - Pass `SynthesisConfig(length_scale=..., noise_scale=..., noise_w_scale=...)` into `voice.synthesize_wav`.
6. Verification:
   - Run actual Python tests demonstrating:
     a) `synthesize_wav` with `style="warm_story"` and `read_punctuation=True` generates valid WAV bytes > 10,000 bytes.
     b) Idempotence of `inject_pedagogical_punctuation`.
     c) All 4 styles produce distinct valid audio outputs.
7. Write your changes and verification logs to `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m1\handoff.md`.
8. Send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
