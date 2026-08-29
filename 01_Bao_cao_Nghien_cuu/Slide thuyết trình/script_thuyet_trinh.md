# 📋 SCRIPT THUYẾT TRÌNH ĐẦY ĐỦ
## Hội đồng Nghiệm thu NCKH Sinh viên – Khoa Điện – Điện Tử
### Đề tài: Phát triển thiết bị sửa lỗi và chấm điểm chính tả tự động cho học sinh tiểu học
### GVHD: TS. Lê Anh Vũ | Nhóm SV: Dương Thành Long – Phạm Hoài Quốc Bảo – Nguyễn Thanh Phúc

---

> **Ghi chú sử dụng**
> - 🎙️ = Lời thuyết trình (đọc hoặc diễn giải)
> - 💡 = Gợi ý cách diễn đạt / nhấn mạnh
> - ⏱️ = Thời lượng ước lượng cho từng slide
> - Tổng thời lượng đề xuất: **15–20 phút**
> - Cấu trúc slide: **1, 2, 3, 4, 6, 8, 9, 11, 12, 14, 15, 19, 20, 21, 22, 23, 24, 26, 27** (19 slide)

---

## SLIDE 1 – Trang bìa Hội đồng Nghiệm thu
⏱️ *~30 giây*

🎙️
> "Kính thưa quý thầy cô trong Hội đồng Nghiệm thu NCKH Sinh viên – Khoa Điện – Điện Tử, thưa các bạn sinh viên có mặt hôm nay.
>
> Đây là buổi Hội đồng Nghiệm thu NCKH Sinh viên năm học 2025–2026, được tổ chức tại Thành phố Hồ Chí Minh, ngày 01 tháng 06 năm 2026.
>
> Cho phép nhóm chúng em được bắt đầu buổi bảo vệ. Trước tiên, em xin trân trọng cảm ơn Hội đồng đã dành thời gian lắng nghe và đánh giá công trình của nhóm chúng em."

💡 *Nhìn thẳng vào Hội đồng, giọng tự tin, nhịp độ vừa phải.*

---

## SLIDE 2 – Tên đề tài & Nhóm nghiên cứu
⏱️ *~45 giây*

🎙️
> "Đề tài chúng em thực hiện có tên:
>
> **'Phát triển thiết bị sửa lỗi và chấm điểm chính tả tự động cho học sinh tiểu học.'**
>
> Đây là đề tài được trình bày trước Hội đồng Nghiệm thu NCKHSV cấp Khoa, năm học 2025–2026.
>
> Đề tài được thực hiện dưới sự hướng dẫn của **Tiến sĩ Lê Anh Vũ**. Nhóm nghiên cứu gồm ba thành viên:
> - **Dương Thành Long** – MSSV 42300176
> - **Phạm Hoài Quốc Bảo** – MSSV 42300262
> - **Nguyễn Thanh Phúc** – MSSV 42300350
>
> Trong phần thuyết trình hôm nay, nhóm em sẽ lần lượt trình bày: lý do chọn đề tài, thách thức nghiên cứu, mục tiêu, phương pháp tiếp cận, kết quả đạt được và hướng phát triển tiếp theo."

---

## SLIDE 3 – Lý do chọn đề tài
⏱️ *~1 phút 30 giây*

🎙️
> "Để hiểu vì sao nhóm chúng em chọn đề tài này, hãy hình dung một lớp học tiểu học điển hình ở Việt Nam với **35 đến 45 học sinh**, giáo viên phải chấm bài tay — mỗi bài mất từ **3 đến 5 phút**. Điều đó có nghĩa là chỉ để chấm một bài chính tả cho cả lớp, giáo viên cần tới **hơn 3 tiếng đồng hồ**. Đây là áp lực rất lớn và lặp đi lặp lại hàng tuần.
>
> Xuất phát từ thực tế đó, nhóm chúng em nhận thấy **5 động lực chính** để tiến hành nghiên cứu này:
>
> **Thứ nhất**, áp lực chấm bài của giáo viên tiểu học — đây là bài toán thực tiễn cần giải quyết ngay.
>
> **Thứ hai**, nhận dạng chữ **viết tay tiếng Việt của học sinh tiểu học** có những đặc thù riêng về dấu thanh và nét viết chưa thành thục mà chưa có nghiên cứu nào giải quyết triệt để.
>
> **Thứ ba**, sự bùng nổ của các **mô hình AI đa phương thức** — đặc biệt là các mô hình có khả năng xử lý đồng thời hình ảnh và ngôn ngữ — mở ra cơ hội mới để giải quyết bài toán nhận dạng chữ viết tay.
>
> **Thứ tư**, mục tiêu **tối ưu chi phí và đảm bảo tính khả thi** — toàn bộ hệ thống phải chạy được trên phần cứng nhúng chi phí thấp, phù hợp với điều kiện trường học Việt Nam.
>
> **Thứ năm**, đây là bài toán có tính **cấp thiết cho quá trình chuyển đổi số giáo dục Việt Nam**, đặc biệt ở cấp tiểu học nơi nền tảng kiến thức chính tả được hình thành."

