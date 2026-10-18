# 📘 NỘI DUNG BỔ SUNG & CHỈNH SỬA CHO CHƯƠNG 4
## CHƯƠNG 4 — XÂY DỰNG ỨNG DỤNG

> **Hướng dẫn tác giả sử dụng tài liệu:**
> Mở file `Báo cáo tổng eureka - Thiết bị chấm điểm.docx`, tìm đến Chương 4 để cập nhật: Giao diện Tab Đọc chính tả Web (`/teacher/dictation`), Giao diện Chấm bài Canvas Bounding Box (`/teacher/grade`), Giao diện Ứng dụng Di động Android Native (`android_app/`), Cập nhật Lược đồ Cơ sở dữ liệu Prisma 6 bảng, Bảng danh mục API Endpoints đầy đủ và Quy trình vận hành khởi chạy tự động.

---

### 4.0. Cập nhật Mục 4.1.2: Các Bước Triển Khai Trong Quy Trình Phát Triển Hệ Thống (Thuyết minh Hình 4.1)

* **Vị trí chèn trong file Word:** Thay thế toàn bộ đoạn văn bản mô tả các giai đoạn phát triển trong **Mục 4.1.2** (trang 43–44, ngay sau **Hình 4.1: Sơ đồ quy trình phát triển hệ thống**).
* **Câu neo định vị trong Word (Anchor Text):** Bắt đầu từ câu: *"Hiện thực hóa và kiểm thử độc lập đường ống tiền xử lý ảnh 9 bước..."* đến hết câu: *"...tiến hành đánh giá thực nghiệm bằng các bài chính tả thực tế của học sinh."*
* **Hành động:** Thay thế bằng đoạn văn thuyết minh kỹ thuật chuẩn xác theo đúng luồng kiến trúc hiện tại của hệ sinh thái ViHand Grade dưới đây:

> **Nội dung văn bản thay thế hoàn chỉnh cho Mục 4.1.2:**
> 
> Dựa trên sơ đồ quy trình tại Hình 4.1, hệ thống ViHand Grade được nghiên cứu, phát triển và thử nghiệm qua các giai đoạn kỹ thuật liên hoàn:
> 
> 1. **Giai đoạn Tiền xử lý ảnh chuyên dụng cho bài thi tiểu học:**  
>    Hiện thực hóa và kiểm thử độc lập đường ống tiền xử lý ảnh 9 bước bằng thư viện Jimp chạy trực tiếp trên Node.js backend. Quy trình bao gồm các thuật toán: nắn thẳng góc nghiêng trang vở (Deskew), cân bằng trắng Gray World, khử bóng đổ bàn tay qua màng lọc tích phân O(1), tăng tương phản nét chì mờ bằng CLAHE, làm sắc nét nét thanh nét đậm (Unsharp Masking), đánh giá độ nét quang học (Laplacian Variance) và nhị phân hóa thích ứng Gaussian để xóa sạch 100% đường kẻ ô ly, đảm bảo ảnh đầu ra đạt độ tương phản tối ưu cho khâu nhận dạng ký tự.
> 
> 2. **Giai đoạn Nhận dạng ký tự (OCR) & Bóc tách vị trí từ vựng (Word Detection):**  
>    Thiết kế luồng xử lý song song kết hợp giữa mô hình thị giác ngôn ngữ thế hệ mới và mô hình thị giác máy tính cục bộ:  
>    - Sử dụng mô hình **Google Gemini 3.1 Flash Lite** thông qua kỹ thuật Prompt Engineering nghiêm ngặt với định dạng đầu ra có cấu trúc (Structured Output), đảm bảo trích xuất chính xác chuỗi văn bản nguyên văn `original_text` và bảo lưu nguyên vẹn 100% các lỗi sai chính tả của học sinh mà không tự động sửa lỗi.  
>    - Đồng thời kích hoạt mô hình **YOLOv8** trên Python microservice (`:8000/detect-words`) nhằm bóc tách tọa độ hộp bao (Bounding Box) của từng từ viết tay và tự động sắp xếp theo thứ tự dòng đọc tự nhiên của trang vở, phục vụ cho việc ánh xạ trực quan vị trí lỗi sai trên ảnh bài thi.
> 
> 3. **Giai đoạn AI Chấm điểm đa tầng & Bóc tách lỗi ngữ âm tiếng Việt:**  
>    Xây dựng phân hệ chấm điểm thông minh phân tách rạch ròi theo hai luồng nghiệp vụ sư phạm của môn Tiếng Việt tiểu học:  
>    - *Đối với bài thi Chính tả (Nghe - Viết / Nhìn - Chép):* Áp dụng thuật toán đối soát chuỗi tất định `SequenceMatcher` (LCS Diff) trực tiếp với văn bản chuẩn SGK (Ground Truth) từ phiên đọc của giáo viên, kết hợp giải thuật bóc tách 5 thành phần ngữ âm âm tiết tiếng Việt (âm đầu, âm đệm, âm chính, âm cuối, dấu thanh) để phân loại chính xác 6 nhóm lỗi âm vị học mà không để xảy ra hiện tượng AI bịa lỗi (Zero-Hallucination 100%).  
>    - *Đối với bài thi Tập làm văn (Viết đoạn văn tự do):* Áp dụng kiến trúc Hybrid AI hai tầng: Tầng 1 sử dụng mô hình **ViT5** được lượng tử hóa động **Dynamic INT8 Quantization** chạy cục bộ trên FastAPI service để sửa lỗi ngữ cảnh và kiểm tra ngữ pháp, kết hợp bộ luật phát hiện từ láy và biện pháp tu từ nghệ thuật (so sánh, nhân hóa); Tầng 2 tích hợp mô hình ngôn ngữ nhỏ **Qwen2.5-0.5B-Instruct SLM** chạy offline trên CPU để tự động sinh lời nhận xét sư phạm nhân văn và gợi ý sửa bài cho học sinh. Toàn bộ các từ viết sai được ánh xạ 1-1 với tọa độ hộp bao YOLOv8 để hiển thị viền đỏ trực quan trên giao diện Canvas theo cơ chế Human-in-the-loop.
> 
> 4. **Giai đoạn Thiết kế giao diện đa nền tảng & Đa tác nhân (Web & Mobile):**  
>    Xây dựng hệ sinh thái giao diện trực quan hỗ trợ 3 nhóm tác nhân (Quản trị viên, Giáo viên và Học sinh) với hai nền tảng tương tác hoàn chỉnh:  
>    - *Nền tảng Web (Next.js):* Cung cấp phân hệ **Phòng đọc chính tả ảo (`/teacher/dictation`)** tích hợp công nghệ giọng đọc tiếng Việt TTS thông minh (tùy chỉnh tốc độ đọc -15%, ngắt nhịp đếm ngược 1.5 giây/từ, lặp lại câu 2–3 lần) và nút luân chuyển dữ liệu bài đọc 1-click; phân hệ **Chấm bài Canvas tương tác (`/teacher/grade`)** cho phép giáo viên kéo thanh trượt tinh chỉnh điểm số; cùng phân hệ **Sổ điểm điện tử & Thống kê phổ điểm (`/teacher/reports`)** trực quan hóa bản đồ lỗi ngữ âm của lớp học.  
>    - *Nền tảng Di động (Android Native App):* Phát triển ứng dụng Android thuần bằng **Jetpack Compose** và **CameraX** hỗ trợ giáo viên chụp ảnh bài thi thực địa với khung hướng dẫn 4 góc trang vở, tự động lấy nét và hiển thị lớp phủ Bounding Box lỗi sai tương tác chạm trực tiếp trên màn hình điện thoại qua cổng Mobile BFF Gateway (`/api/mobile/grade`).  
>    - *Cơ chế quản trị & Bảo vệ dữ liệu:* Xây dựng bảng điều khiển quản trị (`/admin`) tích hợp chính sách tự động xóa tệp ảnh bài thi và ẩn danh hóa dữ liệu học sinh sau 365 ngày nhằm tuân thủ nghiêm ngặt **Nghị định 13/2023/NĐ-CP**.
> 
> 5. **Giai đoạn Đóng gói, Triển khai trạm biên & Thực nghiệm thực tế:**  
>    Đóng gói toàn bộ hệ thống để sẵn sàng vận hành trên các thiết bị điện toán biên tại trường học:  
>    - Tối ưu hóa cài đặt và thực thi trên phần cứng nhúng **Raspberry Pi 4 / NVIDIA Jetson Nano** và máy tính trường học thông qua tệp khởi chạy một chạm **`start_all.bat`** (hoặc kịch bản Docker Container), cho phép khởi động đồng thời cả Web Next.js và Python AI Microservice chỉ trong 10–15 giây.  
>    - Thiết lập đường truyền bảo mật an toàn từ xa qua **Cloudflare Tunnel** (mã hóa SSL/TLS đầu-cuối, không yêu cầu mở cổng NAT/firewall mạng trường).  
>    - Tiến hành thực nghiệm thực tế với tập dữ liệu hàng trăm bài thi viết tay của học sinh tiểu học tại các trường phổ thông đối tác, đánh giá toàn diện độ chính xác nhận dạng, độ trễ xử lý và tính ổn định của hệ thống trong điều kiện lớp học thực tế.
> 
---

