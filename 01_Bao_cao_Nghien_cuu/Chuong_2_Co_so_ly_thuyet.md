# CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ NỀN TẢNG

---

## 2.1. NHẬN DẠNG KÝ TỰ QUANG HỌC (OCR) VÀ XU HƯỚNG AI ĐA PHƯƠNG THỨC

### 2.1.1. Khái niệm và phân loại OCR
Nhận dạng ký tự quang học (Optical Character Recognition - OCR) là lĩnh vực nghiên cứu thuộc thị giác máy tính nhằm chuyển đổi hình ảnh chứa văn bản (như tài liệu scan, ảnh chụp bảng hiệu, chữ viết tay) thành dữ liệu văn bản có thể xử lý và tìm kiếm bằng máy tính. 

Trong thực tiễn nghiên cứu khoa học, công nghệ OCR được chia làm ba nhóm chính:
1. **OCR chữ in (Printed OCR):** Nhận dạng tài liệu in ấn với các font chữ tiêu chuẩn. Do tính chất nét chữ đều, khoảng cách ký tự rõ ràng, độ chính xác của các mô hình hiện nay thường đạt trên $99\%$.
2. **OCR viết tay trực tuyến (Online Handwritten OCR):** Nhận dạng chữ viết tay khi người dùng thao tác trực tiếp trên màn hình cảm ứng hoặc bảng vẽ kỹ thuật số. Hệ thống ghi nhận được tọa độ đầu bút theo thời gian thực, thứ tự nét viết và tốc độ viết, giúp việc phân tích ký tự dễ dàng và đạt độ chính xác từ $90\% - 95\%$.
3. **OCR viết tay ngoại tuyến (Offline Handwritten OCR):** Nhận dạng từ hình ảnh tĩnh được chụp lại sau khi bài viết đã hoàn thành. Đây là bài toán có độ phức tạp cao nhất do mô hình không có thông tin về quỹ đạo nét bút và phải đối mặt trực tiếp với các vấn đề nhiễu ảnh vật lý.

Hệ thống **ViHand Grade** tập trung giải quyết bài toán thuộc nhóm **OCR viết tay ngoại tuyến**, ứng dụng cụ thể vào chữ viết của học sinh tiểu học Việt Nam.

### 2.1.2. Thách thức đặc thù trong OCR chữ viết tay tiểu học tiếng Việt
Chữ viết tay của học sinh tiểu học (lớp 1 đến lớp 5) mang những đặc điểm hình thái và ngữ cảnh cực kỳ phức tạp, tạo nên những thách thức lớn đối với các thuật toán nhận dạng truyền thống:
- **Nét chữ chưa định hình:** Học sinh cấp tiểu học đang trong giai đoạn rèn luyện kỹ năng cơ vận động tinh, dẫn đến kích thước ký tự không đồng đều, độ nghiêng nét viết biến thiên lớn và khoảng cách giữa các chữ cái thường không tuân theo quy luật chuẩn.
- **Nét viết bút chì mờ nhạt:** Học sinh lớp nhỏ thường sử dụng bút chì gỗ hoặc bút chì kim. Nét viết có độ đậm nhạt không đồng nhất và độ tương phản giữa nét chữ với nền giấy thường rất thấp.
- **Tính đa dạng và tinh tế của dấu thanh tiếng Việt:** Tiếng Việt sở hữu hệ thống 6 thanh điệu (ngang, sắc, huyền, hỏi, ngã, nặng) và các nguyên âm đôi/ba có dấu phụ (ă, â, ê, ô, ơ, ư). Các dấu này có kích thước nhỏ, mảnh, dễ bị đứt nét hoặc dính vào ký tự chính đứng trước hoặc đứng sau.
- **Nhiễu cấu trúc dòng kẻ ô ly:** Học sinh tiểu học Việt Nam bắt buộc phải viết trên tập giấy có lưới ô ly (grid lines) để căn chỉnh nét chữ. Dòng lưới ô ly này thường có màu xanh lục hoặc đỏ nhạt, chồng lấn trực tiếp lên nét chữ viết tay và các dấu thanh phụ âm, gây nhiễu nghiêm trọng cho các thuật toán phân tách dòng và phân đoạn ký tự.

### 2.1.3. Sự chuyển dịch kiến trúc sang AI đa phương thức (Multimodal AI)
Các kiến trúc OCR truyền thống thường sử dụng mô hình hai giai đoạn tuần tự (Two-stage Pipeline):
$$\text{Ảnh chụp thô} \xrightarrow{\quad \text{OCR Engine (CNN + RNN)} \quad} \text{Văn bản thô} \xrightarrow{\quad \text{NLP Engine} \quad} \text{Sửa lỗi & Trả kết quả}$$

Hạn chế lớn nhất của cách tiếp cận này là **sự cộng dồn sai số (Error Propagation)**. Nếu mô hình OCR nhận diện sai một chữ cái (ví dụ nhầm "tr" thành "ch"), mô hình NLP phía sau sẽ tiếp nhận thông tin sai lệch này và rất khó khôi phục lại từ đúng ngữ cảnh ban đầu.

