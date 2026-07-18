# Hệ Thống ViHand Grade — Cơ Sở Dữ Liệu Tri Thức

## 1. Giới Thiệu Hệ Thống ViHand Grade

### 1.1. ViHand Grade là gì?
ViHand Grade là nền tảng hỗ trợ giáo viên tiểu học Việt Nam chấm điểm chính tả thông minh dành cho học sinh lớp 1 đến lớp 5. Hệ thống gồm 3 phần chính:
- Trợ lý giọng nói Alexa tích hợp trên thiết bị Xiaozhi ESP32-S3: tự soạn bài, đọc chính tả cho học sinh nghe viết
- Trang web ViHand Grade: giao diện cho giáo viên xem bài, chấm điểm, theo dõi tiến trình
- Trí tuệ nhân tạo ViT5: nhận dạng chữ viết tay học sinh từ ảnh chụp, so sánh với đáp án, cho điểm tự động

### 1.2. Luồng hoạt động từ đầu đến cuối
Bước 1: Giáo viên ra lệnh bằng giọng nói cho Alexa, ví dụ "Alexa, soạn bài chính tả cho lớp 3A".
Bước 2: Alexa tự soạn đoạn văn 3 đến 5 câu phù hợp độ tuổi lớp 3, rồi đọc chậm rãi 2 lần cho học sinh nghe viết.
Bước 3: Sau khi đọc xong, Alexa hỏi giáo viên có muốn lưu bài vào hệ thống không.
Bước 4: Giáo viên xác nhận, bài được lưu tự động vào cơ sở dữ liệu ViHand Grade.
Bước 5: Giáo viên chụp ảnh bài viết tay của học sinh, tải lên trang web.
Bước 6: Trí tuệ nhân tạo ViT5 nhận dạng chữ viết, so sánh với đoạn văn đã đọc, chấm điểm từ 0 đến 10 và liệt kê từng lỗi cụ thể.

---

## 2. Hướng Dẫn Sử Dụng Trợ Lý Alexa

### 2.1. Cách gọi Alexa
Từ khóa đánh thức (wake word) là "Alexa". Nói từ này trước mọi lệnh.

### 2.2. Các lệnh soạn và đọc bài chính tả
Câu hỏi: Làm sao để Alexa tự soạn bài chính tả?
Trả lời: Nói "Alexa, soạn bài chính tả cho lớp [tên lớp]". Alexa sẽ tự tạo đoạn văn phù hợp độ tuổi và đọc ngay.
Ví dụ: "Alexa, soạn bài chính tả cho lớp 2B"

Câu hỏi: Muốn soạn bài theo chủ đề thì nói gì?
Trả lời: Nói "Alexa, soạn bài chính tả về [chủ đề] cho lớp [tên lớp]".
Ví dụ: "Alexa, soạn bài chính tả về mùa hè cho lớp 4"

Câu hỏi: Muốn đọc một bài có sẵn tên cụ thể?
Trả lời: Nói "Alexa, đọc bài chính tả [tên bài] cho lớp [tên lớp]".
Ví dụ: "Alexa, đọc bài chính tả Ai có lỗi cho lớp 3A1"

### 2.3. Mức độ khó theo từng khối lớp
Lớp 1 và lớp 2: Đoạn văn gồm 2 đến 3 câu ngắn, dùng từ quen thuộc hàng ngày như mẹ, trường, bạn, nhà. Không dùng dấu hỏi ngã phức tạp.
Lớp 3: Đoạn văn gồm 3 đến 4 câu, bắt đầu có từ mang dấu hỏi và dấu ngã, câu ghép đơn giản.
Lớp 4 và lớp 5: Đoạn văn gồm 4 đến 5 câu, ngữ pháp phong phú, có từ láy, thành ngữ ngắn, từ Hán Việt cơ bản.

### 2.4. Các lệnh điều khiển trong buổi đọc
- Nói "Đọc lại" hoặc "Đọc lần 2": Alexa đọc lại toàn bộ đoạn văn
- Nói "Đọc chậm hơn": Alexa giảm tốc độ đọc
- Nói "Dừng lại": Tạm dừng buổi đọc
- Nói "To hơn" hoặc "Nhỏ hơn": Điều chỉnh âm lượng loa
- Nói "Các em đã viết xong chưa?": Alexa hỏi học sinh

### 2.5. Lệnh lưu bài vào hệ thống ViHand Grade
Quy tắc quan trọng: Sau khi đọc xong đoạn văn, Alexa luôn chủ động hỏi giáo viên "Thầy cô có muốn em lưu bài chính tả này vào hệ thống ViHand Grade không?". Chỉ khi giáo viên xác nhận bằng các từ như "có", "ừ", "ok", "lưu lại", "được" thì Alexa mới gọi công cụ lưu bài.
Trường hợp đặc biệt không cần hỏi: Khi giáo viên nói rõ từ đầu "đọc và lưu bài cho lớp 3A" hoặc "lưu buổi học vừa rồi" thì Alexa lưu ngay lập tức.

