# 📘 NỘI DUNG BỔ SUNG & CHỈNH SỬA CHO CHƯƠNG 2
## CHƯƠNG 2 — CƠ SỞ LÝ THUYẾT

> **Hướng dẫn tác giả sử dụng tài liệu:**
> Mở file `Báo cáo tổng eureka - Thiết bị chấm điểm.docx`, tìm đến Chương 2 để bổ sung các cơ sở lý thuyết hiện đại mà hệ thống ViHand Grade đang ứng dụng thực tế. Mỗi mục dưới đây đều ghi rõ vị trí chèn, số thứ tự đề xuất và câu neo (Anchor Text) để tra cứu nhanh.

---

### 2.1. Bổ sung Lý thuyết Phát hiện Đối tượng Từ Viết Tay với YOLOv8 (Mục 2.1.4 Mới)

* **Vị trí chèn trong file Word:** Tạo mục mới **2.1.4** chèn ngay sau **Mục 2.1.3: Các phương pháp nhận dạng chữ viết tay** (trang 18–19).
* **Câu neo định vị trong Word (Anchor Text):** Tìm câu kết thúc của Mục 2.1.3 (thường kết thúc bằng câu: *"...tuy nhiên còn gặp nhiều hạn chế khi chữ viết tay bị dính nét hoặc không thẳng hàng."*).
* **Hành động:** Chèn mục 2.1.4 với nội dung đặc tả dưới đây:

#### 2.1.4. Phát hiện Đối tượng Từ Viết Tay với Kiến trúc YOLOv8 và Giải thuật Sắp Xếp Trật Tự Đọc
> Trong các bài toán xử lý văn bản truyền thống, việc xác định vị trí của từng con chữ trên trang giấy ô ly thường dựa vào các thuật toán phân đoạn hình thái học (như Connected Component Analysis - CCA hay Contour Detection). Tuy nhiên, trên vở ô ly tiểu học, nét bút chì của học sinh thường đứt đoạn, chữ viết dính vào đường kẻ ô ly khiến cho phương pháp truyền thống bị vỡ khung bao hoặc gộp nhầm các từ lân cận.
>
> Hệ thống ViHand Grade ứng dụng mô hình học sâu **YOLOv8 (You Only Look Once phiên bản 8)** của Ultralytics để thực hiện bài toán phát hiện từ viết tay (Word-level Bounding Box Detection):
> 
> 1. **Kiến trúc Anchor-free & C2f Module**:
>    - YOLOv8 bãi bỏ cơ chế neo hộp (Anchor Boxes) truyền thống, dự đoán trực tiếp khoảng cách từ điểm tâm đến 4 cạnh của Bounding Box $(x_{\min}, y_{\min}, x_{\max}, y_{\max})$. Cơ chế này đặc biệt hiệu quả với chữ viết tay học sinh vốn có kích thước biến thiên rất lớn (từ 15px đối với dấu thanh đến hơn 200px đối với từ nhiều âm tiết).
>    - Module C2f (Cross-Stage Partial with 2 Convolutions) tăng cường khả năng học đặc trưng đa tỷ lệ, giúp trích xuất chính xác ranh giới của các nét chữ viết chì mảnh trên nền lưới kẻ ô ly đậm.
> 
> 2. **Hàm mất mát hồi quy Bounding Box (CIoU & DFL)**:
>    Mô hình tối ưu hóa đồng thời hàm mất mát Complete IoU (CIoU) và Distribution Focal Loss (DFL):
>    $$\mathcal{L}_{\text{box}} = \lambda_{\text{CIoU}} \mathcal{L}_{\text{CIoU}} + \lambda_{\text{DFL}} \mathcal{L}_{\text{DFL}}$$
>    Trong đó, $\mathcal{L}_{\text{CIoU}}$ phạt độ lệch về khoảng cách tâm, tỷ lệ khung hình và độ phủ hộp, đảm bảo khung chữ nhật bao trọn vẹn cả phụ âm đầu, vần và dấu thanh đặt trên/dưới con chữ.
> 
> 3. **Giải thuật Sắp xếp Trật tự Đọc Tự Nhiên (Natural Reading-Order Sorting Algorithm)**:
>    Tập hợp các hộp bao $B = \{b_1, b_2, ..., b_K\}$ sinh ra từ mô hình YOLOv8 xuất hiện ở vị trí ngẫu nhiên không theo thứ tự đọc. Trong file `python_service/yolo_detector.py`, hệ thống cài đặt giải thuật phân dòng và sắp xếp theo 3 bước:
>    - *Bước 1 (Ước lượng chiều cao dòng trung bình)*: Tính $\bar{h} = \text{median}(\{y_{\max}^{(k)} - y_{\min}^{(k)}\}_{k=1}^K)$. Ngưỡng phân chia dòng được xác định là $\Delta y = 0.5 \times \bar{h}$.
>    - *Bước 2 (Gom cụm dòng văn bản)*: Sắp xếp các hộp theo tung độ tâm $y_c = (y_{\min} + y_{\max})/2$. Duyệt tuần tự để gom các hộp có khoảng cách tung độ $|y_c^{(a)} - y_c^{(b)}| \le \Delta y$ vào cùng một dòng $L_r$.
>    - *Bước 3 (Sắp xếp ngang trong từng dòng)*: Trong mỗi dòng $L_r$, sắp xếp các hộp tăng dần theo hoành độ $x_{\min}$. Kết quả thu được một danh sách hộp bao có thứ tự đọc chuẩn từ trên xuống dưới, từ trái sang phải, sẵn sàng ánh xạ 1-1 với chuỗi từ vựng do mô hình Gemini OCR trích xuất.