💡 *Dừng lại 1–2 giây sau mỗi 'Thứ nhất / Thứ hai / ...' để nhấn mạnh.*

---

## SLIDE 4 – Thách thức nghiên cứu
⏱️ *~1 phút 30 giây*

🎙️
> "Tuy nhiên, để giải quyết bài toán này không hề đơn giản. Nhóm chúng em đã đối mặt với **5 thách thức nghiên cứu** chính — như chúng ta có thể thấy qua những tờ bài viết tay thực tế của học sinh trong hình:
>
> **Một là**, thiếu bộ **dữ liệu chuẩn** cho mô hình thử nghiệm: Hiện chưa có corpus tiếng Việt nào được gán nhãn chuyên biệt cho chữ viết tay học sinh tiểu học. Nhóm em phải tự thu thập và tổng hợp dữ liệu.
>
> **Hai là**, đặc thù phức tạp của **chữ viết tay tiếng Việt** và nhiễu từ **giấy ô ly**: Tiếng Việt có hệ thống dấu thanh và dấu phụ phức tạp — 6 thanh điệu, nhiều ký tự đặc biệt — cùng với nhiễu từ giấy ô ly và nét viết chưa thành thục của trẻ em.
>
> **Ba là**, độ phức tạp của **chất lượng ảnh chụp đầu vào**: Ảnh chụp bằng điện thoại thường gặp các vấn đề như mờ, nghiêng, ánh sáng không đều — ảnh hưởng trực tiếp đến độ chính xác nhận diện.
>
> **Bốn là**, rào cản **công nghệ AI** và cấu trúc **xử lý ngôn ngữ**: Việc tích hợp và tinh chỉnh mô hình ngôn ngữ lớn để hiểu ngữ cảnh sửa lỗi chính tả là thách thức kỹ thuật đòi hỏi kiến thức chuyên sâu.
>
> **Năm là**, giới hạn **tài nguyên** trên phần cứng: Toàn bộ hệ thống phải chạy được trên phần cứng nhúng chi phí thấp — cụ thể là Raspberry Pi 4 — nhằm đảm bảo tính khả thi khi triển khai đại trà."

---

## SLIDE 6 – Mục tiêu nghiên cứu
⏱️ *~1 phút*

🎙️
> "Từ những thách thức đó, nhóm xác định **mục tiêu tổng quát** của đề tài là:
>
> *'Cung cấp một công cụ hỗ trợ nhận dạng chữ viết tay tiếng Việt và chấm điểm, sửa lỗi chính tả tự động.'*
>
> Cụ thể hơn, mục tiêu được chia thành hai nhóm:
>
> Về **kỹ thuật**: Xây dựng pipeline xử lý ảnh hoàn chỉnh — từ khâu tiền xử lý, nhận diện OCR, sửa lỗi chính tả đến chấm điểm tự động; tích hợp mô hình AI phù hợp đạt độ chính xác cao trong điều kiện phần cứng giới hạn. Minh họa trong slide cho thấy luồng từ ảnh chữ viết tay → JSON phân tích lỗi có cấu trúc.
>
> Về **sư phạm**: Sản phẩm phải thực sự giúp giáo viên tiết kiệm thời gian chấm bài — như bảng điểm chi tiết trong slide với các tiêu chí cụ thể và điểm số từng mục — đồng thời cung cấp phản hồi chính xác và hữu ích cho học sinh."

💡 *Chỉ vào hai phần minh họa trong slide: bên trái là ảnh bài viết → JSON output, bên phải là giao diện bảng điểm trên Web.*

---

## SLIDE 8 – Đối tượng | Nội dung | Kỹ thuật | Môi trường
⏱️ *~1 phút*

