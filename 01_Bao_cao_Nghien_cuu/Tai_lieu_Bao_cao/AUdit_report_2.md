# Báo Cáo Kiểm Định Kỹ Thuật Đối Kháng — ViHand Grade
*(ViHand Grade — Technical Specification Audit & Backlog Khắc Phục Rủi Ro)*

| Thông tin kiểm định | Chi tiết |
| :--- | :--- |
| **Chuyên gia kiểm định** | Kiến trúc sư hệ thống chính, kiểm định đối kháng |
| **Ngày lập báo cáo** | 06/09/2026 |
| **Tài liệu được kiểm định** | `ViHandGrade_Combined_TechSpec_v2.3.0.md` |
| **Phạm vi** | Đối chiếu đặc tả với mã nguồn Next.js, Python AI, Prisma SQLite và Web Dictation |
| **Tổng số phát hiện** | **20 phát hiện**: 6 cao, 8 trung bình, 6 thấp |
| **Trạng thái kiểm định** | 🟠 **CẦN KHẮC PHỤC TRƯỚC KHI TRIỂN KHAI DIỆN RỘNG** |

---

## 📋 Tóm Tắt Rà Soát Kỹ Thuật

> [!NOTE]
> **KẾT QUẢ ĐỐI CHIẾU VỚI CODEBASE (06/09/2026):**
> Báo cáo phân biệt giữa lỗi còn tồn tại, rủi ro đã giảm một phần và khoảng trống đặc tả. Một số nhận định trong bản audit gốc đã được hiệu chỉnh theo mã nguồn thực tế: pipeline Jimp có tự triển khai nhiều phép biến đổi pixel; quan hệ `Class.teacherId` đã được khai báo; nhưng mật khẩu vẫn xử lý dạng văn bản và `imageBase64` vẫn được ghi vào SQLite.
>
> **Lưu ý:** Đây là đánh giá kiến trúc và mã nguồn tĩnh. Các kết luận về độ trễ, độ chính xác OCR, tải đồng thời và tính sẵn sàng sản xuất vẫn cần kiểm thử định lượng.

ViHand Grade có hướng tiếp cận phù hợp với bài toán giáo dục tiểu học: dùng văn bản chuẩn của phiên đọc chính tả để đối chiếu bài viết, kết hợp OCR, xử lý ngôn ngữ và bước giáo viên duyệt kết quả. Tuy nhiên, đặc tả v2.3.0 vẫn còn các mâu thuẫn giữa tuyên bố sản phẩm, hợp đồng API và mã nguồn. Nếu giữ nguyên, hệ thống có thể chấm sai do OCR, phình cơ sở dữ liệu, lộ mật khẩu và thất bại khi nhiều yêu cầu được gửi đồng thời.

**Mức rủi ro tổng thể: CAO.** Trước khi triển khai diện rộng cần xử lý các vấn đề về mật khẩu, lưu trữ ảnh, giới hạn tải ảnh, tính trung thực của tuyên bố “không ảo giác/ngoại tuyến” và tính nhất quán của lược đồ dữ liệu.

### Các nhóm rủi ro chính

1. **Độ tin cậy:** So khớp với văn bản chuẩn giúp hạn chế việc mô hình tự sinh điểm, nhưng không loại bỏ sai số OCR. Mã OCR hiện tại không trả về điểm tin cậy và chưa có cổng chặn ảnh chất lượng thấp.
2. **Tính nhất quán giữa đặc tả và mã nguồn:** Pipeline Jimp hiện có tự cài đặt nhiều phép biến đổi pixel, nhưng chưa có bằng chứng kiểm định tương đương OpenCV trên tập ảnh thực tế. TechSpec không nên mô tả đây là tính năng đã được bảo đảm chỉ dựa trên tên bước xử lý.
3. **Dữ liệu và bảo mật:** Ảnh đã được ghi ra `public/uploads/grades`, nhưng API vẫn lưu nguyên chuỗi `imageBase64` vào trường `Grade.imageBase64`. API đăng nhập vẫn so sánh mật khẩu dạng văn bản.
4. **Hiệu năng và vận hành:** Dịch vụ AI dùng chung cho nhiều tác vụ có thể tạo hàng đợi; mục tiêu độ trễ chưa kèm số liệu P50/P95, giới hạn đồng thời hoặc cơ chế hàng đợi.
5. **Hợp đồng API:** `/api/grade` đang phục vụ cả chính tả và tập làm văn, trong khi dữ liệu đầu vào và đầu ra của hai chế độ khác nhau đáng kể.

