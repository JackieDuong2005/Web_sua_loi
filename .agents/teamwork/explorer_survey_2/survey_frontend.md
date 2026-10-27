# BÁO CÁO KHẢO SÁT & THIẾT KẾ KIẾN TRÚC FRONTEND MULTI-SURFACE UI
## Tích hợp Hệ thống Tách rời Ngữ nghĩa - Âm học (Qwen2.5-0.5B + Piper VITS ONNX) trên Raspberry Pi 4 (4GB RAM)

---

## 1. TỔNG QUAN KHẢO SÁT & MỤC TIÊU NGHIỆP VỤ

Báo cáo khảo sát này phục vụ việc triển khai **Semantic-Acoustic Decoupled Pipeline** (Qwen2.5-0.5B SLM + Piper VITS ONNX Engine) xuyên suốt 4 bề mặt giao diện chính của hệ sinh thái **ViHand Grade**:
1. **Teacher Dictation Cockpit** (`app/teacher/dictation/page.tsx`): Trình phát đọc chính tả sư phạm 4 bước, trích xuất văn bản SGK/PDF, đạo diễn nhịp điệu đọc câu, tinh chỉnh âm học VITS và trình chiếu bảng xanh.
2. **Teacher Grading Studio** (`app/teacher/grade/page.tsx`): Bàn chấm điểm AI (YOLOv8 + ViT5), nghe cô giáo đọc nhận xét và nghe phát âm chuẩn từ sửa lỗi.
3. **Student Portal Dashboard** (`app/student/page.tsx`): Bảng điều khiển học tập & đồng hành cùng phụ huynh, nghe nhận xét bài gần nhất và kho từ luyện tập.
4. **Student Grade Detail Modal** (`components/student/student-grade-detail-modal.tsx`): Hộp thoại chi tiết bài thi, nghe đọc nhận xét chuẩn TT27 và nghe phát âm chuẩn từng từ sai có bounding box trực quan.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 HỆ SINH THÁI ĐA BỀ MẶT VIHAND GRADE (MULTI-SURFACE)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  Teacher Dictation   │    │    Teacher Grading   │    │   Student Portal    │
│  (`app/teacher/      │    │    (`app/teacher/    │    │  (`app/student/     │
│   dictation/`)       │    │     grade/`)         │    │   page.tsx` & Modal)│
├──────────────────────┤    ├──────────────────────┤    ├─────────────────────┤
│• Qwen RAM Status     │    │• "🔊 Nghe cô giáo đọc│    │• "🔊 Nghe nhận xét" │
│  (Ngủ 0MB / Xả RAM)  │    │  nhận xét"           │    │  (warm_story)       │
│• Trích xuất SGK/PDF  │    │  (warm_story)        │    │• Phát âm từ sửa lỗi │
│• Đạo diễn nhịp đọc   │    │• Phát âm sửa lỗi     │    │  (emphasis)         │
│• VITS Acoustic Ctrls │    │  (emphasis)          │    │• BBox Canvas audio  │
│• Step 3 Dynamic Loop │    │                      │    │                     │
└──────────────────────┘    └──────────────────────┘    └─────────────────────┘
                                      │
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │       Next.js BFF API Gateway (`app/api/`)        │
             │  • /api/dictation/qwen-director (status, POST)   │
             │  • /api/dictation/tts (?style, &read_punct)      │
             │  • /api/dictation/play-local (Loa RPi 3.5mm AUX) │
             └──────────────────────────────────────────────────┘
                                      │
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │        Python AI Core Service (:8000)            │
             │  • Qwen2.5-0.5B ON_DEMAND_UNLOAD (0 MB idle)     │
             │  • Piper VITS ONNX Audio Synthesis (ARM NEON)    │
             └──────────────────────────────────────────────────┘