Sự xuất hiện của các Mô hình ngôn ngữ lớn đa phương thức (Multimodal Large Language Models - MLLMs) như họ mô hình **Google Gemini** đã mở ra bước đột phá mới bằng cách tiếp cận **End-to-End**:
$$\text{Ảnh chụp bài viết} \xrightarrow{\quad \text{Mô hình Đa phương thức (Gemini)} \quad} \text{Phân tích lỗi & Chấm điểm (JSON Schema)}$$

Mô hình đa phương thức tích hợp sẵn khả năng hiểu thị giác và ngôn ngữ trong cùng một mạng nơ-ron sâu khổng lồ. AI không trích xuất văn bản thô một cách máy móc, mà tiến hành "đọc hiểu" ngữ nghĩa trực tiếp từ ảnh chụp bài viết, kết hợp ngữ cảnh toàn câu để nhận dạng và phát hiện lỗi chính tả một cách chính xác trong một bước duy nhất, loại bỏ hoàn toàn hiện tượng cộng dồn sai số.

---

## 2.2. LÝ THUYẾT VÀ THUẬT TOÁN XỬ LÝ ẢNH SỐ CHUYÊN BIỆT

Để hỗ trợ tối đa cho mô hình AI đa phương thức nhận diện chính xác, việc loại bỏ nhiễu vật lý thông qua xử lý ảnh số là bước bắt buộc. Hệ thống sử dụng các thuật toán pixel-level chuyên biệt để làm sạch nền và tăng cường nét chữ.

### 2.2.1. Lý thuyết cân bằng trắng và Giả định Thế giới Xám (Gray World Assumption)
Ảnh chụp bài viết bằng điện thoại của giáo viên thường bị ám màu do nguồn sáng xung quanh không chuẩn (ánh sáng đèn huỳnh quang ám xanh, đèn sợi đốt ám vàng). Hệ thống áp dụng thuật toán **Gray World Assumption** để tự động cân bằng trắng. 

Thuật toán giả định rằng trong một bức ảnh có sự phân bố màu sắc đa dạng tự nhiên, giá trị trung bình của ba kênh màu Đỏ ($R$), Xanh lá ($G$) và Xanh dương ($B$) sẽ xấp xỉ bằng nhau và hội tụ về một cường độ xám trung tính:
$$\overline{R} = \frac{1}{N} \sum_{i=1}^{N} R_i; \quad \overline{G} = \frac{1}{N} \sum_{i=1}^{N} G_i; \quad \overline{B} = \frac{1}{N} \sum_{i=1}^{N} B_i$$
Tính giá trị trung bình tổng thể của ba kênh màu:
$$Gray_{avg} = \frac{\overline{R} + \overline{G} + \overline{B}}{3}$$
Từ đó, xác định hệ số cân bằng $k$ cho từng kênh màu:
$$k_R = \frac{Gray_{avg}}{\overline{R}}; \quad k_G = \frac{Gray_{avg}}{\overline{G}}; \quad k_B = \frac{Gray_{avg}}{\overline{B}}$$
Giá trị pixel mới tại tọa độ $(x, y)$ được hiệu chỉnh như sau:
$$R_{\text{new}}(x,y) = \min(255, \text{round}(R(x,y) \times k_R))$$
$$G_{\text{new}}(x,y) = \min(255, \text{round}(G(x,y) \times k_G))$$
$$B_{\text{new}}(x,y) = \min(255, \text{round}(B(x,y) \times k_B))$$
Phương pháp này đưa nền giấy ô ly bị ám màu về trạng thái màu trắng tự nhiên một cách hiệu quả.

### 2.2.2. Khử bóng che (Shadow Removal) bằng phép chuẩn hóa nền
Khi người dùng chụp ảnh bài viết, bóng của bàn tay hoặc thiết bị chụp thường che khuất một phần trang giấy, tạo ra vùng tối không đồng đều. Hệ thống khử bóng bằng thuật toán chuẩn hóa nền (Background Normalization). 

Ảnh nền không chứa chữ được ước lượng bằng phép lọc làm mờ hộp (Box Blur) với kích thước kernel cực lớn ($ks = 51$):
$$I_{\text{bg}}(x,y) = \text{BoxBlur}(I(x,y), ks)$$
Sau đó, ảnh gốc được chia trực tiếp cho ảnh nền ước lượng để triệt tiêu vùng bóng tối cục bộ:
$$I_{\text{out}}(x,y) = \min \left( 255, \text{round}\left( \frac{I(x,y)}{I_{\text{bg}}(x,y)} \times 255 \right) \right)$$

### 2.2.3. Cấu trúc ảnh tích lũy (Integral Image) và tối ưu hóa tính toán $O(1)$
Phép lọc mờ Box Blur cục bộ với kernel lớn ($51 \times 51$) nếu thực hiện theo cách tích chập thông thường sẽ có độ phức tạp thuật toán cực lớn $O(W \times H \times ks^2)$, gây nghẽn CPU RPi4 hoặc Server. Hệ thống tối ưu hóa bằng cấu trúc **Integral Image (Summed-Area Table)**.

Bản đồ tích lũy $II(x,y)$ được xây dựng bằng cách tính tổng tất cả các pixel nằm phía trên và bên trái điểm tọa độ $(x,y)$:
$$II(x,y) = I(x,y) + II(x-1, y) + II(x, y-1) - II(x-1, y-1)$$
Với điều kiện biên $II(x, y) = 0$ khi $x < 0$ hoặc $y < 0$.

