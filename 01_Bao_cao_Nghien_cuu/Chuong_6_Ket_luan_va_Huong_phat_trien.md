# CHƯƠNG 6. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

## 6.1 Kết luận

Bài toán chấm điểm và nhận diện lỗi chính tả trong văn bản chữ viết tay của học sinh tiểu học là một thách thức lớn, tiêu tốn nhiều thời gian và công sức của giáo viên. Thông qua hệ thống **ViHand Grade**, nghiên cứu này đã chứng minh tiềm năng to lớn của việc ứng dụng Trí tuệ nhân tạo (AI), cụ thể là mô hình đa phương thức lớn (Gemini) kết hợp với các kỹ thuật tiền xử lý ảnh số, vào lĩnh vực công nghệ giáo dục (EdTech).

Bằng cách xây dựng một quy trình khép kín — từ việc số hóa ảnh chụp bài làm, tiền xử lý hình ảnh 9 bước (khử nhiễu, cân bằng sáng, tăng cường độ tương phản), cho đến việc sử dụng LLM để thực hiện OCR và phân tích ngôn ngữ tự nhiên — hệ thống đã tự động hóa thành công quá trình phát hiện các dấu hiệu sai sót về chính tả, ngữ pháp và hình thức trình bày. Kết quả thực nghiệm cho thấy hệ thống giúp giáo viên đưa ra các nhận xét chi tiết, nhanh chóng và chính xác hơn đáng kể so với phương pháp chấm bài thủ công truyền thống.

Ứng dụng của bài toán này không chỉ giúp giảm bớt gánh nặng hành chính và thời gian chấm bài cho giáo viên, mà còn cung cấp một công cụ học tập phản hồi tức thời (instant feedback) cho học sinh. Điều này tạo điều kiện cho việc cá nhân hóa lộ trình học tập, giúp phụ huynh và giáo viên dễ dàng theo dõi sự tiến bộ của con em mình. Nhìn xa hơn, nó có tiềm năng thu hẹp khoảng cách tiếp cận giáo dục chất lượng cao, mang lại sự công bằng trong đánh giá.

Tuy nhiên, cần phải lưu ý rằng hệ thống AI hiện tại được thiết kế dưới dạng công cụ hỗ trợ quyết định (Decision Support System - DSS). Việc áp dụng mô hình này vào môi trường giáo dục thực tế vẫn cần sự giám sát định kỳ của giáo viên để đảm bảo tính nhân văn và sự khích lệ phù hợp với tâm lý trẻ nhỏ. Ngoài ra, việc bảo vệ quyền riêng tư, an toàn dữ liệu hình ảnh và thông tin cá nhân của học sinh cũng là một vấn đề pháp lý và đạo đức cực kỳ quan trọng cần được tuân thủ nghiêm ngặt.

Nhìn chung, ViHand Grade hứa hẹn mang lại nhiều lợi ích thiết thực. Việc kết hợp linh hoạt giữa kiến trúc Web hiện đại (Next.js), phần cứng nhúng chi phí thấp (Raspberry Pi 4) và sức mạnh của Cloud AI (Gemini) đã tạo ra một giải pháp toàn diện, khả thi và dễ dàng triển khai ở quy mô trường học, góp phần thúc đẩy công cuộc chuyển đổi số trong giáo dục tại Việt Nam.

## 6.2 Hướng phát triển

**Hướng 1:** Xây dựng và tinh chỉnh mô hình ngôn ngữ nhỏ (Small Language Models - SLM / Edge AI) chuyên biệt cho tiếng Việt để chạy cục bộ (offline) hoàn toàn trên các thiết bị như Raspberry Pi. Điều này giúp loại bỏ sự phụ thuộc vào API của bên thứ ba, giảm độ trễ do mạng lưới và giải quyết triệt để bài toán bảo mật dữ liệu học sinh.

