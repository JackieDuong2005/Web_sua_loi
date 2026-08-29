# 📚 ViHand Grade — Giới Thiệu Hệ Thống
## Tài liệu dành cho Giáo viên & Người không chuyên về Công nghệ

> **Phiên bản**: v2.1.0 | Cập nhật: 2026-08-22
> 
> 📎 *Tài liệu kỹ thuật chi tiết đầy đủ xem tại: [ViHandGrade_Combined_TechSpec_v2.1.md](./ViHandGrade_Combined_TechSpec_v2.1.md)*

---

## 🎯 ViHand Grade là gì?

**ViHand Grade** là một ứng dụng web được thiết kế riêng cho **giáo viên tiểu học**, giúp:

- ✅ **Chấm điểm bài chính tả viết tay tự động** — chỉ cần chụp ảnh bài viết, hệ thống tự phát hiện lỗi và tính điểm
- ✅ **Tổ chức buổi đọc chính tả** thông qua **máy trợ giảng tích hợp AI Xiaozhi** — có thể đọc bài và nhận lệnh điều khiển bằng giọng nói
- ✅ **Theo dõi tiến độ học sinh** theo từng bài, từng lớp, từng kỳ học

**Nói đơn giản**: Thay vì giáo viên phải ngồi đọc từng bài và sửa tay từng lỗi, ViHand Grade làm thay điều đó — nhanh hơn, chính xác hơn, và tiết kiệm rất nhiều thời gian.

---

## 👥 Ai dùng được hệ thống này?

| Vai trò | Họ làm được gì? |
|:---|:---|
| 👩‍🏫 **Giáo viên** | Chụp ảnh bài viết → xem kết quả AI chấm → điều chỉnh điểm nếu cần → lưu lại. Quản lý lớp, xem báo cáo thống kê. |
| 🧒 **Học sinh** | Tra cứu điểm số và lỗi sai của mình, đọc nhận xét của cô/thầy. |
| 🏫 **Quản trị viên** | Tạo/khóa tài khoản giáo viên và học sinh, cấu hình hệ thống. |

![Sơ đồ phân quyền người dùng RBAC](../Lưu%20đồ%20giải%20thuật/Hinh_3_4_Phan_quyen_RBAC.png)

---

## ⚡ Hệ thống hoạt động như thế nào?

Toàn bộ quá trình chấm điểm diễn ra **tự động trong dưới 30 giây** theo 4 bước:

```
📷 Giáo viên chụp ảnh bài viết
        ↓
🖼️  Bước 1 — Làm sạch ảnh
    Hệ thống tự chỉnh góc nghiêng, xóa bóng đổ,
    tăng độ rõ nét để ảnh dễ nhận diện hơn

        ↓
🔍 Bước 2 — Đọc chữ viết tay (OCR)
    AI nhận diện từng chữ trong ảnh,
    chép lại thành văn bản (giữ nguyên lỗi của học sinh)

        ↓
✏️  Bước 3 — Phát hiện lỗi & Tính điểm
    AI so sánh bài viết với đáp án chuẩn,
    tìm ra lỗi chính tả, tính điểm theo thang 10

        ↓
📊 Bước 4 — Hiển thị kết quả
    Giáo viên xem kết quả, điều chỉnh nếu cần,
    rồi lưu vào hệ thống
```

---

![Hình X.1 – Kiến trúc tổng thể hệ thống ViHand Grade](../Lưu%20đồ%20giải%20thuật/HinhX1_Kien_truc_He_thong.png)

---

## 📸 Phần 1 — Chấm Điểm Bài Chính Tả

### Cách sử dụng (dành cho Giáo viên)

1. Đăng nhập vào ứng dụng web
2. Vào mục **"Chấm điểm"**
3. Chụp ảnh bài viết tay của học sinh (hoặc tải ảnh lên)
4. Hệ thống tự động đọc chữ và phát hiện lỗi
5. Giáo viên xem lại kết quả, điều chỉnh nếu thấy cần
6. Bấm **"Lưu"** — điểm được lưu vào hệ thống