Khi đã có Integral Image, tổng giá trị pixel của một vùng hình chữ nhật bất kỳ giới hạn bởi góc trên bên trái $(x_1, y_1)$ và góc dưới bên phải $(x_2, y_2)$ được tính tức thời bằng công thức:
$$\text{Sum} = II(x_2, y_2) - II(x_1-1, y_2) - II(x_2, y_1-1) + II(x_1-1, y_1-1)$$
Độ phức tạp tính toán trung bình của phép lọc Box Blur và Adaptive Threshold lúc này giảm từ $O(W \times H \times ks^2)$ xuống còn **$O(W \times H)$**, hoàn toàn độc lập với kích thước kernel $ks$.

### 2.2.4. Cân bằng Histogram thích nghi giới hạn tương phản (CLAHE)
Ảnh viết tay bằng bút chì của học sinh thường có độ tương phản cực kỳ thấp. Phép cân bằng biểu đồ tần suất thông thường (Global Histogram Equalization) sẽ làm cháy sáng các vùng quá sáng và làm tối đen các vùng thiếu sáng. Hệ thống ứng dụng thuật toán **CLAHE** để tối ưu:
1. Chia bức ảnh thành lưới $8 \times 8$ ô nhỏ (Tiles).
2. Tính histogram cho riêng từng ô.
3. Giới hạn độ khuếch đại tương phản bằng cách cắt đỉnh biểu đồ histogram tại mức `clipLimit = 2.0`. Phần diện tích histogram vượt ngưỡng được phân bổ đều cho tất cả các bin màu khác.
4. Tính toán hàm phân phối tích lũy (CDF) cục bộ để ánh xạ giá trị pixel.
5. Khi ánh xạ giá trị pixel của toàn ảnh, hệ thống áp dụng phép **nội suy song tuyến (bilinear interpolation)** giữa CDF của 4 ô lân cận gần nhất để đảm bảo quá trình chuyển đổi sắc độ diễn ra mượt mà, không xuất hiện hiệu ứng phân mảnh khối (blocking artifacts).

### 2.2.5. Thuật toán làm nét (Unsharp Mask) và nhị phân hóa thích nghi (Adaptive Gaussian Thresholding)
- **Làm nét (Unsharp Mask):** Tăng cường biên cạnh nét chữ bị nhòe bằng cách cộng thêm sai lệch biên độ tần số cao:
$$I_{\text{sharp}}(x,y) = I(x,y) + \alpha \times [I(x,y) - \text{BoxBlur}(I(x,y), 3)]$$
Trong đó $\alpha = 0.5$ điều tiết mức độ sắc bén của nét chữ viết tay.
- **Nhị phân hóa thích nghi (Adaptive Gaussian Thresholding):** Để đưa ảnh về dạng trắng đen tuyệt đối nhằm triệt tiêu hoàn toàn nhiễu nền, ngưỡng nhị phân $T(x,y)$ được tính động cho từng pixel dựa trên trung bình cục bộ của cửa sổ kích thước $31 \times 31$:
$$T(x,y) = \text{mean}_{local}(x,y) - C$$
Với $C = 5$ được chọn làm hằng số tối ưu qua thực nghiệm, giúp giữ lại trọn vẹn nét bút chì mảnh nhất mà không gây đứt nét.

---

## 2.3. MÔ HÌNH GOOGLE GEMINI VÀ TÍCH HỢP API

### 2.3.1. Mô hình Google Gemini
**Google Gemini** là họ mô hình đa phương thức thế hệ mới của Google DeepMind, được phát triển với kiến trúc gốc đa phương thức (Native Multimodal), cho phép xử lý đồng thời hình ảnh, văn bản, âm thanh và video trong một mô hình thống nhất. Khác với các mô hình kết hợp tầng ngoài truyền thống (vốn ghép riêng biệt một bộ mã hóa thị giác với một mô hình ngôn ngữ), Gemini được huấn luyện từ đầu với dữ liệu đa phương thức, tạo ra khả năng lý luận liên phương thức sâu hơn và nhất quán hơn.

Nền tảng kỹ thuật của Gemini kế thừa kiến trúc **Transformer** (Vaswani et al., 2017) với cơ chế **Self-Attention (Tự chú ý)** — cho phép mô hình tính toán mối tương quan ngữ nghĩa giữa tất cả các token trong chuỗi đầu vào, bao gồm cả token hình ảnh và token văn bản, bất kể khoảng cách vị trí của chúng:
$$\text{Attention}(Q, K, V) = \text{softmax}\left( \frac{Q K^T}{\sqrt{d_k}} \right) V$$
Trong đó $Q$ (Query), $K$ (Key), $V$ (Value) là các ma trận đặc trưng được chiếu tuyến tính từ vector nhúng (embedding) của dữ liệu đầu vào; $\sqrt{d_k}$ là nhân tố chuẩn hóa quy mô (scaling factor) giúp tránh hiện tượng gradient bị triệt tiêu khi tính toán softmax.

Mô hình có khả năng nhúng đồng thời dữ liệu văn bản và điểm ảnh (pixels) vào chung một không gian ẩn (latent space), từ đó thực hiện lý luận kết hợp giữa thị giác và ngôn ngữ trong một bước duy nhất.

