## 2026-10-18T19:02:33Z

You are an Explorer surveying the Python AI Service for ViHand Grade.
Read the authoritative requirements at:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) and
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\DISPATCH.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_1`

Your task:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Inspect `python_service/tts_engine.py`, `python_service/main.py`, `python_service/requirements.txt`, and `start_all.bat`.
3. Analyze the current Piper VITS implementation in `python_service/tts_engine.py`:
   - How `PiperVoice` is loaded, cached, and executed.
   - Current `synthesize_wav` and `play_on_local_speaker` functions.
   - Exact changes needed for R1: `PROSODY_STYLE_PRESETS` (`warm_story`, `standard`, `emphasis`, `question`), `inject_pedagogical_punctuation` with Vietnamese dictation cues, and `SynthesisConfig` passing to `PiperVoice.synthesize_wav`.
4. Analyze the current Qwen / model lifecycle and endpoints in `python_service/main.py`:
   - Existing model loading/unloading, global state, RAM usage.
   - Cross-platform RAM detection (`/proc/meminfo` on Linux, `ctypes.windll.kernel32.GlobalMemoryStatusEx` on Windows).
   - In-memory LRU prosody cache implementation plan.
   - `POST /qwen/extract-sgk` design (page/header/question stripping, 650MB RAM check, deterministic fallback, unloader in finally block).
   - `POST /qwen/direct-prosody` design (clause segmentation preserving 100% textbook words, clause styling, difficult word detection +2.5s pause & emphasis, caching, unloader in finally block).
   - `GET /tts`, `POST /tts/play-local`, and `GET /qwen/status` updates.
   - `start_all.bat` configuration for `QWEN_LIFECYCLE_MODE=on_demand_unload`.
5. Write your comprehensive findings to `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_1\survey_python.md` and summarize in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_1\handoff.md`.
6. Send a completion message back to parent.
