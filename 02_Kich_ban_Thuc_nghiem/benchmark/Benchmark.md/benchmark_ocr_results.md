# Benchmark OCR — So sánh các Model Gemini

> Ngày thực hiện: 22:38:50 29/5/2026
> Số ảnh: 6 | Số model: 5
> API Keys: 4 key(s) xoay vòng

---

## 1. Bảng tổng hợp

| Model | Latency TB (s) | Tokens TB | Similarity TB (%) | Word Accuracy TB (%) | Lỗi |
|---|---|---|---|---|---|
| `gemini-2.5-flash` | 7.32 | 523 | 97.6 | 92.4 | 0 |
| `gemini-2.5-flash-lite` | 5.12 | 365 | 96.8 | 89.3 | 1 |
| `gemini-3-flash-preview` | 69.89 | 2548 | 98.5 | 95.4 | 1 |
| `gemini-3.1-flash-lite` | 5.06 | 1200 | 98.0 | 93.4 | 0 |
| `gemini-3.5-flash` | 36.81 | 2448 | 100.0 | 100.0 | 5 |

---

## 2. Kết quả chi tiết từng model

### Model: `gemini-2.5-flash`

| Ảnh | Latency (s) | Tokens | Similarity (%) | Word Acc (%) | Trạng thái |
|---|---|---|---|---|---|
| Ảnh 1 | 3.74 | 539 | 96 | 85 | ✅ |
| Ảnh 2 | 5.59 | 552 | 97.3 | 92.86 | ✅ |
| Ảnh 3 | 6.03 | 597 | 96.09 | 91.49 | ✅ |
| Ảnh 4 | 15.34 | 458 | 98.97 | 95.65 | ✅ |
| Ảnh 5 | 10.59 | 526 | 98.03 | 93.02 | ✅ |
| Ảnh 6 | 2.63 | 466 | 99.25 | 96.67 | ✅ |

### Model: `gemini-2.5-flash-lite`

