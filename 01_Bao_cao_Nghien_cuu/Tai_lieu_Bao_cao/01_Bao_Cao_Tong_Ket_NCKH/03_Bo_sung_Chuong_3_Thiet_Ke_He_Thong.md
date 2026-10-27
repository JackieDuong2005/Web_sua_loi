# 📘 NỘI DUNG BỔ SUNG & CHỈNH SỬA CHO CHƯƠNG 3
## CHƯƠNG 3 — THIẾT KẾ HỆ THỐNG VÀ MÔ HÌNH

> **Hướng dẫn tác giả sử dụng tài liệu:**
> Mở file `Báo cáo tổng eureka - Thiết bị chấm điểm.docx`, tìm đến Chương 3 để cập nhật: Sơ đồ kiến trúc 4 tầng hoàn chỉnh, Bảng chi tiết 9 bước tiền xử lý ảnh Jimp, Barem chấm điểm phân tách 2 phân môn (Chính tả 7-3 vs Tập làm văn 4-3-2-1), Quy trình tích hợp YOLOv8 Bounding Box, Lưu đồ thuật toán Ground-Truth không ảo giác và Chính sách bảo vệ dữ liệu trẻ em theo Nghị định 13/2023/NĐ-CP.

---

### 3.1. Cập nhật Sơ đồ Kiến trúc Tổng thể Hệ thống (Mục 3.1)

* **Vị trí chèn trong file Word:** Thay thế sơ đồ kiến trúc cũ tại **Mục 3.1: Kiến trúc tổng thể hệ thống** (trang 34).
* **Câu neo định vị trong Word (Anchor Text):** Tìm tiêu đề `3.1. Kiến trúc tổng thể hệ thống` và thay thế đoạn mô tả / hình vẽ cũ bằng sơ đồ kiến trúc 4 tầng dưới đây:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TẦNG 1: GIAO DIỆN NGƯỜI DÙNG (CLIENT SURFACES)                  │
│  - Ứng dụng Android Native (android_app/): Kotlin, CameraX, Compose, Retrofit,         │
│    Chụp ảnh bài thi, Hiển thị Bounding Box từ sai trực quan, Server-Only Storage.       │
│  - Cổng thông tin Web (PWA): Quản lý lớp học, Điều khiển đọc chính tả (/dictation),   │
│    Canvas chấm bài giáo viên (/grade), Tinh chỉnh thanh trượt điểm số (HITL).          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / WebSocket / Multipart
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               TẦNG 2: CỔNG ĐIỀU PHỐI & MOBILE BFF GATEWAY (NEXT.JS 16 APP ROUTER)       │
│  - API Routes Điều phối:                                                               │
│    + /api/mobile/grade : Mobile BFF Gateway chuyên dụng cho Android Native App         │
│    + /api/grade        : Bộ điều phối Web chấm bài Đa phân môn (Chính tả vs Làm văn)   │
│    + /api/preprocess   : Pipeline Jimp 9 bước (Nắn góc Deskew, Khử bóng, Lọc ô ly)     │
│    + /api/dictation    : Quản lý kho ngữ liệu SGK Lớp 1-5, điều phối phiên đọc mẫu     │
│    + /api/admin        : Quản trị tài khoản RBAC, kích hoạt Soft Purge (Nghị định 13) │
│  - Bảo vệ hệ thống: Sliding Window Rate Limiter (lib/api-guard.ts - 30 req/phút/IP)    │
└─────────────────────────────┬───────────────────────────┬──────────────────────────────┘
                              │                           │
              Local REST      │                           │ Cloud HTTPS
              (Cổng 8000)     ▼                           ▼
┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       TẦNG 3: AI MICROSERVICE (PYTHON)       │  │        TẦNG 4: CLOUD VISION VLM      │
│ - 1. ViT5 Sửa lỗi (chamdentimem) INT8 Quant  │  │ Google Gemini 3.1 Flash Lite API     │
│ - 2. YOLOv8 Word Detector (/detect-words)    │  │ - Nhận diện ảnh đã nắn thẳng qua Jimp│
│ - 3. Qwen2.5-0.5B-Instruct SLM (/qwen)       │  │ - Trích xuất nguyên gốc original_text│
│ - 4. Microsoft Edge-TTS Audio Streamer (/tts)│  │ - Nhiệt độ cố định temperature = 0.1 │
│ - 5. SequenceMatcher & Phân loại 6 nhóm lỗi  │  │ - Bảo toàn 100% lỗi chính tả gốc     │
└──────────────────────────────────────────────┘  └──────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          TẦNG CƠ SỞ DỮ LIỆU & LƯU TRỮ TỆP TIN                          │
│  - Prisma ORM 5: Cơ sở dữ liệu SQLite cục bộ (prisma/vihand.db) nhẹ và bảo mật cao     │
│  - Lưu trữ đĩa phân tách: Thư mục public/uploads/grades/ lưu ảnh bài thi học sinh      │
│  - Quản trị vòng đời: Tự động ẩn danh hóa & xóa tệp ảnh sau 365 ngày (Nghị định 13)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Kiến trúc Tổng thể Luồng Đọc Chính Tả Sư Phạm & Khóa Ground Truth (Mục 3.2 Mới)

* **Vị trí chèn trong file Word:** Tạo mục mới **Mục 3.2: Kiến trúc tổng thể luồng đọc chính tả sư phạm & cơ chế khóa Ground Truth** ngay sau Mục 3.1 (trang 35, trước mục tiền xử lý ảnh).
* **Câu neo định vị trong Word (Anchor Text):** Chèn ngay sau phần kết luận của sơ đồ kiến trúc 4 tầng Mục 3.1.
* **Hành động:** Chèn toàn bộ nội dung lý thuyết, bảng tham số và lưu đồ hoạt động dưới đây vào tài liệu:

#### 3.2.1. Đặt vấn đề và Mục tiêu Sư phạm của Phân hệ Đọc Chính Tả
Trong phân môn Tiếng Việt cấp Tiểu học (theo Chương trình GDPT 2018), các tiết học Chính tả (Nghe – Viết) đóng vai trò nền tảng trong việc hình thành kỹ năng viết chuẩn chính tả, rèn luyện quy tắc ngữ âm và tốc độ viết của học sinh từ Lớp 1 đến Lớp 5. Tuy nhiên, trong thực tế giảng dạy, giáo viên tiểu học gặp phải các thách thức lớn:
1. **Tính bất đối xứng về tốc độ:** Tốc độ chép bài của học sinh trong cùng một lớp có sự chênh lệch đáng kể (đặc biệt là học sinh Lớp 1, Lớp 2 mới chuyển giai đoạn từ viết chì sang viết mực). Giáo viên đọc quá nhanh sẽ khiến học sinh bị bỏ từ, mất nhịp; đọc quá chậm sẽ làm phân tán sự chú ý của các em viết nhanh.
2. **Gánh nặng thể lực và giọng đọc:** Việc phải lặp đi lặp lại từng cụm từ 2 đến 3 lần với âm lượng lớn trong suốt tiết học 35–40 phút gây mệt mỏi thanh quản cho giáo viên, đồng thời khó duy trì được âm sắc, cao độ và độ chuẩn thanh điệu đồng đều qua các tiết học.
3. **Mất liên kết giữa Đọc và Chấm:** Trong các hệ thống AI thông thường, phân hệ nhận dạng và chấm bài hoạt động tách rời hoàn toàn với bài đọc trên lớp. Giáo viên sau khi đọc xong phải mất thời gian nhập lại hoặc chọn lại bài mẫu, dễ dẫn đến sai lệch ngữ liệu đối chiếu.

Để giải quyết triệt để các vấn đề trên, hệ sinh thái ViHand Grade thiết kế phân hệ **Trợ giảng số Đọc chính tả thông minh** kết hợp **Cơ chế khóa ngữ liệu chuẩn (Ground Truth Locking)** với mục tiêu:
* Tự động hóa hoàn toàn việc phân rã câu thành các cụm từ ngữ nghĩa phù hợp nhịp viết của lứa tuổi học sinh tiểu học.
* Cung cấp động cơ phát âm thanh đa tầng (Multi-tier TTS) với âm điệu chuẩn tiếng Việt sư phạm, hoạt động ổn định cả khi trực tuyến lẫn khi mất mạng (Offline Edge).
* Đóng gói toàn bộ bài đọc mẫu thành một phiên học tập (`DictationSession`), truyền thẳng sang phân hệ chấm bài chỉ bằng 1 cú nhấp chuột (1-Click Handoff), loại bỏ hoàn toàn hiện tượng AI bịa lỗi (Zero-Hallucination).

