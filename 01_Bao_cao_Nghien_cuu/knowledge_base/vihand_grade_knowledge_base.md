# Hệ Thống ViHand Grade — Cơ Sở Dữ Liệu Tri Thức

## 1. Giới Thiệu Hệ Thống ViHand Grade

### 1.1. ViHand Grade là gì?
ViHand Grade là nền tảng AI hỗ trợ giáo viên tiểu học Việt Nam chấm điểm bài thi chính tả viết tay thông minh dành cho học sinh từ lớp 1 đến lớp 5. Hệ thống gồm các thành phần cốt lõi:
- **Phân hệ Đọc chính tả Web (`/teacher/dictation`)**: Sáng tác bài đọc với AI (Qwen 2.5 SLM), tích hợp kho ngữ liệu SGK chuẩn, phát âm chuẩn sư phạm qua Edge-TTS đa giọng đọc và tự động lưu phiên đọc làm văn bản Ground Truth đối chiếu.
- **Trang web quản trị & chấm điểm**: Giao diện trực quan cho giáo viên quản lý lớp, upload bài làm, điều chỉnh điểm số và xuất báo cáo học tập.
- **AI Pipeline đa tầng**: Tiền xử lý ảnh 9 bước (Jimp), Gemini Vision OCR nhận dạng chữ viết tay và ViT5 Seq2Seq sửa lỗi chính tả theo ngữ cảnh tiếng Việt.

### 1.2. Luồng hoạt động từ đầu đến cuối
- **Bước 1**: Giáo viên mở trang Đọc chính tả, chọn bài từ kho SGK hoặc bấm "AI Soạn bài" để tạo đoạn văn chuẩn GDPT 2018.
- **Bước 2**: Hệ thống phát âm rõ ràng, nhịp nhàng theo các khoảng nghỉ sư phạm để học sinh nghe viết vào vở.
- **Bước 3**: Sau khi đọc xong, hệ thống lưu phiên đọc vào cơ sở dữ liệu làm văn bản đối chiếu (Ground Truth).
- **Bước 4**: Giáo viên chụp ảnh bài viết tay của học sinh và tải lên trang chấm điểm.
- **Bước 5**: AI tự động tiền xử lý ảnh, nhận dạng chữ viết tay, so khớp với bài đọc chuẩn, tính điểm thang 10 và vẽ Bounding Box trực quan hóa từng từ lỗi.

---

## 2. Hướng Dẫn Sử Dụng Phân Hệ Đọc Chính Tả

### 2.1. Thiết lập nhịp đọc sư phạm
- **Tốc độ đọc**: Tùy chỉnh từ Cực chậm (-35% cho Lớp 1) đến Chuẩn (-15%) hoặc theo tỷ lệ % tùy ý.
- **Số lần lặp**: Lặp lại từ 1 đến 5 lần (chuẩn 2 lần/cụm câu).
- **Thời gian nghỉ viết**: Từ 1 đến 10 giây hoặc chọn Tự động (~1.6 giây/từ) để học sinh có đủ thời gian viết.
- **Độ dài ngắt cụm**: Cụm ngắn (3–5 từ cho Lớp 1-2), Cụm chuẩn (5–8 từ cho Lớp 3), Cả câu dài (Lớp 4-5).
- **Giọng đọc AI**: Hỗ trợ Edge-TTS chất lượng cao (Cô Hoài My — Nữ Bắc chuẩn, Thầy Nam Minh — Nam Bắc chuẩn).

### 2.2. Mức độ bài đọc theo từng khối lớp
- **Lớp 1 và lớp 2**: Đoạn văn gồm 2 đến 3 câu ngắn, dùng từ quen thuộc hàng ngày (mẹ, trường, bạn, nhà). Tránh dấu hỏi ngã phức tạp.
- **Lớp 3**: Đoạn văn gồm 3 đến 4 câu, bắt đầu có từ mang dấu hỏi và dấu ngã, câu ghép đơn giản.
- **Lớp 4 và lớp 5**: Đoạn văn gồm 4 đến 5 câu, ngữ pháp phong phú, có từ láy, thành ngữ ngắn, từ Hán Việt cơ bản.

