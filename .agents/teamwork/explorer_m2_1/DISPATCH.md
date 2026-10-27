## 2026-10-18T20:01:04Z
You are Explorer 1 for Milestone 2: Qwen2.5 Staged On-Demand Lifecycle & RAM Guard.

Authoritative source of truth:
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-18T18:59:10Z`) before starting work.
- Read `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md` (Milestone 2 section).
- Read the survey report: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_1\survey_python.md`.

Your working directory is:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m2_1`

Task:
1. Initialize BRIEFING.md and progress.md in your working directory.
2. Inspect `python_service/main.py` lines 918-993 and `start_all.bat`:
   - Design `QWEN_LIFECYCLE_MODE` defaulting to `"on_demand_unload"` (set in Python and in `start_all.bat`).
   - Implement cross-platform RAM detection `get_available_ram_mb() -> float`:
     * On Linux/Raspberry Pi: parse `/proc/meminfo` reading `MemAvailable:` in kB and converting to MB.
     * On Windows: call `ctypes.windll.kernel32.GlobalMemoryStatusEx` reading `ullAvailPhys` in bytes and converting to MB.
     * Fallback to `psutil.virtual_memory().available / (1024*1024)` if available.
   - Design `unload_qwen_model() -> None`:
     * Global `_qwen_model = None`, `_qwen_tokenizer = None`.
     * If torch cuda is available: `torch.cuda.empty_cache()`.
     * Call `gc.collect()` 3 times.
     * Guarantee 0 MB RAM consumption when idle.
3. Recommend exact code implementation strategy for Worker. Do NOT edit source files yourself.
4. Write report to `analysis.md` and `handoff.md`.
5. Send completion message to parent.

Remember:
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