### 4.0b. Cập nhật Mục 4.1.3: Cách Hoạt Động Của Hệ Thống (Luồng Nghiệp Vụ 5 Bước Phía Giáo Viên)

* **Vị trí chèn trong file Word:** Thay thế toàn bộ nội dung trong **Mục 4.1.3: Cách hoạt động của hệ thống** (trang 44–45).
* **Câu neo định vị trong Word (Anchor Text):** Bắt đầu từ câu: *"Người dùng truy cập vào hệ thống qua giao diện Web. Phía giáo viên, luồng chính gồm 5 bước..."* đến hết câu: *"...Chỉ sau bước này, dữ liệu mới được ghi vào cơ sở dữ liệu."*
* **Hành động:** Thay thế bằng nội dung mô tả luồng xử lý 5 bước hiện đại, chính xác theo kiến trúc thực tế của hệ sinh thái ViHand Grade dưới đây:

> **Nội dung văn bản thay thế hoàn chỉnh cho Mục 4.1.3:**
> 
> Người dùng truy cập vào hệ thống thông qua giao diện Web (hoặc Ứng dụng di động Android). Đối với giáo viên, quy trình chấm bài và đánh giá bài làm của học sinh diễn ra tự động qua 5 bước liên hoàn:
> 
> 1. **Bước 1: Tiếp nhận và làm sạch ảnh bài viết (Tiền xử lý 9 bước):**  
>    Giáo viên chụp ảnh bài làm bằng điện thoại hoặc tải ảnh lên hệ thống. Ngay lập tức, hệ thống tự động xử lý ảnh qua 9 bước: tự xoay đúng chiều, nắn thẳng trang vở bị đặt nghiêng, xóa bóng mờ bàn tay, tăng độ đậm cho nét bút chì và xóa sạch hoàn toàn các đường kẻ ô ly. Kết quả thu được là trang giấy trắng tinh với nét chữ đen nổi bật, giúp máy đọc chữ chính xác nhất.
> 
> 2. **Bước 2: Đọc chữ viết tay và xác định vị trí từng từ (Gemini OCR & YOLOv8):**  
>    Ảnh sau khi làm sạch được gửi đồng thời cho hai công nghệ AI:  
>    - Mô hình **Gemini 3.1 Flash Lite** làm nhiệm vụ "đọc chữ": nhận dạng chính xác từng câu chữ học sinh viết tay, phân loại bài thơ hay bài văn xuôi và giữ nguyên vẹn các lỗi sai của học sinh để chấm điểm chứ không tự ý sửa.  
>    - Mô hình **YOLOv8** làm nhiệm vụ "định vị": tự động quét trang vở, tìm chính xác vị trí của từng từ viết tay theo thứ tự từ trên xuống dưới, từ trái sang phải để chuẩn bị cho việc khoanh vùng lỗi sai trên ảnh.
> 
> 3. **Bước 3: So khớp bài mẫu và phân loại lỗi sai (Chính tả vs Tập làm văn):**  
>    Hệ thống tự động kiểm tra bài làm thuộc dạng bài nào để áp dụng cách chấm phù hợp:  
>    - *Đối với bài Chính tả (có sẵn bài mẫu từ SGK hoặc bài đọc của giáo viên):* Hệ thống so sánh trực tiếp từng từ của học sinh với bài mẫu có sẵn trong cơ sở dữ liệu. Nhờ có bài chuẩn đối chiếu 1-1, AI không bao giờ bịa lỗi oan cho học sinh. Từng lỗi sai được chỉ rõ thuộc nhóm nào (sai phụ âm đầu, sai vần, sai dấu thanh, quên viết hoa...). Bài thi được chấm theo thang 10 điểm (Chính tả tối đa 7.0đ - trừ 0.5đ cho mỗi lỗi khác nhau; Trình bày sạch đẹp tối đa 3.0đ).  
>    - *Đối với bài Tập làm văn (học sinh tự do viết đoạn văn, không có bài mẫu):* Hệ thống sử dụng mô hình ViT5 chạy trực tiếp trên máy chủ để phát hiện lỗi chính tả, lỗi dùng từ và câu văn chưa đủ ý. Bài được chấm theo barem 4 tiêu chí chuẩn của Bộ GD&ĐT: Chính tả (4.0đ), Hình thức trình bày (3.0đ), Nội dung ý tưởng (2.0đ) và Sáng tạo (1.0đ - tự động cộng điểm khi bài có từ láy, câu so sánh hoặc nhân hóa).
> 
> 4. **Bước 4: Tự động viết nhận xét và khoanh đỏ lỗi sai trên bài (Giáo viên kiểm duyệt):**  
>    - Hệ thống kích hoạt mô hình ngôn ngữ nhỏ **Qwen 2.5** để tạo lời nhận xét mang tính động viên, ấm áp như lời phê của giáo viên, đồng thời gợi ý cách sửa bài cho học sinh.  
>    - Trên màn hình máy tính, toàn bộ bài làm của học sinh được hiển thị trực quan: các từ viết đúng có viền màu xanh lá, các từ viết sai được khoanh khung màu đỏ nổi bật.  
>    - Giáo viên có thể bấm vào từng khung đỏ để xem giải thích, kéo thanh trượt điều chỉnh điểm hoặc sửa lại lời nhận xét theo ý mình trước khi lưu.
> 
> 5. **Bước 5: Xếp loại và lưu kết quả vào sổ điểm:**  
>    Hệ thống tự động xếp loại học sinh theo Thông tư 27 (Xuất sắc, Tốt, Khá, Trung bình, Cần cố gắng). Khi giáo viên nhấn *"Xác nhận lưu vào Sổ điểm"*, toàn bộ điểm số, danh sách từ sai và lời nhận xét sẽ được ghi lại vào hệ thống quản lý lớp học. Ảnh bài thi được lưu trữ an toàn và tự động dọn dẹp sau một năm học để bảo vệ quyền riêng tư cho học sinh.
> 
---

