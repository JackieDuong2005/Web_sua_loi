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

---

## SLIDE 1 – Trang bìa
⏱️ *~30 giây*

🎙️
> "Kính thưa quý thầy cô trong Hội đồng Nghiệm thu, thưa các bạn sinh viên có mặt hôm nay.
>
> Cho phép nhóm chúng em được bắt đầu buổi bảo vệ đề tài Nghiên cứu Khoa học Sinh viên năm học 2025–2026 tại Khoa Điện – Điện Tử.
>
> Trước tiên, em xin trân trọng cảm ơn Hội đồng đã dành thời gian lắng nghe và đánh giá công trình của nhóm chúng em."

💡 *Nhìn thẳng vào Hội đồng, giọng tự tin, nhịp độ vừa phải.*

---

## SLIDE 2 – Giới thiệu đề tài & nhóm nghiên cứu
⏱️ *~45 giây*

🎙️
> "Đề tài chúng em thực hiện có tên:
>
> **'Phát triển thiết bị sửa lỗi và chấm điểm chính tả tự động cho học sinh tiểu học.'**
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
> "Để hiểu vì sao nhóm chúng em chọn đề tài này, hãy hình dung một lớp học tiểu học điển hình ở Việt Nam với **35 đến 45 học sinh**, giáo viên phải chấm bài tay — mỗi bài mất từ **3 đến 5 phút**. Điều đó có nghĩa là, chỉ để chấm một bài chính tả cho cả lớp, giáo viên cần tới **hơn 3 tiếng đồng hồ**. Đây là áp lực rất lớn và lặp đi lặp lại hàng tuần.
>
> Xuất phát từ thực tế đó, nhóm chúng em nhận thấy ba động lực chính để tiến hành nghiên cứu này:
>
> **Thứ nhất**, chữ viết tay tiếng Việt của học sinh tiểu học có những đặc thù riêng về cấu trúc dấu thanh và nét viết mà chưa có nghiên cứu nào giải quyết triệt để.
>
> **Thứ hai**, sự bùng nổ của các mô hình AI đa phương thức — đặc biệt là các mô hình có khả năng xử lý đồng thời hình ảnh và ngôn ngữ — mở ra cơ hội mới để giải quyết bài toán nhận dạng chữ viết tay với chi phí phần cứng thấp.
>
> **Thứ ba**, đây là bài toán có tính **cấp thiết cho quá trình chuyển đổi số giáo dục tại Việt Nam**, đặc biệt ở cấp tiểu học nơi nền tảng kiến thức chính tả được hình thành."

💡 *Có thể dừng lại 1–2 giây sau mỗi 'Thứ nhất / Thứ hai / Thứ ba' để nhấn mạnh.*

---

## SLIDE 4 – Thách thức nghiên cứu
⏱️ *~1 phút 30 giây*

🎙️
> "Tuy nhiên, để giải quyết bài toán này không hề đơn giản. Nhóm chúng em đã đối mặt với **5 thách thức nghiên cứu** chính:
>
> **Một là**, thiếu bộ dữ liệu chuẩn: Hiện chưa có corpus tiếng Việt nào được gán nhãn chuyên biệt cho chữ viết tay học sinh tiểu học. Nhóm em phải tự thu thập và tổng hợp dữ liệu.
>
> **Hai là**, đặc thù phức tạp của chữ viết tay tiếng Việt: Tiếng Việt có hệ thống dấu thanh và dấu phụ phức tạp — 6 thanh điệu, nhiều ký tự đặc biệt — cùng với nhiễu từ giấy ô ly, nét viết chưa thành thục của trẻ em, gây khó khăn lớn cho các thuật toán nhận diện.
>
> **Ba là**, chất lượng ảnh đầu vào: Ảnh chụp bằng điện thoại thường gặp các vấn đề như mờ, nghiêng, ánh sáng không đều — ảnh hưởng trực tiếp đến độ chính xác nhận diện.
>
> **Bốn là**, rào cản công nghệ AI: Việc tích hợp và tinh chỉnh mô hình ngôn ngữ lớn để hiểu ngữ cảnh sửa lỗi chính tả là một thách thức kỹ thuật đòi hỏi kiến thức chuyên sâu.
>
> **Năm là**, giới hạn tài nguyên phần cứng: Toàn bộ hệ thống phải chạy được trên phần cứng nhúng chi phí thấp — cụ thể là Raspberry Pi 4 — nhằm đảm bảo tính khả thi khi triển khai đại trà tại các trường tiểu học."