> **💡 Mẹo**: Ảnh chụp dưới ánh sáng tốt, không bị nghiêng quá 15° sẽ cho kết quả chính xác nhất. Hệ thống sẽ cảnh báo nếu ảnh quá mờ hoặc quá tối.

---

![Hình 3.1 – Hybrid AI Pipeline tổng thể (quy trình chấm bài 4 bước)](../Lưu%20đồ%20giải%20thuật/Hinh31_Hybrid_AI_Pipeline_New.png)

---

### Hệ thống tính điểm như thế nào?

Điểm được tính theo **thang 10**, chia làm 4 phần:

| Tiêu chí | Điểm tối đa | Ai tính? |
|:---|:---:|:---|
| ✍️ Chính tả & Ngữ pháp | **4.0 điểm** | AI tính tự động (trừ 0.5đ/lỗi) |
| 📋 Hình thức (nét chữ, lề vở) | **3.0 điểm** | Giáo viên nhập (mặc định 2.5đ) |
| 📝 Nội dung (chép đủ) | **2.0 điểm** | Giáo viên nhập (mặc định 1.5đ) |
| 🌟 Sáng tạo / Trình bày đẹp | **1.0 điểm** | AI tự động nhận biết |

**Xếp loại tự động:**

| Điểm | Xếp loại |
|:---:|:---|
| ≥ 9.0 | 🏆 Xuất sắc |
| 7.0 – 8.9 | 👍 Tốt |
| 5.0 – 6.9 | ✅ Khá |
| 3.0 – 4.9 | ⚠️ Trung bình |
| < 3.0 | ❗ Cần cố gắng |

![Hình 3.5 – Quy tắc Tính điểm, Xếp loại và Sinh nhận xét sư phạm](../Lưu%20đồ%20giải%20thuật/H3.5_Rulebase_Tinh_diem_Xep_loai.png)

---

### AI phân loại lỗi gì?

Hệ thống nhận biết và phân loại **6 kiểu lỗi chính tả phổ biến**:

| Loại lỗi | Ví dụ |
|:---|:---|
| Sai phụ âm đầu | *"xả"* thay vì *"sả"*, *"lẽ"* thay vì *"nẽ"* |
| Sai vần | *"hòn"* thay vì *"hồng"* |
| Sai dấu thanh | *"gạo"* viết thành *"gao"* |
| Quên viết hoa | *"hà nội"* thay vì *"Hà Nội"* |
| Bỏ sót / viết thừa từ | Thiếu một từ trong câu |
| Sai dấu câu | Thiếu dấu chấm, dấu phẩy |

---

![Hình 3.3 – Giải thuật chấm điểm và phân loại lỗi chính tả](../Lưu%20đồ%20giải%20thuật/Hinh33_Phan_loai_Loi_New.png)

---

## 🎙️ Phần 2 — Máy Trợ Giảng Đọc Chính Tả (Xiaozhi AI)

### Máy trợ giảng này là gì?

**Máy trợ giảng Xiaozhi** (AI chatbot có tên thân thiện là **"Alexa"**) là một thiết bị phần cứng đặt trong lớp học — được thiết kế như một **thiết bị trợ giảng chuyên dụng** tích hợp AI chatbot, có thể:

- 🎙️ **Đọc bài chính tả** thay giáo viên — bằng giọng nói tiếng Việt chuẩn
- 👂 **Nghe và thực hiện lệnh** từ giáo viên: "*Alexa, đọc lại câu vừa rồi*", "*đọc chậm hơn*", "*tạm dừng*"
- 📚 **Tra cứu bài SGK** — "*Alexa, đọc bài 'Ai có lỗi' SGK lớp 3*"
- 💾 **Lưu lại toàn bộ buổi học** vào hệ thống để giáo viên tra cứu sau

> **💡 Lưu ý quan trọng**: Module máy trợ giảng là **đề xuất mở rộng** (v1.3.0-draft), cần xem xét thêm trước khi triển khai thực tế — đặc biệt về lựa chọn công nghệ giọng nói tiếng Việt phù hợp.

---