### 4.1. Bổ sung Các Giao Diện Người Dùng Trọng Yếu Của Hệ Thống (Mục 4.1.6, 4.1.7, 4.1.8 Mới)

* **Vị trí chèn trong file Word:** Tạo các mục mới **4.1.6**, **4.1.7**, **4.1.8** chèn ngay sau **Mục 4.1.5: Mặt hạn chế của hệ thống** (trang 46).
* **Câu neo định vị trong Word (Anchor Text):** Tìm câu kết thúc mục 4.1.5 (ngay trước khi bước sang `4.2. Công nghệ sử dụng`).
* **Hành động:** Chèn 3 tiểu mục mô tả giao diện người dùng thực tế dưới đây:

#### 4.1.6. Giao diện Phân hệ Đọc Chính Tả Trực Tiếp Trên Web (`/teacher/dictation`)
Trang web được thiết kế chuyên biệt để biến chiếc máy tính của giáo viên kết nối với loa lớp học thành một người trợ giảng ảo đọc chính tả hoàn hảo:
1. **Bộ chọn Ngữ liệu SGK Chuẩn hóa**:
   - Giáo viên chọn nhanh Khối lớp (Lớp 1 đến Lớp 5), Bộ sách giáo khoa (*Kết Nối Tri Thức*, *Cánh Diều*, *Chân Trời Sáng Tạo*) và Tuần học.
   - Hệ thống tự động nạp đoạn văn chuẩn từ bảng `TextbookPassage`. Giáo viên cũng có thể tự soạn thảo hoặc tùy chỉnh bài đọc theo tiến độ lớp.
