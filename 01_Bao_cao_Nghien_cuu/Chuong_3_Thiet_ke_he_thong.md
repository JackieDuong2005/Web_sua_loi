# Chương 3: Thiết kế hệ thống và mô hình

Chương này đi sâu vào việc thiết kế cấu trúc tổng thể và chi tiết các luồng xử lý cốt lõi của hệ thống ViHand Grade, từ khi tiếp nhận ảnh chụp của người dùng đến lúc trả về kết quả chấm điểm cuối cùng.

## 3.1. Kiến trúc tổng thể hệ thống

Hệ thống ViHand Grade được thiết kế theo mô hình kiến trúc Client-Server hiện đại, sử dụng framework Next.js App Router cho cả frontend và backend, kết hợp với cơ sở dữ liệu SQLite thông qua Prisma ORM. Mô hình hoạt động dựa trên sự phối hợp chặt chẽ giữa thiết bị biên (Raspberry Pi 4) chạy AI cục bộ và Trí tuệ nhân tạo đa phương thức trên điện toán đám mây (Hybrid AI).

Kiến trúc tổng thể bao gồm các thành phần chính:
1. **Frontend (Giao diện người dùng):** Phát triển bằng Next.js 16 và React 19, thiết kế Responsive hỗ trợ PWA để cài đặt như ứng dụng độc lập trên điện thoại.
2. **Backend / API Routes:** Tích hợp trong Next.js, điều hướng luồng xử lý ảnh (`/api/preprocess`), gọi đám mây (`/api/ocr`), và gọi local (`/api/grade`).
3. **Local AI Microservice (Python/FastAPI):** Chạy mô hình mạng nơ-ron ViT5 (Quantized INT8) để sửa lỗi chính tả và thuật toán Levenshtein để chấm điểm.
4. **Cloud AI (Google Gemini):** Cung cấp API `gemini-3.1-flash-lite` phục vụ việc đọc chữ nguyên bản (OCR).

*(Hình 3.1 Sơ đồ luồng hoạt động tổng thể của hệ thống)*

Quy trình xử lý dữ liệu tổng thể diễn ra qua các giai đoạn tuần tự sau:
1. **Thu nhận dữ liệu đầu vào:** Người dùng (giáo viên hoặc học sinh) sử dụng điện thoại thông minh chụp ảnh trực tiếp bài viết tay chính tả trên giấy ô ly của học sinh và tải lên giao diện Web.
2. **Tiền xử lý ảnh số cục bộ:** Hệ thống tự động kích hoạt bộ tiền xử lý gồm 9 bước viết trên nền thư viện Jimp. Ảnh thô được tự động xoay, chuẩn hóa kích thước, loại bỏ ám màu, bóng che, căn chỉnh góc nghiêng và tăng cường nét chữ để tạo ra một tệp ảnh tối ưu nhất cho OCR.
3. **Trích xuất văn bản (OCR) bằng Cloud AI:** Ảnh sau khi xử lý được mã hóa dạng Base64 và truyền đến API của Google Gemini. Điểm khác biệt cốt lõi là AI lúc này **không** được giao nhiệm vụ phân tích lỗi; nó chỉ thực hiện duy nhất nhiệm vụ nhận dạng và trích xuất chữ viết tay nguyên bản tiếng Việt (bao gồm cả các chữ viết sai của học sinh).
4. **Phân tích lỗi và tính điểm (Edge AI):** Dữ liệu văn bản thô được chuyển về máy chủ cục bộ cho mô hình ViT5 xử lý. Hệ thống tính toán điểm số bằng cách sử dụng thuật toán Levenshtein để so khớp, chỉ rõ vị trí lỗi, đề xuất từ sửa đúng, giải thích nguyên nhân sai và tự động trừ điểm theo barem chuẩn sư phạm. Các tiêu chí khác như hình thức, sáng tạo cũng được đánh giá tự động dựa trên thuật toán phân tích từ vựng.
5. **Duyệt và lưu trữ (Human-in-the-Loop):** Kết quả chấm điểm sơ bộ (kèm nhận xét tự động) sẽ được hiển thị cho giáo viên duyệt. Sau khi giáo viên xác nhận hoặc điều chỉnh thủ công, kết quả cuối cùng mới được lưu trữ vào cơ sở dữ liệu SQLite thông qua Prisma ORM, đồng thời biểu diễn trực quan trên giao diện báo cáo tiến bộ của học sinh.

## 3.2. Quy trình tiền xử lý ảnh số

Ảnh chụp bài viết tay của học sinh tiểu học thường chịu nhiều yếu tố nhiễu (môi trường ánh sáng, bóng đổ, nét chì mờ, góc nghiêng). Do đó, một module tiền xử lý ảnh chuyên dụng (Image Processing Pipeline) được xây dựng thuần túy bằng TypeScript và Jimp (`lib/image-processor.ts`), chạy hoàn toàn trên server cục bộ để làm "sạch" dữ liệu trước khi gửi lên AI đám mây.