---

## SLIDE 5 – Mục tiêu nghiên cứu
⏱️ *~1 phút*

🎙️
> "Từ những thách thức đó, nhóm xác định **mục tiêu tổng quát** của đề tài là:
>
> *'Cung cấp một công cụ hỗ trợ nhận dạng chữ viết tay tiếng Việt và chấm điểm, sửa lỗi chính tả tự động.'*
>
> Cụ thể hơn, mục tiêu được chia thành hai nhóm:
>
> Về **kỹ thuật**: Xây dựng pipeline xử lý ảnh hoàn chỉnh từ khâu tiền xử lý, nhận diện OCR, sửa lỗi chính tả đến chấm điểm tự động; tích hợp mô hình AI phù hợp đạt độ chính xác cao trong điều kiện phần cứng giới hạn.
>
> Về **sư phạm**: Sản phẩm phải thực sự giúp giáo viên tiết kiệm thời gian chấm bài, đồng thời cung cấp phản hồi chính xác và hữu ích cho học sinh."

---

## SLIDE 6 – Đối tượng, nội dung, môi trường nghiên cứu
⏱️ *~45 giây*

🎙️
> "Về **đối tượng nghiên cứu**: Nhóm tập trung vào bài chính tả viết tay của học sinh lớp 1 đến lớp 5 tại các trường tiểu học.
>
> **Nội dung** nghiên cứu bao gồm ba lớp kỹ thuật: xử lý ảnh, nhận dạng ký tự quang học (OCR) và xử lý ngôn ngữ tự nhiên tiếng Việt.
>
> **Môi trường** triển khai hướng đến là các lớp học tiểu học thực tế, với hệ thống Web chạy trên Raspberry Pi và giáo viên sử dụng điện thoại thông minh để chụp ảnh bài làm."

---

## SLIDE 7 – Quy trình hoạt động của thiết bị
⏱️ *~1 phút*

🎙️
> "Đây là **quy trình hoạt động tổng thể** của thiết bị, gồm 5 giai đoạn nối tiếp nhau:
>
> 1. **Tiền xử lý ảnh**: Ảnh chụp bài làm của học sinh được đưa qua pipeline 9 bước xử lý để chuẩn hóa chất lượng.
>
> 2. **Mô hình phát hiện**: Sử dụng mô hình AI nhận diện văn bản trong ảnh (OCR).
>
> 3. **Mô hình sửa lỗi chính tả**: Văn bản được trích xuất sẽ được đưa qua mô hình ngôn ngữ để phát hiện và sửa lỗi chính tả.
>
> 4. **Thuật toán chấm điểm**: So sánh đáp án học sinh với đáp án chuẩn, cho điểm theo quy tắc sư phạm.
>
> 5. **Hệ thống Web**: Kết quả được hiển thị trực quan qua giao diện Web cho giáo viên và học sinh.
>
> Toàn bộ quy trình này diễn ra **tự động**, chỉ cần giáo viên chụp ảnh bài làm và upload lên hệ thống."

---

## SLIDE 8 – Tiền xử lý ảnh 9 bước
⏱️ *~1 phút 30 giây*

🎙️
> "Giai đoạn tiền xử lý là nền tảng quyết định chất lượng toàn bộ pipeline. Nhóm em thiết kế pipeline **9 bước** được chia thành 3 giai đoạn:
>
> **Giai đoạn 1 – Chuẩn hóa hình học:**
> - Bước 1: Xoay và lật ảnh — tự động phát hiện và điều chỉnh hướng ảnh.
> - Bước 2: Resize hình ảnh về kích thước chuẩn để đồng nhất đầu vào.
> - Bước 3: Cân bằng trắng — loại bỏ sai lệch màu sắc do ánh sáng môi trường.
> - Bước 4: Chuyển sang không gian màu xám để giảm chiều dữ liệu.
>
> **Giai đoạn 2 – Tăng cường chất lượng:**
> - Bước 5: Khử bóng đổ — vấn đề rất phổ biến khi chụp ảnh sách vở.
> - Bước 6: Tăng cường tương phản giúp chữ nổi rõ hơn trên nền giấy.
> - Bước 7: Làm sắc nét cạnh chữ.
>
> **Giai đoạn 3 – Phân tách và kiểm định:**
> - Bước 8: Nhị phân hóa — chuyển ảnh về dạng trắng-đen thuần túy, tối ưu cho OCR.
> - Bước 9: Kiểm định chất lượng ảnh — nếu ảnh không đạt ngưỡng chất lượng, hệ thống sẽ thông báo yêu cầu chụp lại.
>
> Pipeline này đảm bảo rằng dù ảnh đầu vào có điều kiện ánh sáng hay góc độ như thế nào, đầu ra luôn được chuẩn hóa tốt nhất có thể."

