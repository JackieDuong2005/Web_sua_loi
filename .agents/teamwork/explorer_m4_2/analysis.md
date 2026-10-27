# BÁO CÁO PHÂN TÍCH & THIẾT KẾ CHI TIẾT FRONTEND AUDIO INTEGRATION (EXPLORER 2)
## Milestone 4: Multi-Surface Teacher & Student UI Integration (Grading Studio & Student Portal)

---

## 1. TỔNG QUAN KIẾN TRÚC & PHẠM VI NGHIÊN CỨU

Báo cáo này nghiên cứu và đặc tả thiết kế tích hợp âm thanh Piper VITS ONNX (`vi_VN-vais1000-medium`) với 2 phong cách âm học sư phạm chủ đạo:
- **`style=warm_story`**: Dành cho lời nhận xét sư phạm của giáo viên (ấm áp, biểu cảm, động viên học sinh theo Thông tư 27).
- **`style=emphasis`**: Dành cho phát âm sửa lỗi chính tả và bấm Bounding Box trên trang vở thật (ngắt rõ từng âm tiết, nhấn mạnh phụ âm đầu, vần và thanh điệu, tốc độ vừa phải).

### Sơ đồ Luồng Âm thanh Đa Bề mặt (ASCII Diagram)

```
+-----------------------------------------------------------------------------------------+
|                                    CÁC BỀ MẶT CLIENT                                    |
+-----------------------------------------------------------------------------------------+
|  1. Teacher Grading Studio          2. Student Portal           3. Student Modal & BBox |
|  (`app/teacher/grade/page.tsx`)     (`app/student/page.tsx`)    (`student-grade-detail`) |
|  - "🔊 Nghe cô giáo đọc nhận xét"   - "🔊 Nghe cô nhận xét"     - "🔊 Nghe cô nhận xét" |
|    (warm_story)                       (warm_story)                (warm_story)          |
|  - Phát âm c.suggestion (emphasis)  - Sổ tay từ khó (emphasis)  - Phát âm từ & BBox click|
|                                                                   (emphasis)            |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                                  AUDIO LIFECYCLE CONTROLLER                             |
|  - HTMLAudioElement instance manager (audioRef)                                         |
|  - Single-track enforcement (pause active stream before starting new sound)             |
|  - Mutual exclusion: playingComment vs playingWord/playingText                         |
|  - Toggle click (click playing item -> pause & reset state)                            |
|  - Component unmount cleanup (pause & audioRef.current = null)                          |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v HTTP GET
+-----------------------------------------------------------------------------------------+
|                                NEXT.JS BFF ROUTE GATEWAY                                |
|  GET /api/dictation/tts?text={...}&voice=vi_VN-vais1000-medium&style={warm_story|emphasis}|
+-----------------------------------------------------------------------------------------+
                                             |
                                             v HTTP Proxy :8000
+-----------------------------------------------------------------------------------------+
|                              PYTHON AI SERVICE (:8000/tts)                              |
|  Piper VITS ONNX Audio Engine (ARM NEON / ONNX Runtime) -> Binary audio/wav stream      |
+-----------------------------------------------------------------------------------------+
```

---

## 2. CHI TIẾT KHẢO SÁT & THIẾT KẾ TỪNG FILE

### 2.1. File 1: `app/teacher/grade/page.tsx` (Teacher Grading Studio)

#### A. Khảo sát Hiện trạng:
1. **Imports (Dòng 14–20)**: Chưa import `Volume2` từ `"lucide-react"`.
2. **Component `ResultPopup` (Dòng 389–1235)**:
   - Quản lý toàn bộ giao diện xem kết quả chấm điểm của giáo viên.
   - Quản lý `teacherComment` và `gradingResult.corrections`.
3. **Khối Nhận xét của giáo viên (Dòng 740–775)**:
   - Header gồm tiêu đề `Nhận xét của giáo viên` và nút `3 Gợi ý mẫu` (`Sparkles`).
   - Chưa có nút phát âm để giáo viên nghe thử câu nhận xét do AI tạo hoặc do cô viết.