### Quy trình một buổi đọc chính tả với Máy trợ giảng

```
1️⃣  CHUẨN BỊ BÀI ĐỌC
    Giáo viên chọn bài trong kho SGK hoặc tự soạn trên Web
    — HOẶC — ra lệnh thoại trực tiếp cho máy trợ giảng

2️⃣  MÁY TRỢ GIẢNG ĐỌC BÀI
    a) Đọc toàn bài 1 lần để học sinh nắm nội dung
    b) Đọc từng câu, dừng đủ thời gian để học sinh chép
       (mặc định: dừng 1.5 giây cho mỗi chữ, lặp 2 lần/câu)
    c) Trong khi đọc, máy luôn lắng nghe lệnh điều khiển
    d) Đọc lại toàn bài lần cuối để học sinh soát lỗi

3️⃣  LƯU KẾT QUẢ
    Toàn bộ nội dung đã đọc được lưu vào hệ thống
    Liên kết với bài chấm điểm của học sinh sau này
```

---

![Hình X.2 – Quy trình 3 bước của Alexa AI trong một buổi đọc chính tả](../Lưu%20đồ%20giải%20thuật/HinhX2_Alexa_3_Buoc.png)

---

### Lệnh thoại có thể dùng với Máy trợ giảng

| Giáo viên nói... | Máy trợ giảng làm gì? |
|:---|:---|
| *"Đọc lại câu vừa rồi"* | Đọc lại câu vừa xong |
| *"Đọc chậm hơn"* | Giảm tốc độ đọc |
| *"Đọc nhanh hơn"* | Tăng tốc độ đọc |
| *"Dừng lại"* / *"Tạm dừng"* | Máy dừng đọc |
| *"Tiếp tục"* | Máy đọc tiếp |
| *"Đánh vần từ..."* | Máy đọc từng chữ cái của từ đó |
| *"Tìm bài [tên bài] lớp 3"* | Máy tìm và đọc bài trong kho SGK |

> **⚠️ Lưu ý**: Nếu máy không nghe rõ lệnh do lớp ồn, giáo viên có thể dùng **nút điều khiển trực tiếp trên trang web** — đây là cách chính, lệnh thoại chỉ là hỗ trợ thêm.

---

### Tại sao dùng Máy trợ giảng giúp chấm điểm chính xác hơn?

Khi máy trợ giảng đọc bài và lưu lại nội dung, hệ thống có thể dùng **bài máy đã đọc làm "đáp án chuẩn"** để so sánh với bài viết tay của học sinh:

| | Chấm không có Máy trợ giảng | Chấm có Máy trợ giảng (đáp án chuẩn) |
|:---|:---|:---|
| **AI dựa vào đâu?** | AI tự đoán học sinh định viết gì | Lấy chính xác 100% bài máy đã đọc |
| **Có thể sai không?** | Có thể sai nếu chữ viết quá xấu | **Không bao giờ sai** đáp án |
| **Tốc độ chấm** | 5–10 giây | **Dưới 0.5 giây** |
| **Phân tích lỗi cả lớp** | Không có | ✅ Biết từ nào cả lớp hay viết sai |

---

### Phần cứng Máy trợ giảng (Linh kiện & Chi phí)

| Linh kiện | Chức năng | Chi phí ước tính |
|:---|:---|:---:|
| Bo mạch ESP32-S3 | Bộ xử lý trung tâm của máy trợ giảng | 110.000 đ |
| Microphone INMP441 | Thu âm lệnh của giáo viên | 25.000 đ |
| Mạch khuếch đại MAX98357A | Giải mã và phát âm thanh | 35.000 đ |
| Loa 3W (40mm) | Phát giọng đọc cho cả lớp nghe | 20.000 đ |
| Màn hình ST7789 1.3" | Hiển thị trạng thái thiết bị | 55.000 đ |
| Đèn LED RGB + Nút bấm | Báo trạng thái trực quan | 10.000 đ |
| Vỏ in 3D + phụ kiện | Khung thiết bị hoàn chỉnh | 60.000 đ |
| **Tổng cộng** | | **~315.000 đ/máy** |