```

---

## 2. KHẢO SÁT CHI TIẾT `app/teacher/dictation/page.tsx`

### 2.1. Cấu trúc hiện tại của file
- **Độ dài**: 2496 dòng, kiến trúc Single Page Client-side ("use client").
- **Dòng 30–63**: Khai báo Interface dữ liệu (`TextbookPassage`, `DictationLog`, `DictationSession`).
- **Dòng 66–117**: Định nghĩa danh sách giọng Piper VITS (`VOICE_CARDS`).
- **Dòng 177–232**: Thuật toán chia cụm từ sư phạm cục bộ thuần regex (`splitIntoPedagogicalClauses`).
- **Dòng 242–350**: Khai báo toàn bộ React State (Editor, Voice, Playback, 4 bước sư phạm, Modals).
- **Dòng 506–597**: Động cơ phát âm thanh `speakClause` và đếm ngược `sleepWithCountdown`.
- **Dòng 600–806**: 4 bước sư phạm:
  - Bước 1: Đọc mẫu toàn bài (`startStep1Overview`)
  - Bước 2: Hướng dẫn từ khó & bảng con (`startStep2DrillWord`)
  - Bước 3: Nghe - Viết chính thức (`startStep3Dictation`)
  - Bước 4: Soát lỗi & khóa Ground Truth (`startStep4Proofread`)
- **Dòng 972–1003**: Header chính (đang chứa badge tĩnh `Piper Offline TTS (Pi 4/5)`).
- **Dòng 1008–1063**: Thanh tab chuyển đổi (Trình phát đọc, Kho SGK, Lịch sử, Bảng xanh).
- **Dòng 1073–1484**: Cột soạn bài bên trái và Cột thiết lập sư phạm bên phải.
- **Dòng 1817–2202**: Chế độ Bảng xanh trình chiếu toàn màn hình (`showProjector`).

---

### 2.2. Điểm đặt & Cơ chế hiển thị Live Status Badge trong Header

#### Hiện trạng (Dòng 983–986):
```tsx
<div className="hidden sm:flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 rounded-full px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
  <span>Piper Offline TTS (Pi 4/5)</span>
</div>
```

#### Yêu cầu mới:
Badge thời gian thực hiển thị đồng thời 2 trạng thái:
1. **Piper ONNX Engine Readiness**: Sẵn sàng phát âm offline trên ARM Cortex-A72.
2. **Qwen2.5 SLM On-Demand Lifecycle & RAM**:
   - `Ngủ 0MB RAM`: Mô hình chưa nạp vào RAM, máy chủ RPi ở trạng thái tiết kiệm tối đa.
   - `Đang bật cờ xử lý`: Qwen đang nạp vào RAM và xử lý yêu cầu trích xuất SGK / đạo diễn nhịp đọc.
   - `Đã lưu kịch bản & Xả RAM`: Hoàn tất xử lý, kịch bản đã nằm trong cache LRU, Qwen đã được giải phóng hoàn toàn (`gc.collect()`).

#### Thiết kế State & Hook:
```typescript
interface QwenStatusState {
  enabled: boolean
  is_loaded: boolean
  available_ram_mb: number
  lifecycle_mode: "on_demand_unload" | "persistent"
  active_action?: "idle" | "extracting" | "directing" | "unloaded"
  last_unloaded_at?: number
  cached_scripts_count?: number
}
```

#### Cơ chế cập nhật:
- Polling nhẹ nhàng mỗi **10 giây** qua route `GET /api/dictation/qwen-director` (proxies `/qwen/status`).
- Khi người dùng bấm nút "Trích xuất SGK" hoặc "Đạo diễn Nhịp đọc", state chuyển tức thì sang `active_action = "extracting"` hoặc `"directing"` (`Đang bật cờ xử lý`).
- Khi request hoàn tất, state chuyển sang `active_action = "unloaded"` (`Đã lưu kịch bản & Xả RAM`) kèm hiệu ứng tick xanh mượt mà trong 4 giây trước khi trở về `Ngủ 0MB RAM`.

#### Giao diện Badge đề xuất:
```tsx
<div className="flex items-center gap-2">
  {/* Piper Readiness */}
  <div className="hidden md:flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 rounded-full px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
    <span>Piper VITS (Sẵn sàng)</span>
  </div>

  {/* Qwen2.5 Lifecycle & RAM Badge */}
  <div className={`flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
    qwenStatus.is_loaded || isQwenProcessing
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : qwenJustUnloaded
      ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400"
      : "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300"
  }`}>
    <span className={`w-2 h-2 rounded-full ${
      isQwenProcessing
        ? "bg-amber-500 animate-ping"
        : qwenJustUnloaded
        ? "bg-blue-500"
        : "bg-slate-400"
    }`} />
    <span>
      {isQwenProcessing
        ? "Qwen2.5: Đang bật cờ xử lý..."
        : qwenJustUnloaded
        ? "Qwen2.5: Đã lưu kịch bản & Xả RAM (0MB)"
        : `Qwen2.5: Ngủ 0MB RAM (Trống ${qwenStatus.available_ram_mb || 1850}MB)`}
    </span>
  </div>