4. **Danh sách lỗi & Gợi ý sửa (Dòng 1076–1106 & Dòng 1185–1217)**:
   - Có 2 chế độ hiển thị:
     - **Chế độ 1: Stacked/2-column (Dòng 1076–1106)**: Hiển thị `#{i + 1} c.error → c.suggestion [Badge]`. Chưa có nút loa phát âm từ đúng `c.suggestion`.
     - **Chế độ 2: Side-by-side (Dòng 1185–1217)**: Tương tự, chưa có nút loa phát âm từ đúng `c.suggestion`.

#### B. Thiết kế Giải pháp:
1. **Bổ sung State & Audio Controller vào `ResultPopup`**:
   - `isPlayingComment: boolean` — Trạng thái đang đọc nhận xét.
   - `playingWordIdx: number | null` — Index từ đang phát âm chuẩn.
   - `audioRef: React.MutableRefObject<HTMLAudioElement | null>` — Tham chiếu HTMLAudioElement để dừng khi chuyển từ hoặc unmount.
2. **Nút "🔊 Nghe cô giáo đọc nhận xét"**:
   - Đặt tại Header khối nhận xét (bên cạnh nút "3 Gợi ý mẫu").
   - Kích hoạt stream: `/api/dictation/tts?text=${encodeURIComponent(teacherComment)}&voice=vi_VN-vais1000-medium&style=warm_story`.
   - Disabled khi `teacherComment` rỗng.
   - Hiệu ứng trực quan: Icon `Volume2` đổi màu/nhấp nháy (`animate-pulse`) khi đang phát, bấm lại sẽ dừng.
3. **Nút phát âm từ sửa lỗi cạnh `c.suggestion`**:
   - Đặt icon loa nhỏ cạnh `c.suggestion` trong cả 2 chế độ (Stacked và Side-by-side).
   - Dùng `e.stopPropagation()` để không kích hoạt sự kiện click chọn thẻ lỗi cha.
   - Kích hoạt stream: `/api/dictation/tts?text=${encodeURIComponent(c.suggestion)}&voice=vi_VN-vais1000-medium&style=emphasis`.

---

### 2.2. File 2: `app/student/page.tsx` (Student Portal Dashboard)

#### A. Khảo sát Hiện trạng:
1. **Imports (Dòng 17)**: Đã import sẵn `Volume2`.
2. **Hero Banner nhận xét bài gần nhất (Dòng 218–220)**:
   ```tsx
   <p className="text-xs sm:text-sm text-muted-foreground italic line-clamp-1">
     &ldquo;{latestGrade?.pedagogicalComment || latestGrade?.feedback || "Con làm bài rất tốt!"}&rdquo;
   </p>
   ```
   Chưa có nút nghe âm thanh nhận xét.
3. **Kho từ cần ôn luyện (`wordsToPractice`, Dòng 65–75)**:
   ```typescript
   const playAudio = (text: string) => {
     if (!text) return
     if (audioRef.current) audioRef.current.pause()
     setPlayingWord(text)
     const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
     ...
   }
   ```
   Đang hardcode voice Microsoft Edge cũ `vi-VN-HoaiMyNeural` thay vì Piper VITS ONNX offline `vi_VN-vais1000-medium`.

#### B. Thiết kế Giải pháp:
1. **Thêm state & hàm `playCommentAudio`**:
   - Thêm `isPlayingComment: boolean`.
   - Hàm `playCommentAudio(text)` phát âm qua `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=warm_story`.
   - Đảm bảo cơ chế Toggle: click khi đang phát sẽ tạm dừng; click khi từ khác đang phát sẽ dừng từ đó.
2. **Cập nhật nút loa cạnh nhận xét tại Hero Banner**:
   - Đặt nút bấm nhỏ gọn cạnh dòng quote nhận xét của cô giáo.
3. **Cập nhật `playAudio` cho Kho từ khó**:
   - Đổi endpoint sang `voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`.
   - Bổ sung dọn dẹp `audioRef.current` khi unmount component.

