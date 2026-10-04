# 📘 NỘI DUNG BỔ SUNG & CHỈNH SỬA CHO CHƯƠNG 3
## CHƯƠNG 3 — THIẾT KẾ HỆ THỐNG VÀ MÔ HÌNH

> **Hướng dẫn sử dụng cho tác giả:**
> Mở file `Báo cáo tổng eureka - Thiết bị chấm điểm.docx`, tìm đến Chương 3 để cập nhật: Sơ đồ kiến trúc Web-centric 4 tầng, Bảng chi tiết 9 bước tiền xử lý ảnh Jimp, Barem chấm điểm phân tách 2 phân môn (Chính tả 7-3 vs Tập làm văn 4-3-2-1), Lưu đồ thuật toán đối soát không ảo giác và Chính sách bảo vệ dữ liệu trẻ em theo Nghị định 13/2023/NĐ-CP.

---

### 3.1. Cập nhật Sơ đồ Kiến trúc Tổng thể Hệ thống (Mục 3.1)

Thay thế sơ đồ cũ bằng sơ đồ kiến trúc 4 tầng hoàn chỉnh (Web-Centric Architecture):

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TẦNG 1: GIAO DIỆN NGƯỜI DÙNG (CLIENT LAYER)                     │
│  - Thiết bị giáo viên: Trình duyệt Desktop / Tablet / Smartphone (PWA)                  │
│  - Chức năng: Điều khiển Đọc chính tả Web (/teacher/dictation), Loa giảng dạy lớp học, │
│               Chụp ảnh bài viết học sinh, Duyệt điểm & Tinh chỉnh thanh trượt (HITL)   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / WebSocket
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                    TẦNG 2: ỨNG DỤNG TRUNG TÂM (NEXT.JS 16 APP ROUTER)                  │
│  - Frontend: React 19, Tailwind CSS 4, Shadcn/ui Components, Recharts Biểu đồ         │
│  - API Routes:                                                                         │
│    + /api/preprocess : Pipeline Jimp 9 bước (Nắn góc Deskew, Khử bóng, CLAHE, Lọc ô ly)│
│    + /api/ocr        : Gọi Google Gemini SDK trích xuất văn bản thô giữ nguyên lỗi sai │
│    + /api/grade      : Bộ điều phối chấm điểm Đa phân môn (Chính tả vs Tập làm văn)   │
│    + /api/dictation  : Quản lý bài đọc SGK, phiên đọc, streaming âm thanh Edge-TTS     │
│    + /api/admin      : Quản trị tài khoản, lớp học, chính sách lưu trữ Soft Purge      │
│  - Bảo vệ: Rate Limiting Guard (lib/api-guard.ts - giới hạn 30 req/phút/IP)            │
└─────────────────────────────┬───────────────────────────┬──────────────────────────────┘
                              │                           │
              Local REST      │                           │ Cloud HTTPS
              (Cổng 8000)     ▼                           ▼
┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       TẦNG 3: AI MICROSERVICE (PYTHON)       │  │        TẦNG 4: CLOUD VISION VLM      │
│ - 1. ViT5 Sửa lỗi (chamdentimem) INT8 Quant  │  │ Google Gemini 3.1 Flash Lite API     │
│ - 2. Microsoft Edge-TTS Audio Streamer (/tts)│  │ - Nhận ảnh đã nắn thẳng qua Jimp     │
│ - 3. Qwen2.5-0.5B-Instruct SLM (/qwen)       │  │ - Trích xuất nguyên gốc original_text│
│ - 4. SequenceMatcher & Phân loại 6 nhóm lỗi  │  │ - Nhiệt độ cố định temperature = 0.1 │
└──────────────────────────────────────────────┘  └──────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          TẦNG CƠ SỞ DỮ LIỆU & LƯU TRỮ TỆP TIN                          │
│  - Prisma ORM 5: SQLite Database (vihand.db) nhẹ ~16MB (User, Class, Grade, Session...)│
│  - Hệ thống tệp cục bộ: Thư mục public/uploads/grades/ lưu ảnh bài thi học sinh        │
│  - Quản trị vòng đời: Tự động ẩn danh hóa & xóa ảnh bài thi sau 365 ngày (Nghị định 13)│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2. Bổ sung Bảng Chi tiết 9 Bước Pipeline Tiền Xử Lý Ảnh (Mục 3.2.1)

