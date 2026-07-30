# Benchmark Deep Test — gemini-3.5-flash-lite vs gemini-3.1-flash-lite

> **Mục đích:** Test kỹ 2 mô hình Flash Lite để phát hiện hallucination (bịa đặt nội dung) khi OCR chữ viết tay tiếng Việt.
>
> Ngày: 17:18:30 22/7/2026
> Dataset: `image_datasets/anhchuaxuly/` — 19 ảnh thực tế
> Cấu hình: 1 API key | delay 10s | maxOutputTokens 8192 | temperature 0.05

---

## 1. Bảng Tổng Hợp

| Chỉ số | gemini-3.5-flash-lite | gemini-3.1-flash-lite |
|---|---|---|
| Thành công (JSON OK) | 18/19 | 19/19 |
| Lỗi API | 0 | 0 |
| JSON không hợp lệ | 1 | 0 |
| ✅ Bình thường (H=0) | 16 ảnh | 17 ảnh |
| 🟡 Cảnh báo nhẹ (H≤30) | 2 ảnh | 2 ảnh |
| 🔴 Rủi ro cao (H>30) | 0 ảnh | 0 ảnh |
| Latency TB | 7.85s | 4.37s |
| Tokens TB | 1759 | 1774 |
| Số từ TB (original) | 95 từ | 99 từ |

---

## 2. Chi tiết — `gemini-3.5-flash-lite`

| # | Ảnh | Latency | Tokens | JSON | H-Score | Rủi ro | Flags |
|---|---|---|---|---|---|---|---|
| 1 | 2015528193537.jpg | 3.42s | 1702 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 2 | 30.PNG | 5.58s | 1751 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 3 | CamScanner 06-12-2025 10.00_50 (1).jpg | 6.34s | 1982 | ❌ | 30 | 🟠 JSON lỗi | Expected ',' or '}' after property value in JSON a |
| 4 | CamScanner 06-12-2025 10.00_51 (1).jpg | 3.31s | 1837 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 5 | CamScanner 06-12-2025 10.00_52 (1).jpg | 4.76s | 1974 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 6 | CamScanner 06-12-2025 10.00_53 (1).jpg | 4.91s | 2004 | ✅ | 10 | 🟡 RUI_RO_THAP | 1 cảnh báo |
| 7 | CamScanner 06-12-2025 10.00_54 (1).jpg | 3.53s | 2072 | ✅ | 10 | 🟡 RUI_RO_THAP | 1 cảnh báo |
| 8 | chuviettay1.jpg | 2.33s | 1573 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 9 | chuviettay2.jpg | 1.51s | 1628 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 10 | image.png | 3.28s | 1653 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 11 | img_01.png | 7.50s | 1690 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 12 | img_02.jpg | 4.64s | 1805 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 13 | img_03.png | 43.13s | 1656 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 14 | img_04.jpg | 6.37s | 1580 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 15 | img_05.jpg | 5.10s | 1766 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 16 | img_07.jpg | 8.19s | 1606 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 17 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_2.jpg | 8.22s | 1905 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 18 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_3.jpg | 3.82s | 1727 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 19 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_4.jpg | 21.70s | 1726 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |

## 2. Chi tiết — `gemini-3.1-flash-lite`

| # | Ảnh | Latency | Tokens | JSON | H-Score | Rủi ro | Flags |
|---|---|---|---|---|---|---|---|
| 1 | 2015528193537.jpg | 2.06s | 1702 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 2 | 30.PNG | 8.28s | 1751 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 3 | CamScanner 06-12-2025 10.00_50 (1).jpg | 4.41s | 1984 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 4 | CamScanner 06-12-2025 10.00_51 (1).jpg | 3.33s | 1838 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 5 | CamScanner 06-12-2025 10.00_52 (1).jpg | 3.29s | 1984 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 6 | CamScanner 06-12-2025 10.00_53 (1).jpg | 3.54s | 2084 | ✅ | 10 | 🟡 RUI_RO_THAP | 1 cảnh báo |
| 7 | CamScanner 06-12-2025 10.00_54 (1).jpg | 3.06s | 2084 | ✅ | 10 | 🟡 RUI_RO_THAP | 1 cảnh báo |
| 8 | chuviettay1.jpg | 1.28s | 1573 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 9 | chuviettay2.jpg | 1.31s | 1628 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 10 | image.png | 14.20s | 1658 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 11 | img_01.png | 3.48s | 1690 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 12 | img_02.jpg | 2.75s | 1802 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 13 | img_03.png | 14.25s | 1654 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 14 | img_04.jpg | 2.12s | 1580 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 15 | img_05.jpg | 2.33s | 1766 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 16 | img_07.jpg | 1.88s | 1609 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 17 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_2.jpg | 2.41s | 1900 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 18 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_3.jpg | 1.79s | 1717 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |
| 19 | nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_4.jpg | 7.18s | 1706 | ✅ | 0 | ✅ BINH_THUONG | ✅ Sạch |

---

## 3. So sánh OCR từng Ảnh

### Ảnh 1 — `2015528193537.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 3.42s | **Tokens:** 1702 | **Số từ:** orig=62 / fixed=62
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Sơn Tinh, Thủy Tinh
Hùng Vương thứ 18 có một người con gái đẹp tuyệt trần, tên là Mị Nương. Nhà vua muốn kén cho công chúa một người chồng tài giỏi.
Một hôm, có hai chàng trai đến cầu hôn công chúa. Một người là Sơn Tinh, chúa miền non cao, còn người kia là Thủy Tinh, vua vùng nước thẳm.
```

**fixed_text:**
```
Sơn Tinh, Thủy Tinh
Hùng Vương thứ 18 có một người con gái đẹp tuyệt trần, tên là Mị Nương. Nhà vua muốn kén cho công chúa một người chồng tài giỏi.
Một hôm, có hai chàng trai đến cầu hôn công chúa. Một người là Sơn Tinh, chúa miền non cao, còn người kia là Thủy Tinh, vua vùng nước thẳm.
```

#### `gemini-3.1-flash-lite`

- **Latency:** 2.06s | **Tokens:** 1702 | **Số từ:** orig=62 / fixed=62
- **Sim(orig↔fixed):** 98.61% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Sơn Tinh, Thuỷ Tinh
Hùng Vương thứ 18 có một người con gái đẹp tuyệt trần, tên là Mị Nương. Nhà vua muốn kén cho công chúa một người chồng tài giỏi.
Một hôm, có hai chàng trai đến cầu hôn công chúa. Một người là Sơn Tinh, chúa miền non cao, còn người kia là Thuỷ Tinh, vua vùng nước thẳm.
```

