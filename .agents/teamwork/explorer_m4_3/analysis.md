# BÁO CÁO PHÂN TÍCH CHUYÊN SÂU — EXPLORER 3 (MILESTONE 4)
## Quản lý Vòng đời Audio (Audio Lifecycle), Xử lý Ngoại tuyến & Fallback, Tính Đồng nhất TypeScript và Chiến lược Kiểm thử Xác thực (Multi-Surface UI)

---

## 1. TỔNG QUAN & PHẠM VI NGHIÊN CỨU

Tài liệu này là kết quả điều tra và khảo sát chuyên sâu của **Explorer 3** phục vụ Milestone 4: **Multi-Surface Teacher & Student UI Integration** trong dự án **ViHand Grade**.
Nhiệm vụ trọng tâm gồm 4 trụ cột cốt lõi:
1. **Audio Lifecycle Management**: Thiết kế cơ chế điều khiển vòng đời `HTMLAudioElement` xuyên suốt 4 bề mặt giao diện, triệt tiêu hoàn toàn hiện tượng chồng lấn âm thanh (overlapping audio / race condition) khi người dùng click nhanh liên tiếp hoặc chuyển đổi giữa các nút đọc nhận xét và phát âm từ sửa lỗi.
2. **Offline & Fallback State Handling**: Xử lý triệt để các tình huống máy chủ AI Core Python (`:8000`) ngoại tuyến hoặc trả về lỗi HTTP 503/504, đảm bảo hiển thị Toast / Inline Alert thân thiện và tự động kích hoạt chế độ sư phạm tất định (deterministic fallback) mà không ném ra ngoại lệ JavaScript chưa bắt (unhandled rejection).
3. **TypeScript Interface Parity**: Đối soát và chuẩn hóa 100% các interface TypeScript (`ProsodyClause`, `QwenStatusState`, `AudioPlaybackOptions`, `QwenExtractSgkResponse`, `QwenDirectProsodyResponse`), bảo đảm tương thích tuyệt đối với Next.js 16.2.4 (Turbopack) và React 19 (`npx tsc --noEmit` đạt 0 lỗi).
4. **Verification Test Strategy**: Thiết kế chiến lược kiểm thử đa tầng (PStack / Lauren Tan) gồm kiểm thử tĩnh, kiểm thử tự động và các kịch bản kiểm thử hành vi thực tế (Rapid Clicking, Cross-Track Interruption, Modal Dismissal, Offline Resilience) cho Worker M4 và Reviewers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 BẢN ĐỒ KIẾN TRÚC VÒNG ĐỜI & GIAO DIỆN ĐA BỀ MẶT            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Surface 1: Teacher Dictation Cockpit (`app/teacher/dictation/page.tsx`)    │
│  - Live RAM/Piper Header Badge | SGK Extractor Dialog | Prosody Preview     │
│  - Step 3 Dynamic Loop: speakClause(clause, { style, rate, pause_sec })     │
│                                                                             │
│  Surface 2: Teacher Grading Studio (`app/teacher/grade/page.tsx`)           │
│  - "Nghe cô giáo đọc nhận xét" (warm_story)                                 │
│  - Nút phát âm chuẩn từ gợi ý sửa lỗi `c.suggestion` (emphasis)             │
│                                                                             │
│  Surface 3: Student Portal Dashboard (`app/student/page.tsx`)              │
│  - Hero Banner: "Nghe cô giáo nhận xét" (warm_story)                        │
│  - Sổ tay từ khó: Phát âm chuẩn từ cần rèn (emphasis)                       │
│                                                                             │
│  Surface 4: Student Grade Detail Modal (`student-grade-detail-modal.tsx`)   │
│  - Khối nhận xét TT27: "Nghe cô nhận xét" (warm_story)                      │
│  - Chi tiết từ sai & Bounding Box Canvas click: Phát âm chuẩn (emphasis)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   UNIFIED AUDIO LIFECYCLE CONTROLLER                        │
│  • Pause prior playback (`audio.pause()`)                                   │
│  • Reset source & buffer (`audio.src = ""`)                                 │
│  • Detach handlers (`audio.onended = null`, `audio.onerror = null`)         │
│  • Clear reference (`audioRef.current = null`)                              │
│  • Unmount cleanup & Dialog close synchronization                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              NEXT.JS BFF GATEWAY & PYTHON AI CORE RESILIENCE                │
│  • GET /api/dictation/qwen-director (status 200, offline: true fallback)    │
│  • POST /api/dictation/qwen-director (503/504 catch -> Rule-based fallback) │
│  • GET /api/dictation/tts (audio.onerror catch -> Friendly Toast/Alert)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. QUẢN LÝ VÒNG ĐỜI AUDIO (AUDIO LIFECYCLE MANAGEMENT)

