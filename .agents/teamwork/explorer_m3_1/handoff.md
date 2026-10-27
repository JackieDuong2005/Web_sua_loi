# Báo Cáo Chuyển Giao (Handoff Report): Milestone 3 - Next.js BFF TTS Routes

**Agent**: Explorer M3-1 (`explorer_m3_1`)  
**Recipient**: Parent Orchestrator (`0516b259-befc-4fac-baa8-b10ce65a612b`) / Worker M3  
**Target Files**:
- `app/api/dictation/tts/route.ts`
- `app/api/dictation/play-local/route.ts`

---

## 1. OBSERVATION

1. **`app/api/dictation/tts/route.ts` (Lines 13-44)**:
   ```typescript
   13:     const { searchParams } = new URL(req.url)
   14:     const text = searchParams.get("text")
   15:     const voice = searchParams.get("voice") || "vi_VN-vais1000-medium"
   16:     const rate = searchParams.get("rate") || "-15%"
   ...
   23:     const edgeUrl = `${VIT5_SERVICE_URL}/tts?text=${encodeURIComponent(trimmedText)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}`
   ...
   38:         return new NextResponse(audioBuffer, {
   39:           headers: {
   40:             "Content-Type": contentType,
   41:             "Cache-Control": "public, max-age=86400, s-maxage=86400",
   42:             "X-TTS-Engine": "Piper-VITS-ONNX-Offline-RPi",
   43:           },
   44:         })
   ```
   Direct observation: Route currently only extracts `text`, `voice`, and `rate`. It drops `style`, `noise_scale`, `noise_w`, and `read_punctuation`. It does not propagate `X-TTS-Style` from the backend response header.

2. **`app/api/dictation/play-local/route.ts` (Lines 12-28)**:
   ```typescript
   12:     const body = await req.json()
   13:     const { text, voice = "vi_VN-vais1000-medium", rate = "-15%" } = body
   ...
   22:     const res = await fetch(`${VIT5_SERVICE_URL}/tts/play-local`, {
   23:       method: "POST",
   24:       headers: { "Content-Type": "application/json" },
   25:       body: JSON.stringify({ text, voice, rate }),
   26:       signal: controller.signal,
   27:     })
   ```
   Direct observation: Route only parses and forwards `text`, `voice`, and `rate`. It ignores `style`, `noise_scale`, `noise_w`, and `read_punctuation`. The catch block does not distinguish `AbortError` (timeout 504) from network errors (502).

3. **Python AI Service Endpoint `GET /tts` (`python_service/main.py:2151-2192`)**:
   ```python
   2151: @app.get("/tts")
   2152: async def tts_endpoint(
   2153:     text: str,
   2154:     voice: Optional[str] = "vi_VN-vais1000-medium",
   2155:     rate: Optional[str] = "-15%",
   2156:     style: Optional[str] = "standard",
   2157:     noise_scale: Optional[float] = None,
   2158:     noise_w: Optional[float] = None,
   2159:     read_punctuation: Optional[bool] = False,
   2160: ):
   ...
   2186:             headers={
   2187:                 "Content-Type": "audio/wav",
   2188:                 "Cache-Control": "public, max-age=86400, s-maxage=86400",
   2189:                 "X-TTS-Engine": "Piper-VITS-ONNX-Offline",
   2190:                 "X-TTS-Style": style or "standard",
   2191:             },
   ```
   Direct observation: Python endpoint expects all 7 parameters and returns `X-TTS-Engine` and `X-TTS-Style` headers.

4. **Python AI Service Endpoint `POST /tts/play-local` (`python_service/main.py:2141-2244`)**:
   ```python
   2141: class LocalPlayRequest(BaseModel):
   2142:     text: str
   2143:     voice: Optional[str] = "vi_VN-vais1000-medium"
   2144:     rate: Optional[str] = "-15%"
   2145:     style: Optional[str] = "standard"
   2146:     noise_scale: Optional[float] = None
   2147:     noise_w: Optional[float] = None
   2148:     read_punctuation: Optional[bool] = False
   ...
   2236:         return {
   2237:             "status": "ok" if success else "error",
   2238:             "device": "local_speaker",
   2239:             "success": success,
   2240:             "message": "Đã phát ra loa cục bộ thiết bị" if success else "Lỗi khi phát ra loa",
   2241:             "length_scale": prosody["length_scale"],
   2242:             "noise_scale": prosody["noise_scale"],
   2243:             "noise_w_scale": prosody["noise_w_scale"],
   2244:         }
   ```
   Direct observation: Endpoint accepts all 7 fields in JSON body and returns calculated acoustic metrics (`length_scale`, `noise_scale`, `noise_w_scale`).