**Gemini Flash** là phiên bản tối ưu về tốc độ và chi phí trong họ Gemini, duy trì hiệu suất cao với thời gian phản hồi thấp, phù hợp với ứng dụng thực tế cần xử lý theo thời gian gần thực. Hệ thống ViHand Grade lựa chọn phiên bản **Gemini 3 Flash** vì các ưu điểm vượt trội:
- **Tốc độ phản hồi cực nhanh:** Được tối ưu hóa sâu ở tầng phần cứng Tensor Processing Unit (TPU) của Google, cho thời gian chấm bài thực tế chỉ từ $2 - 4$ giây.
- **Cửa sổ ngữ cảnh lớn:** Hỗ trợ chuỗi đầu vào dài, đủ chứa toàn bộ prompt hệ thống, các mẫu few-shot, hình ảnh bài làm và hướng dẫn chấm điểm trong một lần gọi.
- **Khả năng hiểu thị giác cao độ:** Nhận diện chính xác hình thái chữ viết tay tiếng Việt có dấu từ ảnh chụp nhị phân đã lọc ô ly.
- **Hỗ trợ Response Schema:** Bảo đảm cấu trúc đầu ra tuân thủ nghiêm ngặt định dạng JSON theo schema định trước, rất thuận tiện cho các tác vụ chấm điểm tự động cần lưu trữ vào cơ sở dữ liệu.

### 2.3.2. Google Gemini API
**Google Gemini API** là giao diện lập trình ứng dụng thương mại do Google DeepMind cung cấp, cho phép tích hợp các mô hình Gemini vào ứng dụng bên thứ ba qua giao thức HTTPS RESTful. Đây là thành phần API cốt lõi nhất trong kiến trúc ViHand Grade.

Gemini API được tích hợp với các tham số phù hợp nhằm **ưu tiên tính nhất quán và chính xác** thay vì tính sáng tạo, đồng thời đảm bảo đủ không gian ngữ cảnh cho nhận xét chi tiết và danh sách lỗi toàn diện:
- **Temperature (= 0.1):** Thiết lập mức cực thấp để triệt tiêu hoàn toàn sự "sáng tạo" tự do của AI, ép mô hình chỉ đưa ra phản hồi chắc chắn nhất dựa trên bài viết thực tế, ngăn ngừa hiện tượng **ảo giác (Hallucination)** — bịa đặt thông tin không có trong ảnh chụp.
- **Top-P (Nucleus Sampling = 0.95):** Mô hình chỉ lựa chọn từ tiếp theo trong tập token có tổng xác suất tích lũy đạt $95\%$, giữ lại tính tự nhiên của lời nhận xét sư phạm.
- **Top-K (= 40):** Giới hạn số từ ứng viên tiềm năng tại mỗi bước giải mã là 40 từ có xác suất cao nhất.

Mô hình nhận **ảnh bài làm học sinh dưới dạng Base64 inline** (đính kèm trực tiếp trong payload JSON thay vì qua URL ngoài) và thực hiện đồng thời các tác vụ phức hợp trong một lần gọi API duy nhất:
1. **Nhận dạng chữ viết tay** tiếng Việt có dấu trên nền ảnh nhị phân đã xử lý loại bỏ ô ly.
2. **Phát hiện lỗi chính tả** theo từng loại (phụ âm đầu, vần, dấu thanh, viết hoa, bỏ sót/thêm từ).
3. **Chấm điểm theo barem** sư phạm được lập trình trong prompt hệ thống.
4. **Sinh lời nhận xét** khuyến khích, phù hợp với tâm lý học sinh tiểu học.