**fixed_text:**
```
Sơn Tinh, Thủy Tinh
Hùng Vương thứ 18 có một người con gái đẹp tuyệt trần, tên là Mị Nương. Nhà vua muốn kén cho công chúa một người chồng tài giỏi.
Một hôm, có hai chàng trai đến cầu hôn công chúa. Một người là Sơn Tinh, chúa miền non cao, còn người kia là Thủy Tinh, vua vùng nước thẳm.
```

---

### Ảnh 2 — `30.PNG`

#### `gemini-3.5-flash-lite`

- **Latency:** 5.58s | **Tokens:** 1751 | **Số từ:** orig=100 / fixed=101
- **Sim(orig↔fixed):** 98.07% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Viết về Bố
Nhà em có nuôi một ông bố tên là Đỗ Mạnh Hà. Hàng ngày bố chỉ đi hiêm tiến rồi về nằm vớn ra đấy. Đến bà to nhất vẫn phải làm việc còn bố là người duy nhất không làm việc. Lúc ăn cơm gọi mấy lần cũng chưa lên còn bảo đợi tao tí. Lúc ăn cơm xong cả dadinh cùng dọn bỏ và rọn rồi xuống chát Zalo với học sinh. Em bé còn phải đút xoài cho bố từ nay em không làm ôsin nữa. Em rái yêu viu chứ không yêu làm.
```

**fixed_text:**
```
Viết về Bố
Nhà em có nuôi một ông bố tên là Đỗ Mạnh Hà. Hàng ngày bố chỉ đi hiểm tiến rồi về nằm vớn ra đấy. Đến bà to nhất vẫn phải làm việc còn bố là người duy nhất không làm việc. Lúc ăn cơm gọi mấy lần cũng chưa lên còn bảo đợi tao tí. Lúc ăn cơm xong cả gia đình cùng dọn bộ và rọn rồi xuống chát Zalo với học sinh. Em bé còn phải đút xoài cho bố từ nay em không làm ôsin nữa. Em ráy yêu viu chứ không yêu làm.
```

#### `gemini-3.1-flash-lite`

- **Latency:** 8.28s | **Tokens:** 1751 | **Số từ:** orig=101 / fixed=101
- **Sim(orig↔fixed):** 99.04% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Viết về Bố
Nhà em có nuôi một ông bố tên là Đỗ Mạnh Hà. Hằng ngày bố chỉ đi hiếm tiền rồi về nằm ươn ra đấy. Đến bà to nhất vẫn phải làm việc còn bố là người duy nhất không làm việc. Lúc ăn cơm gọi mấy lần cũng chưa lên còn bảo đợi tao tí. Lúc ăn cơm xong cả gia đình cùng dọn bố và rọn rồi xuống chát Zalo với học sinh. Em bé còn phải đút xoài cho bố từ nay em không làm ôsin nữa. Em rất yêu việc chứ không yêu làm.
```

**fixed_text:**
```
Viết về Bố
Nhà em có nuôi một ông bố tên là Đỗ Mạnh Hà. Hằng ngày bố chỉ đi kiếm tiền rồi về nằm ươn ra đấy. Đến bà to nhất vẫn phải làm việc còn bố là người duy nhất không làm việc. Lúc ăn cơm gọi mấy lần cũng chưa lên còn bảo đợi tao tí. Lúc ăn cơm xong cả gia đình cùng dọn bố và dọn rồi xuống chát Zalo với học sinh. Em bé còn phải đút xoài cho bố, từ nay em không làm ô-sin nữa. Em rất yêu việc chứ không yêu làm.
```

---

### Ảnh 3 — `CamScanner 06-12-2025 10.00_50 (1).jpg`

#### `gemini-3.5-flash-lite`

**❌ JSON không hợp lệ** | Latency: 6.34s | Tokens: 1982

Parse Error: `Expected ',' or '}' after property value in JSON at position 1176 (line 3 column 414)`

Raw (300 ký tự đầu):
```
{
  "original_text": "Thứ hai 3/12/2025\nĐề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập tr 78)\nBài làm\nThành phố Hồ Chí Minh ngày 3 tháng 12\nBà 9 kính mến lâu rồi cháu chưa về quê để thăm bà.\nDạo này bà có khỏe không, con gà con hồi nghỉ hè giờ đã to lớn
```

#### `gemini-3.1-flash-lite`

- **Latency:** 4.41s | **Tokens:** 1984 | **Số từ:** orig=177 / fixed=177
- **Sim(orig↔fixed):** 95.45% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Thứ hai 3/12/2025
Đề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập tr 78)
Bài làm
Thành phố Hồ Chí Minh ngày 3 tháng 12 năm 2025
Bà ơi kính mến lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khoẻ không, con gà con hồi nghỉ hè giờ đã to lớn rồi đúng không bà, cây xoài hồi năm trước giờ đã to rồi đúng không bà, còn em Du giờ đã lớn rồi hai tuổi đúng không ạ, bà còn ưa thích trồng cây không ạ, ông có còn bị đau chân không ạ, ông bà có thể đi tập thể dục không ạ.
Ba mẹ cháu đã ít tăng ca hơn, còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn, còn cha mẹ cháu đang làm việc rất tốt, hai anh của cháu cũng mới có việc, gia đình cháu đang rất tốt, cháu đang rất cố gắng để lấy điểm cao.
```

**fixed_text:**
```
Thứ Hai, ngày 3/12/2025
Đề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập tr. 78)
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025
Bà ơi kính mến, lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khỏe không? Con gà con hồi nghỉ hè giờ đã to lớn rồi đúng không bà? Cây xoài hồi năm trước giờ đã to rồi đúng không bà? Còn em Du giờ đã lớn rồi, hai tuổi đúng không ạ? Bà còn ưa thích trồng cây không ạ? Ông có còn bị đau chân không ạ? Ông bà có thể đi tập thể dục không ạ?
Ba mẹ cháu đã ít tăng ca hơn, còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn. Cha mẹ cháu đang làm việc rất tốt, hai anh của cháu cũng mới có việc. Gia đình cháu đang rất tốt, cháu đang rất cố gắng để lấy điểm cao.
```

---

### Ảnh 4 — `CamScanner 06-12-2025 10.00_51 (1).jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 3.31s | **Tokens:** 1837 | **Số từ:** orig=130 / fixed=131
- **Sim(orig↔fixed):** 97.81% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em vở bài tập
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025
Ông bà kính mến!
Hôm nay cháu rất nhớ và chợt ông bà nên cháu liền ngồi vào bàn để viết thư này để hỏi thăm sức khỏe của ông bà.
Ông bà, dạo này có ra ngoài tập thể dục với mấy ông bà ở ngoài kia không ạ? anh Quốc anh thì được mấy điểm dạ? những chú gà con được mấy tuổi rồi? những chú heo con được bao nhiêu kí? với lại con chó mẹ đẻ được bao nhiêu chó con?
Hôm qua cháu vừa lên lớp 4. Cũng vừa
```

**fixed_text:**
```
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em vở bài tập.
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025.
Ông bà kính mến!
Hôm nay cháu rất nhớ và chợt nhớ ông bà nên cháu liền ngồi vào bàn để viết thư này để hỏi thăm sức khỏe của ông bà.
Ông bà, dạo này có ra ngoài tập thể dục với mấy ông bà ở ngoài kia không ạ? Anh Quốc Anh thì được mấy điểm ạ? Những chú gà con được mấy tuổi rồi? Những chú heo con được bao nhiêu kí? Với lại con chó mẹ đẻ được bao nhiêu chó con?
Hôm qua cháu vừa lên lớp 4. Cũng vừa
```

#### `gemini-3.1-flash-lite`

- **Latency:** 3.33s | **Tokens:** 1838 | **Số từ:** orig=130 / fixed=132
- **Sim(orig↔fixed):** 97.83% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em vào bài tập
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025
Ông bà kính mến!
Hôm nay cháu rất nhớ và chợt ông bà nên cháu liền ngồi vào bàn để viết thư này để hỏi thăm sức khỏe của ông bà.
Ông bà, dạo này có ra ngoài tập thể dục với mấy ông bà ở ngoài kia không ạ? Anh Quốc Anh thì được mấy điểm dạ? Những chú gà con được mấy tuổi rồi? Những chú heo con được bao nhiêu kí? Với lại con chó mẹ đẻ được bao nhiêu chó con?
Hôm qua cháu vừa lên lớp 4. Cũng vừa
```