---

## 3. Lỗi Chính Tả Thường Gặp Ở Học Sinh Tiểu Học Việt Nam

### 3.1. Nhầm phụ âm đầu
- **Nhầm c, k, q**: Quy tắc chữ k đứng trước nguyên âm i, e, ê. Chữ q luôn đi với chữ u. Chữ c dùng trong các trường hợp còn lại. Lỗi hay gặp: viết "kông" thay cho "không", viết "cuả" thay cho "quả".
- **Nhầm d, gi, r**: Lỗi hay gặp viết "dáo viên" thay cho "giáo viên", viết "rì" thay cho "gì".
- **Nhầm l và n**: Phổ biến ở học sinh miền Bắc. Lỗi hay gặp: viết "lăm" thay cho "năm", viết "nêu" thay cho "lêu".
- **Nhầm s và x**: Lỗi hay gặp viết "xắp xếp" thay cho "sắp xếp".
- **Nhầm tr và ch**: Phổ biến ở học sinh miền Nam. Lỗi hay gặp viết "chăng" thay cho "trăng".

### 3.2. Nhầm vần
- **Nhầm an với ang**: "con đàng" thay cho "con đàn". Nhầm ăn với ăng: "cái răn" thay cho "cái răng".
- **Nhầm iên với yên**: Quy tắc đứng đầu từ dùng chữ y (yêu, yên), sau phụ âm dùng chữ i (tiêu, tiên).
- **Nhầm ươn với ương**: "vườn" khác "vường".

### 3.3. Nhầm dấu thanh hỏi và ngã
Đây là lỗi phổ biến nhất ở học sinh tiểu học. Ví dụ: "vẽ" (vẽ tranh, dấu ngã) khác "vẻ" (vẻ đẹp, dấu hỏi). "ngã" (té ngã, dấu ngã) khác "ngả" (rẽ ngả, dấu hỏi).
*Mẹo phân biệt*: Từ Hán Việt có thanh sắc hoặc thanh nặng thường dùng dấu ngã. Từ thuần Việt thường dùng dấu hỏi.

### 3.4. Lỗi viết hoa
Tên người và tên địa danh phải viết hoa: "Hà Nội", "Nguyễn Văn An". Sau dấu chấm phải viết hoa chữ cái đầu câu tiếp theo.

---

## 4. Bài Chính Tả Mẫu Theo Khối Lớp

### 4.1. Bài mẫu lớp 1 (2 đến 3 câu)
- **Gia đình**: "Mẹ đi chợ mua rau. Bố nấu cơm ở nhà. Em giúp mẹ dọn bàn."
- **Trường học**: "Cô giáo dạy em đọc chữ. Em chăm chú nghe cô giảng bài. Bạn bè em rất ngoan."
- **Thiên nhiên**: "Mặt trời mọc đằng đông. Bầu trời xanh và trong. Em thích ngắm bầu trời buổi sáng."

### 4.2. Bài mẫu lớp 2 (3 đến 4 câu)
- **Buổi sáng**: "Buổi sáng, tiếng chim hót vang lên đánh thức em dậy. Em đánh răng, rửa mặt rồi ăn sáng. Bố đưa em đến trường trên chiếc xe đạp cũ. Hôm nay là một ngày nắng đẹp."
- **Ao làng**: "Ao làng trong xanh như gương. Đàn vịt bơi lội tung tăng. Hoa súng nở trắng một góc ao. Trẻ em ngồi câu cá bên bờ."