### 2.1. Phân tích hiện trạng và lỗ hổng trên từng bề mặt

#### Surface 1: `app/teacher/dictation/page.tsx`
- **Hiện trạng quan sát**:
  - `currentAudioRef` được khai báo tại dòng 346: `const currentAudioRef = useRef<HTMLAudioElement | null>(null)`.
  - Hàm `stopPlayback` (dòng 481–504) có dừng `currentAudioRef.current.pause()`, gán `currentAudioRef.current.src = ""` và `currentAudioRef.current = null`.
- **Lỗ hổng & Nguy cơ**:
  1. Trong `speakClause` (dòng 577): Tạo `const audio = new Audio(ttsUrl)` và gán ngay `currentAudioRef.current = audio` **mà không hề kiểm tra hoặc dừng instance cũ** đang phát nếu `speakClause` được gọi liên tiếp.
  2. Trong `testVoiceSpecific` (dòng 878): Gán `currentAudioRef.current = audio` nhưng không gán handler `audio.onended = () => { currentAudioRef.current = null }`. Do đó khi âm thanh mẫu phát xong, ref vẫn trỏ tới đối tượng audio cũ đã kết thúc.
  3. Bổ sung tính năng mới trong M4 (nút "🔊 Nghe thử cụm này" trong bảng xem trước Prosody Script): Nếu giáo viên bấm nghe thử cụm #1 rồi lập tức bấm nghe thử cụm #2, nếu không có cơ chế dừng instance trước đó thì 2 luồng đọc sẽ phát đè lên nhau.

#### Surface 2: `app/teacher/grade/page.tsx`
- **Hiện trạng quan sát**:
  - Hoàn toàn **chưa có** đối tượng `audioRef` hay bất kỳ mã nguồn phát âm thanh nào.
- **Yêu cầu & Nguy cơ**:
  - Cần tích hợp 2 vị trí phát âm:
    1. Nhận xét của giáo viên (`teacherComment`) với `style=warm_story`.
    2. Danh sách lỗi chính tả (`c.suggestion`) với `style=emphasis` ở cả 2 chế độ hiển thị (Stacked Layout dòng 1076–1106 và Side-by-side Grid dòng 1185–1217).
  - Nguy cơ: Nếu giáo viên bấm nghe nhận xét dài rồi lập tức click vào một từ gợi ý sửa lỗi trong bảng, nếu không dùng chung một ref quản lý âm thanh duy nhất (`audioRef`), 2 giọng đọc sẽ cùng vang lên, gây ồn ào và mất tập trung.

#### Surface 3: `app/student/page.tsx`
- **Hiện trạng quan sát**:
  - Dòng 65: Khai báo `const audioRef = useRef<HTMLAudioElement | null>(null)`.
  - Dòng 67–76:
    ```typescript
    const playAudio = (text: string) => {
      if (!text) return
      if (audioRef.current) audioRef.current.pause()
      setPlayingWord(text)
      const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
      audioRef.current = audio
      audio.onended = () => setPlayingWord(null)
      audio.onerror = () => setPlayingWord(null)
      audio.play().catch(() => setPlayingWord(null))
    }
    ```
- **Lỗ hổng & Nguy cơ**:
  1. Khi `audioRef.current.pause()` được gọi, nó **không** reset `.src = ""` và **không** tháo gỡ các listener cũ (`onended`, `onerror`). Các sự kiện cũ có thể bắn trễ và gây sai lệch state `playingWord`.
  2. Trang `app/student/page.tsx` **hoàn toàn không có cleanup trong `useEffect`**. Nếu học sinh bấm nghe từ khó rồi bấm chuyển tab / link trang khác, audio vẫn tiếp tục phát ngầm trong trình duyệt.
  3. Đang dùng giọng `vi-VN-HoaiMyNeural` cũ. Cần nâng cấp sang Piper VITS `voice=vi_VN-vais1000-medium&style=emphasis`.
  4. Thiếu nút nghe nhận xét tại Hero Banner (`style=warm_story`). Cần hợp nhất state `playingAudioId: string | null` để phân biệt đang phát nhận xét hay từ vựng.

