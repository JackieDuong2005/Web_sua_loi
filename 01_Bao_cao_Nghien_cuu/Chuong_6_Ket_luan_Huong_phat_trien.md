# Chương 6: Kết Luận và Hướng Phát Triển

---

## 6.1. Kết luận

### 6.1.1. Tóm tắt công trình nghiên cứu

Nghiên cứu này đặt ra mục tiêu thiết kế và triển khai một hệ thống hỗ trợ giáo viên tiểu học chấm điểm bài chính tả viết tay của học sinh một cách tự động bằng trí tuệ nhân tạo. Xuất phát từ bài toán thực tiễn — giáo viên phải dành nhiều thời gian và công sức cho công tác chấm bài thủ công, vốn tốn kém và dễ thiếu nhất quán — nhóm nghiên cứu đã xây dựng hệ thống **ViHand Grade**, một giải pháp toàn diện tích hợp phần cứng nhúng chi phí thấp, pipeline xử lý ảnh số, và kiến trúc AI lai (Hybrid AI).

Hệ thống được xây dựng trên nền tảng **Next.js 16** với kiến trúc App Router, tích hợp đồng thời hai lớp AI: mô hình đa phương thức **Gemini** của Google để thực hiện nhận dạng chữ viết tay tiếng Việt (OCR), và mô hình ngôn ngữ **ViT5** fine-tune chuyên biệt để sửa lỗi chính tả và tính điểm bài viết. Toàn bộ hệ thống được triển khai trên thiết bị nhúng **Raspberry Pi 4**, tạo thành một thiết bị chấm điểm độc lập, chi phí thấp, có khả năng hoạt động trong môi trường trường học thực tế.

### 6.1.2. Đánh giá mức độ hoàn thành mục tiêu

Nghiên cứu đã hoàn thành đầy đủ các mục tiêu đề ra ban đầu. Thứ nhất, nhóm đã thiết kế và triển khai thành công **pipeline tiền xử lý ảnh 9 bước** hoàn toàn bằng TypeScript và thư viện Jimp, bao gồm các kỹ thuật: EXIF auto-rotate, Deskew chỉnh góc nghiêng, White Balance theo giả thuyết Gray World, chuyển ảnh sang thang xám (Grayscale), loại bóng nền (Shadow Removal), tăng tương phản cục bộ (CLAHE), làm nét (Unsharp Mask Sharpen), đánh giá chất lượng ảnh (Quality Assessment) và nhị phân hóa thích nghi (Adaptive Threshold). Pipeline này hoạt động trực tiếp trên server/edge mà không phụ thuộc vào thư viện C++ bên ngoài, tối ưu để chạy trên phần cứng ARM của Raspberry Pi 4.

Thứ hai, hệ thống OCR sử dụng mô hình **Gemini 3.1 Flash Lite** với prompt kỹ thuật đặc biệt để trích xuất văn bản thuần túy từ ảnh chụp bài viết tay tiếng Việt, đáp ứng yêu cầu độ chính xác ≥ 90% ký tự có dấu thanh và thời gian xử lý dưới 30 giây/bài. Hệ thống cũng triển khai cơ chế xoay vòng nhiều API Key tự động nhằm đảm bảo tính liên tục khi một key đạt giới hạn quota.

Thứ ba, nhóm đã tiến hành **thực nghiệm khoa học so sánh** ba mô hình ViT5 fine-tune cho tiếng Việt trên bộ dữ liệu tổng hợp 1.000 mẫu với 2.261 lỗi chính tả đặc trưng của học sinh tiểu học, đo lường theo bộ chỉ số đa chiều: SacreBLEU, WER, CER, Exact Match, Precision, Recall và F1-score. Mô hình `chamdentimem/ViT5_Vietnamese_Correction` — do nhóm nghiên cứu fine-tune và đóng góp lên HuggingFace Hub (được gọi là **ViHand Grade** trong hệ thống production) — đạt hiệu năng tổng thể tốt nhất với SacreBLEU = **92,45**, WER = **3,59%**, Exact Match = **48,2%** và F1-score = **78,57%**, được chọn làm mô hình chính.