### 📊 Ma Trận Phân Bổ 20 Phát Hiện

| Mức độ rủi ro | Số lượng | Mã phát hiện | Tỷ trọng |
| :--- | :---: | :--- | :---: |
| 🔴 **HIGH (Cao)** | **6** | VG-H01 đến VG-H06 | 30% |
| 🟡 **MEDIUM (Trung bình)** | **8** | VG-M01 đến VG-M08 | 40% |
| 🔵 **LOW (Thấp)** | **6** | VG-L01 đến VG-L06 | 30% |
| **TỔNG CỘNG** | **20** | **Backlog kiểm định** | **100%** |

---

## ✅ Bảng Tra Cứu 20 Phát Hiện Cần Xử Lý / Xác Minh

| Mã | Tên phát hiện | Trạng thái trong codebase |
| :---: | :--- | :---: |
| **VG-H01** | Tuyên bố “không ảo giác” không phù hợp với sai số OCR | 🟠 CÒN RỦI RO |
| **VG-H02** | Pipeline Jimp cần được kiểm định thực nghiệm | 🟡 CẦN BENCHMARK |
| **VG-H03** | Tuyên bố “100% ngoại tuyến” mâu thuẫn với Gemini OCR | 🟠 CÒN RỦI RO |
| **VG-H04** | Ảnh vẫn được lưu dạng Base64 trong SQLite | 🔴 CHƯA KHẮC PHỤC |
| **VG-H05** | Chưa có giới hạn tải ảnh được đặc tả rõ ràng | 🟡 CHƯA KIỂM CHỨNG |
| **VG-H06** | Mật khẩu được lưu và kiểm tra dạng văn bản | 🔴 LỖI BẢO MẬT |
| **VG-M01** | Độ trễ Edge-TTS chưa chứng minh là phát trực tuyến | 🟡 CẦN ĐO LƯỜNG |
| **VG-M02** | Thuật toán căn chỉnh được mô tả không nhất quán | 🟡 THIẾU ĐẶC TẢ |
| **VG-M03** | `Grade.dictationSessionId` thiếu ràng buộc quan hệ | 🟠 CẦN MIGRATION |
| **VG-M04** | Chưa có cổng chất lượng ảnh và độ tin cậy OCR | 🟠 CÒN RỦI RO |
| **VG-M05** | Suy luận AI đồng bộ có thể tạo hàng đợi | 🟡 CẦN KIỂM THỬ TẢI |
| **VG-M06** | Endpoint TTS cần xác nhận phương thức và giới hạn URL | 🟡 CHƯA ĐỦ CĂN CỨ |
| **VG-M07** | Hợp đồng `/api/grade` trộn hai chế độ chấm | 🟡 RỦI RO THIẾT KẾ |
| **VG-M08** | Phiên đọc mặc định ở trạng thái `completed` | 🟠 LỖI STATE MACHINE |
| **VG-L01** | Rate limit thiếu hợp đồng vận hành đầy đủ | 🔵 CẦN CHUẨN HÓA |
| **VG-L02** | Bộ lọc teencode không phù hợp miền tiểu học | 🔵 CẦN RÀ SOÁT |
| **VG-L03** | Bộ nhớ đệm âm thanh chưa có giới hạn | 🔵 CẦN GIỚI HẠN |
| **VG-L04** | SacreBLEU chưa đủ để đánh giá sửa lỗi tiếng Việt | 🔵 CẦN BỔ SUNG CHỈ SỐ |
| **VG-L05** | Chính sách lưu trữ chưa tự chứng minh được việc xóa | 🔵 CẦN XÁC MINH |
| **VG-L06** | Tên model Gemini cần cấu hình tập trung | 🔵 CẦN CHUẨN HÓA |

---

## 🔍 Chi Tiết 20 Phát Hiện Kỹ Thuật