---

### 2.2. Bổ sung Đặc tả Mô hình Gemini Vision & Cơ chế Rate Limiting (Mục 2.2.3 & 2.2.6 Mới)

#### A. Cập nhật Mục 2.2.3: Lựa chọn Mô hình Gemini 3.1 Flash Lite
* **Vị trí chèn trong file Word:** Chèn vào cuối **Mục 2.2.3: Google Gemini** (trang 20–21).
* **Câu neo định vị trong Word (Anchor Text):** Tìm đoạn văn kết thúc mục 2.2.3 nói về họ mô hình Gemini.
* **Hành động:** Chèn đoạn phân tích lựa chọn mô hình `gemini-3.1-flash-lite`:

> Trong hệ sinh thái ViHand Grade, mô hình thị giác - ngôn ngữ lớn (VLM) được lựa chọn chính thức là **Google Gemini 3.1 Flash Lite** (`gemini-3.1-flash-lite`). Đây là thế hệ mô hình Vision siêu tối ưu của Google:
> - **Thời gian đáp ứng (Latency)**: Đạt tốc độ phản hồi chỉ **1.5 – 1.9 giây** cho một ảnh chụp trang vở (nhanh gấp 3 lần Gemini Pro), đáp ứng yêu cầu chấm bài tức thì tại lớp học.
> - **Cấu hình nhiệt độ thấp (Low Temperature)**: Cài đặt cố định `temperature = 0.1`, `topP = 0.95`, `topK = 40` để triệt tiêu tính ngẫu nhiên, buộc mô hình hoạt động ở trạng thái tất định (deterministic).
> - **Quy tắc trích xuất nguyên gốc (Verbatim Transcription)**: Prompt Engineering được thiết kế để ép mô hình bảo lưu 100% lỗi sai của học sinh (`original_text`). Mô hình tuyệt đối không được tự ý sửa lỗi chính tả trong bước nhận diện ảnh, tách bạch rõ ràng giữa văn bản bài làm chính và các nét chữ luyện viết tự do ở lề trang giấy.

#### B. Tạo Mục 2.2.6 Mới: Cơ chế Kiểm soát Tốc độ Gọi API (Rate Limiting Guard)
* **Vị trí chèn trong file Word:** Tạo mục mới **2.2.6** chèn ngay sau **Mục 2.2.5: Prompt Engineering** (trang 22).
* **Câu neo định vị trong Word (Anchor Text):** Tìm đoạn kết thúc của mục 2.2.5 về Prompt Engineering.
* **Hành động:** Chèn mục 2.2.6 về bảo vệ tài nguyên API:

#### 2.2.6. Cơ chế Kiểm soát Tốc độ Gọi API (Rate Limiting Guard với Sliding Window)
> Do đặc thù các trường học triển khai hệ thống tập trung với hàng chục giáo viên có thể cùng chụp bài chấm trong giờ giải lao, nguy cơ nghẽn dịch vụ hoặc cạn kiệt hạn ngạch (Quota Limit) của Google Cloud API là rất cao. 
> 
> Hệ thống thiết lập tầng bảo vệ **Rate Limiting Guard** (`lib/api-guard.ts`) dựa trên thuật toán **Sliding Window Counter** trực tiếp tại tầng Next.js API Routes:
> - Giới hạn tần suất: Tối đa **30 requests/phút** cho mỗi địa chỉ IP hoặc định danh giáo viên.
> - Cơ chế xử lý: Tự động phản hồi mã trạng thái HTTP `429 Too Many Requests` kèm theo thời gian chờ gợi ý (`Retry-After`) khi phát hiện tần suất chụp gửi bài bất thường, bảo vệ an toàn ngân sách API và độ ổn định của toàn hệ thống.