---

## SLIDE 9 – Mô hình đề xuất
⏱️ *~1 phút*

🎙️
> "Về kiến trúc mô hình tổng thể, nhóm em đề xuất một hệ thống **kết hợp ba thành phần chính**:
>
> - **Gemini API** của Google: Đảm nhận vai trò nhận diện văn bản (OCR) từ ảnh chụp bài làm. Đây là mô hình đa phương thức có khả năng hiểu đồng thời hình ảnh và văn bản.
>
> - **Mô hình ViT5**: Được fine-tune để sửa lỗi chính tả tiếng Việt theo bài toán Sequence-to-Sequence.
>
> - **Thuật toán chấm điểm tổ hợp**: Kết hợp SequenceMatcher và Rule-based để cho điểm linh hoạt và chính xác theo tiêu chí sư phạm.
>
> Toàn bộ hệ thống được tích hợp trong một ứng dụng Web chạy trên Raspberry Pi 4."

---

## SLIDE 10 – Kết quả mô hình nhận diện (Tổng quan)
⏱️ *~45 giây*

🎙️
> "Trong quá trình đánh giá, nhóm em đã thử nghiệm nhiều mô hình OCR khác nhau — bao gồm các mô hình mã nguồn mở và thương mại — để so sánh và lựa chọn giải pháp phù hợp nhất.
>
> Bảng kết quả cho thấy **Gemini API vượt trội rõ rệt** so với các giải pháp còn lại trên cả ba tiêu chí đánh giá mà nhóm đặt ra, đặc biệt trong điều kiện ảnh chụp chưa qua tiền xử lý — tức là điều kiện khắt khe nhất."

---

## SLIDE 11 – Kết quả mô hình nhận diện (Chi tiết)
⏱️ *~1 phút 30 giây*

🎙️
> "Đi vào chi tiết, **Gemini API hoàn toàn đáp ứng xuất sắc cả 3 tiêu chí** mà nhóm đề ra:
>
> **Tiêu chí 1 – Độ chính xác**: Gemini đạt độ chính xác OCR từ **85% đến 95%** trên tập dữ liệu thử nghiệm, kể cả với ảnh chụp chưa qua tiền xử lý. Con số này vượt xa các mô hình truyền thống như Tesseract hay EasyOCR trong cùng điều kiện.
>
> **Tiêu chí 2 – Độ ổn định**: Mô hình xử lý trong vòng **dưới 30 giây** mỗi bài và trả về dữ liệu JSON ổn định, có cấu trúc — điều này rất quan trọng để tích hợp vào hệ thống tự động.
>
> **Tiêu chí 3 – Tính thực tiễn**: Đây có lẽ là ưu điểm quan trọng nhất — Gemini API **không đòi hỏi phần cứng đắt đỏ**, không cần GPU hay máy chủ công suất cao. Hệ thống có thể chạy trên Raspberry Pi 4 với chi phí cực thấp, phù hợp với điều kiện trường học Việt Nam.
>
> Ngoài ra, khả năng hiểu ngữ cảnh để sửa lỗi và tiềm năng lưu trữ, tự động hóa cao cũng mang lại hiệu quả kinh tế và sư phạm đáng kể."

💡 *Dừng lại khoảng 2 giây sau mỗi tiêu chí để tạo ấn tượng.*

---

## SLIDE 12 – Mô hình sửa lỗi chính tả (Tổng quan)
⏱️ *~45 giây*

🎙️
> "Tiếp theo là thành phần **sửa lỗi chính tả**. Sau khi OCR trả về văn bản thô, hệ thống cần một mô hình ngôn ngữ đủ mạnh để hiểu ngữ cảnh tiếng Việt và sửa lỗi một cách chính xác.
>
> Nhóm em đánh giá các mô hình sửa lỗi trên 4 tiêu chí: chất lượng sửa lỗi, tương thích miền dữ liệu, hiệu năng phần cứng và khả năng tích hợp chấm điểm. Kết quả cho thấy mô hình **ViT5** là lựa chọn tối ưu cho bài toán này."