Phương thức tích hợp trong hệ thống:
- **Xác thực:** Sử dụng **API Key** được cấp qua Google AI Studio, đính kèm vào request header `x-goog-api-key`. Toàn bộ lời gọi API chỉ diễn ra ở tầng server (Next.js Route Handler), đảm bảo API Key tuyệt đối không bị lộ ra phía client.
- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-2.0:generateContent`
- **SDK:** Thư viện `@google/generative-ai` (npm) cung cấp wrapper TypeScript bao bọc các HTTP call phức tạp, hỗ trợ streaming và xử lý lỗi mạng tự động.

---

## 2.4. KỸ NGHỆ PROMPT (PROMPT ENGINEERING) TRONG ĐÁNH GIÁ SƯ PHẠM

Prompt Engineering là kỹ thuật thiết kế và tối ưu hóa các chỉ dẫn đầu vào để định hướng hành vi của mô hình ngôn ngữ lớn nhằm thu được kết quả đầu ra chất lượng cao nhất.

### 2.4.1. Vai trò của Prompt Engineering trong MLLMs
Mô hình AI đa phương thức mặc dù rất thông minh nhưng nếu chỉ nhận được yêu cầu chấm điểm chung chung sẽ đưa ra nhận xét cảm tính, điểm số không đồng nhất và định dạng văn bản tự do không thể xử lý bằng máy tính. Prompt Engineering đóng vai trò thiết lập "luật chơi", ràng buộc tư duy lô-gích của AI theo đúng phương pháp sư phạm Việt Nam.

### 2.4.2. Các kỹ thuật áp dụng trong ViHand Grade
Hệ thống kết hợp đồng thời ba kỹ thuật Prompt Engineering nâng cao:
1. **Role Prompting (Thiết lập vai trò):** Khởi đầu prompt hệ thống bằng việc định vị vai trò: *"Bạn là một Chuyên gia Giáo dục Tiểu học và là Giáo viên có hơn 20 năm kinh nghiệm dạy phân môn Chính tả tại Việt Nam..."*. Thiết lập này định hình phong cách hành văn của AI hướng tới sự ân cần, động viên học sinh và áp dụng các tiêu chuẩn chấm điểm khắt khe nhưng mang tính giáo dục cao.
2. **Few-Shot Prompting (Học qua mẫu):** Cung cấp trực tiếp các cặp mẫu ảnh chụp viết tay - kết quả phân tích JSON chuẩn trong Prompt hệ thống. Kỹ thuật này giúp AI hiểu rõ cách phân tích lỗi chính tả thực tế và định dạng cấu trúc JSON cần trả về.
3. **Structured JSON Output Constraint (Ràng buộc cấu trúc):** Hệ thống định nghĩa một lược đồ dữ liệu JSON chặt chẽ và yêu cầu mô hình phản hồi khớp hoàn toàn với cấu trúc này:
```json
{
  "fixed_text": "Chuỗi văn bản đã sửa đúng chính tả",
  "original_text": "Chuỗi văn bản gốc do AI nhận dạng được",
  "corrections": [
    {
      "error": "Từ viết sai",
      "suggestion": "Từ gợi ý sửa đúng",
      "reason": "Giải thích nguyên nhân sai địa phương hoặc quy tắc"
    }
  ],
  "score": "Điểm số chi tiết",
  "overall_rating": "Xếp loại học tập",
  "feedback": "Lời nhận xét khuyến khích sư phạm"
}
```

---

## 2.5. NGÔN NGỮ TIẾNG VIỆT VÀ CHUẨN ĐÁNH GIÁ SƯ PHẠM TIỂU HỌC

### 2.5.1. Đặc điểm ngữ âm tiếng Việt và các lỗi chính tả phổ biến
Tiếng Việt là ngôn ngữ đơn lập, đơn âm tiết và có hệ thống thanh điệu phong phú. Cấu trúc một âm tiết tiếng Việt đầy đủ bao gồm:
$$\text{Âm đầu} + \text{Âm đệm} + \text{Âm chính} + \text{Âm cuối} + \text{Thanh điệu}$$

Do tính chất phức tạp của cấu trúc âm tiết kết hợp với phương ngữ vùng miền (Bắc, Trung, Nam), học sinh tiểu học thường phạm phải 5 nhóm lỗi chính tả phổ biến sau:
1. **Lỗi phụ âm đầu (`phu_am_dau`):** Nhầm lẫn giữa các cặp phụ âm có cách phát âm tương đồng nhưng viết khác nhau như tr/ch, s/x, d/gi/r, l/n, c/k/q, g/gh, ng/ngh.
2. **Lỗi vần (`van`):** Sai lệch các nguyên âm đôi, nguyên âm ba hoặc phụ âm cuối như nhầm lẫn giữa vần ươi/ơi, uynh/inh, uyu/iu, an/ang, at/ac.
3. **Lỗi dấu thanh (`dau_thanh`):** Đặt sai vị trí dấu thanh hoặc không phân biệt được các dấu thanh (đặc biệt là thanh hỏi và thanh ngã ở phương ngữ miền Nam).
4. **Lỗi viết hoa (`viet_hoa`):** Không viết hoa chữ cái đầu câu hoặc viết hoa tùy tiện danh từ riêng, tên địa danh.
5. **Lỗi bỏ sót hoặc thêm từ (`bo_sot_them`):** Do tốc độ đọc - viết chưa đồng bộ dẫn đến việc viết thiếu từ hoặc lặp lại từ trong câu.

### 2.5.2. Barem chấm điểm chính tả quy chuẩn của Bộ Giáo dục & Đào tạo Việt Nam
Để đảm bảo tính nhất quán khoa học, hệ thống ViHand Grade số hóa quy trình chấm điểm chính tả dựa theo tinh thần **Thông tư 27/2020/TT-BGDĐT** của Bộ Giáo dục và Đào tạo Việt Nam. Thang điểm được cấu trúc chi tiết như sau:

| Tiêu chí | Điểm tối đa | Phương pháp đánh giá |
|---|---|---|
| **Chính tả & Ngữ pháp** | **4.0 điểm** | Trừ điểm lũy tiến theo số lượng lỗi chính tả phát hiện được. <br>- Đối với lớp 1-3: Trừ $0.5$ điểm cho mỗi lỗi chính tả khác nhau.<br>- Đối với lớp 4-5: Trừ $0.25$ điểm cho mỗi lỗi chính tả khác nhau.<br>- Lỗi lặp lại cùng một từ viết sai chỉ tính và trừ điểm một lần. |
| **Hình thức trình bày** | **3.0 điểm** | Đánh giá tính thẩm mỹ tổng quan bài viết:<br>- Viết thẳng hàng, không bị lệch dòng, xiêu vẹo.<br>- Độ nghiêng chữ đồng đều, khoảng cách chữ hợp lý.<br>- Trình bày sạch sẽ, không tẩy xóa lem nhem. |
| **Nội dung & Ý tưởng** | **2.0 điểm** | Đánh giá độ chính xác nội dung bài viết so với văn bản bài mẫu do giáo viên cung cấp, kiểm tra xem học sinh có viết sót câu hay bỏ lửng bài viết hay không. |
| **Sáng tạo** | **1.0 điểm** | Điểm thưởng cộng thêm khi học sinh sở hữu chữ viết đẹp vượt trội (đạt chuẩn viết chữ đẹp cấp trường/quận) hoặc trình bày sáng tạo, khoa học. |

---

## 2.6. CÔNG NGHỆ PHÁT TRIỂN ỨNG DỤNG WEB — LÝ THUYẾT NỀN TẢNG

### 2.6.1. Kiến trúc Full-Stack và RESTful API
**Next.js App Router** cho phép xây dựng cả giao diện (Frontend) và API xử lý logic (Backend) trong cùng một dự án thống nhất. Mô hình **React Server Components (RSC)** render HTML trực tiếp trên server để tối ưu tốc độ tải trang đầu tiên, trong khi **Client Components** đảm nhận tính tương tác động phía người dùng. **RESTful API** (Representational State Transfer) là tiêu chuẩn thiết kế giao diện lập trình ứng dụng web sử dụng các phương thức HTTP (`GET`, `POST`, `PUT`, `DELETE`) để thao tác trên các tài nguyên được định danh qua URI.

### 2.6.2. ORM và cơ sở dữ liệu quan hệ nhẹ
**Object-Relational Mapping (ORM)** là kỹ thuật trừu tượng hóa lớp truy cập cơ sở dữ liệu, cho phép lập trình viên tương tác với CSDL thông qua các đối tượng ngôn ngữ lập trình thay vì viết SQL thủ công. **SQLite** là hệ quản trị CSDL quan hệ nhúng (embedded), lưu toàn bộ cơ sở dữ liệu trong một tệp nhị phân duy nhất, đặc biệt phù hợp cho môi trường triển khai gọn nhẹ như phần cứng nhúng.

### 2.6.3. Progressive Web App (PWA)
**PWA** là tiêu chuẩn web cho phép ứng dụng website có thể cài đặt lên thiết bị di động như ứng dụng native thông qua **Web App Manifest** (khai báo metadata ứng dụng) và **Service Worker** (script chạy ngầm quản lý cache và network). Chi tiết hiện thực hóa PWA trong ViHand Grade được trình bày tại **Chương 4 — mục 4.6**.

### 2.6.4. Kiểm soát truy cập dựa trên vai trò (RBAC)
**Role-Based Access Control (RBAC)** là mô hình bảo mật phân quyền dựa trên tập hợp vai trò được định nghĩa sẵn. Mỗi người dùng được gán một vai trò; mỗi vai trò chứa tập hợp quyền truy cập cụ thể với các tài nguyên. Hệ thống ViHand Grade định nghĩa ba vai trò: **Admin** (quản trị toàn hệ thống), **Teacher** (chấm điểm và quản lý lớp) và **Student** (chỉ xem lịch sử cá nhân). Toàn bộ logic phân quyền và cách ly dữ liệu theo vai trò được mô tả chi tiết tại **Chương 3 — mục 3.4** và **Chương 4 — mục 4.3**.

---

## 2.7. GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (APPLICATION PROGRAMMING INTERFACE — API)

### 2.7.1. Khái niệm và vai trò của API
**API (Application Programming Interface — Giao diện lập trình ứng dụng)** là một tập hợp các quy tắc, giao thức và công cụ cho phép hai hệ thống phần mềm khác nhau giao tiếp và trao đổi dữ liệu với nhau theo một cách thức được định nghĩa trước, mà không cần bên gọi biết chi tiết về cách cài đặt nội tại của bên cung cấp.

Có thể hình dung API như một **"nhân viên phục vụ"** trong nhà hàng: khách hàng (ứng dụng gọi API) không cần vào bếp (hệ thống cung cấp) để tự nấu ăn; thay vào đó, nhân viên phục vụ (API) nhận yêu cầu từ khách, chuyển đến bếp xử lý, và mang kết quả trả lại theo đúng hình thức quy định.

Vai trò của API trong hệ sinh thái phần mềm hiện đại:
- **Tích hợp hệ thống:** Kết nối các dịch vụ độc lập (thanh toán, bản đồ, AI, xác thực) vào một ứng dụng thống nhất mà không cần xây dựng lại từ đầu.
- **Trừu tượng hóa độ phức tạp:** Che giấu chi tiết kỹ thuật phức tạp phía sau, chỉ để lộ giao diện tối giản và nhất quán.
- **Tái sử dụng và mở rộng:** Một API được thiết kế tốt có thể phục vụ đồng thời nhiều loại client khác nhau (web, mobile, IoT) mà không thay đổi logic nghiệp vụ lõi.
- **Bảo mật thông qua phân lớp:** Backend và cơ sở dữ liệu không bao giờ bị lộ trực tiếp ra ngoài; mọi truy cập đều phải đi qua lớp API kiểm soát xác thực và phân quyền.

### 2.7.2. Kiến trúc RESTful API và giao thức HTTP
**REST (Representational State Transfer)** là một phong cách kiến trúc API do Roy Fielding định nghĩa năm 2000 trong luận văn tiến sĩ tại UC Irvine. REST không phải là một giao thức hay tiêu chuẩn kỹ thuật cố định mà là tập hợp 6 ràng buộc kiến trúc:

| Ràng buộc | Mô tả |
|---|---|
| **Client–Server** | Tách biệt hoàn toàn giao diện người dùng (client) khỏi logic lưu trữ dữ liệu (server), cho phép hai thành phần tiến hóa độc lập. |
| **Stateless (Phi trạng thái)** | Mỗi yêu cầu HTTP từ client đến server phải chứa đủ mọi thông tin cần thiết để server xử lý (token xác thực, tham số). Server không lưu bất kỳ trạng thái phiên nào giữa các request. |
| **Cacheable (Có thể lưu đệm)** | Phản hồi phải khai báo rõ có thể cache hay không, giúp client hoặc proxy lưu đệm và giảm tải server. |
| **Uniform Interface** | Giao diện thống nhất thông qua: định danh tài nguyên bằng URI; thao tác tài nguyên qua biểu diễn (representation); thông điệp tự mô tả (self-descriptive messages). |
| **Layered System** | Client không cần biết mình đang kết nối trực tiếp đến server gốc hay qua các tầng trung gian (load balancer, CDN, API Gateway). |
| **Code on Demand** *(tùy chọn)* | Server có thể gửi mã thực thi (JavaScript) về phía client để mở rộng chức năng. |

API tuân thủ đầy đủ các ràng buộc REST được gọi là **RESTful API**. Giao thức truyền tải nền tảng là **HTTP/HTTPS**, trong đó mỗi request bao gồm:
- **Method (Phương thức HTTP):** Xác định loại thao tác.
- **URI (Uniform Resource Identifier):** Định danh tài nguyên cần thao tác.
- **Headers:** Siêu dữ liệu của request (kiểu nội dung, token xác thực...).
- **Body:** Dữ liệu gửi kèm (thường dùng định dạng JSON hoặc multipart/form-data cho tệp ảnh).

### 2.7.3. Các phương thức HTTP và mã trạng thái
RESTful API ánh xạ các thao tác CRUD (Create, Read, Update, Delete) sang các phương thức HTTP chuẩn:

| Phương thức HTTP | Thao tác CRUD | Mô tả | Ví dụ trong ViHand Grade |
|---|---|---|---|
| `GET` | Read | Truy vấn, lấy dữ liệu tài nguyên. Idempotent (gọi nhiều lần cùng kết quả). | `GET /api/submissions` — Lấy danh sách bài chấm |
| `POST` | Create | Tạo tài nguyên mới hoặc kích hoạt một hành động không idempotent. | `POST /api/grade` — Nộp ảnh để chấm điểm |
| `PUT` | Update (toàn bộ) | Thay thế toàn bộ biểu diễn của tài nguyên. Idempotent. | `PUT /api/students/:id` — Cập nhật thông tin học sinh |
| `PATCH` | Update (một phần) | Cập nhật một phần tài nguyên. | `PATCH /api/submissions/:id` — Chỉnh sửa điểm thủ công |
| `DELETE` | Delete | Xóa tài nguyên được chỉ định. | `DELETE /api/submissions/:id` — Xóa bài chấm |

**Mã trạng thái HTTP (HTTP Status Codes)** là cơ chế tiêu chuẩn để API truyền đạt kết quả xử lý về phía client:

| Nhóm | Phạm vi | Ý nghĩa | Ví dụ |
|---|---|---|---|
| **2xx** | 200–299 | Thành công | `200 OK`, `201 Created`, `204 No Content` |
| **3xx** | 300–399 | Chuyển hướng | `301 Moved Permanently`, `304 Not Modified` |
| **4xx** | 400–499 | Lỗi phía client | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found` |
| **5xx** | 500–599 | Lỗi phía server | `500 Internal Server Error`, `503 Service Unavailable` |

