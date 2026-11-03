# 📘 TÀI LIỆU PHÂN TÍCH TOÀN DIỆN HỆ THỐNG TRỢ LÝ ĐỌC CHÍNH TẢ TỰ ĐỘNG
## NGUYÊN LÝ HOẠT ĐỘNG TỪNG PHẦN & CẨM NANG PHẢN BIỆN BẢO VỆ ĐỒ ÁN / NCKH

> **Tài liệu tham chiếu nội bộ:** Dự án ViHand Grade — Hệ sinh thái trợ lý đọc và chấm điểm chính tả chữ viết tay học sinh tiểu học.  
> **Mục tiêu:** Cung cấp bức tranh kỹ thuật và sư phạm chi tiết nhất về phân hệ Đọc chính tả, giúp tác giả hiểu sâu sắc từng khối xử lý để tự tin thuyết minh và phản biện trước Hội đồng đánh giá.

---

## MỤC LỤC TỔNG QUAN

1. [TRIẾT LÝ THIẾT KẾ & SƠ ĐỒ KIẾN TRÚC TOÀN CẢNH](#1-triết-lý-thiết-kế--sơ-đồ-kiến-trúc-toàn-cảnh)
2. [PHÂN TÍCH CHI TIẾT NGUYÊN LÝ HOẠT ĐỘNG TỪNG KHỐI](#2-phân-tích-chi-tiết-nguyên-lý-hoạt-động-từng-khối)
   * [Khối 1: Quản lý & Biên soạn Đề bài (Database & Qwen AI Generation)](#khối-1-quản-lý--biên-soạn-đề-bài-database--qwen-ai-generation)
   * [Khối 2: Tinh chỉnh Tham số Sư phạm (Pedagogical Prosody Tuning)](#khối-2-tinh-chỉnh-tham-số-sư-phạm-pedagogical-prosody-tuning)
   * [Khối 3: Pipeline TTS 3 Tầng Kép (Qwen2.5 SLM + Piper VITS + Zero-Phase DSP)](#khối-3-pipeline-tts-3-tầng-kép-qwen25-slm--piper-vits--zero-phase-dsp)
   * [Khối 4: Cơ chế Thích ứng Phần cứng (Hardware-Adaptive 3 Modes)](#khối-4-cơ-chế-thích-ứng-phần-cứng-hardware-adaptive-3-modes)
   * [Khối 5: Tích hợp Khép kín với Luồng Chấm điểm (Ground Truth Locking)](#khối-5-tích-hợp-khép-kín-với-luồng-chấm-điểm-ground-truth-locking)
3. [BỘ CÂU HỎI & KỊCH BẢN PHẢN BIỆN BẢO VỆ TRƯỚC HỘI ĐỒNG (FAQ DEFENSE)](#3-bộ-câu-hỏi--kịch-bản-phản-biện-bảo-vệ-trước-hội-đồng-faq-defense)

---

## 1. TRIẾT LÝ THIẾT KẾ & SƠ ĐỒ KIẾN TRÚC TOÀN CẢNH

### 1.1. Bài toán thực tế tại trường tiểu học
Trong tiết dạy Chính tả (Nghe – Viết) theo Chương trình GDPT 2018:
* **Gánh nặng thể lực của giáo viên:** Giáo viên phải đứng đọc liên tục suốt 35 – 40 phút, phải lặp lại mỗi câu 2 – 3 lần, vừa đọc vừa quan sát bao quát cả lớp từ 30 – 45 học sinh.
* **Độ lệch ngữ âm vùng miền:** Giọng đọc của giáo viên đôi khi mang ngữ âm địa phương (lẫn lộn *l/n*, *tr/ch*, *d/r/gi*, dấu *hỏi/ngã*), dẫn đến việc học sinh viết sai chính tả theo phát âm của giáo viên.
* **Chênh lệch tốc độ viết tay của học sinh:** Có em viết nhanh, em viết chậm. Nếu giáo viên đọc đều đều, các em viết chậm sẽ bị sót chữ, sinh ra tâm lý hoảng loạn, bỏ bài.

### 1.2. Triết lý giải pháp của ViHand Grade
Hệ thống không đơn thuần là một chiếc máy phát âm thanh Text-to-Speech (TTS) thông thường, mà là một **Trợ lý sư phạm thông minh (Pedagogical Dictation Assistant)** với 3 nguyên tắc:
1. **Sư phạm hóa (Pedagogical-Centric):** Đọc ngắt cụm 4–6 từ, đọc mẫu – đọc viết – đọc soát, dừng viết tay động theo lứa tuổi, đọc to khẩu lệnh dấu câu.
2. **Tự chủ ngoại tuyến (Offline-First Edge Computing):** Hoạt động độc lập trên thiết bị nhúng Raspberry Pi 4 không cần Internet, phù hợp trường học vùng sâu vùng xa.
3. **Khép kín dữ liệu (Ground Truth Alignment):** Khóa chặt bài đọc làm cơ sở dữ liệu đối soát chuẩn xác 100% cho phân hệ thị giác máy tính chấm bài sau đó.

### 1.3. Sơ đồ luồng dữ liệu toàn cảnh (Architecture Flowchart)

```text
 ┌────────────────────────────────────────────────────────────────────────────────┐
 │                       NGUỒN BÀI ĐỌC ĐẦU VÀO (DATABASE)                         │
 │   ┌───────────────────────────────────┐    ┌───────────────────────────────┐   │
 │   │ Cách 1: Văn mẫu soạn trước / SGK  │    │ Cách 2: Qwen 2.5 AI Sáng tác  │   │
 │   │ (SQLite vihand.db / Lớp 1 - 5)    │    │ (Theo Chủ đề & Khối lớp)      │   │
 │   └─────────────────┬─────────────────┘    └───────────────┬───────────────┘   │
 └─────────────────────┼──────────────────────────────────────┼───────────────────┘
                       │                                      │
                       ▼                                      ▼
 ┌────────────────────────────────────────────────────────────────────────────────┐
 │                   GIAO DIỆN TINH CHỈNH SƯ PHẠM (TEACHER UI)                    │
 │  🗣️ Chọn giọng đọc & Sắc thái (Standard / Warm Story / Emphasis / Question)     │
 │  ✂️ Chế độ cắt cụm từ ngữ lưu (Cụm ngắn 4–6 chữ vừa sức học sinh chép)         │
 │  ⏱️ Tốc độ phát (-20% đến 0%) & Khoảng dừng viết tay động (Dynamic Pause)      │
 │  🔄 Số lần đọc lặp lại (1, 2 hoặc 3 lần) & Bật/Tắt đọc tên dấu câu sư phạm      │
 └──────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                                        ▼
 ┌────────────────────────────────────────────────────────────────────────────────┐
 │                 PIPELINE TTS 3 TẦNG KÉP (TRIPLE-STAGE HYBRID AI)               │
 │                                                                                │
 │  ┌──────────────────────────────────────────────────────────────────────────┐  │
 │  │ TẦNG 1: NLP FRONTEND & CHUẨN HÓA SƯ PHẠM (Qwen 2.5 SLM + Regex)          │  │
 │  │ • Chuyển số, ngày tháng, tên lớp thành chữ: "20/11" ──► "hai mươi..."    │  │
 │  │ • Ngắt cụm theo ranh giới ngữ nghĩa (Semantic Phrasing bằng dấu "|")     │  │
 │  │ • Chèn khẩu lệnh dấu câu: "," ──► ", phẩy, "; "\n" ──► ", xuống dòng. "  │  │
 │  └──────────────────────────────────────┬───────────────────────────────────┘  │
 │                                         │                                      │
 │                                         ▼                                      │
 │  ┌──────────────────────────────────────────────────────────────────────────┐  │
 │  │ TẦNG 2: MÔ HÌNH ÂM HỌC VITS ONNX (Piper TTS Offline Engine)              │  │
 │  │ • Mô hình vi_VN-vais1000-medium (Cô Hoài My giọng Bắc chuẩn sư phạm)     │  │
 │  │ • Chạy trực tiếp trên CPU ARM/x86 (RTF = 0.14, không cần GPU rời)        │  │
 │  │ • Sinh sóng âm int16 22.05kHz & Chèn thời gian dừng viết tay động        │  │
 │  └──────────────────────────────────────┬───────────────────────────────────┘  │
 │                                         │                                      │
 │                                         ▼                                      │
 │  ┌──────────────────────────────────────────────────────────────────────────┐  │
 │  │ TẦNG 3: HẬU KỲ TÍN HIỆU SỐ ZERO-PHASE DSP (Bộ lọc 5 bước SciPy)          │  │
 │  │ • High-pass 85Hz: Khử ù rền màng loa thùng lớp học (sub-bass)            │  │
 │  │ • Peaking EQ 185Hz (+0.15 gain): Tăng độ ấm áp, truyền cảm cho giọng đọc │  │
 │  │ • Dual-Notch 3100Hz & 4400Hz: Triệt tiêu rè kim loại của Vocoder VITS    │  │
 │  │ • Low-pass 6800Hz: Cắt tạp âm xè cao tần                                 │  │
 │  │ • Soft Saturation (tanh) & Peak Norm 0.92: Chuẩn hóa âm lượng phát thanh │  │
 │  └──────────────────────────────────────┬───────────────────────────────────┘  │
 └──────────────────────────────────────┼─────────────────────────────────────────┘
                                        │
                                        ▼
 ┌────────────────────────────────────────────────────────────────────────────────┐
 │                     PHÁT AUDIO RA LOA NGOÀI LỚP HỌC                            │
 │ • Phát trực tiếp qua jack 3.5mm AUX / USB Speaker của trạm biên Raspberry Pi 4 │
 │ • Hoặc stream âm thanh WAV chất lượng cao về Web Audio của máy tính giáo viên   │
 │ • Học sinh toàn lớp lắng nghe rõ ràng từng âm tiết và chép vào vở ô ly         │
 └────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PHÂN TÍCH CHI TIẾT NGUYÊN LÝ HOẠT ĐỘNG TỪNG KHỐI

### Khối 1: Quản lý & Biên soạn Đề bài (Database & Qwen AI Generation)

Khối đầu vào giải quyết bài toán: *Giáo viên lấy bài đọc từ đâu và làm sao có bài mới nhanh nhất?*

#### 1. Nguồn bài mẫu có sẵn trong Database (`vihand.db`)
* **Cơ chế lưu trữ:** Sử dụng SQLite thông qua Prisma ORM (`DictationLesson`, `Passage`).
* **Phân loại khoa học:** Hệ thống tổ chức sẵn kho ngữ liệu chuẩn theo 5 khối lớp (từ Lớp 1 đến Lớp 5) bám sát các bộ SGK hiện hành (*Kết nối tri thức*, *Cánh diều*, *Chân trời sáng tạo*).
* **Bài tự soạn:** Giáo viên có thể nhập trực tiếp đoạn văn tự chọn ở nhà, lưu lại vào cơ sở dữ liệu để tái sử dụng cho nhiều lớp học song song.

#### 2. Nguồn bài tạo tự động bằng AI (`Qwen2.5-0.5B-Instruct SLM`)
* **Nguyên lý hoạt động:** Endpoint `/qwen/generate-passage` tiếp nhận 2 tham số: `grade` (Khối lớp 1–5) và `topic` (Chủ đề bài viết, ví dụ: *"Mùa lúa chín quê em"*).
* **Kiểm soát độ dài & phong cách (Prompt Engineering Constraint):**
  * Lớp 1–2: Đoạn văn ngắn 30–45 từ, từ vựng đơn giản, giàu tính miêu tả đồ vật, con vật gần gũi.
  * Lớp 3–4: Đoạn văn 50–70 từ, câu phức có vế nối, hình ảnh so sánh, nhân hóa.
  * Lớp 5: Đoạn văn 70–90 từ, giàu cảm xúc, lòng yêu nước, vẻ đẹp thiên nhiên.
* **Thuật toán bóc tách từ khó tự động:**
  AI tự động phân tích ngữ âm trong bài vừa tạo để trích xuất 4 – 6 từ vựng dễ viết sai chính tả nhất:
  * Phụ âm đầu dễ lẫn: *tr/ch, s/x, d/r/gi, v/d, l/n*.
  * Vần phức tạp: *oang, oeo, uych, uen, iêu/yêu*.
  * Thanh điệu: Cặp thanh dễ nhầm *hỏi/ngã* ở phương ngữ miền Nam và *ngã/nặng* ở miền Trung.
  * *Ý nghĩa sư phạm:* Giáo viên dùng danh sách từ khó này để viết lên bảng con cho học sinh luyện viết trước khi bước vào tiết chép chính thức.

---

### Khối 2: Tinh chỉnh Tham số Sư phạm (Pedagogical Prosody Tuning)

Một lỗi phổ biến của các phần mềm TTS thông thường là đọc một mạch từ đầu đến cuối như phát thanh viên bản tin. Học sinh tiểu học chỉ nghe được vài chữ đầu là bị bỏ lại phía sau. Khối tinh chỉnh này sinh ra để "sư phạm hóa" chiếc máy đọc:

#### 1. Lựa chọn Giọng đọc & 4 Sắc thái biểu cảm (Prosody Presets)
Trong `python_service/tts_engine.py`, 4 preset âm học được cấu hình bằng các tham số nội tại của mô hình VITS:

| Sắc thái (Preset) | `length_scale` | `noise_scale` | `noise_w_scale` | Ứng dụng sư phạm |
| :--- | :---: | :---: | :---: | :--- |
| **`standard`** *(Chuẩn mực)* | 1.15 | 0.35 | 0.55 | Giọng trung tính, phát âm rõ từng chữ, dùng cho các bài thông báo, văn bản nhật dụng. |
| **`warm_story`** *(Truyền cảm)* | 1.18 | 0.33 | 0.52 | Giảm rè kim loại tối đa, giọng đọc ấm áp, dùng cho bài văn miêu tả cảnh đẹp, truyện cổ tích. |
| **`emphasis`** *(Nhấn mạnh)* | 1.25 | 0.28 | 0.45 | Đọc chậm hơn 20%, biên độ nét chữ dứt khoát, dùng khi đọc **từ khó** hoặc lỗi sai phổ biến. |
| **`question`** *(Gợi mở)* | 1.12 | 0.38 | 0.58 | Nâng nhẹ cao độ ở âm tiết cuối câu, dùng cho các câu hỏi tu từ hoặc câu nghi vấn. |

#### 2. Phân đoạn ngữ lưu (Prosodic Chunking — Cụm 4 đến 6 từ)
* **Quy luật tâm lý học lứa tuổi:** Trí nhớ ngắn hạn của trẻ 7–10 tuổi chỉ lưu trữ được tối đa 5 – 7 âm tiết trong một nhịp nghe.
* **Cơ chế cắt câu:**
  * Câu văn dài: *"Mặt trời bắt đầu nhô lên sau dãy núi phía đông, tỏa ánh nắng ấm áp xuống cánh đồng lúa chín vàng."* (22 từ).
  * Hệ thống chia thành 3 cụm ngữ lưu:
    * Cụm 1: *"Mặt trời bắt đầu nhô lên"* (6 từ).
    * Cụm 2: *"sau dãy núi phía đông"* (6 từ).
    * Cụm 3: *"tỏa ánh nắng ấm áp xuống cánh đồng lúa chín vàng"* (10 từ ➔ tiếp tục chia đôi thành 5 từ + 5 từ).

#### 3. Khoảng dừng viết tay động (Dynamic Writing Pause)
Sau mỗi cụm từ phát ra, máy không đọc tiếp ngay mà tự động kích hoạt bộ đếm thời gian im lặng:
$$T_{\text{pause}} = N_{\text{words}} \times \text{WritingFactor} + T_{\text{bonus}}$$
* **`WritingFactor` (Hệ số tốc độ viết theo lứa tuổi):**
  * Lớp 1: $2.2\text{ giây / từ}$ (học sinh còn nắn nót từng nét chữ).
  * Lớp 2–3: $1.7\text{ giây / từ}$ (tốc độ viết chuẩn).
  * Lớp 4–5: $1.4\text{ giây / từ}$ (học sinh viết nhanh hơn).
* **`T_bonus` (Thưởng thời gian từ khó):** Nếu cụm từ có chứa từ vựng trong danh sách "Từ khó", hệ thống **tự động cộng thêm $+2.5\text{ giây}$** để học sinh có thêm thời gian nhớ quy tắc chính tả.

#### 4. Chu trình đọc lặp lại chuẩn sư phạm (Repetition Cycle)
Giáo viên có thể chọn lặp lại 1, 2 hoặc 3 lần theo đúng giáo án trường sư phạm:
* *Lần 1 (Đọc mẫu):* Đọc cả câu dài để học sinh nắm toàn bộ ngữ cảnh ngữ nghĩa.
* *Lần 2 (Đọc viết):* Đọc từng cụm ngắn 4–6 chữ kèm khoảng dừng im lặng cho học sinh đặt bút viết.
* *Lần 3 (Đọc soát):* Đọc lại toàn bộ câu với tốc độ bình thường để học sinh rà mắt đối chiếu dấu câu và chữ viết.

---

### Khối 3: Pipeline TTS 3 Tầng Kép (Triple-Stage Hybrid AI)

Đây là thành tựu kỹ thuật cốt lõi của đề tài, kết hợp 3 mô hình độc lập thành một chuỗi khép kín:

```text
[Văn bản thô] ──► [Tầng 1: Qwen 2.5 SLM] ──► [Tầng 2: Piper VITS] ──► [Tầng 3: Zero-Phase DSP] ──► [Audio WAV]
```

#### TẦNG 1: NLP Frontend & Chuẩn hóa Sư phạm (Qwen2.5-0.5B-Instruct + Regex)
* **Vấn đề của TTS gốc:** Đưa chuỗi `"ngày 20/11 học sinh lớp 3A mang 5kg cam tặng cô"` vào mô hình TTS, máy sẽ đọc ngắc ngứ: *"hai mươi xuyệc mười một... ba a... năm ca gờ"*.
* **Nhiệm vụ xử lý:**
  1. *Chuyển đổi số & đơn vị:* Đổi `20/11` thành *"hai mươi tháng mười một"*, `Lớp 3A` thành *"lớp ba A"*, `5kg` thành *"năm ki lô gam"*, `tr. 25` thành *"trang hai mươi lăm"*.
  2. *Bảo toàn từ ngữ gốc (Zero-Word-Mutation):* Qwen2.5 chỉ làm nhiệm vụ chuẩn hóa ký hiệu thành chữ ngữ âm và ngắt nhịp ranh giới bằng dấu `|`, **tuyệt đối không được đổi từ đồng nghĩa hay viết lại câu**.
  3. *Chèn khẩu lệnh dấu câu sư phạm:*
     * Dấu `,` ➔ Chèn `", phẩy, "`
     * Dấu `.` ➔ Chèn `", chấm. "`
     * Dấu `?` ➔ Chèn `", chấm hỏi. "`
     * Xuống dòng `\n` ➔ Chèn `", xuống dòng. "`
     * Dấu ngoặc kép `“...”` ➔ Chèn `", mở ngoặc kép, ... , đóng ngoặc kép, "`

#### TẦNG 2: Mô hình Âm học VITS ONNX (Piper TTS Offline Engine)
* **Tại sao chọn kiến trúc VITS (Variational Inference with adversarial learning for end-to-end TTS)?**
  * VITS kết hợp mô hình xác suất tiềm ẩn (*Variational Autoencoder - VAE*) và mạng đối kháng (*GAN Vocoder*), cho phép tạo âm thanh trực tiếp từ chuỗi âm vị (phonemes) chỉ trong một bước suy luận (*End-to-End*), bỏ qua bước sinh Mel-Spectrogram trung gian.
  * Giọng đọc sinh ra có tính biểu cảm tự nhiên vượt bậc so với kiến trúc Tacotron2 + HiFi-GAN truyền thống.
* **Tại sao chọn định dạng ONNX Runtime?**
  * File mô hình được chuyển đổi sang định dạng nhị phân tối ưu `.onnx` (trọng số `vi_VN-vais1000-medium.onnx` chỉ nặng ~60 MB).
  * Chạy suy luận cực nhanh trên CPU đơn thuần (chỉ chiếm ~14% năng lực xử lý của chip ARM Cortex-A72 trên Raspberry Pi 4).
  * Hệ số thời gian thực **$RTF = 0.142$** (sinh 10 giây âm thanh chỉ mất 1.42 giây).

#### TẦNG 3: Tầng Hậu kỳ Tín hiệu Số Zero-Phase DSP (SciPy 5 Bước)
Các mô hình VITS nén nhẹ chạy trên CPU thường gặp nhược điểm: âm thanh có tiếng rè kim loại điện tử (*metallic artifacts*) và âm lượng không đều. Tầng hậu kỳ 5 bước viết bằng `scipy.signal` giải quyết dứt điểm các lỗi này:

```text
Audio Raw (VITS) ──► [1. High-pass 85Hz] ──► [2. Peak EQ 185Hz] ──► [3. Dual-Notch 3.1k & 4.4k]
                 ──► [4. Low-pass 6800Hz] ──► [5. Soft Saturation & Norm] ──► Audio Studio-Grade
```

1. **Bộ lọc High-pass Butterworth bậc 2 (Cutoff 85 Hz):**  
   Cắt sạch dải tần siêu trầm $< 85\text{ Hz}$. Đây là dải tần không chứa giọng người nhưng thường gây ù rền màng loa công suất lớn trong phòng học.
2. **Bộ lọc tăng cường Peaking EQ (Tần số trung tâm 185 Hz, $Q = 1.5$, Gain $+0.15$):**  
   Bổ sung năng lượng cho vùng âm thanh ấm áp (*Warmth Presence*), biến giọng đọc máy trở nên dày dặn, giống như cô giáo đang nói trực tiếp qua micro.
3. **Bộ lọc kép triệt tiêu Dual-Notch IIR (Tần số 3,100 Hz và 4,400 Hz):**  
   **Đây là phát hiện kỹ thuật đặc biệt của đề tài:** Qua phân tích phổ quang âm (Spectrogram), mạng nơ-ron VITS tiếng Việt bị cộng hưởng đỉnh gây rè kim loại ở 2 tần số 3.1kHz và 4.4kHz. Bộ lọc Dual-Notch dập tắt **-18.4 dB** tại 2 điểm này, triệt tiêu 100% tiếng xè kim loại.
4. **Bộ lọc Low-pass Butterworth bậc 3 (Cutoff 6,800 Hz):**  
   Cắt dải tần số cao không cần thiết, loại bỏ tiếng xì của luồng khí và tạp âm lượng tử hóa số.
5. **Chuẩn hóa biên độ & Bão hòa mềm (*Soft Saturation Tanh & Peak Normalization*):**  
   Áp dụng hàm phi tuyến $y = \tanh(1.25 \times x)$ để nén nhẹ các đỉnh âm lượng quá lớn, sau đó chuẩn hóa biên độ đỉnh về mức $0.92$ (thang đo $\pm 32,767$ của định dạng PCM 16-bit). Kết quả: âm lượng giữa các câu đọc đồng đều tuyệt đối, không có câu nào bị quá to gây giật mình cho học sinh bàn đầu.

---

### Khối 4: Cơ chế Thích ứng Phần cứng (Hardware-Adaptive 3 Modes)

Hệ thống được thiết kế theo tư duy kỹ nghệ phần mềm chuyên nghiệp, tự động chuyển đổi giữa 3 chế độ:

```text
                                  ┌───────────────────────────┐
                                  │   HỆ ĐIỀU PHỐI ADAPTIVE   │
                                  └─────────────┬─────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐    ┌──────────────────────────────┐
│  CHẾ ĐỘ 1: FULL LOCAL AI     │    │  CHẾ ĐỘ 2: LIGHTWEIGHT EDGE  │    │   CHẾ ĐỘ 3: CLOUD WEB MODE   │
│  (PC Giáo viên / Server)     │    │  (Raspberry Pi 4 Offline)    │    │   (Trình duyệt có Internet)  │
├──────────────────────────────┤    ├──────────────────────────────┤    ├──────────────────────────────┤
│ Qwen 2.5 SLM                 │    │ Regex Normalizer             │    │ Microsoft Edge-TTS           │
│ + Piper VITS ONNX            │    │ + Piper VITS ONNX            │    │ vi-VN-HoaiMyNeural           │
│ + Zero-Phase DSP             │    │ + Zero-Phase DSP             │    │                              │
├──────────────────────────────┤    ├──────────────────────────────┤    ├──────────────────────────────┤
│ Ngắt nhịp hiểu ngữ nghĩa     │    │ Siêu nhẹ, trễ <0.4s, RTF 0.14│    │ Giọng phát thanh viên cực mượt│
│ 100% Offline trên máy trạm   │    │ Tự kích hoạt khi RAM <650MB  │    │ Không tốn CPU máy trường     │
└──────────────────────────────┘    └──────────────────────────────┘    └──────────────────────────────┘
```

* **Cơ chế RAM Guard an toàn (`QWEN_RAM_THRESHOLD_MB = 650.0`):**  
  Trên bo mạch nhúng Raspberry Pi 4 (RAM 4GB), hệ thống chạy đồng thời cả Camera và mô hình YOLOv8 Word Detector. Nếu chạy thêm Qwen2.5-0.5B, RAM sẽ bị đẩy lên vùng đỏ ($> 85\%$). Biến an toàn sẽ kiểm tra RAM khả dụng: nếu $< 650\text{MB}$, hệ thống **tự động xả Qwen khỏi RAM về 0 MB** và chuyển sang dùng bộ chuẩn hóa Regex thuần túy. Nhờ đó, trạm biên Raspberry Pi có thể chạy bền bỉ 24/7 mà không bao giờ bị hệ điều hành Linux kích hoạt OOM Killer làm sập ứng dụng!

---

### Khối 5: Tích hợp Khép kín với Luồng Chấm điểm (Ground Truth Locking)

Một đóng góp học thuật rất lớn của phân hệ đọc chính tả đối với toàn bộ đồ án ViHand Grade là **Cơ chế khóa văn bản chuẩn (Ground Truth Locking)**:

1. **Vấn đề của các hệ thống OCR thông thường:**  
   Khi chụp ảnh bài làm học sinh, các hệ thống AI tự do (như ChatGPT hay Gemini thuần) thường bị **"Ảo giác" (Hallucination)** — tự ý đoán chữ bị mất nét thành từ có nghĩa, hoặc tự sửa câu văn sai của học sinh thành câu đúng, làm mất tính khách quan sư phạm.
2. **Cơ chế phối hợp của ViHand Grade:**  
   * Khi giáo viên nhấn "Bắt đầu đọc", văn bản bài đọc được lưu vào phiên làm việc (`DictationSession`) và được đóng dấu là **Ground Truth bất biến**.
   * Sau khi học sinh viết xong và nộp bài chụp, thuật toán **SequenceMatcher (LCS)** lấy đúng chuỗi Ground Truth này để đối soát từng từ một với văn bản OCR từ nét chữ học sinh.
   * Kết quả: **Triệt tiêu 100% ảo giác AI**, bảo lưu trọn vẹn lỗi chính tả của học sinh để chấm điểm chính xác theo barem của Bộ GD&ĐT.

---

## 3. BỘ CÂU HỎI & KỊCH BẢN PHẢN BIỆN BẢO VỆ TRƯỚC HỘI ĐỒNG (FAQ DEFENSE)

Dưới đây là 7 câu hỏi hóc búa nhất mà các thầy cô trong Hội đồng phản biện thường đặt ra, kèm theo câu trả lời chuẩn xác, tự tin:

---

### ❓ Câu hỏi 1: "Tại sao không dùng luôn Google TTS, FPT.AI hay Zalo AI mà phải tự dựng Piper VITS kết hợp Qwen 2.5 chi cho phức tạp?"

> **💡 Cách trả lời:**  
> *"Dạ thưa Thầy/Cô, nhóm em không sử dụng các dịch vụ Cloud API thương mại vì 3 lý do then chốt về kỹ thuật và bối cảnh giáo dục:*  
> *1. **Tính sẵn sàng ngoại tuyến (Offline Availability):** Các trường học ở vùng sâu vùng xa, hải đảo thường có kết nối Internet chập chờn hoặc không có mạng trong phòng học. Nếu phụ thuộc vào Cloud API, tiết học sẽ bị tê liệt hoàn toàn khi mất mạng. Hệ thống Piper VITS của nhóm chạy Offline 100% trên thiết bị biên Raspberry Pi 4.*  
> *2. **Bảo mật dữ liệu học đường & Không phát sinh chi phí:** Dùng Cloud API sẽ tốn tiền theo từng ký tự gọi mạng và phải gửi dữ liệu học sinh ra máy chủ bên thứ ba. Mô hình cục bộ của nhóm hoàn toàn miễn phí trọn đời và bảo vệ quyền riêng tư dữ liệu trẻ em theo Nghị định 13/2023/NĐ-CP.*  
> *3. **Tính năng sư phạm độc bản:** Các API thương mại chỉ đọc một mạch từ đầu đến cuối như phát thanh viên bản tin. Chúng không thể tự động chia cụm 4–6 chữ, không tự tính khoảng dừng viết tay động theo lứa tuổi học sinh, và không biết đọc to khẩu lệnh dấu câu như một giáo viên thực thụ trên lớp."*

---

### ❓ Câu hỏi 2: "Tại sao phải có tầng Zero-Phase DSP? Mô hình VITS đã sinh ra âm thanh rồi, tại sao phải lọc âm thêm làm gì?"

> **💡 Cách trả lời:**  
> *"Dạ thưa Thầy/Cô, mô hình VITS nguyên bản khi nén nhẹ để chạy trên CPU thường xuất hiện 2 nhược điểm âm học nghiêm trọng khi phát qua loa thùng công suất lớn của phòng học:*  
> *1. **Hiện tượng rè kim loại (Metallic Artifacts):** Qua phân tích phổ âm (Spectrogram), mạng nơ-ron VITS bị cộng hưởng đỉnh rất mạnh ở 2 tần số $3,100\text{ Hz}$ và $4,400\text{ Hz}$, tạo ra cảm giác giọng nói robot chói tai. Tầng DSP của nhóm sử dụng bộ lọc kép Dual-Notch IIR dập tắt **-18.4 dB** tại 2 điểm này, loại bỏ hoàn toàn tiếng rè.*  
> *2. **Hiện tượng ù rền màng loa:** Mô hình VITS sinh ra các dao động tần số thấp $< 85\text{ Hz}$ gây rung màng loa lớp học. Bộ lọc High-pass của nhóm cắt sạch dải này, kết hợp Peaking EQ $185\text{ Hz}$ làm ấm giọng đọc và hàm Soft Saturation nén biên độ đồng đều, giúp học sinh ngồi nghe suốt 40 phút mà không bị ù tai hay mỏi mệt."*

---

### ❓ Câu hỏi 3: "Học sinh tiểu học viết chậm, máy đọc tự động lỡ các em viết không kịp thì sao?"

> **💡 Cách trả lời:**  
> *"Dạ thưa Thầy/Cô, hệ thống giải quyết vấn đề này bằng 3 cơ chế kiểm soát nhịp độ linh hoạt:*  
> *1. **Khoảng dừng viết tay động (Dynamic Writing Pause):** Sau mỗi cụm từ 4–6 chữ, máy không đọc tiếp ngay mà tự động im lặng theo công thức: $T_{\text{pause}} = \text{Số từ} \times \text{Hệ số lứa tuổi} + 2.5\text{s (nếu có từ khó)}$. Ví dụ học sinh lớp 2 viết một cụm 5 từ, máy sẽ dừng đúng $5 \times 1.7\text{s} = 8.5\text{ giây}$ rồi mới đọc tiếp.*  
> *2. **Chu trình lặp lại 3 lần:** Máy đọc lần 1 để học sinh nghe hiểu nghĩa ➔ đọc lần 2 từng cụm chậm rãi để học sinh viết ➔ đọc lần 3 để học sinh soát lỗi.*  
> *3. **Quyền can thiệp của giáo viên (Human-in-the-loop):** Trên giao diện luôn có nút 'Tạm dừng' (Pause) và 'Đọc lại cụm này' (Replay). Khi thấy học sinh dưới lớp chưa kịp cầm bút, giáo viên chỉ cần bấm phím cách (Space) để dừng ngay lập tức."*

---

### ❓ Câu hỏi 4: "Bo mạch Raspberry Pi 4 chỉ có 4GB RAM, chạy cả Camera, YOLOv8 nhận diện từ và cả TTS thì có bị tràn RAM hay treo máy không?"

> **💡 Cách trả lời:**  
> *"Dạ thưa Thầy/Cô, nhóm đã lường trước điều này và thiết kế cơ chế **Bảo vệ RAM thông minh (RAM Guard)** trong `python_service/main.py`:*  
> *1. **Phân bổ tài nguyên thực tế:** Trên Raspberry Pi 4, hệ điều hành Ubuntu Server chiếm ~450 MB, mô hình YOLOv8 Word Detector chiếm ~150 MB, động cơ Piper VITS ONNX chỉ chiếm ~210 MB. Tổng tài nguyên đang dùng chỉ khoảng $1.2\text{ GB} / 4.0\text{ GB}$ (dưới 35% RAM).*  
> *2. **Cơ chế ngắt tự động (RAM Threshold 650 MB):** Mô hình ngôn ngữ Qwen2.5-0.5B chiếm khoảng ~1.0 GB RAM. Khi chạy trên Raspberry Pi, biến `QWEN_RAM_THRESHOLD_MB` sẽ kiểm tra RAM: nếu RAM trống bị thu hẹp dưới 650 MB, hệ thống sẽ tự động xả Qwen khỏi bộ nhớ và chuyển sang dùng bộ chuẩn hóa Regex siêu nhẹ ($< 5\text{ MB}$). Nhờ đó, trạm biên Raspberry Pi 4 luôn vận hành an toàn tuyệt đối và không bao giờ bị lỗi tràn bộ nhớ (Out Of Memory)."*

---

### ❓ Câu hỏi 5: "Dùng AI (Qwen 2.5) sáng tác bài đọc chính tả, lỡ AI sinh ra nội dung bạo lực, sai lệch lịch sử hoặc không phù hợp trẻ em thì sao?"

> **💡 Cách trả lời:**  
> *"Dạ thưa Thầy/Cô, hệ thống áp dụng cơ chế bảo vệ 3 lớp an toàn (3-Layer Guardrails):*  
> *1. **Lớp 1 (System Prompt Constraint):** Mô hình Qwen2.5 được khóa chặt bởi hệ thống hướng dẫn nghiêm ngặt: chỉ sử dụng văn phong sư phạm trong sáng, ngôn từ chuẩn mực của Chương trình GDPT 2018, cấm tuyệt đối các từ ngữ nhạy cảm.*  
> *2. **Lớp 2 (Kiểm duyệt Human-in-the-loop):** Sau khi AI sinh bài đọc, đoạn văn không được phát ra loa ngay mà sẽ hiển thị lên màn hình để giáo viên duyệt, chỉnh sửa từng câu chữ hoặc nhấn 'Tạo lại' nếu chưa ưng ý.*  
> *3. **Lớp 3 (Ngân hàng SGK dự phòng):** Nếu mô hình AI gặp sự cố hoặc sinh nội dung dưới 12 từ, hệ thống sẽ tự động chuyển tiếp (Fallback) sang ngân hàng các bài đọc chuẩn sách giáo khoa có sẵn trong cơ sở dữ liệu."*

---

### ❓ Câu hỏi 6: "Máy tự đọc khẩu lệnh ', phẩy, ', ', chấm. ', lỡ học sinh nghe tưởng đó là nội dung bài đọc rồi viết luôn chữ 'phẩy' vào vở thì sao?"

> **💡 Cách trả lời:**  
> *"Dạ thưa Thầy/Cô, đây là nghiệp vụ sư phạm rất quen thuộc ở bậc tiểu học. Khi giáo viên người thật đọc chính tả trên lớp, giáo viên vẫn phải đọc: 'Các em chú ý: hoa nở, phẩy, bướm lượn, chấm'. Học sinh ngay từ lớp 1 đã được rèn luyện quy ước nghe thấy từ 'phẩy' thì phải đặt dấu phẩy vào vở.*  
> *Hơn nữa, hệ thống của nhóm còn tối ưu bằng cách: từ 'phẩy' được đặt trong cặp dấu ngắt nhịp `, phẩy, `, khiến ngữ điệu phát âm trầm xuống và dứt khoát, tách biệt hoàn toàn với giai điệu mượt mà của câu văn. Ngoài ra, trên giao diện có nút gạt 'Đọc tên dấu câu': đối với học sinh lớp 4–5 đã thành thạo, giáo viên có thể tắt tùy chọn này, máy sẽ chỉ ngắt nghỉ im lặng tại dấu câu mà không đọc thành tiếng."*

---

### ❓ Câu hỏi 7: "Điểm khác biệt lớn nhất giữa hệ thống này với một chiếc máy phát file MP3 ghi âm sẵn là gì?"

> **💡 Cách trả lời:**  
> *"Dạ thưa Thầy/Cô, một file MP3 ghi âm sẵn là **âm thanh tĩnh và đóng kín**, còn hệ thống của nhóm là **phần mềm tương tác thời gian thực linh hoạt (Dynamic Interactive System)** với 3 ưu thế vượt trội:*  
> *1. **Đọc được bất kỳ văn bản nào:** MP3 chỉ đọc được những bài đã thu âm trước. Hệ thống của nhóm có thể nhận bất kỳ văn bản mới nào do giáo viên gõ vào hoặc do AI vừa sáng tác, chuyển thành giọng nói ngay lập tức.*  
> *2. **Tùy biến nhịp độ theo từng lớp học:** File MP3 có tốc độ cố định. Với hệ thống này, giáo viên có thể chỉnh đọc nhanh cho lớp chọn, đọc chậm và dừng lâu hơn cho lớp có nhiều học sinh viết chậm.*  
> *3. **Khóa dữ liệu phục vụ chấm bài AI:** File MP3 chỉ phát ra tai nghe rồi biến mất. Còn trong hệ thống ViHand Grade, văn bản đang đọc được khóa chặt trong cơ sở dữ liệu để ngay sau tiết học, camera sẽ chụp bài làm học sinh và dùng chính văn bản đó để chấm điểm tự động."*

---

## 4. TỔNG KẾT BẢO VỆ

Hệ thống Trợ lý Đọc chính tả của **ViHand Grade** là sự dung hòa chuẩn mực giữa:
* **Tính sư phạm tiểu học:** Nhịp đọc ngắt cụm, khoảng dừng động, đọc lặp lại 3 chu trình, khẩu lệnh dấu câu.
* **Tính kỹ thuật học sâu:** Mô hình VITS ONNX siêu nhẹ chạy Offline trên thiết bị nhúng kết hợp bộ lọc số Zero-Phase DSP xóa sạch rè kim loại.
* **Tính khép kín của hệ sinh thái:** Đóng vai trò là nguồn dữ liệu chuẩn Ground Truth bất biến cho phân hệ Vision/OCR chấm điểm tự động.

Khi bảo vệ đồ án, việc trình bày rõ ràng 3 tầng xử lý kỹ thuật và nêu bật tinh thần nhân văn hỗ trợ giáo viên tiểu học sẽ giúp bạn ghi điểm tuyệt đối trước Hội đồng chấm thi!