Thứ tư, thuật toán chấm điểm tích hợp — **Levenshtein kết hợp SequenceMatcher** — đã được phát triển, kiểm thử độc lập qua hệ thống Grading Testbench tự động và đạt độ chính xác tuyệt đối: Precision và Recall đều đạt **100%** ở cấp phát hiện lỗi từ, MAE và RMSE = **0,000 điểm**, latency chỉ **0,21 ms/mẫu** trên CPU. Thuật toán phân loại nhóm lỗi đạt độ chính xác tổng thể **84,67%**, với lỗi viết hoa và lỗi dấu thanh đạt F1 lần lượt là 100% và 97,66%.

### 6.1.3. Ý nghĩa khoa học và thực tiễn

Về mặt kỹ thuật, nghiên cứu đã chứng minh tính khả thi của kiến trúc **Hybrid AI** — kết hợp cloud AI (Gemini) cho OCR đa phương thức với mô hình ngôn ngữ nhỏ chạy cục bộ (ViT5/FastAPI) cho chấm điểm — trong việc triển khai một ứng dụng AI thực tế trên phần cứng nhúng chi phí thấp. Đây là một đóng góp có giá trị tham khảo cho các nghiên cứu về AI at the Edge trong lĩnh vực giáo dục.

Về mặt thực tiễn, hệ thống ViHand Grade có thể rút ngắn thời gian chấm một bài chính tả từ vài phút xuống còn dưới 30 giây. Ngoài ra, tính nhất quán trong đánh giá của AI giúp loại bỏ sai số chủ quan từ nhiều giáo viên khác nhau. Cơ chế **Human-in-the-Loop** — trong đó AI chỉ tự động hóa phần chấm chính tả, còn tiêu chí hình thức và nội dung do giáo viên đánh giá và xác nhận — đảm bảo tính minh bạch sư phạm và vai trò không thể thay thế của người thầy trong quá trình giáo dục.

Bên cạnh đó, nhóm nghiên cứu đã đóng góp cho cộng đồng mã nguồn mở một mô hình ViT5 fine-tune chuyên biệt cho bài toán sửa lỗi chính tả tiếng Việt theo văn phong học sinh tiểu học, cùng bộ công cụ tổng hợp dữ liệu (`data_synthesizer.py`) và framework benchmark tự động (`benchmark_vit5.py`, `benchmark_grading.py`) có khả năng tái sử dụng cho các nghiên cứu tiếp theo.

### 6.1.4. Giới hạn và thách thức còn tồn tại

Nghiên cứu cũng thẳng thắn nhìn nhận một số giới hạn cần được giải quyết trong giai đoạn tiếp theo:

**Về dữ liệu:** Bộ dữ liệu thực nghiệm được tổng hợp tự động bằng rule-based synthesizer, chưa phản ánh đầy đủ tính đa dạng và phức tạp của lỗi chính tả thực tế từ bài viết tay học sinh với nhiều loại giấy, nhiều loại nét bút và chữ viết theo vùng phương ngữ khác nhau. Đây là điểm hạn chế quan trọng nhất ảnh hưởng đến khả năng tổng quát hóa (generalizability) của hệ thống.

**Về mô hình ViT5:** Kết quả thực nghiệm cho thấy cả ba mô hình đều gặp khó khăn với hai nhóm lỗi: (1) lỗi tổ hợp hai lỗi liền kề trên cùng 1–2 từ (VD: `trúng rấc` → `chúng rất`), và (2) nhầm lẫn cặp phụ âm ch/tr khi thiếu ngữ cảnh xung quanh. Recall của mô hình sản xuất ở mức 70,72% cho thấy khoảng 3 trong 10 lỗi thực tế vẫn bị bỏ sót.

