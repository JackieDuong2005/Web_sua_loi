# CƠ SỞ LÝ THUYẾT

**Đề tài:** Nghiên cứu và xây dựng hệ thống chấm điểm chính tả tiếng Việt viết tay cho học sinh tiểu học sử dụng trí tuệ nhân tạo đa phương thức (ViHand Grade)

---

## 1. NHẬN DẠNG KÝ TỰ QUANG HỌC (OCR — Optical Character Recognition)

### 1.1. Khái niệm

Nhận dạng ký tự quang học (OCR) là công nghệ cho phép máy tính chuyển đổi hình ảnh chứa văn bản (chữ in hoặc chữ viết tay) thành dữ liệu văn bản có thể xử lý bằng máy tính. OCR là nền tảng cốt lõi của hệ thống ViHand Grade — cho phép AI "đọc" được chữ viết tay của học sinh từ ảnh chụp.

### 1.2. Phân loại OCR

| Loại | Đặc điểm | Độ chính xác |
|---|---|---|
| **OCR chữ in (Printed)** | Font cố định, nét đều | > 99% |
| **OCR chữ viết tay online** | Ghi nhận quỹ đạo bút theo thời gian thực | 90–95% |
| **OCR chữ viết tay offline** | Nhận dạng từ ảnh chụp tĩnh | 70–92% |

Hệ thống ViHand Grade thuộc loại **OCR chữ viết tay offline** — thách thức lớn nhất trong OCR do nét chữ không đồng nhất, phụ thuộc vào người viết.

### 1.3. Thách thức đặc thù với chữ viết tay tiểu học Việt Nam

- **Nét chữ chưa định hình:** Học sinh tiểu học đang trong quá trình học viết, nét chữ thường nguệch ngoạc, không đều, thiếu nhất quán.
- **Bút chì nhạt:** Nét bút chì mờ hơn nhiều so với bút mực, gây khó khăn cho việc phân tách chữ và nền.
- **Dấu thanh tiếng Việt:** Hệ thống 6 thanh điệu (ngang, sắc, huyền, hỏi, ngã, nặng) tạo ra các dấu nhỏ mảnh dễ bị nhầm lẫn với nhiễu ảnh.
- **Nhiễu dòng kẻ ô ly:** Đặc thù riêng của bậc tiểu học Việt Nam — dòng kẻ ô ly đè trực tiếp lên nét chữ và dấu thanh.

### 1.4. Sự chuyển dịch từ OCR truyền thống sang AI đa phương thức

Các hệ thống OCR truyền thống (Tesseract, EasyOCR) hoạt động theo mô hình **hai giai đoạn tuần tự**: trích xuất văn bản thô (OCR) → xử lý ngôn ngữ (NLP). Cách tiếp cận này tồn tại hạn chế **cộng dồn sai số** — lỗi ở bước OCR sẽ lan truyền sang bước NLP.

Các mô hình AI đa phương thức thế hệ mới (Gemini, GPT-4V) cho phép xử lý **End-to-End**: đọc ảnh → hiểu ngữ cảnh → phân tích → trả kết quả trong **một bước duy nhất**, giảm thiểu sai số cộng dồn.

---

## 2. XỬ LÝ ẢNH SỐ (Digital Image Processing)

### 2.1. Tổng quan

Xử lý ảnh số là lĩnh vực sử dụng các thuật toán để biến đổi, cải thiện và phân tích hình ảnh kỹ thuật số. Trong ViHand Grade, xử lý ảnh đóng vai trò **tiền xử lý** (preprocessing) — nâng cao chất lượng ảnh trước khi gửi cho AI phân tích.

### 2.2. Cân bằng trắng — Gray World Assumption

**Nguyên lý:** Giả thuyết Gray World cho rằng trong một bức ảnh bình thường, giá trị trung bình của ba kênh màu R, G, B sẽ xấp xỉ bằng nhau và bằng một giá trị xám trung tính.

**Công thức:**
```
avg = (mean_R + mean_G + mean_B) / 3
k_R = avg / mean_R
k_G = avg / mean_G  
k_B = avg / mean_B
pixel_new(c) = pixel_old(c) × k_c
```