**fixed_text:**
```
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em vào bài tập.
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025.
Ông bà kính mến!
Hôm nay cháu rất nhớ và chợt nghĩ đến ông bà nên cháu liền ngồi vào bàn để viết thư này để hỏi thăm sức khỏe của ông bà.
Ông bà, dạo này có ra ngoài tập thể dục với mấy ông bà ở ngoài kia không ạ? Anh Quốc Anh thì được mấy điểm ạ? Những chú gà con được mấy tuổi rồi? Những chú heo con được bao nhiêu kí? Với lại con chó mẹ đẻ được bao nhiêu chó con?
Hôm qua cháu vừa lên lớp 4. Cũng vừa
```

---

### Ảnh 5 — `CamScanner 06-12-2025 10.00_52 (1).jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 4.76s | **Tokens:** 1974 | **Số từ:** orig=175 / fixed=179
- **Sim(orig↔fixed):** 93.85% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Thứ hai 3/12/2025
Đề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập tr 78)
Bài làm
Thành phố Hồ Chí Minh ngày 3 tháng 12
Bà ơi kính mến lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khoẻ không, con gà con hồi nghỉ hè giờ đã to lớn rồi đúng không bà, cây xoài hồi năm trước giờ đã to rồi đúng không bà, còn em du giờ đã lớn rồi hai tuổi đúng không ạ, bà còn tro thích trồng cây không ạ, ông có còn lại đau chân không ạ, ông bà có thể đi tập thể dục không ạ.
Ba mẹ cháu đã ít tăng ca hơn, còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn, còn cha mẹ cháu đang làm việc rất tốt, hai anh của cháu cũng mới có việc, gia đình cháu đang rất tốt, cháu đang rất cố gắn để lấy điểm cao.
```

**fixed_text:**
```
Thứ hai, ngày 3 tháng 12 năm 2025
Đề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập tr 78)
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12
Bà ơi kính mến! Lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khỏe không? Con gà con hồi nghỉ hè giờ đã to lớn rồi đúng không bà? Cây xoài hồi năm trước giờ đã to rồi đúng không bà? Còn em Du giờ đã lớn rồi, hai tuổi đúng không ạ? Bà còn thích trồng cây không ạ? Ông có còn bị đau chân không ạ? Ông bà có thể đi tập thể dục không ạ?
Ba mẹ cháu đã ít tăng ca hơn, còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn, còn cha mẹ cháu đang làm việc rất tốt, hai anh của cháu cũng mới có việc, gia đình cháu đang rất tốt, cháu đang rất cố gắng để lấy điểm cao.
```

#### `gemini-3.1-flash-lite`

- **Latency:** 3.29s | **Tokens:** 1984 | **Số từ:** orig=177 / fixed=177
- **Sim(orig↔fixed):** 95.45% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Thứ hai 3/12/2025
Đề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập tr 78)
Bài làm
Thành phố Hồ Chí Minh ngày 3 tháng 12 năm 2025
Bà ơi kính mến lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khoẻ không, con gà con hồi nghỉ hè giờ đã to lớn rồi đúng không bà, cây xoài hồi năm trước giờ đã to rồi đúng không bà, còn em Du giờ đã lớn rồi hai tuổi đúng không ạ, bà còn ưa thích trồng cây không ạ, ông có còn bị đau chân không ạ, ông bà có thể đi tập thể dục không ạ.
Ba mẹ cháu đã ít tăng ca hơn, còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn, còn cha mẹ cháu đang làm việc rất tốt, hai anh của cháu cũng mới có việc, gia đình cháu đang rất tốt, cháu đang rất cố gắng để lấy điểm cao.
```

**fixed_text:**
```
Thứ Hai, ngày 3/12/2025
Đề bài: Viết thư cho người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập tr. 78)
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025
Bà ơi kính mến, lâu rồi cháu chưa về quê để thăm bà.
Dạo này bà có khỏe không? Con gà con hồi nghỉ hè giờ đã to lớn rồi đúng không bà? Cây xoài hồi năm trước giờ đã to rồi đúng không bà? Còn em Du giờ đã lớn rồi, hai tuổi đúng không ạ? Bà còn ưa thích trồng cây không ạ? Ông có còn bị đau chân không ạ? Ông bà có thể đi tập thể dục không ạ?
Ba mẹ cháu đã ít tăng ca hơn, còn cháu với chị cháu đang cố gắng để thi được nhiều điểm hơn. Cha mẹ cháu đang làm việc rất tốt, hai anh của cháu cũng mới có việc. Gia đình cháu đang rất tốt, cháu đang rất cố gắng để lấy điểm cao.
```

---

### Ảnh 6 — `CamScanner 06-12-2025 10.00_53 (1).jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 4.91s | **Tokens:** 2004 | **Số từ:** orig=231 / fixed=181
- **Sim(orig↔fixed):** 78.91% | **H-Score:** 10 | **Rủi ro:** 🟡 RUI_RO_THAP
- **Cảnh báo:**
  - CONTENT_LONG: 231 tu (kha dai, can kiem tra)