🎙️
> "Slide này tóm tắt phạm vi nghiên cứu theo bốn khía cạnh, có minh họa trực quan bằng hình ảnh thực tế:
>
> **Đối tượng nghiên cứu**: Học sinh từ lớp 1 đến lớp 5 tại các trường tiểu học — như các em học sinh trong hình, từ học sinh mầm non tập viết đến học sinh đang viết bài tập trung.
>
> **Nội dung** nghiên cứu: Bài chính tả viết tay thực tế — như tờ bài trong hình với đề 'Viết đoạn văn tả cảnh tan học', nét chữ đặc trưng học sinh tiểu học trên giấy ô ly.
>
> **Kỹ thuật**: Hệ thống Web tích hợp đầy đủ — giao diện chấm điểm hiển thị điểm tổng hợp và bảng chi tiết như trong ảnh giao diện.
>
> **Môi trường** triển khai: **Raspberry Pi 4** — thiết bị nhỏ gọn, chi phí thấp, phù hợp với điều kiện lớp học tiểu học thực tế. Giáo viên chỉ cần dùng điện thoại thông minh và trình duyệt Web."

---

## SLIDE 9 – Quy trình hoạt động của thiết bị
⏱️ *~1 phút*

🎙️
> "Đây là **quy trình hoạt động tổng thể** của thiết bị, được thiết kế theo mô hình pipeline khép kín:
>
> Giáo viên **chụp ảnh** bài làm viết tay của học sinh, ảnh được đưa vào hệ thống trên Raspberry Pi 4.
>
> **Bước 1 – Làm sạch và chuẩn hóa**: Ảnh đi qua pipeline tiền xử lý 9 bước để loại bỏ nhiễu và chuẩn hóa chất lượng.
>
> **Bước 2 – Nhận diện và phát hiện các từ**: Xác định vùng chứa văn bản trong ảnh.
>
> **Bước 3 – Nhận dạng và trích xuất văn bản (OCR)**: Thông qua **Cloud API** — cụ thể là Gemini API — văn bản được trích xuất từ ảnh.
>
> **Bước 4 – Phân tích chính tả theo quy tắc**: Module **Local AI** phân tích và phân loại lỗi chính tả theo tiêu chí sư phạm.
>
> **Bước 5 – Chấm điểm và đánh giá**: Kết quả được lưu vào **SQLite** và hiển thị qua **Giao diện Web** trả về cho giáo viên.
>
> Toàn bộ quy trình này diễn ra **tự động** — chỉ cần giáo viên chụp ảnh và upload."

---

## SLIDE 11 – Tiền xử lý ảnh 9 bước
⏱️ *~1 phút 30 giây*

🎙️
> "Giai đoạn tiền xử lý là nền tảng quyết định chất lượng toàn bộ pipeline. Nhóm em thiết kế pipeline **9 bước** được chia thành 3 giai đoạn — như thể hiện qua tờ bài viết tay thực tế của học sinh trong slide:
>
> **Giai đoạn 1 – Chuẩn hóa hình học:**
> - Bước 1: **Xoay, lật ảnh** — tự động phát hiện và điều chỉnh hướng ảnh.
> - Bước 2: **Resize hình ảnh** — về kích thước chuẩn để đồng nhất đầu vào.
> - Bước 3: **Cân bằng trắng** — loại bỏ sai lệch màu sắc do ánh sáng môi trường.
> - Bước 4: **Chuyển sang hệ Xám** — giảm chiều dữ liệu, tập trung vào thông tin chữ viết.
>
> **Giai đoạn 2 – Tăng cường hình ảnh:**
> - Bước 5: **Khử bóng đổ** — vấn đề rất phổ biến khi chụp ảnh sách vở.
> - Bước 6: **Tăng cường tương phản** — giúp chữ nổi rõ hơn trên nền giấy.
> - Bước 7: **Làm sắc nét** — tăng độ nét cạnh chữ.
>
> **Giai đoạn 3 – Phân tách:**
> - Bước 8: **Nhị phân hóa** — chuyển ảnh về dạng trắng-đen thuần túy, tối ưu cho OCR.
> - Bước 9: **Kiểm định chất lượng ảnh** — nếu ảnh không đạt ngưỡng chất lượng, hệ thống thông báo yêu cầu chụp lại.
>
> Pipeline này đảm bảo rằng dù ảnh đầu vào có điều kiện ánh sáng hay góc độ như thế nào, đầu ra luôn được chuẩn hóa tốt nhất có thể."

