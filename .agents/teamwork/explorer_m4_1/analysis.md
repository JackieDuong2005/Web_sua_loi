# BÁO CÁO PHÂN TÍCH & THIẾT KẾ KỸ THUẬT UI/UX COCKPIT ĐỌC CHÍNH TẢ (MILESTONE 4)
## Multi-Surface Teacher & Student UI Integration: Teacher Dictation Cockpit (`app/teacher/dictation/page.tsx`)

---

## 1. TỔNG QUAN ĐIỀU TRA & MỤC TIÊU NGHIỆP VỤ

Báo cáo phân tích này cung cấp thiết kế chi tiết, kiến trúc trạng thái (state management), hợp đồng giao diện và các đoạn mã diff cụ thể (concrete code diffs) để Worker M4 triển khai tích hợp toàn diện **Semantic-Acoustic Decoupled Pipeline** vào màn hình **Teacher Dictation Cockpit** (`app/teacher/dictation/page.tsx`).

### Sơ đồ Luồng Tương tác UI Cockpit & BFF Gateway (ASCII Box Drawing)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   TEACHER DICTATION COCKPIT (app/teacher/dictation/page.tsx)      │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [Header Live Status Badge]                                                      │
│  ├── Piper VITS Engine: [● Sẵn sàng (Offline ONNX)]                              │
│  └── Qwen2.5 SLM RAM:   [● Ngủ 0MB RAM / Đang bật cờ xử lý / Đã xả RAM 0MB]       │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [Cột Trái: Bàn Soạn Bài & Đạo Diễn Sư Phạm]                                     │
│  ├── Header Toolbar: [AI soạn bài] + [📄 Trích xuất SGK/PDF] (Qwen on-demand)   │
│  ├── Textarea Nội dung bài đọc SGK (Title, Content, Difficult Words)            │
│  ├── Nút bấm: [🎬 Qwen2.5 Đạo diễn Nhịp đọc]                                     │
│  └── [Interactive Prosody Script Preview]:                                      │
│      ├── Badge từng cụm: warm_story (xanh), emphasis (vàng), standard, question │
│      ├── Hiển thị tốc độ (rate), đếm ngược nghỉ viết (pause_sec +2.5s từ khó)   │
│      └── Nút [🔊 Nghe thử cụm này] gọi trực tiếp Piper VITS                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [Cột Phải: Bộ Điều Khiển Âm Học VITS & Thiết Lập Sư Phạm]                       │
│  ├── Giọng đọc (Cô Hoài My, Mai Linh, Trúc Ly, Clone...)                        │
│  ├── Phong cách âm học chủ đạo: warm_story / standard / emphasis / question     │
│  ├── Switch Toggle: [x] Đọc tên dấu câu chính tả (phẩy, chấm, chấm than...)     │
│  └── Tốc độ (speedRate), Số lần lặp (repeatCount), Nghỉ viết (pauseSetting)      │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [Vòng Lặp Bước 3: Nghe - Viết Chính Thức & Bảng Xanh Trình Chiếu]              │
│  └── speakClause() động hóa từng cụm theo ProsodyClause (style, noise, pause)    │
└──────────────────────────────────────────────────────────────────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼ (GET / POST)                                  ▼ (Audio Stream / Play)
┌──────────────────────────────────────────────────┐   ┌───────────────────────────────────┐
│       /api/dictation/qwen-director               │   │   /api/dictation/tts              │
│  • GET:  Proxies /qwen/status (RAM & Lifecycle)  │   │   /api/dictation/play-local       │
│  • POST: action: "extract_sgk"                   │   │   • style, noise_scale, noise_w   │
│  • POST: action: "direct_prosody"                │   │   • read_punctuation (phẩy, chấm) │
└──────────────────────────────────────────────────┘   └───────────────────────────────────┘
```

---

## 2. ĐIỀU TRA CHI TIẾT 5 HẠNG MỤC CỐT LÕI TẠI `app/teacher/dictation/page.tsx`

### 2.1. Hạng mục 1: Header Live Status Badge (Dòng 972–1003)

#### Hiện trạng quan sát:
Tại dòng 983–986, Header hiện chỉ chứa một badge tĩnh:
```tsx
<div className="hidden sm:flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 rounded-full px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
  <span>Piper Offline TTS (Pi 4/5)</span>