Thay thế hoặc bổ sung bảng thông số kỹ thuật 9 bước trong `lib/image-processor.ts`:

| Bước | Tên bước thuật toán | Phương pháp kỹ thuật | Tham số cấu hình | Tác dụng đối với ảnh bài viết tiểu học |
|:---:|---|---|---|---|
| **0** | **EXIF Orientation** | Phân tích metadata EXIF thẻ ảnh | Tự động xoay 0°, 90°, 180°, 270° | Đảm bảo ảnh chụp từ camera điện thoại luôn đứng thẳng chiều đọc. |
| **0.5** | **Deskew (Nắn góc)** | Quét phương sai lược đồ chiếu ngang | $\theta \in [-15^\circ, +15^\circ]$, bước mịn $0.1^\circ$ | Nắn thẳng trang vở bị đặt xiên khi chụp, giúp các dòng chữ nằm ngang. |
| **1** | **Adaptive Resize** | Thu phóng tỷ lệ giữ nguyên khung hình | Chiều rộng tối đa `1600px` | Giảm dung lượng ảnh, tăng tốc độ xử lý mà không làm vỡ nét chữ viết chì. |
| **2** | **White Balance** | Giả định thế giới xám (Gray World) | Điều chỉnh 3 kênh màu RGB | Khử hiện tượng ám vàng đèn học hoặc ánh sáng phòng học không đều. |
| **3** | **Grayscale Conversion** | Công thức độ chói tiêu chuẩn | $Y = 0.299R + 0.587G + 0.114B$ | Chuyển ảnh màu sang thang xám 8-bit, loại bỏ màu mực kẻ ô ly màu xanh/đỏ. |
| **4** | **Shadow Removal** | Phép chia nền qua màng lọc Box Blur | Kernel kích thước `51×51` (O(1) Integral) | Xóa bóng đổ bàn tay giáo viên hoặc bóng điện thoại đè lên trang vở. |
| **5** | **CLAHE** | Cân bằng lược đồ xám giới hạn tương phản | Clip Limit = `2.0`, Grid Tile = `8×8` | Đẩy độ tương phản của các nét bút chì mờ nhạt nổi bật hẳn so với mặt giấy. |
| **6** | **Unsharp Masking** | Làm sắc nét bằng lọc thông cao | Kernel Laplacian 3×3, lượng tăng `0.5` | Làm đậm và sắc nét các nét thanh, nét đậm và dấu thanh nhỏ (hỏi, ngã). |
| **7** | **Quality Assessment** | Phân tích phương sai toán tử Laplace | Ngưỡng mờ `80`, sáng `[50, 220]` | Đánh giá độ nét và ánh sáng; cảnh báo chụp lại nếu ảnh bị nhòe tay. |
| **8** | **Adaptive Threshold** | Nhị phân hóa thích ứng Gaussian | Kích thước khối thích ứng, hằng số `C = 20` | Tách lớp chữ đen trên nền giấy trắng tinh, xóa bỏ hoàn toàn đường kẻ ô ly. |

---

### 3.3. Tách Biệt Rõ Ràng 2 Barem Chấm Điểm & Lưu Đồ Giải Thuật (Mục 3.3)

*Cần sửa lại toàn bộ mục 3.3 để làm rõ việc hệ thống không dùng chung 1 barem điểm cho cả 2 phân môn:*

#### 3.3.1. Barem Chấm Điểm Chuẩn Hóa Theo Định Hướng Chương Trình GDPT 2018