**Về phân loại lỗi:** Thuật toán `classify_error_type()` hiện chưa xử lý đúng nhóm lỗi **Bỏ sót/Thêm ký tự** ở cấp độ trong từ (F1 = 0%), và nhóm lỗi sai phụ âm hiếm gặp theo phương ngữ (Recall = 79,20% ở nhóm sai phụ âm đầu). Điều này cần được cải thiện bằng cách mở rộng danh sách cặp phụ âm và điều chỉnh lại logic phân loại.

**Về môi trường thực tế:** Benchmark chạy trên CPU x86 thay vì CPU ARM Cortex-A72 của Raspberry Pi 4, nên kết quả latency thực tế trên thiết bị triển khai có thể cao hơn đáng kể. Ngoài ra, hệ thống hiện tại vẫn phụ thuộc vào kết nối mạng cho dịch vụ OCR của Gemini API.

---

## 6.2. Hướng phát triển

Dựa trên kết quả nghiên cứu, các giới hạn đã xác định và xu hướng công nghệ AI trong giáo dục, nhóm đề xuất các hướng phát triển được ưu tiên theo thứ tự tác động và tính khả thi.

### Hướng 1: Thu thập dữ liệu thực tế và Fine-tuning chuyên sâu

Đây là hướng phát triển quan trọng nhất và có tác động lớn nhất đến chất lượng hệ thống. Nhóm đề xuất hợp tác với các trường tiểu học tại Việt Nam để thu thập và chú thích (annotate) một tập dữ liệu ngữ liệu thực (real corpus) bao gồm hình ảnh bài chính tả viết tay đã được giáo viên chấm điểm, cùng bản sao văn bản tương ứng. Tập dữ liệu cần đảm bảo tính đa dạng về: loại giấy (ô ly, kẻ ngang, trắng), loại bút (bút chì, bút bi, bút mực), vùng miền địa lý (Bắc–Trung–Nam với đặc trưng phương ngữ riêng), khối lớp (1–5) và trình độ chữ viết.

Tập dữ liệu này sẽ phục vụ hai mục tiêu: (1) Fine-tune lại mô hình ViHand Grade trên domain thực tế, với kỳ vọng tăng Recall lên trên 80% và F1 lên trên 85%, và (2) xây dựng benchmark chuẩn cho bài toán sửa lỗi chính tả tiếng Việt theo văn phong học sinh tiểu học — một bộ benchmark công khai hiện chưa tồn tại. Bên cạnh đó, cần áp dụng kỹ thuật **Beam Search** (`num_beams = 3, 5`) thay vì Greedy Search để cải thiện chất lượng đầu ra của mô hình, đồng thời triển khai **post-processing rule-based** cho các nhóm lỗi mà mô hình yếu: viết hoa đầu câu (xử lý bằng regex đơn giản) và cặp phụ âm ch/tr đặc thù phương ngữ Nam Bộ (xử lý bằng từ điển tần suất).

### Hướng 2: Độc lập hóa hoàn toàn khỏi Cloud API

Hướng này giải quyết hai thách thức căn bản của hệ thống hiện tại: sự phụ thuộc vào Gemini API (gây ra chi phí vận hành, độ trễ mạng và rủi ro gián đoạn khi mất kết nối) và vấn đề bảo mật dữ liệu hình ảnh học sinh khi truyền tải lên máy chủ của bên thứ ba.

Giải pháp đề xuất là nghiên cứu và triển khai một mô hình OCR chữ viết tay tiếng Việt chạy cục bộ trên Raspberry Pi 4 thay thế Gemini API. Các hướng tiếp cận khả thi bao gồm: fine-tune mô hình vision-language nhỏ (VD: moondream2, PaliGemma 3B phiên bản quantized INT4) hoặc kết hợp mô hình OCR truyền thống (Tesseract với tập huấn luyện tiếng Việt cải tiến) với bộ phân đoạn ký tự tùy chỉnh. Việc chuyển sang chế độ **offline-first** sẽ giúp hệ thống hoạt động độc lập ngay cả ở các trường vùng xa có hạ tầng mạng không ổn định, đồng thời đảm bảo dữ liệu hình ảnh học sinh không rời khỏi thiết bị.

