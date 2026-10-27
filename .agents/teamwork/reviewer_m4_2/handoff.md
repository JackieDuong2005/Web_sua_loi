# BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG & PHẢN BIỆN ADVERSARIAL (REVIEWER 2)
## Milestone 4: Multi-Surface Teacher & Student UI Integration

- **Reviewer**: Reviewer 2 (Roles: reviewer, critic)
- **Target Files**:
  - `app/teacher/grade/page.tsx`
  - `app/student/page.tsx`
  - `components/student/student-grade-detail-modal.tsx`
- **Verdict**: **APPROVE**
- **Integrity Status**: **CLEAN (Zero Integrity Violations)**

---

## 1. OBSERVATION (QUAN SÁT THỰC NGHIỆM)

### 1.1. Khảo sát tệp `app/teacher/grade/page.tsx`
- **Dòng 19**: `Volume2` được import từ thư viện `"lucide-react"`:
  ```tsx
  import {
    ..., Lightbulb, Trophy, Volume2,
  } from "lucide-react"
  ```
- **Dòng 411, 414–427**: Khai báo `audioRef` và hàm dọn dẹp `stopActiveAudio(ref)`:
  ```tsx
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopActiveAudio = useCallback((ref: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (ref.current) {
      try {
        ref.current.pause()
        ref.current.onended = null
        ref.current.onerror = null
        ref.current.src = ""
        ref.current.load()
      } catch {
        // Ignore abort issues
      }
      ref.current = null
    }
  }, [])
  ```
- **Dòng 430–434**: Dọn dẹp audio khi unmount:
  ```tsx
  useEffect(() => {
    return () => {
      stopActiveAudio(audioRef)
    }
  }, [stopActiveAudio])
  ```
- **Dòng 446, 836–852**: Nút "🔊 Nghe cô giáo đọc nhận xét" trong `ResultPopup`:
  - URL phát: `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=warm_story`
  - Nút bấm có hiệu ứng visual khi đang đọc (`animate-pulse`, `bg-amber-100`, đổi nhãn thành "Dừng đọc").
- **Dòng 476, 1209–1225, 1335–1351**: Nút phát âm từ gợi ý sửa lỗi `c.suggestion`:
  - URL phát: `/api/dictation/tts?text=${encodeURIComponent(word)}&voice=vi_VN-vais1000-medium&style=emphasis`
  - Hiện diện đầy đủ ở cả 2 chế độ hiển thị:
    * Chế độ Xếp chồng (Stacked / Inline mode): index `i` (dòng 1209–1225).
    * Chế độ Song song (Side-by-side mode): index `i + 1000` (dòng 1335–1351).
  - Có `e.stopPropagation()` chống click xuyên thấu lên dòng bảng lỗi.
- **Dòng 1378–1383**: Dọn dẹp audio khi đóng popup (`handleClose`):
  ```tsx
  const handleClose = () => {
    stopActiveAudio(audioRef)
    setIsPlayingComment(false)
    setPlayingWordIdx(null)
    onClose()
  }
  ```

---

### 1.2. Khảo sát tệp `app/student/page.tsx`
- **Dòng 68–87**: Triển khai `stopActiveAudio(ref)` và hook `useEffect` dọn dẹp khi unmount:
  ```tsx
  useEffect(() => {
    return () => {
      stopActiveAudio(audioRef)
    }
  }, [])
  ```
- **Dòng 90–118**: Hàm `playAudio` phục vụ danh sách `wordsToPractice` (Sổ tay từ khó cần luyện):
  - URL phát: `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`
  - Đã loại bỏ hoàn toàn giọng cloud cũ `vi-VN-HoaiMyNeural`.
  - Có xử lý ngắt tiếng cũ trước khi phát từ mới: `stopActiveAudio(audioRef)`.
- **Dòng 121–149, 294–308**: Nút "🔊 Nghe cô đọc" tại Hero Banner khu vực nhận xét sư phạm:
  - URL phát: `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=warm_story`
  - Tự động fallback giữa `latestGrade?.pedagogicalComment`, `latestGrade?.feedback` và văn bản mặc định an toàn.
  - Tích hợp trạng thái toggle dừng/phát và visual feedback `animate-pulse text-amber-600`.

---

### 1.3. Khảo sát tệp `components/student/student-grade-detail-modal.tsx`
- **Dòng 120–134, 162–173**: Khai báo `stopActiveAudio` và hook theo dõi `open` để ngắt audio ngay lập tức khi đóng modal:
  ```tsx
  // Dọn dẹp audio khi unmount, đổi bài hoặc khi ĐÓNG MODAL
  useEffect(() => {
    if (!open) {
      stopActiveAudio(audioRef)
      setPlayingText(null)
      setIsPlayingComment(false)
    }
    return () => {
      stopActiveAudio(audioRef)
      setPlayingText(null)
      setIsPlayingComment(false)
    }
  }, [open, grade?.id])
  ```