##### [Phân môn 1] Barem Bài Chính Tả (Nghe - Viết / Nhìn - Viết) — Thang 10 Điểm
Đối với bài chính tả, học sinh chỉ có nhiệm vụ nghe viết lại đúng văn bản SGK, không tự sáng tác nội dung. Do đó barem được thiết kế chuẩn mực gồm 2 phần:
1. **Độ chính xác chính tả (Tối đa 7.0 điểm)**:
   - Điểm khởi đầu: 7.0 điểm.
   - Quy tắc trừ điểm: Khấu trừ cố định **0.5 điểm** cho mỗi lỗi sai khác nhau thuộc 6 nhóm lỗi (`phu_am_dau`, `van`, `dau_thanh`, `viet_hoa`, `bo_sot_them`, `dau_cau`).
   - Lỗi sai lặp lại giống hệt nhau ở nhiều vị trí trong bài chỉ bị trừ điểm 1 lần (theo tinh thần Thông tư 27 khích lệ học sinh). Điểm sàn chính tả: 0.0 điểm.
2. **Quy cách trình bày & Chữ viết (Tối đa 3.0 điểm)**:
   - Đánh giá độ ngay ngắn, thụt đầu dòng đúng quy cách, giữ vở sạch không lem mực (hỗ trợ giáo viên tinh chỉnh qua thanh trượt).
   - Tổng điểm: $\text{Điểm} = \text{Điểm Chính Tả} (7.0đ) + \text{Điểm Trình Bày} (3.0đ) \in [0.0, 10.0]$.

##### [Phân môn 2] Barem Bài Tập Làm Văn (Đoạn Văn Tự Do / Kể Chuyện) — Thang 10 Điểm
Đánh giá toàn diện năng lực diễn đạt ngôn ngữ và cảm xúc của học sinh theo 4 tiêu chí:
1. **Chính tả & Ngữ pháp (Tối đa 4.0 điểm)**: Khởi đầu 4.0đ, trừ 0.5đ cho mỗi lỗi chính tả hoặc lỗi câu què cụt do ViT5 phát hiện.
2. **Hình thức & Bố cục (Tối đa 3.0 điểm)**: Bố cục đoạn văn có mở đoạn, thân đoạn, kết đoạn; chữ viết rõ ràng.
3. **Nội dung & Diễn đạt (Tối đa 2.0 điểm)**: Đúng chủ đề đề bài yêu cầu, câu văn trôi chảy, có liên kết ý nghĩa.
4. **Sáng tạo & Cảm xúc (Tối đa 1.0 điểm)**: Tự động cộng điểm khi Tầng 1 phát hiện học sinh biết vận dụng từ láy tượng thanh/tượng hình (+0.5đ) hoặc biện pháp so sánh, nhân hóa (+0.5đ).

##### Quy tắc Xếp loại Đánh giá Chung:
- **9.0 – 10.0 điểm**: Xếp loại **Xuất sắc** (Hoàn thành xuất sắc nhiệm vụ).
- **7.0 – 8.5 điểm**: Xếp loại **Tốt** (Hoàn thành tốt).
- **5.0 – 6.5 điểm**: Xếp loại **Khá** (Hoàn thành khá).
- **3.0 – 4.5 điểm**: Xếp loại **Trung bình** (Đạt yêu cầu cơ bản).
- **Dưới 3.0 điểm**: Xếp loại **Cần cố gắng** (Cần rèn luyện thêm).

---

#### 3.3.2. Lưu Đồ Thuật Toán Ground-Truth Guided Alignment (Zero-Hallucination)

Vẽ hoặc chèn lưu đồ giải thuật so khớp văn bản bài chính tả vào mục 3.3.2:

```text
       [ Ảnh bài thi học sinh ]
                  │
                  ▼
       [ Pipeline Jimp 9 bước ]  ──► (Ảnh sạch ô ly, khử bóng, nắn thẳng)
                  │
                  ▼
       [ Google Gemini Vision ]  ──► (Trích xuất nguyên văn original_text)
                  │
                  ▼
    ┌─────────────────────────────┐
    │  Có bài đọc mẫu SGK không?  │
    └──────────────┬──────────────┘
           CÓ      │            KHÔNG (Bài tự do / Tập làm văn)
                   ▼                               ▼
    ┌─────────────────────────────┐  ┌─────────────────────────────┐
    │ Nạp Ground Truth bài đọc    │  │ Gửi văn bản vào ViT5        │
    │ từ DictationSession         │  │ để sửa lỗi ngữ pháp & tìm   │
    └──────────────┬──────────────┘  │ các biện pháp tu từ nghệ thuật│
                   │                 └──────────────┬──────────────┘
                   ▼                                │
    ┌─────────────────────────────┐                 │
    │ SequenceMatcher Word Diff   │                 ▼
    │ So khớp từng vị trí từ vựng │  ┌─────────────────────────────┐
    └──────────────┬──────────────┘  │ Qwen2.5-0.5B-Instruct SLM   │
                   │                 │ sinh lời nhận xét sư phạm   │
                   ▼                 └──────────────┬──────────────┘
    ┌─────────────────────────────┐                 │
    │ Bộ luật Ngữ âm tiếng Việt   │                 │
    │ Phân loại vào 6 nhóm lỗi    │                 │
    └──────────────┬──────────────┘                 │
                   │                                │
                   ▼                                ▼
    ┌─────────────────────────────┐  ┌─────────────────────────────┐
    │ Áp dụng Barem Chính tả:     │  │ Áp dụng Barem Tập làm văn:  │
    │ 7.0đ Chính tả + 3.0đ H.Thức │  │ 4-3-2-1 điểm                │
    │ (Zero-Hallucination 100%)   │  │ (Đánh giá 2 tầng)           │
    └──────────────┬──────────────┘  └──────────────┬──────────────┘
                   │                                │
                   └──────────────┬─────────────────┘
                                  ▼
                [ Giao diện Human-in-the-loop ]
         (Giáo viên rà soát, tinh chỉnh thanh trượt điểm)
                                  │
                                  ▼
                [ Lưu kết quả vào SQLite vihand.db ]
                [ Lưu tệp ảnh vào /uploads/grades/ ]
```

---

### 3.4. Bổ sung Chính Sách Bảo Vệ Dữ Liệu & Quyền Riêng Tư Trẻ Em (Mục 3.4.2)

Chèn thêm mục 3.4.2 vào sau phần Phân quyền người dùng (RBAC):

#### 3.4.2. Kiến trúc Bảo vệ Quyền Riêng tư & Vòng đời Dữ liệu Học sinh (Nghị định 13/2023/NĐ-CP)
> Dữ liệu bài thi của học sinh tiểu học chứa các thông tin nhạy cảm bao gồm: họ tên, lớp học, chữ viết tay cá nhân và hình ảnh chân thực bài làm. Nhằm đảm bảo tuyệt đối an toàn thông tin theo Nghị định số 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân, ViHand Grade thiết lập kiến trúc quản trị vòng đời dữ liệu chuyên biệt:
>
> 1. **Kiến trúc Lưu trữ Phân tách (Decoupled Image Storage)**:
>    - Ảnh bài thi tuyệt đối không lưu trực tiếp dưới dạng chuỗi Base64 dài hàng Megabytes trong bảng cơ sở dữ liệu SQLite (tránh gây nghẽn RAM và lỗi phình dữ liệu DB Bloat).
>    - Toàn bộ ảnh được lưu thành tệp vật lý độc lập trong thư mục bảo vệ `public/uploads/grades/` với tên tệp được băm ngẫu nhiên bằng thuật toán mã hóa (VD: `1741234567-a8f9c1e.jpg`). Trong SQLite chỉ lưu đường dẫn URI tham chiếu tương đối.
>
> 2. **Chính sách Tự động Hết hạn & Ẩn danh hóa (Soft Purge)**:
>    - Mỗi bản ghi bài chấm được gắn thuộc tính `expiresAt` với thời hạn mặc định là **365 ngày (tương đương 1 niên khóa học tập)**.
>    - Khi hết hạn lưu trữ, quản trị viên kích hoạt quy trình **Soft Purge** qua API `/api/admin/retention` hoặc chạy script định kỳ `scripts/purge_expired_grades.js`:
>      - Xóa vĩnh viễn tệp ảnh bài làm vật lý trên đĩa cứng, giải phóng dung lượng máy chủ trường học.
>      - Cập nhật trường `isAnonymized = true` và ẩn danh hóa trường tên học sinh (chuyển thành `Học sinh ẩn danh (Lớp 3A)`).
>      - Giữ lại các trường điểm số định lượng để nhà trường tiếp tục theo dõi thống kê phổ điểm theo thời gian mà không để lộ danh tính của trẻ em.
