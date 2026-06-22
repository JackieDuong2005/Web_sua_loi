# Chương 2: Cơ sở lý thuyết

Chương này trình bày các cơ sở lý thuyết tạo nên nền tảng kỹ thuật cho hệ thống ViHand Grade. Hệ thống được xây dựng dựa trên sự kết hợp của các công nghệ tiên tiến bao gồm xử lý ảnh số, trí tuệ nhân tạo (Multimodal LLM, Transformer), thuật toán so khớp chuỗi và kiến trúc phát triển ứng dụng web hiện đại.

## 2.1. Tổng quan về nhận dạng chữ viết tay (Handwriting Text Recognition)

### 2.1.1. Phân biệt OCR truyền thống với HTR
Nhận dạng ký tự quang học (OCR - Optical Character Recognition) là công nghệ chuyển đổi hình ảnh chứa văn bản (thường là tài liệu in ấn hoặc đánh máy) thành văn bản dạng máy tính có thể xử lý được. Các hệ thống OCR truyền thống thường dựa trên việc phân mảnh (segmentation) từng ký tự và sử dụng các bộ phân loại mẫu (pattern classifiers) để nhận diện. Tuy nhiên, OCR truyền thống gặp rất nhiều khó khăn với chữ viết tay do các ký tự thường dính liền nhau và không có một khuôn mẫu chuẩn mực.

Nhận dạng chữ viết tay (HTR - Handwriting Text Recognition) là một nhánh nâng cao của OCR, tập trung vào việc giải quyết bài toán với chữ viết tay. HTR hiện đại thường bỏ qua bước phân mảnh ký tự thủ công, thay vào đó sử dụng các mô hình học sâu chuỗi-qua-chuỗi (Sequence-to-Sequence) kết hợp với cơ chế Attention để nhận dạng toàn bộ một dòng hoặc một đoạn văn bản dựa trên các đặc trưng hình ảnh trực tiếp.

### 2.1.2. Thách thức đối với chữ viết tay tiếng Việt
Bài toán HTR đối với chữ viết tay tiếng Việt, đặc biệt là của học sinh tiểu học, đặt ra nhiều thách thức đặc thù:
- **Độ đồng nhất thấp:** Mỗi học sinh có một nét chữ, kích cỡ và cách kết nối ký tự khác nhau.
- **Hệ thống dấu thanh phức tạp:** Tiếng Việt sử dụng các dấu phụ (như ă, â, ê, ô, ơ, ư, đ) và hệ thống 5 dấu thanh (huyền, sắc, hỏi, ngã, nặng). Các dấu này thường có kích thước rất nhỏ so với ký tự chính, dễ bị nhòe, mất nét trong quá trình chụp ảnh, hoặc bị học sinh viết lệch vị trí. Điều này dẫn đến sự nhầm lẫn lớn (ví dụ: "cá" và "cả", "ô" và "ơ").
- **Điều kiện nhiễu:** Ảnh chụp bài làm của học sinh thường được chụp bằng điện thoại di động trong điều kiện thiếu sáng, có bóng đổ, chụp nghiêng, góc khuất, hoặc bị nhiễu bởi các đường kẻ ô ly, vết tẩy xóa.

## 2.2. Mô hình ngôn ngữ lớn đa phương thức (Multimodal LLM) ứng dụng trong OCR

### 2.2.1. Kiến trúc Vision-Language Model
Để giải quyết bài toán nhận dạng chữ viết tay phức tạp, các kiến trúc Vision-Language Model (VLM) đang trở thành xu hướng hàng đầu. VLM kết hợp khả năng thị giác máy tính và xử lý ngôn ngữ tự nhiên bằng cách sử dụng một bộ mã hóa hình ảnh (Vision Encoder) để trích xuất đặc trưng không gian, và một bộ giải mã ngôn ngữ (Language Decoder) để sinh ra văn bản tương ứng.

Cơ chế kết nối giữa hai luồng dữ liệu này thường là cơ chế Cross-Attention, cho phép bộ giải mã ngôn ngữ tập trung vào các vùng hình ảnh liên quan trong khi dự đoán từ tiếp theo. Điều này giúp mô hình có khả năng hiểu sâu sắc cấu trúc không gian của văn bản (đoạn, dòng, thụt lề) mà không cần các công cụ nhận diện hộp giới hạn (bounding box) truyền thống.