---

## SLIDE 12 – Mô hình đề xuất
⏱️ *~1 phút*

🎙️
> "Về kiến trúc mô hình tổng thể, nhóm em đề xuất một hệ thống **kết hợp các thành phần** hoạt động theo hai luồng song song:
>
> **Luồng nhận diện qua Cloud API**: Ảnh sau khi được làm sạch và chuẩn hóa sẽ đi qua module nhận diện và phát hiện các từ, sau đó gọi lên **Cloud API — Google Gemini API** — để nhận dạng và trích xuất văn bản (OCR).
>
> **Luồng xử lý cục bộ (Local AI)**: Văn bản được trích xuất sẽ đưa qua module phân tích chính tả theo quy tắc và module chấm điểm đánh giá — chạy hoàn toàn cục bộ trên Raspberry Pi.
>
> Kết quả cuối cùng được lưu vào **SQLite** và hiển thị trực quan trên **Giao diện Web** cho giáo viên.
>
> Thiết kế này tối ưu chi phí vận hành: chỉ ảnh mới cần gửi lên Cloud, toàn bộ logic chấm điểm chạy cục bộ."

---

## SLIDE 14 – Kết quả mô hình nhận diện (Demo thực tế)
⏱️ *~1 phút*

🎙️
> "Đây là kết quả thực tế của mô hình nhận diện trên bài chính tả viết tay thực tế của học sinh.
>
> Bên trái là ảnh bài viết với nét chữ chưa thành thục, có đường kẻ ô ly — điều kiện ảnh đầu vào khá thách thức.
>
> Sau khi qua pipeline xử lý, hệ thống xuất ra dữ liệu **JSON có cấu trúc rõ ràng** như bên phải. Mỗi từ sai được gắn nhãn đầy đủ:
> - `error`: từ học sinh viết sai
> - `suggestion`: từ đúng được đề xuất
> - `error_type`: phân loại lỗi — ví dụ `phu_am_dau`, `van`
> - `dialect`: đánh dấu có phải lỗi do phương ngữ không
> - `reason`: giải thích chi tiết bằng tiếng Việt tự nhiên
>
> Ví dụ: từ 'su' → đúng là 'Ru', `error_type: phu_am_dau`, `dialect: true`, với lý giải: 'Trong tiếng Việt chuẩn, từ đúng là Ru, em cần chú ý phân biệt âm s và r'. Đây chính là phản hồi có giá trị giáo dục cho học sinh."

---

## SLIDE 15 – Kết quả mô hình nhận diện (So sánh)
⏱️ *~1 phút 30 giây*

🎙️
> "Nhóm em đã thử nghiệm **5 mô hình OCR** khác nhau trên cùng bộ dữ liệu chưa qua tiền xử lý — điều kiện khắt khe nhất — để có cơ sở so sánh khách quan:
>
> - **Gemini API**: đạt **85–95%** — xếp loại Chính xác
> - **Chandra OCR**: đạt **80–87%** — xếp loại Tốt
> - **Light-on-OCR1B**: đạt **78–84%** — Khá, đôi khi nhầm dấu thanh nhỏ
> - **Tesseract & VietOCR**: chỉ đạt **0–5%** — Kém khi gặp nhiễu
> - **EasyOCR**: đạt **0%** — Kém khi gặp nhiễu
>
> Biểu đồ thanh cho thấy **Gemini API vượt trội rõ rệt**.
>
> Về ba tiêu chí đánh giá mà nhóm đặt ra:
>
> **Độ chính xác**: Gemini đạt 85–95% OCR, đồng thời có khả năng hiểu ngữ cảnh để sửa lỗi.
>
> **Độ ổn định**: Thời gian xử lý dưới 30 giây mỗi bài, dữ liệu trả về JSON ổn định có cấu trúc.
>
> **Tính thực tiễn**: Không đòi hỏi phần cứng đắt đỏ, có khả năng lưu trữ và tự động hóa cao, mang lại hiệu quả kinh tế và sư phạm đáng kể.
>
> Lưu ý quan trọng: Tất cả các mô hình được thử nghiệm trên bộ dữ liệu **chưa qua tiền xử lý** — điều kiện khắt khe nhất."

💡 *Dừng lại khoảng 2 giây sau mỗi tiêu chí để tạo ấn tượng.*

---

## SLIDE 19 – Mô hình sửa lỗi chính tả (Demo ViHandGrade)
⏱️ *~1 phút*