**original_text:**
```
Tên: Nguyễn Mậu Thiên Kim lớp 4^2
Thứ Tư ngày 3 tháng 12 năm 2025.
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (Vở bài tập tr 78).
Bài làm 2025.
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm
Ông bà ngoại kính yêu!
Đã lâu lắm rồi cháu chưa về quê thăm ông bà ngoại và mọi người xung nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khoẻ của ông bà và mọi người xung quanh và kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lữ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh. Ông bà có khoẻ không ? Ông ngoại đỡ đau chân hơn chưa hay còn đau ? Bà ngoại đỡ đau lưng hơn chưa ? Nhà ông bà ngoại có ngập không ? Nhà của mọi người xung quanh không ngập chứ ? Ông bà ngoại còn nuôi gà vịt không ? Chú mèo mà hồi năm ngoái cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ ? Cây xoài hốc năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không ? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ ?
```

**fixed_text:**
```
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025
Ông bà ngoại kính yêu!
Đã lâu lắm rồi cháu chưa về quê thăm ông bà ngoại và mọi người xung quanh nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khỏe của ông bà và mọi người xung quanh và kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lũ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh. Ông bà có khỏe không? Ông ngoại đỡ đau chân hơn chưa hay còn đau? Bà ngoại đỡ đau lưng hơn chưa? Nhà ông bà ngoại có ngập không? Nhà của mọi người xung quanh không ngập chứ? Ông bà ngoại còn nuôi gà, vịt không? Chú mèo mà hồi năm ngoái cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ? Cây xoài gốc năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ?
```

#### `gemini-3.1-flash-lite`

- **Latency:** 3.54s | **Tokens:** 2084 | **Số từ:** orig=222 / fixed=224
- **Sim(orig↔fixed):** 97.61% | **H-Score:** 10 | **Rủi ro:** 🟡 RUI_RO_THAP
- **Cảnh báo:**
  - CONTENT_LONG: 222 tu (kha dai, can kiem tra)

**original_text:**
```
Tên: Nguyễn Mậu Thiên Kim lớp 4^2
Thứ Tư ngày 3 tháng 12 năm 2025.
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (vở bài tập tr 78).
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025.
Ông bà ngoại kính yêu!
Đã lâu lắm rồi, cháu chưa về quê thăm ông bà ngoại và mọi người xung nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khoẻ của ông bà và mọi người xung quanh và kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lũ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh. Ông bà có khoẻ không? Ông ngoại đỡ đau chân hơn chưa hay còn đau? Bà ngoại đỡ đau lưng hơn chưa? Nhà ông bà ngoại có ngập không? Nhà của mọi người xung quanh không ngập chứ? Ông bà ngoại còn nuôi gà vịt... không? Chú mèo mà hồi năm ngoái cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ? Cây xoài hốc năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ?
```

**fixed_text:**
```
Tên: Nguyễn Mậu Thiên Kim, lớp 4^2
Thứ Tư, ngày 3 tháng 12 năm 2025.
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (vở bài tập tr. 78).
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025.
Ông bà ngoại kính yêu!
Đã lâu lắm rồi, cháu chưa về quê thăm ông bà ngoại và mọi người xung quanh nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khỏe của ông bà và mọi người xung quanh, đồng thời kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lũ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh. Ông bà có khỏe không? Ông ngoại đỡ đau chân hơn chưa hay còn đau? Bà ngoại đỡ đau lưng hơn chưa? Nhà ông bà ngoại có ngập không? Nhà của mọi người xung quanh không ngập chứ? Ông bà ngoại còn nuôi gà, vịt... không? Chú mèo mà hồi năm ngoái cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ? Cây xoài hốc năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ?
```

---

### Ảnh 7 — `CamScanner 06-12-2025 10.00_54 (1).jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 3.53s | **Tokens:** 2072 | **Số từ:** orig=222 / fixed=223
- **Sim(orig↔fixed):** 97.37% | **H-Score:** 10 | **Rủi ro:** 🟡 RUI_RO_THAP
- **Cảnh báo:**
  - CONTENT_LONG: 222 tu (kha dai, can kiem tra)

**original_text:**
```
Tên: Nguyễn Mậu Thiên Kim lớp 4^2
Thứ Tư ngày 3 tháng 12 năm 2025.
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (vở bài tập tr 78).
Bài làm 2025.
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm
Ông bà ngoại kính yêu!
Đã lâu lắm rồi cháu chưa về quê thăm ông bà ngoại và mọi người xung nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khoẻ của ông bà và mọi người xung quanh và kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lũ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh Ông bà có khoẻ không? Ông ngoại đỡ đau chân hơn chưa hay còn đau? Bà ngoại đỡ đau lưng hơn chưa? Nhà ông bà ngoại có ngập không? Nhà của mọi người xung quanh không ngập chứ? Ông bà ngoại còn nuôi gà vịt không? Chú mèo mà hồi năm ngoại cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ? Cây xoài hốc năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ?
```

**fixed_text:**
```
Tên: Nguyễn Mậu Thiên Kim lớp 4^2
Thứ Tư, ngày 3 tháng 12 năm 2025
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (vở bài tập tr 78).
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025
Ông bà ngoại kính yêu!
Đã lâu lắm rồi cháu chưa về quê thăm ông bà ngoại và mọi người xung quanh nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khỏe của ông bà và mọi người xung quanh và kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lũ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh. Ông bà có khỏe không? Ông ngoại đỡ đau chân hơn chưa hay còn đau? Bà ngoại đỡ đau lưng hơn chưa? Nhà ông bà ngoại có ngập không? Nhà của mọi người xung quanh không ngập chứ? Ông bà ngoại còn nuôi gà vịt không? Chú mèo mà hồi năm ngoái cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ? Cây xoài gốc năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ?
```

#### `gemini-3.1-flash-lite`

- **Latency:** 3.06s | **Tokens:** 2084 | **Số từ:** orig=222 / fixed=224
- **Sim(orig↔fixed):** 97.61% | **H-Score:** 10 | **Rủi ro:** 🟡 RUI_RO_THAP
- **Cảnh báo:**
  - CONTENT_LONG: 222 tu (kha dai, can kiem tra)

**original_text:**
```
Tên: Nguyễn Mậu Thiên Kim lớp 4^2
Thứ Tư ngày 3 tháng 12 năm 2025.
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (vở bài tập tr 78).
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025.
Ông bà ngoại kính yêu!
Đã lâu lắm rồi, cháu chưa về quê thăm ông bà ngoại và mọi người xung nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khoẻ của ông bà và mọi người xung quanh và kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lũ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh. Ông bà có khoẻ không? Ông ngoại đỡ đau chân hơn chưa hay còn đau? Bà ngoại đỡ đau lưng hơn chưa? Nhà ông bà ngoại có ngập không? Nhà của mọi người xung quanh không ngập chứ? Ông bà ngoại còn nuôi gà vịt... không? Chú mèo mà hồi năm ngoái cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ? Cây xoài hốc năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ?
```

