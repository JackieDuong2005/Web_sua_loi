# KẾ HOẠCH NÂNG CẤP HIỂN THỊ HÌNH ẢNH & BOUNDING BOX CHI TIẾT DÀNH CHO PHỤ HUYNH

> **Dự án:** ViHand Grade — Hệ thống Chấm điểm & Đồng hành cùng Học sinh Tiểu học  
> **Mục tiêu:** Giúp phụ huynh khi xem bài chấm chi tiết (`StudentGradeDetailModal`) có thể **thấy ngay hình ảnh bài vở thực tế của con cùng đầy đủ các hộp khoanh vùng lỗi sai (Bounding Box)** được AI/Giáo viên phân loại trực quan, kèm tương tác 2 chiều (bấm nghe phát âm AI, đối soát điểm số sư phạm).

---

## 1. Hiện trạng & Lý do cần nâng cấp

### 1.1. Những điểm hạn chế hiện tại
1. **Ảnh và Bounding Box bị "giấu" sang Tab 2:**
   - Khi phụ huynh bấm *"Xem chi tiết bài này"* từ Dashboard (`/student`) hoặc Sổ điểm (`/student/history`), modal mặc định mở **Tab 1: Bảng điểm & Nhận xét**.
   - Phụ huynh chỉ thấy điểm số và chữ thuần túy, không nhìn thấy trang vở thật của con trừ khi phải tự mò mẫm chuyển sang Tab 2 ("Ảnh bài viết tay").
2. **Bounding Box ở Tab 2 hiển thị sơ sài, thiếu nhãn:**
   - Các hộp khoanh lỗi chỉ là hình chữ nhật trơ trọi, không có nhãn số thứ tự (`#1`, `#2`) hay từ đúng gợi ý thường trực. Phụ huynh phải rê chuột vào từng hộp mới hiện tooltip.
   - Trên thiết bị di động (SmartPhone/Tablet) — vốn là thiết bị phụ huynh hay dùng nhất — thao tác hover không hoạt động tốt, dẫn đến phụ huynh khó tra cứu.
3. **Thiếu cơ chế chuẩn hóa tọa độ đa tầng (Robust Coordinate Parser):**
   - Chỉ nhận dữ liệu khi có cấu trúc lồng `c.bbox.rel_x1`. Nếu server trả về dạng phẳng `c.rel_x1` hoặc tọa độ pixel `x1, y1`, hệ thống không vẽ được hộp.
4. **Thiếu công cụ tương tác chuyên sâu:**
   - Chưa có nút phóng to/thu nhỏ (Zoom in/out / Reset), bật/tắt lớp khoanh vùng để đối chiếu ảnh gốc, nghe phát âm trực tiếp từng từ khi chạm vào hộp trên ảnh.

---

## 2. Kiến trúc Giải pháp Mới