🎙️
> "Tiếp theo là thành phần **sửa lỗi chính tả**. Đây là minh họa thực tế của hệ thống ViHandGrade trong việc phát hiện và sửa lỗi:
>
> **Bài viết gốc của học sinh có 2 lỗi sai**:
> - 'tết' — thiếu dấu sắc
> - 'đường' — viết sai vần 'ương' thành 'ương'
>
> **Sau khi ViHandGrade xử lý**, kết quả được sửa chính xác:
> - 'tết' — đã thêm dấu đúng
> - 'đường' — đã sửa đúng vần
>
> Hệ thống đánh giá mô hình sửa lỗi theo **4 tiêu chí**: chất lượng sửa lỗi, tương thích miền dữ liệu, hiệu năng phần cứng và tích hợp chấm điểm. Kết quả cho thấy mô hình **ViT5** là lựa chọn tối ưu cho bài toán này."

---

## SLIDE 20 – Mô hình sửa lỗi chính tả (ViT5 – Chi tiết kỹ thuật)
⏱️ *~2 phút*

🎙️
> "Hãy để em trình bày chi tiết hơn về **kiến trúc ViT5**:
>
> ViT5 có nền tảng là kiến trúc **T5 — Text-to-Text Transformer** của Google. Điểm đặc biệt là ViT5 đã được **tiền huấn luyện trên corpus tiếng Việt quy mô lớn** với **226 triệu tham số** theo cấu trúc Encoder-Decoder.
>
> Với ViT5, bài toán sửa lỗi chính tả được chuyển thành bài toán **Seq2Seq**: mô hình nhận vào câu có lỗi và 'dịch' nó thành câu đúng — tương tự như dịch máy. Nhờ tiền huấn luyện, mô hình đã nắm bắt được ngữ pháp và ngữ cảnh toàn câu tiếng Việt một cách tự nhiên.
>
> Về kết quả fine-tune — thể hiện qua bảng và hai đồ thị trong slide:
>
> | Epoch | Bước (Step) | Train Loss | Val Loss | SacreBLEU |
> |:-----:|:-----------:|:----------:|:--------:|:---------:|
> | 0.083 | 5.000       | 0.319      | 0.198    | 38.10%    |
> | 0.25  | 15.000      | 0.145      | **0.170**    | 38.84%    |
> | 1     | 60.000      | 0.0501     | 0.199    | **39.17%**    |
>
> **Best Checkpoint tại Step 15.000** với Val Loss 0.17. Sau 60.000 bước, mô hình đạt **SacreBLEU 39.17%** — điểm đánh giá chất lượng văn bản tự động, cho thấy khả năng sửa lỗi khá tốt với bộ dữ liệu hiện có.
>
> Đồ thị Val Loss ổn định trong khi Train Loss tiếp tục giảm mạnh — chứng tỏ mô hình không bị overfitting nghiêm trọng."

💡 *Chỉ vào bảng và hai đồ thị khi trình bày để tăng tính trực quan.*

---

## SLIDE 21 – Thuật toán chấm điểm
⏱️ *~1 phút 30 giây*

🎙️
> "Thành phần cuối trong pipeline xử lý là **thuật toán chấm điểm tổ hợp**. Nhóm em thiết kế hệ thống gồm hai lớp:
>
> **Lớp 1 — SequenceMatcher**: Thuật toán so sánh chuỗi giữa bài làm học sinh và đáp án chuẩn. Như trong ví dụ slide, từng từ được đối chiếu và gắn nhãn: **Thay thế / Khớp / Thiếu** — để xác định chính xác lỗi sai ở mức từng từ.
>
> **Lớp 2 — Rule-based**: Áp dụng quy tắc sư phạm cụ thể theo **thang điểm 10** với bốn thành phần:
> - **Chính tả**: tối đa **4 điểm**
> - **Hình thức**: tối đa **3 điểm**
> - **Nội dung**: tối đa **2 điểm**
> - **Sáng tạo**: tối đa **1 điểm**
>
> Kết quả được tự động xếp loại theo dải điểm:
> - [0.0–2.9]: **Cần cố gắng**
> - [3.0–4.9]: **Trung bình**
> - [5.0–6.9]: **Khá**
> - [7.0–8.9]: **Tốt**
> - [9.0–10.0]: **Xuất sắc** ⭐
>
> Sự kết hợp này cho phép hệ thống chấm điểm **linh hoạt và phù hợp với tiêu chí sư phạm**, không chỉ đơn thuần là so sánh chuỗi một cách cứng nhắc."