### Mức cao

#### VG-H01. Tuyên bố “không ảo giác” không phù hợp với sai số OCR

**Vị trí:** TechSpec §1.1, §2.2, §11.5 và §13; API `/api/ocr`.  
**Trạng thái:** Rủi ro còn tồn tại.

Luồng chấm chính tả dùng `original_text` do Gemini OCR nhận diện rồi so sánh với `DictationSession.passage`. Cách này làm giảm việc mô hình tự sinh nội dung khi chấm, nhưng không loại bỏ lỗi nhận dạng ảnh. API OCR hiện chỉ trả văn bản, không trả độ tin cậy theo ký tự hoặc theo từ. Vì vậy, một dấu thanh bị nhận sai vẫn có thể bị tính là lỗi của học sinh.

**Tác động:** Giáo viên có thể tin rằng điểm là tuyệt đối chính xác và bỏ qua bước kiểm tra lại; lỗi OCR sẽ trở thành lỗi chấm học sinh.

**Khuyến nghị:** Thay “Zero-Hallucination/Không ảo giác” bằng **“Chấm điểm có ràng buộc theo văn bản chuẩn”**. Bổ sung đánh giá chất lượng ảnh, trạng thái `needs_review` và bước giáo viên xác nhận văn bản OCR trước khi tính điểm. Chỉ công bố độ chính xác OCR kèm tập dữ liệu, phương pháp đo và khoảng tin cậy.

#### VG-H02. Pipeline Jimp cần được kiểm định thực nghiệm, không được mặc định tương đương OpenCV

**Vị trí:** TechSpec §2.1, §3.4, §7; `lib/image-processor.ts`.  
**Trạng thái:** Đặc tả diễn đạt quá mức; chưa phải lỗi “không thể triển khai”.

Mã nguồn hiện có các hàm TypeScript tự triển khai box blur bằng integral image, CLAHE, threshold thích ứng, làm nét, đánh giá độ mờ và deskew. Vì vậy kết luận “Jimp hoàn toàn không làm được các phép này” là không chính xác đối với project hiện tại. Tuy nhiên, việc có hàm cùng tên không chứng minh kết quả tương đương OpenCV, đặc biệt với ảnh có bóng, góc nghiêng, đường kẻ ô ly và chữ có dấu.

**Tác động:** Có thể đạt kết quả khác với benchmark hoặc tiêu tốn nhiều CPU/bộ nhớ khi xử lý ảnh lớn; mục tiêu OCR 90–95% sẽ thiếu căn cứ nếu không có kiểm thử hồi quy.

**Khuyến nghị:** Ghi rõ đây là pipeline pixel-level tự triển khai bằng TypeScript/Jimp. Bổ sung benchmark so sánh trước/sau, thời gian xử lý, mức dùng bộ nhớ và chất lượng OCR trên tập ảnh thực tế. Chỉ chuyển sang OpenCV/Python nếu benchmark cho thấy lợi ích rõ ràng.

#### VG-H03. Tuyên bố “100% ngoại tuyến” mâu thuẫn với OCR Gemini

**Vị trí:** TechSpec §1.1, §2.2, §10.  
**Trạng thái:** Rủi ro còn tồn tại.

ViT5 và phần so khớp có thể chạy cục bộ, nhưng cả luồng chấm chính tả và tập làm văn đều gọi Gemini OCR qua mạng. Project chưa có OCR ngoại tuyến tương đương hoặc hàng đợi lưu ảnh để xử lý lại khi kết nối phục hồi.

**Tác động:** Khi mất Internet, giáo viên không thể hoàn tất chấm ảnh dù một phần mô hình đã chạy cục bộ.

**Khuyến nghị:** Chọn và ghi rõ một trong hai phương án: tích hợp OCR cục bộ làm phương án dự phòng; hoặc phân loại hệ thống là **phụ thuộc dịch vụ đám mây**, có hàng đợi ngoại tuyến, trạng thái xử lý và cơ chế thử lại. Không dùng tuyên bố “100% ngoại tuyến” cho toàn bộ pipeline.

#### VG-H04. Ảnh vẫn được lưu dạng Base64 trong SQLite