#### Surface 4: `components/student/student-grade-detail-modal.tsx`
- **Hiện trạng quan sát**:
  - Dòng 118: Khai báo `const audioRef = useRef<HTMLAudioElement | null>(null)`.
  - Dòng 146–152: Có cleanup trong `useEffect`:
    ```typescript
    useEffect(() => {
      return () => {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }
      }
    }, [grade])
    ```
  - Dòng 234–243: Hàm `playAudio(text)` dùng `vi-VN-HoaiMyNeural`.
  - Dòng 329: Truyền `onPlayAudio={playAudio}` xuống `<StudentBoundingBoxCanvas />`.
- **Lỗ hổng & Nguy cơ**:
  1. `useEffect` cleanup chỉ phụ thuộc `[grade]`, **không phụ thuộc `open`**. Khi người dùng bấm dấu [X] đóng modal hoặc bấm ra ngoài overlay, `open` chuyển thành `false` nhưng component Modal vẫn tồn tại trong DOM ảo của Radix UI Dialog. Do đó, âm thanh đang phát sẽ **tiếp tục kêu** kể cả sau khi modal đã biến mất khỏi màn hình!
  2. Bấm liên tục vào các Bounding Box trên ảnh bài thi thật (canvas) sẽ kích hoạt `onPlayAudio` liên tục. Cần ngắt âm thanh cũ tức thì trước khi khởi tạo âm thanh từ mới.

---

### 2.2. Chuẩn Thiết Kế Bộ Điều Khiển Vòng Đời Audio (Unified Safe Audio Controller)

Để loại trừ 100% nguy cơ chồng lấn âm thanh và rò rỉ bộ nhớ, Worker M4 bắt buộc phải áp dụng quy trình 5 bước dọn dẹp âm thanh chuẩn mực sau đây trên cả 4 bề mặt:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  QUY TRÌNH 5 BƯỚC DỌN DẸP AUDIO AN TOÀN                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. audio.pause(): Tạm dừng phát luồng dữ liệu ngay lập tức                │
│  2. audio.onended = null, audio.onerror = null: Tháo gỡ mọi callback        │
│  3. audio.src = "": Giải phóng bộ nhớ đệm giải mã âm thanh của trình duyệt   │
│  4. audio.load(): Ép trình duyệt hủy kết nối HTTP / stream đang mở          │
│  5. audioRef.current = null: Hủy tham chiếu, sẵn sàng cho Garbage Collector  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Mẫu triển khai mã nguồn khuyến nghị (Copy-Paste Ready Pattern):

```typescript
// ─── SAFE AUDIO CLEANUP HELPER ──────────────────────────────────────────────
const stopActiveAudio = (audioRef: React.MutableRefObject<HTMLAudioElement | null>) => {
  if (audioRef.current) {
    try {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.src = ""
      audioRef.current.load()
    } catch (e) {
      // Bỏ qua lỗi ngắt audio không mong muốn của trình duyệt
    }
    audioRef.current = null
  }
}
```

#### Triển khai tại `app/teacher/dictation/page.tsx`:
Trong `speakClause`:
```typescript
const speakClause = (clause: string, sessionToken: number, options?: SpeakClauseOptions | string): Promise<boolean> => {
  return new Promise(resolve => {
    if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) {
      resolve(false)
      return
    }

    setIsSpeakingNow(true)
    const cleanupAndResolve = (success: boolean) => {
      setIsSpeakingNow(false)
      resolve(success)
    }

    // Luôn dừng audio cũ trước khi phát cụm mới
    stopActiveAudio(currentAudioRef)

    // ... chuẩn bị URL và phát ...
    const audio = new Audio(ttsUrl)
    currentAudioRef.current = audio

    audio.onended = () => {
      currentAudioRef.current = null
      cleanupAndResolve(true)
    }
    audio.onerror = () => {
      currentAudioRef.current = null
      handleAudioError("Không thể nạp âm thanh từ trạm TTS Raspberry Pi. Đảm bảo python_service đang chạy.")
      cleanupAndResolve(false)
    }
    audio.play().catch(err => {
      if (err.name !== "AbortError") {
        console.warn("Audio playback interrupted or blocked:", err)
      }
      currentAudioRef.current = null
      cleanupAndResolve(false)
    })
  })
}
```

#### Triển khai tại `components/student/student-grade-detail-modal.tsx`:
Bổ sung đồng bộ hóa khi Modal đóng (`open = false`):
```typescript
// Dọn dẹp audio khi unmount, đổi bài hoặc khi ĐÓNG MODAL
useEffect(() => {
  if (!open) {
    stopActiveAudio(audioRef)
    setPlayingText(null)
  }
  return () => {
    stopActiveAudio(audioRef)
    setPlayingText(null)
  }
}, [open, grade])
```

---

## 3. XỬ LÝ NGOẠI TUYẾN & FALLBACK (OFFLINE & FALLBACK STATE HANDLING)