---

### 2.3. File 3: `components/student/student-grade-detail-modal.tsx` (Student Grade Detail Modal)

#### A. Khảo sát Hiện trạng:
1. **Imports (Dòng 17)**: Đã import sẵn `Volume2`.
2. **Khối Lời nhận xét sư phạm (Dòng 456–468)**:
   - Hiển thị nhận xét sư phạm Thông tư 27:
     `{grade.pedagogicalComment || grade.feedback || "Con làm bài rất tốt..."}`.
   - Chưa có nút "🔊 Nghe cô nhận xét".
3. **Hàm `playAudio` (Dòng 234–243)**:
   ```typescript
   const playAudio = (text: string) => {
     if (!text) return
     if (audioRef.current) audioRef.current.pause()
     setPlayingText(text)
     const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
     audioRef.current = audio
     ...
   }
   ```
   Đang gọi hardcoded `vi-VN-HoaiMyNeural`.
4. **Liên kết với Canvas Bounding Box (Dòng 329)**:
   - `playAudio` được truyền trực tiếp vào prop `onPlayAudio` của `StudentBoundingBoxCanvas`.
   - Khi học sinh bấm vào ô BBox màu đỏ trên bài làm viết tay thật, canvas gọi `onPlayAudio(suggWord)` (Dòng 379 trong `student-bbox-canvas.tsx`).
   - Do đó, cập nhật `playAudio` trong modal này sẽ tự động nâng cấp trải nghiệm click BBox trên toàn bộ bài thi thật!

#### B. Thiết kế Giải pháp:
1. **Thêm state & hàm `playCommentAudio`**:
   - Thêm `isPlayingComment: boolean`.
   - Phát âm nhận xét với `style=warm_story`.
   - Thêm nút "🔊 Nghe cô nhận xét" tại header của khối nhận xét sư phạm (Dòng 458).
2. **Cập nhật `playAudio` sang `style=emphasis`**:
   - Đổi URL sang `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`.
   - Bổ sung logic toggle và dọn dẹp audio khi unmount hoặc đóng dialog.

---

## 3. BẢNG MA TRẬN ĐỐI SOÁT PARAMETERS (PROSODY MATRIX)

| Bề mặt & Vị trí | Element UI | Tham số URL TTS | Sắc thái âm học | Mục đích sư phạm |
|---|---|---|---|---|
| **Teacher Grade** (Dòng 741) | Nút "Nghe cô giáo đọc" | `voice=vi_VN-vais1000-medium&style=warm_story` | Ấm áp, nhẹ nhàng, tốc độ chuẩn | Cô giáo đọc nhận xét động viên tinh thần học sinh |
| **Teacher Grade** (Dòng 1101, 1210) | Nút loa cạnh `c.suggestion` | `voice=vi_VN-vais1000-medium&style=emphasis` | Rõ chữ, nhấn mạnh âm tiết, +20% độ dài | Giúp giáo viên & học sinh nghe rõ phát âm từ đúng |
| **Student Portal** (Dòng 218) | Nút "Nghe cô nhận xét" | `voice=vi_VN-vais1000-medium&style=warm_story` | Ấm áp, truyền cảm | Học sinh nghe lời khen ngợi của cô trước khi học |
| **Student Portal** (Dòng 71, 426) | Nút loa Kho từ ôn luyện | `voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%` | Nhấn rõ âm, tốc độ chậm rãi | Bé nghe chuẩn âm để tự luyện viết lại vào vở |
| **Student Modal** (Dòng 458) | Nút "Nghe cô nhận xét" | `voice=vi_VN-vais1000-medium&style=warm_story` | Ấm áp, chuẩn mực TT27 | Phụ huynh và học sinh nghe phân tích bài thi |
| **Student Modal** (Dòng 238, 329) | BBox click trên ảnh bài thi thật | `voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%` | Nhấn mạnh từ sửa lỗi | Trực quan hóa lỗi sai ngay trên nét bút viết tay |