**fixed_text:**
```
Tên: Nguyễn Mậu Thiên Kim, lớp 4^2
Thứ Tư, ngày 3 tháng 12 năm 2025.
Đề bài: Viết thư cho một người thân ở xa để thăm hỏi và kể tình hình gia đình em (vở bài tập tr. 78).
Bài làm
Thành phố Hồ Chí Minh, ngày 3 tháng 12 năm 2025.
Ông bà ngoại kính yêu!
Đã lâu lắm rồi, cháu chưa về quê thăm ông bà ngoại và mọi người xung quanh nên hôm nay, cháu muốn viết bức thư này để hỏi thăm sức khỏe của ông bà và mọi người xung quanh, đồng thời kể lại tình hình gia đình cháu.
Dạo này, cháu nghe trên tin tức thì thấy miền Trung mình bị lũ lụt nên cháu muốn hỏi thăm ông bà và mọi người xung quanh. Ông bà có khỏe không? Ông ngoại đỡ đau chân hơn chưa hay còn đau? Bà ngoại đỡ đau lưng hơn chưa? Nhà ông bà ngoại có ngập không? Nhà của mọi người xung quanh không ngập chứ? Ông bà ngoại còn nuôi gà, vịt... không? Chú mèo mà hồi năm ngoái cháu nuôi chắc bây giờ nó cũng lớn rồi nhỉ? Cây xoài hốc năm ngoái cháu trồng chắc bây giờ cây cũng ra trái nhiều rồi đúng không? Ông bà ngoại và mọi người xung quanh vẫn ổn chứ?
```

---

### Ảnh 8 — `chuviettay1.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 2.33s | **Tokens:** 1573 | **Số từ:** orig=16 / fixed=16
- **Sim(orig↔fixed):** 78.33% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Gó từ tay me
su bé ngủ xay
thay cho sá xời
Giữa chưa oi ải
```

**fixed_text:**
```
Gió từ tay mẹ
ru bé ngủ say
thay cho gió thổi
Giữa trưa oi ả
```

#### `gemini-3.1-flash-lite`

- **Latency:** 1.28s | **Tokens:** 1573 | **Số từ:** orig=16 / fixed=16
- **Sim(orig↔fixed):** 81.36% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Gó từ tay me
su bé ngủ xay
thay cho sá xời
Giữa chưa oi ải
```

**fixed_text:**
```
Gió từ tay mẹ
ru bé ngủ say
thay cho gió xời
Trưa chưa oi ả
```

---

### Ảnh 9 — `chuviettay2.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 1.51s | **Tokens:** 1628 | **Số từ:** orig=46 / fixed=46
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Quạ và công
Một hôm, quạ rủ công lấy màu vẽ áo khoác cho đẹp. Quạ cho công chiếc áo rực rỡ. Đến lúc công vẽ cho quạ thì nghe tiếng chim lợn báo có mồi ngon. Quạ vội giục công đổ cả chậu phẩm đen.
```

**fixed_text:**
```
Quạ và công
Một hôm, quạ rủ công lấy màu vẽ áo khoác cho đẹp. Quạ cho công chiếc áo rực rỡ. Đến lúc công vẽ cho quạ thì nghe tiếng chim lợn báo có mồi ngon. Quạ vội giục công đổ cả chậu phẩm đen.
```

#### `gemini-3.1-flash-lite`

- **Latency:** 1.31s | **Tokens:** 1628 | **Số từ:** orig=46 / fixed=46
- **Sim(orig↔fixed):** 98.97% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Quạ và công
Một hôm, quạ rủ công lấy màu vẽ áo khoác cho đẹp. Quạ cho công chiếc áo rực rỡ. Đến lúc công vẽ cho quạ thì nghe tiếng chim lợn báo có mồi ngon. Quạ vội giục công đổ cả chậu phẩm đen
```

**fixed_text:**
```
Quạ và Công
Một hôm, quạ rủ công lấy màu vẽ áo khoác cho đẹp. Quạ cho công chiếc áo rực rỡ. Đến lúc công vẽ cho quạ thì nghe tiếng chim lợn báo có mồi ngon. Quạ vội giục công đổ cả chậu phẩm đen.
```

---

### Ảnh 10 — `image.png`

#### `gemini-3.5-flash-lite`

- **Latency:** 3.28s | **Tokens:** 1653 | **Số từ:** orig=57 / fixed=56
- **Sim(orig↔fixed):** 99.19% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Nết chữ Nết người
Việt Nam thân yêu
Việt Nam đất nước ta ơi !
Mênh mông biển lúa đâu trời đẹp hơn
Cánh cò bay là dập dờn
Mây mờ che đỉnh Trường Sơn sớm chiều
Quê hương biết mấy thân yêu
Bao nhiêu đời đã chịu nhiều đau thương
Mặt người vất vả in sâu
```

**fixed_text:**
```
Nết chữ Nết người
Việt Nam thân yêu
Việt Nam đất nước ta ơi!
Mênh mông biển lúa đâu trời đẹp hơn
Cánh cò bay lả dập dờn
Mây mờ che đỉnh Trường Sơn sớm chiều
Quê hương biết mấy thân yêu
Bao nhiêu đời đã chịu nhiều đau thương
Mặt người vất vả in sâu
```

#### `gemini-3.1-flash-lite`

- **Latency:** 14.20s | **Tokens:** 1658 | **Số từ:** orig=57 / fixed=56
- **Sim(orig↔fixed):** 99.6% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Nét chữ
Nét người
Việt Nam thân yêu
Việt Nam đất nước ta ơi !
Mênh mông biển lúa đâu trời đẹp hơn
Cánh cò bay lả dập dờn
Mây mờ che đỉnh Trường Sơn sớm chiều
Quê hương biết mấy thân yêu
Bao nhiêu đời đã chịu nhiều đau thương
Mặt người vất vả in sâu
```

**fixed_text:**
```
Nét chữ
Nét người
Việt Nam thân yêu
Việt Nam đất nước ta ơi!
Mênh mông biển lúa đâu trời đẹp hơn
Cánh cò bay lả dập dờn
Mây mờ che đỉnh Trường Sơn sớm chiều
Quê hương biết mấy thân yêu
Bao nhiêu đời đã chịu nhiều đau thương
Mặt người vất vả in sâu
```

---

### Ảnh 11 — `img_01.png`

#### `gemini-3.5-flash-lite`