### 2.2.2. Vị trí của Gemini API trong bài toán trích xuất văn bản
Google Gemini là một trong những hệ thống Multimodal LLM tiên tiến nhất hiện nay, được thiết kế ngay từ đầu để xử lý đa phương thức (văn bản, hình ảnh, âm thanh) một cách tự nhiên.

Trong kiến trúc của ViHand Grade, API Gemini (cụ thể là mô hình `gemini-3.1-flash-lite`) được sử dụng cho tác vụ OCR thuần túy. Lý do lựa chọn Gemini bao gồm:
- **Độ chính xác cao:** Khả năng nhận diện rất tốt các cấu trúc chữ viết tay tiếng Việt có dấu, kể cả khi chữ viết dính liền hoặc mờ.
- **Tuân thủ ngữ cảnh:** Bằng cách thiết kế Prompt cẩn thận, Gemini có khả năng chỉ trích xuất chính xác những gì có trong ảnh, bỏ qua các thành phần nhiễu (chữ viết nháp, nét gạch bỏ) mà không tự động suy diễn hay sửa lỗi sai của học sinh — một yếu tố cực kỳ quan trọng để hệ thống phía sau có thể chấm điểm được.

## 2.3. Bài toán hiệu chỉnh lỗi chính tả tiếng Việt (Vietnamese Spelling Correction)

### 2.3.1. Đặc điểm chính tả tiếng Việt và ảnh hưởng phương ngữ
Tiếng Việt sử dụng chữ Quốc ngữ, hệ thống chữ viết Latin có bổ sung dấu phụ. Mỗi âm tiết tương ứng với một tiếng, cấu thành từ: Phụ âm đầu + Phần vần + Thanh điệu. Hệ thống 6 thanh điệu (bằng, huyền, hỏi, ngã, sắc, nặng) được biểu diễn bằng dấu đặt trên hoặc dưới nguyên âm chính, tạo ra thách thức đặc biệt cho cả mô hình OCR lẫn học sinh trong quá trình học viết chính tả.

Do đặc thù phương ngữ và thói quen phát âm, học sinh thường mắc các lỗi chính tả phổ biến:
- Lỗi phụ âm đầu: học sinh tại khu vực Nam Bộ thường nhầm lẫn giữa s/x, d/gi/r, v/b. Các khu vực khác thường nhầm c/k, g/gh, ng/ngh, tr/ch, l/n.
- Lỗi vần: nhầm lẫn i/y, iu/ưu, an/ang, at/ac.
- Lỗi thanh điệu: sự nhầm lẫn phổ biến giữa dấu hỏi (?) và dấu ngã (~).
- Lỗi viết hoa: không viết hoa chữ cái đầu câu hoặc tên riêng.

Mặc dù hệ thống ghi nhận các yếu tố phương ngữ là nguyên nhân phổ biến gây ra lỗi, cơ chế chấm điểm vẫn áp dụng trừ điểm bình đẳng (chuẩn toàn quốc) nhằm khuyến khích học sinh rèn luyện và viết đúng chính tả chuẩn mực.

### 2.3.2. Các hướng tiếp cận trong sửa lỗi chính tả
- **Rule-based (Dựa trên luật):** Sử dụng các từ điển và quy tắc ngữ pháp tĩnh. Phương pháp này tốc độ cao nhưng kém linh hoạt và không giải quyết được các lỗi liên quan đến ngữ cảnh (ví dụ: "trong chẻo" vs "trong trẻo").
- **Statistical (Dựa trên thống kê):** Sử dụng mô hình N-gram kết hợp với mô hình kênh nhiễu (Noisy Channel Model) để xác định xác suất xảy ra của chuỗi từ.
- **Neural-based (Dựa trên mạng nơ-ron):** Tiếp cận bài toán dưới dạng dịch máy (Machine Translation), dịch từ một "câu sai" sang một "câu đúng". Các mô hình như Sequence-to-Sequence tỏ ra vượt trội nhờ khả năng nắm bắt ngữ cảnh rộng và mối quan hệ phức tạp giữa các từ trong câu.

## 2.4. Kiến trúc Transformer và mô hình ViT5