---

#### 3.2.2. Kiến trúc 4 Khối Chức Năng của Luồng Đọc Chính Tả

Phân hệ Đọc chính tả được cấu thành từ 4 khối chức năng liên hoàn:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               KHỐI 1: QUẢN LÝ & CHUẨN HÓA NGỮ LIỆU ĐẦU VÀO (INPUT CORPUS)               │
│ - Kho ngữ liệu số hóa SGK Lớp 1 - 5 (Kết nối tri thức, Chân trời sáng tạo, Cánh diều).  │
│ - Bộ tạo sinh văn bản tự động qua SLM Qwen2.5-0.5B-Instruct theo chủ đề giáo viên yêu cầu.│
│ - Bộ bóc tách "Từ khó chính tả" (Hard Words Extraction): Tự động phát hiện các từ chứa   │
│   âm đầu dễ lẫn (tr/ch, s/x, d/r/gi), vần phức (oang, uych) và dấu thanh (hỏi/ngã).     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│            KHỐI 2: ĐIỀU PHỐI NHỊP ĐIỆU SƯ PHẠM (PEDAGOGICAL RHYTHM ORCHESTRATOR)        │
│ - Thuật toán phân rã cụm câu (Pedagogical Clause Splitter): Cắt câu dài thành các cụm  │
│   từ tự nhiên từ 4 đến 7 từ, không ngắt đôi từ ghép hoặc cụm chủ - vị cố định.         │
│ - Bộ đếm nhịp nghỉ thích ứng: T_pause = Max(Số từ × Tham số nhịp lớp, T_min).          │
│ - Chế độ Trình chiếu Phòng học (Classroom Theater): Bộ đếm ngược trực quan hiển thị    │
│   trên màn hình máy chiếu giúp cả lớp đồng bộ nhịp viết mà không gây áp lực.           │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             KHỐI 3: ĐỘNG CƠ PHÁT ÂM THANH ĐA TẦNG (MULTI-TIER AUDIO ENGINE)            │
│ - Tier 1 (Cloud / Edge-TTS): Giọng đọc Neural AI vi-VN-HoaiMyNeural (nữ Bắc Bộ ấm áp)  │
│   hoặc vi-VN-NamMinhNeural (nam Bắc Bộ dõng dạc), điều chỉnh tốc độ -15% chuẩn đọc mẫu. │
│ - Tier 2 (Offline Edge / Piper VITS ONNX): Tổng hợp âm thanh cục bộ tại máy chủ phòng  │
│   học hoặc Raspberry Pi (tần số lấy mẫu 22.05 kHz), sẵn sàng hoạt động khi mất Internet.│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│         KHỐI 4: LƯU TRỮ PHIÊN & KHÓA GROUND TRUTH (SESSION & GROUND TRUTH HANDOFF)      │
│ - Lưu phiên làm việc vào SQLite vihand.db (Bảng DictationSession) kèm toàn bộ metadata. │
│ - Nút bấm 1-Click Handoff: Chuyển toàn bộ ngữ liệu chuẩn sang phân hệ Chấm bài         │
│   (/teacher/grade?sessionId=...), khóa cứng bài đọc làm căn cứ đối soát tuyệt đối.     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

#### 3.2.3. Bảng Cấu Hình Tham Số Nhịp Đọc Chuẩn Theo Khối Lớp Tiểu Học

Dựa trên chuẩn kiến thức, kỹ năng của Chương trình Giáo dục phổ thông 2018 đối với phân môn Tiếng Việt tiểu học, hệ thống thiết lập bảng thông số mặc định cho từng khối lớp như sau:

| Khối lớp | Tốc độ viết chuẩn<br>(chữ / 15 phút) | Độ dài cụm từ ngắt nhịp<br>(Số từ / lần đọc) | Thời gian dừng nghỉ<br>(giây / từ) | Số lần lặp lại mặc định<br>(Lần / cụm từ) | Tốc độ đọc TTS<br>(Pitch / Rate) |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **Lớp 1** (Học kỳ 2) | 30 – 35 chữ | **2 – 3 từ** | **2.5 – 3.0 giây** | 3 lần | -20% (Chậm, rõ âm) |
| **Lớp 2** | 45 – 50 chữ | **3 – 4 từ** | **2.0 – 2.2 giây** | 2 – 3 lần | -15% (Chuẩn sư phạm) |
| **Lớp 3** | 65 – 70 chữ | **4 – 5 từ** | **1.6 – 1.8 giây** | 2 lần | -10% (Tự nhiên) |
| **Lớp 4** | 80 – 85 chữ | **5 – 7 từ** | **1.3 – 1.5 giây** | 2 lần | 0% (Bình thường) |
| **Lớp 5** | 90 – 100 chữ | **6 – 8 từ** | **1.1 – 1.3 giây** | 1 – 2 lần | 0% (Chuẩn văn bản) |

> **Công thức tính thời gian dừng nghỉ giữa các lần đọc:**
>
> $$T_{\text{pause}} = \max\left(N_{\text{words}} \times t_{\text{grade\_factor}} + t_{\text{extra\_punctuation}},\, T_{\min}\right)$$
>
> Trong đó:
> * $N_{\text{words}}$: Số lượng từ trong cụm từ ngữ nghĩa vừa đọc.
> * $t_{\text{grade\_factor}}$: Hệ số thời gian theo khối lớp (giây/từ) theo bảng trên.
> * $t_{\text{extra\_punctuation}}$: Thời gian bù thêm nếu cuối cụm có dấu chấm ($+1.5\text{s}$) hoặc dấu phẩy ($+0.8\text{s}$) để học sinh kịp viết hoa hoặc ngắt nhịp.
> * $T_{\min}$: Thời gian dừng tối thiểu ($3.0\text{s}$).

---

#### 3.2.4. Lưu Đồ Hoạt Động của Nhánh Đọc Chính Tả Sư Phạm

* **Tên hình ảnh:** `Hình 3.2: Lưu đồ hoạt động của phân hệ Đọc chính tả sư phạm và cơ chế khóa Ground Truth`
* **Đường dẫn tệp ảnh chất lượng cao:** `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/01_Bao_Cao_Tong_Ket_NCKH/hinh_3_2_luu_do_doc_chinh_ta.jpg`

![Hình 3.2: Lưu đồ hoạt động của phân hệ Đọc chính tả sư phạm và cơ chế khóa Ground Truth](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/01_Bao_Cao_Tong_Ket_NCKH/hinh_3_2_luu_do_doc_chinh_ta.jpg)

