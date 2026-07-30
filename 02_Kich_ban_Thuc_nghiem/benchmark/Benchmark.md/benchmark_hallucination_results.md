# Benchmark Hallucination — So sanh 3 Model Gemini

> **Muc dich:** Kiem tra xem cac model Gemini co "ao tuong" (hallucination) — bia dat noi dung khong co trong anh — khi thuc hien OCR chu viet tay tieng Viet bang system prompt thuc te cua ViHand Grade hay khong.
>
> Ngay: 16:54:28 22/7/2026
> Dataset: `image_datasets/anhchuaxuly/` (19 anh thuc te)
> Models: `gemini-3.5-flash-lite\` | \`gemini-3.1-flash-lite\` | \`gemini-3.5-flash`
> Temperature: 0.05

---

## 1. Bang Tong Hop

| Model | Thanh cong | JSON hop le | Latency TB | Tokens TB | H-Score TB | Rui ro cao |
|---|---|---|---|---|---|---|
| `gemini-3.5-flash-lite` | 5/19 | 5/5 | 4.83s | 1779 | 0.0 | 0 anh |
| `gemini-3.1-flash-lite` | 5/19 | 5/5 | 3.59s | 1753 | 2.0 | 0 anh |
| `gemini-3.5-flash` | 5/19 | 2/5 | 28.43s | 3595 | 18.0 | 0 anh |

> **H-Score:** 0 = binh thuong, >35 = nguy co bia dat cao

---

## 2. Chi tiet Hallucination tung Model

### Model: `gemini-3.5-flash-lite`

| # | Anh | Latency | Tokens | JSON | H-Score | Rui ro | Flags |
|---|---|---|---|---|---|---|---|
| 1 | 2015528193537.jpg | 4.67s | 1710 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 2 | 30.PNG | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 3 | CamScanner 06-12-2025 10.00_50 (1).jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 4 | CamScanner 06-12-2025 10.00_51 (1).jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 5 | CamScanner 06-12-2025 10.00_52 (1).jpg | 8.07s | 1981 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 6 | CamScanner 06-12-2025 10.00_53 (1).jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 7 | CamScanner 06-12-2025 10.00_54 (1).jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 8 | chuviettay1.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 9 | chuviettay2.jpg | 2.43s | 1635 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 10 | image.png | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 11 | img_01.png | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 12 | img_02.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 13 | img_03.png | 5.83s | 1661 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 14 | img_04.jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 15 | img_05.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 16 | img_07.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 17 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_2.jpg | 3.15s | 1910 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 18 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_3.jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 19 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_4.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |

### Model: `gemini-3.1-flash-lite`

| # | Anh | Latency | Tokens | JSON | H-Score | Rui ro | Flags |
|---|---|---|---|---|---|---|---|
| 1 | 2015528193537.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 2 | 30.PNG | 6.00s | 1765 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 3 | CamScanner 06-12-2025 10.00_50 (1).jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 4 | CamScanner 06-12-2025 10.00_51 (1).jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 5 | CamScanner 06-12-2025 10.00_52 (1).jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 6 | CamScanner 06-12-2025 10.00_53 (1).jpg | 4.61s | 2089 | ✅ | 10 | 🟡 RUI_RO_THAP | 1 canh bao |
| 7 | CamScanner 06-12-2025 10.00_54 (1).jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 8 | chuviettay1.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 9 | chuviettay2.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 10 | image.png | 3.60s | 1645 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 11 | img_01.png | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 12 | img_02.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 13 | img_03.png | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 14 | img_04.jpg | 1.90s | 1587 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 15 | img_05.jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 16 | img_07.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 17 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_2.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 18 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_3.jpg | 1.84s | 1681 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 19 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_4.jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |

### Model: `gemini-3.5-flash`