---

## 4. CHI TIẾT MÃ NGUỒN ĐỀ XUẤT (CONCRETE CODE DIFFS)

Dưới đây là chi tiết mã nguồn chuẩn xác cho Worker M4 triển khai:

### 4.1. Diffs cho `app/teacher/grade/page.tsx`

#### Diff 1: Import `Volume2` từ `lucide-react`
```diff
--- a/app/teacher/grade/page.tsx
+++ b/app/teacher/grade/page.tsx
@@ -17,7 +17,7 @@ import {
   Star, MessageSquare, Save, User, BookOpen, ScrollText, Sparkles,
   Image as ImageIcon, Target, Pencil, Layers, CheckCircle2, Check, ChevronDown, ChevronRight, Sliders,
-  Lightbulb, Trophy,
+  Lightbulb, Trophy, Volume2,
 } from "lucide-react"
```

#### Diff 2: Khai báo State & Audio Handlers trong `ResultPopup`
```diff
--- a/app/teacher/grade/page.tsx
+++ b/app/teacher/grade/page.tsx
@@ -406,6 +406,64 @@ function ResultPopup({
   const suggestionsPopupRef = useRef<HTMLDivElement>(null)
   const suggestionsButtonRef = useRef<HTMLButtonElement>(null)
   const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
+  const [isPlayingComment, setIsPlayingComment] = useState(false)
+  const [playingWordIdx, setPlayingWordIdx] = useState<number | null>(null)
+  const audioRef = useRef<HTMLAudioElement | null>(null)
+
+  // Dọn dẹp audio khi unmount hoặc đóng popup
+  useEffect(() => {
+    return () => {
+      if (audioRef.current) {
+        audioRef.current.pause()
+        audioRef.current = null
+      }
+    }
+  }, [])
+
+  // Nghe cô giáo đọc nhận xét (voice=vi_VN-vais1000-medium&style=warm_story)
+  const playCommentAudio = useCallback((text: string) => {
+    if (!text.trim()) return
+    if (audioRef.current) {
+      audioRef.current.pause()
+      audioRef.current = null
+    }
+    if (isPlayingComment) {
+      setIsPlayingComment(false)
+      return
+    }
+    setPlayingWordIdx(null)
+    setIsPlayingComment(true)
+    const url = `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=warm_story`
+    const audio = new Audio(url)
+    audioRef.current = audio
+    audio.onended = () => {
+      setIsPlayingComment(false)
+      audioRef.current = null
+    }
+    audio.onerror = () => {
+      setIsPlayingComment(false)
+      audioRef.current = null
+    }
+    audio.play().catch(() => {
+      setIsPlayingComment(false)
+      audioRef.current = null
+    })
+  }, [isPlayingComment])
+
+  // Phát âm từ sửa lỗi (voice=vi_VN-vais1000-medium&style=emphasis)
+  const playWordPronunciation = useCallback((word: string, idx: number) => {
+    if (!word.trim()) return
+    if (audioRef.current) {
+      audioRef.current.pause()
+      audioRef.current = null
+    }
+    if (playingWordIdx === idx) {
+      setPlayingWordIdx(null)
+      return
+    }
+    setIsPlayingComment(false)
+    setPlayingWordIdx(idx)
+    const url = `/api/dictation/tts?text=${encodeURIComponent(word)}&voice=vi_VN-vais1000-medium&style=emphasis`
+    const audio = new Audio(url)
+    audioRef.current = audio
+    audio.onended = () => {
+      setPlayingWordIdx(null)
+      audioRef.current = null
+    }
+    audio.onerror = () => {
+      setPlayingWordIdx(null)
+      audioRef.current = null
+    }
+    audio.play().catch(() => {
+      setPlayingWordIdx(null)
+      audioRef.current = null
+    })
+  }, [playingWordIdx])
```

