# 🛡️ TÀI LIỆU PHẢN BIỆN & BẢO VỆ NGHIÊN CỨU – 8 PHÚT
## Hội đồng Nghiệm thu NCKH Sinh viên – Khoa Điện – Điện Tử

---

> **Hướng dẫn sử dụng**
> - Tài liệu này dự đoán **các câu hỏi chất vấn** từ Hội đồng và gợi ý câu trả lời mạnh, súc tích.
> - Mỗi câu trả lời thiết kế trong vòng **30–60 giây**.
> - Ưu tiên: **thừa nhận giới hạn trước → giải thích lý do → nêu hướng khắc phục**.
> - Thái độ: **tự tin nhưng khiêm tốn**, không phòng thủ.

---

## 🔢 SỐ LIỆU CỐT LÕI CẦN THUỘC LÒNG

| Chỉ số | Giá trị |
|--------|---------|
| Độ chính xác OCR (Gemini) | **85 – 95%** |
| Thời gian xử lý mỗi bài | **< 30 giây** |
| SacreBLEU (ViT5 sau fine-tune) | **39.17%** tại Step 60.000 |
| Best checkpoint Val Loss | **0.17** tại Step 15.000 |
| Tham số ViT5 | **226 triệu** |
| Chi phí Raspberry Pi 4 | **2 – 3 triệu đồng** |
| Tiêu thụ điện | **3 – 7W** |
| Thang điểm chấm | **10 điểm** (Chính tả 4đ + Hình thức 3đ + Nội dung 2đ + Sáng tạo 1đ) |
| Số bước tiền xử lý | **9 bước** / 3 giai đoạn |
| Số mô hình OCR so sánh | **5 mô hình** |

---

## ❓ NHÓM 1 – CÂU HỎI VỀ KỸ THUẬT & MÔ HÌNH

---

### Q1: Tại sao dùng Gemini API thay vì tự xây dựng mô hình OCR?

> **Trả lời:**
> "Thưa thầy/cô, trong phạm vi nghiên cứu sinh viên với nguồn lực hạn chế, việc tự xây dựng mô hình OCR tiếng Việt đạt chất lượng tương đương đòi hỏi hàng chục nghìn ảnh gán nhãn và tài nguyên tính toán lớn. Gemini API là mô hình đa phương thức được Google huấn luyện trên corpus khổng lồ, đạt **85–95%** độ chính xác ngay cả trên ảnh chưa qua tiền xử lý — vượt trội hoàn toàn so với các giải pháp mã nguồn mở chúng em thử nghiệm.
>
> Đặc biệt, Gemini không chỉ nhận dạng ký tự mà còn **hiểu ngữ cảnh ngôn ngữ** để phân loại lỗi theo từng loại — điều mà OCR truyền thống không làm được. Đây là lý do chúng em chọn giải pháp này cho giai đoạn nghiên cứu hiện tại, và trong hướng phát triển, chúng em sẽ chuyển sang mô hình cục bộ để giải quyết vấn đề phụ thuộc Internet."

---

### Q2: SacreBLEU 39.17% có thực sự đủ tốt để triển khai thực tế không?

> **Trả lời:**
> "Thưa thầy/cô, đây là câu hỏi rất xác đáng. SacreBLEU 39.17% là chỉ số đánh giá **chất lượng dịch văn bản** — trong bài toán sửa lỗi chính tả Seq2Seq, đây là mức **khá tốt** với bộ dữ liệu hiện có chỉ khoảng 1 epoch huấn luyện.
>
> Để so sánh: các mô hình dịch máy thương mại thường đạt 40–50 BLEU trên dữ liệu hàng triệu câu. Chúng em fine-tune với dữ liệu tiếng Việt đặc thù hạn chế hơn.
>
> Quan trọng hơn, trong hệ thống của nhóm, ViT5 được kết hợp với **Rule-based scoring** — nên ngay cả khi mô hình sửa lỗi chưa hoàn hảo 100%, hệ thống chấm điểm vẫn có cơ chế kiểm soát và giáo viên là người xác nhận cuối cùng. Chúng em nhìn nhận đây là **kết quả bước đầu** và xác định mở rộng dữ liệu là ưu tiên phát triển tiếp theo."