### 2.6. Lệnh xem lịch sử các buổi đọc chính tả
- Nói "Hôm nay đọc bài gì rồi?": Xem danh sách bài hôm nay
- Nói "Lịch sử chính tả của lớp 2A": Xem bài của riêng lớp 2A
- Nói "Tuần này lớp 4B học bài nào?": Lọc theo lớp và thời gian
- Nói "Đã đọc những bài gì rồi?": Xem tất cả bài gần đây

---

## 3. Công Cụ Kỹ Thuật Alexa Sử Dụng (MCP Tools)

### 3.1. Công cụ lưu buổi đọc chính tả: vihand.save_dictation_session
Mục đích: Lưu thông tin buổi đọc chính tả vào cơ sở dữ liệu ViHand Grade.
Khi nào gọi: Chỉ sau khi giáo viên xác nhận muốn lưu, hoặc khi lệnh ban đầu đã nói rõ "đọc và lưu".
Tham số bắt buộc:
- title: Tiêu đề bài, ví dụ "Nghe viết: Mùa hè"
- passage: Toàn bộ nội dung đoạn văn đã đọc cho học sinh
Tham số tùy chọn:
- className: Tên lớp học, ví dụ "3A1", "2B"
- teacherName: Tên giáo viên nếu biết
- summary: Tóm tắt ngắn, ví dụ "Alexa tự soạn bài, đọc 2 lần, lớp 3A, tốc độ chậm"
- logs: Lịch sử hội thoại đầy đủ trong buổi học dưới dạng chuỗi JSON. Giá trị speaker chỉ nhận 3 loại: teacher, alexa, student.

### 3.2. Công cụ xem lịch sử buổi đọc: vihand.get_dictation_sessions
Mục đích: Lấy danh sách các buổi đọc chính tả đã lưu trong hệ thống.
Khi nào gọi: Khi giáo viên hỏi lịch sử đọc bài, ví dụ "đã đọc bài gì rồi" hoặc "lớp 2A học bài nào".
Tham số:
- className: Lọc theo tên lớp, để trống nếu muốn xem tất cả
- limit: Số lượng kết quả tối đa, mặc định là 10

### 3.3. Công cụ tìm kiếm internet: self.search_web
Mục đích: Tra từ điển, tìm nghĩa từ, tìm ví dụ câu, tra quy tắc chính tả.
Tham số: query (nội dung tìm kiếm)

### 3.4. Công cụ điều chỉnh âm lượng: self.audio_speaker.set_volume
Tham số: volume (giá trị từ 0 đến 100)

### 3.5. Công cụ điều chỉnh độ sáng màn hình: self.screen.set_brightness
Tham số: brightness (giá trị từ 0 đến 100)

---

## 4. Lỗi Chính Tả Thường Gặp Ở Học Sinh Tiểu Học Việt Nam

### 4.1. Nhầm phụ âm đầu
Nhầm c, k, q: Quy tắc là chữ k đứng trước nguyên âm i, e, ê. Chữ q luôn đi với chữ u. Chữ c dùng trong các trường hợp còn lại. Lỗi hay gặp: viết "kông" thay cho "không", viết "cuả" thay cho "quả".
Nhầm d, gi, r: Lỗi hay gặp viết "dáo viên" thay cho "giáo viên", viết "rì" thay cho "gì".
Nhầm l và n: Phổ biến ở học sinh miền Bắc. Lỗi hay gặp: viết "lăm" thay cho "năm", viết "nêu" thay cho "lêu".
Nhầm s và x: Lỗi hay gặp viết "xắp xếp" thay cho "sắp xếp".
Nhầm tr và ch: Phổ biến ở học sinh miền Nam. Lỗi hay gặp viết "chăng" thay cho "trăng".

### 4.2. Nhầm vần
Nhầm an với ang: "con đàng" thay cho "con đàn". Nhầm ăn với ăng: "cái răn" thay cho "cái răng".
Nhầm iên với yên: Quy tắc là đứng đầu từ dùng chữ y (yêu, yên), sau phụ âm dùng chữ i (tiêu, tiên).
Nhầm ươn với ương: "vườn" khác "vường".

### 4.3. Nhầm dấu thanh hỏi và ngã
Đây là lỗi phổ biến nhất ở học sinh tiểu học. Ví dụ: "vẽ" (vẽ tranh, dấu ngã) khác "vẻ" (vẻ đẹp, dấu hỏi). "ngã" (té ngã, dấu ngã) khác "ngả" (rẽ ngả, dấu hỏi).
Mẹo phân biệt: Từ Hán Việt có thanh sắc hoặc thanh nặng thường dùng dấu ngã. Từ thuần Việt thường dùng dấu hỏi.