**Ứng dụng trong ViHand Grade:** Sửa lỗi ảnh bị ám vàng/xanh do ánh sáng đèn điện trong phòng học — đảm bảo nền giấy trắng hiển thị đúng màu.

### 2.3. Khử bóng — Shadow Removal bằng Background Normalization

**Nguyên lý:** Ước lượng nền ảnh bằng cách làm mờ hộp (box blur) với kernel lớn, sau đó chia ảnh gốc cho nền ước lượng để triệt tiêu bóng.

**Công thức:**
```
background(x,y) = BoxBlur(image, kernel_size=51)
result(x,y) = (image(x,y) / background(x,y)) × 255
```

**Ứng dụng:** Loại bỏ bóng tay/điện thoại che khuất khi giáo viên chụp bài viết.

### 2.4. Integral Image (Summed-Area Table)

**Nguyên lý:** Integral Image là cấu trúc dữ liệu cho phép tính tổng giá trị pixel trong bất kỳ vùng hình chữ nhật nào với **O(1)** thao tác, bất kể kích thước vùng.

**Công thức xây dựng:**
```
I(x,y) = img(x,y) + I(x-1,y) + I(x,y-1) - I(x-1,y-1)
```

**Công thức truy vấn vùng (x1,y1)→(x2,y2):**
```
Sum = I(x2,y2) - I(x1-1,y2) - I(x2,y1-1) + I(x1-1,y1-1)
```

**Ứng dụng:** Là nền tảng cho Box Blur O(1), Adaptive Threshold và các phép tính cục bộ trong pipeline.

### 2.5. Phương pháp Otsu — Ngưỡng nhị phân hóa tối ưu

**Nguyên lý:** Phương pháp Otsu (1979) tự động xác định ngưỡng T tối ưu để phân tách ảnh thành hai lớp (nền và chữ) bằng cách **tối đa hóa phương sai liên lớp** (between-class variance).

**Công thức:**
```
σ²_B(T) = w_0(T) × w_1(T) × [μ_0(T) - μ_1(T)]²
T* = argmax σ²_B(T)
```

Trong đó: `w_0`, `w_1` là trọng số hai lớp; `μ_0`, `μ_1` là giá trị trung bình hai lớp.

### 2.6. CLAHE — Contrast Limited Adaptive Histogram Equalization

**Nguyên lý:** CLAHE (Zuiderveld, 1994) là phiên bản cải tiến của cân bằng histogram thích nghi (AHE). Thay vì áp dụng một histogram duy nhất cho toàn bộ ảnh, CLAHE chia ảnh thành các ô nhỏ (tiles) và cân bằng histogram riêng cho từng ô, đồng thời **giới hạn biên độ khuếch đại** (clip limit) để tránh khuếch đại nhiễu.

**Quy trình trong ViHand Grade:**
1. Chia ảnh thành lưới 8×8 tiles
2. Tính histogram cục bộ cho mỗi tile
3. Cắt histogram tại `clipLimit = 2.0`, phân phối lại phần dư
4. Tính CDF (hàm phân phối tích lũy) cho mỗi tile
5. Áp dụng kết quả với **nội suy song tuyến** (bilinear interpolation) giữa các tile để tránh hiệu ứng khối

**Ứng dụng:** Làm nổi bật nét bút chì nhạt trên nền giấy trắng — đặc biệt hiệu quả khi ảnh có độ sáng phân bố không đều.

### 2.7. Unsharp Mask — Làm sắc nét ảnh

**Nguyên lý:** Tạo mặt nạ chi tiết bằng cách trừ ảnh mờ khỏi ảnh gốc, sau đó cộng mặt nạ này vào ảnh gốc với hệ số khuếch đại.

**Công thức:**
```
sharpened(x,y) = original(x,y) + amount × [original(x,y) - blurred(x,y)]
```

### 2.8. Adaptive Threshold — Ngưỡng thích nghi

**Nguyên lý:** Thay vì dùng một ngưỡng cố định cho toàn bộ ảnh, ngưỡng thích nghi tính giá trị ngưỡng riêng cho từng pixel dựa trên giá trị trung bình của vùng lân cận.

**Công thức (Gaussian/Mean):**
```
T(x,y) = mean_local(x,y) - C
pixel_out = 0 (đen) nếu pixel_in < T(x,y), ngược lại = 255 (trắng)
```