2. **Bảng Luyện viết "Từ Khó Dễ Sai"**:
   - Tự động trích xuất các từ vựng phức tạp có phụ âm đầu hoặc vần khó (VD: *khuỷu tay, ngoằn ngoèo, san sẻ...*) để giáo viên hướng dẫn học sinh luyện viết trước trên bảng con.
3. **Bộ Điều khiển Nhịp Đọc Sư Phạm (Pedagogical Dictation Controller)**:
   - *Tốc độ đọc (Speech Rate)*: Mặc định `-15%` giúp phát âm rõ ràng từng thanh điệu.
   - *Số lượt lặp lại (Repeat Count)*: Tùy chỉnh đọc lặp 2 đến 3 lượt cho từng cụm từ/câu ngắn.
   - *Đếm ngược thời gian ngắt nghỉ (Pause Countdown)*: Tự động chèn khoảng lặng **1.5 giây cho mỗi từ** (VD: câu 6 từ sẽ có khoảng dừng 9 giây) kèm đồng hồ đếm ngược trực quan để học sinh cả lớp kịp viết xong trước khi đọc câu tiếp theo.
4. **Nút bấm Luân chuyển Dữ liệu 1-Click ("Chuyển sang Chấm bài")**:
   - Khi kết thúc bài đọc, giáo viên bấm nút chuyển tiếp sang giao diện chấm bài: hệ thống tự động lưu phiên vào bảng `DictationSession` và mang theo `sessionId` cùng nội dung bài đọc chuẩn làm **Ground Truth** cho module chấm điểm mà không cần phải nhập lại.

#### 4.1.7. Giao diện Tab Chấm Điểm Đa Phân Môn & Canvas Bounding Box (`/teacher/grade`)
Giao diện chấm bài hỗ trợ tính năng **Human-in-the-loop (Con người giữ vai trò chủ đạo)**:
1. **Bộ Chuyển Đổi Chế Độ (Mode Toggle)**:
   - Nút gạt linh hoạt giữa hai phân môn: **"Chính tả SGK (Ground Truth)"** và **"Tập làm văn tự do (Two-Tier SLM)"**.
2. **Khung Tải Ảnh & Tiền Xử Lý Trực Quan**:
   - Cho phép giáo viên chụp ảnh trực tiếp bằng Camera hoặc kéo thả ảnh chụp bài viết.
   - Hiển thị song song hai khung hình: Ảnh gốc của học sinh và Ảnh đã xử lý sạch ô ly qua bộ lọc Jimp 9 bước.
3. **Canvas Hiển Thị Hộp Bao Lỗi Sai (YOLOv8 Bounding Box Canvas)**:
   - Đoạn văn của học sinh được hiển thị trực tiếp trên nền ảnh gốc. Mỗi từ được bao quanh bởi một khung Bounding Box: màu xanh lá (viết đúng) và màu đỏ rực rỡ (viết sai).
   - Bấm vào từng khung đỏ sẽ mở thẻ giải thích chi tiết: *Từ học sinh viết*, *Từ đúng gợi ý*, *Phân loại nhóm lỗi* và *Lời nhắc nhở thân thiện*.
4. **Thanh Trượt Tinh Chỉnh Điểm (Slider Score Adjuster)**:
   - AI đưa ra điểm số gợi ý ban đầu. Giáo viên có toàn quyền dùng thanh trượt kéo điều chỉnh điểm thành phần (Hình thức, Nội dung, Sáng tạo) theo cảm nhận sư phạm thực tế trước khi bấm nút **"Xác nhận & Lưu vào Sổ điểm"**.

#### 4.1.8. Giao diện Ứng Dụng Di Động Android Native (`android_app/`)
Dành cho giáo viên và học sinh thao tác chấm bài thực địa ngay trên điện thoại thông minh:
1. **Màn hình Chụp bài với Jetpack CameraX**:
   - Giao diện kính ngắm có lưới hướng dẫn 4 góc trang vở, tự động lấy nét (Continuous Auto Focus) và khóa chống rung.
   - Hỗ trợ chụp bài liên tục và gửi qua cổng Mobile BFF Gateway (`/api/mobile/grade`).