### 2.7.4. Định dạng trao đổi dữ liệu JSON
**JSON (JavaScript Object Notation)** là định dạng văn bản nhẹ, dễ đọc và phân tích cú pháp, trở thành tiêu chuẩn thực tế (de facto) cho trao đổi dữ liệu trong các RESTful API hiện đại. JSON hỗ trợ 6 kiểu dữ liệu nguyên thủy: chuỗi (string), số (number), boolean (`true`/`false`), null, mảng (array) và đối tượng (object).

Một phản hồi JSON điển hình từ API chấm điểm của ViHand Grade có cấu trúc:
```json
{
  "success": true,
  "data": {
    "original_text": "Con mèo leo cây",
    "fixed_text": "Con mèo leo cây",
    "score": 9.5,
    "overall_rating": "Hoàn thành tốt",
    "corrections": [
      {
        "error": "leo",
        "suggestion": "leo",
        "reason": "Chính tả đúng"
      }
    ],
    "feedback": "Em viết rất sạch và đúng chính tả!"
  },
  "processingTimeMs": 2341
}
```

Ưu điểm vượt trội của JSON so với các định dạng thay thế (XML, YAML) trong bối cảnh ứng dụng web:
- **Trọng lượng nhẹ:** Không có thẻ đóng/mở dư thừa như XML, giảm băng thông truyền tải.
- **Tích hợp nguyên bản:** JavaScript `JSON.parse()` và `JSON.stringify()` hỗ trợ tức thì không cần thư viện ngoài.
- **Hỗ trợ Response Schema:** Google Gemini API hỗ trợ buộc đầu ra tuân thủ một lược đồ JSON định nghĩa sẵn (JSON Schema), đảm bảo kết quả luôn có cấu trúc máy tính có thể xử lý được.