Trong đó `C` là hằng số điều chỉnh (mặc định = 10), `mean_local` được tính hiệu quả qua Integral Image.

**Ứng dụng:** Tạo ra ảnh nhị phân trắng–đen rõ ràng ngay cả khi ảnh gốc có độ sáng không đều.

### 2.9. Đánh giá chất lượng ảnh — Quality Assessment

Hệ thống tính toán các chỉ số chất lượng trước khi gửi ảnh cho AI:

| Chỉ số | Phương pháp tính | Ngưỡng cảnh báo |
|---|---|---|
| **Blur score** | Phương sai Laplacian (kernel 3×3) | < 80 → "Ảnh bị mờ" |
| **Brightness** | Trung bình cường độ pixel | < 50 hoặc > 220 |
| **Dark pixel ratio** | Tỷ lệ pixel < 100 | < 0.02 → "Nét chữ quá nhạt" |
| **Text area ratio** | Tỷ lệ pixel dưới ngưỡng Otsu | < 0.005 → "Chữ quá nhỏ" |

---

## 3. TRÍ TUỆ NHÂN TẠO ĐA PHƯƠNG THỨC (Multimodal AI)

### 3.1. Khái niệm

AI đa phương thức (Multimodal AI) là các hệ thống trí tuệ nhân tạo có khả năng xử lý và hiểu đồng thời nhiều loại dữ liệu đầu vào khác nhau: văn bản (text), hình ảnh (image), âm thanh (audio), video. Khác với các mô hình đơn phương thức (chỉ xử lý text hoặc chỉ xử lý ảnh), mô hình đa phương thức có thể **liên kết ngữ nghĩa giữa các loại dữ liệu**.

### 3.2. Mô hình ngôn ngữ lớn (LLM — Large Language Model)

#### 3.2.1. Kiến trúc Transformer

Transformer (Vaswani et al., 2017) là kiến trúc nền tảng của các LLM hiện đại. Thành phần cốt lõi là cơ chế **Self-Attention** cho phép mô hình "chú ý" đến mọi vị trí trong chuỗi đầu vào khi xử lý từng token.

**Công thức Self-Attention:**
```
Attention(Q, K, V) = softmax(Q × K^T / √d_k) × V
```

Trong đó: Q (Query), K (Key), V (Value) là các ma trận chiếu tuyến tính từ embedding đầu vào; `d_k` là chiều của vector key.

#### 3.2.2. Google Gemini

**Google Gemini** là họ mô hình AI đa phương thức do Google DeepMind phát triển. Hệ thống ViHand Grade sử dụng **Gemini 3 Flash Preview** — phiên bản tối ưu cho tốc độ phản hồi nhanh với chi phí thấp.

Gemini 3 Flash có khả năng:
- **Thị giác máy tính:** Đọc và nhận dạng chữ viết tay từ ảnh (OCR nội tại)
- **Xử lý ngôn ngữ tự nhiên:** Hiểu ngữ cảnh, phát hiện lỗi chính tả, phân tích ngữ nghĩa
- **Tuân thủ hướng dẫn:** Trả về kết quả theo định dạng JSON cấu trúc khi được yêu cầu

### 3.3. Tham số điều khiển mô hình

| Tham số | Giá trị | Ý nghĩa |
|---|---|---|
| **Temperature** | 0.1 | Kiểm soát tính ngẫu nhiên. Giá trị thấp → kết quả chính xác, ít "sáng tạo" |
| **Top-P** | 0.95 | Nucleus sampling — chỉ xét các token có xác suất tích lũy ≤ 0.95 |
| **Top-K** | 40 | Chỉ xét 40 token có xác suất cao nhất |
| **maxOutputTokens** | 8192 | Giới hạn độ dài phản hồi |

**Temperature = 0.1** được chọn có chủ đích để triệt tiêu hiện tượng **"ảo giác" (hallucination)** — khi mô hình AI bịa đặt thông tin không có trong đầu vào. Với bài toán chấm điểm, tính chính xác quan trọng hơn tính sáng tạo.

---

## 4. KỸ THUẬT PROMPT ENGINEERING

### 4.1. Khái niệm