---

### Q3: Tại sao chọn ViT5 mà không dùng PhoBERT, BARTpho hay ChatGPT?

> **Trả lời:**
> "Chúng em đã đánh giá theo 4 tiêu chí: chất lượng sửa lỗi, tương thích miền dữ liệu, hiệu năng phần cứng và khả năng tích hợp chấm điểm.
>
> - **PhoBERT** là mô hình BERT — kiến trúc Encoder-only, phù hợp phân loại nhưng **không phù hợp bài toán Seq2Seq** sinh văn bản mới.
> - **BARTpho** là lựa chọn tốt nhưng tài nguyên yêu cầu cao hơn ViT5 trên Raspberry Pi.
> - **ChatGPT** (GPT-4) chi phí API cao hơn nhiều và không phù hợp triển khai chi phí thấp.
> - **ViT5** với kiến trúc T5 Encoder-Decoder **được thiết kế chính xác cho bài toán Seq2Seq**, đã tiền huấn luyện trên tiếng Việt, và chạy được trên phần cứng hạn chế sau khi quantization."

---

### Q4: Pipeline 9 bước tiền xử lý — cụ thể bước nào đóng góp nhiều nhất?

> **Trả lời:**
> "Qua thực nghiệm, nhóm em nhận thấy 3 bước có đóng góp lớn nhất:
> - **Bước 5 – Khử bóng đổ**: Cải thiện rõ rệt nhất với ảnh chụp bằng đèn flash hoặc ánh sáng lệch.
> - **Bước 8 – Nhị phân hóa**: Loại bỏ hoàn toàn nhiễu màu, đưa ảnh về trắng-đen giúp OCR tập trung vào nét chữ.
> - **Bước 1 – Xoay, lật ảnh**: Giải quyết vấn đề phổ biến nhất khi giáo viên chụp nghiêng.
>
> Các bước còn lại có tính tích lũy — đóng góp khoảng **5–10% cải thiện tổng thể** trên bộ dữ liệu thử nghiệm của nhóm."

---

### Q5: Tại sao lại dùng SQLite mà không dùng MySQL hay PostgreSQL?

> **Trả lời:**
> "SQLite phù hợp hoàn toàn với môi trường triển khai cục bộ trên Raspberry Pi vì: không cần cài đặt server riêng biệt, tiêu thụ ít RAM, đọc/ghi hiệu quả cho quy mô một lớp học (dưới 50 học sinh). MySQL hay PostgreSQL có ưu điểm hơn ở quy mô lớn hàng nghìn người dùng đồng thời — điều này không phù hợp với thiết kế hiện tại. Khi mở rộng lên cấp trường hay cấp quận, chúng em sẽ xem xét chuyển sang database mạnh hơn."

---

## ❓ NHÓM 2 – CÂU HỎI VỀ DỮ LIỆU & PHƯƠNG PHÁP

---

### Q6: Bộ dữ liệu thử nghiệm có bao nhiêu mẫu? Thu thập như thế nào?

> **Trả lời:**
> "Đây là một trong những thách thức lớn nhất của đề tài. Hiện tại bộ dữ liệu thử nghiệm của nhóm bao gồm các ảnh bài chính tả thực tế được thu thập từ nhiều nguồn: ảnh chụp bài viết tay học sinh tiểu học do nhóm tự thu thập, kết hợp với một số dataset công khai.
>
> Chúng em thừa nhận đây là giới hạn lớn của nghiên cứu — **quy mô dữ liệu chưa đủ lớn** để có kết quả thống kê hoàn toàn đại diện. Đây cũng là lý do chúng em xác định 'Mở rộng dữ liệu và chuẩn hóa sư phạm' là hướng phát triển ưu tiên số 2, thông qua hợp tác với giáo viên và chuyên gia giáo dục."