### 3.1. Phân tích các kịch bản ngoại tuyến của Python AI Core (`:8000`)

| Thành phần gọi | Endpoint gọi | Trạng thái khi Core Offline | Hành vi hiện tại | Giải pháp chuẩn hóa Milestone 4 |
|---|---|---|---|---|
| **Header Status Polling** | `GET /api/dictation/qwen-director` | Trả về HTTP 200 `{ offline: true, available_ram_mb: 0 }` | Chưa có JSX hiển thị | Badge hiển thị `Qwen2.5: Ngoại tuyến (0MB RAM)` với chấm xám/hổ phách, không crash, không hiện NaN. |
| **Trích xuất SGK / PDF** | `POST /api/dictation/qwen-director (extract_sgk)` | Trả về HTTP 503 / 504 `{ error: "..." }` | Chưa có dialog | `try/catch` bắt lỗi, hiển thị Toast cảnh báo đỏ và giữ nguyên nội dung thô để cô giáo sửa tay. |
| **Đạo diễn Nhịp đọc** | `POST /api/dictation/qwen-director (direct_prosody)` | Trả về HTTP 503 / 504 `{ error: "..." }` | Chưa có nút bấm | Tự động chuyển về `splitIntoPedagogicalClauses` (Tất định), gán `style: standard`, hiện Toast vàng thông báo nhẹ nhàng. |
| **Phát âm thanh Web** | `GET /api/dictation/tts` | Trả về HTTP 503 `{ error: "..." }` | `audio.onerror` nuốt lỗi im lặng | Bắt `audio.onerror`, hiển thị Toast/Alert: "Trạm phát âm thanh ngoại tuyến chưa sẵn sàng (Port 8000)". |
| **Phát loa RPi AUX** | `POST /api/dictation/play-local` | Trả về HTTP 502 / 504 `{ error: "..." }` | Báo console.error | Hiển thị Toast thông báo lỗi loa phần cứng Raspberry Pi. |

### 3.2. Kiến trúc Toast & Inline Alert (Tránh lỗi Provider không tồn tại)

Khảo sát hệ thống cho thấy:
- File `components/ui/toaster.tsx` sử dụng hook `useToast` từ `@/hooks/use-toast`.
- File `components/ui/sonner.tsx` bọc thư viện `sonner`.
- Tuy nhiên, trong `app/layout.tsx`, **chưa có component `<Toaster />` nào được khai báo** ở cấp gốc!

#### Khuyến nghị giải pháp cho Worker M4:
1. **Khuyến nghị 1 (Cốt lõi toàn hệ thống)**: Khai báo `<Toaster />` (từ `@/components/ui/toaster` hoặc `@/components/ui/sonner`) vào `app/layout.tsx` (dòng 61, ngay trên thẻ `</body>`). Khi đó bất kỳ component nào trong dự án cũng có thể gọi `toast({ title, description, variant: "destructive" })` hoặc `toast.error(...)`.
2. **Khuyến nghị 2 (Tự phòng vệ tại chỗ - Self-Contained Inline Alert Fallback)**:
   Tại mỗi trang (`app/teacher/dictation/page.tsx`, `app/teacher/grade/page.tsx`, `app/student/page.tsx`, `student-grade-detail-modal.tsx`), duy trì một state thông báo lỗi nội bộ:
   ```typescript
   const [audioAlertMessage, setAudioAlertMessage] = useState<string | null>(null)
   ```
   Nếu `toast` không khả dụng hoặc bị che khuất bởi modal, một thanh thông báo nhỏ (Dismissible Alert Banner) màu hổ phách/đỏ nhạt sẽ tự động xuất hiện ở đỉnh hoặc cạnh nút bấm trong 5 giây rồi biến mất:
   ```tsx
   {audioAlertMessage && (
     <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs animate-in fade-in slide-in-from-top-1">
       <div className="flex items-center gap-2">
         <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
         <span>{audioAlertMessage}</span>
       </div>
       <button
         type="button"
         onClick={() => setAudioAlertMessage(null)}
         className="text-amber-600 hover:text-amber-900 p-0.5 rounded cursor-pointer"
       >
         ✕
       </button>
     </div>
   )}
   ```
   Điều này đảm bảo **100% không bao giờ gặp lỗi màn hình trắng** hoặc lỗi thiếu Context Provider.

### 3.3. Cơ chế Fallback Sư phạm Tất định (Deterministic Pedagogical Fallback)