2. **Màn hình Báo cáo Điểm & Lớp Phủ Bounding Box Di Động**:
   - Tận dụng Jetpack Compose vẽ lớp phủ Bounding Box trực tiếp trên ảnh bài làm ngay trên màn hình cảm ứng điện thoại.
   - Người dùng chạm vào từng từ sai để xem giải thích chi tiết nhóm lỗi và gợi ý cách khắc phục.
3. **Kiến trúc Server-Only Storage trên Thiết bị Di động**:
   - Ứng dụng không duy trì database SQLite cục bộ trên điện thoại, loại bỏ nguy cơ làm đầy bộ nhớ máy. Toàn bộ lịch sử điểm số được đồng bộ trực tiếp từ server trường học về thiết bị theo thời gian thực.

---

### 4.2. Cập nhật Lược Đồ Cơ Sở Dữ Liệu Prisma ORM & Danh Sách API Endpoints (Mục 4.2.1 & 4.2.3)

#### A. Cập nhật Mục 4.2.1: Cơ Sở Dữ Liệu Prisma ORM 5 / SQLite (6 Bảng Chuẩn)
* **Vị trí chèn trong file Word:** Thay thế toàn bộ nội dung **Mục 4.2.1: Database của hệ thống** (trang 46–47).
* **Câu neo định vị trong Word (Anchor Text):** Bôi đen từ đầu tiêu đề `4.2.1. Database của hệ thống` đến trước `4.2.2. Front-end của hệ thống`.
* **Hành động:** Thay thế bằng lược đồ CSDL chi tiết 6 thực thể quan hệ chuẩn hóa trong `prisma/schema.prisma`:

```prisma
// 1. Quản lý Tài khoản & Phân quyền 3 cấp (Admin / Teacher / Student)
model User {
  id        String   @id @default(cuid())
  name      String
  username  String   @unique
  password  String   @default("123456")
  role      String   @default("student") // "admin" | "teacher" | "student"
  className String   @default("")
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  classes   Class[]  @relation("TeacherClasses")
}

// 2. Quản lý Lớp học & Phân công Giáo viên chủ nhiệm
model Class {
  id        String   @id @default(cuid())
  name      String   @unique             // Tên lớp: "3A", "4B"
  grade     Int      @default(3)         // Khối lớp: 1, 2, 3, 4, 5
  teacherId String?
  teacher   User?    @relation("TeacherClasses", fields: [teacherId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())
}

// 3. Quản lý Kết quả Chấm bài & Vòng đời Dữ liệu Học sinh
model Grade {
  id                 String    @id @default(cuid())
  gradingMode        String    @default("dictation") // "dictation" | "essay"
  studentName        String
  assignmentTitle    String
  className          String    @default("")
  originalText       String    // Văn bản thô OCR nhận diện từ ảnh
  fixedText          String    // Văn bản đã sửa lỗi hoàn chỉnh
  corrections        String    // JSON danh sách các lỗi sai bóc tách
  score              String    // Điểm số hiển thị (VD: "8.5/10")
  scoreNum           Float     // Điểm số định lượng phục vụ vẽ biểu đồ (8.5)
  scoreBreakdown     String    // JSON chi tiết điểm từng tiêu chí
  feedback           String    // Lời nhận xét ngắn
  pedagogicalComment String    @default("") // Lời phê sư phạm toàn diện từ Qwen SLM
  overallRating      String    // Xếp loại: "Xuất sắc" | "Tốt" | "Khá" | "Trung bình" | "Cần cố gắng"
  processingTimeMs   Int       @default(0)  // Thời gian xử lý toàn trình (ms)
  tokenCount         Int       @default(0)
  imagePath          String    @default("") // Đường dẫn tệp ảnh đĩa (VD: /uploads/grades/xyz.jpg)
  dictationSessionId String    @default("") // Khóa ngoại liên kết với phiên đọc chính tả mẫu
  expiresAt          DateTime? // Ngày hết hạn lưu trữ (mặc định createdAt + 365 ngày)
  isAnonymized       Boolean   @default(false) // Đã ẩn danh hóa theo Nghị định 13 hay chưa
  anonymizedAt       DateTime? // Thời điểm ẩn danh hóa
  createdAt          DateTime  @default(now())
}

// 4. Kho Ngữ liệu Bài đọc Sách Giáo Khoa Tiếng Việt Tiểu học
model TextbookPassage {
  id             String   @id @default(cuid())
  gradeLevel     Int      @default(3)          // Khối lớp: 1 | 2 | 3 | 4 | 5
  bookSet        String   @default("KetNoi")   // "KetNoi" | "CanhDieu" | "ChanTroi"
  unit           String   @default("Tuần 1")   // Tuần/Bài học
  title          String                         // Tên bài đọc (VD: "Ai có lỗi")
  content        String                         // Văn bản bài đọc chuẩn (Ground Truth)
  difficultWords String   @default("")          // Danh sách từ khó luyện viết trước
  createdAt      DateTime @default(now())
}

// 5. Quản lý Phiên Đọc Chính Tả Của Giáo Viên (Single Source of Truth)
model DictationSession {
  id          String         @id @default(cuid())
  title       String                        // Tiêu đề bài đọc
  passage     String                        // Văn bản đọc chuẩn làm Ground Truth đối soát
  className   String         @default("")
  teacherName String         @default("")
  status      String         @default("completed") // "completed" | "in_progress"
  createdAt   DateTime       @default(now())
  logs        DictationLog[]
}

// 6. Nhật ký Hội thoại & Lệnh Điều Khiển Trong Phiên Đọc
model DictationLog {
  id        String           @id @default(cuid())
  sessionId String
  session   DictationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  speaker   String           // "teacher" | "assistant"
  content   String           // Nội dung câu đọc hoặc lệnh điều khiển nhịp
  createdAt DateTime         @default(now())
}
```