- **Dòng 252–281, 399, 615, 643**: Hàm `playAudio` hỗ trợ cả click trực tiếp trên `StudentBoundingBoxCanvas` lẫn danh sách thẻ lỗi:
  - URL phát: `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`
  - Truyền trực tiếp vào prop `onPlayAudio={playAudio}` của `StudentBoundingBoxCanvas` (dòng 399).
- **Dòng 284–313, 535–549**: Nút "🔊 Nghe cô nhận xét" trong khối nhận xét Thông tư 27:
  - URL phát: `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=warm_story`
  - Giao diện trau chuốt, responsive, đổi màu và text khi phát ("Dừng đọc" / "Nghe cô nhận xét").

---

### 1.4. Kết quả kiểm thử thực nghiệm
1. **TypeScript Typecheck (`npx tsc --noEmit`)**:
   - Exit code: **0** (0 errors, 0 warnings).
2. **Python Pipeline Verification (`python tests/test_milestone2_pipeline.py`)**:
   - 7/7 bài kiểm thử thành công 100% (Telemetry, SGK Cleaning, Prosody Direction, Expressive TTS, Local Speaker, Edge Cases).
   - Exit code: **0**.
3. **Quét mã nguồn giọng cloud cũ (`git grep -n "vi-VN-HoaiMyNeural"`)**:
   - Không còn bất kỳ file frontend TSX nào chứa chuỗi giọng cloud cũ; 100% đã chuyển dịch sang Piper VITS ONNX `vi_VN-vais1000-medium`.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

```
[QUAN SÁT THỰC NGHIỆM]
  ├─ 1. Cả 3 file đều import và sử dụng HTML5 Audio API với helper `stopActiveAudio(ref)`
  ├─ 2. Endpoint TTS sử dụng đúng tham số:
  │     • Lời nhận xét: voice=vi_VN-vais1000-medium&style=warm_story
  │     • Phát âm từ lỗi: voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%
  ├─ 3. URL query parameter đều được bảo vệ bằng `encodeURIComponent(...)`
  ├─ 4. Vòng đời modal được gắn chặt: dependency [open, ...] ngắt audio tức thì khi dismiss
  ├─ 5. Typecheck `npx tsc --noEmit` đạt Exit Code 0, không có lỗi typing
  └─ 6. Không tìm thấy logic giả lập (mock/facade), mã nguồn thực thi logic audio thật
        │
        ▼
[LẬP LUẬN CHẤT LƯỢNG & ĐỘ TIN CẬY]
  ├─ Khả năng rò rỉ bộ nhớ (Memory Leak): ĐÃ TRIỆT TIÊU nhờ quy trình 5 bước dọn dẹp:
  │  pause() -> gỡ event listener onended/onerror -> gán src = "" -> load() -> nullify ref.
  ├─ Nguy cơ chồng đè âm thanh (Audio Race Condition): ĐÃ TRIỆT TIÊU nhờ việc gọi
  │  `stopActiveAudio` đồng bộ ngay trước khi khởi tạo `new Audio(...)`.
  ├─ Hiện tượng âm thanh tiếp tục phát sau khi đóng dialog: ĐÃ TRIỆT TIÊU nhờ
  │  `if (!open) stopActiveAudio(audioRef)` trong hook `useEffect` và trong `handleClose`.
  └─ Tính tương thích thiết bị & chính sách Autoplay: Toàn bộ lệnh play() đều nằm trong
     sự kiện click của người dùng và có `.catch()` bắt AbortError.
        │
        ▼
[KẾT LUẬN]
  Milestone 4 đạt chuẩn 100% về tính đúng đắn, an toàn vòng đời và tuân thủ kiến trúc.
```

---

## 3. ADVERSARIAL STRESS-TESTING (BÁO CÁO THỬ THÁCH NGHỊCH BIẾN)

