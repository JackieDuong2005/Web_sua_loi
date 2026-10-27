# BÁO CÁO BÀN GIAO (HANDOFF REPORT) — EXPLORER 1 (MILESTONE 4)
## Multi-Surface Teacher & Student UI Integration: Teacher Dictation Cockpit (`app/teacher/dictation/page.tsx`)

---

## 1. OBSERVATION (QUAN SÁT THỰC TẾ)

Các quan sát trực tiếp trên mã nguồn dự án:

1. **Header Live Status Badge (`app/teacher/dictation/page.tsx:983–986`)**:
   - Hiện chỉ hiển thị badge tĩnh `Piper Offline TTS (Pi 4/5)`.
   - Hoàn toàn chưa hiển thị trạng thái vòng đời On-Demand và mức tiêu thụ RAM của `Qwen2.5-0.5B` ("Ngủ 0MB RAM" / "Đang bật cờ xử lý..." / "Đã lưu kịch bản & Xả RAM (0MB)").
2. **Thanh Toolbar Soạn Bài (`app/teacher/dictation/page.tsx:1093–1138`)**:
   - Hiện chỉ có `AI soạn bài` (dựa trên prompt tự do), `Kho SGK`, `Dán`, `Xóa trắng`.
   - Thiếu Dialog "Trích xuất SGK / PDF (Qwen2.5)" để làm sạch văn bản scan thô (lọc số trang "Trang 45", câu hỏi bài tập) và trích xuất từ khó.
3. **Cơ chế Phân Tách Cụm Câu (`app/teacher/dictation/page.tsx:177–232, 1218`)**:
   - Hiện chỉ dùng hàm regex `splitIntoPedagogicalClauses`, không gán được sắc thái âm học (`style`), không biết vị trí từ khó để tăng thời gian nghỉ viết, và không có nút kích hoạt "🎬 Qwen2.5 Đạo diễn Nhịp đọc" cũng như bảng xem trước Prosody Script.
4. **Bộ Điều Khiển Âm Học Cột Phải (`app/teacher/dictation/page.tsx:1248–1438`)**:
   - Đã có chọn giọng (Cô Hoài My, Mai Linh, Trúc Ly), tốc độ, lặp lại, nghỉ viết.
   - Thiếu bộ chọn sắc thái âm học (`acousticStyle`: `warm_story`, `standard`, `emphasis`, `question`) và Switch Toggle "Đọc tên dấu câu" (`read_punctuation`).
5. **Động cơ Phát Âm `speakClause` & Vòng Lặp Bước 3 (`app/teacher/dictation/page.tsx:535–597, 683–751`)**:
   - `speakClause` hiện chỉ nhận `clause`, `sessionToken`, và `customRateStr?: string`. Chưa chuyển tiếp `style`, `noise_scale`, `noise_w`, `read_punctuation` tới `/api/dictation/play-local` và `/api/dictation/tts`.
   - Vòng lặp `startStep3Dictation` và hàm `repeatCurrentClause` chưa liên kết với kịch bản cụm `prosodyClauses`.
6. **Next.js BFF API Gateway (`app/api/dictation/...`)**:
   - `app/api/dictation/qwen-director/route.ts` (M3) đã sẵn sàng phục vụ `GET` (status & RAM sensing) và `POST` (`extract_sgk`, `direct_prosody`).
   - `app/api/dictation/tts/route.ts` và `play-local/route.ts` (M3) đã hỗ trợ đầy đủ `style`, `noise_scale`, `noise_w`, và `read_punctuation`.
7. **Kiểm thử Kiểm tra Tính toàn vẹn TypeScript**:
   - Lệnh `npx tsc --noEmit` đã thực thi và trả về exit code 0 (0 lỗi).

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN THIẾT KẾ)

1. Từ **Quan sát 1** và **Hợp đồng API `GET /api/dictation/qwen-director`**:
   - Cần thiết lập React Hook `useEffect` với `setInterval(pollQwenStatus, 12000)` để cập nhật định kỳ dung lượng RAM trống và trạng thái model.
   - Thêm trạng thái chuyển tiếp `qwenLifecycleState`:
     - Bắt đầu request trích xuất/đạo diễn $\to$ `processing` (badge vàng, hiệu ứng `animate-ping`).
     - Nhận response $\to$ `unloaded` (badge xanh dương `Đã lưu kịch bản & Xả RAM (0MB)`) giữ trong 4s $\to$ trở về `idle` (badge xám/xanh nhạt `Ngủ 0MB RAM`).
2. Từ **Quan sát 2** và **Hợp đồng `POST /api/dictation/qwen-director (action: extract_sgk)`**:
   - Bổ sung nút `Trích xuất SGK` cạnh nút `AI soạn bài` (dòng 1104).
   - Thiết kế `ExtractSgkDialog` với bộ chọn khối lớp, nút tải file `.txt` (`FileReader.readAsText`), và textarea dán văn bản thô.
   - Khi hoàn tất: điền thẳng `title`, `clean_content` vào `passageText`, `difficultWords`, đồng thời reset `prosodyClauses` để đảm bảo tính nhất quán.
3. Từ **Quan sát 3** và **Hợp đồng `POST /api/dictation/qwen-director (action: direct_prosody)`**:
   - Thêm nút `🎬 Qwen2.5 Đạo diễn Nhịp đọc` tại vị trí trực quan dưới danh sách từ khó.
   - Khi nhận dữ liệu, hiển thị khối **Interactive Prosody Script Preview** với các huy hiệu trực quan (`warm_story`: xanh ngọc, `emphasis`: vàng nghệ, `standard`: xám, `question`: tím), thời gian nghỉ viết (`pause_sec`), và nút nghe thử `speakClause` cho từng cụm.