### Hướng 3: Nâng cấp thuật toán chấm điểm và mở rộng tiêu chí đánh giá

Thuật toán Levenshtein kết hợp SequenceMatcher hiện tại đạt độ chính xác tuyệt đối trong phát hiện và tính điểm lỗi chính tả, nhưng chưa có khả năng đánh giá các tiêu chí ngôn ngữ học cao hơn. Hướng phát triển này bao gồm hai nhánh.

**Nhánh ngắn hạn:** Cải tiến thuật toán phân loại lỗi hiện tại bằng cách (1) mở rộng danh sách `phu_am_pairs` để bao phủ các cặp phụ âm hiếm và phụ âm phương ngữ, (2) phát triển logic riêng cho lỗi bỏ sót/thêm ký tự trong từ (character-level insert/delete) thay vì mặc định xếp vào nhóm sai vần, và (3) tích hợp kiểm tra chéo với từ điển tiếng Việt (VD: EVDict, TuDienTiengViet) để đánh giá độ tin cậy của đề xuất sửa lỗi từ ViT5, giảm thiểu hiện tượng hallucination.

**Nhánh dài hạn:** Tích hợp các mô-đun Xử lý Ngôn ngữ Tự nhiên (NLP) để phân tích cảm thụ văn học — đánh giá cấu trúc đoạn văn, tính logic trong diễn đạt, vốn từ vựng và sự sáng tạo. Mô-đun đánh giá sáng tạo `auto_sang_tao()` hiện tại (phát hiện điệp ngữ và biện pháp tu từ đơn giản) có thể được nâng cấp thành một bộ phân tích văn học toàn diện hơn, mở ra khả năng chấm tự động cả bài văn miêu tả và văn kể chuyện.

### Hướng 4: Phát triển ứng dụng di động và tích hợp hệ sinh thái giáo dục

Hiện tại hệ thống đã có thư mục `android-app` trong codebase. Hướng phát triển này đề xuất hoàn thiện ứng dụng di động đa nền tảng (iOS/Android) với các tính năng: chụp ảnh bài viết trực tiếp từ camera với hướng dẫn căn chỉnh khung hình (AR overlay), tự động gửi ảnh lên Raspberry Pi trong mạng nội bộ của trường, và hiển thị kết quả chấm điểm thân thiện với trẻ em (hỗ trợ Text-to-Speech đọc nhận xét). Đối với giáo viên, ứng dụng di động cho phép chấm bài mọi lúc mọi nơi mà không cần ngồi trước màn hình máy tính.

Về tích hợp hệ sinh thái, nhóm đề xuất xây dựng module API tiêu chuẩn để đồng bộ điểm số và nhận xét trực tiếp vào các phần mềm quản lý trường học phổ biến tại Việt Nam như VnEdu và SMAS, giúp giảm tải công việc nhập liệu thủ công và tạo sự liền mạch trong quy trình quản lý điểm của nhà trường.

### Hướng 5: Đánh giá tác động sư phạm và nghiên cứu A/B Testing

Hướng phát triển này hướng đến việc biến ViHand Grade từ một hệ thống công nghệ thành một đối tượng nghiên cứu khoa học giáo dục có giá trị. Nhóm đề xuất thiết kế và thực hiện các nghiên cứu A/B Testing có kiểm soát trong môi trường lớp học thực tế: so sánh nhóm học sinh nhận phản hồi từ hệ thống AI (nhóm thực nghiệm) với nhóm nhận phản hồi từ giáo viên truyền thống (nhóm đối chứng), đo lường tốc độ cải thiện lỗi chính tả, chữ viết và động lực học tập theo thời gian.

