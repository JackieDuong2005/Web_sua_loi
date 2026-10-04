# 📂 DANH MỤC TÀI LIỆU KỸ THUẬT & NGHIÊN CỨU KHOA HỌC — VIHAND GRADE

Kho lưu trữ tài liệu đặc tả kỹ thuật, kiến trúc hệ thống, chuyên đề phân hệ và báo cáo tổng kết đề tài Nghiên cứu Khoa học Sinh viên **ViHand Grade** (Phiên bản chuẩn mực **v2.4.0 Master Release**).

---

## 🌳 Cấu Trúc Phân Cấp Thư Mục (Directory Tree)

```text
Tai_lieu_Bao_cao/
│
├── 01_Bao_Cao_Tong_Ket_NCKH/          ─── Báo cáo tổng kết đề tài NCKH (Chương 1 đến 6 & File Word)
│   ├── 01_Bo_sung_Chuong_1_Tong_Quan.md
│   ├── 02_Bo_sung_Chuong_2_Co_So_Ly_Thuyet.md
│   ├── 03_Bo_sung_Chuong_3_Thiet_Ke_He_Thong.md
│   ├── 04_Bo_sung_Chuong_4_Xay_Dung_Ung_Dung.md
│   ├── 05_Bo_sung_Chuong_5_Thuc_Nghiem_Va_Ket_Qua.md
│   ├── 06_Bo_sung_Chuong_6_Ket_Luan_Va_Huong_Phat_Trien.md
│   └── Báo cáo tổng eureka - Thiết bị chấm điểm.docx
│
├── 02_Module_Doc_Chinh_Ta/            ─── Chuyên đề Phân hệ Đọc chính tả Sư phạm Trợ giảng AI
│   ├── MODULE_DOC_CHINH_TA_HO_TRO_GIAO_VIEN.md
│   ├── DAC_TA_KY_THUAT_DOC_CHINH_TA_VIHAND_GRADE.md
│   └── dictation-platform-architecture.md
│
├── 03_Dac_Ta_Kien_Truc_He_Thong/      ─── Đặc tả kỹ thuật toàn diện hệ thống cốt lõi (Core TechSpec)
│   └── ViHandGrade_Combined_TechSpec_v2.3.0.md
│
├── 04_Kiem_Toan_Va_Danh_Gia_Audit/    ─── Báo cáo kiểm toán chất lượng mã nguồn & Backlog kỹ thuật
│   └── vihand_audit_report.md
│
├── diagrams/                          ─── Sơ đồ kiến trúc và lưu đồ pipeline chấm điểm độ nét cao
│   ├── 01_System_Architecture_Overview.jpg
│   └── 02_Grading_Pipeline_Detail.jpg
│
└── README.md                          ─── Chỉ mục danh mục tổng quan (Tài liệu này)
```

---

## 📘 1. Thư mục `01_Bao_Cao_Tong_Ket_NCKH/`
Chứa toàn bộ các chương thuyết minh hoàn chỉnh được biên soạn công phu nhằm bổ sung, cập nhật và đồng bộ cho báo cáo tổng kết NCKH / Giải thưởng sinh viên nghiên cứu khoa học Euréka:

* 📄 [**`01_Bo_sung_Chuong_1_Tong_Quan.md`**](./01_Bao_Cao_Tong_Ket_NCKH/01_Bo_sung_Chuong_1_Tong_Quan.md): Tổng quan đề tài, tính cấp thiết, mục tiêu nghiên cứu và đối tượng phục vụ (học sinh tiểu học Lớp 1-5).
* 📄 [**`02_Bo_sung_Chuong_2_Co_So_Ly_Thuyet.md`**](./01_Bao_Cao_Tong_Ket_NCKH/02_Bo_sung_Chuong_2_Co_So_Ly_Thuyet.md): Cơ sở lý thuyết về OCR, xử lý ảnh với Jimp, mô hình Seq2Seq ViT5 và tổng hợp giọng nói Neural TTS.
* 📄 [**`03_Bo_sung_Chuong_3_Thiet_Ke_He_Thong.md`**](./01_Bao_Cao_Tong_Ket_NCKH/03_Bo_sung_Chuong_3_Thiet_Ke_He_Thong.md): Thiết kế kiến trúc tổng thể, mô hình dữ liệu Prisma, và luồng dữ liệu 4 bề mặt tương tác.
* 📄 [**`04_Bo_sung_Chuong_4_Xay_Dung_Ung_Dung.md`**](./01_Bao_Cao_Tong_Ket_NCKH/04_Bo_sung_Chuong_4_Xay_Dung_Ung_Dung.md): Xây dựng giao diện Web Next.js 16, module Đọc chính tả, canvas trực quan hóa Bounding Box và hệ thống API.
* 📄 [**`05_Bo_sung_Chuong_5_Thuc_Nghiem_Va_Ket_Qua.md`**](./01_Bao_Cao_Tong_Ket_NCKH/05_Bo_sung_Chuong_5_Thuc_Nghiem_Va_Ket_Qua.md): Thực nghiệm benchmark độ chính xác OCR, khả năng sửa lỗi tiếng Việt của ViT5 và hiệu năng thời gian chấm.
* 📄 [**`06_Bo_sung_Chuong_6_Ket_Luan_Va_Huong_Phat_Trien.md`**](./01_Bao_Cao_Tong_Ket_NCKH/06_Bo_sung_Chuong_6_Ket_Luan_Va_Huong_Phat_Trien.md): Đánh giá đóng góp khoa học, các giới hạn đã vượt qua và định hướng phát triển trong tương lai.
* 📑 **`Báo cáo tổng eureka - Thiết bị chấm điểm.docx`**: Tệp văn bản báo cáo nghiệm thu gốc dạng Word.