</div>
```

---

### 2.3. Hộp thoại "Trích xuất SGK / PDF (Qwen2.5)"

#### Vị trí nút bấm:
Tại Header bài đọc (`app/teacher/dictation/page.tsx`, Dòng 1093–1138), đặt nút **"📄 Trích xuất SGK / PDF (Qwen2.5)"** ngay cạnh nút "AI soạn bài".

#### Thành phần Dialog:
- **Tiêu đề**: "Trích xuất SGK / PDF bằng Qwen2.5 SLM (On-Demand)"
- **Bộ điều khiển**:
  - Khối lớp (Lớp 1, 2, 3, 4, 5) để Qwen căn chỉnh độ phức tạp từ ngữ.
  - Vùng kéo thả file `.txt` hoặc bấm chọn file (sử dụng `FileReader.readAsText`).
  - Ô Textarea nhập văn bản thô copy từ SGK hoặc tài liệu scan PDF (thường chứa lẫn lộn số trang: "Trang 45", tên bài học: "Bài 12", câu hỏi thảo luận: "Câu 1: Em hãy thảo luận nhóm...").
- **Hành động xử lý**:
  - Gửi `POST /api/dictation/qwen-director` với payload:
    ```json
    {
      "action": "extract_sgk",
      "raw_text": "...",
      "grade": 3
    }
    ```
  - Backend kích hoạt Qwen SLM (nếu RAM trống >= 650MB, ngược lại dùng fallback sư phạm tất định), làm sạch nội dung, trích xuất:
    ```json
    {
      "title": "Ai có lỗi",
      "clean_content": "Cơn giận lặng xuống. Tôi bắt đầu thấy hối hận...",
      "difficultWords": "hối hận, En-ri-cô, sứt chỉ, can đảm",
      "summary": "...",
      "ram_unloaded": true
    }
    ```
  - Tự động điền dữ liệu vào state: `setTitle`, `setPassageText`, `setDifficultWords`.
  - Hiển thị Toast thông báo: "Đã trích xuất sạch sẽ và giải phóng hoàn toàn RAM cho Raspberry Pi!"

---

### 2.4. Nút "Qwen2.5 Đạo diễn Nhịp đọc" & Bảng xem trước Kịch bản Trọng âm (Prosody Script Preview)

#### Bối cảnh:
Hiện tại `app/teacher/dictation/page.tsx` sử dụng hàm regex thuần `splitIntoPedagogicalClauses` (Dòng 177–232). Thuật toán này chia câu theo dấu chấm/phẩy cố định nhưng:
- Không nhận biết được câu nào chứa từ khó để tăng thời gian nghỉ cho học sinh viết.
- Không gán được sắc thái âm học (`style`: `warm_story`, `emphasis`, `standard`, `question`).
- Không điều chỉnh được thông số VITS (`noise_scale`, `noise_w`, `rate`, `pause_sec`).

#### Giao diện Nút bấm & Kích hoạt:
Đặt nút **"🎬 Qwen2.5 Đạo diễn Nhịp đọc"** phía trên vùng xem trước cụm câu (Dòng 1218 hoặc trong Cột thiết lập sư phạm).

#### Interface Dữ liệu Kịch bản Âm học (Prosody Clause):
```typescript
interface ProsodyClause {
  index: number
  text: string
  word_count: number
  style: "warm_story" | "standard" | "emphasis" | "question"
  style_label: string
  rate: string // ví dụ "-15%", "-20%"
  noise_scale: number
  noise_w: number
  pause_sec: number // ví dụ 8s, 10s, 12.5s
  matched_difficult_words?: string[]
}
```

#### Quy trình xử lý:
1. Gửi request:
   ```json
   {
     "action": "direct_prosody",
     "passage": passageText,
     "difficult_words": difficultWords,
     "grade": 3,
     "chunk_mode": chunkMode
   }
   ```
2. Lưu kết quả vào state: `prosodyClauses: ProsodyClause[]`.
3. Hiển thị khối **Interactive Prosody Script Preview**:
   - Mỗi thẻ cụm câu hiển thị:
     - Số thứ tự cụm (`#1`, `#2`...).
     - Nội dung văn bản (giữ nguyên 100% từng chữ và dấu câu gốc của SGK).
     - Badge phong cách:
       - `warm_story` ➔ Xanh ngọc (`bg-emerald-100 text-emerald-800`): Cụm mở đầu, kể chuyện ấm áp.
       - `emphasis` ➔ Vàng nghệ (`bg-amber-100 text-amber-800 border-amber-300`): Cụm có từ khó cần nhấn rõ trọng âm và kéo dài ngắt nghỉ.
       - `standard` ➔ Xám nhạt (`bg-slate-100 text-slate-700`): Đọc chuẩn mực.
       - `question` ➔ Tím pastel (`bg-purple-100 text-purple-800`): Lên giọng cuối câu hỏi.
     - Thời gian nghỉ viết dự kiến: `pause_sec` giây (ví dụ: `11.5s (đã bù +2.5s do có từ khó)`).
     - Nút "🔊 Nghe thử cụm này": Cho phép giáo viên kiểm tra ngay âm sắc cụm câu trước khi vào lớp.