### 2.7.5. Xác thực và bảo mật API — JSON Web Token (JWT)
Mô hình bảo mật API phổ biến nhất trong ứng dụng web hiện đại là **JWT (JSON Web Token)** theo chuẩn RFC 7519. JWT là một chuỗi mã hóa Base64Url gồm ba phần ngăn cách bởi dấu chấm (`.`):
$$\underbrace{\texttt{eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9}}_{\text{Header}} . \underbrace{\texttt{eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoiVGVhY2hlciJ9}}_{\text{Payload}} . \underbrace{\texttt{SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV\_adQssw5c}}_{\text{Signature}}$$

- **Header:** Siêu dữ liệu khai báo loại token và thuật toán ký (thường là `HS256` — HMAC-SHA256 hoặc `RS256` — RSA-SHA256).
- **Payload:** Chứa các **Claims** (khẳng định) như `userId`, `role`, `exp` (thời gian hết hạn). Dữ liệu này được mã hóa Base64Url nhưng không được mã hóa bí mật, nên không được chứa thông tin nhạy cảm.
- **Signature (Chữ ký số):** Được tạo ra bằng cách ký Header + Payload với **Secret Key** bí mật chỉ server biết, đảm bảo token không thể bị giả mạo hay sửa đổi.

Quy trình xác thực JWT trong ViHand Grade:
1. Giáo viên/Admin đăng nhập → Server xác minh mật khẩu hash, ký một JWT mới với `role` và `exp` → Gửi JWT về client.
2. Client lưu JWT vào `localStorage` hoặc cookie `HttpOnly`.
3. Mỗi request API tiếp theo, client đính kèm JWT vào header `Authorization: Bearer <token>`.
4. Server giải mã, xác minh chữ ký và kiểm tra `exp` → Trích xuất `role` để thực thi phân quyền RBAC.