4. Từ **Quan sát 4** và **Thông số Âm học Piper VITS ONNX**:
   - Bổ sung Select `acousticStyle` (4 preset chuẩn mực) và Switch Toggle `read_punctuation` vào Cột Phải thiết lập sư phạm.
5. Từ **Quan sát 5** và **Động cơ Phát Âm**:
   - Nâng cấp `speakClause` nhận `options?: SpeakClauseOptions | string` để giữ tương thích ngược 100%.
   - Trong `audioOutputDest === "rpi_local"`, truyền đầy đủ JSON payload sang `/api/dictation/play-local`.
   - Trong `audioOutputDest === "web"`, xây dựng URLSearchParams truyền sang `/api/dictation/tts`.
   - Trong `startStep3Dictation`, ưu tiên sử dụng danh sách `prosodyClauses` (nếu đã đạo diễn), truyền tham số âm học của từng cụm vào `speakClause` và áp dụng thời gian nghỉ viết `pause_sec`.

---

## 3. CAVEATS (LƯU Ý, PHẠM VI CHƯA ĐIỀU TRA & GIẢ ĐỊNH)

1. **Phạm vi Bảng xanh Trình chiếu (`showProjector`)**:
   - Chế độ Bảng xanh toàn màn hình chia sẻ chung các state `pedagogicalStep`, `currentClauseIndex`, `countdown`, `isSpeakingNow`. Khi nâng cấp `speakClause`, chế độ Bảng xanh sẽ tự động thừa hưởng âm thanh kịch bản mới mà không cần sửa đổi lớn cấu trúc JSX bảng xanh.
2. **Giả định về phần cứng Raspberry Pi**:
   - Giả định trạm biên RPi 4 chạy `python_service` ở port 8000. Nếu trạm biên chưa bật hoặc offline, hệ thống BFF fallback mượt mà và UI hiển thị trạng thái `Ngoại tuyến (Quy tắc Sư phạm)`, không làm gián đoạn trải nghiệm của giáo viên.
3. **Các bề mặt giao diện khác thuộc Milestone 4**:
   - Các bề mặt `app/teacher/grade/page.tsx`, `app/student/page.tsx`, và `components/student/student-grade-detail-modal.tsx` (nút nghe nhận xét `warm_story` và phát âm từ sai `emphasis`) nằm ở Explorer 2 / Worker M4. Báo cáo này tập trung chuyên sâu cho Dictation Cockpit (`app/teacher/dictation/page.tsx`).

---

## 4. CONCLUSION (KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG CHO WORKER M4)

1. **Tính khả thi**: Kiến trúc giải pháp đã được khảo sát chi tiết từng dòng mã nguồn, hoàn toàn tương thích và khớp 100% với các API Gateway của Milestone 3.
2. **Kế hoạch triển khai cho Worker M4**:
   - **Bước 1**: Thêm các interface `ProsodyClause`, `QwenStatusState`, `SpeakClauseOptions` vào `app/teacher/dictation/page.tsx`.
   - **Bước 2**: Khai báo các React State (`qwenStatus`, `qwenLifecycleState`, `acousticStyle`, `readPunctuation`, `prosodyClauses`, `isExtractSgkOpen`...).
   - **Bước 3**: Thêm hook polling `GET /api/dictation/qwen-director` mỗi 12 giây.
   - **Bước 4**: Cập nhật hàm `speakClause` và vòng lặp `startStep3Dictation` & `repeatCurrentClause`.
   - **Bước 5**: Thay thế JSX Header Live Status Badge (dòng 982–986).
   - **Bước 6**: Bổ sung nút Trích xuất SGK vào Toolbar và Dialog `ExtractSgkDialog`.
   - **Bước 7**: Bổ sung nút "🎬 Qwen2.5 Đạo diễn Nhịp đọc" và bảng xem trước Prosody Script Preview.
   - **Bước 8**: Thêm bộ điều khiển `acousticStyle` và toggle `read_punctuation` vào Cột Phải.
   - **Bước 9**: Chạy xác thực `npx tsc --noEmit` và `npm run build`.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC MINH ĐỘC LẬP)

Worker M4 và đội ngũ kiểm thử có thể xác minh độc lập theo các bước sau:

1. **Biên dịch TypeScript tĩnh**:
   ```powershell
   npx tsc --noEmit
   ```
   *Tiêu chí đạt*: Exit code 0, không có bất kỳ lỗi cú pháp hoặc typing nào.
2. **Build ứng dụng Next.js**:
   ```powershell
   npm run build
   ```
   *Tiêu chí đạt*: Exit code 0, toàn bộ các route App Router đều biên dịch thành công.
3. **Kiểm tra trực quan trên trình duyệt (sử dụng Chrome DevTools MCP)**:
   - Truy cập `http://localhost:3000/teacher/dictation`.
   - Kiểm tra Header: Live Status Badge hiển thị `Piper VITS (Sẵn sàng)` và `Qwen2.5: Ngủ 0MB RAM`.
   - Bấm nút `Trích xuất SGK`: Dialog mở ra, dán văn bản có số trang, bấm trích xuất $\to$ Badge đổi sang `Đang bật cờ xử lý...` $\to$ `Đã lưu kịch bản & Xả RAM (0MB)`.
   - Bấm nút `🎬 Qwen2.5 Đạo diễn Nhịp đọc`: Xem trước danh sách cụm câu với đầy đủ badge phong cách, tốc độ và thời gian nghỉ viết. Bấm nút loa nghe thử cụm câu.
   - Bắt đầu Bước 3 (Nghe - Viết): Kiểm tra âm thanh đọc theo từng cụm với phong cách âm học tương ứng và tên dấu câu phát âm chuẩn xác khi bật toggle.