**Máy trợ giảng có thể chạy bằng nguồn USB** hoặc tích hợp pin sạc Li-ion để dùng không dây **3–4 giờ** liên tục.

**Đèn LED báo trạng thái:**
- 🔵 Xanh dương nhấp nháy = Đang lắng nghe lệnh
- 🟢 Xanh lá = Đang đọc bài
- 🟡 Vàng = Đang tạm dừng
- 🔴 Đỏ = Lỗi kết nối mạng

---

## 💻 Phần 3 — Công Nghệ Sử Dụng (Giải Thích Đơn Giản)

Dưới đây là các công nghệ chính của hệ thống, giải thích bằng ngôn ngữ thông thường:

### Giao diện Web (những gì giáo viên nhìn thấy)
- **Next.js + React**: Khung nền để xây dựng trang web — tương tự như "bộ khung nhà" cho ứng dụng
- **Shadcn/ui + Tailwind CSS**: Thiết kế giao diện đẹp, hiện đại, tối/sáng tùy chỉnh được
- **Biểu đồ thống kê (Recharts)**: Vẽ đồ thị điểm số học sinh theo thời gian

### Trí tuệ nhân tạo (AI)
- **Google Gemini**: AI của Google — dùng để "đọc" và nhận diện chữ viết tay trong ảnh
- **ViT5**: Mô hình AI tiếng Việt chạy ngay trên máy tính của trường (không cần internet cho phần này) — dùng để phát hiện và sửa lỗi chính tả
- Hai AI này phối hợp với nhau: Gemini đọc chữ, ViT5 tìm lỗi

### Lưu trữ dữ liệu
- **SQLite**: Cơ sở dữ liệu lưu tất cả điểm số, tài khoản, lịch sử — giống như một "tủ hồ sơ điện tử" gọn nhẹ, dùng được cả khi không có mạng ổn định (file ~16MB)

![Sơ đồ tổng quan công nghệ sử dụng trong hệ thống](../Lưu%20đồ%20giải%20thuật/Hinh_4_1_Tech_Stack.png)

---

## 📊 Phần 4 — Cơ Sở Dữ Liệu (Dữ Liệu Được Lưu Gì?)

Hệ thống lưu **5 nhóm dữ liệu chính**:

| Nhóm | Lưu gì? | Ví dụ |
|:---|:---|:---|
| 👤 **Tài khoản** | Thông tin người dùng | Tên, tên đăng nhập, vai trò (GV/HS/Admin) |
| 🏫 **Lớp học** | Danh sách lớp | "3A1", "4B2", khối lớp 1-5 |
| 📝 **Kết quả chấm** | Điểm từng bài | Điểm số, lỗi sai, ảnh bài viết, nhận xét |
| 🎙️ **Phiên đọc chính tả** | Lịch sử buổi đọc với máy trợ giảng | Tên bài, lớp, nội dung đã đọc |
| 💬 **Nhật ký hội thoại** | Từng lượt trao đổi | Máy đọc gì, GV yêu cầu gì |

*(Dành cho module Máy trợ giảng mở rộng, thêm: thông tin thiết bị, kho bài đọc SGK, log chi tiết theo từng câu)*

![Hình X.4 – Sơ đồ liên kết cơ sở dữ liệu SQLite](../Lưu%20đồ%20giải%20thuật/HinhX4_Database_Schema_New.png)

---

## 🔗 Phần 5 — Các Tính Năng Chính Theo Vai Trò

### 🖥️ Màn hình Giáo viên (`/teacher`)

| Tính năng | Mô tả |
|:---|:---|
| **Chấm điểm** | Chụp/upload ảnh → xem kết quả AI → lưu điểm |
| **Quản lý lớp** | Danh sách học sinh, lớp học |
| **Lịch sử chấm** | Xem lại điểm số theo học sinh, theo ngày |
| **Báo cáo thống kê** | Biểu đồ điểm trung bình, xu hướng học tập |
| **Quản lý phiên đọc** | Xem lại lịch sử máy trợ giảng đọc chính tả |