---

## SLIDE 22 – Section Break: Kiến trúc thiết bị
⏱️ *~10 giây*

🎙️
> "Phần tiếp theo, nhóm em sẽ trình bày về **Kiến trúc thiết bị** — cách toàn bộ hệ thống được xây dựng và triển khai trong thực tế."

💡 *Slide transition ngắn, không cần nói nhiều, chuyển nhanh sang slide tiếp theo.*

---

## SLIDE 23 – Thiết bị & Vai trò hệ thống
⏱️ *~1 phút*

🎙️
> "Xương sống của hệ thống là **Raspberry Pi 4 Model B** — như trong hình, đây chính là thiết bị thực tế mà nhóm em đang sử dụng, được đặt gọn trong case nhỏ màu đỏ-trắng — với cấu hình:
> - CPU Quad-core ARM Cortex-A72, xung nhịp 1.5GHz
> - RAM 4GB
>
> **Vai trò**: Raspberry Pi đóng vai trò là máy chủ Web quản lý toàn bộ dữ liệu lớp học — lưu trữ thông tin học sinh, bài làm, kết quả chấm điểm và lịch sử theo dõi tiến độ.
>
> **Ưu điểm nổi bật**:
> - **Kích thước nhỏ gọn**: Dễ dàng đặt trên bàn hay trong tủ lớp học — như thấy trong ảnh thực tế.
> - **Chi phí thấp**: Khoảng 2–3 triệu đồng.
> - **Tiêu thụ điện cực thấp**: Chỉ 3–7W, tiết kiệm điện đáng kể.
> - **Phù hợp triển khai đại trà**: Ngay cả trường học vùng sâu vùng xa cũng có thể trang bị.
>
> Đây là ưu điểm khác biệt lớn so với các giải pháp yêu cầu máy chủ đám mây hay GPU đắt tiền."

---

## SLIDE 24 – Giải pháp Kết nối & Truy cập từ xa
⏱️ *~1 phút 30 giây*

🎙️
> "Slide này mô tả **kiến trúc kết nối và truy cập từ xa** — một trong những phần kỹ thuật quan trọng đảm bảo tính thực tiễn của sản phẩm.
>
> Luồng hoạt động diễn ra theo **4 lớp từ trên xuống**:
>
> **Lớp 1 – Người dùng**: Giáo viên và học sinh sử dụng laptop hoặc điện thoại để truy cập hệ thống. Kết nối được mã hóa bằng giao thức HTTP ngay từ phía thiết bị đầu cuối.
>
> **Lớp 2 – Cloudflare Network (CDN Toàn cầu)**: Thay vì kết nối thẳng vào Raspberry Pi, toàn bộ lưu lượng đi qua **Cloudflare** — một trong những mạng CDN lớn nhất thế giới. Cloudflare cung cấp: mã hóa **TLS** và **HTTPS** end-to-end, **SSL Certificate** tự động gia hạn, và **bảo vệ DDoS**. Điều này giúp hệ thống có địa chỉ tên miền cố định, bảo mật cao mà không cần IP tĩnh.
>
> **Lớp 3 – Raspberry Pi 4 (Trung tâm xử lý)**: Đây là trái tim của hệ thống, chạy song song hai thành phần:
> - **Web server Vihandgrate.click**: Giao diện web cho giáo viên và học sinh.
> - **Mô hình sửa lỗi và chấm điểm**: Module AI xử lý bài làm và gọi API.
> - **Database (SQL)**: Lưu toàn bộ dữ liệu — bài viết, điểm số, lớp học, người dùng.
>
> **Lớp 4 – Dịch vụ AI bên ngoài**: Raspberry Pi kết nối với hai thành phần AI bên ngoài:
> - **Google Gemini API** qua API Call — xử lý OCR và nhận diện văn bản từ ảnh.
> - **LLM Agent** qua giao thức **MCP server** — đảm nhận vai trò sửa lỗi chính tả và hỗ trợ nâng cao.
>
> Toàn bộ kiến trúc này cho phép giáo viên **truy cập hệ thống từ bất kỳ đâu** — trong lớp học, ở nhà hay trên điện thoại — với bảo mật cao và không yêu cầu cấu hình mạng phức tạp tại trường học."

💡 *Chỉ vào từng lớp trong sơ đồ khi trình bày từng lớp để giúp Hội đồng theo dõi dễ hơn.*