---

## SLIDE 13 – Mô hình sửa lỗi chính tả (ViT5 – Chi tiết kỹ thuật)
⏱️ *~2 phút*

🎙️
> "Hãy để em trình bày chi tiết hơn về **kiến trúc ViT5**:
>
> ViT5 có nền tảng là kiến trúc **T5 — Text-to-Text Transfer Transformer** của Google, một trong những kiến trúc Transformer mạnh nhất hiện tại. Điểm đặc biệt là ViT5 đã được **tiền huấn luyện trên corpus tiếng Việt quy mô lớn** với **226 triệu tham số** theo cấu trúc Encoder-Decoder.
>
> Với ViT5, bài toán sửa lỗi chính tả được chuyển thành bài toán **Seq2Seq**: mô hình nhận vào câu có lỗi và 'dịch' nó thành câu đúng — tương tự như dịch máy. Nhờ vào quá trình tiền huấn luyện, mô hình đã nắm bắt được ngữ pháp và ngữ cảnh toàn câu tiếng Việt một cách tự nhiên.
>
> Về kết quả fine-tune của nhóm em:
>
> | Bước (Step) | Train Loss | Val Loss | SacreBLEU |
> |:-----------:|:----------:|:--------:|:---------:|
> | 5           | 0.319      | 0.198    | 38.10%    |
> | 15          | 0.145      | 0.170    | 38.84%    |
> | 60          | 0.050      | 0.199    | 39.17%    |
>
> Sau 60 bước huấn luyện, mô hình đạt **SacreBLEU 39.17%** — đây là chỉ số đánh giá chất lượng văn bản tự động, cho thấy khả năng sửa lỗi khá tốt với bộ dữ liệu hiện có.
>
> Một điểm đáng chú ý là train loss tiếp tục giảm mạnh, trong khi val loss khá ổn định — điều này chứng tỏ mô hình không bị overfitting nghiêm trọng."

💡 *Khi nói về bảng số liệu, có thể chỉ vào slide để tăng tính trực quan.*

---

## SLIDE 14 – Thuật toán chấm điểm
⏱️ *~1 phút*

🎙️
> "Thành phần cuối cùng trong pipeline xử lý là **thuật toán chấm điểm**. Nhóm em thiết kế một hệ thống chấm điểm tổ hợp gồm hai lớp:
>
> **Lớp 1 — SequenceMatcher**: Thuật toán so sánh chuỗi ký tự giữa bài làm học sinh và đáp án chuẩn, xác định chính xác từng từ đúng/sai ở mức ký tự.
>
> **Lớp 2 — Rule-based**: Áp dụng các quy tắc sư phạm cụ thể — ví dụ: lỗi dấu thanh tính điểm trừ khác lỗi từ hoàn toàn sai; viết hoa sai có mức phạt riêng; v.v.
>
> Sự kết hợp này cho phép hệ thống chấm điểm **linh hoạt và phù hợp với tiêu chí của Bộ Giáo dục**, không chỉ đơn thuần là so sánh chuỗi một cách cứng nhắc."

---

## SLIDE 15 – Kiến trúc thiết bị
⏱️ *~45 giây*

🎙️
> "Về **kiến trúc tổng thể của thiết bị**, hệ thống được tổ chức theo mô hình phân tán đơn giản:
>
> - Giáo viên sử dụng điện thoại thông minh để chụp ảnh bài làm và truy cập Web qua trình duyệt.
> - Raspberry Pi 4 đóng vai trò máy chủ trung tâm, chạy toàn bộ backend xử lý.
> - Gemini API và ViT5 được tích hợp vào backend để xử lý OCR và sửa lỗi.
>
> Thiết kế này đảm bảo **giáo viên không cần cài đặt bất kỳ phần mềm nào** — chỉ cần kết nối mạng và dùng trình duyệt là đủ."

---

## SLIDE 16 – Thiết bị & Vai trò hệ thống
⏱️ *~1 phút*