### 3.2.1. Chi tiết thuật toán từng bước trong pipeline

Pipeline bao gồm 9 bước (từ Bước 0 đến Bước 8):

- **Bước 0: Tự động xoay ảnh (EXIF Auto-rotate):** Phân tích siêu dữ liệu EXIF (tag Orientation 0x0112) được ghi lại bởi camera điện thoại. Hệ thống tự động lật hoặc xoay ảnh (90°, 180°, 270°) về đúng chiều dọc chuẩn của văn bản.
- **Bước 0.5: Hiệu chỉnh góc nghiêng (Deskew):** Tự động phát hiện góc nghiêng của giấy (do đặt máy ảnh bị xéo). Hệ thống thu nhỏ ảnh tạm thời, dùng thuật toán nhị phân hóa Otsu, loại bỏ các đường kẻ ô ly, sau đó tính toán phương sai hình chiếu (Projection Variance) từ -15° đến +15° để tìm ra góc nghiêng văn bản chuẩn nhất. Cuối cùng xoay ảnh ngược lại góc đó để các dòng chữ nằm ngang tuyệt đối.
- **Bước 1: Thay đổi kích thước (Resize):** Giới hạn chiều rộng tối đa của ảnh ở mức 1600px để giảm thiểu khối lượng tính toán mà không làm suy giảm chi tiết nét chữ.
- **Bước 2: Cân bằng trắng (White Balance):** Áp dụng thuyết "Thế giới xám" (Gray World Assumption) trên các kênh màu RGB để loại bỏ hiện tượng ám màu do ánh sáng đèn học hoặc ánh sáng mặt trời không đều.
- **Bước 3: Chuyển đổi ảnh xám (Grayscale):** Khử hoàn toàn thông tin màu, chuyển ma trận ảnh về dạng 1-channel (256 sắc độ xám) nhằm tối ưu tốc độ xử lý cho các bước sau.
- **Bước 4: Khử bóng đổ (Shadow Removal):** Sử dụng phép làm mờ khối (Box Blur) với kích thước Kernel lớn để ước lượng nền ảnh (tờ giấy). Sau đó, ảnh gốc sẽ được chia cho ảnh nền ước lượng này, giúp triệt tiêu hoàn toàn các bóng tối không đồng đều.
- **Bước 5: Tăng tương phản thích nghi (CLAHE):** Chia ảnh thành lưới 8x8 ô vuông, tính toán và cân bằng biểu đồ mức xám (Histogram Equalization) trên từng ô, đồng thời giới hạn độ dốc (Clip Limit = 2.0) để ngăn chặn việc khuếch đại nhiễu nền. Bước này giúp nét bút chì mờ trở nên nổi bật hơn so với mặt giấy trắng.
- **Bước 6: Làm nét chữ (Sharpen - Unsharp Mask):** Tăng cường biên độ ranh giới giữa nét chữ đen và nền trắng, khắc phục tình trạng chữ bị nhòe do rung tay khi chụp.
- **Bước 7: Đánh giá chất lượng (Quality Assessment):** Trước khi nhị phân hóa, hệ thống tính toán các thang điểm cảnh báo (Blur score bằng Laplacian variance, Brightness, tỷ lệ pixel đen). Nếu ảnh quá mờ hoặc nét chữ quá nhòe, hệ thống trả về `qualityReport` để cảnh báo giáo viên chụp lại ảnh.
- **Bước 8: Nhị phân hóa thích nghi (Adaptive Threshold):** Chuyển ảnh xám thành ảnh đen trắng tuyệt đối (0 hoặc 255). Thay vì chọn 1 ngưỡng cho toàn bức ảnh (Otsu), hệ thống tính toán ngưỡng riêng cho từng khu vực nhỏ (Block Size) dựa trên Tích phân hình ảnh (Integral Image), giúp làm rõ chữ viết ở những vùng có nền giấy loang lổ.

## 3.3. Quy trình chấm điểm bằng AI đa phương thức

Quá trình AI chấm điểm bài làm tuân theo cơ chế chia để trị (Divide and Conquer). Hệ thống không gộp chung việc "đọc chữ" và "chấm điểm" vào cùng một prompt AI nhằm tránh hiện tượng sinh tạo tự do (hallucination) của các mô hình LLM.

### 3.3.1. Các thành phần chính của quy trình chấm điểm

Quy trình trải qua 3 giai đoạn chính nối tiếp nhau:

1. **Trích xuất văn bản (OCR) bằng Gemini API:**
   - Ảnh sau khi qua luồng tiền xử lý (Bước 3.2) được mã hóa Base64 và gửi lên `gemini-3.1-flash-lite`.
   - **Kỹ thuật Prompting:** Mô hình bị buộc tuân thủ nguyên tắc "Chỉ trích xuất nguyên văn" (kể cả những từ sai chính tả, không tự ý sửa đổi) và bỏ qua các nét gạch xóa, chữ nháp. Kết quả trả về là một đoạn văn bản thô đại diện chính xác cho những gì học sinh đã viết.

2. **Hiệu chỉnh chính tả bằng ViT5 (Local AI):**
   - Văn bản thô được tiền xử lý lọc Teencode và chia nhỏ thành từng câu (Chunking).
   - Truyền vào dịch vụ FastAPI chạy mô hình ViT5 trên Raspberry Pi.
   - ViT5 sẽ biên dịch chuỗi câu sai thành một chuỗi câu hoàn chỉnh đúng ngữ pháp và chính tả tiếng Việt.

3. **Chấm điểm và phân tích lỗi (Levenshtein & Rule-based):**
   - Hệ thống áp dụng thuật toán `SequenceMatcher` để so khớp (word-by-word alignment) văn bản gốc (từ Gemini) và văn bản chuẩn (từ ViT5).
   - Tự động trích xuất các thao tác (Xóa, Thêm, Thay thế) và phân loại lỗi: lỗi phụ âm đầu, lỗi vần, lỗi dấu thanh, hay lỗi viết hoa.
   - **Đánh giá điểm số:** Trừ điểm tuần tự cho mỗi lỗi mắc phải trên quỹ điểm chuẩn. (Ví dụ: -0.5đ / lỗi).
   - **Đánh giá Sáng tạo:** Áp dụng thuật toán Heuristic quét các biểu hiện của biện pháp tu từ (so sánh, từ láy, điệp từ) trong văn bản để tự động cộng điểm nghệ thuật.
   - **Sinh Feedback:** Dựa trên số lượng lỗi đếm được, hệ thống tự động sinh lời nhận xét mang tính sư phạm và động viên, phù hợp tâm lý học sinh.
   - **Cơ chế Fallback:** Trong trường hợp dịch vụ ViT5 ở Raspberry Pi gặp sự cố (quá tải CPU), hệ thống tự động gọi API Gemini để thực hiện chấm điểm khẩn cấp bằng văn bản (text-only) nhằm đảm bảo quá trình giảng dạy không bị gián đoạn.

## 3.4. Phân quyền và xác thực người dùng

Hệ thống được thiết kế dành cho ba nhóm đối tượng người dùng với mức độ tiếp cận dữ liệu khác nhau. 

### 3.4.1. Cơ chế quản lý và phân quyền dữ liệu

Mô hình dữ liệu (Data Schema) quản lý tài khoản qua biến `role` gán vào từng người dùng: `"admin"`, `"teacher"`, và `"student"`. Giao diện Next.js điều hướng thanh công cụ (Sidebar) và các trang chức năng hoàn toàn dựa trên cấu trúc Role-Based Access Control (RBAC):

1. **Giáo viên (Teacher):**
   - **Quản lý học thuật:** Gửi hình ảnh và kích hoạt hệ thống AI chấm điểm.
   - **Human-in-the-Loop:** Quyền can thiệp quan trọng nhất. AI chỉ được xem là "trợ giảng", trả về kết quả dưới dạng bản nháp. Giáo viên có toàn quyền kiểm duyệt lỗi, chỉnh sửa điểm Hình thức, điểm Nội dung và tự tay sửa lại nhận xét trước khi nhấn "Lưu kết quả".
   - **Báo cáo:** Quản lý bài tập đã giao và xem biểu đồ phổ điểm, lịch sử tiến bộ của từng học sinh trong lớp mình quản lý.

2. **Học sinh (Student):**
   - Quyền hạn chỉ xem (Read-only).
   - Truy cập trang cá nhân để xem lịch sử điểm số, bảng phân tích các lỗi chính tả mình hay mắc phải, văn bản gốc (do mình viết) được đặt song song với văn bản chuẩn (do AI sửa) để tự rút kinh nghiệm.

3. **Quản trị viên (Admin):**
   - Nắm giữ quyền vận hành cấp cao: tạo, sửa, xóa tài khoản giáo viên và học sinh; quản lý danh sách lớp học.
   - Giám sát cấu hình hệ thống (như thay đổi điểm trừ mặc định cho mỗi lỗi chính tả). 

Cơ chế phân quyền này gắn liền với các truy vấn bảo mật trong Prisma ORM, đảm bảo học sinh không thể gọi API gửi ảnh chấm điểm trái phép hoặc thay đổi dữ liệu bảng điểm.