Prompt Engineering là kỹ thuật thiết kế, tối ưu hóa các chỉ dẫn (prompt) gửi cho mô hình AI để đạt được kết quả mong muốn. Đây không chỉ đơn thuần là "viết câu hỏi" mà là nghệ thuật **định hình tư duy và hành vi** của AI thông qua ngôn ngữ tự nhiên.

### 4.2. Các kỹ thuật áp dụng trong ViHand Grade

#### 4.2.1. Role Prompting (Đóng vai)
Gán cho AI một vai trò cụ thể: *"Bạn là giáo viên tiểu học Việt Nam chuyên chấm bài chính tả"*. Kỹ thuật này giúp AI điều chỉnh giọng văn, mức độ chi tiết và tiêu chuẩn đánh giá phù hợp với ngữ cảnh sư phạm.

#### 4.2.2. Structured Output Prompting (Ép cấu trúc đầu ra)
Yêu cầu AI trả về dữ liệu theo **JSON Schema** định sẵn. Điều này cho phép hệ thống tự động parse kết quả và lưu trực tiếp vào cơ sở dữ liệu mà không cần xử lý thủ công.

#### 4.2.3. Rubric-Based Grading (Chấm điểm theo barem)
Tích hợp barem điểm chuẩn chi tiết vào prompt, chia thành 4 tiêu chí rõ ràng với thang điểm cụ thể. AI chấm điểm theo barem thay vì đánh giá cảm tính.

#### 4.2.4. Constraint Injection (Ràng buộc hành vi)
Nhúng các quy tắc ràng buộc vào prompt: "Lỗi lặp chỉ trừ 1 lần", "Trừ điểm theo khối lớp", "Không kèm markdown" — giúp AI tuân thủ nghiêm ngặt quy tắc sư phạm.

---

## 5. TIẾNG VIỆT VÀ HỆ THỐNG CHÍNH TẢ

### 5.1. Đặc điểm ngữ âm tiếng Việt