🎙️
> "Xương sống của hệ thống là **Raspberry Pi 4 Model B** với cấu hình:
> - CPU Quad-core ARM Cortex-A72, xung nhịp 1.5GHz
> - RAM 4GB LPDDR4
>
> **Vai trò**: Raspberry Pi đóng vai trò là máy chủ Web quản lý toàn bộ dữ liệu lớp học — lưu trữ thông tin học sinh, bài làm, kết quả chấm điểm và lịch sử theo dõi tiến độ.
>
> **Tại sao chọn Raspberry Pi?** Đây là câu hỏi mà nhóm em đã cân nhắc kỹ:
> - **Kích thước nhỏ gọn**: Dễ dàng đặt trong tủ lớp học.
> - **Chi phí thấp**: Chỉ khoảng 2–3 triệu đồng.
> - **Tiêu thụ điện cực thấp**: Chỉ 3–7W, tiết kiệm điện đáng kể.
> - **Phù hợp triển khai đại trà**: Ngay cả trường học vùng sâu vùng xa cũng có thể trang bị.
>
> Đây là ưu điểm khác biệt lớn so với các giải pháp yêu cầu máy chủ đám mây hay GPU đắt tiền."

---

## SLIDE 17 – Giải pháp kết nối & Truy cập từ xa
⏱️ *~1 phút*

🎙️
> "Một trong những thách thức thực tiễn quan trọng là **kết nối và truy cập từ xa**. Nhóm em triển khai giải pháp như sau:
>
> - Raspberry Pi tạo một **mạng Wi-Fi nội bộ** trong lớp học, cho phép giáo viên và học sinh kết nối trực tiếp mà không cần Internet.
>
> - Ngoài ra, hệ thống hỗ trợ **truy cập từ xa qua tunneling** — ví dụ: giáo viên có thể xem lại kết quả từ nhà sau giờ học.
>
> - Giao diện Web được thiết kế **responsive**, hoạt động tốt trên cả điện thoại, máy tính bảng và máy tính xách tay.
>
> Nhờ thiết kế này, hệ thống có thể hoạt động ngay cả trong môi trường **không có kết nối Internet ổn định** — điều rất phổ biến tại các trường tiểu học vùng nông thôn."

---

## SLIDE 18 – Đóng góp của nghiên cứu
⏱️ *~1 phút 30 giây*

🎙️
> "Nhìn lại toàn bộ nghiên cứu, nhóm em đúc kết được **3 đóng góp chính**:
>
> **Đóng góp 1 – Ứng dụng thị giác máy tính trong giáo dục**: Đây là một trong số ít nghiên cứu tại Việt Nam kết hợp xử lý ảnh, OCR và NLP tiếng Việt vào một hệ thống tích hợp dành riêng cho cấp tiểu học.
>
> **Đóng góp 2 – Giải phóng áp lực cho giáo viên**: Với hệ thống này, thời gian chấm một bài chính tả giảm từ 3–5 phút xuống còn dưới 30 giây. Giáo viên có thêm thời gian để tập trung vào giảng dạy và hỗ trợ học sinh.
>
> **Đóng góp 3 – Thúc đẩy chuyển đổi số giáo dục**: Sản phẩm góp phần hiện thực hóa chiến lược chuyển đổi số trong giáo dục mà Bộ GD&ĐT đang thúc đẩy.
>
> Tuy nhiên, nhóm chúng em cũng thẳng thắn nhìn nhận **giới hạn của nghiên cứu**: Hệ thống AI cần được giám sát bởi giáo viên, không thể hoàn toàn thay thế đánh giá của con người, đặc biệt với những trường hợp đặc biệt hoặc bài viết sáng tạo."

---

## SLIDE 19 – Hướng phát triển
⏱️ *~1 phút 30 giây*

🎙️
> "Nhìn về phía trước, nhóm em đề xuất **4 hướng phát triển tiếp theo**:
>
> **Hướng 1 – Mô hình ngôn ngữ nhỏ chạy cục bộ (Local LLM)**: Thay thế Gemini API bằng mô hình chạy hoàn toàn trên thiết bị, giúp hệ thống **độc lập hoàn toàn với Internet**, giảm chi phí vận hành và bảo vệ quyền riêng tư dữ liệu học sinh.
>
> **Hướng 2 – Chuẩn hóa sư phạm và mở rộng dữ liệu**: Hợp tác với các chuyên gia giáo dục và giáo viên tiểu học để xây dựng bộ tiêu chí chấm điểm chuẩn hóa và thu thập thêm dữ liệu thực tế.
>
> **Hướng 3 – Ứng dụng di động (Mobile App)**: Phát triển ứng dụng iOS/Android với giao diện thân thiện với trẻ em, mở rộng khả năng tiếp cận của hệ thống.
>
> **Hướng 4 – Mở rộng tính năng chấm bài**: Tích hợp thêm khả năng chấm bài thi trắc nghiệm và nhận dạng công thức toán học, mở rộng phạm vi ứng dụng sang các môn học khác.
>
> Với 4 hướng này, nhóm tin rằng nghiên cứu có tiềm năng phát triển thành một **sản phẩm EdTech thực sự** phục vụ rộng rãi cho nền giáo dục Việt Nam."