Khi gọi API Đạo diễn Nhịp đọc:
```typescript
const handleDirectProsody = async () => {
  if (!passageText.trim()) return
  setIsDirectingProsody(true)
  try {
    const res = await fetch("/api/dictation/qwen-director", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "direct_prosody",
        passage: passageText,
        difficult_words: difficultWordsList,
        grade: parseInt(filterGrade, 10) || 3,
        chunk_mode: chunkMode,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.clauses && Array.isArray(data.clauses)) {
        setProsodyClauses(data.clauses)
        setStepStatusMessage("✅ Qwen2.5 đã hoàn tất đạo diễn nhịp điệu và xả RAM an toàn!")
        return
      }
    }
    throw new Error("Phản hồi không hợp lệ từ máy chủ AI")
  } catch (err: any) {
    console.warn("Qwen Director offline, applying deterministic fallback:", err)
    // TỰ ĐỘNG FALLBACK VỀ THUẬT TOÁN TẤT ĐỊNH
    const fallbackList = splitIntoPedagogicalClauses(passageText, chunkMode)
    const deterministicClauses: ProsodyClause[] = fallbackList.map((clauseText, idx) => {
      const wCount = clauseText.split(/\s+/).filter(Boolean).length
      const hasDifficult = difficultWordsList.some(dw => clauseText.toLowerCase().includes(dw.toLowerCase()))
      return {
        index: idx + 1,
        text: clauseText,
        word_count: wCount,
        style: hasDifficult ? "emphasis" : "standard",
        style_label: hasDifficult ? "Nhấn mạnh từ khó" : "Chuẩn mực",
        rate: hasDifficult ? "-20%" : "-15%",
        noise_scale: hasDifficult ? 0.58 : 0.667,
        noise_w: hasDifficult ? 0.72 : 0.80,
        pause_sec: Math.max(5, Math.round(wCount * 1.6)) + (hasDifficult ? 2.5 : 0),
        matched_difficult_words: difficultWordsList.filter(dw => clauseText.toLowerCase().includes(dw.toLowerCase())),
      }
    })
    setProsodyClauses(deterministicClauses)
    setAudioAlertMessage("Máy chủ Qwen ngoại tuyến. Đã tự động kích hoạt Đạo diễn Sư phạm Tất định (Deterministic Rule-based).")
  } finally {
    setIsDirectingProsody(false)
  }
}
```

---

## 4. TÍNH ĐỒNG NHẤT TYPE INTERFACE (TYPESCRIPT INTERFACE PARITY)

### 4.1. Khảo sát & Định nghĩa các Interface Chuẩn mực

Toàn bộ các Interface cần được xuất ra (exported) trong `app/teacher/dictation/page.tsx` hoặc bổ sung vào `lib/types.ts`:

```typescript
// ============================================================================
// TypeScript Interfaces for Semantic-Acoustic Multi-Surface Integration
// ============================================================================

/**
 * Cụm câu kèm tham số âm học và chỉ dẫn sư phạm do Qwen2.5 SLM đạo diễn
 */
export interface ProsodyClause {
  index: number
  text: string
  word_count: number
  style: "warm_story" | "standard" | "emphasis" | "question"
  style_label: string
  rate: string // ví dụ "-15%", "-20%"
  noise_scale: number
  noise_w: number
  pause_sec: number // thời gian nghỉ viết (giây)
  matched_difficult_words?: string[]
}

/**
 * Trạng thái vòng đời và mức tiêu thụ RAM của mô hình Qwen2.5 SLM
 */
export interface QwenStatusState {
  enabled: boolean
  model_id?: string
  is_loaded: boolean
  lifecycle_mode: "on_demand_unload" | "persistent" | "offline"
  available_ram_mb: number
  cache_entries?: number
  memory_mode?: string
  active_action?: "idle" | "extracting" | "directing" | "unloaded"
  last_unloaded_at?: number
  offline?: boolean
}

/**
 * Tùy chọn cấu hình âm thanh khi gọi speakClause
 */
export interface SpeakClauseOptions {
  customRateStr?: string
  style?: "warm_story" | "standard" | "emphasis" | "question" | string
  noiseScale?: number
  noiseW?: number
  readPunctuation?: boolean
}

/**
 * DTO phản hồi từ endpoint POST /api/dictation/qwen-director (action: extract_sgk)
 */
export interface QwenExtractSgkResponse {
  title: string
  clean_content: string
  difficultWords: string[] | string
  summary?: string
  source?: string
  ram_unloaded?: boolean
  cached?: boolean
}

/**
 * DTO phản hồi từ endpoint POST /api/dictation/qwen-director (action: direct_prosody)
 */
export interface QwenDirectProsodyResponse {
  clauses: ProsodyClause[]
  total_words: number
  estimated_duration_sec: number
  cache_hit: boolean
  ram_unloaded: boolean
}
```