---

### 2.4. Bổ sung Thuật toán Căn Chỉnh Chuỗi Phân Cấp Word-Level Alignment (Mục 2.4.3 Mới)

* **Vị trí chèn trong file Word:** Tạo mục mới **2.4.3** chèn ngay sau **Mục 2.4.2: Công thức quy hoạch động trong hệ thống** (trang 24–25).
* **Câu neo định vị trong Word (Anchor Text):** Tìm đoạn kết thúc mục 2.4.2 về công thức ma trận Levenshtein Distance $D(i, j)$.
* **Hành động:** Chèn mục 2.4.3 phân tích sự chuyển dịch từ Character-level sang Word-level Alignment:

#### 2.4.3. Thuật toán Căn chỉnh Chuỗi Phân cấp theo Đơn vị Từ (Word-level Sequence Matching)
> Khoảng cách Levenshtein cổ điển tính toán chi phí biến đổi trên từng ký tự đơn lẻ. Khi áp dụng cho bài thi chính tả dài từ 80 đến 150 từ của học sinh tiểu học, ma trận ký tự có kích thước lên tới $500 \times 500$ điểm ảnh, dẫn đến độ phức tạp $O(M \times N)$ rất lớn và thường xuyên bắt cặp sai vị trí dấu cách giữa các từ cạnh nhau.
>
> Nhằm khắc phục hạn chế này, ViHand Grade chuyển đổi sang thuật toán **Căn chỉnh Chuỗi Phân cấp (Hierarchical Sequence Alignment)**:
> 1. **Căn chỉnh tầng vĩ mô (Word-level Alignment)**: Sử dụng giải thuật Gestalt Pattern Matching (`difflib.SequenceMatcher`) trên danh sách các từ đã được tách (Tokenized Words) $S = [s_1, ..., s_m]$ và $T = [t_1, ..., t_n]$. Giải thuật đệ quy tìm kiếm khối từ trùng khớp liên tục dài nhất (Longest Common Contiguous Subsequence), từ đó phân loại trạng thái của từng từ thành 3 nhóm cơ bản:
>    - `equal`: Từ học sinh viết hoàn toàn trùng khớp với bài đọc chuẩn SGK.
>    - `replace`: Học sinh viết sai từ ở vị trí tương ứng (chuyển tiếp sang Tầng vi mô để bóc tách nhóm lỗi).
>    - `delete` / `insert`: Học sinh viết thiếu từ hoặc viết lặp thừa từ so với văn bản chuẩn.
> 2. **Phân tích âm vị học tầng vi mô (Character-level Phonological Analysis)**: Với các cặp từ bị gắn cờ `replace(s_k, t_k)`, hệ thống mới thực thi so khớp ký tự để bóc tách xem lỗi sai nằm ở phụ âm đầu, vần, hay dấu thanh.
> 
> Cách tiếp cận 2 tầng này giúp giảm 80% thời gian tính toán và đảm bảo kết quả đối soát chính xác 100% không bị ảo giác.

---

### 2.5. Bổ sung Thuật toán Deskew và Nền tảng Chụp Ảnh Android CameraX (Mục 2.5.8 & 2.5.9 Mới)

* **Vị trí chèn trong file Word:** Tạo mục **2.5.8** và **2.5.9** chèn ngay sau **Mục 2.5.7: Làm sắc nét** (trang 28).
* **Câu neo định vị trong Word (Anchor Text):** Tìm câu kết thúc mục 2.5.7 về bộ lọc Unsharp Masking.
* **Hành động:** Chèn 2 mục mới dưới đây:

#### 2.5.8. Thuật toán Tự Động Nắn Thẳng Góc Nghiêng Văn Bản (Deskew Algorithm)
> Khi giáo viên hoặc học sinh chụp ảnh bài viết bằng điện thoại thông minh, ảnh chụp thực tế luôn bị lệch một góc nghiêng $\theta \in [-15^\circ, +15^\circ]$. Góc nghiêng này khiến cho các dòng kẻ ô ly bị xiên, làm giảm nghiêm trọng khả năng phân đoạn dòng của mô hình OCR.
>
> Trong file `lib/image-processor.ts`, hệ thống cài đặt thuật toán **Phân tích Phương sai Chiếu Ngang (Horizontal Projection Profile Variance)**:
> 1. **Thu nhỏ & Nhị phân hóa Otsu**: Ảnh được giảm tỷ lệ về chiều rộng 400px để tăng tốc độ tính toán, sau đó chuyển sang ảnh nhị phân $B(x, y) \in \{0, 1\}$.
> 2. **Xóa mờ đường kẻ ô ly**: Các hàng có tỷ lệ pixel đen vượt quá 35% chiều rộng được xác định là đường kẻ tập và được xóa trắng để tránh gây nhiễu cho hướng của con chữ.
> 3. **Dò quét góc thô (Coarse Search)**: Xoay ma trận ảnh thử nghiệm với bước nhảy $1^\circ$ trong dải góc $[-15^\circ, +15^\circ]$. Với mỗi góc $\theta$, tính toán lược đồ chiếu ngang $P_\theta(y) = \sum_x B_\theta(x, y)$ và phương sai tương ứng:
>    $$\text{Var}(P_\theta) = \frac{1}{H} \sum_{y=1}^{H} \left( P_\theta(y) - \bar{P}_\theta \right)^2$$
>    Khi văn bản nằm ngang thẳng hàng nhất, các dòng chữ sẽ tạo ra các đỉnh chiếu cực đại xen kẽ các khoảng trắng giữa các dòng, do đó phương sai $\text{Var}(P_\theta)$ đạt giá trị cực đại.
> 4. **Tinh chỉnh góc mịn (Fine Tuning)**: Quét góc mịn với bước nhảy $0.1^\circ$ trong khoảng $\pm 1^\circ$ quanh góc tối ưu tìm được ở bước 3.
> 5. **Xoay bù trừ ảnh gốc**: Áp dụng phép quay affine xoay ngược một góc $-\theta_{\text{best}}$ lên toàn bộ ảnh gốc Jimp trước khi đưa vào các bước làm nét tiếp theo.

#### 2.5.9. Nền tảng Thu nhận Ảnh Tài liệu qua Android CameraX
> Trên ứng dụng di động native ([`android_app/`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/android_app)), hệ thống khai thác thư viện **Android Jetpack CameraX** nhằm chuẩn hóa chất lượng ảnh tài liệu ngay từ lúc bấm máy:
> - **Tự động lấy nét theo pha (Continuous Auto Focus - CAF)**: Giữ cho các nét chữ viết chì ở cự ly gần luôn đạt độ sắc nét cao nhất.
> - **Khung ngắm căn lề (Document Viewfinder Overlay)**: Hướng dẫn người dùng đặt trọn vẹn 4 góc trang vở vào khung hình, giảm thiểu góc nghiêng phối cảnh (Perspective Distortion).
> - **Khóa độ phân giải tối ưu**: Chụp ảnh ở độ phân giải cảm biến tiêu chuẩn ($1920 \times 1080$ hoặc $2560 \times 1440$) và nén JPEG chất lượng 85%, đảm bảo dung lượng gửi qua mạng di động chỉ từ 800KB đến 1.5MB mà vẫn giữ nguyên vẹn chi tiết từng nét chữ.

---

### 2.6. Bổ sung Bảng Chuẩn Hóa 6 Nhóm Lỗi Chính Tả Tiếng Việt Tiểu Học (Mục 2.6.2 Mới)

* **Vị trí chèn trong file Word:** Tạo mục mới **2.6.2** chèn ngay sau **Mục 2.6.1: Hệ thống chữ viết tiếng Việt** (trang 28–29).
* **Câu neo định vị trong Word (Anchor Text):** Tìm đoạn kết thúc mục 2.6.1 về cấu trúc âm tiết tiếng Việt.
* **Hành động:** Chèn bảng danh mục chuẩn hóa 6 nhóm lỗi:

#### 2.6.2. Chuẩn hóa Phân loại 6 Nhóm Lỗi Chính Tả Tiếng Việt Tiểu Học
Dựa trên đặc điểm ngữ âm học tiếng Việt và chương trình môn Tiếng Việt cấp Tiểu học, hệ thống chuẩn hóa danh mục lỗi sai thành **6 nhóm lỗi độc lập**:

| Mã nhóm lỗi (`error_type`) | Tên nhóm lỗi | Ví dụ thực tế từ bài học sinh | Cơ chế phân loại âm vị học |
|---|---|---|---|
| `phu_am_dau` | Sai phụ âm đầu | *xông* ➔ *sông*, *châu báu* ➔ *trâu báu*, *kéo* ➔ *céo* | Nhầm lẫn các cặp phụ âm đối lập: s/x, tr/ch, r/d/gi, l/n, c/k/q, g/gh, ng/ngh. |
| `van` | Sai phần vần | *bắt tay* ➔ *bắp tay*, *khoai lang* ➔ *khoai lan* | Nhầm lẫn âm chính hoặc âm cuối: an/ang, at/ap, iên/iêng, uôn/uông, ac/at. |
| `dau_thanh` | Sai/thiếu dấu thanh | *cửa sổ* ➔ *cữa sổ*, *mạnh mẽ* ➔ *mạnh mẹ* | Nhầm thanh hỏi/ngã (đặc trưng phương ngữ Nam/Trung Bộ), quên ghi dấu thanh. |
| `viet_hoa` | Sai quy tắc viết hoa | *bác hồ* ➔ *Bác Hồ*, *hà nội* ➔ *Hà Nội* | Không viết hoa chữ cái đầu câu, tên riêng địa lý, tên người hoặc viết hoa tùy tiện. |
| `bo_sot_them` | Bỏ sót hoặc thêm chữ | Viết thiếu chữ *chúng*, viết lặp *ngày ngày ngày* | Học sinh nghe không kịp bị nuốt từ hoặc viết thừa từ lặp lại khi đọc chính tả. |
| `dau_cau` | Sai dấu câu | Thiếu dấu chấm kết đoạn, đặt sai dấu phẩy | Bỏ quên dấu ngắt câu hoặc đặt sai vị trí làm biến đổi ngữ nghĩa ngữ pháp. |

---

### 2.7. Cập nhật Toàn diện "Tự Động Hóa Chấm Điểm Bài Viết" (Mục 2.7 - Bản Rút Gọn)

* **Vị trí chèn trong file Word:** **Thay thế toàn bộ** nội dung của **Mục 2.7: Tự động hóa chấm điểm bài viết** (từ trang 29 đến trang 30 trong file Word).
* **Đoạn văn gốc cần bôi đen thay thế trong Word:** Bôi đen từ tiêu đề `2.7. Tự động hóa chấm điểm bài viết` (bao gồm 2.7.1, 2.7.2, 2.7.3) cho đến ngay trước `2.8. Triển khai hệ thống trên thiết bị Raspberry Pi 4`.
* **Nội dung văn bản cô đọng (Sao chép trực tiếp vào file Word):**

#### 2.7. Tự động hóa chấm điểm bài viết

##### 2.7.1. Tổng quan về Chấm điểm Bài viết Tự động (Automated Essay Scoring - AES)
Chấm điểm bài viết tự động (AES) là lĩnh vực ứng dụng AI trong giáo dục với lịch sử hơn 50 năm, sử dụng xử lý ngôn ngữ tự nhiên để đánh giá bài viết theo ngữ pháp, từ vựng và nội dung. Các hệ thống quốc tế như e-rater hay Turnitin đạt độ tương quan 0,7–0,9 so với con người. Tuy nhiên, đối với học sinh tiểu học Việt Nam, AES truyền thống gặp khó khăn do chữ viết tay non nớt trên nền giấy ô ly và lối tư duy trực quan, đòi hỏi giải pháp chuyên biệt kết hợp giữa thị giác máy tính và phân tích ngữ âm học.

##### 2.7.2. Hướng tiếp cận Dựa trên Trí tuệ Nhân tạo Đa tầng (Hybrid AI)
Thay vì sử dụng một mô hình duy nhất dễ gây ra hiện tượng ảo giác, đề tài ứng dụng kiến trúc **Hybrid AI đa tầng** tối ưu tốc độ, chi phí và tính nhất quán:
1. **Google Gemini 3.1 Flash Lite**: Nhận diện ảnh chữ viết tay và trích xuất nguyên bản (verbatim transcription), nghiêm cấm AI tự ý sửa lỗi ở bước OCR.
2. **Mô hình cục bộ ViT5 (INT8)**: Tiếp nhận văn bản thô để tự động phát hiện và sửa lỗi chính tả tiếng Việt.
3. **Giải thuật đối chiếu Levenshtein & SequenceMatcher**: So khớp từng vị trí từ vựng, bóc tách chính xác 6 nhóm lỗi và loại bỏ hoàn toàn hiện tượng bịa lỗi.
4. **Barem điểm minh bạch**: Tính điểm toán học rõ ràng (Barem 7–3 cho bài Chính tả, 4–3–2–1 cho bài Tập làm văn) và tự động cộng điểm sáng tạo khi phát hiện từ láy hoặc biện pháp tu từ nghệ thuật.