### 2.7.6. API bên thứ ba — Google Gemini API
**Google Gemini API** là dịch vụ API thương mại của Google DeepMind cung cấp khả năng truy cập vào các mô hình ngôn ngữ lớn đa phương thức Gemini qua giao thức HTTPS RESTful. Đây là thành phần API cốt lõi nhất trong kiến trúc ViHand Grade.

Phương thức tích hợp trong hệ thống:
- **Xác thực:** Sử dụng **API Key** được cấp qua Google AI Studio, đính kèm vào request header `x-goog-api-key`.
- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-2.0:generateContent`
- **Payload:** Gửi dữ liệu đa phương thức gồm phần `text` (prompt hệ thống + prompt người dùng) và phần `inlineData` chứa ảnh bài viết đã xử lý được mã hóa Base64.
- **Response Schema:** Khai báo lược đồ JSON cứng trong trường `generationConfig.responseSchema` để ép buộc đầu ra tuân thủ cấu trúc dữ liệu chấm điểm định nghĩa sẵn.
- **SDK:** Thư viện `@google/generative-ai` (npm) cung cấp wrapper TypeScript bao bọc các HTTP call phức tạp, hỗ trợ streaming và xử lý lỗi mạng tự động.

Sơ đồ luồng gọi API tổng quan trong ViHand Grade:
$$\text{Client (Browser)} \xrightarrow{\texttt{POST /api/grade}} \text{Next.js Route Handler} \xrightarrow{\text{Gemini API Call}} \text{Google AI Backend}$$
$$\text{Google AI Backend} \xrightarrow{\text{JSON Schema Response}} \text{Next.js Route Handler} \xrightarrow{\texttt{200 OK + JSON}} \text{Client (Browser)}$$

Thiết kế này đảm bảo **API Key tuyệt đối không bao giờ bị lộ ra phía client** vì toàn bộ lời gọi Gemini API chỉ diễn ra ở tầng server (Next.js Route Handler chạy trên Node.js), không có bất kỳ đoạn mã nào gọi Gemini trực tiếp từ trình duyệt.

---

## 2.8. KẾT LUẬN CHƯƠNG
Chương này đã hệ thống hóa toàn bộ cơ sở lý thuyết và nguyên lý khoa học làm nền tảng cho hệ thống **ViHand Grade**, bao gồm: (1) lý thuyết OCR và xu hướng chuyển dịch sang AI đa phương thức End-to-End; (2) các thuật toán xử lý ảnh số chuyên biệt cho giấy ô ly (Gray World, Shadow Removal, Integral Image, CLAHE, Adaptive Thresholding) với đầy đủ nền tảng toán học; (3) kiến trúc Transformer Self-Attention và đặc điểm của mô hình Google Gemini 3 Flash; (4) các kỹ thuật Prompt Engineering (Role, Few-Shot, JSON Schema Constraint); (5) phân loại lỗi chính tả tiếng Việt và barem chấm điểm theo Thông tư 27/2020/TT-BGDĐT; (6) các khái niệm công nghệ web nền tảng (Next.js, ORM, PWA, RBAC); và (7) lý thuyết nền tảng về API bao gồm kiến trúc RESTful, giao thức HTTP, định dạng JSON, cơ chế xác thực JWT và phương thức tích hợp Google Gemini API. Những lý thuyết này được hiện thực hóa cụ thể trong **Chương 3** (thiết kế hệ thống) và **Chương 4** (xây dựng ứng dụng).