### 4.4. Lỗi viết hoa
Tên người và tên địa danh phải viết hoa: "Hà Nội", "Nguyễn Văn An". Sau dấu chấm phải viết hoa chữ cái đầu câu tiếp theo.

---

## 5. Bài Chính Tả Mẫu Theo Khối Lớp

### 5.1. Bài mẫu lớp 1 (2 đến 3 câu)
Bài mẫu gia đình: "Mẹ đi chợ mua rau. Bố nấu cơm ở nhà. Em giúp mẹ dọn bàn."
Bài mẫu trường học: "Cô giáo dạy em đọc chữ. Em chăm chú nghe cô giảng bài. Bạn bè em rất ngoan."
Bài mẫu thiên nhiên: "Mặt trời mọc đằng đông. Bầu trời xanh và trong. Em thích ngắm bầu trời buổi sáng."

### 5.2. Bài mẫu lớp 2 (3 đến 4 câu)
Bài mẫu buổi sáng: "Buổi sáng, tiếng chim hót vang lên đánh thức em dậy. Em đánh răng, rửa mặt rồi ăn sáng. Bố đưa em đến trường trên chiếc xe đạp cũ. Hôm nay là một ngày nắng đẹp."
Bài mẫu ao làng: "Ao làng trong xanh như gương. Đàn vịt bơi lội tung tăng. Hoa súng nở trắng một góc ao. Trẻ em ngồi câu cá bên bờ."

### 5.3. Bài mẫu lớp 3 (3 đến 5 câu)
Bài mẫu đồng quê: "Cánh đồng lúa rộng mênh mông trải dài tới tận chân trời. Những bông lúa vàng óng ả đung đưa trong gió nhẹ. Các bác nông dân đang cần mẫn gặt lúa dưới nắng chiều. Tiếng cười nói vang lên rộn rã khắp cánh đồng. Mùa gặt là mùa vui nhất của làng quê."
Bài mẫu biển cả: "Biển xanh rộng bao la như tấm thảm khổng lồ. Những con sóng bạc đầu nhấp nhô đuổi nhau vào bờ. Đàn hải âu lượn lờ trên bầu trời trong xanh. Ngư dân dong thuyền ra khơi từ lúc tờ mờ sáng."

### 5.4. Bài mẫu lớp 4 (4 đến 6 câu)
Bài mẫu rừng núi: "Rừng núi Tây Nguyên hùng vĩ và bí ẩn trong làn sương sớm. Những cây cổ thụ cao vút tỏa bóng mát rượi khắp khu rừng. Tiếng suối chảy róc rách hòa cùng tiếng chim hót líu lo. Rừng là lá phổi xanh của trái đất, cần được bảo vệ. Mỗi người chúng ta có trách nhiệm giữ gìn màu xanh cho rừng."

### 5.5. Bài mẫu lớp 5 (5 đến 7 câu)
Bài mẫu quê hương: "Quê hương là nơi ta sinh ra và lớn lên với bao kỉ niệm đẹp. Dù đi đâu về đâu, hình ảnh ngôi làng nhỏ với lũy tre xanh vẫn mãi in đậm trong tâm trí. Con sông quê hương chảy êm đềm qua bãi dâu bãi mía. Người dân quê mộc mạc, chân chất, sẵn sàng chia sẻ bát cơm manh áo với người hoạn nạn. Quê hương không chỉ là nơi để trở về mà còn là nguồn sức mạnh giúp ta vươn lên trong cuộc sống."

### 5.6. Nguyên tắc khi Alexa tự soạn bài mới
- Không dùng từ quá khó so với lứa tuổi lớp được chỉ định
- Mỗi câu không quá 15 đến 20 từ cho lớp 1 đến lớp 3
- Ưu tiên chủ đề gần gũi: gia đình, trường học, thiên nhiên, quê hương
- Có thể chứa từ dễ nhầm lẫn (l/n, s/x, hỏi/ngã) nhưng phải tự nhiên
- Không dùng từ địa phương khó hiểu

---

## 6. Quy Trình Buổi Kiểm Tra Chính Tả

### 6.1. Giai đoạn đọc bài
Bước 1: Giáo viên ra lệnh cho Alexa, ví dụ "Alexa, đọc bài chính tả cho lớp 3A".
Bước 2: Alexa thông báo tên bài rồi đọc lần 1 liền mạch toàn bộ đoạn văn để học sinh nghe tổng thể.
Bước 3: Nghỉ 10 đến 15 giây.
Bước 4: Alexa đọc lần 2 từng câu một, ngắt giữa các câu đủ thời gian cho học sinh viết.
Bước 5: Alexa hỏi "Các em đã viết xong chưa ạ?".
Bước 6: Alexa hỏi giáo viên "Thầy cô có muốn em lưu bài này vào ViHand Grade không?".
Bước 7: Giáo viên xác nhận, Alexa gọi công cụ vihand.save_dictation_session để lưu.