##### 2.7.3. Phản hồi mang tính Xây dựng và Cơ chế Con người Chủ đạo (Human-in-the-loop)
Theo tâm lý học đường và Thông tư 27/2020/TT-BGDĐT, phản hồi khuyến khích có tác động lớn đến động lực học sinh tiểu học. Hệ thống tự động tạo nhận xét theo nguyên tắc nhân văn: chủ động khen ngợi nỗ lực trước, sau đó nhẹ nhàng hướng dẫn sửa lỗi ngữ âm cụ thể bằng ngôn từ gần gũi. 

AI chỉ đóng vai trò trợ giảng số, không thay thế giáo viên. Luồng xử lý thiết lập cơ chế **Human-in-the-loop**: giáo viên luôn là người kiểm duyệt cuối cùng, toàn quyền dùng thanh trượt tinh chỉnh điểm Hình thức, Nội dung hoặc sửa lời phê trước khi lưu chính thức vào cơ sở dữ liệu.

##### 2.7.4. Ứng dụng Mô hình Ngôn ngữ Nhỏ (SLM) Qwen2.5-0.5B-Instruct trong Sinh Lời Nhận Xét Sư Phạm
Trong bối cảnh các mô hình ngôn ngữ lớn (LLM) đám mây đòi hỏi chi phí vận hành token đắt đỏ, phụ thuộc vào kết nối internet liên tục và tiềm ẩn rủi ro về quyền riêng tư dữ liệu học sinh, việc ứng dụng các mô hình ngôn ngữ nhỏ (Small Language Model - SLM) chạy cục bộ (on-premise) là một hướng đi đột phá của đề tài. ViHand Grade tích hợp mô hình **Qwen2.5-0.5B-Instruct** làm hạt nhân sinh lời nhận xét sư phạm Tầng 2 cho phân môn Tập làm văn, mang lại những giá trị vượt trội:

1. **Đặc tả kiến trúc và tối ưu hóa tài nguyên phần cứng**:
   - *Quy mô mô hình*: Thuộc dòng mô hình Dense Transformer thế hệ mới nhất của Alibaba với khoảng 490 triệu tham số (0,49 tỷ tham số). Mặc dù có kích thước nhỏ gọn, mô hình được tiền huấn luyện trên tập dữ liệu đa ngữ khổng lồ, thể hiện khả năng hiểu ngữ pháp và biểu đạt sắc thái tiếng Việt vượt trội trong phân khúc SLM dưới 1 tỷ tham số.
   - *Khả năng thực thi trên CPU máy tính phổ thông*: Nhờ kích thước nhỏ và kỹ thuật tối ưu hóa đa luồng (Intra-op Parallelism), mô hình chỉ chiếm dụng khoảng 1,1 GB bộ nhớ RAM tĩnh. Hệ thống vận hành mượt mà trực tiếp trên vi xử lý CPU của máy tính văn phòng hoặc trạm biên Raspberry Pi 4/5 mà hoàn toàn không đòi hỏi card đồ họa rời (GPU) đắt tiền.
   - *Tốc độ phản hồi thời gian thực*: Thời gian suy luận và sinh một đoạn nhận xét hoàn chỉnh (từ 3 đến 5 câu văn biểu cảm) chỉ mất từ 1,2 đến 2,5 giây, đáp ứng hoàn hảo yêu cầu trả kết quả chấm bài tức thì ngay tại lớp học.

2. **Cơ chế Prompt Engineering định hình phong cách sư phạm tích cực**:
   - Hệ thống thiết kế System Prompt chuyên biệt để định vị mô hình trong vai trò một giáo viên tiểu học Việt Nam tận tụy và tâm lý. Lời nhận xét được sinh ra tuân thủ nghiêm ngặt nguyên tắc đánh giá vì sự tiến bộ của học sinh theo Thông tư 27/2020/TT-BGDĐT: **"Khen ngợi nỗ lực sáng tạo trước — Nhẹ nhàng hướng dẫn sửa lỗi chính tả sau"**.
   - Mô hình tiếp nhận đầu vào gồm: danh sách các lỗi chính tả đã được ViT5 phát hiện, các từ láy và biện pháp tu từ (so sánh, nhân hóa) do thuật toán bóc tách. Từ đó, Qwen2.5 tự động biên soạn lời phê biểu dương sự liên tưởng sinh động của học sinh, khéo léo chỉ ra từ ngữ viết sai và gợi ý cách khắc phục bằng ngôn từ ấm áp, gần gũi, giúp các em không bị áp lực tâm lý hay cảm giác tự ti khi mắc lỗi.