</div>
```

#### Thiết kế Trạng thái & Cơ chế Polling:
1. **Dữ liệu Polling**:
   Gọi `GET /api/dictation/qwen-director` (đã được tạo tại Milestone 3, proxies `:8000/qwen/status` với timeout 10s).
   Response trả về:
   ```json
   {
     "enabled": true,
     "model_id": "Qwen/Qwen2.5-0.5B-Instruct",
     "is_loaded": false,
     "lifecycle_mode": "on_demand_unload",
     "available_ram_mb": 1850.5,
     "cache_entries": 4,
     "memory_mode": "zero_idle_ram",
     "offline": false
   }
   ```
2. **Quản lý Vòng đời & Hiệu ứng Chuyển tiếp (Lifecycle Transitions)**:
   - Trạng thái `idle` (mặc định): Qwen chưa nạp vào RAM (`is_loaded: false`). Hiển thị:
     `Qwen2.5: Ngủ 0MB RAM (Trống 1850MB)` với chấm xanh nhạt và viền slate.
   - Trạng thái `processing` (khi giáo viên bấm "Trích xuất SGK" hoặc "Đạo diễn Nhịp đọc"):
     Chuyển lập tức sang `Qwen2.5: Đang bật cờ xử lý...` với chấm vàng nghệ animate ping và viền amber.
   - Trạng thái `just_unloaded` (ngay khi request trích xuất/đạo diễn hoàn tất):
     Chuyển sang `Qwen2.5: Đã lưu kịch bản & Xả RAM (0MB)` với chấm xanh dương và viền blue trong **4 giây**, sau đó tự động trở về `idle`.
   - Trạng thái `offline`: Nếu service Python không phản hồi, hiển thị:
     `Qwen2.5: Ngoại tuyến (Sư phạm Tất định)`.
3. **Chu kỳ Polling**: 12 giây / lần, tự động dừng polling khi component unmount (`clearInterval`).

---

### 2.2. Hạng mục 2: Dialog "📄 Trích xuất SGK / PDF (Qwen2.5)"

#### Hiện trạng quan sát:
Tại Header bài đọc của Cột Trái (Dòng 1093–1138), hiện có các nút: `AI soạn bài` (mở modal sáng tác bằng prompt), `Kho SGK`, `Dán`, và `Xóa trắng`. Chưa có nút trích xuất văn bản thô từ tài liệu scan hoặc sách giáo khoa.

#### Thiết kế Dialog & Luồng Tương tác:
1. **Nút kích hoạt**: Đặt ngay cạnh nút `AI soạn bài` tại dòng 1104:
   - Label: `Trích xuất SGK/PDF`
   - Icon: `document_scanner`
   - Action: Mở `isExtractSgkOpen = true`.
2. **Giao diện Modal `ExtractSgkDialog`**:
   - Tiêu đề: `📄 Trích Xuất & Làm Sạch SGK/PDF (Qwen2.5 On-Demand)`
   - Mô tả: `Mô hình SLM sẽ tự động loại bỏ số trang, tiêu đề thừa, câu hỏi bài tập và trích xuất từ khó chuẩn GDPT 2018. Tự động xả RAM ngay sau khi trích xuất.`
   - Chọn khối lớp: Dropdown Lớp 1, 2, 3, 4, 5 (để Qwen căn chỉnh độ phức tạp từ ngữ).
   - Tải file `.txt`: Nút "Tải file .txt" cho phép giáo viên tải file văn bản có sẵn từ máy tính (dùng `FileReader.readAsText`).
   - Textarea nhập nội dung thô: Hỗ trợ dán văn bản lẫn lộn số trang, câu hỏi bài tập (ví dụ: `Trang 45. Bài 12: Ai có lỗi. Cơn giận lặng xuống... Câu 1: Em hãy thảo luận...`).
3. **Thực thi API**:
   - Gửi request:
     ```typescript
     POST /api/dictation/qwen-director
     {
       "action": "extract_sgk",
       "raw_text": rawText,
       "grade": Number(extractGrade)
     }
     ```
   - Xử lý kết quả trả về:
     - `setTitle(result.title || "Bài đọc SGK")`
     - `setPassageText(result.clean_content)`
     - `setDifficultWords(Array.isArray(result.difficultWords) ? result.difficultWords.join(", ") : result.difficultWords || "")`
     - Reset `prosodyClauses = []` để tránh lệch kịch bản cũ.
     - Kích hoạt trạng thái badge `just_unloaded` trong 4s.
     - Đóng Dialog.

---

### 2.3. Hạng mục 3: Nút "🎬 Qwen2.5 Đạo diễn Nhịp đọc" & Interactive Prosody Script Preview

#### Hiện trạng quan sát:
Hiện tại ở dòng 177–232 và dòng 352–354, `TeacherDictationPage` chỉ sử dụng hàm regex thuần `splitIntoPedagogicalClauses` để chia câu. Cách này hoàn toàn mù mờ về ngữ điệu âm học, không nhận biết được vị trí từ khó, và áp đặt thời gian nghỉ viết cố định.

#### Thiết kế Kịch bản Âm học (Prosody Clause Interface):
```typescript
interface ProsodyClause {
  index: number
  text: string
  word_count: number
  style: "warm_story" | "standard" | "emphasis" | "question"
  style_label: string
  rate: string
  noise_scale: number
  noise_w: number
  pause_sec: number
  matched_difficult_words?: string[]
}
```

#### Thiết kế Nút kích hoạt:
Đặt tại vùng điều khiển bài đọc phía dưới danh sách từ khó (trước thanh thống kê, khoảng dòng 1216):
- Label: `🎬 Qwen2.5 Đạo diễn Nhịp đọc`
- Style: Nổi bật với tông màu vàng dạ / hổ phách (`bg-amber-500/10 text-amber-900 border-amber-500/30 hover:bg-amber-500/20`).
- Khi click:
  - Bật cờ `isDirectingProsody = true`, kích hoạt badge `processing`.
  - Gửi request tới `POST /api/dictation/qwen-director`:
    ```json
    {
      "action": "direct_prosody",
      "passage": passageText,
      "difficult_words": difficultWordsList,
      "grade": 3,
      "chunk_mode": chunkMode
    }
    ```
  - Nhận response: `{ clauses: ProsodyClause[], cache_hit: boolean, ram_unloaded: boolean, ... }`.
  - Cập nhật state `prosodyClauses`, `prosodyCacheHit`, và chuyển badge sang `just_unloaded`.

#### Thiết kế Interactive Prosody Script Preview:
Khi `prosodyClauses.length > 0`, hiển thị một bảng điều khiển xem trước tương tác:
- Header bảng:
  - Tiêu đề: `🎬 Kịch bản Đạo diễn Nhịp đọc (Qwen2.5)`
  - Badge số lượng cụm: `${prosodyClauses.length} cụm câu`
  - Badge Cache: `prosodyCacheHit ? "⚡ Siêu tốc Cache (<1ms)" : "♻️ Đã xả RAM 0MB"`
  - Nút `Xóa kịch bản` để quay lại chế độ chia cụm thủ công nếu muốn.
- Danh sách thẻ cụm câu (Clause Cards):
  - Số thứ tự `#${clause.index + 1}`
  - Văn bản: Bảo toàn 100% từng chữ và dấu câu gốc.
  - Badge Phong cách Âm học:
    - `warm_story`: Xanh ngọc (`bg-emerald-100 text-emerald-800 border-emerald-300`) — "Ấm áp kể chuyện"
    - `emphasis`: Vàng nghệ (`bg-amber-100 text-amber-900 border-amber-400 font-bold`) — "Nhấn mạnh từ khó"
    - `question`: Tím pastel (`bg-purple-100 text-purple-800 border-purple-300`) — "Hỏi đáp"
    - `standard`: Xám bạc (`bg-slate-100 text-slate-700 border-slate-300`) — "Chuẩn mực"
  - Tốc độ đọc: `${clause.rate}`
  - Thời gian nghỉ viết: `⏱️ ${clause.pause_sec}s` (nếu có từ khó, thêm nhãn `(+2.5s từ khó)`)
  - Highlight từ khó trùng khớp: Tag `⚠️ ${w}`
  - Nút bấm `🔊 Nghe thử cụm này`:
    Gọi trực tiếp `speakClause(clause.text, ++playbackIdRef.current, { customRateStr: clause.rate, style: clause.style, noiseScale: clause.noise_scale, noiseW: clause.noise_w, readPunctuation: readPunctuation })` để giáo viên nghe duyệt âm sắc trước giờ dạy.