---

## LỜI KẾT – Cảm ơn & Mở câu hỏi
⏱️ *~30 giây*

🎙️
> "Kính thưa quý thầy cô và Hội đồng,
>
> Vừa rồi nhóm chúng em đã trình bày toàn bộ nội dung nghiên cứu về **Thiết bị sửa lỗi và chấm điểm chính tả tự động cho học sinh tiểu học**.
>
> Chúng em xin trân trọng cảm ơn **Tiến sĩ Lê Anh Vũ** đã tận tình hướng dẫn trong suốt quá trình thực hiện đề tài. Đồng thời, chúng em rất mong nhận được những nhận xét và câu hỏi quý báu từ Hội đồng để đề tài được hoàn thiện hơn.
>
> **Nhóm em xin kính chào và lắng nghe ý kiến từ Hội đồng!**"

💡 *Cúi đầu nhẹ, nhìn lên Hội đồng, giữ thái độ bình tĩnh và sẵn sàng trả lời câu hỏi.*

---

## 📌 GỢI Ý TRẢ LỜI CÂU HỎI THƯỜNG GẶP

### ❓ Tại sao không dùng GPT-4 Vision thay vì Gemini API?
> "Chúng em đã cân nhắc GPT-4 Vision, tuy nhiên Gemini API có chi phí thấp hơn đáng kể, hỗ trợ tiếng Việt tốt, và quan trọng là có gói miễn phí đủ để thử nghiệm trong phạm vi nghiên cứu. Đây là yếu tố quan trọng khi triển khai cho trường học."

### ❓ SacreBLEU 39.17% có đủ tốt không?
> "Chỉ số SacreBLEU 39.17% trên tập dữ liệu tiếng Việt đặc thù là kết quả khá tốt trong điều kiện fine-tune với dữ liệu hạn chế. Chúng em nhận thấy rằng với bộ dữ liệu lớn hơn và nhiều bước huấn luyện hơn, chỉ số này có thể cải thiện đáng kể. Đây là một trong những hướng phát triển tiếp theo của đề tài."

### ❓ Hệ thống có thể xử lý bài viết của học sinh lớp 1 không?
> "Đây là thách thức lớn nhất vì nét chữ học sinh lớp 1 rất chưa thành thục. Pipeline tiền xử lý 9 bước của chúng em giúp cải thiện đáng kể, và Gemini với khả năng hiểu ngữ cảnh hình ảnh tốt cũng xử lý được phần lớn trường hợp. Tuy nhiên, với bài viết quá kém chất lượng, hệ thống sẽ thông báo cho giáo viên để can thiệp thủ công."

### ❓ Chi phí triển khai thực tế là bao nhiêu?
> "Chi phí phần cứng Raspberry Pi 4 khoảng 2–3 triệu đồng. Sử dụng Gemini API theo gói miễn phí hoặc trả phí nhỏ. Toàn bộ phần mềm là mã nguồn mở. So với việc thuê thêm giáo viên trợ giảng hay các giải pháp thương mại khác, đây là mức chi phí rất hợp lý."

### ❓ Dữ liệu học sinh có được bảo mật không?
> "Toàn bộ dữ liệu được lưu trữ cục bộ trên Raspberry Pi trong lớp học, không tự động đưa lên đám mây. Chỉ ảnh gửi lên Gemini API là ra ngoài, nhưng Google có chính sách bảo mật dữ liệu rõ ràng. Trong hướng phát triển tương lai, chúng em sẽ chuyển sang mô hình chạy cục bộ hoàn toàn để giải quyết triệt để vấn đề này."

---

*Script được tạo dựa trên nội dung slide thuyết trình tại Hội đồng Nghiệm thu NCKH Sinh viên – Khoa Điện Điện Tử, TP.HCM, ngày 01/06/2026.*