| Ảnh | Latency (s) | Tokens | Similarity (%) | Word Acc (%) | Trạng thái |
|---|---|---|---|---|---|
| Ảnh 1 | — | — | — | — | ❌ [503] {"error":{"code":503,"message":"This model is currently experiencing high  |
| Ảnh 2 | 4.55 | 382 | 91.86 | 80.36 | ✅ |
| Ảnh 3 | 4.58 | 405 | 95.67 | 82.98 | ✅ |
| Ảnh 4 | 8.04 | 333 | 98.97 | 95.65 | ✅ |
| Ảnh 5 | 4.44 | 364 | 98.03 | 90.7 | ✅ |
| Ảnh 6 | 4.00 | 341 | 99.25 | 96.67 | ✅ |

### Model: `gemini-3-flash-preview`

| Ảnh | Latency (s) | Tokens | Similarity (%) | Word Acc (%) | Trạng thái |
|---|---|---|---|---|---|
| Ảnh 1 | 12.70 | 3176 | 98.55 | 93.33 | ✅ |
| Ảnh 2 | 17.36 | 5158 | 95.74 | 91.07 | ✅ |
| Ảnh 3 | 7.97 | 1685 | 99.13 | 95.74 | ✅ |
| Ảnh 4 | 6.63 | 1348 | 100 | 100 | ✅ |
| Ảnh 5 | — | — | — | — | ❌ [429] {"error":{"code":429,"message":"You exceeded your current quota, please ch |
| Ảnh 6 | 304.78 | 1374 | 99.25 | 96.67 | ✅ |

### Model: `gemini-3.1-flash-lite`

| Ảnh | Latency (s) | Tokens | Similarity (%) | Word Acc (%) | Trạng thái |
|---|---|---|---|---|---|
| Ảnh 1 | 1.64 | 1207 | 97.09 | 85 | ✅ |
| Ảnh 2 | 3.35 | 1225 | 95.74 | 91.07 | ✅ |
| Ảnh 3 | 5.50 | 1245 | 99.13 | 95.74 | ✅ |
| Ảnh 4 | 14.40 | 1140 | 100 | 100 | ✅ |
| Ảnh 5 | 4.28 | 1220 | 96.06 | 88.37 | ✅ |
| Ảnh 6 | 1.17 | 1163 | 100 | 100 | ✅ |

### Model: `gemini-3.5-flash`

| Ảnh | Latency (s) | Tokens | Similarity (%) | Word Acc (%) | Trạng thái |
|---|---|---|---|---|---|
| Ảnh 1 | — | — | — | — | ❌ [503] {"error":{"code":503,"message":"This model is currently experiencing high  |
| Ảnh 2 | — | — | — | — | ❌ [503] {"error":{"code":503,"message":"This model is currently experiencing high  |
| Ảnh 3 | — | — | — | — | ❌ [503] {"error":{"code":503,"message":"This model is currently experiencing high  |
| Ảnh 4 | 36.81 | 2448 | 100 | 100 | ✅ |
| Ảnh 5 | — | — | — | — | ❌ [429] {"error":{"code":429,"message":"You exceeded your current quota, please ch |
| Ảnh 6 | — | — | — | — | ❌ [429] {"error":{"code":429,"message":"You exceeded your current quota, please ch |

---

## 3. Văn bản OCR trích xuất (so sánh)

### Ảnh 1 — `ảnh1.jpg`

**Ground Truth:**
```
Tiết chữ đẹp

Đặng Hiền

Người ngay thẳng sao chữ thì xiêu vẹo,
Người đẹp xinh sao chữ chẳng như người,
Hãy luyện chữ như luyện hồn luyện tính
"Nét chữ - Nết người" hãng nhớ bạn ơi !

Khi chữ xấu trở thành chữ đẹp,
Ta thấy mình sang trọng hơn lên,
Khi chữ xấu trở thành chữ đẹp,
```

**gemini-2.5-flash** (sim=96%):
```
Viết chữ đẹp
Dặng Thiện
Người ngay thẳng sao chữ thì xiêu vẹo.
Người đẹp xinh sao chữ chẳng như người.
Hãy luyện chữ như luyện hồn luyện tính
"Nét chữ - Nết người" hằng nhớ bạn ơi!

Khi chữ xấu trở thành chữ đẹp.
Ta thấy mình sang trọng hơn lên.
Khi chữ xấu trở thành chữ đẹp,
```

**gemini-2.5-flash-lite**: ❌ [503] {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","st

**gemini-3-flash-preview** (sim=98.55%):
```
Viết chữ đẹp
Đặng Hiển
Người ngay thẳng sao chữ thì xiêu vẹo,
Người đẹp xinh sao chữ chẳng như người,
Hãy luyện chữ như luyện hồn luyện tính
"Nét chữ - Nết người" hằng nhớ bạn ơi !

Khi chữ xấu trở thành chữ đẹp,
Ta thấy mình sang trọng hơn lên.
Khi chữ xấu trở thành chữ đẹp,
```

**gemini-3.1-flash-lite** (sim=97.09%):
```
Viết chữ đẹp
Đặng Hiển
Người ngay thẳng sao chữ thì xiêu vẹo,
Người đẹp xinh sao chữ chẳng như người,
Hãy luyện chữ như luyện hồn luyện tính
“Nét chữ - Nét người” hằng nhớ bạn ơi!

Khi chữ xấu trở thành chữ đẹp,
Ta thấy mình sang trọng hơn lên.
Khi chữ xấu trở thành chữ đẹp,
```

**gemini-3.5-flash**: ❌ [503] {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","st

---

### Ảnh 2 — `ảnh2.png`

**Ground Truth:**
```
Bằng xuôi năm tháng êm xuôi
Còn đó kể chuyện một thời rất xưa
Rằng người chèo chống đón đưa
Mặc cho bụi phấn giữa trưa rơi nhiều

Bay lên tựa những cánh diều
Khách ngày xưa đó ít nhiều lãng quên
Rồi xa lên nước quên tên
Các sông vắng lặng buồn tình tiếng cười
```

**gemini-2.5-flash** (sim=97.3%):
```
Đặng xuôi năm tháng êm xuôi
Con đò kể chuyện một thời rất xưa
Rằng người chèo chống đón đưa
Mặc cho bụi phấn giữa trưa rơi nhiều

Bay lên tựa những cánh diều
Khách ngày xưa đó ít nhiều lãng quên
Rơi xa bên nước quên tên
Các sông vắng lặng buồn tình tiếng cười.
```

**gemini-2.5-flash-lite** (sim=91.86%):
```
Làng xuôi năm tháng êm xuôi
Con đò khế chuyển một thời rất xưa
Ràng người chèo chống đò đưa
Mặc cho bụi phận trưa rơi nhiều
Bay lên trưa những cánh diều
Khách ngày xưa đó ít nhiều lãng quên
Rời xa bên nước quên tên
Cái sông vắng lặng buồn tình tiếng cười
```

**gemini-3-flash-preview** (sim=95.74%):
```
Lặng xuôi năm tháng êm xuôi
Con đò kể chuyện một thời rất xưa
Rằng người chèo chống đón đưa
Mặc cho bụi phấn giữa trưa rơi nhiều

Bay lên tựa những cánh diều
Khách ngày xưa đó ít nhiều lãng quên
Rời xa bến nước quên tên
Giờ sông vắng lặng buồn tênh tiếng cười
```

**gemini-3.1-flash-lite** (sim=95.74%):
```
Lặng xuôi năm tháng êm xuôi
Con đò kể chuyện một thời rất xưa
Rằng người chèo chống đón đưa
Mặc cho bụi phấn giữa trưa rơi nhiều

Bay lên tựa những cánh diều
Khách ngày xưa đó ít nhiều lãng quên
Rời xa bến nước quên tên
Giờ sông vắng lặng buồn tênh tiếng cười
```

**gemini-3.5-flash**: ❌ [503] {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","st

---

### Ảnh 3 — `ảnh3.png`

**Ground Truth:**
```
Đất Long Thành

Rủ nhau chơi khắp Long Thành
Ba mươi sáu phố rành rành chẳng sai:
Hàng Bồ, Hàng Bạc, Hàng Gai
Hàng Buồm, Hàng Thiếc, Hàng Hài, Hàng Khay
Mã Vĩ, Hàng Điếu, Hàng Giầy
Hàng Lờ, Hàng Cốt, Hàng Mây, Hàng Đàn...

Quang Nhã
```

**gemini-2.5-flash** (sim=96.09%):
```
Đất Long Thành
Rủ nhau chơi khắp Long Thành
Ba mươi sáu phố rành rành chẳng sai:
Hàng Bồ, Hàng Bạc, Hàng Gai
Hàng Buồm, Hàng Chiếu, Hàng Hài, Hàng Khay
Mã Vĩ, Hàng Điếu, Hàng Giày
Hàng Lờ, Hàng Cót, Hàng Mây, Hàng Dân
Quang Nhã
```

**gemini-2.5-flash-lite** (sim=95.67%):
```
Đất Long Thành
Rủ nhau chơi khắp Long Thành
Ba mươi sáu phố rành rành chẳng sai:
Hàng Bồ, Hàng Bạc, Hàng Gai,
Hàng Buồm, Hàng Chiếc, Hàng Hải, Hàng Khay,
Mã Vĩ, Hàng Điếu, Hàng Giày,
Hàng Lò, Hàng Cót, Hàng Mây, Hàng Đàn.
Quang Nhã
```

**gemini-3-flash-preview** (sim=99.13%):
```
Đất Long Thành
Rủ nhau chơi khắp Long Thành
Ba mươi sáu phố rành rành chẳng sai:
Hàng Bồ, Hàng Bạc, Hàng Gai
Hàng Buồm, Hàng Thiếc, Hàng Hài, Hàng Khay
Mã Vĩ, Hàng Điếu, Hàng Giày
Hàng Lờ, Hàng Cót, Hàng Mây, Hàng Đàn...
Quang Nhã
```

**gemini-3.1-flash-lite** (sim=99.13%):
```
Đất Long Thành

Rủ nhau chơi khắp Long Thành
Ba mươi sáu phố rành rành chẳng sai:
Hàng Bồ, Hàng Bạc, Hàng Gai
Hàng Buồm, Hàng Thiếc, Hàng Hài, Hàng Khay
Mã Vĩ, Hàng Điếu, Hàng Giày
Hàng Lờ, Hàng Cót, Hàng Mây, Hàng Đàn...
Quang Nhã
```

**gemini-3.5-flash**: ❌ [503] {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","st

---

### Ảnh 4 — `ảnh4.PNG`

**Ground Truth:**
```
Cuối năm này em cưới
Anh đến làm chú rể
Xin lỗi bắt anh đợi
Lời yêu thương đã lâu...

Minh Anh Thư
```

**gemini-2.5-flash** (sim=98.97%):
```
Cuối năm nay em cưới
Anh đến làm chú rể
Xin lỗi bắt anh đợi
Lời yêu thương đã lâu...
Minh Anh Thư
```

**gemini-2.5-flash-lite** (sim=98.97%):
```
Cuối năm này em cưới
Anh đến làm chú rể
Xin lỗi bắt anh đợi
Lời yêu thương đã lâu...
Minh Anh Thu
```

**gemini-3-flash-preview** (sim=100%):
```
Cuối năm này em cưới
Anh đến làm chú rể
Xin lỗi bắt anh đợi
Lời yêu thương đã lâu...
Minh Anh Thư
```

**gemini-3.1-flash-lite** (sim=100%):
```
Cuối năm này em cưới
Anh đến làm chú rể
Xin lỗi bắt anh đợi
Lời yêu thương đã lâu...
Minh Anh Thư
```

**gemini-3.5-flash** (sim=100%):
```
Cuối năm này em cưới
Anh đến làm chú rể
Xin lỗi bắt anh đợi
Lời yêu thương đã lâu...
Minh Anh Thư
```

---

### Ảnh 5 — `ảnh5.PNG`

**Ground Truth:**
```
Việt Nam

Việt Nam đẹp khắp trăm miền
Bốn mùa đặc sắc trời riêng đất này
Xóm làng đồng ruộng rừng cây,
Nốn cao gió dựng sông đầy nắng chang
Xum xuê xoài bưởi cam vàng
Dừa nghiêng cau thẳng hàng hàng nắng
```

**gemini-2.5-flash** (sim=98.03%):
```
Việt Nam
Việt Nam đẹp khắp trăm miền
Bốn mùa đặc sắc trời riêng đất này
Xóm làng đồng ruộng rừng cây
Non cao gió dựng sông đầy nắng chang
Xum xuê xoài bưởi, cam vàng
Dừa nghiêng cau thẳng hàng hàng nắng.
```

**gemini-2.5-flash-lite** (sim=98.03%):
```
Việt Nam
Việt Nam đẹp khắp trăm miền
Bốn mùa đặc sắc trời riêng đất này
Xóm làng đồng ruộng rừng cây
Non cao gió dựng sông đầy nắng chang
Xum xuê xoài, bưởi, cam vàng
Dừa nghiêng cau thẳng hàng hàng nắng
```

**gemini-3-flash-preview**: ❌ [429] {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head 

**gemini-3.1-flash-lite** (sim=96.06%):
```
Việt Nam

Việt Nam đẹp khắp trăm miền
Bốn mùa đặc sắc trời riêng đất này
Xóm làng đồng ruộng rừng cây
Non cao gió dựng sông đầy nắng chang
Sum xuê xoài biếc, cam vàng
Dừa nghiêng cau thẳng, hàng hàng nắng
```

**gemini-3.5-flash**: ❌ [429] {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head 

---

### Ảnh 6 — `ảnh6.jpg`

**Ground Truth:**
```
Luyện chữ

Chữ đẹp nào phải hoa tay
Ta chăm luyện tập hằng ngày đâu quên
Gắng công ra sức chí bền
Gian nan rèn luyện mới nên con người
```

**gemini-2.5-flash** (sim=99.25%):
```
Luyện chữ
Chữ đẹp nào phải hoa tay
Ta chăm luyện tập hàng ngày đâu quên
Gắng công ra sức chí bền
Gian nan rèn luyện mới nên con người
```

**gemini-2.5-flash-lite** (sim=99.25%):
```
Luyện chữ
Chữ đẹp nào phải hoa tay
Ta chăm luyện tập hằng ngày đâu quên
Gắng công ra sức chi bền
Gian nan rèn luyện mới nên con người
```

**gemini-3-flash-preview** (sim=99.25%):
```
Luyện chữ
Chữ đẹp nào phải hoa tay
Ta chăm luyện tập hàng ngày đâu quên
Gắng công ra sức chí bền
Gian nan rèn luyện mới nên con người
```

**gemini-3.1-flash-lite** (sim=100%):
```
Luyện chữ
Chữ đẹp nào phải hoa tay
Ta chăm luyện tập hằng ngày đâu quên
Gắng công ra sức chí bền
Gian nan rèn luyện mới nên con người
```

**gemini-3.5-flash**: ❌ [429] {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head 

---