---

#### B. Cập nhật Mục 4.2.3: Bổ sung Bảng Kê Toàn Bộ API Endpoints
* **Vị trí chèn trong file Word:** Chèn vào cuối **Mục 4.2.3: Back-end của hệ thống** (trang 48–50).
* **Câu neo định vị trong Word (Anchor Text):** Tìm đoạn văn mô tả các API Routes của Next.js và FastAPI.
* **Hành động:** Bổ sung Bảng kê danh mục toàn bộ các cổng giao tiếp API của hệ sinh thái:

| Nhóm Dịch Vụ | Endpoint | Phương Thức | Chức Năng Kỹ Thuật Chi Tiết |
|---|---|:---:|---|
| **Mobile Gateway** | `/api/mobile/grade` | `POST` | Mobile BFF Gateway: Nhận ảnh từ Android App, chạy Jimp tiền xử lý, gọi Gemini OCR + YOLOv8 Bounding Box, so khớp Levenshtein, lưu kết quả server-only và trả về JSON tọa độ. |
| **Chấm bài Web** | `/api/grade` | `POST` | Điều phối chấm bài trên Web: Chuyển đổi giữa 2 chế độ (So khớp Ground Truth bài chính tả hoặc phân tích 2 tầng ViT5 + Qwen2.5 SLM cho bài tập làm văn). |
| **Tiền xử lý ảnh** | `/api/preprocess` | `POST` | Nhận ảnh Base64, thực thi 9 bước Jimp (Deskew, khử bóng, CLAHE, lọc ô ly), trả về ảnh sạch và báo cáo chất lượng (`QualityReport`). |
| **Nhận diện chữ** | `/api/ocr` | `POST` | Gửi ảnh sang Google Gemini 3.1 Flash Lite VLM để trích xuất văn bản thô `original_text` bảo lưu nguyên vẹn 100% lỗi sai. |
| **Quản lý điểm số** | `/api/grades` | `GET`, `POST` | Truy vấn danh sách điểm thi theo lớp; lưu bản ghi vào CSDL SQLite và ghi file ảnh vật lý ra thư mục `/uploads/grades/`. |
| **Kho ngữ liệu SGK**| `/api/dictation/passages` | `GET`, `POST` | Truy xuất kho bài đọc SGK Lớp 1–5 theo bộ sách và tuần học; thêm mới bài đọc tùy chỉnh. |
| **Phiên đọc chính tả**| `/api/dictation/sessions`| `GET`, `POST` | Khởi tạo, cập nhật và lưu vết phiên đọc chính tả của giáo viên làm Ground Truth đối soát. |
| **Phát âm thanh TTS** | `/api/dictation/tts` | `GET` | Proxy gọi sang Python service để stream âm thanh bài đọc MP3 chất lượng cao bằng Edge-TTS. |
| **Quản trị lưu trữ** | `/api/admin/retention` | `GET`, `POST` | Báo cáo dung lượng đĩa cứng; kích hoạt quy trình Soft Purge ẩn danh hóa bài thi quá 365 ngày (Nghị định 13). |
| **Python AI Core** | `:8000/detect-words` | `POST` | Kích hoạt mô hình YOLOv8 bóc tách tọa độ hộp bao Bounding Box của từng từ viết tay và sắp xếp theo thứ tự đọc tự nhiên. |
| **Python AI Core** | `:8000/grade` | `POST` | Chạy mô hình ViT5 INT8 sửa lỗi chính tả và giải thuật SequenceMatcher phân loại 6 nhóm lỗi cục bộ. |
| **Python AI Core** | `:8000/qwen/generate`| `POST` | Kích hoạt mô hình SLM Qwen2.5-0.5B-Instruct sinh nhận xét sư phạm Tầng 2 cho bài tập làm văn. |
| **Python AI Core** | `:8000/tts` | `GET` | Streaming giọng đọc tiếng Việt Hoài My / Nam Minh qua thư viện `edge_tts`. |