### 2.4.1. Nền tảng kiến trúc Transformer
Kiến trúc Transformer, được giới thiệu bởi Vaswani và cộng sự (2017), là một bước ngoặt trong lĩnh vực Xử lý Ngôn ngữ Tự nhiên (NLP). Khác với RNN hay LSTM xử lý dữ liệu tuần tự, Transformer sử dụng cơ chế Self-Attention để đánh giá mức độ tương quan giữa tất cả các từ trong một câu cùng lúc. Kiến trúc Sequence-to-Sequence (Seq2Seq) của Transformer bao gồm hai phần: Encoder (mã hóa câu đầu vào) và Decoder (giải mã và sinh ra câu đầu ra).

### 2.4.2. Mô hình T5 và ViT5
T5 (Text-to-Text Transfer Transformer) là một mô hình NLP biến mọi bài toán ngôn ngữ thành một định dạng "Text-to-Text". ViT5 là phiên bản được tiền huấn luyện chuyên biệt trên tập dữ liệu tiếng Việt khổng lồ.

Lý do lựa chọn ViT5 cho bài toán sửa lỗi văn bản (Spelling Correction):
- **Phù hợp với đặc thù Seq2Seq:** Bài toán sửa câu sai thành câu đúng bản chất là một tác vụ dịch chuỗi. Khác với các mô hình chỉ có Encoder (như BERT) dùng để phân loại, ViT5 (Encoder-Decoder) có khả năng sinh ra một câu hoàn toàn mới, tự nhiên và mượt mà.
- **Khả năng nắm bắt ngữ cảnh tiếng Việt:** ViT5 giải quyết triệt để các lỗi đồng âm hoặc phương ngữ nhờ việc hiểu ngữ cảnh của toàn bộ câu thay vì chỉ xét từng từ đơn lẻ.

## 2.5. Thuật toán đo khoảng cách chuỗi Levenshtein Distance

### 2.5.1. Định nghĩa và nguyên lý
Khoảng cách Levenshtein (Levenshtein Distance) là một độ đo đo lường sự khác biệt giữa hai chuỗi ký tự. Khoảng cách này được định nghĩa là số lượng tối thiểu các phép biến đổi đơn ký tự (hoặc đơn từ) cần thiết để biến đổi chuỗi này thành chuỗi kia. Ba phép biến đổi cơ bản bao gồm:
1. Xóa một phần tử (Deletion)
2. Chèn một phần tử (Insertion)
3. Thay thế một phần tử (Substitution)

### 2.5.2. Vai trò trong hệ thống ViHand Grade
Trong khi ViT5 đảm nhiệm việc sửa câu sai thành câu đúng, hệ thống cần biết chính xác học sinh đã viết sai ở chữ nào để đánh dấu lỗi và trừ điểm. Thuật toán Levenshtein (được triển khai qua `difflib.SequenceMatcher`) được sử dụng để so khớp (align) văn bản gốc thu được từ OCR và văn bản đã sửa từ ViT5 ở cấp độ từ (word-level). Các thao tác chênh lệch (replace, insert, delete) được bóc tách và phân loại thành các lỗi chính tả cụ thể (sai vần, sai phụ âm, thiếu từ) để cung cấp phản hồi trực quan.

## 2.6. Cơ sở lý thuyết xử lý ảnh số (Digital Image Processing)

Nhằm tối ưu hóa độ chính xác của quá trình nhận dạng hình ảnh, ảnh chụp từ camera cần được tiền xử lý để loại bỏ nhiễu và làm rõ nét chữ.