Tiếng Việt là ngôn ngữ **đơn lập, đơn âm tiết, có thanh điệu**:
- **29 chữ cái:** a, ă, â, b, c, d, đ, e, ê, g, h, i, k, l, m, n, o, ô, ơ, p, q, r, s, t, u, ư, v, x, y
- **6 thanh điệu:** ngang (không dấu), sắc (´), huyền (`), hỏi (ˀ), ngã (~), nặng (.)
- **Nhiều cặp phụ âm dễ nhầm:** ch/tr, s/x, d/gi/r, l/n, c/k/q, g/gh, ng/ngh

### 5.2. Phân loại lỗi chính tả phổ biến

| Loại lỗi | Ký hiệu | Ví dụ | Nguyên nhân |
|---|---|---|---|
| Phụ âm đầu | `phu_am_dau` | "chường" → "trường" | Phương ngữ, nhầm ch/tr |
| Vần | `van` | "mát rợi" → "mát rượi" | Nhầm ươi/ơi |
| Dấu thanh | `dau_thanh` | "ngã" viết thành "ngả" | Không phân biệt hỏi/ngã |
| Viết hoa | `viet_hoa` | "nguyễn văn hùng" | Không viết hoa tên riêng |
| Bỏ sót/thêm | `bo_sot_them` | "tiếng" → "tiến" | Viết thiếu/thừa chữ |

### 5.3. Barem chấm điểm chính tả tiểu học

Hệ thống áp dụng barem **thang 10 điểm** dựa trên chuẩn đánh giá của Bộ Giáo dục và Đào tạo Việt Nam:

| Tiêu chí | Điểm tối đa | Phương pháp đánh giá |
|---|---|---|
| Chính tả & Ngữ pháp | 4.0đ | Trừ dần theo lỗi (0.5đ/lỗi lớp 1–3; 0.25đ/lỗi lớp 4–5) |
| Hình thức trình bày | 3.0đ | Đánh giá theo mức (0–1–2–3) |
| Nội dung & Ý tưởng | 2.0đ | Đánh giá theo mức (0–0.5–1–1.5–2) |
| Sáng tạo | 1.0đ | Cộng điểm khi có biện pháp tu từ |

---

## 6. CÔNG NGHỆ WEB HIỆN ĐẠI

### 6.1. Next.js và App Router

**Next.js** (phiên bản 16) là framework React full-stack sử dụng kiến trúc **App Router** — cho phép xây dựng cả giao diện (frontend) và API (backend) trong cùng một dự án.

Đặc điểm chính:
- **Server Components:** Render trên server để tăng tốc tải trang
- **API Routes:** Xây dựng RESTful API mà không cần backend riêng
- **File-based Routing:** Cấu trúc thư mục tự động ánh xạ thành URL

### 6.2. Progressive Web App (PWA)

PWA là ứng dụng web có thể cài đặt lên thiết bị như ứng dụng native thông qua:
- **Web App Manifest:** Định nghĩa tên, icon, màu chủ đạo
- **Service Worker:** Cho phép caching và hoạt động offline một phần

**Ưu điểm cho giáo dục:** Giáo viên có thể cài ViHand Grade lên điện thoại mà không cần tải từ App Store, sử dụng ngay trong lớp học.

### 6.3. Prisma ORM và SQLite

**Prisma ORM** là công cụ ánh xạ đối tượng – quan hệ (Object-Relational Mapping) cho phép tương tác với cơ sở dữ liệu bằng TypeScript thay vì viết SQL thủ công.

**SQLite** là cơ sở dữ liệu quan hệ dạng file — không cần cài đặt server riêng, phù hợp cho ứng dụng gọn nhẹ. Toàn bộ dữ liệu lưu trong một file duy nhất (`vihand.db`).

### 6.4. Kiến trúc REST API

Hệ thống sử dụng kiến trúc **RESTful API** (Representational State Transfer) với các endpoint:

| Method | Endpoint | Chức năng |
|---|---|---|
| `POST` | `/api/grade` | Gọi Gemini API chấm điểm |
| `POST` | `/api/preprocess` | Tiền xử lý ảnh (pipeline 9 bước) |
| `GET/POST` | `/api/grades` | Đọc/lưu kết quả chấm điểm |
| `GET/POST` | `/api/users` | Quản lý tài khoản người dùng |
| `GET/POST` | `/api/classes` | Quản lý lớp học |

---

## 7. PHÂN QUYỀN DỰA TRÊN VAI TRÒ (RBAC)

**Role-Based Access Control (RBAC)** là mô hình kiểm soát truy cập phân quyền theo vai trò người dùng. Hệ thống ViHand Grade triển khai 3 vai trò:

| Vai trò | Quyền truy cập |
|---|---|
| **Quản trị viên (Admin)** | Quản lý tài khoản, lớp học, thống kê toàn hệ thống |
| **Giáo viên (Teacher)** | Chấm điểm AI, lưu kết quả, xem báo cáo lớp |
| **Học sinh (Student)** | Xem lịch sử điểm và nhận xét cá nhân |

---

## 8. TÀI LIỆU THAM KHẢO

1. Vaswani, A. et al. (2017). *"Attention is All You Need"*. Advances in Neural Information Processing Systems (NeurIPS).
2. Otsu, N. (1979). *"A Threshold Selection Method from Gray-Level Histograms"*. IEEE Transactions on Systems, Man, and Cybernetics, 9(1), pp. 62–66.
3. Zuiderveld, K. (1994). *"Contrast Limited Adaptive Histogram Equalization"*. Graphics Gems IV, Academic Press, pp. 474–485.
4. Gonzalez, R.C. & Woods, R.E. (2018). *Digital Image Processing*. 4th Edition. Pearson.
5. Google DeepMind (2024). *"Gemini: A Family of Highly Capable Multimodal Models"*. arXiv preprint.
6. Wei, J. et al. (2022). *"Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"*. NeurIPS 2022.
7. Bộ Giáo dục và Đào tạo Việt Nam (2020). *Thông tư 27/2020/TT-BGDĐT về Đánh giá học sinh tiểu học*.
8. Brown, T.B. et al. (2020). *"Language Models are Few-Shot Learners"*. NeurIPS 2020.
9. Next.js Documentation (2026). https://nextjs.org/docs
10. Prisma ORM Documentation (2026). https://www.prisma.io/docs

---

*Tài liệu cơ sở lý thuyết — Đề tài ViHand Grade | Cập nhật: 22/05/2026*