---

### 2.4. Hạng mục 4: Bộ Điều Khiển Âm Học Piper VITS (Acoustic Controls)

#### Hiện trạng quan sát:
Cột Phải (`Thiết lập sư phạm`, dòng 1248–1438) hiện có chọn giọng đọc, chọn đầu ra âm thanh (Loa máy tính / Loa RPi), thanh trượt tốc độ (speedRate), số lần lặp (repeatCount), và nghỉ viết (pauseSetting). Hoàn toàn **thiếu** bộ điều khiển sắc thái âm học (`style`) và cờ đọc dấu câu (`read_punctuation`).

#### Thiết kế Bổ sung:
1. **Bộ chọn Phong cách Ngữ điệu (Prosody Style Selector)**:
   - State: `acousticStyle`: `"standard" | "warm_story" | "emphasis" | "question"` (mặc định `"standard"`).
   - Dropdown hoặc Button Group trực quan gồm 4 phong cách:
     - `warm_story` (Ấm áp kể chuyện — noise_scale: 0.78, noise_w: 0.90, length: 1.05)
     - `standard` (Chuẩn mực sư phạm — noise_scale: 0.667, noise_w: 0.80, length: 1.00)
     - `emphasis` (Rõ nét trọng âm — noise_scale: 0.58, noise_w: 0.72, length: 1.20)
     - `question` (Hỏi đáp & tương tác — noise_scale: 0.82, noise_w: 0.92, length: 1.08)