### 4.2. Kiểm tra tính tương thích TypeScript (Zero Error Verification)

- **Trạng thái kiểm tra tĩnh**: Đã chạy thực nghiệm `npx tsc --noEmit` trên dự án thực tế.
  - Kết quả: `exit code 0` (0 lỗi, 0 cảnh báo).
- **Trạng thái Next.js Build**: Đã chạy thực nghiệm `npm run build`.
  - Kết quả: `exit code 0`, toàn bộ 37 routes App Router biên dịch thành công 100%.
- **Quy tắc bảo đảm Type Safety cho Worker M4**:
  1. Trong `speakClause`, tham số thứ 3 cần được khai báo dạng union: `options?: SpeakClauseOptions | string` để giữ tương thích ngược với các lệnh gọi cũ truyền string `customRateStr` (như `speakClause("...", sessionToken, "-10%")`).
  2. Tại `app/teacher/grade/page.tsx`, import icon `Volume2` từ `"lucide-react"` cần đặt chung với các icon khác ở đầu file.
  3. Định dạng `difficultWords` từ Qwen có thể là `string[]` hoặc `string` dạng phân cách bởi dấu phẩy; cần xử lý an toàn:
     `Array.isArray(words) ? words.join(", ") : String(words || "")`.

---

## 5. CHIẾN LƯỢC KIỂM THỬ XÁC THỰC (VERIFICATION TEST STRATEGY)

Chiến lược kiểm thử được thiết kế theo 3 tầng nghiêm ngặt (PStack / Lauren Tan Rigorous Verification):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       3-TIER VERIFICATION ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 1: Static Type & Build Gates                                          │
│  • npx tsc --noEmit (Exit code 0, 0 compiler errors)                        │
│  • npm run build (Exit code 0, all 37 routes compiled)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 2: API Gateway & Mock Fallback Automated Checks                       │
│  • GET /api/dictation/qwen-director (status code 200, offline contract)     │
│  • POST /api/dictation/qwen-director (extract_sgk, direct_prosody)          │
│  • GET /api/dictation/tts (?style=warm_story, ?style=emphasis)              │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 3: Behavioral UI & Audio Lifecycle Test Scenarios                     │
│  • Scenario 1: Rapid Click Stress Test (No overlapping audio)               │
│  • Scenario 2: Cross-Action Interruption (Comment vs Correction audio)      │
│  • Scenario 3: Modal Close Dismissal (Instant audio cessation)              │
│  • Scenario 4: Step 3 Dynamic Loop Execution with Directed Prosody          │
│  • Scenario 5: Offline Resilience & Graceful Error Banners                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.1. Tầng 1: Kiểm thử Tĩnh (Static Verification Gates)

```powershell
# 1. Kiểm tra toàn vẹn TypeScript
npx tsc --noEmit
# Tiêu chuẩn: Exit code 0, không có bất kỳ lỗi type nào

# 2. Build toàn bộ Next.js App
npm run build
# Tiêu chuẩn: Exit code 0, 37/37 routes biên dịch thành công
```

### 5.2. Tầng 2: Kiểm thử Hợp đồng API Tự động (Automated Tests)

Worker M4 và Reviewers có thể chạy script python tự động để kiểm chứng hợp đồng API:
```powershell
python -m pytest tests/test_bff_routes.py -k "qwen_director or tts"
```
Các assertions cần kiểm tra:
1. `GET /api/dictation/qwen-director` trả về JSON có đủ các trường `enabled`, `model_id`, `is_loaded`, `lifecycle_mode`, `available_ram_mb`.
2. `POST /api/dictation/qwen-director` với `action="direct_prosody"` trả về các `clauses` chứa đúng kiểu dữ liệu của `ProsodyClause`.
3. `GET /api/dictation/tts?style=warm_story` trả về `audio/wav` binary (> 10,000 bytes) hoặc trả về HTTP 503 có cấu trúc JSON `{ error: ... }` khi offline.

### 5.3. Tầng 3: Các Kịch Bản Kiểm Thử Hành Vi Giao Diện (Behavioral Test Scenarios)

#### Kịch bản 1: Kiểm thử Nhấp chuột Nhanh Liên Tiếp (Rapid Click Stress Test)
- **Mục tiêu**: Chứng minh không có âm thanh nói chồng lên nhau khi người dùng nhấp nhanh.
- **Thực hiện**:
  1. Mở trang `app/student/page.tsx`.
  2. Bấm liên tiếp 5 lần trong vòng 1 giây vào các thẻ từ khó khác nhau trong Sổ tay từ khó.