- **Cân bằng trắng (Gray World Assumption):** Thuật toán giả định rằng giá trị trung bình của các kênh màu (R, G, B) trên toàn bộ bức ảnh là màu xám trung tính. Bằng cách điều chỉnh tỷ lệ các kênh, thuật toán loại bỏ hiện tượng ám màu do ánh sáng môi trường (ví dụ: ánh đèn vàng, bóng râm).
- **Khử bóng (Shadow Removal):** Sử dụng phép làm mờ (Box Blur với Kernel lớn) để ước lượng hình ảnh nền (background). Chia hình ảnh gốc cho ảnh nền ước lượng này giúp triệt tiêu các vùng bóng đổ không đồng đều.
- **CLAHE (Contrast Limited Adaptive Histogram Equalization):** Khác với cân bằng biểu đồ histogram toàn cục, CLAHE chia ảnh thành các lưới nhỏ và cân bằng tương phản trên từng ô. Điều này giúp tăng cường độ tương phản ở những vùng nét chữ bị nhạt mà không làm nhiễu vùng nền.
- **Unsharp Masking (Làm nét chữ):** Tạo ra một phiên bản mờ của ảnh gốc, sau đó trừ phiên bản mờ này khỏi ảnh gốc để tạo ra các đường viền sắc nét hơn, giúp nét chữ rõ ràng.
- **Ngưỡng hóa thích nghi (Adaptive/Otsu Threshold):** Thuật toán Otsu tự động tìm ngưỡng tối ưu để tách các điểm ảnh thành hai phần (chữ và nền). Ngưỡng hóa thích nghi sử dụng tích phân hình ảnh (Integral Image) để tính ngưỡng thay đổi linh hoạt theo từng khu vực, giải quyết hiệu quả vấn đề ánh sáng không đều.
- **Hiệu chỉnh nghiêng (Deskew):** Sử dụng các kỹ thuật như phân tích biến thiên chiếu (Projection Variance) để tính toán góc nghiêng của văn bản trên giấy, từ đó tự động xoay ảnh về góc thẳng, giúp các mô hình nhận diện dễ dàng trích xuất các dòng văn bản.

## 2.7. Kiến trúc hệ thống Web hiện đại và mô hình Hybrid AI

### 2.7.1. Kiến trúc Web Full-stack
Hệ thống sử dụng các nền tảng công nghệ web hiện đại để đảm bảo hiệu năng và dễ bảo trì:
- **Next.js App Router:** Một framework React mạnh mẽ cho phép kết hợp cả Server-Side Rendering (SSR) và Client-Side Rendering, cải thiện tốc độ tải trang và trải nghiệm người dùng (UX).
- **RESTful API:** Các API nội bộ giúp giao tiếp chuẩn hóa giữa giao diện người dùng và các logic xử lý nghiệp vụ, xử lý ảnh.
- **Prisma ORM:** Công cụ ánh xạ quan hệ đối tượng (Object-Relational Mapping) cung cấp giao diện an toàn kiểu dữ liệu (Type-safe) để thao tác với cơ sở dữ liệu SQLite, giúp việc quản lý dữ liệu người dùng, lớp học và lịch sử chấm bài trở nên trực quan, bảo mật.

### 2.7.2. Kiến trúc Hybrid AI
Kiến trúc "Lai" (Hybrid AI) là xu hướng phát triển ứng dụng thông minh hiện đại, kết hợp sức mạnh giữa dịch vụ đám mây (Cloud) và máy chủ cục bộ (Local/Edge). 
Trong ViHand Grade:
- **Cloud AI (Gemini API):** Đảm nhiệm quá trình nhận dạng hình ảnh (OCR) cực kỳ nặng nề, đòi hỏi khả năng của một hệ thống Multimodal khổng lồ mà không thể chạy cục bộ trên phần cứng phổ thông.
- **Local/Edge AI (ViT5 Service):** Đảm nhiệm logic sửa lỗi chính tả và phân tích câu. Việc chạy cục bộ mô hình này mang lại tốc độ phản hồi nhanh, không phụ thuộc vào giới hạn truy vấn (Rate Limit) của bên thứ ba, đồng thời bảo đảm các tiêu chuẩn chấm điểm có thể tinh chỉnh độc lập. Khi dịch vụ cục bộ quá tải, hệ thống có cơ chế Fallback gọi trở lại API đám mây nhằm đảm bảo tính ổn định tối đa.

## 2.8. Triển khai hệ thống trên thiết bị biên (Raspberry Pi 4)

### 2.8.1. Vai trò của Raspberry Pi 4 trong hệ thống EdTech
Trong các hệ thống công nghệ giáo dục (EdTech) hiện đại được triển khai tại trường học, máy tính bảng mạch đơn giữ vai trò quan trọng như một trung tâm xử lý cục bộ (Edge Computing). Raspberry Pi 4 Model B được sử dụng trong dự án với cấu hình tối ưu bao gồm: SoC Broadcom BCM2711, CPU ARM Cortex-A72 lõi tứ 64-bit xung nhịp 1.8 GHz, RAM 4GB LPDDR4, hỗ trợ kết nối Wi-Fi băng tần kép. 