- **Latency:** 7.50s | **Tokens:** 1690 | **Số từ:** orig=76 / fixed=76
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Chiều trên quê hương
Đó là một buổi chiều mùa hạ có mây trắng xô đuổi nhau trên cao. Nền trời xanh vời vợi. Con chim sơn ca cất lên tiếng hót tự do, tha thiết đến nỗi khiến người ta phải ao ước giá mà mình có một đôi cánh. Trải khắp cánh đồng là nắng chiều vàng dịu và thơm hơi đất, là gió đưa thoang thoảng hương lúa ngậm đòng và hương sen.
```

**fixed_text:**
```
Chiều trên quê hương
Đó là một buổi chiều mùa hạ có mây trắng xô đuổi nhau trên cao. Nền trời xanh vời vợi. Con chim sơn ca cất lên tiếng hót tự do, tha thiết đến nỗi khiến người ta phải ao ước giá mà mình có một đôi cánh. Trải khắp cánh đồng là nắng chiều vàng dịu và thơm hơi đất, là gió đưa thoang thoảng hương lúa ngậm đòng và hương sen.
```

#### `gemini-3.1-flash-lite`

- **Latency:** 3.48s | **Tokens:** 1690 | **Số từ:** orig=76 / fixed=76
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Chiều trên quê hương
Đó là một buổi chiều mùa hạ có mây trắng xô đuổi nhau trên cao. Nền trời xanh vời vợi. Con chim sơn ca cất lên tiếng hót tự do, tha thiết đến nỗi khiến người ta phải ao ước giá mà mình có một đôi cánh. Trải khắp cánh đồng là nắng chiều vàng dịu và thơm hơi đất, là gió đưa thoang thoảng hương lúa ngậm đòng và hương sen.
```

**fixed_text:**
```
Chiều trên quê hương
Đó là một buổi chiều mùa hạ có mây trắng xô đuổi nhau trên cao. Nền trời xanh vời vợi. Con chim sơn ca cất lên tiếng hót tự do, tha thiết đến nỗi khiến người ta phải ao ước giá mà mình có một đôi cánh. Trải khắp cánh đồng là nắng chiều vàng dịu và thơm hơi đất, là gió đưa thoang thoảng hương lúa ngậm đòng và hương sen.
```

---

### Ảnh 12 — `img_02.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 4.64s | **Tokens:** 1805 | **Số từ:** orig=92 / fixed=92
- **Sim(orig↔fixed):** 98.92% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Em yêu nhà em
Chẳng đâu bằng chính nhà em
Có đàn chim sẻ bên thềm líu lo
Có nàng gà mái hoa mơ
Cục ta cục tác khi vừa đẻ xong
Có bà chuối mật lưng ong
Có ông ngô bắp râu hồng như tơ
Có ao muống với cá cờ
Em là chị Tấm đợi chờ bống lên
Có đầm ngào ngạt hoa sen
Ếch con học nhạc, dế mèn làm thơ
Dù đi xa thật là xa
Chẳng đâu vui được như nhà của em.
(Đoàn Thị Lam Luyến)
```

**fixed_text:**
```
Em yêu nhà em
Chẳng đâu bằng chính nhà em
Có đàn chim sẻ bên thềm líu lo
Có nàng gà mái hoa mơ
Cục ta cục tác khi vừa đẻ xong
Có buồng chuối mật lưng ong
Có ông ngô bắp râu hồng như tơ
Có ao muống với cá cờ
Em là chị Tấm đợi chờ bống lên
Có đầm ngào ngạt hoa sen
Ếch con học nhạc, dế mèn làm thơ
Dù đi xa thật là xa
Chẳng đâu vui được như nhà của em.
(Đoàn Thị Lam Luyến)
```

#### `gemini-3.1-flash-lite`

- **Latency:** 2.75s | **Tokens:** 1802 | **Số từ:** orig=92 / fixed=92
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Em yêu nhà em
Chẳng đâu bằng chính nhà em
Có đàn chim sẻ bên thềm líu lo
Có nàng gà mái hoa mơ
Cục ta cục tác khi vừa đẻ xong
Có bà chuối mật lưng ong
Có ông ngô bắp râu hồng như tơ
Có ao muống với cá cờ
Em là chị Tấm đợi chờ bóng lên
Có đầm ngào ngạt hoa sen
Ếch con học nhạc, dế mèn làm thơ
Dù đi xa thật là xa
Chẳng đâu vui được như nhà của em.
(Đoàn Thị Lam Luyến)
```

**fixed_text:**
```
Em yêu nhà em
Chẳng đâu bằng chính nhà em
Có đàn chim sẻ bên thềm líu lo
Có nàng gà mái hoa mơ
Cục ta cục tác khi vừa đẻ xong
Có bà chuối mật lưng ong
Có ông ngô bắp râu hồng như tơ
Có ao muống với cá cờ
Em là chị Tấm đợi chờ bóng lên
Có đầm ngào ngạt hoa sen
Ếch con học nhạc, dế mèn làm thơ
Dù đi xa thật là xa
Chẳng đâu vui được như nhà của em.
(Đoàn Thị Lam Luyến)
```

---

### Ảnh 13 — `img_03.png`

#### `gemini-3.5-flash-lite`

- **Latency:** 43.13s | **Tokens:** 1656 | **Số từ:** orig=47 / fixed=47
- **Sim(orig↔fixed):** 97.24% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Đôi que dan
Mũ đỏ cho bé
Khăn den cho bà
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

**fixed_text:**
```
Đôi que đan
Mũ đỏ cho bé
Khăn đen cho bà
Áo đẹp cho mẹ
Áo ấm cho cha
Cứ đôi que nhỏ
Cứ tay chị nữa
Dần dần hiện ra...

Ôi đôi que đan
Sao mà chăm chỉ
Sao mà giản dị
Sao mà dẻo dai...
```

#### `gemini-3.1-flash-lite`

- **Latency:** 14.25s | **Tokens:** 1654 | **Số từ:** orig=47 / fixed=47
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
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

**fixed_text:**
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

---

### Ảnh 14 — `img_04.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 6.37s | **Tokens:** 1580 | **Số từ:** orig=20 / fixed=20
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Hạt gieo tới tấp
Rải khắp ruộng đồng
Nhưng chẳng nảy mầm
Để bao hạt khác
Mừng thầm mọc xanh.
```

**fixed_text:**
```
Hạt gieo tới tấp
Rải khắp ruộng đồng
Nhưng chẳng nảy mầm
Để bao hạt khác
Mừng thầm mọc xanh.
```

#### `gemini-3.1-flash-lite`

- **Latency:** 2.12s | **Tokens:** 1580 | **Số từ:** orig=20 / fixed=20
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Hạt gieo tới tấp
Rải khắp ruộng đồng
Nhưng chẳng nảy mầm
Để bao hạt khác
Mừng thầm mọc xanh
```

**fixed_text:**
```
Hạt gieo tới tấp
Rải khắp ruộng đồng
Nhưng chẳng nảy mầm
Để bao hạt khác
Mừng thầm mọc xanh
```

