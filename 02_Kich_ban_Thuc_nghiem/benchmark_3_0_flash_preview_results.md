# Benchmark OCR — gemini-3-flash-preview

> Ngày thực hiện: 02:19:40 30/5/2026
> Số ảnh: 6 | Model: `gemini-3-flash-preview`
> API Keys: 4 key(s)

---

## 1. Kết quả tổng hợp

| Chỉ số | Giá trị |
|---|---|
| Thành công | 4/6 |
| Lỗi API | 2 |
| Latency TB | 18.03s |
| Tokens TB | 2782 |
| Similarity TB | 98.2% |
| Word Accuracy TB | 94.2% |

## 2. So sánh với gemini-3.1-flash-lite

| Chỉ số | gemini-3-flash-preview | gemini-3.1-flash-lite | Chênh lệch |
|---|---|---|---|
| Thành công | 4/6 | 6/6 | — |
| Latency TB | 18.03s | 4.57s | — |
| Tokens TB | 2782 | 1,200 | — |
| Similarity TB | 98.2% | 98.0% | — |
| Word Accuracy TB | 94.2% | 93.4% | — |

## 3. Chi tiết từng ảnh

| Ảnh | File | Latency (s) | Tokens | Similarity (%) | Word Acc (%) | Trạng thái |
|---|---|---|---|---|---|---|
| Ảnh 1 | ảnh1.jpg | 9.93 | 2909 | 97.82 | 90 | ✅ |
| Ảnh 2 | ảnh2.png | 17.60 | 5154 | 95.74 | 91.07 | ✅ |
| Ảnh 3 | ảnh3.png | 21.51 | 1705 | 99.13 | 95.74 | ✅ |
| Ảnh 4 | ảnh4.PNG | 23.08 | 1358 | 100 | 100 | ✅ |
| Ảnh 5 | ảnh5.PNG | — | — | — | — | ❌ |
| Ảnh 6 | ảnh6.jpg | — | — | — | — | ❌ |

---

## 4. So sánh từng ảnh với gemini-3.1-flash-lite

| Ảnh | Sim 3.0-preview | Sim 3.1-lite | Diff Sim | WordAcc 3.0 | WordAcc 3.1 | Diff WAcc |
|---|---|---|---|---|---|---|
| Ảnh 1 | 97.82% | 97.09% | +0.73 | 90% | 85% | +5.00 |
| Ảnh 2 | 95.74% | 95.74% | +0.00 | 91.07% | 91.07% | +0.00 |
| Ảnh 3 | 99.13% | 99.13% | +0.00 | 95.74% | 95.74% | +0.00 |
| Ảnh 4 | 100% | 100% | +0.00 | 100% | 100% | +0.00 |
| Ảnh 5 | ❌ | 96.06% | — | ❌ | 88.37% | — |
| Ảnh 6 | ❌ | 100% | — | ❌ | 100% | — |

---

## 5. Văn bản OCR chi tiết

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

**OCR (`gemini-3-flash-preview`)** (sim=97.82%, wordAcc=90%) 🟡 Rất tốt:
```
Viết chữ đẹp
Đặng Hiển
Người ngay thẳng sao chữ thì xiêu vẹo,
Người đẹp xinh sao chữ chẳng như người,
Hãy luyện chữ như luyện hồn luyện tính
“Nét chữ - Nết người” hằng nhớ bạn ơi !

Khi chữ xấu trở thành chữ đẹp,
Ta thấy mình sang trọng hơn lên.
Khi chữ xấu trở thành chữ đẹp,
```

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

**OCR (`gemini-3-flash-preview`)** (sim=95.74%, wordAcc=91.07%) 🟡 Rất tốt:
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

**OCR (`gemini-3-flash-preview`)** (sim=99.13%, wordAcc=95.74%) 🟢 Gần như hoàn hảo:
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

**OCR (`gemini-3-flash-preview`)** (sim=100%, wordAcc=100%) 🟢 Gần như hoàn hảo:
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

**Kết quả:** ❌ [429] {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-lim

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

**Kết quả:** ❌ [503] {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}

---