| # | Anh | Latency | Tokens | JSON | H-Score | Rui ro | Flags |
|---|---|---|---|---|---|---|---|
| 1 | 2015528193537.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 2 | 30.PNG | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 3 | CamScanner 06-12-2025 10.00_50 (1).jpg | 23.05s | 3342 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 4 | CamScanner 06-12-2025 10.00_51 (1).jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 5 | CamScanner 06-12-2025 10.00_52 (1).jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 6 | CamScanner 06-12-2025 10.00_53 (1).jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 7 | CamScanner 06-12-2025 10.00_54 (1).jpg | 29.65s | 4238 | ❌ | 30 | 🟠 RUI_RO_TRUNG_BINH | 1 canh bao |
| 8 | chuviettay1.jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 9 | chuviettay2.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 10 | image.png | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 11 | img_01.png | 39.10s | 3127 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sach |
| 12 | img_02.jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 13 | img_03.png | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 14 | img_04.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 15 | img_05.jpg | 24.53s | 3439 | ❌ | 30 | 🟠 RUI_RO_TRUNG_BINH | 1 canh bao |
| 16 | img_07.jpg | — | — | ❌ | — | LOI API | [403] {"error":{"code":403,"message":"Permission d |
| 17 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_2.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 18 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_3.jpg | — | — | ❌ | — | LOI API | [400] {"error":{"code":400,"message":"API key not  |
| 19 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_4.jpg | 25.84s | 3828 | ❌ | 30 | 🟠 RUI_RO_TRUNG_BINH | 1 canh bao |

---

## 3. So sanh OCR Chi tiet Tung Anh

### Anh 1 — `2015528193537.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 4.67s | **Tokens:** 1710 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (62 tu):
```
Sơn Tinh, Thủy Tinh
Hùng Vương thứ 18 có một người con gái đẹp tuyệt trần, tên là Mị Nương. Nhà vua muốn kén cho công chúa một người chồng tài giỏi.
Một hôm, có hai chàng trai đến cầu hôn công chúa.
Một người là Sơn Tinh, chúa miền non cao, còn người kia là Thủy Tinh, vua vùng nước thẳm.
```

**fixed_text** (62 tu):
```
Sơn Tinh, Thủy Tinh
Hùng Vương thứ 18 có một người con gái đẹp tuyệt trần, tên là Mị Nương. Nhà vua muốn kén cho công chúa một người chồng tài giỏi.
Một hôm, có hai chàng trai đến cầu hôn công chúa. Một người là Sơn Tinh, chúa miền non cao, còn người kia là Thủy Tinh, vua vùng nước thẳm.
```

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 2 — `30.PNG`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.1-flash-lite`

- **Latency:** 6.00s | **Tokens:** 1765 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (102 tu):
```
Viết về Bố
Nhà em có nuôi một ông bố tên là Đỗ Mạnh Hà. Hằng ngày bố chỉ đi hiếm tiền rồi về nằm ươn ra đấy. Đến bà to nhất vẫn phải làm việc còn bố là người duy nhất không làm việc. Lúc ăn cơm gọi mấy lần cũng chưa lên còn bảo đợi tao tí. Lúc ăn cơm xong cả gia đình cùng dọn bố và rọn rồi xuống chát Za lô với học sinh. Em bé còn phải đút xoài cho bố từ nay em không làm ôxin nữa. Em rất yêu việc chứ không yêu làm.
```

**fixed_text** (101 tu):
```
Viết về Bố
Nhà em có nuôi một ông bố tên là Đỗ Mạnh Hà. Hằng ngày bố chỉ đi kiếm tiền rồi về nằm ươn ra đấy. Đến bà to nhất vẫn phải làm việc, còn bố là người duy nhất không làm việc. Lúc ăn cơm gọi mấy lần cũng chưa lên, còn bảo: "Đợi tao tí". Lúc ăn cơm xong, cả gia đình cùng dọn, bố và rọn rồi xuống chát Zalo với học sinh. Em bé còn phải đút xoài cho bố, từ nay em không làm ô-sin nữa. Em rất yêu việc chứ không yêu làm.
```

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 3 — `CamScanner 06-12-2025 10.00_50 (1).jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.5-flash`

- **Latency:** 23.05s | **Tokens:** 3342 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (172 tu):
```
Đề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập tr 78)
Bài làm
Thành phố Hồ Chí Minh ngày 3 tháng 12 năm 2025
Bà ơi kính mến lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khoẻ không, con gà con hồi nghỉ hè giờ đã lớn rồi đúng không bà, cây xoài hồi năm trước giờ đã to rồi đúng không bà, còn em Xu giờ đã lớn rồi hai tuổi đúng không ạ, bà còn thích trồng cây không ạ, ông có còn bị đau chân không ạ, ông bà có thể đi tập thể dục không ạ.
Ba mẹ cháu đã ít tăng ca hơn, còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn, còn cha mẹ cháu đang làm việc rất tốt, hai anh của cháu cũng mới có việc, gia đình cháu đang rất tốt. Cháu đang rất cố gắng để lấy điểm cao.
```

**fixed_text** (172 tu):
```
Đề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập trang 78)
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025
Bà ơi kính mến, lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khỏe không? Con gà con hồi nghỉ hè giờ đã lớn rồi đúng không bà? Cây xoài hồi năm trước giờ đã to rồi đúng không bà? Còn em Xu giờ đã lớn rồi, hai tuổi đúng không ạ? Bà còn thích trồng cây không ạ? Ông có còn bị đau chân không ạ? Ông bà có thể đi tập thể dục không ạ?
Ba mẹ cháu đã ít tăng ca hơn. Còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn. Còn cha mẹ cháu đang làm việc rất tốt, hai anh của cháu cũng mới có việc, gia đình cháu đang rất tốt. Cháu đang rất cố gắng để lấy điểm cao.
```

---

### Anh 4 — `CamScanner 06-12-2025 10.00_51 (1).jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

---

### Anh 5 — `CamScanner 06-12-2025 10.00_52 (1).jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 8.07s | **Tokens:** 1981 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (176 tu):
```
Thứ hai 3/12/2025
Đề bài Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em ( Vở bài tập tr 78)
Bài làm
Thành phố Hồ Chí Minh ngày 3 tháng 12
Bà 9 kính mến lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khoẻ không, con gà con hồi nghỉ hè giờ đã to lớn rồi đúng không bà, cây xoài hồi năm trước giờ đã to rồi đúng không bà, còn em du giờ đã lớn rồi hai tuổi đúng không ạ, bà còn tro thích trồng cây không ạ, ông có còn bị đau chân không ạ, ông bà có thể đi tập thể dục không ạ.
Ba mẹ cháu đã ít tăng ca hơn, còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn, còn cha mẹ cháu đang làm việc rất tốt, hai anh của cháu cũng mới có việc, gia đình cháu đang rất tốt cháu đang rất cố gắn để lấy điểm cao.
```

**fixed_text** (179 tu):
```
Thứ hai, ngày 3 tháng 12 năm 2025
Đề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập trang 78)
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12
Bà kính mến!
Lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khỏe không? Con gà con hồi nghỉ hè giờ đã to lớn rồi đúng không bà? Cây xoài hồi năm trước giờ đã to rồi đúng không bà? Còn em Du giờ đã lớn rồi, hai tuổi đúng không ạ? Bà còn thích trồng cây không ạ? Ông có còn bị đau chân không ạ? Ông bà có thể đi tập thể dục không ạ?
Ba mẹ cháu đã ít tăng ca hơn, còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn, công việc của ba mẹ cháu đang rất tốt, hai anh của cháu cũng mới có việc làm. Gia đình cháu đang rất tốt, cháu đang rất cố gắng để lấy điểm cao.
```

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 6 — `CamScanner 06-12-2025 10.00_53 (1).jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.1-flash-lite`

- **Latency:** 4.61s | **Tokens:** 2089 | **JSON:** ✅
- **Hallucination:** RUI_RO_THAP (Score: 10)
- **Canh bao:**
  - CONTENT_LONG: original_text co 223 tu (kha dai)

**original_text** (223 tu):
```
Tên: Nguyễn Mậu Thiên Kim lớp 4^2
Thứ Tư ngày 3 tháng 12 năm 2025.
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (vở bài tập tr 78).
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025.
Ông bà ngoại kính yêu!
Đã lâu lắm rồi cháu chưa về quê thăm ông bà ngoại và mọi người xung nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khoẻ của ông bà và mọi người xung quanh và kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lũ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh. Ông bà có khoẻ không? Ông ngoại đỡ đau chân hơn chưa hay còn đau? Bà ngoại đỡ đau lưng hơn chưa? Nhà ông bà ngoại có ngập không? Nhà của mọi người xung quanh không ngập chứ? Ông bà ngoại còn nuôi gà vịt, ... không? Chú mèo mà hồi năm ngoái cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ? Cây xoài hế năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ?
```

**fixed_text** (223 tu):
```
Tên: Nguyễn Mậu Thiên Kim, lớp 4^2
Thứ Tư, ngày 3 tháng 12 năm 2025.
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (vở bài tập tr. 78).
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025.
Ông bà ngoại kính yêu!
Đã lâu lắm rồi, cháu chưa về quê thăm ông bà ngoại và mọi người xung quanh nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khỏe của ông bà và mọi người xung quanh, đồng thời kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lũ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh. Ông bà có khỏe không? Ông ngoại đỡ đau chân hơn chưa hay còn đau? Bà ngoại đỡ đau lưng hơn chưa? Nhà ông bà ngoại có ngập không? Nhà của mọi người xung quanh không ngập chứ? Ông bà ngoại còn nuôi gà, vịt... không? Chú mèo mà hồi năm ngoái cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ? Cây xoài năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ?
```

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 7 — `CamScanner 06-12-2025 10.00_54 (1).jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.5-flash`

- **Latency:** 29.65s | **Tokens:** 4238 | **JSON:** ❌
- **Hallucination:** RUI_RO_TRUNG_BINH (Score: 30)
- **Canh bao:**
  - JSON_INVALID: Model khong tra ve JSON hop le

**Parse Error:** Expected ',' or '}' after property value in JSON at position 2040 (line 3 column 1022)

Raw output:
```
{
  "original_text": "Tên: Nguyễn Mậu Thiên Kim lớp 4^2\nThứ Tư ngày 3 tháng 12 năm 2025.\nĐề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (vở bài tập tr 78).\nBài làm\nThành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025.\nÔng bà ngoại kính yêu!\nĐã lâu lắm rồi, cháu chưa về quê thăm ông bà ngoại và mọi người xung nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức
```

---

### Anh 8 — `chuviettay1.jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

---

### Anh 9 — `chuviettay2.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 2.43s | **Tokens:** 1635 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (46 tu):
```
Quạ và công
Một hôm, quạ rủ công lấy màu vẽ áo khoác cho đẹp. Quạ cho công chiếc áo rực rỡ. Đến lúc công vẽ cho quạ thì nghe tiếng chim lợn báo có mồi ngon. Quạ vội giục công đổ cả chậu phẩm đen
```

**fixed_text** (46 tu):
```
Quạ và công.
Một hôm, quạ rủ công lấy màu vẽ áo khoác cho đẹp. Quạ cho công chiếc áo rực rỡ. Đến lúc công vẽ cho quạ thì nghe tiếng chim lợn báo có mồi ngon. Quạ vội giục công đổ cả chậu phẩm đen.
```

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 10 — `image.png`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.1-flash-lite`

- **Latency:** 3.60s | **Tokens:** 1645 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (53 tu):
```
Việt Nam thân yêu
Việt Nam đất nước ta ơi !
Mênh mông biển lúa đâu trời đẹp hơn
Cánh cò bay lả dập dờn
Mây mờ che đỉnh Trường Sơn sớm chiều
Quê hương biết mấy thân yêu
Bao nhiêu đời đã chịu nhiều đau thương
Mặt người vất vả in sâu
```

**fixed_text** (52 tu):
```
Việt Nam thân yêu
Việt Nam đất nước ta ơi!
Mênh mông biển lúa đâu trời đẹp hơn
Cánh cò bay lả dập dờn
Mây mờ che đỉnh Trường Sơn sớm chiều
Quê hương biết mấy thân yêu
Bao nhiêu đời đã chịu nhiều đau thương
Mặt người vất vả in sâu
```

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 11 — `img_01.png`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.5-flash`

- **Latency:** 39.10s | **Tokens:** 3127 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (76 tu):
```
Chiều trên quê hương
Đó là một buổi chiều mùa hạ có mây trắng xô đuổi nhau trên cao. Nền trời xanh vời vợi. Con chim sơn ca cất lên tiếng hót tự do, tha thiết đến nỗi khiến người ta phải ao ước giá mà mình có một đôi cánh. Trải khắp cánh đồng là nắng chiều vàng dịu và thơm hơi đất, là gió đưa thoang thoảng hương lúa ngậm đòng và hương sen.
```

**fixed_text** (76 tu):
```
Chiều trên quê hương
Đó là một buổi chiều mùa hạ có mây trắng xô đuổi nhau trên cao. Nền trời xanh vời vợi. Con chim sơn ca cất lên tiếng hót tự do, tha thiết đến nỗi khiến người ta phải ao ước giá mà mình có một đôi cánh. Trải khắp cánh đồng là nắng chiều vàng dịu và thơm hơi đất, là gió đưa thoang thoảng hương lúa ngậm đòng và hương sen.
```

---

### Anh 12 — `img_02.jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

---

### Anh 13 — `img_03.png`

#### `gemini-3.5-flash-lite`

- **Latency:** 5.83s | **Tokens:** 1661 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (47 tu):
```
Đôi que dan
Mũ đỏ cho bé
Khăn đen cho bà
Áo đẹp cho mẹ
Áo ấm cho cha
Cừ đôi que nhỏ
Cừ tay chị nữa
Dần dần hiện ra...

Ôi đôi que dan
Sao mà chăm chỉ
Sao mà giản dị
Sao mà dẻo dai...
```

**fixed_text** (47 tu):
```
Đôi que đan
Mũ đỏ cho bé
Khăn đen cho bà
Áo đẹp cho mẹ
Áo ấm cho cha
Từ đôi que nhỏ
Từ tay chị nữa
Dần dần hiện ra...

Ôi đôi que đan
Sao mà chăm chỉ
Sao mà giản dị
Sao mà dẻo dai...
```

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 14 — `img_04.jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.1-flash-lite`

- **Latency:** 1.90s | **Tokens:** 1587 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (20 tu):
```
Hạt gieo tới tấp
Rải khắp ruộng đồng
Nhưng chẳng nảy mầm
Để bao hạt khác
Mừng thầm mọc xanh
```

**fixed_text** (20 tu):
```
Hạt gieo tới tấp
Rải khắp ruộng đồng
Nhưng chẳng nảy mầm
Để bao hạt khác
Mừng thầm mọc xanh.
```

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 15 — `img_05.jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.5-flash`

- **Latency:** 24.53s | **Tokens:** 3439 | **JSON:** ❌
- **Hallucination:** RUI_RO_TRUNG_BINH (Score: 30)
- **Canh bao:**
  - JSON_INVALID: Model khong tra ve JSON hop le

**Parse Error:** Expected ',' or '}' after property value in JSON at position 757 (line 3 column 376)

Raw output:
```
{
  "original_text": "Dòng sông mặc áo\n\nDòng sông mới điệu làm sao\nNắng lên mặc áo lụa đào thướt tha\nTrưa về trời rộng bao la\nÁo xanh sông mặc như là mới may\nChiều trôi thơ thẩn áng mây\nCài lên màu áo hây hây ráng vàng\nĐêm thêu trước ngực vầng trăng\nTrên nền nhung tím trăm ngàn sao lên\nKhuya rồi, sông mặc áo đen\nNép trong rừng bưởi lặng yên đôi bờ.\nNguyễn Trọng Tạo",
  "fixed_text": "D
```

---

### Anh 16 — `img_07.jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

---

### Anh 17 — `nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_2.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 3.15s | **Tokens:** 1910 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (156 tu):
```
Thứ tư ngày 12 tháng 11 năm 2014 - Phạm Hương
4A1
Ba của em tên là Phạm Ngọc Sơn. Ba của em năm nay 42 tuổi. Bố em làm nghề kinh doanh. Bố em cao, to và đẹp trai. Bố em hơi già, trông bố em thì khó tính và nghiêm khắc nhưng thật ra thì bố em rất hiền lành và tốt bụng. Tóc bố em dài thế nên là bố em phải dùng keo vuốt lên. Đừng hiểu lầm, keo ở đây có nghĩa là keo vuốt tóc ấy, chứ không phải là keo năm linh hai hay keo con voi đâu nhé và tóc dài ở đây có nghĩa là nếu mà so sánh tóc của bố em với tóc của con trai thì tóc của bố em sẽ dài hơn một chút chứ không phải là tóc của bố em dài như con gái đâu nhé! Bố em rất thích xem
```

**fixed_text** (154 tu):
```
Thứ tư, ngày 12 tháng 11 năm 2014 - Phạm Hương
4A1
Ba của em tên là Phạm Ngọc Sơn. Ba của em năm nay 42 tuổi. Bố em làm nghề kinh doanh. Bố em cao, to và đẹp trai. Bố em hơi già, trông bố em thì khó tính và nghiêm khắc nhưng thật ra thì bố em rất hiền lành và tốt bụng. Tóc bố em dài thế nên là bố em phải dùng keo vuốt lên. Đừng hiểu lầm, keo ở đây có nghĩa là keo vuốt tóc ấy, chứ không phải là keo 502 hay keo con voi đâu nhé! Và tóc dài ở đây có nghĩa là nếu mà so sánh tóc của bố em với tóc của con trai thì tóc của bố em sẽ dài hơn một chút chứ không phải là tóc của bố em dài như con gái đâu nhé! Bố em rất thích xem
```

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 18 — `nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_3.jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.1-flash-lite`

- **Latency:** 1.84s | **Tokens:** 1681 | **JSON:** ✅
- **Hallucination:** BINH_THUONG (Score: 0)

**original_text** (63 tu):
```
gia đình con có năm người, ông nội con năm nay bao nhiêu tuổi con không biết, con chỉ biết ông nội là người về hưu thôi, ba con làm việc hải quan ở ngòi sân bay tân sơn Nhất, mẹ con làm việc bán hàng xách tay chêng mạng inh tơ nét, anh hai của con tên trung ánh học lớn năm.
```

**fixed_text** (61 tu):
```
Gia đình con có năm người. Ông nội con năm nay bao nhiêu tuổi con không biết, con chỉ biết ông nội là người về hưu thôi. Ba con làm việc hải quan ở ngoài sân bay Tân Sơn Nhất, mẹ con làm việc bán hàng xách tay trên mạng internet, anh hai của con tên Trung Anh học lớp năm.
```

#### `gemini-3.5-flash`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

---

### Anh 19 — `nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_4.jpg`

#### `gemini-3.5-flash-lite`

**Trang thai:** ❌ Loi — [400] {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","

#### `gemini-3.1-flash-lite`

**Trang thai:** ❌ Loi — [403] {"error":{"code":403,"message":"Permission denied: Consumer 'api_key:AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o' has been suspended.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com

#### `gemini-3.5-flash`

- **Latency:** 25.84s | **Tokens:** 3828 | **JSON:** ❌
- **Hallucination:** RUI_RO_TRUNG_BINH (Score: 30)
- **Canh bao:**
  - JSON_INVALID: Model khong tra ve JSON hop le

**Parse Error:** Expected ',' or '}' after property value in JSON at position 599 (line 3 column 301)

Raw output:
```
{
  "original_text": "Bài làm\nBố em tên là Trần Mạnh Toàn. Năm nay bố 36 tuổi Bố có hình dáng còi và cao Bố em hay đánh giấm. cứ mỗi khi em xem phim lại thấy bố lại đánh giấm hai ba lần. Vào các ngày nghỉ bố thường em sang thăm bà nội Bố em làm nghề kinh doanh Bố rất yêu em. Em cũng rất yêu bố.",
  "fixed_text": "Bài làm\nBố em tên là Trần Mạnh Toàn. Năm nay bố 36 tuổi. Bố có dáng người gầy và ca
```

---

## 4. Tong Ket & Phan Tich

### `gemini-3.5-flash-lite`

| Chi so | Gia tri |
|---|---|
| Anh xu ly thanh cong (JSON hop le) | 5/19 |
| So tu TB (original_text) | 97 tu |
| Content Inflation (>300 tu) | 0 anh |
| Fixed Deviation (+30%+) | 0 anh |
| Repetition | 0 anh |
| Qua ngan (<3 tu) | 0 anh |

### `gemini-3.1-flash-lite`

| Chi so | Gia tri |
|---|---|
| Anh xu ly thanh cong (JSON hop le) | 5/19 |
| So tu TB (original_text) | 92 tu |
| Content Inflation (>300 tu) | 0 anh |
| Fixed Deviation (+30%+) | 0 anh |
| Repetition | 0 anh |
| Qua ngan (<3 tu) | 0 anh |

### `gemini-3.5-flash`

| Chi so | Gia tri |
|---|---|
| Anh xu ly thanh cong (JSON hop le) | 2/19 |
| So tu TB (original_text) | 124 tu |
| Content Inflation (>300 tu) | 0 anh |
| Fixed Deviation (+30%+) | 0 anh |
| Repetition | 0 anh |
| Qua ngan (<3 tu) | 0 anh |

---

*Tu dong tao boi `benchmark_hallucination_test.mjs` — ViHand Grade*
