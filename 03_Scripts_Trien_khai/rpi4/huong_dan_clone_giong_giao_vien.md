# HƯỚNG DẪN NHÂN BẢN GIỌNG NÓI GIÁO VIÊN (VOICE CLONING) CHO RASPBERRY PI
## DỰ ÁN VIHAND GRADE — QUY TRÌNH STUDIO-TO-EDGE

---

## 1. NGUYÊN LÝ HOẠT ĐỘNG
Để đạt được tốc độ đọc chính tả tức thì (**Real-Time Factor $< 0.15$**, sinh 1 câu $<0.2$ giây) trên CPU 4 lõi ARM Cortex-A72 của **Raspberry Pi 4 / 5** mà không cần card đồ họa GPU đắt đỏ, hệ thống áp dụng nguyên lý **Studio-to-Edge**:
1. **Khâu huấn luyện (Thực hiện 1 lần trên Google Colab / PC có GPU)**: Tinh chỉnh (fine-tune) mô hình nền tảng Piper VITS tiếng Việt (`vi_VN-vais1000-medium`) dựa trên giọng mẫu của giáo viên. Thời gian chạy chỉ mất khoảng 15–20 phút.
2. **Khâu xuất bản**: Xuất mô hình thành file tối ưu **ONNX Runtime** (`custom_teacher.onnx` $\sim 45\text{MB}$) và file cấu hình (`custom_teacher.onnx.json`).
3. **Khâu triển khai trên Raspberry Pi**: Nạp file `.onnx` vào thư mục `python_service/models/tts/`. Raspberry Pi nạp model vào RAM và cất giọng đọc của chính giáo viên đó hoàn toàn **OFFLINE 100%**.

---

## 2. QUY TRÌNH 3 BƯỚC THỰC HIỆN

### Bước 1: Thu âm mẫu giọng giáo viên (10–15 câu)
- Sử dụng điện thoại hoặc micro máy tính trong không gian yên tĩnh.
- Đọc rõ ràng, dõng dạc 10–15 câu tiếng Việt tiểu học mẫu (định dạng `.wav`, 22050Hz, mono):
  1. *"Cơn giận lặng xuống. Tôi bắt đầu thấy hối hận."*
  2. *"Chắc là En-ri-cô không cố ý làm hỏng trang viết của tôi thật."*
  3. *"Tôi nhìn cậu, thấy vai áo cậu sứt chỉ, thấy thương cậu quá."*
  4. *"Mùa thu quê em đẹp như một bức tranh thủy mặc."*
  5. *"Các em học sinh hãy chú ý lắng nghe và viết thật nắn nót."*
- Đặt tên các file: `wav01.wav`, `wav02.wav`,... kèm file `metadata.csv` (định dạng `tên_file|nội_dung_văn_bản`).

### Bước 2: Huấn luyện xuất file ONNX trên Google Colab (Miễn phí)
1. Mở notebook Google Colab huấn luyện Piper VITS:
   - Sử dụng GPU T4 miễn phí trên Google Colab.
   - Cài đặt Piper training:
     ```bash
     git clone https://github.com/rhasspy/piper.git
     cd piper/src/python
     pip install -e .
     ```
2. Fine-tune từ checkpoint gốc `vi_VN-vais1000-medium` trong 1000–2000 epochs (khoảng 15 phút).
3. Xuất file ONNX:
   ```bash
   python3 -m piper_train.export_onnx \
       --checkpoint /path/to/checkpoint.ckpt \
       --output-file custom_teacher.onnx
   ```
4. Tải 2 file kết quả về máy:
   - `custom_teacher.onnx`
   - `custom_teacher.onnx.json`

### Bước 3: Nạp vào Raspberry Pi của lớp học
1. Copy 2 file trên vào thư mục của ViHand Grade:
   ```bash
   scp custom_teacher.onnx custom_teacher.onnx.json pi@192.168.1.100:/home/pi/Web_sua_loi/python_service/models/tts/
   ```
2. Mở giao diện giáo viên trên Web ViHand Grade (`/teacher/dictation`):
   - Hệ thống tự động nhận diện giọng mới: **"Giọng: Custom Teacher"** trong danh sách giọng đọc.
   - Giáo viên nhấn **Nghe thử** hoặc bấm **Bắt đầu đọc** để thưởng thức giọng đọc chính tả của chính mình phát ra từ loa Raspberry Pi!