2. **Switch Toggle: "Đọc tên dấu câu chính tả" (`read_punctuation`)**:
   - State: `readPunctuation`: `boolean` (mặc định `false`).
   - Mô tả giao diện:
     ```tsx
     <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20">
       <div className="space-y-0.5">
         <div className="flex items-center gap-1.5 text-xs font-semibold text-card-foreground">
           <span className="material-symbols-rounded text-sm text-emerald-600">spellcheck</span>
           <span>Đọc tên dấu câu (phẩy, chấm)</span>
         </div>
         <p className="text-[10px] text-muted-foreground">
           Hỗ trợ học sinh lớp 1-2 không bỏ sót dấu câu khi viết
         </p>
       </div>
       <button
         type="button"
         onClick={() => setReadPunctuation(prev => !prev)}
         className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
           readPunctuation ? "bg-emerald-600" : "bg-muted-foreground/30"
         }`}
       >
         <span className={`block w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
           readPunctuation ? "translate-x-5" : "translate-x-0.5"
         }`} />
       </button>
     </div>
     ```

---

### 2.5. Hạng mục 5: Động hóa Vòng lặp Bước 3 (`speakClause` & `startStep3Dictation`)

#### Hiện trạng quan sát:
1. `speakClause` (Dòng 535–597):
   Chỉ nhận `clause: string`, `sessionToken: number`, và `customRateStr?: string`. Bỏ qua hoàn toàn các tham số âm học của Piper VITS ONNX (`style`, `noise_scale`, `noise_w`, `read_punctuation`).
2. `startStep3Dictation` (Dòng 683–751):
   Luôn dùng regex cắt cụm tĩnh `splitIntoPedagogicalClauses`, thời gian nghỉ tính theo công thức cứng (`Math.round(wCount * 1.6)`), không áp dụng kịch bản đạo diễn.

#### Thiết kế Nâng cấp:
1. **Nâng cấp `speakClause`**:
   Hỗ trợ truyền đối tượng `options` linh hoạt mà vẫn tương thích ngược 100% nếu truyền string:
   ```typescript
   interface SpeakClauseOptions {
     customRateStr?: string
     style?: string
     noiseScale?: number
     noiseW?: number
     readPunctuation?: boolean
   }

   const speakClause = (
     clause: string,
     sessionToken: number,
     options?: SpeakClauseOptions | string
   ): Promise<boolean> => {
     // Phân giải tham số linh hoạt
     const opt: SpeakClauseOptions = typeof options === "string" ? { customRateStr: options } : (options || {})
     const style = opt.style || acousticStyle || "standard"
     const noiseScale = opt.noiseScale
     const noiseW = opt.noiseW
     const isReadPunctuation = opt.readPunctuation !== undefined ? opt.readPunctuation : readPunctuation

     // 1. Chế độ Loa Raspberry Pi: gửi JSON body tới /api/dictation/play-local
     // 2. Chế độ Loa Máy tính: tạo Audio element với query params tới /api/dictation/tts
   }
   ```
2. **Nâng cấp `startStep3Dictation`**:
   - Nếu `prosodyClauses.length > 0`: sử dụng danh sách cụm và thông số âm học từ kịch bản Qwen.
   - Nếu chưa chạy đạo diễn: fallback an toàn về cụm chia regex tĩnh.
   - Trong vòng lặp: truyền đầy đủ `style`, `noise_scale`, `noise_w`, `read_punctuation` và áp dụng `pause_sec` vào hàm `sleepWithCountdown`.
3. **Nâng cấp các bước sư phạm còn lại**:
   - Bước 1 (Đọc mẫu): dùng `style: "warm_story"` để bài văn truyền cảm, ấm áp.
   - Bước 2 (Từ khó): dùng `style: "emphasis"` để phát âm rõ nét từng phụ âm và dấu thanh.
   - `repeatCurrentClause` (Đọc lại cụm): truyền đúng kịch bản của cụm hiện tại.

---

## 3. KHUYẾN NGHỊ KỸ THUẬT & TRÁNH REGRESSION DÀNH CHO WORKER M4

1. **Bảo toàn Font chữ & Không vỡ layout Bảng xanh (Presentation Overlay)**:
   - Các nút và trạng thái trên Bảng xanh (`showProjector = true`) bắt buộc giữ chuẩn CSS: `font-['Lexend']`, nền `#132A22`, chữ `#F4F1E8`, điểm nhấn phấn vàng `#FDE68A`.
2. **Quản lý Vòng đời Audio (`currentAudioRef`)**:
   - Trước khi phát âm thanh mới, luôn `audio.pause()`, gán `src = ""` và `currentAudioRef.current = null` để tránh memory leak và âm thanh bị chồng đè khi giáo viên click nhanh nút nghe thử.
3. **Đồng bộ hóa khi Văn bản thay đổi**:
   - Nếu giáo viên sửa văn bản trong `textarea` sau khi đã bấm đạo diễn, kịch bản cũ sẽ bị lệch. Cần hiển thị cảnh báo nhỏ: `"Văn bản đã thay đổi. Bấm lại 'Đạo diễn Nhịp đọc' để cập nhật kịch bản mới"`.
4. **Xử lý Timeout & Fallback mượt mà**:
   - Các lệnh gọi `qwen-director` có timeout 30s. Nếu timeout hoặc máy chủ bận, UI cần tự động bắt lỗi và thông báo bằng Toast thân thiện, tuyệt đối không làm crash trang.


---

## 4. CHI TIẾT MÃ NGUỒN & HƯỚNG DẪN CODE DIFF CỤ THỂ CHO WORKER M4

Dưới đây là chi tiết từng khối mã (code chunks) cần bổ sung và thay thế trong `app/teacher/dictation/page.tsx`.

### 4.1. Khai báo Type & Interface mới (Khoảng dòng 63)

```typescript
// ─── Qwen2.5 Prosody & Director Interfaces ──────────────────────────────────
export interface ProsodyClause {
  index: number
  text: string
  word_count: number
  style: "warm_story" | "standard" | "emphasis" | "question"
  style_label: string
  rate: string
  noise_scale: number
  noise_w: number
  pause_sec: number
  matched_difficult_words?: string[]
}

export interface QwenStatusState {
  enabled: boolean
  is_loaded: boolean
  available_ram_mb: number
  lifecycle_mode: string
  cache_entries: number
  offline: boolean
}

export interface SpeakClauseOptions {
  customRateStr?: string
  style?: string
  noiseScale?: number
  noiseW?: number
  readPunctuation?: boolean
}
```

### 4.2. Khai báo React States mới (Khoảng dòng 284)