---

### Ảnh 15 — `img_05.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 5.10s | **Tokens:** 1766 | **Số từ:** orig=77 / fixed=77
- **Sim(orig↔fixed):** 99.71% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Dòng sông mặc áo
Dòng sông mới điệu làm sao
Nắng lên mặc áo lụa đào thướt tha
Trưa về trời rộng bao la
Áo xanh sông mặc như là mới may
Chiều trôi thơ thẩn ánh mây
Cài lên màu áo hây hây ráng vàng
Đêm thêu trước ngực vầng trăng
Trên nền nhung tím trăm ngàn sao lên
Khuya rồi, sông mặc áo đen
Nép trong rừng bưởi lặng yên đợi bờ.
Nguyễn Trọng Tạo
```

**fixed_text:**
```
Dòng sông mặc áo
Dòng sông mới điệu làm sao
Nắng lên mặc áo lụa đào thướt tha
Trưa về trời rộng bao la
Áo xanh sông mặc như là mới may
Chiều trôi thơ thẩn áng mây
Cài lên màu áo hây hây ráng vàng
Đêm thêu trước ngực vầng trăng
Trên nền nhung tím trăm ngàn sao lên
Khuya rồi, sông mặc áo đen
Nép trong rừng bưởi lặng yên đợi bờ.
Nguyễn Trọng Tạo
```

#### `gemini-3.1-flash-lite`

- **Latency:** 2.33s | **Tokens:** 1766 | **Số từ:** orig=77 / fixed=77
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Dòng sông mặc áo
Dòng sông mới điệu làm sao
Nắng lên mặc áo lụa đào thướt tha
Trưa về trời rộng bao la
Áo xanh sông mặc như là mới may
Chiều trôi thơ thẩn áng mây
Cài lên màu áo hây hây ráng vàng
Đêm thêu trước ngực vầng trăng
Trên nền nhung tím trăm ngàn sao lên
Khuya rồi, sông mặc áo đen
Nép trong rừng bưởi lặng yên đôi bờ.
Nguyễn Trọng Tạo
```

**fixed_text:**
```
Dòng sông mặc áo
Dòng sông mới điệu làm sao
Nắng lên mặc áo lụa đào thướt tha
Trưa về trời rộng bao la
Áo xanh sông mặc như là mới may
Chiều trôi thơ thẩn áng mây
Cài lên màu áo hây hây ráng vàng
Đêm thêu trước ngực vầng trăng
Trên nền nhung tím trăm ngàn sao lên
Khuya rồi, sông mặc áo đen
Nép trong rừng bưởi lặng yên đôi bờ.
Nguyễn Trọng Tạo
```

---

### Ảnh 16 — `img_07.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 8.19s | **Tokens:** 1606 | **Số từ:** orig=34 / fixed=34
- **Sim(orig↔fixed):** 100% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Ở sao cho vừa lòng người
Ở rộng người cười, ở hẹp người chê
Cao chê ngổng thấp chê lùn
Béo chê béo trục béo tròn
Gầy chê xương sống xương sườn bày ra.
```

**fixed_text:**
```
Ở sao cho vừa lòng người
Ở rộng người cười, ở hẹp người chê
Cao chê ngổng thấp chê lùn
Béo chê béo trục béo tròn
Gầy chê xương sống xương sườn bày ra.
```

#### `gemini-3.1-flash-lite`

- **Latency:** 1.88s | **Tokens:** 1609 | **Số từ:** orig=34 / fixed=34
- **Sim(orig↔fixed):** 98.04% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Ở sao cho vừa lòng người
Ở rộng người cười, ở hẹp người chê
Cao chê ngổng thấp chê lùn
Béo chê béo trục béo tròn
Gầy chê xương sống xương sườn bày ra.
```

**fixed_text:**
```
Ở sao cho vừa lòng người
Ở rộng người cười, ở hẹp người chê
Cao chê ngổng, thấp chê lùn
Béo chê béo trục, béo tròn
Gầy chê xương sống, xương sườn bày ra.
```

---

### Ảnh 17 — `nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_2.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 8.22s | **Tokens:** 1905 | **Số từ:** orig=156 / fixed=156
- **Sim(orig↔fixed):** 99.36% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Thứ tư ngày 12 tháng 11 năm 2014 - Phạm Hưng 4A1

Ba của em tên là Phạm Ngọc Sơn. Ba của em năm nay 42 tuổi. Bố em làm nghề kinh doanh. Bố em cao, to và đẹp trai. Bố em hơi già, trông bố em thì khó tính và nghiêm khắc nhưng thật ra thì bố em rất hiền lành và tốt bụng. Tóc bố em dài thế nên là bố em phải dùng keo vuốt lên. Đừng hiểu lầm, keo ở đây có nghĩa là keo vuốt tóc ấy, chứ không phải là keo năm linh hai hay keo con voi đâu nhé và tóc dài ở đây có nghĩa là nếu mà so sánh tóc của bố em với tóc của con trai thì tóc của bố em sẽ dài hơn một chút chứ không phải là tóc của bố em dài như con gái đâu nhé! Bố em rất thích xem
```

**fixed_text:**
```
Thứ tư ngày 12 tháng 11 năm 2014 - Phạm Hưng 4A1

Ba của em tên là Phạm Ngọc Sơn. Ba của em năm nay 42 tuổi. Bố em làm nghề kinh doanh. Bố em cao, to và đẹp trai. Bố em hơi già, trông bố em thì khó tính và nghiêm khắc nhưng thật ra thì bố em rất hiền lành và tốt bụng. Tóc bố em dài thế nên là bố em phải dùng keo vuốt lên. Đừng hiểu lầm, keo ở đây có nghĩa là keo vuốt tóc ấy, chứ không phải là keo năm mươi hai hay keo con voi đâu nhé và tóc dài ở đây có nghĩa là nếu mà so sánh tóc của bố em với tóc của con trai thì tóc của bố em sẽ dài hơn một chút chứ không phải là tóc của bố em dài như con gái đâu nhé! Bố em rất thích xem
```

#### `gemini-3.1-flash-lite`

- **Latency:** 2.41s | **Tokens:** 1900 | **Số từ:** orig=156 / fixed=154
- **Sim(orig↔fixed):** 97.46% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Thứ tư ngày 12 tháng 11 năm 2014 - Phạm Hưng 4A1 Ba của em tên là Phạm Ngọc Sơn. Ba của em năm nay 42 tuổi. Bố em làm nghề kinh doanh. Bố em cao, to và đẹp trai. Bố em hơi già, trông bố em thì khó tính và nghiêm khắc nhưng thật ra thì bố em rất hiền lành và tốt bụng. Tóc bố em dài thế nên là bố em phải dùng keo vuốt lên. Đừng hiểu lầm, keo ở đây có nghĩa là keo vuốt tóc ấy, chứ không phải là keo năm linh hai hay keo con voi đâu nhé và tóc dài ở đây có nghĩa là nếu mà so sánh tóc của bố em với tóc của con trai thì tóc của bố em sẽ dài hơn một chút chứ không phải là tóc của bố em dài như con gái đâu nhé! Bố em rất thích xem
```