### 📱 Màn hình Học sinh (`/student`)

| Tính năng | Mô tả |
|:---|:---|
| **Điểm số của tôi** | Xem lịch sử điểm từng bài |
| **Lỗi sai hay mắc** | Xem danh sách lỗi đã mắc phải |
| **Nhận xét** | Đọc phản hồi của giáo viên |

---

## 🚀 Phần 6 — Hệ Thống Được Triển Khai Như Thế Nào?

Toàn bộ hệ thống ViHand Grade được triển khai và chạy **liên tục 24/7** trên một chiếc **Raspberry Pi 4** đặt tại trường hoặc nhà giáo viên.

> **🌱 Raspberry Pi 4 là gì?** Là một máy tính nhỏ bằng bàn tay, giá khoảng **1.5 – 2 triệu đồng**, chạy điện rất tiết kiệm (chỉ 5W – tương đương một bóng đèn ngủ), hoạt động ổn định suốt ngày đêm mà không cần nhân viên IT giám sát.

![Thiết bị máy chủ Raspberry Pi 4 Model B đặt thực tế tại lớp học](../Slide%20thuy%E1%BA%BFt%20tr%C3%ACnh/SLide/23.png)

```
🏠 Raspberry Pi 4 (chạy 24/7 tại trường)
         ├── 🌐 Website chấm điểm  →  vihandgrade.click
         ├── 🧠 AI Tiếng Việt (ViT5)  (chạy nội bộ, không cần internet)
         └── 🎙️ Server Máy Trợ Giảng (Xiaozhi MCP)
```

**Giáo viên chỉ cần:**
- Mở trình duyệt bất kỳ trên điện thoại hoặc máy tính
- Truy cập **[vihandgrade.click](https://vihandgrade.click)** → đăng nhập → bắt đầu chấm bài

Không cần cài đặt gì thêm, không cần bật máy tính riêng — **Raspberry Pi chạy nền tảng, giáo viên vào web là dùng được ngay.**

| Cấu phần | Mô tả đơn giản |
|:---|:---|
| 🌐 **Trang web chấm điểm** | Giao diện giáo viên dùng hàng ngày, truy cập qua vihandgrade.click |
| 🧠 **AI nhận diện chữ** | Phần mềm chạy nội bộ trên Raspberry Pi, tự phát hiện lỗi chính tả |
| 🎙️ **Server máy trợ giảng** | Chương trình nhận lệnh từ máy Xiaozhi và lưu phiên đọc chính tả |

> **💡 Lợi ích của Raspberry Pi**: Chi phí điện ~40.000đ/tháng, nhỏ gọn để góc phòng học, tự khởi động lại khi mất điện, không cần màn hình hay bàn phím riêng.

![Sơ đồ kết nối Raspberry Pi 4 – Cloudflare Tunnel (vihandgrade.click)](../Lưu%20đồ%20giải%20thuật/vihand_cloudflare_tunnel.png)

---

## 🔒 Phần 7 — Bảo Mật & Quyền Riêng Tư

- **Dữ liệu học sinh được bảo mật**: Chỉ giáo viên chủ nhiệm và admin mới xem được điểm số và bài làm của lớp mình
- **Không lưu âm thanh giọng nói**: Hệ thống mặc định chỉ lưu **văn bản** (nội dung đã nói), không lưu file âm thanh gốc của học sinh
- **Ngoại lệ**: Giáo viên có thể bật tùy chọn lưu âm thanh nếu có mục đích sư phạm cụ thể — nhưng cần thông báo tới phụ huynh theo quy định bảo vệ dữ liệu trẻ em
- **Xác thực thiết bị**: Mỗi máy trợ giảng có mã định danh riêng (hiển thị dạng QR khi bật máy lần đầu), tránh thiết bị lạ kết nối vào lớp học

---

*Tài liệu này được biên soạn để giúp giáo viên và lãnh đạo nhà trường hiểu rõ hệ thống ViHand Grade mà không cần kiến thức chuyên sâu về công nghệ. Cập nhật lần cuối: 2026-08-22.*