#### Diff 3: Thêm nút "🔊 Nghe cô giáo đọc nhận xét" tại Header khối nhận xét
```diff
--- a/app/teacher/grade/page.tsx
+++ b/app/teacher/grade/page.tsx
@@ -747,6 +747,24 @@ function ResultPopup({
             </span>
           </div>
-          {/* 🌟 Nút mở popup 3 nhận xét */}
+          <div className="flex items-center gap-1.5 shrink-0">
+            {/* 🔊 Nghe cô giáo đọc nhận xét */}
+            <Button
+              type="button"
+              size="sm"
+              variant="outline"
+              onClick={() => playCommentAudio(teacherComment)}
+              disabled={!teacherComment.trim()}
+              className={`text-[11px] font-semibold px-2.5 py-1 h-7 rounded-md transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap border ${
+                isPlayingComment
+                  ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/40"
+                  : "text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
+              }`}
+              title={isPlayingComment ? "Dừng đọc" : "Nghe cô giáo đọc nhận xét (Piper TTS warm_story)"}
+            >
+              <Volume2 className={`w-3.5 h-3.5 ${isPlayingComment ? "animate-pulse text-amber-600" : "text-emerald-600"}`} />
+              <span className="hidden sm:inline">{isPlayingComment ? "Dừng đọc" : "Nghe cô đọc"}</span>
+              <span className="sm:hidden">{isPlayingComment ? "Dừng" : "Nghe"}</span>
+            </Button>
+
+            {/* 🌟 Nút mở popup 3 nhận xét */}
             {suggestions.length > 0 && (
```

#### Diff 4: Thêm nút phát âm từ sửa lỗi cạnh `c.suggestion` ở View Mode 1 (Stacked)
```diff
--- a/app/teacher/grade/page.tsx
+++ b/app/teacher/grade/page.tsx
@@ -1100,6 +1118,22 @@ function ResultPopup({
                       <span className="text-muted-foreground text-xs font-bold">→</span>
                       <span className="text-green-700 text-xs font-semibold bg-green-50 px-1 rounded">{c.suggestion}</span>
+                      {c.suggestion && (
+                        <button
+                          type="button"
+                          onClick={(e) => {
+                            e.stopPropagation()
+                            playWordPronunciation(c.suggestion, i)
+                          }}
+                          className={`p-1 rounded-md transition-all cursor-pointer inline-flex items-center justify-center ${
+                            playingWordIdx === i
+                              ? "bg-amber-100 text-amber-700 ring-1 ring-amber-400"
+                              : "text-emerald-700 hover:bg-emerald-100/70"
+                          }`}
+                          title={`Nghe phát âm chuẩn: "${c.suggestion}" (style=emphasis)`}
+                        >
+                          <Volume2 className={`w-3.5 h-3.5 ${playingWordIdx === i ? "animate-pulse text-amber-600" : ""}`} />
+                        </button>
+                      )}
                       <Badge variant="outline" className={`text-[9px] px-1.5 py-0.5 h-4 border font-medium ${theme.badge}`}>{theme.label}</Badge>
```

#### Diff 5: Thêm nút phát âm từ sửa lỗi cạnh `c.suggestion` ở View Mode 2 (Side-by-side)
```diff
--- a/app/teacher/grade/page.tsx
+++ b/app/teacher/grade/page.tsx
@@ -1209,6 +1243,22 @@ function ResultPopup({
                           <span className="text-muted-foreground font-bold">→</span>
                           <span className="text-green-700 font-semibold bg-green-50 px-1 rounded">{c.suggestion}</span>
+                          {c.suggestion && (
+                            <button
+                              type="button"
+                              onClick={(e) => {
+                                e.stopPropagation()
+                                playWordPronunciation(c.suggestion, i + 1000)
+                              }}
+                              className={`p-1 rounded-md transition-all cursor-pointer inline-flex items-center justify-center ${
+                                playingWordIdx === i + 1000
+                                  ? "bg-amber-100 text-amber-700 ring-1 ring-amber-400"
+                                  : "text-emerald-700 hover:bg-emerald-100/70"
+                              }`}
+                              title={`Nghe phát âm chuẩn: "${c.suggestion}" (style=emphasis)`}
+                            >
+                              <Volume2 className={`w-3.5 h-3.5 ${playingWordIdx === i + 1000 ? "animate-pulse text-amber-600" : ""}`} />
+                            </button>
+                          )}
                           <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 h-5 border font-medium ${theme.badge}`}>{theme.label}</Badge>