**Hướng 2:** Hợp tác với các giáo viên, chuyên gia giáo dục tiểu học để chuẩn hóa bộ tiêu chí chấm điểm (Rubric). Đồng thời, triển khai thử nghiệm thực tế tại các trường học để thu thập một tập dữ liệu chữ viết tay đa dạng hơn (về loại giấy, loại bút, vùng miền, các lỗi phương ngữ đặc thù), từ đó áp dụng các kỹ thuật Fine-tuning giúp hệ thống xử lý tốt hơn các mẫu chữ viết rối rắm hoặc rất khó đọc.

**Hướng 3:** Tích hợp sâu các công nghệ Xử lý Ngôn ngữ Tự nhiên (NLP) để không chỉ dừng lại ở việc bắt lỗi chính tả mà còn có khả năng đánh giá cảm thụ văn học. Mô hình sẽ được huấn luyện để phân tích cấu trúc đoạn văn miêu tả, văn kể chuyện, đánh giá tính logic, vốn từ vựng và sự sáng tạo trong diễn đạt của học sinh.

**Hướng 4:** Phát triển ứng dụng di động (Mobile App) đa nền tảng (iOS/Android) tích hợp các công nghệ AR (Thực tế tăng cường) để hướng dẫn người dùng căn chỉnh khung hình khi chụp ảnh bài viết tốt hơn, kết hợp với các cơ chế Gamification (trò chơi hóa) để khích lệ học sinh sau khi nhận được kết quả chấm điểm.

Ngoài 4 hướng phát triển chính như trên, nhóm nghiên cứu còn đề xuất thêm một số hướng phát triển phụ như sau:

- **Tối ưu hóa hiệu suất:** Chuyển đổi các thuật toán tiền xử lý ảnh (hiện đang dùng JavaScript/Jimp) sang các ngôn ngữ biên dịch hiệu năng cao như C++ (OpenCV) hoặc WebAssembly (Wasm). Điều này giúp tiết kiệm tài nguyên bộ nhớ và giảm thời gian tính toán trên phần cứng hạn chế của Raspberry Pi.
- **Xử lý sự cố "Ảo giác" (Hallucination) của AI:** Phát triển cơ chế kiểm tra chéo bằng nhiều mô hình (Ensemble learning) hoặc sử dụng các từ điển tiếng Việt đối chiếu nội bộ nhằm đánh giá độ tin cậy của các dự đoán, đảm bảo AI không tự bịa ra các lỗi chính tả không tồn tại trong bài.
- **Mở rộng khả năng xử lý bài kiểm tra trắc nghiệm và Toán học:** Tích hợp thêm các module nhận dạng quang học đặc thù để chấm điểm các bài thi trắc nghiệm (OMR) và nhận diện công thức toán học (Math OCR), biến hệ thống thành một nền tảng chấm thi toàn diện.
- **Tích hợp với hệ thống giáo dục hiện hành (LMS):** Cải tiến hệ thống để có khả năng giao tiếp và đồng bộ điểm số, nhận xét trực tiếp vào các phần mềm Quản lý trường học (như VnEdu, SMAS), tạo ra sự liền mạch trong quy trình quản lý điểm của nhà trường.
- **Giao diện tương tác thân thiện với trẻ em:** Thay vì chỉ trả về báo cáo dạng văn bản, hệ thống có thể kết hợp với AI Voice (Text-to-Speech) và AI Avatar để "đọc" nhận xét bằng giọng nói truyền cảm, thân thiện, giúp học sinh tiểu học dễ dàng tiếp thu phản hồi mà không bị áp lực điểm số.
- **Nghiên cứu tác động sư phạm:** Thực hiện các nghiên cứu A/B Testing trong môi trường lớp học thực tế để đánh giá tác động của việc nhận phản hồi từ AI đối với tốc độ cải thiện chữ viết và ngữ pháp của học sinh theo thời gian.
- **Quyền riêng tư và đạo đức AI:** Xây dựng cơ chế làm mờ (blurring) hoặc tự động cắt bỏ phần chứa tên, trường lớp của học sinh trên ảnh trước khi truyền tải dữ liệu, đảm bảo tuyệt đối các quy định về bảo vệ trẻ em trên không gian mạng và Luật An ninh mạng.