Với cấu hình này, Raspberry Pi 4 không chỉ đơn thuần đóng vai trò là một Web Server giao tiếp với Cloud, mà đảm nhiệm toàn bộ vai trò trung tâm trong kiến trúc Hybrid AI của ViHand Grade:
1. **Hosting nền tảng Web:** Triển khai toàn bộ ứng dụng web full-stack Next.js và cơ sở dữ liệu nhúng SQLite (thông qua môi trường Node.js 20 LTS ARM64).
2. **Tiền xử lý dữ liệu nặng:** Thực thi trực tiếp luồng tiền xử lý ảnh 9 bước (bằng thư viện Jimp/TypeScript) để khử bóng, tăng tương phản CLAHE, v.v., giảm tải dung lượng trước khi đẩy lên bộ nhận dạng OCR đám mây.
3. **Triển khai Mô hình Trí tuệ Nhân tạo cục bộ (Edge AI):** Đây là điểm khác biệt cốt lõi. Thay vì chỉ gửi API và chờ đợi, Raspberry Pi 4 trực tiếp vận hành mô hình học sâu ViT5 (thông qua Python/FastAPI) để xử lý logic chấm điểm và sửa lỗi chính tả mà không phụ thuộc vào Internet. 

### 2.8.2. Lượng tử hóa mô hình (Model Quantization) trên CPU ARM
Để một thiết bị nhỏ gọn với năng lực CPU ARM (không có GPU chuyên dụng) như Raspberry Pi 4 có thể gánh vác việc chạy mô hình Transformer (ViT5) mượt mà, kỹ thuật lượng tử hóa (Quantization) đã được áp dụng.

Cụ thể, hệ thống tích hợp **Dynamic INT8 Quantization** để chuyển đổi động các ma trận trọng số của mô hình từ số thực dấu phẩy động 32-bit (FP32) sang số nguyên 8-bit (INT8) trong quá trình suy luận. Việc này giúp giảm lượng RAM chiếm dụng của mô hình xuống gần 4 lần (phù hợp với mức RAM 4GB của thiết bị) và tăng tốc độ tính toán trực tiếp trên CPU ARM, đảm bảo thời gian phản hồi ở mức chấp nhận được trong môi trường học đường.

### 2.8.3. Mạng lưới kết nối an toàn với Cloudflare Tunnel
Nhằm thiết lập một kênh liên lạc từ xa an toàn, không gián đoạn mà không cần can thiệp phức tạp vào hệ thống mạng của nhà trường (như mở port/NAT router), Raspberry Pi 4 được cấu hình tích hợp giải pháp **Cloudflare Tunnel**. Công nghệ này tạo ra một đường hầm mạng mã hóa bằng giao thức TLS trực tiếp từ thiết bị ra Internet, cấp phát một tên miền bảo mật. Nhờ đó, giáo viên có thể truy cập hệ thống ViHand Grade từ điện thoại cá nhân thông qua 4G/Wifi một cách dễ dàng và an toàn để chụp ảnh bài viết của học sinh, truyền dữ liệu thẳng về máy chủ Raspberry Pi đặt tại lớp học.

## 2.9. Các kỹ thuật tiền xử lý văn bản và tối ưu luồng suy luận

### 2.9.1. Tiền xử lý bằng bộ lọc Heuristic (Teencode Filtering)
Mặc dù ViT5 là một mô hình mạnh mẽ, nhưng dữ liệu đầu vào chứa quá nhiều từ lóng, viết tắt tự do (Teencode) đặc trưng của học sinh (ví dụ: "ko", "dc", "rấc") có thể làm giảm chất lượng đầu ra. Hệ thống sử dụng một bộ lọc dựa trên luật (Rule-based/Heuristic) bằng biểu thức chính quy (Regex) để chuẩn hóa nhanh các từ này thành tiếng Việt chuẩn trước khi đưa vào mạng nơ-ron, giúp mô hình tập trung tối đa tài nguyên vào việc xử lý các lỗi ngữ pháp và chính tả cấu trúc phức tạp hơn.

### 2.9.2. Thuật toán phân tách khối văn bản (Chunking)
Các mô hình Seq2Seq thường có một cửa sổ ngữ cảnh giới hạn (Max Input Tokens) và dễ sinh ra hiện tượng ảo giác (hallucination) hoặc vòng lặp từ (repetition loop) nếu câu đầu vào quá dài. Thuật toán Chunking được áp dụng để cắt các đoạn văn xuôi dài thành các khối nhỏ (chunks) dựa trên các dấu câu tự nhiên (dấu phẩy, dấu chấm) với một độ dài an toàn nhất định. Sau khi ViT5 hoàn tất xử lý từng khối rời rạc, hệ thống sẽ ghép nối chúng lại để bảo toàn trọn vẹn văn bản ban đầu.