---

### 2.5. Bổ sung Bộ điều khiển Âm học Piper VITS (Acoustic Controls)

Tại Cột phải (Dòng 1248–1438) và Bảng xanh trình chiếu (Dòng 2050–2200):
1. **Prosody Style Selector (Phong cách phát âm chủ đạo)**:
   - Thêm dropdown/radio pill chọn phong cách:
     - `warm_story` (Ấm áp kể chuyện - `noise_scale=0.78, noise_w=0.90, length=1.05`)
     - `standard` (Chuẩn mực sư phạm - `noise_scale=0.667, noise_w=0.80, length=1.00`)
     - `emphasis` (Nhấn mạnh rõ chữ - `noise_scale=0.58, noise_w=0.72, length=1.20`)
     - `question` (Hỏi đáp ngữ điệu - `noise_scale=0.82, noise_w=0.92, length=1.08`)
2. **Toggle "Đọc tên dấu câu" (`read_punctuation`)**:
   - Thêm switch toggle: "Đọc tên dấu câu (phẩy, chấm, chấm than...)".
   - Khi bật, engine tự động đọc rõ ", phẩy,", ", chấm." để học sinh lớp 1-2 không bị quên dấu khi nghe viết.

---

### 2.6. Nâng cấp Vòng lặp Phát đọc Bước 3 (`speakClause` & `startStep3Dictation`)

#### Hiện trạng của `speakClause` (Dòng 535–597):
Chỉ truyền `text`, `voice`, `rate`. Bỏ qua hoàn toàn `style`, `noise_scale`, `noise_w`, `read_punctuation`.

#### Nâng cấp hàm `speakClause`:
```typescript
const speakClause = (
  clause: string,
  sessionToken: number,
  options?: {
    customRateStr?: string
    style?: string
    noiseScale?: number
    noiseW?: number
    readPunctuation?: boolean
  }
): Promise<boolean> => {
  // Forward đầy đủ các tham số tới /api/dictation/play-local hoặc /api/dictation/tts
  ...
}
```

#### Nâng cấp vòng lặp `startStep3Dictation` (Dòng 683–751):
- Nếu `prosodyClauses.length > 0` (đã có đạo diễn từ Qwen2.5):
  - Lặp qua từng `clause` trong `prosodyClauses`.
  - Tự động áp dụng:
    - `style`: `clause.style`
    - `rate`: `clause.rate`
    - `noise_scale`: `clause.noise_scale`
    - `noise_w`: `clause.noise_w`
    - `pause_sec`: `clause.pause_sec`
    - `read_punctuation`: `globalReadPunctuation`
- Nếu chưa chạy đạo diễn: fallback an toàn về danh sách cụm tách tất định với các thiết lập toàn cục.

---

## 3. KHẢO SÁT `app/teacher/grade/page.tsx` (TEACHER GRADING STUDIO)

### 3.1. Điểm đặt "🔊 Nghe cô giáo đọc nhận xét"
- **Vị trí**: Khối "Nhận xét của giáo viên" (`app/teacher/grade/page.tsx`, Dòng 740–775).
- **Hiện trạng**: Header hiện chỉ có tiêu đề `Nhận xét của giáo viên` và nút `3 Gợi ý mẫu` (`Sparkles`). Ô nhập `teacherComment` nằm ngay bên dưới.
- **Giải pháp thiết kế**:
  - Bổ sung nút bấm âm thanh tại Header hoặc góc dưới bên phải của textarea:
    ```tsx
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => playCommentAudio(teacherComment)}
      disabled={!teacherComment.trim() || isPlayingComment}
      className="h-7 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1.5 rounded-lg"
      title="Nghe cô giáo AI đọc thử nhận xét này"
    >
      <Volume2 className={`w-3.5 h-3.5 ${isPlayingComment ? "animate-pulse text-emerald-600" : ""}`} />
      <span>{isPlayingComment ? "Đang đọc..." : "Nghe cô đọc"}</span>
    </Button>
    ```
  - **Tham số âm học**: `voice=vi_VN-vais1000-medium&style=warm_story` tạo âm sắc nhẹ nhàng, động viên học sinh theo chuẩn Thông tư 27.