### 6.2. Thời gian ước tính theo khối lớp
Lớp 1: khoảng 7 phút. Lớp 2: khoảng 10 phút. Lớp 3: khoảng 14 phút. Lớp 4: khoảng 17 phút. Lớp 5: khoảng 21 phút.

### 6.3. Giai đoạn nộp bài và chấm điểm
Giáo viên chụp ảnh bài viết tay của từng học sinh rồi tải lên trang web ViHand Grade. Trí tuệ nhân tạo ViT5 sẽ nhận dạng chữ viết tay bằng công nghệ OCR, so sánh với đoạn văn Alexa đã đọc, chấm điểm theo thang 10 và liệt kê từng lỗi cụ thể kèm nhận xét.

### 6.4. Cách tính điểm
Điểm 10: Không có lỗi nào. Mỗi lỗi chính tả trừ 0.5 điểm. Mỗi lỗi dấu câu trừ 0.25 điểm. Điểm tối thiểu là 0.

---

## 7. Câu Hỏi Thường Gặp

Câu hỏi: Alexa có tự soạn bài chính tả được không?
Trả lời: Có. Giáo viên chỉ cần nói "Alexa, soạn bài chính tả cho lớp [tên lớp]". Alexa sẽ tự tạo đoạn văn phù hợp độ tuổi mà không cần chuẩn bị trước.

Câu hỏi: Bài đã đọc có được lưu tự động không?
Trả lời: Không hoàn toàn tự động. Sau khi đọc xong, Alexa luôn hỏi giáo viên có muốn lưu không. Chỉ khi giáo viên xác nhận thì bài mới được lưu vào hệ thống. Ngoại trừ trường hợp giáo viên nói rõ "đọc và lưu" từ đầu.

Câu hỏi: Làm sao xem lại bài đã đọc trước đó?
Trả lời: Có hai cách. Cách 1: Hỏi Alexa bằng giọng nói "Hôm nay đọc bài gì rồi?". Cách 2: Mở trang web ViHand Grade tại mục Đọc chính tả.

Câu hỏi: Giáo viên có thể đọc lại bài đã lưu trong hệ thống không?
Trả lời: Có. Nói "Alexa, đọc lại bài [tên bài] cho lớp [tên lớp]" và Alexa sẽ lấy nội dung từ hệ thống để đọc lại.

Câu hỏi: Alexa đọc nhanh quá hoặc chậm quá thì làm sao?
Trả lời: Nói "Đọc chậm hơn" hoặc "Đọc nhanh hơn" để Alexa điều chỉnh tốc độ.

Câu hỏi: Bị mất điện thì bài có mất không?
Trả lời: Nếu bài đã được lưu vào hệ thống thì không mất. Nếu đang đọc mà chưa kịp lưu thì buổi đó sẽ không được ghi lại.

Câu hỏi: Có bao nhiêu giáo viên có thể dùng đồng thời?
Trả lời: Hệ thống hỗ trợ nhiều giáo viên với tài khoản riêng trên trang web. Tuy nhiên thiết bị Xiaozhi (Alexa) là phần cứng vật lý nên mỗi lúc chỉ 1 giáo viên sử dụng được.

Câu hỏi: Hai lớp muốn kiểm tra cùng một bài thì làm sao?
Trả lời: Gọi Alexa đọc 2 lần riêng biệt. Mỗi lần chỉ định tên lớp khác nhau khi lưu. Ví dụ lần 1 "đọc cho lớp 3A", lần 2 "đọc cho lớp 3B".

---

## 8. Quy Tắc Alexa Phải Tuân Thủ

### 8.1. Alexa được phép làm
- Tự soạn bài chính tả phù hợp từng khối lớp từ lớp 1 đến lớp 5
- Đọc bài chậm rãi, lặp lại khi giáo viên yêu cầu
- Lưu buổi đọc vào hệ thống khi giáo viên xác nhận
- Tra từ điển, giải thích nghĩa từ cho học sinh
- Điều chỉnh âm lượng và độ sáng thiết bị

### 8.2. Alexa không được phép làm
- Không lưu bài khi giáo viên chưa xác nhận (trừ lệnh rõ ràng "đọc và lưu")
- Không chia sẻ điểm số của học sinh này cho người khác
- Không xóa dữ liệu đã lưu trong hệ thống
- Không chỉnh sửa điểm số (chỉ giáo viên có quyền)
- Không đọc thông tin cá nhân học sinh ra ngoài môi trường lớp học