```typescript
  // ─── Qwen2.5 Lifecycle & Live RAM Sensing State ──────────────────────────────
  const [qwenStatus, setQwenStatus] = useState<QwenStatusState>({
    enabled: true,
    is_loaded: false,
    available_ram_mb: 1850,
    lifecycle_mode: "on_demand_unload",
    cache_entries: 0,
    offline: false,
  })
  const [qwenLifecycleState, setQwenLifecycleState] = useState<"idle" | "processing" | "unloaded">("idle")

  // ─── Piper VITS Acoustic Controls & Spoken Punctuation State ─────────────────
  const [acousticStyle, setAcousticStyle] = useState<"standard" | "warm_story" | "emphasis" | "question">("standard")
  const [readPunctuation, setReadPunctuation] = useState<boolean>(false)

  // ─── Qwen2.5 Prosody Script Director State ───────────────────────────────────
  const [prosodyClauses, setProsodyClauses] = useState<ProsodyClause[]>([])
  const [isDirectingProsody, setIsDirectingProsody] = useState(false)
  const [prosodyCacheHit, setProsodyCacheHit] = useState(false)
  const [isProsodyPreviewOpen, setIsProsodyPreviewOpen] = useState(true)

  // ─── Dialog Trích xuất SGK / PDF State ───────────────────────────────────────
  const [isExtractSgkOpen, setIsExtractSgkOpen] = useState(false)
  const [isExtractingSgk, setIsExtractingSgk] = useState(false)
  const [rawExtractText, setRawExtractText] = useState("")
  const [extractGrade, setExtractGrade] = useState("3")
  const [extractError, setExtractError] = useState<string | null>(null)
```

### 4.3. Polling Qwen2.5 Status Hook (Khoảng dòng 410)

```typescript
  // ─── Polling Qwen2.5 Status & RAM Sensing (Mỗi 12 giây) ──────────────────────
  useEffect(() => {
    let isMounted = true

    const pollQwenStatus = async () => {
      try {
        const res = await fetch("/api/dictation/qwen-director")
        if (res.ok && isMounted) {
          const data = await res.json()
          setQwenStatus({
            enabled: Boolean(data.enabled),
            is_loaded: Boolean(data.is_loaded),
            available_ram_mb: Number(data.available_ram_mb) || 0,
            lifecycle_mode: data.lifecycle_mode || "on_demand_unload",
            cache_entries: Number(data.cache_entries) || 0,
            offline: Boolean(data.offline),
          })
        }
      } catch (err) {
        if (isMounted) {
          setQwenStatus(prev => ({ ...prev, offline: true }))
        }
      }
    }

    pollQwenStatus()
    const interval = setInterval(pollQwenStatus, 12000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])
```

### 4.4. Nâng cấp `speakClause` để nhận `SpeakClauseOptions` (Dòng 535–597)

```typescript
  const speakClause = (
    clause: string,
    sessionToken: number,
    options?: SpeakClauseOptions | string
  ): Promise<boolean> => {
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

      // Hỗ trợ truyền tùy chọn kiểu đối tượng hoặc string tương thích ngược
      const opt: SpeakClauseOptions = typeof options === "string" ? { customRateStr: options } : (options || {})
      const speedNum = parseFloat(speedRate) || 0.85
      const percentDiff = Math.round((speedNum - 1.0) * 100)
      const rateStr = opt.customRateStr || `${percentDiff >= 0 ? "+" : ""}${percentDiff}%`
      const resolvedStyle = opt.style || acousticStyle || "standard"
      const resolvedReadPunct = opt.readPunctuation !== undefined ? opt.readPunctuation : readPunctuation

      // ── PHÁT ÂM THANH OFFLINE ĐƠN TẦNG (PIPER VITS ONNX) ──
      if (audioOutputDest === "rpi_local") {
        // Chế độ 1: Phát trực tiếp ra Loa phần cứng trên Raspberry Pi
        const payload: Record<string, any> = {
          text: clause,
          voice: voiceEngine,
          rate: rateStr,
          style: resolvedStyle,
          read_punctuation: resolvedReadPunct,
        }
        if (typeof opt.noiseScale === "number") payload.noise_scale = opt.noiseScale
        if (typeof opt.noiseW === "number") payload.noise_w = opt.noiseW

        fetch("/api/dictation/play-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(res => res.json())
          .then(data => {
            cleanupAndResolve(data.success !== false)
          })
          .catch(err => {
            console.error("Lỗi phát loa Raspberry Pi:", err)
            cleanupAndResolve(false)
          })
      } else {
        // Chế độ 2: Stream WAV về Web Audio trình duyệt giáo viên
        const params = new URLSearchParams()
        params.set("text", clause)
        params.set("voice", voiceEngine)
        params.set("rate", rateStr)
        params.set("style", resolvedStyle)
        if (opt.noiseScale !== undefined) params.set("noise_scale", String(opt.noiseScale))
        if (opt.noiseW !== undefined) params.set("noise_w", String(opt.noiseW))
        if (resolvedReadPunct) params.set("read_punctuation", "true")

        const ttsUrl = `/api/dictation/tts?${params.toString()}`
        const audio = new Audio(ttsUrl)
        currentAudioRef.current = audio

        audio.onended = () => {
          currentAudioRef.current = null
          cleanupAndResolve(true)
        }

        audio.onerror = () => {
          currentAudioRef.current = null
          console.error("❌ Không thể nạp âm thanh từ trạm TTS Raspberry Pi. Đảm bảo python_service đang chạy.")
          cleanupAndResolve(false)
        }

        audio.play().catch(err => {
          console.warn("Audio playback interrupted or blocked:", err)
          cleanupAndResolve(false)
        })
      }
    })
  }
```

### 4.5. Nâng cấp `startStep3Dictation` & `repeatCurrentClause` (Dòng 683–751)