---

## 🎙️ 2. Thư mục `02_Module_Doc_Chinh_Ta/`
Tập hợp toàn bộ tài liệu đặc tả kiến trúc và thiết kế sư phạm của **Phân hệ Đọc Chính Tả Trợ Giảng Số** (`/teacher/dictation`):

* 🌟 [**`MODULE_DOC_CHINH_TA_HO_TRO_GIAO_VIEN.md`**](./02_Module_Doc_Chinh_Ta/MODULE_DOC_CHINH_TA_HO_TRO_GIAO_VIEN.md): **Đặc tả toàn diện Module Đọc chính tả Hỗ trợ giáo viên (v2.4.0)** — Giải pháp "Trợ giảng số" tại lớp học, tích hợp AI Sáng tác Qwen 2.5 SLM, Động cơ âm thanh đa tầng Edge-TTS, thuật toán ngắt cụm câu thích ứng, bộ tính thời gian chờ viết động (~1.6s/từ) và cơ chế 1-click luân chuyển Ground Truth sang module chấm điểm.
* 📋 [**`DAC_TA_KY_THUAT_DOC_CHINH_TA_VIHAND_GRADE.md`**](./02_Module_Doc_Chinh_Ta/DAC_TA_KY_THUAT_DOC_CHINH_TA_VIHAND_GRADE.md): Đặc tả kỹ thuật chi tiết của phân hệ đọc chính tả, sơ đồ khối hệ thống và thông số cấu hình sư phạm.
* 🏗️ [**`dictation-platform-architecture.md`**](./02_Module_Doc_Chinh_Ta/dictation-platform-architecture.md): Tài liệu thiết kế kiến trúc nền tảng Web Dictation, cơ chế streaming audio MP3 thời gian thực và quản lý kho ngữ liệu SGK.

---

## 🏛️ 3. Thư mục `03_Dac_Ta_Kien_Truc_He_Thong/`
* 📘 [**`ViHandGrade_Combined_TechSpec_v2.3.0.md`**](./03_Dac_Ta_Kien_Truc_He_Thong/ViHandGrade_Combined_TechSpec_v2.3.0.md): **Đặc Tả Kỹ Thuật Toàn Diện (v2.3.0 Master Release)**  
  *Nguồn chân lý kỹ thuật duy nhất (Single Source of Truth)* mô tả toàn bộ hệ thống ViHand Grade: Tech Stack (Next.js 16, React 19, FastAPI, Prisma, SQLite WAL), Database Schema, Pipeline tiền xử lý ảnh Jimp 9 bước, Thuật toán so khớp chuỗi SequenceMatcher không ảo giác, Kiến trúc chấm điểm 2 tầng (ViT5 + Qwen SLM), và Chính sách bảo vệ dữ liệu trẻ em theo Nghị định 13/2023/NĐ-CP.

---

## 🔍 4. Thư mục `04_Kiem_Toan_Va_Danh_Gia_Audit/`
* 📑 [**`vihand_audit_report.md`**](./04_Kiem_Toan_Va_Danh_Gia_Audit/vihand_audit_report.md): **Báo Cáo Kiểm Toán Kỹ Thuật Chuyên Sâu & Backlog Khắc Phục Lỗi**  
  Bảng tổng hợp chi tiết toàn bộ 47 issues kỹ thuật được đối soát trực tiếp với từng dòng mã nguồn: phân tích nguyên nhân gốc rễ, rủi ro hệ thống, và minh chứng mã nguồn thực tế cho các vấn đề đã được giải quyết triệt để.

---

## 🖼️ 5. Thư mục `diagrams/`
Lưu trữ các hình ảnh sơ đồ kỹ thuật chất lượng cao minh họa cho hệ thống:
* 🖼️ [**`01_System_Architecture_Overview.jpg`**](./diagrams/01_System_Architecture_Overview.jpg): Sơ đồ kiến trúc tổng thể của hệ thống ViHand Grade.
* 🖼️ [**`02_Grading_Pipeline_Detail.jpg`**](./diagrams/02_Grading_Pipeline_Detail.jpg): Lưu đồ chi tiết chu trình tiền xử lý ảnh và chấm điểm tự động.