**Vị trí:** `prisma/schema.prisma`, API `/api/grades`.  
**Trạng thái:** Rủi ro đã được giảm một phần nhưng chưa được xử lý triệt để.

API đã có cơ chế lưu ảnh vào `public/uploads/grades` và ghi `imagePath`. Tuy nhiên, cùng request đó vẫn ghi `imageBase64` vào `Grade.imageBase64`. Base64 làm tăng kích thước dữ liệu khoảng 33% và khiến các truy vấn lấy danh sách điểm có nguy cơ kéo theo trường rất lớn.

**Tác động:** Cơ sở dữ liệu phình nhanh, backup nặng, tăng áp lực bộ nhớ Node.js và gây tranh chấp ghi SQLite.

**Khuyến nghị:** Xóa `imageBase64` khỏi schema sau khi có migration; chỉ lưu `imagePath` hoặc khóa đối tượng lưu trữ. API Gemini có thể nhận Base64 tạm thời trong bộ nhớ. Các endpoint danh sách phải dùng `select` để không tải dữ liệu ảnh.

#### VG-H05. Chưa có cấu hình rõ ràng cho giới hạn kích thước tải ảnh

**Vị trí:** TechSpec §2.1, §5.2, §7; API `/api/preprocess`, `/api/ocr`, `/api/grades`.  
**Trạng thái:** Chưa được kiểm chứng.

Các API hiện nhận JSON chứa `imageBase64`, tức kích thước truyền tải lớn hơn tệp ảnh gốc. Đặc tả chưa nêu giới hạn body, giới hạn kích thước ảnh sau giải mã, thông báo lỗi 413 hoặc quy trình nén ảnh ở phía máy chủ.

**Tác động:** Ảnh điện thoại có thể bị từ chối trước khi xử lý hoặc làm tăng đột biến bộ nhớ.

**Khuyến nghị:** Quy định giới hạn cụ thể ở reverse proxy và Next.js; kiểm tra kích thước trước khi giải mã; ưu tiên `multipart/form-data` hoặc tải tệp trực tiếp vào thư mục tạm. Trả lỗi có hướng dẫn rõ ràng khi ảnh vượt giới hạn.

#### VG-H06. Mật khẩu đang được lưu và kiểm tra dạng văn bản

**Vị trí:** `prisma/schema.prisma`, API `/api/auth/login` và các API tạo người dùng.  
**Trạng thái:** Lỗi bảo mật thực tế.

`User.password` có giá trị mặc định `"123456"`; API đăng nhập đang dùng phép so sánh trực tiếp `user.password !== password`. Comment về bcrypt/Argon2id không tạo ra cơ chế bảo vệ.

**Tác động:** Ai có quyền đọc file SQLite hoặc log/backup có thể lấy mật khẩu; tài khoản khởi tạo có thể dùng chung mật khẩu đoán được.

**Khuyến nghị:** Bỏ giá trị mặc định, bắt buộc mật khẩu đầu vào qua schema xác thực, băm bằng Argon2id hoặc bcrypt trước khi ghi, và dùng hàm verify khi đăng nhập. Cần có migration đổi các tài khoản hiện có và không ghi mật khẩu vào log.

### Mức trung bình

#### VG-M01. Độ trễ Edge-TTS chưa được chứng minh là phát trực tuyến

**Vị trí:** TechSpec §1.2, §8.1, §11.2; module TTS trong `python_service`.  
**Trạng thái:** Tuyên bố hiệu năng chưa đủ bằng chứng.

`edge-tts` thường tạo và tải về tệp âm thanh hoàn chỉnh; việc truyền dữ liệu theo response không đồng nghĩa với phát âm thanh từng phần theo thời gian thực. Mục tiêu dưới 1 giây chưa nêu độ dài câu, điều kiện mạng hay phân vị đo lường.

**Khuyến nghị:** Công bố P50/P95 theo số từ và điều kiện triển khai; tạo trước các đoạn âm thanh khi giáo viên chọn bài; chỉ dùng thuật ngữ “streaming” nếu client thực sự phát được các chunk âm thanh trong lúc tổng hợp.

#### VG-M02. Thuật toán căn chỉnh đang được mô tả không nhất quán