```typescript
  // ─── BƯỚC 3: ĐỌC TỪNG CÂU / CỤM (NGHE - VIẾT CHÍNH THỨC) ───────────────────
  const startStep3Dictation = async (autoAdvance = false) => {
    if (!passageText.trim()) return
    stopPlayback()

    setPedagogicalStep(3)
    const hasProsody = prosodyClauses && prosodyClauses.length > 0
    const preparedClauses = hasProsody
      ? prosodyClauses.map(c => c.text)
      : splitIntoPedagogicalClauses(passageText, chunkMode)
    if (preparedClauses.length === 0) return

    setClauses(preparedClauses)
    setCurrentClauseIndex(0)
    setCurrentRepeat(1)
    setIsPlaying(true)
    isPlayingRef.current = true
    setIsPaused(false)
    isPausedRef.current = false
    setPlaybackComplete(false)

    const sessionToken = playbackIdRef.current
    const maxRepeat = parseInt(repeatCount, 10) || 2

    await speakClause(
      "Bây giờ cả lớp mở vở và bắt đầu viết bài. Các em chú ý lắng nghe và ngồi thẳng lưng.",
      sessionToken,
      { customRateStr: "-10%", style: "warm_story" }
    )

    for (let i = 0; i < preparedClauses.length; i++) {
      if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

      setCurrentClauseIndex(i)
      const currentProsody = hasProsody ? prosodyClauses[i] : null
      const clauseText = preparedClauses[i]
      const styleLabel = currentProsody?.style_label ? ` [${currentProsody.style_label}]` : ""
      setStepStatusMessage(`Bước 3: Đang đọc cụm ${i + 1}/${preparedClauses.length}${styleLabel} (${stats.words} từ)`)

      for (let r = 1; r <= maxRepeat; r++) {
        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

        while (isPausedRef.current && isPlayingRef.current && playbackIdRef.current === sessionToken) {
          await new Promise(res => setTimeout(res, 200))
        }

        setCurrentRepeat(r)

        // Truyền đầy đủ các tham số âm học của cụm câu
        await speakClause(clauseText, sessionToken, {
          customRateStr: currentProsody?.rate,
          style: currentProsody?.style || acousticStyle,
          noiseScale: currentProsody?.noise_scale,
          noiseW: currentProsody?.noise_w,
          readPunctuation: readPunctuation,
        })

        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

        // Tính thời gian nghỉ viết động
        let pauseTime = 10
        if (currentProsody?.pause_sec) {
          pauseTime = currentProsody.pause_sec
        } else if (pauseSetting === "auto") {
          const wCount = clauseText.split(/\s+/).filter(Boolean).length
          pauseTime = Math.max(5, Math.round(wCount * 1.6))
        } else {
          pauseTime = parseInt(pauseSetting, 10) || 10
        }

        const finishedPause = await sleepWithCountdown(pauseTime, sessionToken)
        if (!finishedPause) break
      }
    }

    if (playbackIdRef.current === sessionToken && isPlayingRef.current) {
      setIsPlaying(false)
      isPlayingRef.current = false
      setIsSpeakingNow(false)
      setCountdown(0)
      setPlaybackComplete(true)
      setStepStatusMessage("Đã viết xong toàn bài. Chuyển sang Bước 4: Đọc soát lỗi toàn bài.")

      if (autoAdvance) {
        setPedagogicalStep(4)
        await startStep4Proofread()
      } else {
        setPedagogicalStep(4)
      }
    }
  }
```

Và nâng cấp `repeatCurrentClause` tại dòng 838:
```typescript
  const repeatCurrentClause = async () => {
    if (!clauses[currentClauseIndex]) return
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.src = ""
      currentAudioRef.current = null
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    const currentProsody = prosodyClauses && prosodyClauses[currentClauseIndex] ? prosodyClauses[currentClauseIndex] : null
    await speakClause(clauses[currentClauseIndex], playbackIdRef.current, {
      customRateStr: currentProsody?.rate,
      style: currentProsody?.style || acousticStyle,
      noiseScale: currentProsody?.noise_scale,
      noiseW: currentProsody?.noise_w,
      readPunctuation: readPunctuation,
    })
  }
```

### 4.6. Thay thế Header Live Status Badge (Dòng 982–986)

```tsx
        <div className="flex items-center gap-2">
          {/* Badge 1: Piper VITS Readiness */}
          <div className="hidden sm:flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 rounded-full px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Piper VITS (Sẵn sàng)</span>
          </div>

          {/* Badge 2: Qwen2.5 On-Demand RAM State */}
          <div
            className={`hidden md:flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
              qwenLifecycleState === "processing"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : qwenLifecycleState === "unloaded"
                ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                : qwenStatus.offline
                ? "border-slate-500/20 bg-slate-500/10 text-slate-500"
                : "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                qwenLifecycleState === "processing"
                  ? "bg-amber-500 animate-ping"
                  : qwenLifecycleState === "unloaded"
                  ? "bg-blue-500"
                  : qwenStatus.offline
                  ? "bg-slate-400"
                  : "bg-emerald-500/80"
              }`}
            />
            <span>
              {qwenLifecycleState === "processing"
                ? "Qwen2.5: Đang bật cờ xử lý..."
                : qwenLifecycleState === "unloaded"
                ? "Qwen2.5: Đã lưu kịch bản & Xả RAM (0MB)"
                : qwenStatus.offline
                ? "Qwen2.5: Chế độ Sư phạm Tất định"
                : `Qwen2.5: Ngủ 0MB RAM (Trống ${qwenStatus.available_ram_mb || 1850}MB)`}
            </span>
          </div>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
```