**Thuyết minh chi tiết 9 bước trong chu trình hoạt động (Hình 3.2):**
1. **Bước 1 (Tiếp nhận bài đọc chính tả):** Giáo viên chuẩn bị dữ liệu văn bản bài đọc thông qua ba nguồn tiếp nhận linh hoạt, bao gồm: tuyển chọn các bài đọc chuẩn trong kho ngữ liệu số hóa từ ba bộ sách giáo khoa hiện hành (Lớp 1 đến Lớp 5), dán đoạn văn bản hoặc bài thơ tự chọn từ giáo án giảng dạy, hoặc kích hoạt tính năng tạo sinh văn bản tự động bằng trí tuệ nhân tạo theo chủ đề tiết học với dung lượng từ ngữ chuẩn hóa theo từng độ tuổi.
2. **Bước 2 (Tự động trích xuất danh sách "Từ khó chính tả"):** Trước khi học sinh viết bài, hệ thống tự động phân tích văn bản để bóc tách từ 4 đến 8 từ vựng có độ phức tạp cao về ngữ âm nhằm phục vụ hoạt động luyện bảng con. Căn cứ xác định các từ khó này được xây dựng dựa trên: (1) Chuẩn kỹ năng phân môn Chính tả của Chương trình GDPT 2018 (Thông tư 32/2018/TT-BGDĐT) và hướng dẫn bài dạy của Bộ GD&ĐT (Công văn 2345/BGDĐT-GDTH); và (2) Thang đo độ phức tạp âm vị học tiếng Việt (tập trung vào các cặp phụ âm đầu dễ lẫn *tr/ch, s/x, d/r/gi, l/n*; các tổ hợp vần phức có âm đệm và nguyên âm đôi *oang, uych, oeo, iêng*; cùng hai thanh điệu có tần suất nhầm lẫn phương ngữ cao nhất là thanh hỏi và thanh ngã). Mỗi từ khó đều tích hợp nút phát âm mẫu chuẩn mực để học sinh luyện nghe và viết đúng trước khi vào bài chính thức.
3. **Bước 3 (Thiết lập tham số nhịp đọc theo khối lớp):** Hệ thống tự động nạp cấu hình thông số sư phạm mặc định theo khối lớp, cho phép giáo viên tùy chỉnh tốc độ đọc thư thái (mặc định -15% so với đàm thoại thông thường để phát âm tròn vành rõ chữ), số lượt đọc lặp lại (2 đến 3 lượt tùy theo lứa tuổi) và khoảng thời gian dừng nghỉ thích ứng giữa các cụm từ (từ 1.5 đến 2.0 giây cho mỗi từ đơn).
4. **Bước 4 (Tách bài đọc thành các cụm từ ngắn vừa sức):** Nhằm khắc phục hạn chế học sinh không thể ghi nhớ trọn vẹn cả câu dài, hệ thống tự động phân tách văn bản thành danh sách các cụm từ ngữ nghĩa ngắn từ 3 đến 7 từ dựa trên các điểm ngắt nhịp tự nhiên của ngữ pháp tiếng Việt (dấu phẩy, ranh giới chủ – vị), tuyệt đối không ngắt đôi từ ghép hoặc từ láy.
5. **Bước 5 (Phát âm thanh câu đọc qua loa lớp học):** Cụm từ ngữ nghĩa tương ứng được chuyển đến động cơ tổng hợp tiếng nói đa tầng để chuyển đổi thành luồng âm thanh chuẩn tiếng Việt có ngữ điệu ấm áp, dõng dạc và truyền phát trực tiếp qua hệ thống loa phòng học với độ trễ phản hồi dưới 350ms, đảm bảo âm lượng đồng đều và độ sắc nét về thanh điệu cho toàn thể học sinh trong lớp.
6. **Bước 6 (Tự động đếm nhịp dừng nghỉ chờ học sinh viết):** Ngay khi câu đọc mẫu vừa kết thúc, hệ thống tự động kích hoạt bộ đếm thời gian dừng nghỉ thích ứng, cho phép học sinh có đủ thời gian hoàn thành việc viết cụm từ vào vở ô ly theo nhịp độ tự nhiên của cơ tay mà không cảm thấy hối hả hay áp lực.
7. **Bước 7 (Kiểm tra điều kiện vòng lặp sư phạm):** Hệ thống tiến hành đối soát tiến độ của phiên đọc; trường hợp chưa hoàn thành đủ số lượt đọc quy định cho cụm từ hiện tại (nhánh *Chưa đủ*), hệ thống tự động phát âm thanh nhắc lại kèm khoảng nghỉ ngắn; ngược lại, khi đã hoàn tất đủ số lượt và bài đọc vẫn còn các câu tiếp theo (nhánh *Chưa xong*), hệ thống tự động chuyển sang xử lý cụm từ kế tiếp.
8. **Bước 8 (Thông báo kết thúc & Tự động lưu thông tin tiết học):** Sau khi cụm từ cuối cùng được phát âm xong, hệ thống tự động phát câu lệnh âm thanh thông báo kết thúc để học sinh soát lại toàn bài, đồng thời ghi nhận toàn bộ thông tin phiên đọc (tiêu đề, khối lớp, nội dung văn bản chuẩn và thời gian thực hiện) vào cơ sở dữ liệu làm bằng chứng minh bạch phục vụ công tác quản lý sư phạm.
9. **Bước 9 (Chuyển trực tiếp sang phân hệ Chấm điểm):** Giáo viên kích hoạt nút chuyển giao một chạm để điều hướng trực tiếp sang giao diện chấm bài, tại đây toàn bộ nội dung của bài đọc vừa nghe được khóa cứng làm văn bản đối chiếu chuẩn (*Ground Truth*); khi ảnh chụp bài thi của học sinh được tải lên, thuật toán chấm điểm sẽ đối soát trực tiếp với văn bản chuẩn này, loại bỏ hoàn toàn hiện tượng mô hình AI bịa đặt lỗi sai (Zero-Hallucination 100%).

