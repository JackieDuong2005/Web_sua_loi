## 2026-10-18T19:47:38Z
You are the Remediation Worker for Milestone 1 (Iteration 2).

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md`.
- Read the Iteration 2 Explorers' analysis and handoffs:
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_it2_1\analysis.md` (Regex & tokenization blueprints)
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_it2_2\analysis.md` (Wave zero-frame audio blueprints)
  * `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_it2_3\analysis.md` (Holistic synthesis and test suite)

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m1_it2`

File Ownership:
You EXCLUSIVELY own `python_service/tts_engine.py`. Do NOT touch any other file in this milestone.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks in `python_service/tts_engine.py`:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Apply the Regex Remediation designed by Explorer 1 and Explorer 3 in `inject_pedagogical_punctuation`:
   - Balance `[ \t]*` horizontal whitespace boundaries on `_CUE_PATTERN` and `_ELLIPSIS` so whitespace is not stolen by `_PUNCTUATION`.
   - Use non-capturing group `(?:\.{2,}|…)` for `_ELLIPSIS`.
   - Update `_ABBREVIATION` with lookahead `r'\b(?:[A-Za-zĐđĂăÂâÊêÔôƠơƯư]{1,4}\.)+(?:\s*[A-Za-zĐđĂăÂâÊêÔôƠơƯư]{1,4}\.?)*'` to protect `TP. HCM`.
   - Pre-collapse atomic repeated punctuation clusters (`!`, `?`, `,`, `:`) before the main regex pass.
   - Return clean token boundaries in `_repl`: `f"{cue.strip()} "`.
   - Guarantee 100% mathematical idempotency: $f(f(x)) == f(x)$ on any arbitrary punctuation sequence.
3. Apply the Wave Audio Remediation designed by Explorer 2 and Explorer 3 in `synthesize_wav`:
   - In `with wave.open(wav_io, "wb") as wav_file:`, pre-initialize audio format:
     `wav_file.setnchannels(1)`
     `wav_file.setsampwidth(2)`
     `wav_file.setframerate(22050)`
   - Catch `wave.Error` safely.
   - If after synthesis `wav_io.tell() <= 44` (or zero frames were written for non-phonemic input), return a valid silent WAV buffer (0.25s or 0.3s standard 22050Hz Mono PCM 16-bit) via `_generate_silence_wav`.
4. Verification:
   - Run `python tests/test_adversarial_punctuation.py`: verify that all tests pass (0 failures).
   - Run `python python_service/tests/test_adversarial_tts.py`: verify all parameter, diversity, and concurrency tests pass.
   - Verify that baseline acceptance criteria still pass: `synthesize_wav` with `warm_story` and `read_punctuation=True` generates valid WAV bytes > 10,000 bytes.
5. Document all changes and verification outputs in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m1_it2\handoff.md`.
6. Send completion message to parent.