### 2.1. Đưa Khung Ảnh & Bounding Box thành Trọng tâm (Hero Visualizer)
Thay vì tách rời Ảnh sang Tab 2, thiết kế lại cấu trúc hiển thị theo mô hình **Split-View Sư phạm Hiện đại**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MODAL: BÀI KIỂM TRA CHÍNH TẢ - EM NGUYỄN VĂN AN (8.5 ĐIỂM - TỐT)           │
├─────────────────────────────────────────────────────────────────────────────┤
│ [ Thanh chuyển chế độ: 🖼️ Ảnh & Bảng điểm | 📑 So sánh đối chiếu | 🖨️ In ] │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 🖼️ CỘT TRÁI: ẢNH VỞ & BOUNDING BOX  │ 📊 CỘT PHẢI: BẢNG ĐIỂM & NHẬN XÉT    │
│ ┌──────────────────────────────────┐ │ ┌──────────────────────────────────┐ │
│ │ [🔎 Zoom - +] [👁️ Bật Box] [🔊] │ │ │ 1. Điểm Chính tả:   6.0/7.0đ      │ │
│ │ ┌──────────────────────────────┐ │ │ │ 2. Điểm Trình bày:  2.5/3.0đ      │ │
│ │ │ ẢNH VỞ HỌC SINH THẬT        │ │ │ └──────────────────────────────────┘ │
│ │ │                              │ │ │ 💡 Nhận xét cô giáo (Thông tư 27):   │ │
│ │ │    #1 ✓ chiều                │ │ │ "Nét chữ con đều, cần chú ý vần iêu" │ │
│ │ │   ┌────────┐                 │ │ │ ────────────────────────────────── │ │
│ │ │   │ chều   │  (Khung cam)    │ │ │ 📝 Danh sách 3 từ con cần luyện:    │ │
│ │ │   └────────┘                 │ │ │   [#1] chều ➔ chiều  (Loa 🔊)       │ │
│ │ │         #2 ✓ râm bụt         │ │ │   [#2] dâm ➔ râm     (Loa 🔊)       │ │
│ │ │        ┌────────┐            │ │ │   [#3] xao ➔ sao     (Loa 🔊)       │ │
│ │ │        │ dâm    │ (Khung tím)│ │ │ ────────────────────────────────── │ │
│ │ └───────┴────────┴────────────┘ │ │ │ 👨‍👩‍👧 Lời khuyên dành cho Ba Mẹ:       │ │
│ └──────────────────────────────────┘ │ │ "Tối nay cho bé nghe đọc lại..." │ │
│                                      │ └──────────────────────────────────┘ │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

> **Linh hoạt trên mọi thiết bị:**
> - **Màn hình Desktop / Tablet (>= 1024px):** Hiển thị song song 2 cột (Cột trái ảnh Bounding Box chiếm 55%, Cột phải nhận xét chiếm 45%).
> - **Màn hình Điện thoại di động (< 1024px):** Xếp tầng mượt mà: Ảnh khoanh lỗi nổi bật ở trên, phần nhận xét sư phạm ở dưới, có thể cuộn xem liền mạch.

---

## 3. Các tính năng cốt lõi sẽ triển khai

### Tính năng 1: Hiển thị Bounding Box thông minh 100% chuẩn xác
1. **Gắn nhãn thường trực (Always-visible Smart Badge):**
   - Mỗi hộp khoanh vùng đều có nhãn nổi `#1 ✓ từ_đúng` hoặc `✕ từ_sai`.
   - **Tự động đảo chiều nhãn:** Nếu hộp nằm sát mép trên ảnh (`rel_y1 < 0.08`), nhãn sẽ tự động nhảy xuống **dưới đáy** hộp để không bị che khuất.
2. **Mã màu phân loại lỗi theo chuẩn Sư phạm:**
   - 🟠 **Màu Cam / Hổ phách:** Lỗi phụ âm đầu (`s/x`, `tr/ch`, `d/gi/r`, `l/n`).
   - 🟣 **Màu Tím:** Lỗi dấu thanh (dấu hỏi / dấu ngã).
   - 🔵 **Màu Xanh lam:** Lỗi vần & nguyên âm chính (`iên/iêng`, `o/ô`).
   - 🔴 **Màu Đỏ:** Lỗi âm cuối & bỏ sót chữ.
   - 🟡 **Màu Vàng chanh:** Lỗi phương ngữ vùng miền.
3. **Chuẩn hóa tọa độ đa hình (Polymorphic Normalizer):**
   - Hỗ trợ cả 3 dạng dữ liệu: `bbox: { rel_x1, ... }`, `rel_x1` cấp ngoài, hoặc `x1, y1` pixel chia theo kích thước ảnh thật.

### Tính năng 2: Tương tác 2 chiều (Bi-directional Highlight & Audio Sync)
1. **Từ Bảng lỗi sang Ảnh:** Phụ huynh click/chạm vào từ sai ở danh sách bên phải $\rightarrow$ Hộp Bounding Box tương ứng trên ảnh sáng rực lên, phóng to nhẹ (`scale-110`) và viền nhấp nháy thu hút sự chú ý.
2. **Từ Ảnh sang Bảng lỗi:** Phụ huynh chạm trực tiếp vào hộp chữ trên trang vở $\rightarrow$ Hệ thống tự động phát âm chuẩn từ đó qua AI Edge-TTS (giọng Hoài My) và cuộn thẻ giải thích lý do sai hiển thị ngay lập tức.

### Tính năng 3: Bộ công cụ kiểm tra ảnh (Interactive Toolbar)
- **Công cụ Zoom (Phóng to / Thu nhỏ):** Nút phóng to 125%, 150%, 200% để phụ huynh nhìn rõ từng nét bút chì/bút mực của con trên dòng kẻ ô ly.
- **Bật/Tắt Lớp Bounding Box (Toggle Overlay):** Cho phép phụ huynh tạm ẩn các hộp khoanh để ngắm nhìn bài viết nguyên bản của con.
- **Thống kê tiến độ phát hiện:** Thanh trạng thái nhỏ báo: *"AI đã định vị chính xác 5/5 vị trí lỗi trên trang vở"*.

### Tính năng 4: Tự động dự phòng ảnh khi bài cũ chưa có ảnh upload
- Nếu bài chấm được nạp trực tiếp qua nhập văn bản hoặc bài cũ chưa kịp lưu ảnh ra đĩa, hệ thống hiển thị trang mô phỏng **Giấy kẻ ô ly Tiểu học HP001** với các chữ sai được gạch chân và khoanh vùng mô phỏng chân thực như trên trang vở.

---

## 4. Kế hoạch triển khai từng bước

| Bước | Nội dung công việc | File ảnh hưởng |
| :---: | :--- | :--- |
| **Bước 1** | Xây dựng component `StudentBoundingBoxCanvas` độc lập, chuyên sâu với Zoom, Pan, Smart Badge, Audio phát âm | `components/student/student-bbox-canvas.tsx` *(Tạo mới)* |
| **Bước 2** | Tái cấu trúc `StudentGradeDetailModal` sang bố cục Split-View (Ảnh Bounding Box bên trái + Bảng điểm/Nhận xét bên phải) | `components/student/student-grade-detail-modal.tsx` |
| **Bước 3** | Đồng bộ hóa tương tác 2 chiều (Click hộp ➔ Phát âm AI; Hover danh sách ➔ Highlight hộp trên ảnh) | `components/student/student-grade-detail-modal.tsx` |
| **Bước 4** | Kiểm thử giao diện trên 3 độ phân giải (Mobile 375px, Tablet 768px, Desktop 1440px) & Chạy `npm run build` | Toàn hệ thống Web |
| **Bước 5** | Đồng bộ và Commit đẩy lên GitHub repository | `git push origin main` |

---

## 5. Xác nhận & Bước tiếp theo

Kế hoạch trên đã sẵn sàng để triển khai. Bạn vui lòng xem qua và cho biết nếu có bất kỳ điều chỉnh nào về mặt giao diện hay tính năng trước khi tôi tiến hành lập trình nhé!