5. **Baseline Verification Result**:
   Running `npx tsc --noEmit` exited with code 0 (zero errors).

---

## 2. LOGIC CHAIN

1. **Step 1 (Observation 1 & 3)**:
   - Observation 1 shows `app/api/dictation/tts/route.ts` only extracts and forwards `text`, `voice`, and `rate`.
   - Observation 3 shows Python backend `/tts` requires and processes `style`, `noise_scale`, `noise_w`, and `read_punctuation`, and emits `X-TTS-Style`.
   - Inférence: The BFF gateway currently truncates the expressive capabilities built in Milestone 1 & 2. Clients requesting `style=warm_story` or `read_punctuation=true` receive default standard audio without spoken punctuation cues.
   - Conclusion for Step 1: `app/api/dictation/tts/route.ts` must parse all 7 query parameters, construct the backend URL using `URLSearchParams`, and forward `X-TTS-Style` and `X-TTS-Engine` in its response headers.

2. **Step 2 (Observation 2 & 4)**:
   - Observation 2 shows `app/api/dictation/play-local/route.ts` only reads and posts `{ text, voice, rate }`.
   - Observation 4 shows Python backend `LocalPlayRequest` accepts `style`, `noise_scale`, `noise_w`, `read_punctuation` and responds with `length_scale`, `noise_scale`, `noise_w_scale`.
   - Inférence: Hardware speaker playback on Raspberry Pi fails to receive acoustic parameters, preventing classroom dictation from utilizing `emphasis` or `warm_story` styles.
   - Conclusion for Step 2: `app/api/dictation/play-local/route.ts` must parse the full JSON body, forward all 7 fields to `${VIT5_SERVICE_URL}/tts/play-local`, and return the full JSON response.

3. **Step 3 (Timeout & Fault Tolerance)**:
   - Piper VITS on Raspberry Pi 4 under heavy load or cold cache can take 2-5 seconds for synthesis. If an unexpected hang occurs, an unhandled abort results in an uncaught generic error.
   - Setting a 15s-20s `AbortController` timeout and distinguishing `err.name === "AbortError"` (504 Gateway Timeout) from network unreachable errors (502/503) ensures the frontend receives precise status codes for user toasts.

---

## 3. CAVEATS

1. `app/api/dictation/qwen-director/route.ts`: This multiplexer route is part of Milestone 3 Feature F11. This handoff report strictly focuses on the TTS routes (`/api/dictation/tts` and `/api/dictation/play-local`) as scoped by the orchestrator dispatch.
2. Hardware audio output on Raspberry Pi (`/tts/play-local`): In test environments without physical audio speakers (ALSA/aplay) or without active Windows audio devices, `play-local` will return HTTP 500/502 from Python backend, which the BFF correctly relays.
3. No other caveats.

---

## 4. CONCLUSION

The implementation strategy for Worker is fully formulated and detailed in `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_1\analysis.md`.
The Worker should apply the complete proposed code for:
1. `app/api/dictation/tts/route.ts` (Section 5.1 of `analysis.md`)
2. `app/api/dictation/play-local/route.ts` (Section 5.2 of `analysis.md`)

Both implementations are pure TypeScript, use native standard Web APIs (`URLSearchParams`, `AbortController`, `fetch`, `NextResponse`), require zero additional npm packages, and maintain 100% backward compatibility with existing callers.

---

## 5. VERIFICATION METHOD

1. **Static Analysis & Type Checking**:
   ```powershell
   npx tsc --noEmit
   ```
   Invalidation condition: Any TypeScript compiler error.
2. **Next.js Production Build**:
   ```powershell
   npm run build
   ```
   Invalidation condition: Build failure or route export error.
3. **Inspect Route Header & Query Handling**:
   Verify `app/api/dictation/tts/route.ts`:
   - Checks `noise_scale`, `noise_w`, `style`, `read_punctuation` in `searchParams`.
   - Propagates `X-TTS-Style` and `X-TTS-Engine`.
   Verify `app/api/dictation/play-local/route.ts`:
   - Passes `style`, `noise_scale`, `noise_w`, `read_punctuation` in fetch body.
   - Returns 504 on `AbortError`, 502 on network failure.