**Vị trí:** TechSpec §6.3; logic so khớp trong API chấm điểm.  
**Trạng thái:** Khoảng trống đặc tả.

Needleman–Wunsch, Levenshtein và `SequenceMatcher` không phải các tên thay thế cho nhau. Chúng có cách tính điểm và kết quả căn chỉnh khác nhau, nhất là khi có thêm, thiếu hoặc đảo vị trí từ.

**Khuyến nghị:** Chọn một thuật toán cho từng cấp: căn chỉnh từ và phân tích âm tiết. Ghi rõ tokenization, chuẩn hóa Unicode, điểm phạt thêm/xóa/thay thế và bộ test hồi quy.

#### VG-M03. Liên kết `Grade.dictationSessionId` chưa có ràng buộc quan hệ

**Vị trí:** `prisma/schema.prisma`.  
**Trạng thái:** Một phần đã sửa.

Quan hệ `Class.teacherId -> User.id` hiện đã được khai báo với `onDelete: SetNull`. Ngược lại, `Grade.dictationSessionId` vẫn là `String @default("")`, chưa có quan hệ tới `DictationSession`. Giá trị rỗng cũng làm lẫn bài tập làm văn với bài chính tả.

**Khuyến nghị:** Đổi thành `String?`, khai báo quan hệ tới `DictationSession` với `onDelete: SetNull`, chạy migration và cập nhật truy vấn lọc theo `null` thay vì chuỗi rỗng.

#### VG-M04. Chưa có cổng kiểm tra chất lượng ảnh và độ tin cậy OCR

**Vị trí:** `lib/image-processor.ts`, API `/api/preprocess`, `/api/ocr`, `/api/grade`.  
**Trạng thái:** Có báo cáo chất lượng nhưng chưa thấy chính sách chặn thống nhất.

Pipeline có trả về `QualityReport` gồm độ mờ, độ sáng, độ phân giải và tỷ lệ pixel tối. Tuy nhiên, API OCR/chấm điểm chưa thể hiện rõ ngưỡng từ chối, trạng thái cần giáo viên xem lại hoặc việc không tính điểm khi ảnh không đạt.

**Khuyến nghị:** Xác định ngưỡng bằng benchmark, trả HTTP 422 cho ảnh không đạt, lưu lý do kiểm tra và hiển thị cho giáo viên. Không tự gán lỗi chính tả khi chất lượng ảnh thấp.

#### VG-M05. Suy luận AI đồng bộ có thể tạo hàng đợi khi nhiều giáo viên dùng đồng thời

**Vị trí:** TechSpec §2.1, §9.1; API `/api/grade` gọi dịch vụ ViT5.  
**Trạng thái:** Rủi ro vận hành cần đo tải.

FastAPI có thể nhận nhiều request, nhưng suy luận PyTorch trên CPU vẫn tiêu tốn tài nguyên và có thể làm các request chờ nhau. Endpoint hiện chờ kết quả trong request HTTP, với timeout ViT5 tới 120 giây.

**Khuyến nghị:** Đo tải với 1, 2, 4 và 8 request đồng thời. Nếu vượt SLA, tách worker theo mô hình hoặc dùng hàng đợi tác vụ trả `jobId`, trạng thái và kết quả. Bổ sung khóa chống gửi trùng khi giáo viên bấm lại.

#### VG-M06. Endpoint TTS cần được xác nhận về phương thức và giới hạn URL

**Vị trí:** TechSpec §5.4, §8.1 và module TTS.  
**Trạng thái:** Không đủ căn cứ kết luận vì đường dẫn route không nằm tại `app/api/tts/route.ts` trong cấu trúc hiện tại.

Đặc tả mô tả `GET /tts?text=...`. Nếu triển khai đúng như vậy, văn bản dài và ký tự Unicode sẽ làm URL dài, khó quan sát lỗi và có thể bị giới hạn bởi proxy.

**Khuyến nghị:** Kiểm tra route thực tế trong `python_service/main.py` và client gọi TTS. Ưu tiên `POST` với JSON cho đoạn văn dài; nếu giữ `GET`, phải đặt giới hạn độ dài và có kiểm thử Unicode.

#### VG-M07. Hợp đồng `/api/grade` trộn hai chế độ chấm