### 3.2. Cập nhật nút phát âm từ sửa lỗi sang `style=emphasis`
- **Vị trí**: Danh sách lỗi (`app/teacher/grade/page.tsx`, Dòng 1076–1106).
- **Hiện trạng**: Mỗi lỗi hiển thị:
  `#{i + 1} c.error → c.suggestion [Badge Thể loại] [c.reason]`
  Hiện tại ở chế độ danh sách này **chưa có nút loa** phát âm từ đúng!
- **Giải pháp thiết kế**:
  - Bổ sung nút loa nhỏ cạnh `c.suggestion`:
    ```tsx
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        playWordPronunciation(c.suggestion)
      }}
      className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100/60 transition-all cursor-pointer ml-1"
      title={`Nghe phát âm chuẩn: ${c.suggestion}`}
    >
      <Volume2 className="w-3.5 h-3.5" />
    </button>
    ```
  - **Tham số âm học**: `voice=vi_VN-vais1000-medium&style=emphasis` (`noise_scale=0.58, length_multiplier=1.20`) giúp âm tiết vang, rõ từng phụ âm và thanh điệu.

---

## 4. KHẢO SÁT `app/student/page.tsx` & `student-grade-detail-modal.tsx`

### 4.1. Khảo sát `app/student/page.tsx`

#### Nút "🔊 Nghe cô giáo đọc nhận xét":
- **Vị trí**: Hero Banner kết quả bài gần nhất (Dòng 218–220):
  ```tsx
  <p className="text-xs sm:text-sm text-muted-foreground italic line-clamp-1">
    &ldquo;{latestGrade?.pedagogicalComment || latestGrade?.feedback || "Con làm bài rất tốt!"}&rdquo;
  </p>
  ```
- **Giải pháp**: Đặt nút icon loa nhỏ cạnh lời nhận xét, khi học sinh hoặc phụ huynh bấm vào, hệ thống stream audio từ:
  `/api/dictation/tts?text=${encodeURIComponent(comment)}&voice=vi_VN-vais1000-medium&style=warm_story`

#### Nâng cấp Kho từ cần ôn luyện (`wordsToPractice`):
- **Hiện trạng (Dòng 71)**:
  ```typescript
  const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
  ```
  *(Đang dùng hardcoded `vi-VN-HoaiMyNeural` cũ thay vì Piper ONNX offline!)*
- **Giải pháp cập nhật**:
  ```typescript
  const audio = new Audio(
    `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`
  )
  ```

---

### 4.2. Khảo sát `components/student/student-grade-detail-modal.tsx`

#### Nút "🔊 Nghe cô giáo đọc nhận xét":
- **Vị trí**: Khối "Nhận xét sư phạm của Giáo viên" (Dòng 456–468):
  ```tsx
  <div className="flex items-center justify-between gap-1.5">
    <div className="flex items-center gap-1.5">
      <Sparkles className="w-4 h-4 text-primary" />
      <h3 className="font-bold text-xs sm:text-sm text-primary">
        Nhận xét sư phạm của Giáo viên (Thông tư 27)
      </h3>
    </div>
    {/* NÚT THÊM MỚI TẠI ĐÂY */}
    <Button
      size="sm"
      variant="outline"
      onClick={() => playComment(commentText)}
      className="h-7 text-xs font-semibold gap-1 text-primary border-primary/30"
    >
      <Volume2 className="w-3.5 h-3.5" />
      <span>Nghe cô nhận xét</span>
    </Button>
  </div>
  ```
- **Tham số âm học**: `voice=vi_VN-vais1000-medium&style=warm_story`.

#### Nâng cấp phát âm từ sửa lỗi (`playAudio`):
- **Hiện trạng (Dòng 238)**:
  ```typescript
  const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
  ```
- **Giải pháp cập nhật**:
  Đổi thành:
  ```typescript
  const audio = new Audio(
    `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`
  )
  ```
  Nhờ việc hàm `playAudio` này được truyền thẳng vào prop `onPlayAudio` của `StudentBoundingBoxCanvas` (Dòng 329), khi học sinh bấm vào bất kỳ ô khoanh Bounding Box đỏ nào trên trang vở thật, âm thanh phát ra sẽ tự động sử dụng chuẩn âm học `style=emphasis` rõ nét!