---

### 3.3. Pipeline Tiền Xử Lý Ảnh Bài Thi 9 Bước Bằng Jimp (Mục 3.3)

* **Vị trí chèn trong file Word:** Cập nhật **Mục 3.3: Chi tiết thuật toán từng bước trong pipeline tiền xử lý ảnh** (trang 36–37).
* **Câu neo định vị trong Word (Anchor Text):** Tìm câu: *"...các bước trong đường ống tiền xử lý ảnh được thiết kế liên hoàn như sau:"* hoặc bảng mô tả xử lý ảnh cũ.
* **Hành động:** Chèn hoặc thay thế bằng Bảng đặc tả kỹ thuật 9 bước tiền xử lý ảnh Jimp:

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

### 3.4. Barem Chấm Điểm 2 Luồng, Tích Hợp YOLOv8 Bounding Box & Lưu Đồ Chấm Điểm (Mục 3.4)

* **Vị trí chèn trong file Word:** Cập nhật toàn diện **Mục 3.4: Quy trình chấm điểm bằng AI đa phương thức** (trang 38–40).
* **Câu neo định vị trong Word (Anchor Text):** Bắt đầu từ `3.4.1. Các thành phần chính của quy trình chấm điểm` (trước đây là 3.3).
* **Hành động:** Thay thế và mở rộng thành 3 tiểu mục con hoàn chỉnh dưới đây:

#### 3.4.1. Barem Chấm Điểm Tích Hợp Thể Hiện 2 Luồng Xử Lý (Mục 3.4.1)

* **Vị trí chèn trong file Word:** Thay thế trực tiếp **Bảng 3.3: Barem chấm điểm tích hợp trong hệ thống** (trang 38–39).
* **Câu neo định vị trong Word (Anchor Text):** Tìm bảng có tiêu đề *"Bảng 3.3 Barem chấm điểm tích hợp trong hệ thống"* và đoạn văn liền sau *"Để triệt tiêu hoàn toàn hiện tượng ảo giác của mô hình AI..."*.
* **Hành động:** Thay thế toàn bộ bằng 1 bảng duy nhất thể hiện rõ 2 luồng xử lý và đoạn thuyết minh chuẩn hóa dưới đây:

##### Bảng 3.3: Barem chấm điểm tích hợp trong hệ thống (Phân tách 2 luồng xử lý)