**Vị trí:** API `/api/grade`, giao diện `/teacher/grade`, schema `Grade`.  
**Trạng thái:** Rủi ro thiết kế.

Chính tả cần `groundTruthText`, căn chỉnh và nhóm lỗi; tập làm văn cần nội dung, sáng tạo, nhận xét sư phạm và đánh giá hai tầng. Việc gom các trường này vào một payload khiến nhiều trường trở thành chuỗi rỗng hoặc phụ thuộc vào `gradingMode` ở runtime.

**Khuyến nghị:** Tách `POST /api/grade/dictation` và `POST /api/grade/essay`, hoặc dùng discriminated union với schema Zod chặt chẽ. Chuẩn hóa tên trường theo camelCase ở API và chỉ ánh xạ sang tên hiển thị tiếng Việt ở giao diện.

#### VG-M08. Trạng thái mặc định của phiên đọc là `completed`

**Vị trí:** `DictationSession.status` trong `prisma/schema.prisma`.  
**Trạng thái:** Lỗi mô hình trạng thái.

Luồng nghiệp vụ mô tả phiên được tạo, đọc, ghi nhật ký rồi mới hoàn tất; nhưng schema mặc định là `completed`. Trình duyệt dừng giữa chừng vẫn có thể để lại một phiên trông như đã hoàn tất.

**Khuyến nghị:** Đặt mặc định `in_progress`; chỉ chuyển sang `completed` sau khi lưu thành công nội dung và nhật ký cuối. Quy định rõ các chuyển trạng thái hợp lệ và cơ chế hủy/khôi phục.

### Mức thấp

#### VG-L01. Rate limit chưa có hợp đồng vận hành đầy đủ

`lib/api-guard.ts` đang được gọi với mức 30 request/phút cho route AI, nhưng đặc tả chưa nêu thuật toán, nơi lưu trạng thái, cách nhận diện IP sau reverse proxy hoặc chính sách cho nhiều người dùng chung một NAT.

**Khuyến nghị:** Ghi rõ sliding window/token bucket, burst, khóa theo tài khoản hoặc lớp học, `Retry-After` và cách xử lý `X-Forwarded-For`. Không dùng IP đơn độc làm định danh người dùng trong mạng trường học.

#### VG-L02. Bộ lọc teencode không phù hợp với miền dữ liệu tiểu học

Nếu pipeline vẫn có bước đổi `ko`, `dc` thành từ đầy đủ, cần bỏ hoặc giới hạn bước này. Bài viết tiểu học cần ưu tiên chuẩn hóa Unicode, khoảng trắng, viết hoa, xuống dòng và lỗi dấu; không nên tự động biến đổi từ có thể là nội dung học sinh viết.

#### VG-L03. Bộ nhớ đệm âm thanh trên trình duyệt chưa có giới hạn

`AudioMap` hoặc cơ chế tương đương cần giới hạn số đoạn, kích thước và thời gian sống. Nên dùng LRU khoảng 10–15 đoạn, giải phóng `ObjectURL` và cân nhắc IndexedDB cho các đoạn cần phát lại.

#### VG-L04. SacreBLEU không đủ để đánh giá sửa lỗi tiếng Việt

Điểm BLEU đơn lẻ không phản ánh riêng khả năng phát hiện lỗi, sửa lỗi và giữ nguyên câu đúng. Báo cáo benchmark cần bổ sung precision, recall, F1 ở cấp lỗi/từ, cùng đánh giá của giáo viên và độ nhất quán giữa người chấm.

#### VG-L05. Trường lưu trữ dữ liệu chưa tự chứng minh được chính sách xóa

`expiresAt`, `isAnonymized` và `anonymizedAt` đã có trong schema; project cũng có route retention. Tuy nhiên, cần xác nhận có lịch chạy định kỳ, log kết quả, xóa ảnh vật lý trong `public/uploads/grades` và xử lý lỗi khi ẩn danh. Trường dữ liệu không tự thực thi chính sách lưu trữ.

#### VG-L06. Tên model Gemini phải được cấu hình và kiểm tra khi khởi động