---

### Q7: Làm thế nào để đánh giá độ chính xác OCR 85–95%? Ground truth là gì?

> **Trả lời:**
> "Chúng em đánh giá bằng cách: cho từng mô hình OCR nhận diện một tập ảnh bài viết tay, sau đó so sánh văn bản trích xuất được với **đáp án chuẩn do con người gán nhãn thủ công** (ground truth). Tỷ lệ từ nhận diện đúng trên tổng số từ cho ra độ chính xác từng mô hình. Toàn bộ 5 mô hình được thử nghiệm trên **cùng một bộ dữ liệu chưa qua tiền xử lý** để đảm bảo so sánh công bằng."

---

### Q8: Hệ thống đã được thử nghiệm thực tế tại trường học chưa?

> **Trả lời:**
> "Trong giai đoạn nghiên cứu hiện tại, hệ thống đã được thử nghiệm **trong môi trường phòng lab** với dữ liệu thực tế. Chúng em chưa triển khai thí điểm tại trường học thực tế — đây là bước tiếp theo cần thực hiện để thu thập phản hồi từ giáo viên và điều chỉnh hệ thống theo điều kiện thực tiễn. Nhóm nhận thức đây là khoảng cách giữa nghiên cứu và ứng dụng thực tế cần được thu hẹp trong các bước phát triển tiếp theo."

---

## ❓ NHÓM 3 – CÂU HỎI VỀ TÍNH THỰC TIỄN & SƯ PHẠM

---

### Q9: Giáo viên có cần đào tạo kỹ thuật để sử dụng không?

> **Trả lời:**
> "Không. Toàn bộ giao diện được thiết kế theo nguyên tắc **'zero training'**: giáo viên chỉ cần biết dùng trình duyệt Web và điện thoại chụp ảnh — hai kỹ năng hầu như giáo viên nào cũng có. Quy trình chỉ gồm 3 bước: chụp ảnh → upload → xem kết quả. Không cần cài đặt phần mềm, không cần cấu hình mạng phức tạp."

---

### Q10: Nếu AI chấm điểm sai, ai chịu trách nhiệm?

> **Trả lời:**
> "Thiết kế của hệ thống xác định rõ: kết quả từ AI là **bản nháp hỗ trợ, không phải điểm cuối cùng**. Giáo viên luôn là người xem xét và phê duyệt trước khi điểm được ghi nhận chính thức. Hệ thống hiển thị đầy đủ chi tiết từng lỗi để giáo viên kiểm tra nhanh. Đây là nguyên tắc **'Human-in-the-Loop'** — AI giảm thời gian chấm nhưng không loại bỏ vai trò quyết định của giáo viên."

---

### Q11: Thang điểm 4+3+2+1 có phù hợp với quy định của Bộ GD&ĐT không?

> **Trả lời:**
> "Thưa thầy/cô, thang điểm của nhóm **được xây dựng dựa trên Thông tư 27/2020/TT-BGDĐT** — Thông tư quy định về đánh giá học sinh tiểu học do Bộ Giáo dục và Đào tạo ban hành năm 2020. Cụ thể, Thông tư 27 xác định các tiêu chí đánh giá bài viết của học sinh tiểu học theo các phương diện: nội dung, hình thức trình bày, và kỹ năng viết — đây là cơ sở để nhóm em phân bổ: **Chính tả 4 điểm** (tiêu chí cốt lõi nhất), **Hình thức 3 điểm** (chữ viết, trình bày), **Nội dung 2 điểm**, và **Sáng tạo 1 điểm**.
>
> Việc số hóa thang điểm thành 10 điểm tổng cũng đồng bộ với thang đánh giá định lượng được phép áp dụng theo Thông tư này. Nhóm em tự tin rằng thiết kế thang điểm có căn cứ pháp lý rõ ràng, phù hợp với khung đánh giá của Bộ GD&ĐT."

---

### Q12: Hệ thống có xử lý được chữ của học sinh lớp 1 — nét viết còn rất non — không?