- **Tiêu chí Đạt**:
  - Chỉ có 1 từ duy nhất phát ra âm thanh tại một thời điểm (từ được click cuối cùng).
  - Không có 2 giọng nói phát đè lên nhau.
  - State `playingWord` chỉ hiển thị active ở thẻ từ được click cuối cùng.

#### Kịch bản 2: Kiểm thử Ngắt Âm thanh Chéo (Cross-Action Interruption Test)
- **Mục tiêu**: Kiểm tra nút nghe nhận xét và nút nghe phát âm từ sửa lỗi tự động hủy nhau.
- **Thực hiện**:
  1. Mở trang `app/teacher/grade/page.tsx`.
  2. Bấm nút "🔊 Nghe cô giáo đọc nhận xét" (nhận xét dài khoảng 3 câu).
  3. Khi cô giáo đang đọc câu thứ nhất, bấm ngay vào nút loa `Volume2` cạnh từ sửa lỗi `c.suggestion` ở danh sách lỗi.
- **Tiêu chí Đạt**:
  - Giọng đọc nhận xét ngắt ngay lập tức (`audio.pause()`).
  - Âm thanh phát âm từ sửa lỗi vang lên rõ ràng (`style=emphasis`).
  - Nút nhận xét trở về trạng thái bình thường (hết nhấp nháy/pulse), nút từ sửa lỗi hiển thị trạng thái đang phát.

#### Kịch bản 3: Kiểm thử Đóng Modal Dập Tắt Âm thanh (Modal Dismissal Test)
- **Mục tiêu**: Chứng minh âm thanh không phát ngầm sau khi đóng hộp thoại.
- **Thực hiện**:
  1. Trong `app/student/page.tsx`, mở chi tiết một bài chấm (`StudentGradeDetailModal`).
  2. Bấm nút "🔊 Nghe cô nhận xét" hoặc bấm vào ô Bounding Box đỏ trên ảnh bài thi thật để phát âm từ sai.
  3. Lập tức bấm nút dấu [X] ở góc trên hoặc click ra vùng tối ngoài Modal để đóng modal.
- **Tiêu chí Đạt**:
  - Âm thanh tắt lịm ngay tức thì khi modal đóng.
  - Không còn âm thanh phát ngầm sau khi trở về Dashboard học sinh.

#### Kịch bản 4: Kiểm thử Vòng lặp Bước 3 với Kịch bản Đạo diễn Qwen
- **Mục tiêu**: Xác thực kịch bản Bước 3 áp dụng đúng phong cách âm học và thời gian nghỉ viết từng cụm.
- **Thực hiện**:
  1. Mở `app/teacher/dictation/page.tsx`.
  2. Bấm "🎬 Qwen2.5 Đạo diễn Nhịp đọc". Bảng xem trước Prosody Script xuất hiện với các badge xanh/vàng.
  3. Bật toggle "Đọc tên dấu câu".
  4. Bấm "Bắt đầu Bước 3 (Nghe - Viết chính thức)".
- **Tiêu chí Đạt**:
  - Từng cụm câu được đọc với đúng phong cách (`style`) chỉ định trong badge.
  - Các cụm chứa từ khó được đọc chậm hơn và ngắt nghỉ dài hơn (+2.5s).
  - Engine đọc rõ các dấu câu ", phẩy,", ", chấm.".
  - Đồng hồ đếm ngược `countdown` hiển thị chính xác theo `pause_sec`.

#### Kịch bản 5: Kiểm thử Khả năng Phục hồi Ngoại tuyến (Offline Resilience Test)
- **Mục tiêu**: Xác thực giao diện không bị treo hoặc crash khi Python AI Core tắt.
- **Thực hiện**:
  1. Tạm dừng dịch vụ Python Core (`:8000`).
  2. Mở `app/teacher/dictation/page.tsx`.
  3. Quan sát Header: Badge hiển thị `Qwen2.5: Ngoại tuyến (0MB RAM)` với chấm xám/hổ phách.
  4. Bấm nút "Trích xuất SGK": Dialog mở bình thường, bấm trích xuất $\to$ Hiển thị thông báo lỗi thân thiện, không ném unhandled rejection.
  5. Bấm nút "🎬 Qwen2.5 Đạo diễn Nhịp đọc" $\to$ Tự động fallback về thuật toán tất định, hiển thị thông báo "Đang dùng phân tách nhịp đọc cơ bản".
  6. Bấm nút loa phát âm $\to$ Hiển thị alert/toast thông báo máy chủ ngoại tuyến.