| Tiêu chí | Điểm Luồng 1<br>(Chính tả SGK) | Điểm Luồng 2<br>(Tập làm văn) | Phương pháp & Tiêu chuẩn đánh giá chi tiết (Theo Thông tư 27/2020/TT-BGDĐT) |
|---|:---:|:---:|---|
| **Chính tả & Ngữ pháp** | **7.0** | **4.0** | • Trừ **0.5đ/lỗi khác nhau** thuộc các nhóm lỗi âm vị (phụ âm đầu, vần, dấu thanh, viết hoa, dấu câu) hoặc câu cụt thiếu thành phần.<br>• **Lỗi sai lặp lại chỉ trừ 1 lần** để khích lệ học sinh. Sàn điểm: 0.0đ.<br>• *Luồng 1 (Chính tả):* Khởi điểm 7.0đ, đối soát 1-1 với văn bản chuẩn SGK qua SequenceMatcher (Zero-Hallucination 100%).<br>• *Luồng 2 (Tập làm văn):* Khởi điểm 4.0đ, mô hình ViT5 phát hiện lỗi chính tả ngữ cảnh và ngữ pháp tiếng Việt. |
| **Hình thức trình bày** | **3.0** | **3.0** | • Đánh giá theo 4 mức định lượng: **3.0đ** (Tốt) — **2.0đ** (Khá) — **1.0đ** (Đạt) — **0.0đ** (Chưa đạt).<br>• Tiêu chí chung: Nét chữ đều, giữ đúng khoảng cách và độ cao ô ly, thụt đầu dòng đúng quy cách, giữ vở sạch không lem mực/tẩy xóa.<br>• *Luồng 2 đánh giá thêm:* Bố cục đoạn văn có đầy đủ mở đoạn, thân đoạn và kết đoạn rõ ràng. |
| **Nội dung & Ý tưởng** | **0.0**<br>*(Không áp dụng)* | **2.0** | • Đánh giá theo mức: **2.0đ** (Đúng trọng tâm, ý tứ phong phú, chân thực) → **1.5đ** → **1.0đ** → **0.5đ** → **0.0đ** (Lạc đề).<br>• *Luồng 1 không áp dụng (0.0đ)* vì học sinh chỉ có nhiệm vụ nghe viết/chép đúng văn bản mẫu SGK, không tự sáng tác nội dung. |
| **Sáng tạo (từ láy, so sánh, nhân hóa)** | **0.0**<br>*(Không áp dụng)* | **1.0** | • Điểm thưởng cộng thêm tự động (Bonus Score):<br>  + **+0.5đ**: Vận dụng từ láy tượng thanh, tượng hình (*lon ton, lấp lánh, rì rào, thoang thoảng...*).<br>  + **+0.5đ**: Sử dụng biện pháp tu từ nghệ thuật: **So sánh** (*như, tựa như*) hoặc **Nhân hóa** (*chị gió, bác gà trống...*).<br>• *Luồng 1 không áp dụng (0.0đ)* đối với bài viết chính tả. |
| **TỔNG ĐIỂM** | **10.0** | **10.0** | **Thang điểm 10.0 chuẩn mực GDPT 2018.** Hệ thống AI tính toán tự động và đề xuất trước; giáo viên luôn có quyền kiểm tra trực quan và tinh chỉnh điểm số qua giao diện Canvas (Human-in-the-loop). |

> **Cơ chế chống AI bịa lỗi (ảo giác) và quy trình lưu kết quả:**
> 
> Để đảm bảo AI chấm bài công bằng và không tự "bịa" ra lỗi sai của học sinh, hệ thống xử lý riêng cho từng dạng bài:
> 
> * **Đối với bài Chính tả (từ SGK hoặc thư viện hệ thống):** Hệ thống so sánh trực tiếp từng chữ học sinh viết với bài đọc mẫu có sẵn. Chữ nào viết khác hoặc viết sai so với bài mẫu mới bị tính lỗi, nhờ đó AI hoàn toàn không thể tự phỏng đoán hay bắt lỗi sai oan cho học sinh.
> * **Đối với bài Tập làm văn:** Do học sinh viết tự do và không có bài mẫu đối chiếu, hệ thống cố định độ ngẫu nhiên của AI ở mức thấp nhất (temperature = 0.1) để kết quả chấm luôn ổn định và công tâm. AI bắt buộc phải chấm đúng theo 4 tiêu chí của Bảng 3.3 và chỉ rõ từ ngữ hoặc câu văn bị sai trong bài, tránh việc cho điểm theo cảm tính.
> 
> Sau khi chấm xong, để hệ thống lưu trữ kết quả thẳng vào cơ sở dữ liệu, AI sẽ gửi dữ liệu về theo một khung mẫu chuẩn thống nhất (định dạng JSON). Khung mẫu này gom đầy đủ các thông tin quan trọng gồm: điểm tổng kết, điểm chi tiết từng phần, bài viết gốc nhận dạng được, bài viết đã sửa đúng, danh sách chi tiết các từ sai và lời nhận xét động viên để học sinh tiến bộ hơn.

#### 3.4.2. Quy Trình Định Vị Lỗi Sai Với YOLOv8 Word Bounding Box

Tích hợp trực tiếp mô hình YOLOv8 vào luồng xử lý chấm điểm song song:
1. Khi ảnh được gửi đến cổng điều phối (`/api/grade` hoặc `/api/mobile/grade`), hệ thống thực hiện hai luồng xử lý song song:
   - **Luồng 1 (OCR)**: Gemini 3.1 Flash Lite nhận diện văn bản thô $W = [w_1, w_2, ..., w_N]$.
   - **Luồng 2 (Word Detection)**: Gửi ảnh sang Python microservice endpoint `/detect-words` để YOLOv8 bóc tách toàn bộ hộp bao $B = [b_1, b_2, ..., b_K]$.