## 2.10. Tự động hóa chấm điểm bài viết (Automated Essay Scoring - AES)

### 2.10.1. Tổng quan Automated Essay Scoring
Chấm điểm bài viết tự động (AES) là lĩnh vực ứng dụng AI trong giáo dục với lịch sử hơn 50 năm. Hệ thống AES sử dụng các đặc trưng ngôn ngữ và mô hình học máy để đánh giá chất lượng bài viết theo nhiều tiêu chí như ngữ pháp, từ vựng, cấu trúc câu và nội dung ý tưởng. Các hệ thống AES thương mại như e-rater, Turnitin và PEG đã được triển khai rộng rãi tại các kỳ thi chuẩn hóa quốc tế, đạt mức tương quan với giáo viên con người ở mức 0.7–0.9 tùy theo loại bài.

### 2.10.2. Hướng tiếp cận Hybrid AI trong AES
Thế hệ AES hiện đại bắt đầu ứng dụng các Mô hình Ngôn ngữ Lớn (LLM) cho phép đánh giá toàn diện và linh hoạt hơn. LLM có khả năng hiểu ngữ nghĩa sâu và đưa ra nhận xét mang tính sư phạm ở phương thức zero-shot hoặc few-shot.

Tuy nhiên, đối với đặc thù chữ viết tay học sinh tiểu học, nhóm nghiên cứu áp dụng **kiến trúc Hybrid AI** để đạt sự tối ưu về tốc độ, chi phí và tính nhất quán thay vì giao phó toàn bộ quá trình cho một Prompt LLM duy nhất:
1. **Trích xuất văn bản (OCR):** Sử dụng LLM Đa phương thức (Gemini API) để đọc ảnh chữ viết tay, nhưng *chỉ giới hạn ở việc trích xuất nguyên bản*, nghiêm cấm AI tự ý sửa lỗi.
2. **Hiệu chỉnh và Chấm điểm (AES):** Sử dụng mạng nơ-ron cục bộ (ViT5) để sửa lỗi và thuật toán Levenshtein để đối chiếu điểm sai. Barem điểm bị trừ được tính toán bằng các công thức toán học minh bạch dựa trên số lượng lỗi thực tế, đồng thời áp dụng thuật toán phân tích từ vựng (điệp ngữ, hình ảnh so sánh) để tự động đánh giá điểm Sáng tạo. Gemini chỉ đóng vai trò dự phòng (fallback) nếu ViT5 gặp sự cố.

Cách tiếp cận chia để trị (Divide and Conquer) này giúp hệ thống tuân thủ nghiêm ngặt tiêu chuẩn sư phạm, đảm bảo tính nhất quán tuyệt đối giữa các lần chấm (tính deterministic) thay vì phụ thuộc vào tính ngẫu nhiên của LLM sinh tạo.

### 2.10.3. Phản hồi mang tính xây dựng và vai trò con người
Nghiên cứu về tâm lý học đường cho thấy phản hồi tức thì, cụ thể và mang tính khuyến khích có tác động tích cực đến động lực học tập của học sinh tiểu học. Trong hệ thống, luồng tạo nhận xét (Feedback) được xây dựng tự động dựa trên số lượng lỗi thực tế của học sinh thông qua các quy tắc lập trình (Rule-based): hệ thống sẽ chủ động khen ngợi nếu bài xuất sắc, động viên nếu mắc ít lỗi, và nhắc nhở sửa cụ thể nếu sai nhiều. Ngôn từ được tinh chỉnh để phù hợp với lứa tuổi tiểu học.

Bên cạnh đó, mô hình **Human-in-the-Loop** (Con người trong vòng lặp) được áp dụng triệt để. AI chỉ đóng vai trò "trợ giảng", không thay thế hoàn toàn giáo viên. Luồng xử lý của hệ thống bắt buộc giáo viên phải là người xác nhận cuối cùng, cho phép họ chỉnh sửa điểm Hình thức, Nội dung hoặc bổ sung nhận xét thủ công trước khi lưu kết quả chính thức vào cơ sở dữ liệu. Điều này đảm bảo tính trách nhiệm và chính xác tuyệt đối về mặt sư phạm.
