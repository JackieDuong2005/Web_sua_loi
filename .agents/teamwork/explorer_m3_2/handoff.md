# HANDOFF REPORT: EXPLORER 2 (MILESTONE 3: QWEN DIRECTOR BFF ROUTE)

## 1. OBSERVATION

- **Existing App Routing & Dictation Routes**:
  Direct inspection via `find_by_name` in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\app\api\dictation` showed the following route directories:
  * `generate/route.ts`
  * `passages/route.ts`
  * `play-local/route.ts`
  * `sessions/route.ts`
  * `tts/route.ts`
  * `voices/route.ts`
  Directory `app/api/dictation/qwen-director` currently does not exist.

- **Upstream Qwen Director Endpoints in Python Core (`python_service/main.py`)**:
  * Line 2250-2273:
    ```python
    @app.get("/qwen/status")
    async def qwen_status_endpoint():
        ...
        return {
            "enabled": ENABLE_QWEN_SLM,
            "model_id": QWEN_MODEL_ID,
            "is_loaded": is_loaded,
            "lifecycle_mode": QWEN_LIFECYCLE_MODE,
            "available_ram_mb": avail_ram,
            "ram_threshold_mb": QWEN_RAM_THRESHOLD_MB,
            "cache_entries": cache_len,
            "memory_mode": "zero_idle_ram",
            "precision": QWEN_PRECISION,
            "quantized": QWEN_PRECISION in ("bfloat16", "bf16", "int8", "qint8"),
            "device": "cuda" if has_cuda else "cpu",
            "description": "Tầng 2: SLM Pedagogical Paraphraser & Prosody Director (Qwen2.5-0.5B-Instruct)",
        }
    ```
  * Line 2280-2374:
    ```python
    class ExtractSGKRequest(BaseModel):
        raw_text: str
        grade: Optional[int] = 3

    @app.post("/qwen/extract-sgk")
    async def extract_sgk_endpoint(req: ExtractSGKRequest):
        ...
        return {
            "title": title or "Bài đọc chính tả",
            "clean_content": clean_content,
            "difficultWords": difficult_words,
            "summary": summary,
            "source": source,
            "ram_unloaded": True
        }
    ```
  * Line 2384-2432:
    ```python
    class DirectProsodyRequest(BaseModel):
        passage: str
        difficult_words: Optional[Union[List[str], str]] = []
        grade: Optional[int] = 3
        chunk_mode: Optional[str] = "phrase"

    @app.post("/qwen/direct-prosody")
    async def direct_prosody_endpoint(req: DirectProsodyRequest):
        ...
        return {
            "clauses": script["clauses"],
            "total_words": script["total_words"],
            "estimated_duration_sec": script["estimated_duration_sec"],
            "cache_hit": False,
            "ram_unloaded": True
        }
    ```

- **Next.js Service URL Pattern**:
  Inspection across existing routes in `app/api/` (`app/api/mobile/grade/route.ts:176`, `app/api/grade/route.ts:715`, `app/api/dictation/generate/route.ts:5`) revealed the standard definition:
  `const VIT5_SERVICE_URL = (process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")`
  This prevents Node.js 18+ from resolving `localhost` to IPv6 `::1` while uvicorn listens on IPv4.

- **Current TypeScript Baseline**:
  Running `npx tsc --noEmit` on the current repository completed with exit code 0 and 0 errors.

---

## 2. LOGIC CHAIN

1. *From Observation 1 (route does not exist yet)*:
   The Worker must create a new directory `app/api/dictation/qwen-director` and a new file `route.ts`.
2. *From Observation 2 (`/qwen/status` upstream schema)*:
   `GET` handler must proxy to `${VIT5_SERVICE_URL}/qwen/status`. It requires a 10s timeout (`AbortSignal.timeout(10000)`). If Python service is offline or unreachable, returning HTTP 200 `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true }` ensures frontend components (such as header status badge in Dictation view) gracefully display an offline indicator without triggering uncaught exceptions or error toasts.
3. *From Observation 2 (`/qwen/extract-sgk` and `/qwen/direct-prosody` upstream schemas)*:
   `POST` handler must inspect `body.action`:
   - If `action === "extract_sgk"`: Validate `body.raw_text`. If empty/invalid, return HTTP 400. Otherwise, forward `{ raw_text: body.raw_text.trim(), grade: Number(body.grade) || 3 }` to `POST ${VIT5_SERVICE_URL}/qwen/extract-sgk` with `AbortSignal.timeout(30000)`. Return `{ success: true, data: result, ...result }`.
   - If `action === "direct_prosody"`: Validate `body.passage`. If empty/invalid, return HTTP 400. Otherwise, forward `{ passage: body.passage.trim(), difficult_words: body.difficult_words || [], grade: Number(body.grade) || 3, chunk_mode: body.chunk_mode || "phrase" }` to `POST ${VIT5_SERVICE_URL}/qwen/direct-prosody` with `AbortSignal.timeout(30000)`. Return `{ success: true, data: result, ...result }`.
   - If `body.action` is anything else: Return HTTP 400 with message stating that only `extract_sgk` and `direct_prosody` are accepted.
4. *From Observation 3 (URL resolution & timeouts)*:
   On Raspberry Pi 4, cold-loading Qwen 2.5 on-demand from storage takes up to 10-15s on cache miss. A 30s timeout guard (`AbortSignal.timeout(30000)`) guarantees sufficient runway for cold start without prematurely timing out, while returning HTTP 504 if upstream exceeds 30s.
5. *From Observation 4 (TypeScript compilation)*:
   Writing `app/api/dictation/qwen-director/route.ts` with explicit type annotations using standard `NextRequest` and `NextResponse` will maintain the clean exit code 0 status for `npx tsc --noEmit`.

---

## 3. CAVEATS

- **Dual Return Structure**: The response includes `{ success: true, data: result, ...result }` to remain 100% compatible both with callers expecting `res.data` (per prompt specification) and callers directly destructuring top-level keys like `res.clauses` or `res.title` (per `api_specs.md`).
- **Python Service Offline Execution**: In environments where Python service is not running locally (e.g. CI runner), GET returns HTTP 200 with `{ offline: true }`, and POST returns HTTP 503. Tests testing live extraction require `python_service/main.py` running on `:8000`.

---

## 4. CONCLUSION

- The design for `app/api/dictation/qwen-director/route.ts` is fully specified, verified against upstream Python endpoints, and ready for the Worker to create.
- The complete, copy-paste-ready implementation is documented in Section 5 of `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_2\analysis.md`.
- No source files were modified during this investigation (strict compliance with read-only explorer mandate).

---

## 5. VERIFICATION METHOD

1. **Worker Implementation Verification**:
   Inspect that `app/api/dictation/qwen-director/route.ts` is created with the exact recommended code from `analysis.md`.

2. **TypeScript Compilation Check**:
   Run in PowerShell:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, 0 errors.

3. **HTTP Endpoint Verification (via curl or node script)**:
   - **GET Status Check**:
     ```powershell
     curl -s http://localhost:3000/api/dictation/qwen-director
     ```
     *Expected*: JSON response containing `enabled`, `model_id`, `is_loaded`, `lifecycle_mode`, `available_ram_mb`, `cache_entries`, `memory_mode`. (If offline: `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true }`).
   - **POST Invalid Action Check**:
     ```powershell
     curl -s -X POST http://localhost:3000/api/dictation/qwen-director -H "Content-Type: application/json" -d "{\"action\": \"invalid\"}"
     ```
     *Expected*: HTTP 400 with `{ "success": false, "error": "Hành động 'invalid' không hợp lệ..." }`.
   - **POST extract_sgk Validation Check**:
     ```powershell
     curl -s -X POST http://localhost:3000/api/dictation/qwen-director -H "Content-Type: application/json" -d "{\"action\": \"extract_sgk\", \"raw_text\": \"\"}"
     ```
     *Expected*: HTTP 400 with `{ "success": false, "error": "Văn bản thô không được để trống..." }`.
   - **POST direct_prosody Validation Check**:
     ```powershell
     curl -s -X POST http://localhost:3000/api/dictation/qwen-director -H "Content-Type: application/json" -d "{\"action\": \"direct_prosody\", \"passage\": \"\"}"
     ```
     *Expected*: HTTP 400 with `{ "success": false, "error": "Đoạn văn không được để trống..." }`.