2. **So khớp Token - Hộp bao (Token-to-Bbox Alignment)**:
   Sau khi cả hai luồng hoàn tất, hệ thống thực hiện ánh xạ chỉ số $1 \leftrightarrow 1$ giữa từ vựng $w_i$ và hộp bao $b_i$ dựa trên thứ tự dòng đọc tự nhiên đã được chuẩn hóa.
3. **Gán trạng thái trực quan**:
   - Nếu từ $w_i$ được xác định là đúng $\rightarrow$ gắn nhãn `correct`, hiển thị Bounding Box viền xanh lá.
   - Nếu từ $w_i$ nằm trong danh sách lỗi sai $\rightarrow$ gắn nhãn `error`, lưu trữ mã lỗi và hiển thị Bounding Box viền đỏ nổi bật.
4. Trả về cấu trúc JSON chứa đầy đủ tọa độ chuẩn hóa $[x_{\min}, y_{\min}, x_{\max}, y_{\max}]$ để Client (Web/Mobile) vẽ trực tiếp lên canvas bài thi.

---

#### 3.4.3. Lưu Đồ Thuật Toán Ground-Truth Guided Alignment (Zero-Hallucination)

```text
       [ Ảnh bài thi học sinh ]
                  │
                  ▼
       [ Pipeline Jimp 9 bước ]  ──► (Ảnh sạch ô ly, khử bóng, nắn thẳng)
                  │
                  ▼
       [ Xử lý Song song AI ]
       ├── Luồng 1: Gemini 3.1 Flash Lite ──► Trích xuất chuỗi từ vựng original_text
       └── Luồng 2: YOLOv8 Word Detector  ──► Bóc tách tọa độ Bounding Box & Sắp xếp đọc
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
    │ (SequenceMatcher Word Diff) │  │ các biện pháp tu từ nghệ thuật│
    └──────────────┬──────────────┘  └──────────────┬──────────────┘
                   │                                │
                   ▼                                ▼
    ┌─────────────────────────────┐  ┌─────────────────────────────┐
    │ Bộ luật Ngữ âm tiếng Việt   │  │ Qwen2.5-0.5B-Instruct SLM   │
    │ Phân loại vào 6 nhóm lỗi    │  │ sinh lời nhận xét sư phạm   │
    └──────────────┬──────────────┘  └──────────────┬──────────────┘
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
                [ Ánh xạ Lỗi ↔ Tọa độ Bounding Box ]
         (Tô viền đỏ các từ sai trên Canvas bài thi học sinh)
                                  │
                                  ▼
                [ Giao diện Human-in-the-loop ]
         (Giáo viên duyệt, tinh chỉnh thanh trượt điểm số)
                                  │
                                  ▼
                [ Lưu điểm số vào SQLite vihand.db ]
                [ Lưu tệp ảnh vào /uploads/grades/ ]
```

---

### 3.5. Bổ sung Chính Sách Bảo Vệ Dữ Liệu Trẻ Em Theo Nghị Định 13/2023/NĐ-CP (Mục 3.5 Mới)

* **Vị trí chèn trong file Word:** Tạo mục mới **3.5** chèn ngay sau phần cơ chế quản lý dữ liệu (trang 41).
* **Câu neo định vị trong Word (Anchor Text):** Tìm đoạn kết thúc mục quản trị dữ liệu hoặc phân quyền người dùng (Admin/Teacher/Student).
* **Hành động:** Chèn mục 3.5 về an toàn thông tin và bảo vệ quyền riêng tư học sinh:

#### 3.5.1. Kiến trúc Bảo vệ Quyền Riêng tư & Vòng đời Dữ liệu Học sinh (Nghị định 13/2023/NĐ-CP)
> Dữ liệu bài thi của học sinh tiểu học chứa các thông tin nhạy cảm bao gồm: họ tên, lớp học, nét chữ viết tay cá nhân và hình ảnh chân thực bài làm. Nhằm đảm bảo tuyệt đối an toàn thông tin theo Nghị định số 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân, ViHand Grade thiết lập kiến trúc quản trị vòng đời dữ liệu chuyên biệt:
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