Nghiên cứu dài hạn này không chỉ cung cấp bằng chứng khoa học về hiệu quả sư phạm của hệ thống, mà còn giúp hiệu chỉnh các tiêu chí chấm điểm, giọng điệu nhận xét và cơ chế phản hồi sao cho phù hợp nhất với tâm lý và giai đoạn phát triển nhận thức của học sinh tiểu học từng lứa tuổi.

### Các hướng phát triển bổ sung

Ngoài 5 hướng chính, nhóm nghiên cứu đề xuất thêm một số định hướng kỹ thuật bổ sung như sau:

**Tối ưu hiệu năng phần cứng:** Chuyển đổi các thuật toán tiền xử lý ảnh sang ngôn ngữ C++ kết hợp với thư viện OpenCV hoặc biên dịch sang WebAssembly để giảm thời gian tính toán và tiêu thụ bộ nhớ trên Raspberry Pi 4 từ 2–3 lần. Khảo sát khả năng sử dụng bộ tăng tốc phần cứng (VD: Raspberry Pi AI HAT+ với Neural Processing Unit) để chạy mô hình ViT5 với tốc độ suy luận nhanh hơn so với CPU thuần.

**Mở rộng phạm vi chấm điểm:** Tích hợp thêm các mô-đun nhận dạng chuyên biệt để chấm tự động bài thi trắc nghiệm (nhận dạng ô tô và ô khoanh) và bài toán tiểu học (nhận dạng chữ số, ký hiệu phép tính), biến ViHand Grade thành một nền tảng chấm thi tổng hợp cho cấp tiểu học.

**Bảo mật và tuân thủ pháp lý:** Xây dựng cơ chế tự động làm mờ hoặc cắt bỏ vùng chứa tên, lớp, trường của học sinh trên ảnh trước khi bất kỳ dữ liệu nào được truyền đi. Thiết kế chính sách lưu trữ và xóa dữ liệu có thời hạn, tuân thủ các quy định của Luật An ninh mạng Việt Nam và các hướng dẫn về bảo vệ trẻ em trong không gian mạng của Bộ Giáo dục và Đào tạo.

---

## 6.3. Tổng kết

Công trình nghiên cứu đã thành công trong việc xây dựng hệ thống **ViHand Grade** — một thiết bị chấm điểm chính tả thông minh ứng dụng kiến trúc AI lai, tích hợp đầy đủ từ phần cứng nhúng Raspberry Pi 4, ứng dụng web hiện đại Next.js, đến pipeline tiền xử lý ảnh số chuyên biệt và bộ đôi mô hình AI Gemini–ViT5. Các kết quả thực nghiệm khoa học đã xác nhận tính hiệu quả của hệ thống và cung cấp nền tảng dữ liệu vững chắc cho giai đoạn phát triển tiếp theo.

Thách thức lớn nhất phía trước là đưa hệ thống ra khỏi môi trường kiểm soát của phòng nghiên cứu và vào thực tế lớp học đa dạng — với sự khác biệt về chữ viết, phương ngữ, điều kiện ánh sáng và trình độ học sinh. Đây cũng là nơi mà sự kết hợp giữa trí tuệ nhân tạo và trí tuệ của người thầy thực sự được kiểm chứng và bổ sung cho nhau.

Nhóm nghiên cứu tin tưởng rằng ViHand Grade, với nền tảng kỹ thuật đã được đặt vững và định hướng phát triển rõ ràng, có tiềm năng trở thành một công cụ hỗ trợ giảng dạy thiết thực, góp phần giảm tải công việc hành chính cho giáo viên và cải thiện chất lượng phản hồi học tập cho học sinh tiểu học Việt Nam.

---

*Tài liệu nghiên cứu ViHand Grade — Phiên bản v1.2.0 | Cập nhật: 2026*