> **Trả lời:**
> "Đây là thách thức khó nhất trong đề tài. Thực tế, Gemini API với khả năng hiểu hình ảnh ngữ cảnh cao xử lý được **phần lớn** trường hợp kể cả nét viết chưa thành thục, nhờ pipeline tiền xử lý 9 bước đã làm sạch ảnh trước. Tuy nhiên, với những bài viết chất lượng quá thấp — quá mờ, chữ biến dạng hoàn toàn — hệ thống sẽ **thông báo không nhận diện được và yêu cầu giáo viên chụp lại hoặc chấm thủ công**. Chúng em không giả định hệ thống xử lý được 100% trường hợp."

---

## ❓ NHÓM 4 – CÂU HỎI VỀ BẢO MẬT & PHÁP LÝ

---

### Q13: Gửi ảnh bài làm học sinh lên Google Gemini API có vi phạm quy định bảo vệ dữ liệu trẻ em không?

> **Trả lời:**
> "Đây là câu hỏi rất quan trọng về đạo đức dữ liệu. Theo chính sách của Google, dữ liệu gửi qua Gemini API không được dùng để huấn luyện mô hình nếu sử dụng API key trả phí. Bài làm học sinh trong trường hợp này là văn bản viết tay không có thông tin định danh trực tiếp.
>
> Tuy nhiên, nhóm em **thừa nhận đây là rủi ro cần giải quyết** — và đây chính xác là lý do hướng phát triển số 1 của chúng em là xây dựng **mô hình ngôn ngữ nhỏ chạy hoàn toàn cục bộ**, không gửi bất kỳ dữ liệu nào ra ngoài. Trong giai đoạn nghiên cứu, nhóm em sử dụng dữ liệu đã được xử lý và không có tên học sinh trong ảnh."

---

### Q14: Cloudflare có thể đọc dữ liệu truyền qua không?

> **Trả lời:**
> "Cloudflare đóng vai trò CDN và reverse proxy — dữ liệu đi qua Cloudflare được mã hóa **TLS end-to-end**. Về mặt kỹ thuật, Cloudflare có thể giải mã tại lớp CDN nhưng cam kết chính sách bảo mật và không lưu trữ nội dung. Đây là đánh đổi chấp nhận được để có bảo vệ DDoS và SSL certificate tự động trong phạm vi nghiên cứu. Khi triển khai thực tế, nhóm sẽ xem xét thêm các lớp mã hóa bổ sung hoặc self-hosted solution."

---

## ❓ NHÓM 5 – CÂU HỎI VỀ SO SÁNH VỚI NGHIÊN CỨU KHÁC

---

### Q15: Đề tài này khác gì so với các ứng dụng chấm điểm tự động đã có trên thị trường?

> **Trả lời:**
> "Các giải pháp thương mại hiện tại như Gradescope, Turnitin hay các app chấm bài của các startup EdTech chủ yếu được thiết kế cho **chữ in, trắc nghiệm hoặc bài thi đánh máy** — không xử lý chữ viết tay tiếng Việt học sinh tiểu học.
>
> Điểm khác biệt của chúng em:
> 1. **Chuyên biệt cho chữ viết tay tiếng Việt** — đặc biệt dấu thanh phức tạp.
> 2. **Chi phí cực thấp** — Raspberry Pi thay vì cloud server đắt tiền.
> 3. **Phản hồi giáo dục** — không chỉ chấm điểm mà phân loại lỗi và giải thích bằng tiếng Việt.
> 4. **Triển khai cục bộ** — không yêu cầu Internet ổn định (trong hướng phát triển)."

---

### Q16: Liên quan đến các nghiên cứu học thuật nào trước đó?

> **Trả lời:**
> "Nghiên cứu của nhóm xây dựng trên nền tảng các công trình về: OCR tiếng Việt (VietOCR, Tesseract Vietnamese), mô hình ngôn ngữ tiếng Việt (PhoBERT, ViT5 của VietAI), và xử lý ảnh chữ viết tay. Điểm mới là **tích hợp đồng thời** các kỹ thuật này thành một pipeline hoàn chỉnh phục vụ bài toán cụ thể — chấm chính tả học sinh tiểu học — thay vì giải quyết từng bài toán độc lập như các nghiên cứu trước."