### 4.7. Thêm Nút Trích Xuất SGK/PDF vào Toolbar Bài Đọc (Dòng 1104)

```tsx
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsExtractSgkOpen(true)}
                    className="h-8 px-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1 rounded-lg cursor-pointer"
                    title="Trích xuất và làm sạch văn bản SGK / scan PDF bằng Qwen2.5 On-Demand"
                  >
                    <span className="material-symbols-rounded text-base">document_scanner</span>
                    <span>Trích xuất SGK</span>
                  </Button>
```

### 4.8. Thêm Nút "🎬 Qwen2.5 Đạo diễn Nhịp đọc" & Bảng Xem Trước Kịch Bản (Dòng 1215)

```tsx
                {/* ── NÚT KÍCH HOẠT ĐẠO DIỄN NHỊP ĐỌC QWEN 2.5 ── */}
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      if (!passageText.trim()) return
                      setIsDirectingProsody(true)
                      setQwenLifecycleState("processing")
                      try {
                        const res = await fetch("/api/dictation/qwen-director", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "direct_prosody",
                            passage: passageText,
                            difficult_words: difficultWordsList,
                            grade: Number(aiGradeLevel || 3),
                            chunk_mode: chunkMode,
                          }),
                        })
                        if (res.ok) {
                          const data = await res.json()
                          const clauses = data.clauses || data.data?.clauses || []
                          setProsodyClauses(clauses)
                          setProsodyCacheHit(Boolean(data.cache_hit || data.data?.cache_hit))
                          setIsProsodyPreviewOpen(true)
                          setQwenLifecycleState("unloaded")
                          setTimeout(() => setQwenLifecycleState("idle"), 4000)
                        } else {
                          const errData = await res.json().catch(() => ({}))
                          alert(errData.error || "Không thể đạo diễn nhịp đọc lúc này.")
                          setQwenLifecycleState("idle")
                        }
                      } catch (err) {
                        console.error(err)
                        setQwenLifecycleState("idle")
                      } finally {
                        setIsDirectingProsody(false)
                      }
                    }}
                    disabled={isDirectingProsody || !passageText.trim()}
                    className="h-8 px-3 text-xs font-bold bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 hover:bg-amber-500/20 gap-1.5 rounded-lg cursor-pointer"
                  >
                    <span className="material-symbols-rounded text-base text-amber-600">
                      {isDirectingProsody ? "hourglass_empty" : "movie_edit"}
                    </span>
                    <span>
                      {isDirectingProsody ? "Qwen đang đạo diễn..." : "🎬 Qwen2.5 Đạo diễn Nhịp đọc"}
                    </span>
                  </Button>

                  {prosodyClauses.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                        {prosodyCacheHit ? "⚡ Cache Hit (<1ms)" : "♻️ Đã xả RAM 0MB"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setProsodyClauses([])}
                        className="text-[11px] text-muted-foreground hover:text-rose-600 cursor-pointer underline ml-1"
                      >
                        Xóa kịch bản
                      </button>
                    </div>
                  )}
                </div>

                {/* ── BẢNG XEM TRƯỚC KỊCH BẢN TRỌNG ÂM TƯƠNG TÁC (PROSODY PREVIEW) ── */}
                {prosodyClauses.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                        <span className="material-symbols-rounded text-sm text-amber-600">theater_comedy</span>
                        <span>Kịch bản Âm học Sư phạm ({prosodyClauses.length} cụm câu)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsProsodyPreviewOpen(prev => !prev)}
                        className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{isProsodyPreviewOpen ? "Thu gọn" : "Mở rộng"}</span>
                        <span className="material-symbols-rounded text-sm">
                          {isProsodyPreviewOpen ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                    </div>

                    {isProsodyPreviewOpen && (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {prosodyClauses.map((c, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border border-border/60 bg-card flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-[11px] text-muted-foreground">
                                  #{idx + 1}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    c.style === "warm_story"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300"
                                      : c.style === "emphasis"
                                      ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border-amber-400 font-extrabold"
                                      : c.style === "question"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300"
                                  }`}
                                >
                                  {c.style_label || c.style}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Tốc độ: {c.rate}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                  ⏱️ Nghỉ: {c.pause_sec}s
                                </span>
                                {c.matched_difficult_words && c.matched_difficult_words.length > 0 && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/40 px-1 py-0.2 rounded">
                                    +2.5s từ khó ({c.matched_difficult_words.join(", ")})
                                  </span>
                                )}
                              </div>
                              <p className="text-card-foreground font-medium leading-relaxed">
                                {c.text}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const token = ++playbackIdRef.current
                                speakClause(c.text, token, {
                                  customRateStr: c.rate,
                                  style: c.style,
                                  noiseScale: c.noise_scale,
                                  noiseW: c.noise_w,
                                  readPunctuation: readPunctuation,
                                })
                              }}
                              className="p-1.5 rounded-lg border border-border/60 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 cursor-pointer shrink-0"
                              title="Nghe thử ngữ điệu cụm này"
                            >
                              <span className="material-symbols-rounded text-base">volume_up</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