| STT | Kịch bản tấn công / Giả định | Hành vi dự đoán | Hành vi thực tế trong mã nguồn | Đánh giá |
|:---:|:---|:---|:---|:---:|
| **S1** | **Click liên hoàn (Rapid Consecutive Clicks):** Người dùng nhấp liên tục vào nhiều từ khó khác nhau trong 200ms. | Các audio streams bị chồng chéo nhau hoặc event `onended` của audio cũ can thiệp sai vào state của audio mới. | `stopActiveAudio` lập tức hủy instance trước đó, xóa bỏ `onended/onerror = null` trước khi tạo audio mới. State luôn đồng bộ với từ đang phát gần nhất. | **PASS** |
| **S2** | **Đóng Modal đột ngột (Modal Dismissal Race):** Người dùng bấm phát âm nhận xét dài (30 giây), sau 2 giây bấm [X] đóng modal. | Tiếng đọc nhận xét tiếp tục phát dưới nền gây khó chịu cho phụ huynh/học sinh. | `useEffect` lắng nghe `open`. Khi `open === false`, hook kích hoạt `stopActiveAudio(audioRef)` và reset state `isPlayingComment(false)`. Tiếng ngắt ngay lập tức. | **PASS** |
| **S3** | **Từ ngữ chứa ký tự đặc biệt hoặc tiếng Việt có dấu:** Nhận xét chứa dấu ngoặc kép, dấu xuống dòng, emoji hoặc từ phương ngữ. | URL bị lỗi cú pháp, HTTP 400 hoặc crash trình duyệt. | Toàn bộ chuỗi đưa vào URL đều qua `encodeURIComponent(text)`. Phía BFF và FastAPI decode trọn vẹn UTF-8. | **PASS** |
| **S4** | **Trường dữ liệu rỗng (Empty String Attack):** Bài làm không có nhận xét hoặc từ gợi ý rỗng `""`. | Gửi request `/api/dictation/tts?text=` gây lỗi HTTP 400 hoặc lãng phí tài nguyên. | Cả 3 file đều có guard: `if (!text.trim()) return`, `disabled={!teacherComment.trim()}` hoặc fallback về câu động viên mặc định. | **PASS** |
| **S5** | **Chặn phát âm thanh tự động (Autoplay Policy Block):** Trình duyệt hạn chế audio do chính sách bảo mật. | Ném lỗi Uncaught Promise Rejection làm đỏ Console. | Tất cả lệnh `.play()` đều được bọc `.catch(err => { if (err.name !== "AbortError") console.warn(...); setIsPlaying(false); })`. Không gây lỗi console nghiêm trọng. | **PASS** |

---

## 4. INTEGRITY AUDIT (KIỂM TOÁN TÍNH CHÂN THỰC)

- **Hardcoded test results:** KHÔNG CÓ. Dữ liệu âm thanh được tổng hợp động từ nội dung bài làm thực tế.
- **Dummy / Facade implementations:** KHÔNG CÓ. Sử dụng đối tượng `Audio` thật của Web API, kết nối endpoint `/api/dictation/tts` thật.
- **Bypass shortcuts:** KHÔNG CÓ. Các bề mặt giao diện đều được tích hợp đầy đủ các style `warm_story` và `emphasis`.
- **Fabricated verification logs:** KHÔNG CÓ. Đã chạy độc lập `npx tsc --noEmit` và `python tests/test_milestone2_pipeline.py` với exit code 0.
- **Tuân thủ GEMINI.md:** Báo cáo TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID, sử dụng bảng Markdown và cây ASCII.

---

## 5. CAVEATS (GIỚI HẠN & PHẠM VI KHÔNG KHẢO SÁT)

- **Phần cứng Loa AUX Raspberry Pi:** Kiểm thử audio được xác thực qua luồng Web Browser HTML5 Audio trên hệ điều hành Windows. Đầu ra âm thanh qua jack 3.5mm hoặc USB trên bo mạch Raspberry Pi vật lý được quản lý bởi endpoint `/api/dictation/play-local` (đã xác thực ở Milestone 1 & 2).

---

## 6. CONCLUSION & VERDICT (KẾT LUẬN & PHÁN QUYẾT)

- **Verdict**: **APPROVE**
- **Đánh giá tổng quan**:
  Worker M4 đã hoàn thành xuất sắc, đầy đủ và chuẩn xác các yêu cầu của Milestone 4:
  1. `app/teacher/grade/page.tsx`: Tích hợp nút nghe nhận xét (`warm_story`) và nút phát âm từ sửa lỗi (`emphasis`) ở cả 2 chế độ hiển thị; kiểm soát vòng đời hoàn chỉnh với `stopActiveAudio`.
  2. `app/student/page.tsx`: Tích hợp nút nghe nhận xét tại Hero Banner, nâng cấp `wordsToPractice` sang Piper VITS ONNX, loại bỏ toàn bộ giọng cloud cũ.
  3. `components/student/student-grade-detail-modal.tsx`: Tích hợp phát âm từ khó qua BBox canvas và danh sách lỗi, nút nghe nhận xét Thông tư 27, xử lý ngắt âm thanh tức thì khi đóng modal.
  4. Hệ thống build TypeScript đạt 0 lỗi (`exit code 0`).

---

## 7. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC THỰC LẠI)

Các kiểm thử viên tiếp theo có thể kiểm chứng độc lập bằng các lệnh sau:

```powershell
# 1. Kiểm tra toàn vẹn TypeScript
npx tsc --noEmit

# 2. Kiểm thử Pipeline âm học & On-demand Python
python tests/test_milestone2_pipeline.py

# 3. Kiểm tra không còn giọng cloud cũ trong frontend
git grep -n "vi-VN-HoaiMyNeural" app/ components/
```