---

### 4.3. Bổ sung Quy Trình Khởi Chạy Tự Động & Container Hóa (Mục 4.3.1)

* **Vị trí chèn trong file Word:** Chèn vào sau đoạn văn đầu tiên của **Mục 4.3.1: Cấu hình và cài đặt trên thiết bị phần cứng** (trang 50–51).
* **Câu neo định vị trong Word (Anchor Text):** Tìm đoạn văn hướng dẫn cài đặt môi trường chạy phần mềm.
* **Hành động:** Bổ sung mô tả tệp khởi chạy một chạm `start_all.bat` và giải pháp triển khai Docker trên Jetson Nano:

#### 1. Quy trình Vận hành Khởi chạy Tự động 1-Chạm (`start_all.bat`):
> Nhằm giúp giáo viên và các chuyên viên CNTT tại các trường tiểu học có thể khởi động toàn bộ hệ thống một cách dễ dàng mà không cần phải gõ các câu lệnh terminal phức tạp, hệ thống cung cấp tệp thực thi khởi động tự động **`start_all.bat`**:
> 1. Tự động kiểm tra môi trường Node.js 18+ và Python 3.10+.
> 2. Kiểm tra sự tồn tại của khóa cấu hình `GEMINI_API_KEY`.
> 3. Khởi động song song hai dịch vụ độc lập:
>    - **Dịch vụ 1**: Máy chủ Web Frontend & REST API Next.js trên cổng **3000** (`npm run dev`).
>    - **Dịch vụ 2**: Thiết lập biến môi trường `set ENABLE_QWEN_SLM=1` và khởi động Python AI Microservice trên cổng **8000** (`python main.py`).
> 4. Toàn bộ hệ thống sẵn sàng phục vụ chỉ sau khoảng 10–15 giây khởi động một chạm.

#### 2. Giải pháp Container hóa Docker trên Thiết bị Nhúng Jetson Nano (`03_Scripts_Trien_khai/jetson_nano`):
> Đối với môi trường trường học trang bị thiết bị điện toán biên NVIDIA Jetson Nano, hệ thống cung cấp kịch bản đóng gói Docker Compose:
> - `Dockerfile.web`: Đóng gói môi trường Next.js 16 chạy trên nền Node.js Alpine siêu nhẹ.
> - `Dockerfile.ai`: Đóng gói môi trường PyTorch hỗ trợ tăng tốc GPU CUDA cho YOLOv8 và ViT5.
> - `docker-compose.yml`: Điều phối liên lạc mạng nội bộ giữa 2 container, tối ưu hóa bộ nhớ RAM chia sẻ và tự động khởi động lại khi trạm biên gặp sự cố mất điện.