### 4.3. Bài mẫu lớp 3 (3 đến 5 câu)
- **Đồng quê**: "Cánh đồng lúa rộng mênh mông trải dài tới tận chân trời. Những bông lúa vàng óng ả đung đưa trong gió nhẹ. Các bác nông dân đang cần mẫn gặt lúa dưới nắng chiều. Tiếng cười nói vang lên rộn rã khắp cánh đồng. Mùa gặt là mùa vui nhất của làng quê."
- **Biển cả**: "Biển xanh rộng bao la như tấm thảm khổng lồ. Những con sóng bạc đầu nhấp nhô đuổi nhau vào bờ. Đàn hải âu lượn lờ trên bầu trời trong xanh. Ngư dân dong thuyền ra khơi từ lúc tờ mờ sáng."

### 4.4. Bài mẫu lớp 4 (4 đến 6 câu)
- **Rừng núi**: "Rừng núi Tây Nguyên hùng vĩ và bí ẩn trong làn sương sớm. Những cây cổ thụ cao vút tỏa bóng mát rượi khắp khu rừng. Tiếng suối chảy róc rách hòa cùng tiếng chim hót líu lo. Rừng là lá phổi xanh của trái đất, cần được bảo vệ. Mỗi người chúng ta có trách nhiệm giữ gìn màu xanh cho rừng."

### 4.5. Bài mẫu lớp 5 (5 đến 7 câu)
- **Quê hương**: "Quê hương là nơi ta sinh ra và lớn lên với bao kỉ niệm đẹp. Dù đi đâu về đâu, hình ảnh ngôi làng nhỏ với lũy tre xanh vẫn mãi in đậm trong tâm trí. Con sông quê hương chảy êm đềm qua bãi dâu bãi mía. Người dân quê mộc mạc, chân chất, sẵn sàng chia sẻ bát cơm manh áo với người hoạn nạn. Quê hương không chỉ là nơi để trở về mà còn là nguồn sức mạnh giúp ta vươn lên trong cuộc sống."

---

## 5. Quy Trình Chấm Điểm & Thang Điểm 10

### 5.1. Thang điểm 10 chi tiết
- **Chính tả (4.0 điểm)**: Trừ điểm theo lỗi chính tả, sai dấu câu hoặc thiếu phụ âm/nguyên âm.
- **Hình thức & Trình bày (3.0 điểm)**: Đánh giá độ ngay ngắn, khoảng cách dòng, độ sạch của trang viết.
- **Nội dung hoàn thành (2.0 điểm)**: Tỷ lệ viết đủ độ dài so với bài đọc chuẩn Ground Truth.
- **Sáng tạo & Nét chữ (1.0 điểm)**: Nét thanh nét đậm, phong cách chữ viết.

### 5.2. Công nghệ đối chiếu
- **Levenshtein Distance**: Tính toán độ sai khác từng ký tự giữa chữ viết tay học sinh đã OCR và văn bản chuẩn.
- **SequenceMatcher**: Xác định cụm từ đúng/sai để vẽ bounding box highlight cho giáo viên và phụ huynh dễ dàng quan sát.

---

## 6. Câu Hỏi Thường Gặp

**Câu hỏi: Làm sao xem lại bài đã đọc trước đó?**  
Trả lời: Mở trang web ViHand Grade, vào mục *Đọc chính tả* (`/teacher/dictation`) và chuyển sang tab *Lịch Sử Phiên Đọc*.

**Câu hỏi: Bài đọc có thể dùng lại cho nhiều lớp khác nhau không?**  
Trả lời: Hoàn toàn được. Giáo viên có thể chọn bất kỳ bài đọc nào trong *Kho Ngữ Liệu SGK* hoặc bài cũ trong *Lịch Sử Phiên Đọc* để phát đọc cho các lớp tiếp theo.

**Câu hỏi: Bị mất điện thì kết quả chấm và bài đọc có bị mất không?**  
Trả lời: Không. Dữ liệu đã được lưu trữ an toàn trong cơ sở dữ liệu SQLite tại `prisma/vihand.db` trên máy tính/máy chủ.