---

## 6. MA TRẬN KHUYẾN NGHỊ TRIỂN KHAI CHO WORKER M4

| Tệp nguồn | Vị trí dòng | Hạng mục cần thực hiện | Lưu ý kỹ thuật |
|---|---|---|---|
| `app/layout.tsx` | Dòng 60 | Khai báo `<Toaster />` từ `@/components/ui/toaster` | Giúp toàn bộ ứng dụng dùng được hàm `toast()` chuẩn Radix UI. |
| `app/teacher/dictation/page.tsx` | Dòng 30–65 | Thêm interface `ProsodyClause`, `QwenStatusState`, `SpeakClauseOptions` | Đảm bảo tính nhất quán type cho toàn bộ trang. |
| `app/teacher/dictation/page.tsx` | Dòng 345–350 | Thêm `stopActiveAudio(currentAudioRef)` helper | Ngắt và dọn dẹp triệt để `HTMLAudioElement` trước mỗi lần phát. |
| `app/teacher/dictation/page.tsx` | Dòng 535–597 | Nâng cấp `speakClause` nhận `options?: SpeakClauseOptions \| string` | Truyền tham số `style`, `noise_scale`, `noise_w`, `read_punctuation`. |
| `app/teacher/dictation/page.tsx` | Dòng 683–751 | Cập nhật `startStep3Dictation` ưu tiên dùng `prosodyClauses` | Duyệt qua từng cụm có đạo diễn, truyền `pause_sec` vào timer. |
| `app/teacher/dictation/page.tsx` | Dòng 982–986 | Cập nhật Header Live Status Badge | Hiển thị đồng thời Piper VITS và Qwen On-Demand RAM state. |
| `app/teacher/dictation/page.tsx` | Dòng 1104 | Thêm nút & Dialog "Trích xuất SGK / PDF (Qwen2.5)" | Đọc file `.txt` bằng `FileReader`, gọi `action: "extract_sgk"`. |
| `app/teacher/dictation/page.tsx` | Dòng 1218 | Thêm nút "🎬 Qwen2.5 Đạo diễn Nhịp đọc" & Bảng xem trước | Hiển thị Prosody Script Preview kèm nút nghe thử từng cụm. |
| `app/teacher/dictation/page.tsx` | Dòng 1250 | Thêm bộ chọn `acousticStyle` và toggle `read_punctuation` | Điều khiển âm học Piper VITS trực tiếp trên giao diện. |
| `app/teacher/grade/page.tsx` | Dòng 15 | Import `Volume2` từ `"lucide-react"` | Icon loa phát âm thanh. |
| `app/teacher/grade/page.tsx` | Dòng 745 | Thêm nút "🔊 Nghe cô giáo đọc nhận xét" (`warm_story`) | Dùng chung `audioRef`, ngắt trước khi phát. |
| `app/teacher/grade/page.tsx` | Dòng 1101, 1210 | Thêm nút phát âm chuẩn cạnh `c.suggestion` (`emphasis`) | Hỗ trợ giáo viên bấm nghe phát âm chuẩn của từ gợi ý. |
| `app/student/page.tsx` | Dòng 71 | Thay `vi-VN-HoaiMyNeural` bằng `vi_VN-vais1000-medium&style=emphasis` | Đồng bộ âm học Piper VITS offline. |
| `app/student/page.tsx` | Dòng 105 | Thêm unmount cleanup `useEffect` cho `audioRef` | Ngăn rò rỉ âm thanh khi rời trang. |
| `app/student/page.tsx` | Dòng 218 | Thêm nút "🔊 Nghe cô nhận xét" (`warm_story`) tại Hero Banner | Cho học sinh và phụ huynh nghe lời khen của giáo viên. |
| `student-grade-detail-modal.tsx` | Dòng 146 | Cập nhật `useEffect` dọn dẹp audio phụ thuộc `[open, grade]` | Ngắt âm thanh ngay lập tức khi người dùng đóng modal. |
| `student-grade-detail-modal.tsx` | Dòng 238 | Thay `vi-VN-HoaiMyNeural` bằng `vi_VN-vais1000-medium&style=emphasis` | Kích hoạt âm sắc rõ nét cho Bounding Box Canvas click. |
| `student-grade-detail-modal.tsx` | Dòng 460 | Thêm nút "🔊 Nghe cô nhận xét" (`warm_story`) | Đặt trong khối nhận xét sư phạm Thông tư 27. |

---
*Báo cáo được biên soạn độc lập bởi Explorer 3 — Đội ngũ Kỹ thuật Hệ thống ViHand Grade.*