---

## 5. MA TRẬN ĐỐI SOÁT HỢP ĐỒNG API & THAM SỐ ÂM HỌC (API & PROSODY PARITY)

| Bề mặt UI | Điểm kích hoạt | Endpoint & Tham số | Preset âm học | Mục đích sư phạm |
|---|---|---|---|---|
| **Dictation** | Step 1 Đọc mẫu | `/api/dictation/tts?style=warm_story` | `warm_story` (`noise_scale=0.78, noise_w=0.90`) | Giọng đọc truyền cảm, ấm áp, nhịp vừa phải để học sinh cảm thụ bài văn. |
| **Dictation** | Step 2 Từ khó | `/api/dictation/tts?style=emphasis` | `emphasis` (`noise_scale=0.58, length=1.20`) | Ngắt tiếng rõ từng âm tiết, nhấn mạnh phụ âm đầu/dấu thanh. |
| **Dictation** | Step 3 Nghe - Viết | `/api/dictation/tts?style={clause.style}&read_punctuation={bool}` | Dynamic per clause | Tự động đổi style theo kịch bản Qwen2.5, đọc tên dấu câu để tránh sót. |
| **Dictation** | Trích xuất SGK | `/api/dictation/qwen-director` (`action: "extract_sgk"`) | N/A (SLM NLP) | Lọc bỏ số trang, câu hỏi thảo luận, trích xuất từ khó, xả RAM ngay. |
| **Dictation** | Đạo diễn nhịp đọc | `/api/dictation/qwen-director` (`action: "direct_prosody"`) | N/A (SLM NLP) | Gán phong cách đọc, tốc độ và thời gian nghỉ viết từng cụm. |
| **Grading** | Đọc nhận xét cô | `/api/dictation/tts?style=warm_story` | `warm_story` | Giọng cô giáo động viên, chuẩn mực theo Thông tư 27. |
| **Grading** | Phát âm từ sai | `/api/dictation/tts?style=emphasis` | `emphasis` | Giúp giáo viên & học sinh kiểm tra âm thanh chuẩn khi chấm. |
| **Student** | Banner nhận xét | `/api/dictation/tts?style=warm_story` | `warm_story` | Cho bé nghe lời cô giáo khen ngợi trước khi học bài mới. |
| **Student** | Sổ tay từ khó | `/api/dictation/tts?style=emphasis` | `emphasis` | Bé nghe và lặp lại theo đúng ngữ điệu chuẩn tiếng Việt. |
| **Student Modal** | Bounding Box click | `/api/dictation/tts?style=emphasis` | `emphasis` | Bấm trực tiếp lên ảnh vở để nghe từ viết sai phát âm đúng như thế nào. |

---

## 6. KHUYẾN NGHỊ KỸ THUẬT & TRÁNH REGRESSION

1. **Quản lý Vòng đời Audio (`HTMLAudioElement`)**:
   - Luôn dừng (`audio.pause()`) và giải phóng audio instance cũ (`audioRef.current = null`) trước khi phát âm thanh mới để tránh chồng lấn âm thanh khi người dùng click liên tục nhiều từ.
2. **Khả năng tương thích ngược (Backward Compatibility)**:
   - Nếu Python Core chưa kịp khởi động hoặc offline, route `/api/dictation/tts` vẫn trả về phản hồi thích hợp với header `X-TTS-Engine`. Giao diện cần hiển thị Toast thông báo thân thiện: "Không thể phát âm thanh ngoại tuyến từ Raspberry Pi. Vui lòng kiểm tra dịch vụ python_service".
3. **Cơ chế Fallback khi Qwen2.5 không đủ RAM**:
   - Khi RAM trống < 650MB, backend tự động chuyển về deterministic rule-based extractor/director mà không làm treo UI giáo viên. UI nhận phản hồi thành công và hiển thị badge "Chế độ Sư phạm Tất định (Tiết kiệm RAM)".
4. **Không làm vỡ Layout Bảng xanh Trình chiếu**:
   - Mọi nút bấm mới (Acoustic Style, Read Punctuation) trong Presentation Overlay phải dùng mã màu và font chữ đã chuẩn hóa (`bg-[#F4F1E8]/10`, `text-[#FDE68A]`, `font-['Lexend']`).

---
*Báo cáo được hoàn thiện bởi: Explorer Survey Agent — ViHand Grade Architecture Team.*