```

---

### 4.2. Diffs cho `app/student/page.tsx`

#### Diff 1: Nâng cấp Audio State & `playAudio` / `playCommentAudio`
```diff
--- a/app/student/page.tsx
+++ b/app/student/page.tsx
@@ -62,15 +62,56 @@ export default function StudentDashboard() {
 
   // Audio preview cho kho từ khó
   const [playingWord, setPlayingWord] = useState<string | null>(null)
+  const [isPlayingComment, setIsPlayingComment] = useState(false)
   const audioRef = useRef<HTMLAudioElement | null>(null)
 
+  useEffect(() => {
+    return () => {
+      if (audioRef.current) {
+        audioRef.current.pause()
+        audioRef.current = null
+      }
+    }
+  }, [])
+
+  // Phát âm từ khó (style=emphasis)
   const playAudio = (text: string) => {
     if (!text) return
-    if (audioRef.current) audioRef.current.pause()
+    if (audioRef.current) {
+      audioRef.current.pause()
+      audioRef.current = null
+    }
+    if (playingWord === text) {
+      setPlayingWord(null)
+      return
+    }
+    setIsPlayingComment(false)
     setPlayingWord(text)
-    const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
+    const audio = new Audio(
+      `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`
+    )
     audioRef.current = audio
-    audio.onended = () => setPlayingWord(null)
-    audio.onerror = () => setPlayingWord(null)
-    audio.play().catch(() => setPlayingWord(null))
+    audio.onended = () => {
+      setPlayingWord(null)
+      audioRef.current = null
+    }
+    audio.onerror = () => {
+      setPlayingWord(null)
+      audioRef.current = null
+    }
+    audio.play().catch(() => {
+      setPlayingWord(null)
+      audioRef.current = null
+    })
+  }
+
+  // Nghe cô giáo đọc nhận xét (style=warm_story)
+  const playCommentAudio = (text: string) => {
+    if (!text) return
+    if (audioRef.current) {
+      audioRef.current.pause()
+      audioRef.current = null
+    }
+    if (isPlayingComment) {
+      setIsPlayingComment(false)
+      return
+    }
+    setPlayingWord(null)
+    setIsPlayingComment(true)
+    const audio = new Audio(
+      `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=warm_story`
+    )
+    audioRef.current = audio
+    audio.onended = () => {
+      setIsPlayingComment(false)
+      audioRef.current = null
+    }
+    audio.onerror = () => {
+      setIsPlayingComment(false)
+      audioRef.current = null
+    }
+    audio.play().catch(() => {
+      setIsPlayingComment(false)
+      audioRef.current = null
+    })
   }
```

#### Diff 2: Nút nghe cô giáo đọc nhận xét tại Hero Banner
```diff
--- a/app/student/page.tsx
+++ b/app/student/page.tsx
@@ -216,9 +257,25 @@ export default function StudentDashboard() {
                     <p className="text-base sm:text-lg font-bold text-foreground">
                       {scoreLevel.message}
                     </p>
-                    <p className="text-xs sm:text-sm text-muted-foreground italic line-clamp-1">
-                      &ldquo;{latestGrade?.pedagogicalComment || latestGrade?.feedback || "Con làm bài rất tốt!"}&rdquo;
-                    </p>
+                    <div className="flex items-center gap-2 flex-wrap">
+                      <p className="text-xs sm:text-sm text-muted-foreground italic line-clamp-1">
+                        &ldquo;{latestGrade?.pedagogicalComment || latestGrade?.feedback || "Con làm bài rất tốt!"}&rdquo;
+                      </p>
+                      <Button
+                        type="button"
+                        size="sm"
+                        variant="ghost"
+                        onClick={() => playCommentAudio(latestGrade?.pedagogicalComment || latestGrade?.feedback || "Con làm bài rất tốt!")}
+                        className={`h-6 px-2 text-[11px] font-semibold gap-1 rounded-md shrink-0 border transition-all ${
+                          isPlayingComment
+                            ? "bg-amber-100 text-amber-800 border-amber-300 ring-1 ring-amber-400"
+                            : "text-emerald-700 hover:bg-emerald-50 border-emerald-200"
+                        }`}
+                        title={isPlayingComment ? "Dừng đọc" : "Nghe cô giáo đọc nhận xét (Piper TTS warm_story)"}
+                      >
+                        <Volume2 className={`w-3 h-3 ${isPlayingComment ? "animate-pulse text-amber-600" : "text-emerald-600"}`} />
+                        <span>{isPlayingComment ? "Dừng" : "Nghe cô đọc"}</span>
+                      </Button>
+                    </div>
                   </div>
                 </div>
```

---

### 4.3. Diffs cho `components/student/student-grade-detail-modal.tsx`

#### Diff 1: Nâng cấp Audio State & `playAudio` / `playCommentAudio`
```diff
--- a/components/student/student-grade-detail-modal.tsx
+++ b/components/student/student-grade-detail-modal.tsx
@@ -108,6 +108,16 @@ export function StudentGradeDetailModal({ grade, open, onOpenChange }: StudentGr
   const [hoveredErrorIdx, setHoveredErrorIdx] = useState<number | null>(null)
   const [filterType, setFilterType] = useState<string>("all")
   const [playingText, setPlayingText] = useState<string | null>(null)
+  const [isPlayingComment, setIsPlayingComment] = useState(false)
   const audioRef = useRef<HTMLAudioElement | null>(null)
+
+  useEffect(() => {
+    return () => {
+      if (audioRef.current) {
+        audioRef.current.pause()
+        audioRef.current = null
+      }
+    }
+  }, [])
@@ -232,13 +242,54 @@ export function StudentGradeDetailModal({ grade, open, onOpenChange }: StudentGr
   }
 
-  // 4. Phát âm chuẩn bằng Edge-TTS
+  // 4. Phát âm chuẩn bằng Piper VITS ONNX (style=emphasis)
   const playAudio = (text: string) => {
     if (!text) return
-    if (audioRef.current) audioRef.current.pause()
+    if (audioRef.current) {
+      audioRef.current.pause()
+      audioRef.current = null
+    }
+    if (playingText === text) {
+      setPlayingText(null)
+      return
+    }
+    setIsPlayingComment(false)
     setPlayingText(text)
-    const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
+    const audio = new Audio(
+      `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`
+    )
     audioRef.current = audio
-    audio.onended = () => setPlayingText(null)
-    audio.onerror = () => setPlayingText(null)
-    audio.play().catch(() => setPlayingText(null))
+    audio.onended = () => {
+      setPlayingText(null)
+      audioRef.current = null
+    }
+    audio.onerror = () => {
+      setPlayingText(null)
+      audioRef.current = null
+    }
+    audio.play().catch(() => {
+      setPlayingText(null)
+      audioRef.current = null
+    })
+  }
+
+  // 5. Nghe cô giáo đọc nhận xét (style=warm_story)
+  const playCommentAudio = (text: string) => {
+    if (!text) return
+    if (audioRef.current) {
+      audioRef.current.pause()
+      audioRef.current = null
+    }
+    if (isPlayingComment) {
+      setIsPlayingComment(false)
+      return
+    }
+    setPlayingText(null)
+    setIsPlayingComment(true)
+    const audio = new Audio(
+      `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=warm_story`
+    )
+    audioRef.current = audio
+    audio.onended = () => {
+      setIsPlayingComment(false)
+      audioRef.current = null
+    }
+    audio.onerror = () => {
+      setIsPlayingComment(false)
+      audioRef.current = null
+    }
+    audio.play().catch(() => {
+      setIsPlayingComment(false)
+      audioRef.current = null
+    })
   }
```

#### Diff 2: Nút "🔊 Nghe cô nhận xét" tại Lời nhận xét sư phạm Thông tư 27
```diff
--- a/components/student/student-grade-detail-modal.tsx
+++ b/components/student/student-grade-detail-modal.tsx
@@ -457,10 +508,25 @@ export function StudentGradeDetailModal({ grade, open, onOpenChange }: StudentGr
                 {/* 3. Lời nhận xét sư phạm toàn diện của Giáo viên */}
                 <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 shadow-2xs">
-                  <div className="flex items-center gap-1.5">
-                    <Sparkles className="w-4 h-4 text-primary" />
-                    <h3 className="font-bold text-xs sm:text-sm text-primary">
-                      Nhận xét sư phạm của Giáo viên (Thông tư 27)
-                    </h3>
+                  <div className="flex items-center justify-between gap-2 flex-wrap">
+                    <div className="flex items-center gap-1.5">
+                      <Sparkles className="w-4 h-4 text-primary" />
+                      <h3 className="font-bold text-xs sm:text-sm text-primary">
+                        Nhận xét sư phạm của Giáo viên (Thông tư 27)
+                      </h3>
+                    </div>
+                    <Button
+                      type="button"
+                      size="sm"
+                      variant="outline"
+                      onClick={() => playCommentAudio(grade.pedagogicalComment || grade.feedback || "Con làm bài rất tốt. Hãy tiếp tục phát huy nét chữ cẩn thận này nhé!")}
+                      className={`h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-lg border transition-all ${
+                        isPlayingComment
+                          ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/40"
+                          : "text-primary hover:bg-primary/10 border-primary/30"
+                      }`}
+                      title={isPlayingComment ? "Dừng đọc" : "Nghe cô giáo đọc nhận xét (Piper TTS warm_story)"}
+                    >
+                      <Volume2 className={`w-3.5 h-3.5 ${isPlayingComment ? "animate-pulse text-amber-600" : "text-primary"}`} />
+                      <span>{isPlayingComment ? "Dừng đọc" : "Nghe cô nhận xét"}</span>
+                    </Button>
                   </div>
                   <p className="text-xs sm:text-sm leading-relaxed text-foreground font-normal whitespace-pre-wrap bg-background/80 p-3 rounded-lg border">
```

---

## 5. ĐÁNH GIÁ TÍNH TƯƠNG THÍCH & TRẢI NGHIỆM NGƯỜI DÙNG (UX/A11Y)

1. **Khả năng tiếp cận (Accessibility - a11y)**:
   - Các nút loa đều có `title` thuộc tính rõ nghĩa (`Nghe phát âm chuẩn: "..."`, `Nghe cô giáo đọc nhận xét`).
   - Hỗ trợ keyboard focus qua `Button` chuẩn của Shadcn UI / Radix.
   - Thể hiện trạng thái trực quan rõ rệt khi đang phát: hiệu ứng nhấp nháy `animate-pulse`, đổi màu viền sang tông vàng hổ phách (`amber-400/ring-2`).
2. **Loại bỏ hoàn toàn phụ thuộc Cloud Neural TTS**:
   - Thay thế toàn bộ chuỗi hardcoded `vi-VN-HoaiMyNeural` bằng động cơ Piper VITS ONNX cục bộ `vi_VN-vais1000-medium`.
   - Giúp ứng dụng chạy hoàn toàn offline không cần internet, thích hợp triển khai tại các trường học tiểu học vùng sâu vùng xa hoặc trên trạm biên Raspberry Pi 4.
3. **Hiệu năng & Tránh memory leak**:
   - Sử dụng `audioRef.current` kết hợp dọn dẹp trong `useEffect` hook đảm bảo không bao giờ sinh ra các `HTMLAudioElement` mồ côi chạy ngầm trong trình duyệt.
   - Khi chuyển tab hoặc đóng Modal, audio lập tức được tạm dừng và thu hồi bộ nhớ.