---

## SLIDE 26 – Đóng góp của nghiên cứu
⏱️ *~1 phút 30 giây*

🎙️
> "Nhìn lại toàn bộ nghiên cứu, nhóm em đúc kết được **3 đóng góp chính**:
>
> **Đóng góp 1**: Đây là một ứng dụng quan trọng và hứa hẹn của **thị giác máy tính trong lĩnh vực giáo dục** — là một trong số ít nghiên cứu tại Việt Nam kết hợp xử lý ảnh, OCR và NLP tiếng Việt vào một hệ thống tích hợp dành riêng cho cấp tiểu học.
>
> **Đóng góp 2**: Giúp **giải phóng áp lực chấm bài cho giáo viên**, cải thiện chất lượng học tập của học sinh tiểu học. Với hệ thống này, thời gian chấm một bài chính tả giảm từ 3–5 phút xuống còn dưới 30 giây.
>
> **Đóng góp 3**: **Đẩy mạnh chuyển đổi số trong giáo dục** — góp phần hiện thực hóa chiến lược chuyển đổi số mà Bộ GD&ĐT đang thúc đẩy.
>
> Tuy nhiên, nhóm chúng em cũng thẳng thắn nhìn nhận **giới hạn quan trọng** của nghiên cứu: Việc áp dụng các mô hình này cần phải được thực hiện cẩn thận, **với sự hỗ trợ và giám sát của giáo viên** — AI hỗ trợ, không thay thế hoàn toàn đánh giá của con người."

---

## SLIDE 27 – Hướng phát triển của nghiên cứu
⏱️ *~1 phút 30 giây*

🎙️
> "Nhìn về phía trước, nhóm em đề xuất **4 hướng phát triển tiếp theo**:
>
> **Hướng 1 – Xây dựng mô hình ngôn ngữ nhỏ chạy cục bộ**: Để tối ưu hóa việc nhận diện trên ảnh chụp viết tay — thay thế Gemini API bằng mô hình chạy hoàn toàn trên thiết bị, giúp hệ thống **độc lập hoàn toàn với Internet** và bảo vệ quyền riêng tư dữ liệu học sinh.
>
> **Hướng 2 – Chuẩn hóa sư phạm và mở rộng dữ liệu**: Hợp tác sâu hơn với các chuyên gia giáo dục và giáo viên tiểu học để chuẩn hóa bộ tiêu chí chấm điểm và thu thập thêm dữ liệu thực tế.
>
> **Hướng 3 – Phát triển ứng dụng di động (Mobile App)**: Mở rộng trên nền tảng iOS/Android với giao diện tương tác thân thiện với trẻ em.
>
> **Hướng 4 – Mở rộng tính năng chấm bài**: Tích hợp thêm các phân hệ nhận dạng quang học chuyên biệt để có thể chấm bài thi trắc nghiệm hoặc đọc hiểu công thức toán học, mở rộng phạm vi sang các môn học khác.
>
> Với 4 hướng này, nhóm tin rằng nghiên cứu có tiềm năng phát triển thành một **sản phẩm EdTech thực sự** phục vụ rộng rãi cho nền giáo dục Việt Nam."

---

## LỜI KẾT – Cảm ơn & Mở câu hỏi
⏱️ *~30 giây*

🎙️
> "Kính thưa quý thầy cô và Hội đồng,
>
> Vừa rồi nhóm chúng em đã trình bày toàn bộ nội dung nghiên cứu về **Thiết bị sửa lỗi và chấm điểm chính tả tự động cho học sinh tiểu học** — từ lý do chọn đề tài, các thách thức, phương pháp kỹ thuật, đến kết quả thực tế và hướng phát triển.
>
> Chúng em xin trân trọng cảm ơn **Tiến sĩ Lê Anh Vũ** đã tận tình hướng dẫn trong suốt quá trình thực hiện đề tài. Đồng thời, chúng em rất mong nhận được những nhận xét và câu hỏi quý báu từ Hội đồng để đề tài được hoàn thiện hơn.
>
> **Nhóm em xin kính chào và lắng nghe ý kiến từ Hội đồng!**"

💡 *Cúi đầu nhẹ, nhìn lên Hội đồng, giữ thái độ bình tĩnh và sẵn sàng trả lời câu hỏi.*

---

## 📌 GỢI Ý TRẢ LỜI CÂU HỎI THƯỜNG GẶP

