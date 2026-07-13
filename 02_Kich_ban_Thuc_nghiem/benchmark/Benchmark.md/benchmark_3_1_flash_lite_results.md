# Benchmark OCR — gemini-3.1-flash-lite

> Ngày thực hiện: 01:49:34 30/5/2026
> Số ảnh: 6 | Model: `gemini-3.1-flash-lite`
> API Keys: 4 key(s)

---

## 1. Kết quả tổng hợp

| Chỉ số | Giá trị |
|---|---|
| Thành công | 6/6 |
| Lỗi API | 0 |
| Latency TB | 4.57s |
| Tokens TB | 1200 |
| Similarity TB | 98.0% |
| Word Accuracy TB | 93.4% |

## 2. Chi tiết từng ảnh

| Ảnh | File | Latency (s) | Tokens | Similarity (%) | Word Acc (%) | Trạng thái |
|---|---|---|---|---|---|---|
| Ảnh 1 | ảnh1.jpg | 2.94 | 1207 | 97.09 | 85 | ✅ |
| Ảnh 2 | ảnh2.png | 2.32 | 1225 | 95.74 | 91.07 | ✅ |
| Ảnh 3 | ảnh3.png | 8.77 | 1245 | 99.13 | 95.74 | ✅ |
| Ảnh 4 | ảnh4.PNG | 8.43 | 1140 | 100 | 100 | ✅ |
| Ảnh 5 | ảnh5.PNG | 3.56 | 1220 | 96.06 | 88.37 | ✅ |
| Ảnh 6 | ảnh6.jpg | 1.39 | 1163 | 100 | 100 | ✅ |

---

## 3. So sánh OCR với Ground Truth

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

**OCR bởi `gemini-3.1-flash-lite`** (sim=97.09%, wordAcc=85%):
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

**Đánh giá:** 🟡 Rất tốt

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

**OCR bởi `gemini-3.1-flash-lite`** (sim=95.74%, wordAcc=91.07%):
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

**Đánh giá:** 🟡 Rất tốt

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

**OCR bởi `gemini-3.1-flash-lite`** (sim=99.13%, wordAcc=95.74%):
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

**Đánh giá:** 🟢 Gần như hoàn hảo

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

**OCR bởi `gemini-3.1-flash-lite`** (sim=100%, wordAcc=100%):
```
Cuối năm này em cưới
Anh đến làm chú rể
Xin lỗi bắt anh đợi
Lời yêu thương đã lâu...
Minh Anh Thư
```

**Đánh giá:** 🟢 Gần như hoàn hảo

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

**OCR bởi `gemini-3.1-flash-lite`** (sim=96.06%, wordAcc=88.37%):
```
Việt Nam

Việt Nam đẹp khắp trăm miền
Bốn mùa đặc sắc trời riêng đất này
Xóm làng đồng ruộng rừng cây
Non cao gió dựng sông đầy nắng chang
Sum xuê xoài biếc, cam vàng
Dừa nghiêng cau thẳng, hàng hàng nắng
```

**Đánh giá:** 🟡 Rất tốt

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

**OCR bởi `gemini-3.1-flash-lite`** (sim=100%, wordAcc=100%):
```
Luyện chữ
Chữ đẹp nào phải hoa tay
Ta chăm luyện tập hằng ngày đâu quên
Gắng công ra sức chí bền
Gian nan rèn luyện mới nên con người
```

**Đánh giá:** 🟢 Gần như hoàn hảo

---