Project hiện dùng chuỗi `gemini-3.1-flash-lite` ở nhiều vị trí mã nguồn. Tên model, hạn mức và khả năng vision cần được xác nhận trong môi trường triển khai; không nên rải chuỗi này trong nhiều route. Đưa model vào biến môi trường, kiểm tra health check và định nghĩa fallback có kiểm soát.

---

# PHẦN II — LỘ TRÌNH KHẮC PHỤC ƯU TIÊN (BACKLOG)

### Giai đoạn 1: Bắt buộc trước pilot

| Mã | Việc cần làm | Tiêu chí hoàn tất |
|---|---|---|
| VG-H06 | Băm và xác minh mật khẩu | Không còn so sánh plaintext; migration tài khoản và test đăng nhập thành công |
| VG-H04 | Loại `imageBase64` khỏi DB | Chỉ lưu đường dẫn/khóa ảnh; endpoint danh sách không tải nội dung ảnh |
| VG-H05 | Chuẩn hóa upload ảnh | Có giới hạn body, giới hạn ảnh sau giải mã, lỗi 413/422 và test ảnh lớn |
| VG-H01, VG-M04 | Cổng chất lượng và duyệt OCR | Có ngưỡng, trạng thái cần xem lại, giao diện xác nhận và test ảnh mờ |
| VG-H03 | Quyết định offline/cloud | Cập nhật TechSpec, luồng retry và thông báo đúng cho giáo viên |

### Giai đoạn 2: Trước triển khai chính thức

| Mã | Việc cần làm | Tiêu chí hoàn tất |
|---|---|---|
| VG-M03, VG-M08 | Hoàn thiện quan hệ và state machine | Migration, foreign key, chuyển trạng thái và kiểm thử khôi phục |
| VG-M07 | Tách hoặc ràng buộc API chấm điểm | Schema có phân biệt chế độ, không còn payload trường mơ hồ |
| VG-M02 | Chốt thuật toán căn chỉnh | Có tham số, test hồi quy và tài liệu giải thích |
| VG-M05 | Kiểm thử đồng thời | Có số liệu P50/P95 và cơ chế hàng đợi hoặc giới hạn rõ ràng |
| VG-M01, VG-M06 | Chuẩn hóa TTS | Phương thức request, kích thước dữ liệu và độ trễ được đo thực tế |

### Giai đoạn 3: Tối ưu và hoàn thiện hồ sơ

| Mã | Việc cần làm |
|---|---|
| VG-H02 | Benchmark pipeline Jimp trên ảnh thực tế và ghi đúng giới hạn kỹ thuật |
| VG-L01 | Hoàn thiện rate limit theo tài khoản/lớp học và reverse proxy |
| VG-L02, VG-L03 | Bỏ teencode không cần thiết, giới hạn cache âm thanh |
| VG-L04 | Bổ sung bộ chỉ số đánh giá sửa lỗi và đánh giá người chấm |
| VG-L05 | Tự động hóa retention, xóa ảnh và audit log |
| VG-L06 | Cấu hình model Gemini tập trung, health check và fallback |

## 📌 Tổng Kết & Đánh Giá Khả Năng Triển Khai

Sau quá trình đối chiếu đặc tả với mã nguồn:

- **20 phát hiện** được ghi nhận: 6 mức cao, 8 mức trung bình và 6 mức thấp.
- **Hai ưu tiên bắt buộc trước pilot:** loại bỏ lưu Base64 trong SQLite và triển khai hashing mật khẩu.
- **Các tuyên bố cần hiệu chỉnh:** “không ảo giác”, “100% ngoại tuyến” và “streaming TTS” chỉ được sử dụng sau khi có kiểm thử định lượng chứng minh.
- **Đánh giá hiện tại:** Chưa đủ cơ sở để kết luận hệ thống sẵn sàng triển khai diện rộng; cần hoàn thành các mục mức cao và các migration dữ liệu trước.

Đặc tả v2.3.0 có thể tiếp tục làm nền cho project sau khi cập nhật thuật ngữ, hợp đồng API và trạng thái thực tế của codebase. Các phát hiện về Jimp, quan hệ `Class.teacherId` và retention đã được diễn đạt lại để tránh tạo backlog sai hướng.

*Hết báo cáo.*