```

### 4.9. Thêm Phong Cách Âm Học & Toggle Đọc Dấu Câu vào Cột Phải (Dòng 1338)

```tsx
              {/* Phong cách ngữ điệu sư phạm (Prosody Style Presets) */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Sắc thái âm học (Piper VITS)
                </label>
                <Select
                  value={acousticStyle}
                  onValueChange={(val: any) => setAcousticStyle(val)}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium border-border/60 rounded-lg">
                    <SelectValue placeholder="Chọn sắc thái ngữ điệu..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard" className="text-xs">
                      Chuẩn mực sư phạm (Rõ ràng, đều nhịp)
                    </SelectItem>
                    <SelectItem value="warm_story" className="text-xs">
                      Ấm áp kể chuyện (Truyền cảm, dịu dàng)
                    </SelectItem>
                    <SelectItem value="emphasis" className="text-xs">
                      Nhấn mạnh trọng âm (Rõ thanh điệu, từ khó)
                    </SelectItem>
                    <SelectItem value="question" className="text-xs">
                      Hỏi đáp tương tác (Lên giọng cuối câu)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Đọc tên dấu câu chính tả */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-card-foreground">
                    <span className="material-symbols-rounded text-sm text-emerald-600">spellcheck</span>
                    <span>Đọc tên dấu câu</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Đọc rõ &quot;, phẩy,&quot;, &quot;, chấm.&quot; cho học sinh lớp 1-2
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReadPunctuation(prev => !prev)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    readPunctuation ? "bg-emerald-600" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                      readPunctuation ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
```

### 4.10. Thêm Dialog Trích Xuất SGK/PDF (Cuối trang, trước thẻ đóng `</div>`)

```tsx
      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: TRÍCH XUẤT SGK / PDF BẰNG QWEN 2.5 SLM (ON-DEMAND & XẢ RAM)
      ────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isExtractSgkOpen} onOpenChange={setIsExtractSgkOpen}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-700 dark:text-emerald-400">
              <span className="material-symbols-rounded text-lg">document_scanner</span>
              <span>Trích Xuất SGK / PDF (Qwen2.5 On-Demand)</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mô hình SLM sẽ tự động lọc số trang, tiêu đề thừa, câu hỏi bài tập và trích xuất từ khó. Tự động xả RAM ngay sau khi trích xuất.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Khối lớp</Label>
                <Select value={extractGrade} onValueChange={setExtractGrade}>
                  <SelectTrigger className="h-8 text-xs font-bold border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lớp 1</SelectItem>
                    <SelectItem value="2">Lớp 2</SelectItem>
                    <SelectItem value="3">Lớp 3</SelectItem>
                    <SelectItem value="4">Lớp 4</SelectItem>
                    <SelectItem value="5">Lớp 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col justify-end">
                <input
                  type="file"
                  id="extract-file-input"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = ev => {
                        const content = ev.target?.result as string
                        if (content) setRawExtractText(content)
                      }
                      reader.readAsText(file)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("extract-file-input")?.click()}
                  className="h-8 text-xs border-border/60 gap-1 cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">upload_file</span>
                  <span>Tải file .txt</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <Label>Văn bản thô từ SGK / PDF scan</Label>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {rawExtractText.length} ký tự
                </span>
              </div>
              <Textarea
                rows={6}
                value={rawExtractText}
                onChange={e => setRawExtractText(e.target.value)}
                placeholder="Dán nội dung bài đọc lẫn số trang, tiêu đề hoặc câu hỏi SGK vào đây... Ví dụ: Trang 45. Bài 12: Ai có lỗi. Cơn giận lặng xuống..."
                className="text-xs border-border/60 resize-none font-mono"
              />
            </div>

            {extractError && (
              <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200">
                {extractError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsExtractSgkOpen(false)
                setExtractError(null)
              }}
              className="h-8 text-xs border-border/60 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              disabled={isExtractingSgk || !rawExtractText.trim()}
              onClick={async () => {
                setIsExtractingSgk(true)
                setExtractError(null)
                setQwenLifecycleState("processing")
                try {
                  const res = await fetch("/api/dictation/qwen-director", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "extract_sgk",
                      raw_text: rawExtractText,
                      grade: Number(extractGrade),
                    }),
                  })
                  if (res.ok) {
                    const data = await res.json()
                    const payload = data.data || data
                    if (payload.title) setTitle(payload.title)
                    if (payload.clean_content) setPassageText(payload.clean_content)
                    if (payload.difficultWords) {
                      const dw = Array.isArray(payload.difficultWords)
                        ? payload.difficultWords.join(", ")
                        : String(payload.difficultWords)
                      setDifficultWords(dw)
                    }
                    setProsodyClauses([]) // Reset prosody clauses
                    setIsExtractSgkOpen(false)
                    setQwenLifecycleState("unloaded")
                    setTimeout(() => setQwenLifecycleState("idle"), 4000)
                  } else {
                    const errData = await res.json().catch(() => ({}))
                    setExtractError(errData.error || "Không thể trích xuất SGK lúc này.")
                    setQwenLifecycleState("idle")
                  }
                } catch (err: any) {
                  setExtractError("Lỗi kết nối trạm AI Python Core (:8000).")
                  setQwenLifecycleState("idle")
                } finally {
                  setIsExtractingSgk(false)
                }
              }}
              className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1 cursor-pointer"
            >
              {isExtractingSgk ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <span className="material-symbols-rounded text-sm">auto_fix_high</span>
              )}
              <span>{isExtractingSgk ? "Đang trích xuất & xả RAM..." : "Trích xuất & Điền vào bài"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```