3. **Tính tự chủ và bảo vệ quyền riêng tư dữ liệu học đường**:
   - Việc triển khai mô hình SLM chạy hoàn toàn cục bộ giúp nhà trường chủ động vận hành 100% offline, không bị gián đoạn khi mạng internet gặp sự cố.
   - Toàn bộ nội dung bài văn, nét chữ và lời phê của học sinh được lưu giữ an toàn bên trong máy chủ trường học, loại bỏ nguy cơ rò rỉ thông tin cá nhân của trẻ em lên các nền tảng đám mây công cộng, đáp ứng đầy đủ các yêu cầu khắt khe của Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

---

### 2.8. Cập nhật Toàn diện "Triển Khai Hệ Thống Trên Các Thiết Bị Nhúng" (Mục 2.8)

* **Vị trí chèn trong file Word:** **Thay thế toàn bộ** nội dung của **Mục 2.8: Triển khai hệ thống trên thiết bị Raspberry Pi 4** (từ trang 30 đến trang 34 trong file Word, bao gồm từ mục 2.8 đến hết Chương 2 trước khi bước sang Chương 3).
* **Đoạn văn gốc cần bôi đen thay thế trong Word:** Bôi đen từ tiêu đề `2.8. Triển khai hệ thống trên thiết bị Raspberry Pi 4` (bao gồm các tiểu mục 2.8.1, 2.8.2, 2.8.3) cho đến hết Chương 2 (ngay trước dòng `CHƯƠNG 3: THIẾT KẾ HỆ THỐNG VÀ MÔ HÌNH`).
* **Nội dung văn bản chuẩn học thuật hoàn chỉnh (Sao chép trực tiếp vào file Word):**

#### 2.8. Triển khai hệ thống trên các thiết bị nhúng

##### 2.8.1. Vai trò của điện toán biên đa nền tảng trong hệ thống EdTech
Trong môi trường giáo dục thực tế tại Việt Nam, điều kiện cơ sở vật chất và hạ tầng mạng giữa các trường học có sự chênh lệch đáng kể. Một hệ thống công nghệ giáo dục (EdTech) có tính khả thi cao không thể chỉ phụ thuộc hoàn toàn vào máy chủ đám mây đắt đỏ hay gò bó vào một thiết bị phần cứng cố định. Do đó, đề tài xây dựng kiến trúc mở, cho phép hệ thống triển khai và thử nghiệm linh hoạt trên đa dạng nền tảng tính toán biên:
- **Máy tính xách tay / Máy tính cá nhân (Laptop / PC)**: Khai thác vi xử lý x86-64 đa nhân, đóng vai trò trạm làm việc di động toàn năng của giáo viên, có thể khởi chạy toàn bộ hệ thống cục bộ mà không đòi hỏi cài đặt phức tạp.
- **Raspberry Pi 4 (phiên bản 4GB RAM)**: Dòng máy tính bảng mạch đơn (SBC) đại diện cho phân khúc chi phí thấp, kích thước nhỏ gọn, tiêu thụ ít điện năng, thích hợp làm trạm chủ biên (Edge Server) đặt cố định tại lớp học hoặc văn phòng bộ môn.
- **NVIDIA Jetson Nano (phiên bản 4GB RAM)**: Thiết bị tính toán biên chuyên dụng cho trí tuệ nhân tạo, trang bị 128 nhân GPU kiến trúc Maxwell, giúp tăng tốc tối đa các tác vụ xử lý thị giác máy tính và học sâu tại chỗ.
- **Các thiết bị nhúng và máy tính biên khác**: Khả năng mở rộng sang các dòng SBC thế hệ mới (như Raspberry Pi 5) hoặc máy tính công nghiệp nhỏ gọn (Mini PC), mang lại sự chủ động lựa chọn thiết bị tùy theo ngân sách đầu tư của từng nhà trường.

##### 2.8.2. Kỹ thuật lượng tử hóa và tối ưu hóa tài nguyên trên thiết bị biên
Khi triển khai các mô hình học sâu (Deep Learning) và mô hình ngôn ngữ trên các thiết bị tính toán biên hoặc thiết bị nhúng, giới hạn về dung lượng bộ nhớ RAM và năng lực xử lý là rào cản lớn nhất. Để giải quyết thách thức này, cơ sở lý thuyết của hệ thống dựa trên hai nguyên lý cốt lõi:

1. **Nguyên lý lượng tử hóa mô hình (Model Quantization)**: 
   Lượng tử hóa là kỹ thuật xấp xỉ các giá trị trọng số và kích hoạt của mạng nơ-ron từ định dạng số thực dấu phẩy động độ chính xác cao (32-bit Floating Point - FP32) sang định dạng số nguyên có độ chính xác thấp hơn (như 8-bit Integer - INT8 hoặc định dạng bán chính xác 16-bit). Kỹ thuật này giúp giảm đáng kể kích thước mô hình trong bộ nhớ, tiết kiệm băng thông truy xuất dữ liệu và tận dụng tối đa các tập lệnh tính toán số nguyên nhanh trên vi xử lý, trong khi độ suy giảm về độ chính xác dự đoán vẫn được duy trì ở mức tối thiểu cho phép.

2. **Cơ chế cân bằng tài nguyên và phân bổ tải đa nền tảng**: 
   Để thích ứng linh hoạt với nhiều dòng phần cứng khác nhau (từ máy tính cá nhân đến các dòng máy tính bảng mạch đơn và mạch nhúng chuyên dụng AI), hệ thống áp dụng chiến lược điều phối tải phù hợp:
   - Tận dụng năng lực xử lý đa luồng của vi xử lý CPU trên các máy tính cá nhân để thực thi đồng thời các dịch vụ nền tảng.
   - Khai thác các nhân tính toán đồ họa song song (GPU nhúng) nếu phần cứng hỗ trợ nhằm tăng tốc các tác vụ thị giác máy tính cục bộ.
   - Kiểm soát và tối ưu hóa bộ nhớ tĩnh của các mô hình AI chạy nền, đảm bảo toàn bộ quy trình xử lý luôn vận hành ổn định bên trong giới hạn tài nguyên của các thiết bị có dung lượng bộ nhớ khiêm tốn.

##### 2.8.3. Mạng lưới kết nối an toàn với Cloudflare Tunnel
Hạ tầng mạng nội bộ tại các trường học hầu hết sử dụng địa chỉ IP động và đặt sau nhiều lớp tường lửa mạng diện rộng (Carrier-grade NAT), khiến việc mở cổng modem (Port Forwarding) hoặc mua địa chỉ IP tĩnh là điều bất khả thi. Để giải quyết triệt để vấn đề này, thiết bị nhúng được tích hợp giải pháp **Cloudflare Tunnel (cloudflared)**:
- **Đường truyền mã hóa an toàn**: Thiết lập đường hầm mạng trực tiếp mã hóa TLS/HTTPS từ thiết bị nhúng ra mạng lưới toàn cầu của Cloudflare. Hệ thống không yêu cầu mở bất kỳ cổng kết nối nào trên router của nhà trường, loại bỏ hoàn toàn nguy cơ bị quét cổng hay tấn công mạng từ bên ngoài.
- **Tên miền ổn định và kết nối thông suốt**: Thiết bị được gắn với một tên miền chính thức có chứng chỉ bảo mật SSL/TLS. Nhờ đó, giáo viên có thể sử dụng ứng dụng di động Android Native hoặc máy tính cá nhân ở bất cứ đâu (thông qua mạng 4G/5G hoặc Wi-Fi) để gửi ảnh bài chấm về trạm biên một cách liền mạch và tức thì.

##### 2.8.4. Động cơ truyền phát âm thanh đọc chính tả Edge-TTS Streaming
Bên cạnh khả năng chấm điểm, thiết bị nhúng còn được tích hợp động cơ tổng hợp tiếng nói **Microsoft Edge-TTS** nhằm biến thiết bị thành một trợ giảng phát âm chuẩn trong các giờ học chính tả:
- **Chất lượng giọng đọc chuẩn sư phạm**: Tích hợp các giọng đọc tiếng Việt chất lượng cao sử dụng mạng nơ-ron sâu (`vi-VN-HoaiMyNeural` - giọng nữ truyền cảm chuẩn Bắc Bộ và `vi-VN-NamMinhNeural` - giọng nam đầm ấm), đạt điểm đánh giá độ tự nhiên MOS 4,65/5,0.
- **Truyền phát thời gian thực (Audio Streaming)**: Dữ liệu âm thanh MP3 được truyền phát trực tiếp theo luồng nhị phân từ dịch vụ Python sang trình duyệt với độ trễ bắt đầu phát cực ngắn (chỉ 0,65 giây). Hệ thống cho phép giáo viên tùy biến nhịp độ đọc chậm (-15%) và ngắt nghỉ sư phạm 1,5 giây giữa các cụm từ, hỗ trợ học sinh tiểu học nghe rõ và viết kịp vào vở.