### ❓ Tại sao không dùng GPT-4 Vision thay vì Gemini API?
> "Chúng em đã cân nhắc GPT-4 Vision, tuy nhiên Gemini API có chi phí thấp hơn đáng kể, hỗ trợ tiếng Việt tốt, và có gói miễn phí đủ để thử nghiệm trong phạm vi nghiên cứu. Đây là yếu tố quan trọng khi triển khai cho trường học."

### ❓ Tại sao không chọn Chandra OCR (80–87%) thay Gemini?
> "Chandra OCR đạt kết quả tốt về độ chính xác ký tự, nhưng điểm yếu là không hiểu ngữ cảnh tiếng Việt để phân loại lỗi — ví dụ phân biệt lỗi phụ âm đầu, lỗi vần, lỗi phương ngữ. Gemini vượt trội ở khả năng reasoning ngôn ngữ: vừa nhận diện, vừa hiểu ngữ cảnh sửa lỗi và phân loại lỗi cùng lúc."

### ❓ SacreBLEU 39.17% có đủ tốt không?
> "Chỉ số SacreBLEU 39.17% trên tập dữ liệu tiếng Việt đặc thù là kết quả khá tốt trong điều kiện fine-tune chỉ 1 epoch với dữ liệu hạn chế. Best Checkpoint tại Step 15.000 cho thấy Val Loss 0.17 là điểm tối ưu. Với bộ dữ liệu lớn hơn và nhiều epoch hơn, chỉ số này có thể cải thiện đáng kể. Đây là một trong những hướng phát triển tiếp theo."

### ❓ Thang điểm chấm như thế nào?
> "Hệ thống chấm theo thang điểm 10 với 4 thành phần: Chính tả (tối đa 4 điểm), Hình thức (tối đa 3 điểm), Nội dung (tối đa 2 điểm) và Sáng tạo (tối đa 1 điểm). Xếp loại tự động: Cần cố gắng [0–2.9] / Trung bình [3–4.9] / Khá [5–6.9] / Tốt [7–8.9] / Xuất sắc [9–10]."

### ❓ Hệ thống có thể xử lý bài viết của học sinh lớp 1 không?
> "Đây là thách thức lớn nhất vì nét chữ học sinh lớp 1 rất chưa thành thục. Pipeline tiền xử lý 9 bước của chúng em giúp cải thiện đáng kể, và Gemini với khả năng hiểu ngữ cảnh hình ảnh tốt cũng xử lý được phần lớn trường hợp. Với bài viết chất lượng quá kém, hệ thống sẽ thông báo cho giáo viên để can thiệp thủ công."

### ❓ Chi phí triển khai thực tế là bao nhiêu?
> "Chi phí phần cứng Raspberry Pi 4 khoảng 2–3 triệu đồng. Sử dụng Gemini API theo gói miễn phí hoặc trả phí nhỏ. Toàn bộ phần mềm là mã nguồn mở. So với việc thuê thêm giáo viên trợ giảng hay các giải pháp thương mại khác, đây là mức chi phí rất hợp lý."

### ❓ Dữ liệu học sinh có được bảo mật không?
> "Toàn bộ dữ liệu học sinh được lưu trữ cục bộ trên Raspberry Pi trong lớp học thông qua SQLite, không tự động đưa lên đám mây. Chỉ ảnh bài làm mới được gửi lên Gemini API, và Google có chính sách bảo mật dữ liệu rõ ràng. Trong hướng phát triển tương lai, chúng em sẽ chuyển sang mô hình chạy cục bộ hoàn toàn để giải quyết triệt để vấn đề này."

### ❓ Tên miền Vihandgrate.click là gì?
> "Đây là tên miền thực tế mà hệ thống đang hoạt động. 'Vihand' là viết tắt của Vietnamese Handwriting — nhận dạng chữ viết tay tiếng Việt, 'Grade' là chấm điểm. Tên miền được cấu hình qua Cloudflare để đảm bảo bảo mật HTTPS và truy cập từ xa ổn định."

---

*Script được cập nhật theo nội dung slide thuyết trình tại Hội đồng Nghiệm thu NCKH Sinh viên – Khoa Điện Điện Tử, TP.HCM, ngày 01/06/2026.*
*Cấu trúc slide mới: **1, 2, 3, 4, 6, 8, 9, 11, 12, 14, 15, 19, 20, 21, 22, 23, 24, 26, 27** (19 slide tổng cộng)*