**fixed_text:**
```
Thứ tư, ngày 12 tháng 11 năm 2014 - Phạm Hưng 4A1. Ba của em tên là Phạm Ngọc Sơn. Ba của em năm nay 42 tuổi. Bố em làm nghề kinh doanh. Bố em cao, to và đẹp trai. Bố em hơi già, trông bố em thì khó tính và nghiêm khắc nhưng thật ra thì bố em rất hiền lành và tốt bụng. Tóc bố em dài thế nên là bố em phải dùng keo vuốt lên. Đừng hiểu lầm, keo ở đây có nghĩa là keo vuốt tóc ấy, chứ không phải là keo 502 hay keo con voi đâu nhé! Và tóc dài ở đây có nghĩa là nếu mà so sánh tóc của bố em với tóc của con trai thì tóc của bố em sẽ dài hơn một chút chứ không phải là tóc của bố em dài như con gái đâu nhé! Bố em rất thích xem
```

---

### Ảnh 18 — `nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_3.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 3.82s | **Tokens:** 1727 | **Số từ:** orig=83 / fixed=81
- **Sim(orig↔fixed):** 97.77% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Đề bài :
Hãy tả cảnh sinh hoạt của gia đình em vào một buổi trong ngày
Làm bài :
gia đình con có năm người, ông nội con năm nay bao nhiêu tuổi con không biết, con chỉ biết ông nội là người về hưu thôi, ba con làm việc hải quan ở ngoài sân bay Tân Sơn Nhất, mẹ con làm việc bán hàng xách tay chênh mạng tinh tơ nét, anh hai của con tiên trung ánh học lớn năm.
```

**fixed_text:**
```
Đề bài:
Hãy tả cảnh sinh hoạt của gia đình em vào một buổi trong ngày.
Bài làm:
Gia đình con có năm người, ông nội con năm nay bao nhiêu tuổi con không biết, con chỉ biết ông nội là người về hưu thôi, ba con làm việc hải quan ở ngoài sân bay Tân Sơn Nhất, mẹ con làm việc bán hàng xách tay chênh mạng tinh tơ nét, anh hai của con tiên trung ánh học lớn năm.
```

#### `gemini-3.1-flash-lite`

- **Latency:** 1.79s | **Tokens:** 1717 | **Số từ:** orig=81 / fixed=79
- **Sim(orig↔fixed):** 94.63% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Đề bài: Hãy tả cảnh sinh hoạt của gia đình em vào một buổi trong ngày. Làm bài: gia đình con có năm người, ông nội con năm nay bao nhiêu tuổi con không biết, con chỉ biết ông nội là người về hưu thôi, ba con làm việc hải quan ở ngòi sân bay Tân Sơn Nhất, mẹ con làm việc bán hàng xách tay chêng mạng inh tơ nét, anh hai của con tên Trung ánh học lớn năm.
```

**fixed_text:**
```
Đề bài: Hãy tả cảnh sinh hoạt của gia đình em vào một buổi trong ngày. Làm bài: Gia đình con có năm người. Ông nội con năm nay bao nhiêu tuổi con không biết, con chỉ biết ông nội là người về hưu thôi. Ba con làm việc hải quan ở ngoài sân bay Tân Sơn Nhất, mẹ con làm việc bán hàng xách tay trên mạng internet, anh hai của con tên Trung đang học lớp năm.
```

---

### Ảnh 19 — `nhung-bai-van-ta-thuc-cua-tre-tieu-hoc-khien-giao-vien-can-loi_4.jpg`

#### `gemini-3.5-flash-lite`

- **Latency:** 21.70s | **Tokens:** 1726 | **Số từ:** orig=81 / fixed=82
- **Sim(orig↔fixed):** 96.14% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Bài làm
Bố em tên là Trần Mạnh Toàn.
Năm nay bố 36 tuổi. Bố có hình dáng còi và cao. Bố em hay đánh giấm, cứ mỗi khi em xem phim lại thấy bố lại đánh giấm hai ba lần. Vào các ngày nghỉ, bố thường em sang thăm bà nội. (Bố em làm nghề kinh doanh). Bố rất yêu em. Em cũng rất yêu bố.
Con nên lựa chọn chi tiết hay để kể.
Sắp xếp ý lộn xộn
```

**fixed_text:**
```
Bài làm
Bố em tên là Trần Mạnh Toàn.
Năm nay bố 36 tuổi. Bố có hình dáng gầy và cao. Bố em hay đánh rắm, cứ mỗi khi em xem phim lại thấy bố lại đánh rắm hai ba lần. Vào các ngày nghỉ, bố thường đưa em sang thăm bà nội. (Bố em làm nghề kinh doanh). Bố rất yêu em. Em cũng rất yêu bố.
Con nên lựa chọn chi tiết hay để kể.
Sắp xếp ý lộn xộn
```

#### `gemini-3.1-flash-lite`

- **Latency:** 7.18s | **Tokens:** 1706 | **Số từ:** orig=81 / fixed=82
- **Sim(orig↔fixed):** 96.15% | **H-Score:** 0 | **Rủi ro:** ✅ BINH_THUONG

**original_text:**
```
Bài làm Bố em tên là Trần Mạnh Toàn. Năm nay bố 36 tuổi Bố có hình dáng còi và cao Bố em hay đánh giấm. cứ mỗi khi em xem phim lại thấy bố lại đánh giấm hai ba lần Vào các ngày nghỉ bố thường em sang thăm bà nội Bố em làm nghề kinh doanh Bố rất yêu em Em cũng rất yêu bố. Con nên lựa chọn chi tiết hay để kể. Sắp xếp ý lộn xộn
```

**fixed_text:**
```
Bài làm Bố em tên là Trần Mạnh Toàn. Năm nay bố 36 tuổi. Bố có hình dáng còi và cao. Bố em hay đánh giấm. Cứ mỗi khi em xem phim lại thấy bố lại đánh giấm hai ba lần. Vào các ngày nghỉ, bố thường đưa em sang thăm bà nội. Bố em làm nghề kinh doanh. Bố rất yêu em. Em cũng rất yêu bố. Con nên lựa chọn chi tiết hay để kể. Sắp xếp ý lộn xộn.
```

---

*Tạo bởi `benchmark_flashlite_deeptest.mjs` — ViHand Grade*