---

## ❓ NHÓM 6 – CÂU HỎI VỀ ĐÁNH GIÁ & CHỈ SỐ

---

### Q17: Ngoài SacreBLEU và độ chính xác OCR, nhóm có đánh giá chỉ số nào khác không?

> **Trả lời:**
> "Có. Nhóm em còn đánh giá:
> - **Thời gian xử lý** (latency): < 30 giây/bài — đáp ứng yêu cầu thực tế.
> - **Tỷ lệ phát hiện lỗi** (recall): mô hình có phát hiện được các lỗi thực sự không.
> - **Stability của JSON output**: tính ổn định cấu trúc dữ liệu đầu ra qua nhiều lần gọi API.
> - **Chất lượng ảnh sau tiền xử lý**: đánh giá định tính bằng mắt người và định lượng qua chỉ số PSNR.
>
> Chúng em nhận thức rằng cần bổ sung thêm các chỉ số như Precision/Recall cho phát hiện lỗi chính tả — đây là điểm cải thiện trong phiên bản tiếp theo."

---

### Q18: Tại sao không fine-tune thêm nhiều epoch hơn để cải thiện SacreBLEU?

> **Trả lời:**
> "Chúng em đã cân nhắc điều này. Đồ thị training cho thấy Val Loss đã ổn định từ khoảng Step 15.000 — Best Checkpoint — trong khi Train Loss tiếp tục giảm. Huấn luyện thêm có nguy cơ **overfitting** cao mà không cải thiện được khả năng tổng quát hóa.
>
> Giải pháp đúng để tăng SacreBLEU không phải thêm epoch mà là **mở rộng và đa dạng hóa bộ dữ liệu huấn luyện** — đây là hướng phát triển số 2 của nhóm."

---

## 📋 CHECKLIST TRƯỚC KHI VÀO PHÒNG HỘI ĐỒNG

- [ ] Thuộc lòng **10 số liệu cốt lõi** ở đầu tài liệu
- [ ] Biết rõ **tên 5 mô hình OCR** và điểm số từng mô hình
- [ ] Nhớ **4 thành phần thang điểm** và giá trị tối đa từng phần
- [ ] Chuẩn bị câu trả lời cho **Q2 (SacreBLEU)** và **Q13 (bảo mật dữ liệu)** — hai câu dễ bị hỏi nhất
- [ ] Sẵn sàng thừa nhận giới hạn: **quy mô dữ liệu**, **chưa triển khai thực tế**
- [ ] Thuộc câu trả lời **Q11 (thang điểm)**: khẳng định căn cứ **Thông tư 27/2020/TT-BGDĐT** một cách tự tin
- [ ] Mỗi trả lời không quá **60 giây** — dài hơn sẽ mất điểm

---

## 💡 NGUYÊN TẮC VÀNG KHI PHẢN BIỆN

1. **"Đây là câu hỏi rất hay/xác đáng"** — mở đầu thừa nhận, không phòng thủ.
2. **Thừa nhận giới hạn trước** — Hội đồng biết mình biết thì mới tin.
3. **Luôn kết thúc bằng hướng khắc phục** — thể hiện tư duy nghiên cứu.
4. **Không nói "em không biết"** — thay bằng "trong phạm vi nghiên cứu này, nhóm em chưa đo lường được X, nhưng dự kiến..."
5. **Giữ bình tĩnh nếu bị hỏi dồn** — nói chậm, rõ ràng hơn là nhanh mà lẫn lộn.

---

*Tài liệu soạn dành riêng cho phiên phản biện 8 phút tại Hội đồng Nghiệm thu NCKH Sinh viên – Khoa Điện Điện Tử, TP.HCM, ngày 01/06/2026.*
